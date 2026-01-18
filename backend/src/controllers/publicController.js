const prisma = require('../utils/prisma');
const {
  generateBookingCode,
  calculateBookingPrice,
  generateConfirmText,
} = require('./bookingController');
const { syncCustomer, syncBooking } = require('../utils/sqlServerSync');

// 简单的频率限制存储（生产环境建议使用 Redis）
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5分钟
const MAX_REQUESTS = 3; // 同一手机号5分钟内最多3次

/**
 * 检查频率限制
 */
const checkRateLimit = (phone) => {
  const now = Date.now();
  const key = phone;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, firstRequest: now });
    return true;
  }

  const record = rateLimitStore.get(key);

  // 如果超过时间窗口，重置
  if (now - record.firstRequest > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(key, { count: 1, firstRequest: now });
    return true;
  }

  // 检查是否超过限制
  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
};

/**
 * 验证手机号格式
 */
const isValidPhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone);
};

/**
 * V2.2 价格计算逻辑
 * 成人(4岁以上): 298元/人
 * 儿童(4岁以下): 238元/人
 */
const calculateBookingPriceV2 = (packageInfo, visitDate, adultCount, childCount = 0) => {
  // 默认价格
  let adultPrice = 298;
  let childPrice = 238;

  // 如果有套餐，使用套餐价格
  if (packageInfo) {
    adultPrice = parseFloat(packageInfo.price) || 298;
    childPrice = packageInfo.childPrice ? parseFloat(packageInfo.childPrice) : 238;
  }

  // 检查特殊日期价格
  if (packageInfo?.specialPricing) {
    try {
      const special = typeof packageInfo.specialPricing === 'string'
        ? JSON.parse(packageInfo.specialPricing)
        : packageInfo.specialPricing;

      const visitDateStr = new Date(visitDate).toISOString().slice(0, 10);

      for (const [dateRange, pricing] of Object.entries(special)) {
        const [start, end] = dateRange.split('~');
        if (visitDateStr >= start && visitDateStr <= end) {
          adultPrice = pricing.price || adultPrice;
          childPrice = pricing.childPrice || childPrice;
          break;
        }
      }
    } catch (e) {
      console.error('解析特殊日期价格失败:', e);
    }
  }

  const totalAmount = adultCount * adultPrice + childCount * childPrice;

  return {
    adultPrice,
    childPrice,
    adultCount,
    childCount,
    totalAmount,
  };
};

/**
 * @route   POST /api/public/bookings
 * @desc    公开预约提交（客户端无需登录）V2.2 优化版
 * @access  Public
 */
