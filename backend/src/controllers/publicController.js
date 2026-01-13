const prisma = require('../utils/prisma');
const {
  generateBookingCode,
  calculateBookingPrice,
  generateConfirmText,
} = require('./bookingController');

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
 * @route   POST /api/public/bookings
 * @desc    公开预约提交（客户端无需登录）
 * @access  Public
 */
const submitBooking = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerWechat,
      visitDate,
      peopleCount,
      childCount = 0,
      hotelName,
      hotelId,
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
          message: '请填写完整信息：姓名、手机号、日期、人数、酒店',
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

    // 验证人数
    if (peopleCount < 1 || peopleCount > 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PEOPLE_COUNT',
          message: '人数应在1-50人之间',
        },
      });
    }

    // 验证儿童人数
    if (childCount < 0 || childCount > peopleCount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CHILD_COUNT',
          message: '儿童人数无效',
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
    } else {
      // 更新客户信息（如果有新的微信号）
      if (customerWechat && !customer.wechat) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { wechat: customerWechat },
        });
      }
    }

    // 查找住宿地点
    let hotel = null;
    if (hotelId) {
      hotel = await prisma.accommodationPlace.findUnique({
        where: { id: parseInt(hotelId) },
      });
    }
    if (!hotel) {
      hotel = await prisma.accommodationPlace.findFirst({
        where: { name: { contains: hotelName } },
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
        peopleCount: parseInt(peopleCount),
        childCount: parseInt(childCount),
        hotelName,
        hotelId: hotel?.id,
        roomNumber,
        packageId: packageId ? parseInt(packageId) : null,
        packageName,
        unitPrice: priceInfo.unitPrice,
        childPrice: priceInfo.childPrice,
        totalAmount: priceInfo.totalAmount,
        customerNotes: notes,
        source: 'wechat_form',
        status: 'pending',
      },
    });

    // 生成确认文本
    const confirmText = generateConfirmText(booking, packageName);

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
        peopleCount,
        childCount,
        adultCount: peopleCount - childCount,
        hotelName,
        roomNumber,
        packageName: packageName || '待定',
        unitPrice: priceInfo.unitPrice,
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

module.exports = {
  submitBooking,
  getPublicPackages,
  getPublicHotels,
  getBookingByCode,
};
