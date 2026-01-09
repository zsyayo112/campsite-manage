const prisma = require('../utils/prisma');

/**
 * @route   GET /api/shuttle/daily-stats
 * @desc    获取指定日期的接送人数统计
 * @access  Private (admin, operator, driver)
 */
const getDailyStats = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请提供日期参数 (date)',
        },
      });
    }

    // 解析日期
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 查询指定日期所有待处理/已确认/已完成的订单（排除已取消的）
    const orders = await prisma.order.findMany({
      where: {
        visitDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['pending', 'confirmed', 'completed'],
        },
      },
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
            type: true,
            distance: true,
            duration: true,
          },
        },
      },
    });

    // 调试信息：打印查询条件和结果
    console.log('========== 接送统计调试信息 ==========');
    console.log('查询日期:', date);
    console.log('日期范围:', { startOfDay, endOfDay });
    console.log('查询到的订单数:', orders.length);
    orders.forEach((order, index) => {
      console.log(`订单 ${index + 1}:`, {
        id: order.id,
        orderNumber: order.orderNumber,
        visitDate: order.visitDate,
        status: order.status,
        peopleCount: order.peopleCount,
        accommodationPlaceId: order.accommodationPlaceId,
        accommodationPlaceName: order.accommodationPlace?.name || '未设置',
      });
    });
    console.log('=====================================');

    // 按住宿地点分组统计
    const statsByAccommodation = {};
    let totalPeople = 0;

    for (const order of orders) {
      const accommodationId = order.accommodationPlaceId;
      const accommodation = order.accommodationPlace;

      // 跳过没有住宿地点的订单（理论上不应该存在）
      if (!accommodationId || !accommodation) {
        console.warn(`警告: 订单 ${order.orderNumber} 缺少住宿地点信息`);
        continue;
      }

      if (!statsByAccommodation[accommodationId]) {
        statsByAccommodation[accommodationId] = {
          accommodationPlace: accommodation,
          orderCount: 0,
          totalPeople: 0,
          customers: [],
        };
      }

      statsByAccommodation[accommodationId].orderCount += 1;
      statsByAccommodation[accommodationId].totalPeople += order.peopleCount;
      statsByAccommodation[accommodationId].customers.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        peopleCount: order.peopleCount,
        roomNumber: order.roomNumber,
      });

      totalPeople += order.peopleCount;
    }

    // 调试：打印分组统计结果
    console.log('========== 分组统计结果 ==========');
    console.log('总人数:', totalPeople);
    Object.entries(statsByAccommodation).forEach(([id, stats]) => {
      console.log(`住宿地点 ${stats.accommodationPlace?.name} (ID: ${id}):`, {
        订单数: stats.orderCount,
        人数: stats.totalPeople,
        客户数: stats.customers.length,
      });
    });
    console.log('==================================');

    // 转换为数组并按人数排序
    const accommodationStats = Object.values(statsByAccommodation).sort(
      (a, b) => b.totalPeople - a.totalPeople
    );

    // 查询已分配的接送调度
    const existingSchedules = await prisma.shuttleSchedule.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        vehicle: true,
        driver: true,
        shuttleStops: {
          include: {
            accommodationPlace: true,
          },
          orderBy: {
            stopOrder: 'asc',
          },
        },
      },
    });

    // 计算已分配人数
    let assignedPeople = 0;
    for (const schedule of existingSchedules) {
      for (const stop of schedule.shuttleStops) {
        assignedPeople += stop.passengerCount;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        date: date,
        totalOrders: orders.length,
        totalPeople,
        assignedPeople,
        unassignedPeople: totalPeople - assignedPeople,
        accommodationStats,
        existingSchedules,
      },
    });
  } catch (error) {
    console.error('获取每日接送统计失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_DAILY_STATS_ERROR',
        message: '获取每日接送统计失败',
      },
    });
  }
};

/**
 * @route   POST /api/shuttle/schedules
 * @desc    创建接送调度
 * @access  Private (admin, operator)
 */