const submitBooking = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerWechat,
      visitDate,
      adultCount = 1,        // V2.2: 成人人数（独立字段）
      childCount = 0,        // 儿童人数
      accommodationNotes,    // V2.2: 住宿备注（替代酒店选择）
      packageId,
      notes,
      // 兼容旧字段
      peopleCount,
      hotelName,
      hotelId,
      roomNumber,
    } = req.body;

    // V2.2: 兼容旧版本 - 如果传入 peopleCount 但没有 adultCount，则计算
    const finalAdultCount = adultCount || (peopleCount ? peopleCount - (childCount || 0) : 1);
    const finalChildCount = childCount || 0;
    const totalPeople = finalAdultCount + finalChildCount;

    // 验证必填字段（V2.2: 住宿信息改为可选）
    if (!customerName || !customerPhone || !visitDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请填写完整信息：姓名、手机号、日期',
        },
      });
    }

    // 验证手机号格式
    if (!isValidPhone(customerPhone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PHONE',
          message: '手机号格式不正确',
        },
      });
    }

    // 验证日期（不能早于今天）
    const visit = new Date(visitDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (visit < today) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE',
          message: '预约日期不能早于今天',
        },
      });
    }

    // 验证成人人数
    if (finalAdultCount < 1 || finalAdultCount > 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ADULT_COUNT',
          message: '成人人数应在1-50人之间',
        },
      });
    }

    // 验证儿童人数
    if (finalChildCount < 0 || finalChildCount > 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CHILD_COUNT',
          message: '儿童人数无效',
        },
      });
    }

    // 验证总人数
    if (totalPeople > 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOTAL_COUNT',
          message: '总人数不能超过50人',
        },
      });
    }

    // 频率限制检查
    if (!checkRateLimit(customerPhone)) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '提交过于频繁，请5分钟后再试',
        },
      });
    }

    // 验证并获取套餐信息
    let packageInfo = null;
    let packageName = null;
    if (packageId) {
      packageInfo = await prisma.package.findUnique({
        where: { id: parseInt(packageId) },
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

      if (!packageInfo.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PACKAGE_INACTIVE',
            message: '该套餐暂不可用',
          },
        });
      }

      packageName = packageInfo.name;
    }

    // V2.2: 使用新的价格计算逻辑
    const priceInfo = calculateBookingPriceV2(packageInfo, visitDate, finalAdultCount, finalChildCount);

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
    } else {
      // 更新客户信息（如果有新的微信号）
      if (customerWechat && !customer.wechat) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { wechat: customerWechat },
        });
      }
    }

    // V2.2: 住宿信息处理 - 优先使用备注，兼容旧版酒店选择
    const finalHotelName = hotelName || null;
    const finalAccommodationNotes = accommodationNotes || null;

    // 查找住宿地点（如果提供了酒店ID或名称）
    let hotel = null;
    if (hotelId) {
      hotel = await prisma.accommodationPlace.findUnique({
        where: { id: parseInt(hotelId) },
      });
    }
    if (!hotel && finalHotelName) {
      hotel = await prisma.accommodationPlace.findFirst({
        where: { name: { contains: finalHotelName } },
      });
    }

    // 创建预约
    const booking = await prisma.booking.create({
      data: {
        bookingCode,
        customerName,
        customerPhone,
        customerWechat,
        customerId: customer.id,
        visitDate: new Date(visitDate),
        adultCount: finalAdultCount,            // V2.2: 独立的成人人数
        childCount: finalChildCount,
        peopleCount: totalPeople,               // 兼容：总人数
        hotelName: finalHotelName,              // V2.2: 可选
        hotelId: hotel?.id,
        roomNumber,
        accommodationNotes: finalAccommodationNotes, // V2.2: 住宿备注
        packageId: packageId ? parseInt(packageId) : null,
        packageName,
        unitPrice: priceInfo.adultPrice,        // V2.2: 使用 adultPrice
        childPrice: priceInfo.childPrice,
        totalAmount: priceInfo.totalAmount,
        customerNotes: notes,
        source: 'wechat_form',
        status: 'pending',
      },
    });

    // 生成确认文本
    const confirmText = generateConfirmText(booking, packageName);

    // ============ 双写逻辑：同步到父亲的 SQL Server 数据库 ============
    // 异步执行，不阻塞主流程，失败不影响预约提交
    (async () => {
      try {
        // 1. 同步客户信息
        await syncCustomer({
          name: customerName,
          phone: customerPhone,
          wechat: customerWechat,
          source: 'wechat_form',
          notes: '',
        });

        // 2. 同步预约信息
        await syncBooking({
          bookingCode,
          customerName,
          customerPhone,
          visitDate,
          peopleCount: totalPeople,
          adultCount: finalAdultCount,
          childCount: finalChildCount,
          hotelName: finalHotelName,
          roomNumber,
          accommodationNotes: finalAccommodationNotes,
          packageName: packageName || '待定',
          totalAmount: priceInfo.totalAmount,
          unitPrice: priceInfo.adultPrice,  // 单价
          depositAmount: 0,
          status: 'pending',  // 在父亲系统中显示"待确认"
          notes: notes,
        });

        console.log(`[双写] 预约 ${bookingCode} 同步到 SQL Server 成功`);
      } catch (syncError) {
        // 记录错误但不影响主流程
        console.error(`[双写] 预约 ${bookingCode} 同步到 SQL Server 失败:`, syncError.message);
      }
    })();
    // ============ 双写逻辑结束 ============

    // 格式化返回日期
    const visitDateObj = new Date(visitDate);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const formattedDate = `${visitDateObj.getFullYear()}-${String(visitDateObj.getMonth() + 1).padStart(2, '0')}-${String(visitDateObj.getDate()).padStart(2, '0')}（${weekDays[visitDateObj.getDay()]}）`;

    return res.status(201).json({
      success: true,
      data: {
        bookingCode,
        visitDate: formattedDate,
        customerName,
        customerPhone: customerPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), // 脱敏
        adultCount: finalAdultCount,            // V2.2: 独立的成人人数
        childCount: finalChildCount,
        peopleCount: totalPeople,               // 兼容
        accommodationNotes: finalAccommodationNotes, // V2.2: 住宿备注
        hotelName: finalHotelName,              // 兼容
        roomNumber,
        packageName: packageName || '待定',
        adultPrice: priceInfo.adultPrice,       // V2.2: 成人价格
        childPrice: priceInfo.childPrice,
        totalAmount: priceInfo.totalAmount,
        confirmText,
      },
      message: '预约提交成功',
    });
  } catch (error) {
    console.error('提交预约失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SUBMIT_BOOKING_ERROR',
        message: '提交预约失败，请稍后重试',
      },
    });
  }
};

