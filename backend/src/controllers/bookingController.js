const prisma = require('../utils/prisma');
const { Prisma } = require('@prisma/client');
const { syncCustomer, syncBooking } = require('../utils/sqlServerSync');

/**
 * 生成预约确认码
 * 格式: BK{YYYYMMDD}{3位序号}
 * 例如: BK20260129001
 */
const generateBookingCode = async (visitDate) => {
  const date = new Date(visitDate);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

  // 查询当天已有预约数量
  const count = await prisma.booking.count({
    where: {
      bookingCode: {
        startsWith: `BK${dateStr}`,
      },
    },
  });

  const sequence = String(count + 1).padStart(3, '0');
  return `BK${dateStr}${sequence}`;
};

/**
 * 计算预约价格
 * 支持特殊日期价格和儿童价格
 */
const calculateBookingPrice = (packageInfo, visitDate, peopleCount, childCount = 0) => {
  let unitPrice = parseFloat(packageInfo.price);
  let childPrice = packageInfo.childPrice ? parseFloat(packageInfo.childPrice) : unitPrice * 0.8;

  // 检查特殊日期价格
  if (packageInfo.specialPricing) {
    try {
      const special = typeof packageInfo.specialPricing === 'string'
        ? JSON.parse(packageInfo.specialPricing)
        : packageInfo.specialPricing;

      const visitDateStr = new Date(visitDate).toISOString().slice(0, 10);

      for (const [dateRange, pricing] of Object.entries(special)) {
        const [start, end] = dateRange.split('~');
        if (visitDateStr >= start && visitDateStr <= end) {
          unitPrice = pricing.price;
          childPrice = pricing.childPrice || unitPrice * 0.8;
          break;
        }
      }
    } catch (e) {
      console.error('解析特殊日期价格失败:', e);
    }
  }

  const adultCount = peopleCount - childCount;
  const totalAmount = adultCount * unitPrice + childCount * childPrice;

  return {
    unitPrice,
    childPrice,
    adultCount,
    childCount,
    totalAmount,
  };
};

/**
 * 生成预约确认文本（方便客户复制）
 */
const generateConfirmText = (booking, packageName) => {
  const visitDate = new Date(booking.visitDate);
  const dateStr = `${visitDate.getFullYear()}-${String(visitDate.getMonth() + 1).padStart(2, '0')}-${String(visitDate.getDate()).padStart(2, '0')}`;

  return `预定双溪森林营地活动
日期：${dateStr}
姓名：${booking.customerName}，人数：${booking.peopleCount}人，手机：${booking.customerPhone}
酒店：${booking.hotelName}${booking.roomNumber ? `，房间：${booking.roomNumber}` : ''}
单价：${booking.unitPrice}/人，总金额${booking.totalAmount}元
已收定金：${booking.depositAmount || 0}元，待收尾款${booking.totalAmount - (booking.depositAmount || 0)}元

备注：二道白河镇去森林营地免费接送，9点去，16点回。

请提前一天联系我，确认日期和人数`;
};

/**
 * @route   GET /api/bookings
 * @desc    获取预约列表（后台管理）
 * @access  Private (admin, operator)
 */