const createSchedule = async (req, res) => {
  try {
    const {
      date,
      batchName,
      vehicleId,
      driverId,
      departureTime,
      returnTime,
      stops, // [{accommodationPlaceId, stopOrder, passengerCount}]
      notes,
    } = req.body;

    // 验证必填字段
    if (!date || !batchName || !vehicleId || !driverId || !departureTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段：date, batchName, vehicleId, driverId, departureTime',
        },
      });
    }

    if (!stops || !Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请至少添加一个接送站点',
        },
      });
    }

    // 验证车辆存在且可用
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VEHICLE_NOT_FOUND',
          message: '车辆不存在',
        },
      });
    }

    if (vehicle.status === 'maintenance') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VEHICLE_UNAVAILABLE',
          message: '车辆正在维护中，不可使用',
        },
      });
    }

    // 验证司机存在且在岗
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DRIVER_NOT_FOUND',
          message: '司机不存在',
        },
      });
    }

    if (driver.status !== 'on_duty') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DRIVER_UNAVAILABLE',
          message: '司机不在岗',
        },
      });
    }

    // 验证所有住宿地点存在
    for (const stop of stops) {
      const accommodation = await prisma.accommodationPlace.findUnique({
        where: { id: stop.accommodationPlaceId },
      });

      if (!accommodation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ACCOMMODATION_NOT_FOUND',
            message: `住宿地点ID ${stop.accommodationPlaceId} 不存在`,
          },
        });
      }
    }

    // 检查车辆和司机在该时间段是否已有调度
    const scheduleDate = new Date(date);
    const startOfDay = new Date(scheduleDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(scheduleDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conflictingSchedule = await prisma.shuttleSchedule.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        OR: [{ vehicleId }, { driverId }],
        status: { not: 'completed' },
      },
    });

    if (conflictingSchedule) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SCHEDULE_CONFLICT',
          message: '车辆或司机在该日期已有未完成的调度',
        },
      });
    }

    // 计算总乘客数
    const totalPassengers = stops.reduce((sum, stop) => sum + stop.passengerCount, 0);

    // 检查车辆座位数
    if (totalPassengers > vehicle.seats) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CAPACITY_EXCEEDED',
          message: `乘客总数 (${totalPassengers}) 超过车辆座位数 (${vehicle.seats})`,
        },
      });
    }

    // 创建接送调度
    const schedule = await prisma.shuttleSchedule.create({
      data: {
        date: new Date(date),
        batchName,
        vehicleId,
        driverId,
        departureTime: new Date(departureTime),
        returnTime: returnTime ? new Date(returnTime) : null,
        status: 'pending',
        notes,
        shuttleStops: {
          create: stops.map((stop) => ({
            accommodationPlaceId: stop.accommodationPlaceId,
            stopOrder: stop.stopOrder,
            passengerCount: stop.passengerCount,
          })),
        },
      },
      include: {
        vehicle: true,
        driver: true,
        shuttleStops: {
          include: {
            accommodationPlace: true,
          },
          orderBy: {
            stopOrder: 'asc',
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: schedule,
      message: '接送调度创建成功',
    });
  } catch (error) {
    console.error('创建接送调度失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_SCHEDULE_ERROR',
        message: '创建接送调度失败',
      },
    });
  }
};

/**
 * @route   GET /api/shuttle/schedules
 * @desc    获取接送调度列表
 * @access  Private (admin, operator, driver)
 */
const getSchedules = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      date,
      status,
      vehicleId,
      driverId,
      sortBy = 'date',
      order = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // 构建查询条件
    const where = {};

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (status) {
      where.status = status;
    }

    if (vehicleId) {
      where.vehicleId = parseInt(vehicleId);
    }

    if (driverId) {
      where.driverId = parseInt(driverId);
    }

    // 验证排序字段
    const allowedSortFields = ['date', 'departureTime', 'createdAt', 'batchName'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'date';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const [schedules, total] = await Promise.all([
      prisma.shuttleSchedule.findMany({
        where,
        skip,
        take,
        orderBy: { [sortField]: sortOrder },
        include: {
          vehicle: true,
          driver: true,
          shuttleStops: {
            include: {
              accommodationPlace: true,
            },
            orderBy: {
              stopOrder: 'asc',
            },
          },
        },
      }),
      prisma.shuttleSchedule.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: schedules,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    console.error('获取接送调度列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_SCHEDULES_ERROR',
        message: '获取接送调度列表失败',
      },
    });
  }
};