/**
 * @route   GET /api/public/packages
 * @desc    获取可用套餐列表（公开）
 * @access  Public
 */
const getPublicPackages = async (req, res) => {
  try {
    const packages = await prisma.package.findMany({
      where: {
        isActive: true,
        showInBookingForm: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        childPrice: true,
        specialPricing: true,
        minPeople: true,
        sortOrder: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    // 解析特殊价格配置
    const formattedPackages = packages.map((pkg) => {
      let specialPricing = null;
      if (pkg.specialPricing) {
        try {
          specialPricing = JSON.parse(pkg.specialPricing);
        } catch (e) {
          console.error('解析特殊价格配置失败:', e);
        }
      }

      return {
        ...pkg,
        price: parseFloat(pkg.price),
        childPrice: pkg.childPrice ? parseFloat(pkg.childPrice) : null,
        specialPricing,
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedPackages,
    });
  } catch (error) {
    console.error('获取套餐列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_PACKAGES_ERROR',
        message: '获取套餐列表失败',
      },
    });
  }
};

/**
 * @route   GET /api/public/hotels
 * @desc    获取酒店列表（公开）
 * @access  Public
 */
const getPublicHotels = async (req, res) => {
  try {
    const hotels = await prisma.accommodationPlace.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
      },
      orderBy: [
        { type: 'asc' }, // self 排在前面
        { name: 'asc' },
      ],
    });

    // 添加区域信息
    const formattedHotels = hotels.map((hotel) => {
      let area = '其他';
      if (hotel.address) {
        if (hotel.address.includes('二道白河')) {
          area = '二道白河';
        } else if (hotel.address.includes('万达')) {
          area = '万达度假区';
        } else if (hotel.address.includes('景区')) {
          area = '长白山景区';
        }
      }

      return {
        id: hotel.id,
        name: hotel.name,
        area,
        type: hotel.type,
      };
    });

    // 添加"其他"选项
    formattedHotels.push({
      id: null,
      name: '其他（请在备注中说明）',
      area: null,
      type: 'other',
    });

    return res.status(200).json({
      success: true,
      data: formattedHotels,
    });
  } catch (error) {
    console.error('获取酒店列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_HOTELS_ERROR',
        message: '获取酒店列表失败',
      },
    });
  }
};

/**
 * @route   GET /api/public/booking/:code
 * @desc    根据确认码查询预约状态（公开）
 * @access  Public
 */
const getBookingByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { bookingCode: code },
      select: {
        bookingCode: true,
        customerName: true,
        customerPhone: true,
        visitDate: true,
        peopleCount: true,
        childCount: true,
        hotelName: true,
        packageName: true,
        unitPrice: true,
        childPrice: true,
        totalAmount: true,
        depositAmount: true,
        status: true,
        createdAt: true,
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

    // 状态映射
    const statusMap = {
      pending: '待确认',
      confirmed: '已确认',
      converted: '已转订单',
      completed: '已完成',
      cancelled: '已取消',
    };

    return res.status(200).json({
      success: true,
      data: {
        ...booking,
        customerPhone: booking.customerPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        unitPrice: parseFloat(booking.unitPrice),
        childPrice: parseFloat(booking.childPrice),
        totalAmount: parseFloat(booking.totalAmount),
        depositAmount: parseFloat(booking.depositAmount),
        statusText: statusMap[booking.status] || booking.status,
      },
    });
  } catch (error) {
    console.error('查询预约失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_BOOKING_ERROR',
        message: '查询预约失败',
      },
    });
  }
};

/**
 * V2.2 新增：手机号脱敏处理
 */
