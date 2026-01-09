const prisma = require('../utils/prisma');
const { Prisma } = require('@prisma/client');

/**
 * 生成订单号
 * 格式: ORD{YYYYMMDD}{4位序号}
 * 例如: ORD202601090001
 */
const generateOrderNumber = async () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  // 查询当天最后一个订单号
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: `ORD${dateStr}`,
      },
    },
    orderBy: {
      orderNumber: 'desc',
    },
  });

  let sequence = 1;
  if (lastOrder) {
    // 提取序号并加1
    const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `ORD${dateStr}${sequence.toString().padStart(4, '0')}`;
};

/**
 * 计算订单总金额（支持套餐、额外项目、自由组合）
 *
 * 价格计算逻辑：
 * 1. 如果选择套餐：base = 套餐价格 × 人数
 * 2. 如果添加额外项目：额外费用 = 项目单价 × 人数（每个额外项目）
 * 3. 如果自由组合（无套餐）：总价 = 各项目单价 × 人数
 *
 * @param {Object} options - 计算选项
 * @param {number} options.packageId - 套餐ID（可选）
 * @param {Array} options.items - 订单项目列表 [{projectId, quantity}]
 * @param {Array} options.extraItems - 额外项目列表 [{projectId, quantity}]（可选，套餐外）
 * @param {number} options.peopleCount - 人数
 * @returns {Object} - {items, packageAmount, extraAmount, totalAmount, breakdown}
 */
const calculateOrderAmount = async (options) => {
  const { packageId, items, extraItems, peopleCount = 1 } = options;

  let packageAmount = new Prisma.Decimal(0);
  let itemsAmount = new Prisma.Decimal(0);
  let extraAmount = new Prisma.Decimal(0);
  const calculatedItems = [];
  let packageInfo = null;

  // 1. 计算套餐价格
  if (packageId) {
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        packageItems: {
          include: {
            project: {
              select: { id: true, name: true, price: true, isActive: true },
            },
          },
        },
      },
    });

    if (!pkg) {
      throw new Error('套餐不存在');
    }

    if (!pkg.isActive) {
      throw new Error('套餐已停用');
    }

    // 检查最低人数限制
    if (pkg.minPeople && peopleCount < pkg.minPeople) {
      throw new Error(`该套餐最低需要 ${pkg.minPeople} 人`);
    }

    // 套餐价格 = 套餐单价 × 人数
    packageAmount = new Prisma.Decimal(pkg.price).mul(peopleCount);
    packageInfo = {
      id: pkg.id,
      name: pkg.name,
      unitPrice: pkg.price,
      peopleCount,
      subtotal: packageAmount,
    };

    // 将套餐中的项目添加到订单项（用于记录和排期）
    for (const pkgItem of pkg.packageItems) {
      if (!pkgItem.project.isActive) {
        throw new Error(`套餐中的项目"${pkgItem.project.name}"已停用`);
      }

      calculatedItems.push({
        projectId: pkgItem.project.id,
        quantity: peopleCount,
        unitPrice: new Prisma.Decimal(0), // 套餐项目单价记为0，价格计入套餐
        subtotal: new Prisma.Decimal(0),
      });
    }
  }

  // 2. 计算独立项目价格（自由组合模式，不使用套餐时）
  if (!packageId && items && items.length > 0) {
    for (const item of items) {
      const project = await prisma.project.findUnique({
        where: { id: item.projectId },
        select: { id: true, name: true, price: true, isActive: true },
      });

      if (!project) {
        throw new Error(`项目ID ${item.projectId} 不存在`);
      }

      if (!project.isActive) {
        throw new Error(`项目"${project.name}"已停用`);
      }

      // 自由组合项目价格 = 项目单价 × 数量（数量默认为人数）
      const quantity = item.quantity || peopleCount;
      const unitPrice = project.price;
      const subtotal = new Prisma.Decimal(unitPrice).mul(quantity);

      calculatedItems.push({
        projectId: project.id,
        quantity,
        unitPrice,
        subtotal,
      });

      itemsAmount = itemsAmount.add(subtotal);
    }
  }

  // 3. 计算额外项目价格（套餐之外的补充项目）
  if (extraItems && extraItems.length > 0) {
    for (const item of extraItems) {
      const project = await prisma.project.findUnique({
        where: { id: item.projectId },
        select: { id: true, name: true, price: true, isActive: true },
      });

      if (!project) {
        throw new Error(`额外项目ID ${item.projectId} 不存在`);
      }

      if (!project.isActive) {
        throw new Error(`额外项目"${project.name}"已停用`);
      }

      // 额外项目价格 = 项目单价 × 数量
      const quantity = item.quantity || peopleCount;
      const unitPrice = project.price;
      const subtotal = new Prisma.Decimal(unitPrice).mul(quantity);

      calculatedItems.push({
        projectId: project.id,
        quantity,
        unitPrice,
        subtotal,
      });

      extraAmount = extraAmount.add(subtotal);
    }
  }

  // 如果既没有套餐也没有项目（只有在没有套餐的情况下才检查项目）
  if (!packageId && calculatedItems.length === 0) {
    throw new Error('订单必须包含套餐或项目');
  }

  // 计算总金额
  const totalAmount = packageAmount.add(itemsAmount).add(extraAmount);

  return {
    items: calculatedItems,
    packageAmount,
    itemsAmount,
    extraAmount,
    totalAmount,
    packageInfo,
    breakdown: {
      package: packageAmount.toNumber(),
      items: itemsAmount.toNumber(),
      extra: extraAmount.toNumber(),
      total: totalAmount.toNumber(),
    },
  };
};