/**
 * @route   GET /api/shuttle/schedules/:id
 * @desc    获取接送调度详情
 * @access  Private (admin, operator, driver)
 */
const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.shuttleSchedule.findUnique({
      where: { id: parseInt(id) },
      include: {
        vehicle: true,
        driver: true,
        shuttleStops: {
          include: {
            accommodationPlace: true,
          },
          orderBy: {
            stopOrder: 'asc',
          },
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: '接送调度不存在',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error('获取接送调度详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_SCHEDULE_ERROR',
        message: '获取接送调度详情失败',
      },
    });
  }
};

/**
 * @route   GET /api/shuttle/schedules/:id/stops
 * @desc    获取接送调度站点详情（含客人名单）
 * @access  Private (admin, operator, driver)
 */
const getScheduleStops = async (req, res) => {
  try {
    const { id } = req.params;

    // 获取调度信息
    const schedule = await prisma.shuttleSchedule.findUnique({
      where: { id: parseInt(id) },
      include: {
        vehicle: true,
        driver: true,
        shuttleStops: {
          include: {
            accommodationPlace: true,
          },
          orderBy: {
            stopOrder: 'asc',
          },
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: '接送调度不存在',
        },
      });
    }

    // 获取该日期的所有已确认订单，按住宿地点分组
    const scheduleDate = schedule.date;
    const startOfDay = new Date(scheduleDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(scheduleDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 获取各站点对应的住宿地点ID
    const accommodationIds = schedule.shuttleStops.map((stop) => stop.accommodationPlaceId);

    // 查询这些住宿地点的订单
    const orders = await prisma.order.findMany({
      where: {
        visitDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['confirmed', 'completed'],
        },
        accommodationPlaceId: {
          in: accommodationIds,
        },
      },
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

    // 按住宿地点分组订单
    const ordersByAccommodation = {};
    for (const order of orders) {
      const accommodationId = order.accommodationPlaceId;
      if (!ordersByAccommodation[accommodationId]) {
        ordersByAccommodation[accommodationId] = [];
      }
      ordersByAccommodation[accommodationId].push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        peopleCount: order.peopleCount,
        roomNumber: order.roomNumber,
      });
    }

    // 构建站点详情，包含客人名单
    const stopsWithCustomers = schedule.shuttleStops.map((stop) => ({
      ...stop,
      customers: ordersByAccommodation[stop.accommodationPlaceId] || [],
    }));

    return res.status(200).json({
      success: true,
      data: {
        schedule: {
          id: schedule.id,
          date: schedule.date,
          batchName: schedule.batchName,
          departureTime: schedule.departureTime,
          returnTime: schedule.returnTime,
          status: schedule.status,
          notes: schedule.notes,
          vehicle: schedule.vehicle,
          driver: schedule.driver,
        },
        stops: stopsWithCustomers,
      },
    });
  } catch (error) {
    console.error('获取接送站点详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_SCHEDULE_STOPS_ERROR',
        message: '获取接送站点详情失败',
      },
    });
  }
};

/**
 * @route   PATCH /api/shuttle/schedules/:id/status
 * @desc    更新接送调度状态
 * @access  Private (admin, operator, driver)
 */
const updateScheduleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, returnTime } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请提供状态 (status)',
        },
      });
    }

    // 验证状态值
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `无效的状态，有效值: ${validStatuses.join(', ')}`,
        },
      });
    }

    // 检查调度是否存在
    const schedule = await prisma.shuttleSchedule.findUnique({
      where: { id: parseInt(id) },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: '接送调度不存在',
        },
      });
    }

    // 状态流转验证
    if (schedule.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: '已完成的调度不能更改状态',
        },
      });
    }

    // 准备更新数据
    const updateData = { status };

    // 如果状态改为 completed，可以更新返回时间
    if (status === 'completed' && returnTime) {
      updateData.returnTime = new Date(returnTime);
    }

    // 更新调度
    const updatedSchedule = await prisma.shuttleSchedule.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        vehicle: true,
        driver: true,
        shuttleStops: {
          include: {
            accommodationPlace: true,
          },
          orderBy: {
            stopOrder: 'asc',
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedSchedule,
      message: '接送调度状态更新成功',
    });
  } catch (error) {
    console.error('更新接送调度状态失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_SCHEDULE_STATUS_ERROR',
        message: '更新接送调度状态失败',
      },
    });
  }
};