const maskPhone = (phone) => {
  if (!phone || phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

/**
 * V2.2 新增：状态映射
 */
const getStatusText = (status) => {
  const statusMap = {
    pending: '待确认',
    confirmed: '已确认',
    converted: '已转订单',
    completed: '已完成',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
};

/**
 * @route   POST /api/public/orders/query
 * @desc    根据手机号查询订单列表（V2.2 新增）
 * @access  Public
 */
const queryOrdersByPhone = async (req, res) => {
  try {
    const { phone } = req.body;

    // 验证手机号
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PHONE',
          message: '请输入正确的手机号',
        },
      });
    }

    // 查询预约
    const bookings = await prisma.booking.findMany({
      where: { customerPhone: phone },
      select: {
        id: true,
        bookingCode: true,
        customerName: true,
        visitDate: true,
        adultCount: true,
        childCount: true,
        peopleCount: true,
        packageName: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // 最多返回20条
    });

    // 查询订单（通过客户手机号）
    const customer = await prisma.customer.findUnique({
      where: { phone },
    });

    let orders = [];
    if (customer) {
      orders = await prisma.order.findMany({
        where: { customerId: customer.id },
        select: {
          id: true,
          orderNumber: true,
          visitDate: true,
          peopleCount: true,
          totalAmount: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          package: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }

    // 格式化返回数据
    const formattedBookings = bookings.map((b) => ({
      id: b.id,
      bookingCode: b.bookingCode,
      type: 'booking',
      visitDate: b.visitDate,
      adultCount: b.adultCount || (b.peopleCount - (b.childCount || 0)),
      childCount: b.childCount || 0,
      peopleCount: b.peopleCount,
      packageName: b.packageName || '待定',
      totalAmount: parseFloat(b.totalAmount),
      status: b.status,
      statusText: getStatusText(b.status),
      createdAt: b.createdAt,
    }));

    const formattedOrders = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      type: 'order',
      visitDate: o.visitDate,
      peopleCount: o.peopleCount,
      packageName: o.package?.name || '待定',
      totalAmount: parseFloat(o.totalAmount),
      status: o.status,
      statusText: getStatusText(o.status),
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        bookings: formattedBookings,
        orders: formattedOrders,
      },
    });
  } catch (error) {
    console.error('查询订单失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'QUERY_ORDERS_ERROR',
        message: '查询订单失败',
      },
    });
  }
};

/**
 * @route   GET /api/public/orders/:type/:id
 * @desc    获取订单/预约详情（V2.2 新增）
 * @access  Public
 */
const getOrderDetail = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { phone } = req.query;

    // 验证手机号
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PHONE',
          message: '请提供有效的手机号进行验证',
        },
      });
    }

    if (type === 'booking') {
      // 查询预约详情
      const booking = await prisma.booking.findUnique({
        where: { id: parseInt(id) },
        include: {
          package: {
            select: { name: true, description: true },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '预约不存在' },
        });
      }

      // 验证手机号匹配
      if (booking.customerPhone !== phone) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: '无权查看此预约' },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          type: 'booking',
          id: booking.id,
          bookingCode: booking.bookingCode,
          customerName: booking.customerName,
          customerPhone: maskPhone(booking.customerPhone),
          visitDate: booking.visitDate,
          adultCount: booking.adultCount || (booking.peopleCount - (booking.childCount || 0)),
          childCount: booking.childCount || 0,
          peopleCount: booking.peopleCount,
          accommodationNotes: booking.accommodationNotes,
          hotelName: booking.hotelName,
          roomNumber: booking.roomNumber,
          packageName: booking.packageName || booking.package?.name || '待定',
          packageDescription: booking.package?.description,
          adultPrice: parseFloat(booking.unitPrice),
          childPrice: parseFloat(booking.childPrice),
          totalAmount: parseFloat(booking.totalAmount),
          depositAmount: parseFloat(booking.depositAmount || 0),
          status: booking.status,
          statusText: getStatusText(booking.status),
          customerNotes: booking.customerNotes,
          createdAt: booking.createdAt,
          pickupInfo: {
            time: '9:00',
            returnTime: '16:00',
            location: booking.accommodationNotes || booking.hotelName || '酒店大堂',
          },
        },
      });
    } else if (type === 'order') {
      // 查询订单详情
      const order = await prisma.order.findUnique({
        where: { id: parseInt(id) },
        include: {
          customer: {
            select: { name: true, phone: true },
          },
          accommodationPlace: {
            select: { name: true },
          },
          package: {
            select: { name: true, description: true },
          },
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '订单不存在' },
        });
      }

      // 验证手机号匹配
      if (order.customer?.phone !== phone) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: '无权查看此订单' },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          type: 'order',
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.name,
          customerPhone: maskPhone(order.customer?.phone),
          visitDate: order.visitDate,
          peopleCount: order.peopleCount,
          accommodationName: order.accommodationPlace?.name,
          roomNumber: order.roomNumber,
          packageName: order.package?.name || '待定',
          packageDescription: order.package?.description,
          totalAmount: parseFloat(order.totalAmount),
          status: order.status,
          statusText: getStatusText(order.status),
          paymentStatus: order.paymentStatus,
          notes: order.notes,
          createdAt: order.createdAt,
          pickupInfo: {
            time: '9:00',
            returnTime: '16:00',
            location: order.accommodationPlace?.name || '酒店大堂',
          },
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TYPE', message: '无效的类型' },
      });
    }
  } catch (error) {
    console.error('获取订单详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_ORDER_DETAIL_ERROR',
        message: '获取订单详情失败',
      },
    });
  }
};