/**
 * 简单计算订单项目金额（向后兼容）
 * @param {Array} items - 订单项目列表 [{projectId, quantity}]
 * @returns {Object} - {items: [{projectId, quantity, unitPrice, subtotal}], totalAmount}
 */
const calculateSimpleOrderAmount = async (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('订单项目不能为空');
  }

  const calculatedItems = [];
  let totalAmount = new Prisma.Decimal(0);

  for (const item of items) {
    const project = await prisma.project.findUnique({
      where: { id: item.projectId },
      select: { id: true, name: true, price: true, isActive: true },
    });

    if (!project) {
      throw new Error(`项目ID ${item.projectId} 不存在`);
    }

    if (!project.isActive) {
      throw new Error(`项目"${project.name}"已停用`);
    }

    const quantity = item.quantity || 1;
    const unitPrice = project.price;
    const subtotal = new Prisma.Decimal(unitPrice).mul(quantity);

    calculatedItems.push({
      projectId: project.id,
      quantity,
      unitPrice,
      subtotal,
    });

    totalAmount = totalAmount.add(subtotal);
  }

  return { items: calculatedItems, totalAmount };
};

/**
 * @route   POST /api/orders
 * @desc    创建订单
 * @access  Private (admin, operator)
 */
const createOrder = async (req, res) => {
  try {
    const {
      customerId,
      accommodationPlaceId,
      roomNumber,
      packageId,
      visitDate,
      peopleCount,
      items, // [{projectId, quantity}]
      notes,
    } = req.body;

    // 验证必填字段
    if (!customerId || !accommodationPlaceId || !visitDate || !peopleCount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段：customerId, accommodationPlaceId, visitDate, peopleCount',
        },
      });
    }

    // 验证客户存在
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: '客户不存在',
        },
      });
    }

    // 验证住宿地点存在
    const accommodation = await prisma.accommodationPlace.findUnique({
      where: { id: accommodationPlaceId },
    });

    if (!accommodation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACCOMMODATION_NOT_FOUND',
          message: '住宿地点不存在',
        },
      });
    }

    // 如果选择了套餐，验证套餐存在
    if (packageId) {
      const pkg = await prisma.package.findUnique({
        where: { id: packageId },
        include: { packageItems: true },
      });

      if (!pkg) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PACKAGE_NOT_FOUND',
            message: '套餐不存在',
          },
        });
      }

      if (!pkg.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PACKAGE_INACTIVE',
            message: '套餐已停用',
          },
        });
      }
    }

    // 使用新的价格计算逻辑
    const { items: calculatedItems, totalAmount } = await calculateOrderAmount({
      packageId,
      items,
      extraItems: req.body.extraItems, // 支持额外项目
      peopleCount,
    });

    // 生成订单号
    const orderNumber = await generateOrderNumber();

    // 创建订单
    const orderData = {
      orderNumber,
      customerId,
      accommodationPlaceId,
      roomNumber,
      packageId,
      orderDate: new Date(),
      visitDate: new Date(visitDate),
      peopleCount,
      totalAmount,
      status: 'pending',
      paymentStatus: 'unpaid',
      notes,
    };

    // 只有在有订单项时才添加 orderItems
    if (calculatedItems.length > 0) {
      orderData.orderItems = {
        create: calculatedItems,
      };
    }

    const order = await prisma.order.create({
      data: orderData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        accommodationPlace: {
          select: {
            id: true,
            name: true,
          },
        },
        package: {
          select: {
            id: true,
            name: true,
          },
        },
        orderItems: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // 更新客户统计
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalSpent: {
          increment: totalAmount,
        },
        visitCount: {
          increment: 1,
        },
        lastVisitDate: new Date(visitDate),
      },
    });

    return res.status(201).json({
      success: true,
      data: order,
      message: '订单创建成功',
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ORDER_ERROR',
        message: error.message || '创建订单失败',
      },
    });
  }
};