/**
 * @route   DELETE /api/shuttle/schedules/:id
 * @desc    删除接送调度
 * @access  Private (admin)
 */
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查调度是否存在
    const schedule = await prisma.shuttleSchedule.findUnique({
      where: { id: parseInt(id) },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: '接送调度不存在',
        },
      });
    }

    // 只能删除待处理的调度
    if (schedule.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SCHEDULE',
          message: '只能删除待出发的调度',
        },
      });
    }

    // 删除调度（级联删除站点）
    await prisma.shuttleSchedule.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: '接送调度删除成功',
    });
  } catch (error) {
    console.error('删除接送调度失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_SCHEDULE_ERROR',
        message: '删除接送调度失败',
      },
    });
  }
};

// ==================== 车辆管理 ====================

/**
 * @route   GET /api/shuttle/vehicles
 * @desc    获取车辆列表
 * @access  Private (admin, operator, driver)
 */
const getVehicles = async (req, res) => {
  try {
    const { status, vehicleType } = req.query;

    const where = {};
    if (status) where.status = status;
    if (vehicleType) where.vehicleType = vehicleType;

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: vehicles,
    });
  } catch (error) {
    console.error('获取车辆列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_VEHICLES_ERROR',
        message: '获取车辆列表失败',
      },
    });
  }
};

/**
 * @route   POST /api/shuttle/vehicles
 * @desc    创建车辆
 * @access  Private (admin)
 */
const createVehicle = async (req, res) => {
  try {
    const { plateNumber, vehicleType, seats, status = 'available', notes } = req.body;

    if (!plateNumber || !vehicleType || !seats) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段：plateNumber, vehicleType, seats',
        },
      });
    }

    // 检查车牌号是否已存在
    const existing = await prisma.vehicle.findUnique({
      where: { plateNumber },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_PLATE_NUMBER',
          message: '车牌号已存在',
        },
      });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber,
        vehicleType,
        seats: parseInt(seats),
        status,
        notes,
      },
    });

    return res.status(201).json({
      success: true,
      data: vehicle,
      message: '车辆创建成功',
    });
  } catch (error) {
    console.error('创建车辆失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_VEHICLE_ERROR',
        message: '创建车辆失败',
      },
    });
  }
};

/**
 * @route   PUT /api/shuttle/vehicles/:id
 * @desc    更新车辆
 * @access  Private (admin)
 */
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { plateNumber, vehicleType, seats, status, notes } = req.body;

    // 检查车辆是否存在
    const existing = await prisma.vehicle.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'VEHICLE_NOT_FOUND',
          message: '车辆不存在',
        },
      });
    }

    // 如果要更新车牌号，检查是否重复
    if (plateNumber && plateNumber !== existing.plateNumber) {
      const duplicate = await prisma.vehicle.findUnique({
        where: { plateNumber },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'DUPLICATE_PLATE_NUMBER',
            message: '车牌号已存在',
          },
        });
      }
    }

    const updateData = {};
    if (plateNumber) updateData.plateNumber = plateNumber;
    if (vehicleType) updateData.vehicleType = vehicleType;
    if (seats) updateData.seats = parseInt(seats);
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const vehicle = await prisma.vehicle.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      data: vehicle,
      message: '车辆更新成功',
    });
  } catch (error) {
    console.error('更新车辆失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_VEHICLE_ERROR',
        message: '更新车辆失败',
      },
    });
  }
};

// ==================== 司机管理 ====================

/**
 * @route   GET /api/shuttle/drivers
 * @desc    获取司机列表
 * @access  Private (admin, operator)
 */
const getDrivers = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: drivers,
    });
  } catch (error) {
    console.error('获取司机列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_DRIVERS_ERROR',
        message: '获取司机列表失败',
      },
    });
  }
};

/**
 * @route   POST /api/shuttle/drivers
 * @desc    创建司机
 * @access  Private (admin)
 */