/**
 * V2.2 新增：获取活动/项目列表（公开展示）
 * @route   GET /api/public/activities
 * @access  Public
 */
const getPublicActivities = async (req, res) => {
  try {
    const { season } = req.query; // winter, summer, all

    const where = {
      isActive: true,
      showInPublic: true,
    };

    // 季节过滤
    if (season && season !== 'all') {
      where.OR = [
        { season },
        { season: 'all' },
      ];
    }

    const activities = await prisma.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        unit: true,
        season: true,
        duration: true,
        capacity: true,
        coverImage: true,
        images: true,
        highlights: true,
        precautions: true,
        longDescription: true,
        sortOrder: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' },
      ],
    });

    // 格式化返回数据
    const formattedActivities = activities.map((activity) => {
      let images = [];
      let highlights = [];
      let precautions = [];

      // 解析 JSON 字段
      try {
        if (activity.images) {
          images = typeof activity.images === 'string'
            ? JSON.parse(activity.images)
            : activity.images;
        }
        if (activity.highlights) {
          highlights = typeof activity.highlights === 'string'
            ? JSON.parse(activity.highlights)
            : activity.highlights;
        }
        if (activity.precautions) {
          precautions = typeof activity.precautions === 'string'
            ? JSON.parse(activity.precautions)
            : activity.precautions;
        }
      } catch (e) {
        console.error('解析活动JSON字段失败:', e);
      }

      // 季节文本
      const seasonText = {
        winter: '冬季',
        summer: '夏季',
        all: '全年',
      };

      return {
        id: activity.id,
        name: activity.name,
        description: activity.description,
        price: parseFloat(activity.price),
        unit: activity.unit === 'per_person' ? '每人' : '每组',
        season: activity.season,
        seasonText: seasonText[activity.season] || '全年',
        duration: activity.duration,
        durationText: activity.duration >= 60
          ? `${Math.floor(activity.duration / 60)}小时${activity.duration % 60 > 0 ? `${activity.duration % 60}分钟` : ''}`
          : `${activity.duration}分钟`,
        capacity: activity.capacity,
        coverImage: activity.coverImage,
        images,
        highlights,
        precautions,
        longDescription: activity.longDescription,
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedActivities,
    });
  } catch (error) {
    console.error('获取活动列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_ACTIVITIES_ERROR',
        message: '获取活动列表失败',
      },
    });
  }
};

/**
 * V2.2 新增：获取活动详情（公开展示）
 * @route   GET /api/public/activities/:id
 * @access  Public
 */
const getPublicActivityDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await prisma.project.findFirst({
      where: {
        id: parseInt(id),
        isActive: true,
        showInPublic: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        unit: true,
        season: true,
        duration: true,
        capacity: true,
        coverImage: true,
        images: true,
        highlights: true,
        precautions: true,
        longDescription: true,
      },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACTIVITY_NOT_FOUND',
          message: '活动不存在或未公开',
        },
      });
    }

    // 解析 JSON 字段
    let images = [];
    let highlights = [];
    let precautions = [];

    try {
      if (activity.images) {
        images = typeof activity.images === 'string'
          ? JSON.parse(activity.images)
          : activity.images;
      }
      if (activity.highlights) {
        highlights = typeof activity.highlights === 'string'
          ? JSON.parse(activity.highlights)
          : activity.highlights;
      }
      if (activity.precautions) {
        precautions = typeof activity.precautions === 'string'
          ? JSON.parse(activity.precautions)
          : activity.precautions;
      }
    } catch (e) {
      console.error('解析活动JSON字段失败:', e);
    }

    // 季节文本
    const seasonText = {
      winter: '冬季',
      summer: '夏季',
      all: '全年',
    };

    return res.status(200).json({
      success: true,
      data: {
        id: activity.id,
        name: activity.name,
        description: activity.description,
        price: parseFloat(activity.price),
        unit: activity.unit === 'per_person' ? '每人' : '每组',
        season: activity.season,
        seasonText: seasonText[activity.season] || '全年',
        duration: activity.duration,
        durationText: activity.duration >= 60
          ? `${Math.floor(activity.duration / 60)}小时${activity.duration % 60 > 0 ? `${activity.duration % 60}分钟` : ''}`
          : `${activity.duration}分钟`,
        capacity: activity.capacity,
        coverImage: activity.coverImage,
        images,
        highlights,
        precautions,
        longDescription: activity.longDescription,
      },
    });
  } catch (error) {
    console.error('获取活动详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_ACTIVITY_DETAIL_ERROR',
        message: '获取活动详情失败',
      },
    });
  }
};