/**
 * @route   GET /api/orders
 * @desc    获取订单列表（支持筛选、分页、排序）
 * @access  Private (admin, operator, marketer)
 */
const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      paymentStatus,
      customerId,
      accommodationPlaceId,
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

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (customerId) {
      where.customerId = parseInt(customerId);
    }

    if (accommodationPlaceId) {
      where.accommodationPlaceId = parseInt(accommodationPlaceId);
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

    // 搜索：订单号、客户名称、客户手机
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    // 验证排序字段
    const allowedSortFields = ['createdAt', 'orderDate', 'visitDate', 'totalAmount', 'orderNumber'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    // 查询订单
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
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
          accommodationPlace: {
            select: {
              id: true,
              name: true,
            },
          },
          package: {
            select: {
              id: true,
              name: true,
            },
          },
          orderItems: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: orders,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_ORDERS_ERROR',
        message: '获取订单列表失败',
      },
    });
  }
};

/**
 * @route   GET /api/orders/:id
 * @desc    获取订单详情
 * @access  Private (admin, operator, marketer)
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
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
        accommodationPlace: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
            distance: true,
            duration: true,
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
          },
        },
        orderItems: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                duration: true,
              },
            },
            coach: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: '订单不存在',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_ORDER_ERROR',
        message: '获取订单详情失败',
      },
    });
  }
};

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    更新订单状态
 * @access  Private (admin, operator)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    if (!status && !paymentStatus) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请提供要更新的状态（status 或 paymentStatus）',
        },
      });
    }

    // 验证状态值
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    const validPaymentStatuses = ['unpaid', 'paid', 'refunded'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `无效的订单状态，有效值: ${validStatuses.join(', ')}`,
        },
      });
    }

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYMENT_STATUS',
          message: `无效的支付状态，有效值: ${validPaymentStatuses.join(', ')}`,
        },
      });
    }

    // 检查订单是否存在
    const existingOrder = await prisma.order.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: '订单不存在',
        },
      });
    }

    // 状态流转验证
    if (status) {
      // 已取消的订单不能更改为其他状态
      if (existingOrder.status === 'cancelled' && status !== 'cancelled') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: '已取消的订单不能更改状态',
          },
        });
      }

      // 已完成的订单不能更改为其他状态（除了取消）
      if (existingOrder.status === 'completed' && status !== 'completed' && status !== 'cancelled') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: '已完成的订单不能更改状态',
          },
        });
      }
    }

    // 更新订单
    const updateData = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        accommodationPlace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedOrder,
      message: '订单状态更新成功',
    });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ORDER_STATUS_ERROR',
        message: '更新订单状态失败',
      },
    });
  }
};

/**
 * @route   DELETE /api/orders/:id
 * @desc    删除订单
 * @access  Private (admin)
 */
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查订单是否存在
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: '订单不存在',
        },
      });
    }

    // 只允许删除待处理或已取消的订单
    if (order.status !== 'pending' && order.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_ORDER',
          message: '只能删除待处理或已取消的订单',
        },
      });
    }

    // 删除订单（级联删除订单项）
    await prisma.order.delete({
      where: { id: parseInt(id) },
    });

    // 如果订单状态不是 cancelled，需要更新客户统计
    if (order.status !== 'cancelled') {
      await prisma.customer.update({
        where: { id: order.customerId },
        data: {
          totalSpent: {
            decrement: order.totalAmount,
          },
          visitCount: {
            decrement: 1,
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: '订单删除成功',
    });
  } catch (error) {
    console.error('删除订单失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ORDER_ERROR',
        message: '删除订单失败',
      },
    });
  }
};