const createDriver = async (req, res) => {
  try {
    const { name, phone, userId, status = 'on_duty' } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段：name, phone',
        },
      });
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        phone,
        userId: userId ? parseInt(userId) : null,
        status,
      },
    });

    return res.status(201).json({
      success: true,
      data: driver,
      message: '司机创建成功',
    });
  } catch (error) {
    console.error('创建司机失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_DRIVER_ERROR',
        message: '创建司机失败',
      },
    });
  }
};

/**
 * @route   PUT /api/shuttle/drivers/:id
 * @desc    更新司机
 * @access  Private (admin)
 */
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, userId, status } = req.body;

    // 检查司机是否存在
    const existing = await prisma.driver.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DRIVER_NOT_FOUND',
          message: '司机不存在',
        },
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (userId !== undefined) updateData.userId = userId ? parseInt(userId) : null;
    if (status) updateData.status = status;

    const driver = await prisma.driver.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      data: driver,
      message: '司机更新成功',
    });
  } catch (error) {
    console.error('更新司机失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_DRIVER_ERROR',
        message: '更新司机失败',
      },
    });
  }
};

/**
 * @route   GET /api/shuttle/daily-stats/export
 * @desc    导出指定日期的接送统计Excel
 * @access  Private (admin, operator)
 */
const exportDailyStats = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请提供日期参数 (date)',
        },
      });
    }

    const XLSX = require('xlsx');

    // 解析日期
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 查询指定日期所有待处理/已确认/已完成的订单（排除已取消的）
    const orders = await prisma.order.findMany({
      where: {
        visitDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['pending', 'confirmed', 'completed'],
        },
      },
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
            type: true,
            distance: true,
            duration: true,
          },
        },
      },
      orderBy: [
        { accommodationPlaceId: 'asc' },
        { id: 'asc' },
      ],
    });

    // 按住宿地点分组统计
    const statsByAccommodation = {};
    let totalPeople = 0;

    for (const order of orders) {
      const accommodationId = order.accommodationPlaceId;
      const accommodation = order.accommodationPlace;

      if (!accommodationId || !accommodation) continue;

      if (!statsByAccommodation[accommodationId]) {
        statsByAccommodation[accommodationId] = {
          accommodationPlace: accommodation,
          orderCount: 0,
          totalPeople: 0,
          customers: [],
        };
      }

      statsByAccommodation[accommodationId].orderCount += 1;
      statsByAccommodation[accommodationId].totalPeople += order.peopleCount;
      statsByAccommodation[accommodationId].customers.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        peopleCount: order.peopleCount,
        roomNumber: order.roomNumber,
      });

      totalPeople += order.peopleCount;
    }

    // 查询已分配的接送调度
    const existingSchedules = await prisma.shuttleSchedule.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        vehicle: true,
        driver: true,
        shuttleStops: {
          include: {
            accommodationPlace: true,
          },
          orderBy: {
            stopOrder: 'asc',
          },
        },
      },
    });

    // 计算已分配人数
    let assignedPeople = 0;
    for (const schedule of existingSchedules) {
      for (const stop of schedule.shuttleStops) {
        assignedPeople += stop.passengerCount;
      }
    }

    const unassignedPeople = totalPeople - assignedPeople;

    // 计算车辆需求
    const calculateVehicleNeeds = (peopleCount) => {
      if (peopleCount <= 0) return { buses: 0, minibuses: 0, vans: 0 };
      let remaining = peopleCount;
      const buses = Math.floor(remaining / 45);
      remaining = remaining % 45;
      const minibuses = Math.floor(remaining / 20);
      remaining = remaining % 20;
      const vans = Math.ceil(remaining / 7);
      return { buses, minibuses, vans };
    };

    const vehicleNeeds = calculateVehicleNeeds(unassignedPeople);

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // Sheet 1: 统计概览
    const summaryData = [
      ['每日接送统计报表'],
      [''],
      ['日期', date],
      ['总订单数', orders.length],
      ['总人数', totalPeople],
      ['已安排人数', assignedPeople],
      ['待安排人数', unassignedPeople],
      [''],
      ['预估车辆需求（待安排人员）:'],
      ['大巴 (45座)', vehicleNeeds.buses],
      ['中巴 (20座)', vehicleNeeds.minibuses],
      ['商务车 (7座)', vehicleNeeds.vans],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, '统计概览');

    // Sheet 2: 住宿分布明细
    const accommodationData = [
      ['住宿地点', '类型', '订单数', '人数', '客人姓名', '客人电话', '人数', '房号'],
    ];

    const accommodationStats = Object.values(statsByAccommodation).sort(
      (a, b) => b.totalPeople - a.totalPeople
    );

    for (const stat of accommodationStats) {
      const accommodation = stat.accommodationPlace;
      const typeLabel = accommodation.type === 'self' ? '自营' : '外部';

      // 第一个客人行包含住宿地点信息
      if (stat.customers.length > 0) {
        const firstCustomer = stat.customers[0];
        accommodationData.push([
          accommodation.name,
          typeLabel,
          stat.orderCount,
          stat.totalPeople,
          firstCustomer.customer.name,
          firstCustomer.customer.phone,
          firstCustomer.peopleCount,
          firstCustomer.roomNumber || '',
        ]);

        // 后续客人只显示客人信息
        for (let i = 1; i < stat.customers.length; i++) {
          const customer = stat.customers[i];
          accommodationData.push([
            '',
            '',
            '',
            '',
            customer.customer.name,
            customer.customer.phone,
            customer.peopleCount,
            customer.roomNumber || '',
          ]);
        }
      } else {
        accommodationData.push([
          accommodation.name,
          typeLabel,
          stat.orderCount,
          stat.totalPeople,
          '',
          '',
          '',
          '',
        ]);
      }
    }

    const accommodationSheet = XLSX.utils.aoa_to_sheet(accommodationData);
    XLSX.utils.book_append_sheet(workbook, accommodationSheet, '住宿分布');

    // Sheet 3: 客人名单（接送清单）
    const customerData = [
      ['序号', '客人姓名', '联系电话', '人数', '接送地点（住宿）', '房号', '订单号'],
    ];

    let index = 1;
    for (const stat of accommodationStats) {
      for (const customer of stat.customers) {
        customerData.push([
          index++,
          customer.customer.name,
          customer.customer.phone,
          customer.peopleCount,
          stat.accommodationPlace.name,
          customer.roomNumber || '',
          customer.orderNumber,
        ]);
      }
    }

    const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
    XLSX.utils.book_append_sheet(workbook, customerSheet, '接送客人名单');

    // Sheet 4: 已安排调度
    if (existingSchedules.length > 0) {
      const scheduleData = [
        ['批次名称', '状态', '车牌号', '车型', '座位数', '司机', '司机电话', '出发时间', '停靠站点', '乘客数'],
      ];

      const statusLabels = {
        pending: '待出发',
        in_progress: '进行中',
        completed: '已完成',
      };

      for (const schedule of existingSchedules) {
        const stops = schedule.shuttleStops.map(
          (stop, idx) => `${idx + 1}.${stop.accommodationPlace.name}(${stop.passengerCount}人)`
        ).join('; ');

        const totalPassengers = schedule.shuttleStops.reduce(
          (sum, stop) => sum + stop.passengerCount, 0
        );

        scheduleData.push([
          schedule.batchName,
          statusLabels[schedule.status] || schedule.status,
          schedule.vehicle.plateNumber,
          schedule.vehicle.vehicleType,
          schedule.vehicle.seats,
          schedule.driver.name,
          schedule.driver.phone,
          new Date(schedule.departureTime).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          stops,
          totalPassengers,
        ]);
      }

      const scheduleSheet = XLSX.utils.aoa_to_sheet(scheduleData);
      XLSX.utils.book_append_sheet(workbook, scheduleSheet, '已安排调度');
    }

    // 生成Buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    const filename = `接送统计_${date}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    return res.send(excelBuffer);
  } catch (error) {
    console.error('导出每日接送统计失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_DAILY_STATS_ERROR',
        message: '导出每日接送统计失败',
      },
    });
  }
};

module.exports = {
  getDailyStats,
  exportDailyStats,
  createSchedule,
  getSchedules,
  getScheduleById,
  getScheduleStops,
  updateScheduleStatus,
  deleteSchedule,
  getVehicles,
  createVehicle,
  updateVehicle,
  getDrivers,
  createDriver,
  updateDriver,
};