// 默认营地信息配置
const DEFAULT_CAMP_INFO = {
  name: '长白山双溪森林营地',
  slogan: '在自然中探索，在冰雪中成长',
  description: '长白山双溪森林营地位于长白山北坡，依托得天独厚的自然资源，为游客提供丰富的户外体验活动。冬季可体验滑雪、雪圈、冰雪徒步等项目；夏季可参与森林徒步、野外探险等活动。',
  location: {
    address: '吉林省延边朝鲜族自治州安图县二道白河镇',
    coordinates: {
      lat: 42.0389,
      lng: 128.0619,
    },
  },
  contact: {
    phone: '131-9620-1942',
    name: '郑长岭',
    wechat: 'shuangxi_camp',
  },
  features: [
    {
      icon: 'mountain',
      title: '得天独厚',
      description: '位于长白山北坡核心区域，自然风光优美',
    },
    {
      icon: 'snowflake',
      title: '冰雪乐园',
      description: '冬季积雪期长达5个月，雪质优良',
    },
    {
      icon: 'shield',
      title: '安全保障',
      description: '专业教练团队，完善的安全措施',
    },
    {
      icon: 'users',
      title: '贴心服务',
      description: '酒店接送，全程陪同，省心省力',
    },
  ],
  serviceFlow: [
    { step: 1, title: '在线预约', description: '通过微信表单提交预约信息' },
    { step: 2, title: '确认行程', description: '工作人员联系确认详细安排' },
    { step: 3, title: '支付定金', description: '支付100元/人定金确认预约' },
    { step: 4, title: '酒店接送', description: '9:00酒店大堂集合出发' },
    { step: 5, title: '畅玩体验', description: '专业教练带领畅玩各项活动' },
    { step: 6, title: '安全返回', description: '16:00送返酒店，结束愉快行程' },
  ],
  gallery: [],
};

/**
 * V2.2 新增：获取营地介绍信息
 * @route   GET /api/public/about
 * @access  Public
 */
const getCampInfo = async (req, res) => {
  try {
    // 从数据库读取配置
    const config = await prisma.siteConfig.findUnique({
      where: { key: 'camp_info' },
    });

    let campInfo = DEFAULT_CAMP_INFO;

    if (config && config.value) {
      try {
        const savedInfo = JSON.parse(config.value);
        // 合并配置，确保所有字段都有值
        campInfo = {
          ...DEFAULT_CAMP_INFO,
          ...savedInfo,
          location: {
            ...DEFAULT_CAMP_INFO.location,
            ...(savedInfo.location || {}),
          },
          contact: {
            ...DEFAULT_CAMP_INFO.contact,
            ...(savedInfo.contact || {}),
          },
          features: savedInfo.features || DEFAULT_CAMP_INFO.features,
          serviceFlow: savedInfo.serviceFlow || DEFAULT_CAMP_INFO.serviceFlow,
          gallery: savedInfo.gallery || DEFAULT_CAMP_INFO.gallery,
        };
      } catch (e) {
        console.error('解析营地配置失败，使用默认值:', e);
      }
    }

    return res.status(200).json({
      success: true,
      data: campInfo,
    });
  } catch (error) {
    console.error('获取营地信息失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_CAMP_INFO_ERROR',
        message: '获取营地信息失败',
      },
    });
  }
};

module.exports = {
  submitBooking,
  getPublicPackages,
  getPublicHotels,
  getBookingByCode,
  // V2.2 新增
  queryOrdersByPhone,
  getOrderDetail,
  getPublicActivities,
  getPublicActivityDetail,
  getCampInfo,
};