const getBookings = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // 构建查询条件
    const where = {};

    if (status) {
      where.status = status;
    }

    // 日期范围筛选
    if (startDate || endDate) {
      where.visitDate = {};
      if (startDate) {
        where.visitDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.visitDate.lte = new Date(endDate);
      }
    }

    // 搜索：确认码、姓名、电话
    if (search) {
      where.OR = [
        { bookingCode: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    // 验证排序字段
    const allowedSortFields = ['createdAt', 'visitDate', 'totalAmount', 'bookingCode'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    // 查询预约
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { [sortField]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          package: {
            select: {
              id: true,
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: bookings,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    console.error('获取预约列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_BOOKINGS_ERROR',
        message: '获取预约列表失败',
      },
    });
  }
};

/**
 * @route   GET /api/bookings/:id
 * @desc    获取预约详情
 * @access  Private (admin, operator)
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            wechat: true,
            source: true,
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            childPrice: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: '预约不存在',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('获取预约详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_BOOKING_ERROR',
        message: '获取预约详情失败',
      },
    });
  }
};

/**
 * @route   POST /api/bookings
 * @desc    手动创建预约（后台）
 * @access  Private (admin, operator)
 */
const createBooking = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerWechat,
      visitDate,
      peopleCount,
      childCount = 0,
      hotelName,
      roomNumber,
      packageId,
      notes,
    } = req.body;

    // 验证必填字段
    if (!customerName || !customerPhone || !visitDate || !peopleCount || !hotelName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段',
        },
      });
    }

    // 获取套餐信息
    let packageInfo = null;
    let packageName = null;
    if (packageId) {
      packageInfo = await prisma.package.findUnique({
        where: { id: packageId },
      });
      if (!packageInfo) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PACKAGE_NOT_FOUND',
            message: '套餐不存在',
          },
        });
      }
      packageName = packageInfo.name;
    }

    // 计算价格
    const priceInfo = packageInfo
      ? calculateBookingPrice(packageInfo, visitDate, peopleCount, childCount)
      : { unitPrice: 0, childPrice: 0, totalAmount: 0 };

    // 生成预约确认码
    const bookingCode = await generateBookingCode(visitDate);

    // 查找或创建客户
    let customer = await prisma.customer.findUnique({
      where: { phone: customerPhone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone: customerPhone,
          wechat: customerWechat,
          source: 'booking_form',
        },
      });
    }

    // 查找住宿地点
    const hotel = await prisma.accommodationPlace.findFirst({
      where: { name: { contains: hotelName } },
    });

    // 创建预约
    const booking = await prisma.booking.create({
      data: {
        bookingCode,
        customerName,
        customerPhone,
        customerWechat,
        customerId: customer.id,
        visitDate: new Date(visitDate),
        peopleCount,
        childCount,
        hotelName,
        hotelId: hotel?.id,
        roomNumber,
        packageId,
        packageName,
        unitPrice: priceInfo.unitPrice,
        childPrice: priceInfo.childPrice,
        totalAmount: priceInfo.totalAmount,
        customerNotes: notes,
        source: 'manual',
        status: 'pending',
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        package: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: booking,
      message: '预约创建成功',
    });
  } catch (error) {
    console.error('创建预约失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_BOOKING_ERROR',
        message: error.message || '创建预约失败',
      },
    });
  }
};

/**
 * @route   PATCH /api/bookings/:id/status
 * @desc    更新预约状态
 * @access  Private (admin, operator)
 */
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, operatorNotes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'converted', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `无效的状态，有效值: ${validStatuses.join(', ')}`,
        },
      });
    }

    // 检查预约是否存在
    const existingBooking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: '预约不存在',
        },
      });
    }

    // 更新预约
    const updateData = {};
    if (status) updateData.status = status;
    if (operatorNotes !== undefined) updateData.operatorNotes = operatorNotes;

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        package: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedBooking,
      message: '预约状态更新成功',
    });
  } catch (error) {
    console.error('更新预约状态失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_BOOKING_STATUS_ERROR',
        message: '更新预约状态失败',
      },
    });
  }
};

/**
 * @route   PATCH /api/bookings/:id/deposit
 * @desc    记录定金
 * @access  Private (admin, operator)
 */
const updateBookingDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { depositAmount, depositCollector } = req.body;

    if (depositAmount === undefined || depositAmount < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '定金金额无效',
        },
      });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: '预约不存在',
        },
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: {
        depositAmount,
        depositCollector,
        depositPaidAt: depositAmount > 0 ? new Date() : null,
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedBooking,
      message: '定金记录更新成功',
    });
  } catch (error) {
    console.error('更新定金记录失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_DEPOSIT_ERROR',
        message: '更新定金记录失败',
      },
    });
  }
};

/**
 * @route   POST /api/bookings/:id/convert
 * @desc    将预约转为订单
 * @access  Private (admin, operator)
 */
const convertToOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // 获取预约信息
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        customer: true,
        package: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: '预约不存在',
        },
      });
    }

    // 检查是否已转换
    if (booking.status === 'converted') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_CONVERTED',
          message: '该预约已转换为订单',
        },
      });
    }

    // 确保客户存在
    let customerId = booking.customerId;
    if (!customerId) {
      // 创建客户
      const customer = await prisma.customer.create({
        data: {
          name: booking.customerName,
          phone: booking.customerPhone,
          wechat: booking.customerWechat,
          source: 'booking_form',
        },
      });
      customerId = customer.id;
    }

    // 查找或创建住宿地点
    let accommodationPlaceId = booking.hotelId;
    if (!accommodationPlaceId) {
      // 尝试按名称查找
      let accommodation = await prisma.accommodationPlace.findFirst({
        where: { name: { contains: booking.hotelName } },
      });

      if (!accommodation) {
        // 创建新的住宿地点
        accommodation = await prisma.accommodationPlace.create({
          data: {
            name: booking.hotelName,
            type: 'external',
            isActive: true,
          },
        });
      }
      accommodationPlaceId = accommodation.id;
    }

    // 生成订单号
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const lastOrder = await prisma.order.findFirst({
      where: { orderNumber: { startsWith: `ORD${dateStr}` } },
      orderBy: { orderNumber: 'desc' },
    });
    let sequence = 1;
    if (lastOrder) {
      sequence = parseInt(lastOrder.orderNumber.slice(-4)) + 1;
    }
    const orderNumber = `ORD${dateStr}${sequence.toString().padStart(4, '0')}`;

    // 计算支付状态
    const paidAmount = parseFloat(booking.depositAmount) || 0;
    const totalAmount = parseFloat(booking.totalAmount) || 0;
    let paymentStatus = 'unpaid';
    if (paidAmount >= totalAmount) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }

    // 创建订单
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        accommodationPlaceId,
        roomNumber: booking.roomNumber,
        packageId: booking.packageId,
        bookingId: booking.id,
        orderDate: new Date(),
        visitDate: booking.visitDate,
        peopleCount: booking.peopleCount,
        totalAmount: booking.totalAmount,
        paidAmount: paidAmount,
        status: 'confirmed',
        paymentStatus: paymentStatus,
        notes: booking.customerNotes,
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        accommodationPlace: {
          select: { id: true, name: true },
        },
      },
    });

    // 更新预约状态
    await prisma.booking.update({
      where: { id: parseInt(id) },
      data: {
        status: 'converted',
        customerId,
      },
    });

    // 更新客户统计
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalSpent: { increment: booking.totalAmount },
        visitCount: { increment: 1 },
        lastVisitDate: booking.visitDate,
      },
    });

    // ============ 双写逻辑：同步订单状态到 SQL Server ============
    // 异步执行，不阻塞主流程
    (async () => {
      try {
        // 同步更新后的预约/订单状态 - 在父亲系统中显示"已确认"
        await syncBooking({
          bookingCode: booking.bookingCode,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          visitDate: booking.visitDate,
          peopleCount: booking.peopleCount,
          adultCount: booking.adultCount || booking.peopleCount - (booking.childCount || 0),
          childCount: booking.childCount || 0,
          hotelName: booking.hotelName,
          roomNumber: booking.roomNumber,
          accommodationNotes: booking.accommodationNotes,
          packageName: booking.packageName,
          totalAmount: parseFloat(booking.totalAmount),
          unitPrice: parseFloat(booking.unitPrice),
          depositAmount: parseFloat(booking.depositAmount) || 0,
          status: 'converted',  // 在父亲系统中会显示"已确认"
          notes: `订单号:${orderNumber}`,
        });

        console.log(`[双写] 预约 ${booking.bookingCode} 转订单同步成功`);
      } catch (syncError) {
        console.error(`[双写] 预约转订单同步失败:`, syncError.message);
      }
    })();
    // ============ 双写逻辑结束 ============

    return res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        order,
      },
      message: '预约已成功转换为订单',
    });
  } catch (error) {
    console.error('转换预约为订单失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CONVERT_BOOKING_ERROR',
        message: error.message || '转换预约为订单失败',
      },
    });
  }
};

/**
 * @route   DELETE /api/bookings/:id
 * @desc    删除预约
 * @access  Private (admin)
 */
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: '预约不存在',
        },
      });
    }

    // 已转换的预约不能删除
    if (booking.status === 'converted') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_CONVERTED',
          message: '已转换为订单的预约不能删除',
        },
      });
    }

    await prisma.booking.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: '预约删除成功',
    });
  } catch (error) {
    console.error('删除预约失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_BOOKING_ERROR',
        message: '删除预约失败',
      },
    });
  }
};

/**
 * @route   GET /api/bookings/stats
 * @desc    获取预约统计
 * @access  Private (admin, operator)
 */
const getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.visitDate = {};
      if (startDate) where.visitDate.gte = new Date(startDate);
      if (endDate) where.visitDate.lte = new Date(endDate);
    }

    const [
      totalBookings,
      statusDistribution,
      todayBookings,
      pendingBookings,
    ] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      prisma.booking.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.booking.count({
        where: { ...where, status: 'pending' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalBookings,
        todayBookings,
        pendingBookings,
        statusDistribution: statusDistribution.map((item) => ({
          status: item.status,
          count: item._count.status,
        })),
      },
    });
  } catch (error) {
    console.error('获取预约统计失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_BOOKING_STATS_ERROR',
        message: '获取预约统计失败',
      },
    });
  }
};

module.exports = {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  updateBookingDeposit,
  convertToOrder,
  deleteBooking,
  getBookingStats,
  // 导出辅助函数供公开API使用
  generateBookingCode,
  calculateBookingPrice,
  generateConfirmText,
};