/**
 * @route   GET /api/orders/stats/summary
 * @desc    获取订单统计摘要
 * @access  Private (admin, operator)
 */
const getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate.gte = new Date(startDate);
      if (endDate) where.orderDate.lte = new Date(endDate);
    }

    const [
      totalOrders,
      totalRevenue,
      statusDistribution,
      paymentDistribution,
      recentOrders,
    ] = await Promise.all([
      // 订单总数
      prisma.order.count({ where }),

      // 总收入（已确认和已完成的订单）
      prisma.order.aggregate({
        where: {
          ...where,
          status: { in: ['confirmed', 'completed'] },
        },
        _sum: { totalAmount: true },
      }),

      // 订单状态分布
      prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),

      // 支付状态分布
      prisma.order.groupBy({
        by: ['paymentStatus'],
        where,
        _count: { paymentStatus: true },
      }),

      // 最近10个订单
      prisma.order.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        statusDistribution: statusDistribution.map((item) => ({
          status: item.status,
          count: item._count.status,
        })),
        paymentDistribution: paymentDistribution.map((item) => ({
          paymentStatus: item.paymentStatus,
          count: item._count.paymentStatus,
        })),
        recentOrders,
      },
    });
  } catch (error) {
    console.error('获取订单统计失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_ORDER_STATS_ERROR',
        message: '获取订单统计失败',
      },
    });
  }
};

/**
 * @route   GET /api/orders/export
 * @desc    导出订单到Excel
 * @access  Private (admin, operator)
 */
const exportOrders = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const {
      status,
      paymentStatus,
      startDate,
      endDate,
      search,
    } = req.query;

    // 构建查询条件
    const where = {};

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
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

    // 搜索
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    // 查询订单
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
        accommodationPlace: {
          select: {
            name: true,
          },
        },
        package: {
          select: {
            name: true,
          },
        },
        orderItems: {
          include: {
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // 状态映射
    const statusMap = {
      pending: '待确认',
      confirmed: '已确认',
      completed: '已完成',
      cancelled: '已取消',
    };

    const paymentStatusMap = {
      unpaid: '未支付',
      paid: '已支付',
      refunded: '已退款',
    };

    // 格式化日期
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // 转换为Excel数据
    const excelData = orders.map((order) => ({
      '订单号': order.orderNumber,
      '客户姓名': order.customer?.name || '',
      '客户电话': order.customer?.phone || '',
      '住宿地点': order.accommodationPlace?.name || '',
      '房间号': order.roomNumber || '',
      '套餐': order.package?.name || '自选项目',
      '项目': order.orderItems.map(item => item.project?.name).filter(Boolean).join(', '),
      '人数': order.peopleCount,
      '订单金额': parseFloat(order.totalAmount),
      '订单状态': statusMap[order.status] || order.status,
      '支付状态': paymentStatusMap[order.paymentStatus] || order.paymentStatus,
      '下单日期': formatDate(order.orderDate),
      '游玩日期': formatDate(order.visitDate),
      '备注': order.notes || '',
    }));

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 设置列宽
    ws['!cols'] = [
      { wch: 18 }, // 订单号
      { wch: 12 }, // 客户姓名
      { wch: 14 }, // 客户电话
      { wch: 15 }, // 住宿地点
      { wch: 8 },  // 房间号
      { wch: 15 }, // 套餐
      { wch: 25 }, // 项目
      { wch: 6 },  // 人数
      { wch: 10 }, // 订单金额
      { wch: 10 }, // 订单状态
      { wch: 10 }, // 支付状态
      { wch: 12 }, // 下单日期
      { wch: 12 }, // 游玩日期
      { wch: 20 }, // 备注
    ];

    XLSX.utils.book_append_sheet(wb, ws, '订单列表');

    // 生成Excel buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    const fileName = `orders_${formatDate(new Date())}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);

    return res.send(buffer);
  } catch (error) {
    console.error('导出订单失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_ORDERS_ERROR',
        message: '导出订单失败',
      },
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getOrderStats,
  exportOrders,
};
