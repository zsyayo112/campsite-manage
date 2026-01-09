const prisma = require('../utils/prisma');

/**
 * 冲突检测函数
 * 检查场地容量和教练时间是否冲突
 */
const checkConflicts = async (options) => {
  const { date, projectId, startTime, endTime, coachId, participantCount, excludeScheduleId } = options;
  const conflicts = [];

  // 获取项目信息（包含场地容量）
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return { hasConflict: true, conflicts: [{ type: 'project', message: '项目不存在' }] };
  }

  // 1. 检查场地容量冲突
  if (project.capacity) {
    // 解析日期范围（使用日期的开始和结束时间）
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // 查找同一时段、同一项目的其他排期
    const overlappingSchedules = await prisma.dailySchedule.findMany({
      where: {
        date: {
          gte: targetDate,
          lt: nextDate,
        },
        projectId,
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        OR: [
          {
            // 新时段开始在现有时段内
            startTime: { lte: new Date(startTime) },
            endTime: { gt: new Date(startTime) },
          },
          {
            // 新时段结束在现有时段内
            startTime: { lt: new Date(endTime) },
            endTime: { gte: new Date(endTime) },
          },
          {
            // 新时段包含现有时段
            startTime: { gte: new Date(startTime) },
            endTime: { lte: new Date(endTime) },
          },
        ],
      },
    });

    // 计算该时段的总人数
    const totalParticipants = overlappingSchedules.reduce(
      (sum, schedule) => sum + schedule.participantCount,
      participantCount
    );

    if (totalParticipants > project.capacity) {
      conflicts.push({
        type: 'capacity',
        message: `场地容量超限：当前时段已有 ${totalParticipants - participantCount} 人，加上本次 ${participantCount} 人共 ${totalParticipants} 人，超过容量 ${project.capacity} 人`,
        details: {
          currentCount: totalParticipants - participantCount,
          newCount: participantCount,
          totalCount: totalParticipants,
          capacity: project.capacity,
          overlappingSchedules: overlappingSchedules.map((s) => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
            participantCount: s.participantCount,
          })),
        },
      });
    }
  }

  // 2. 检查教练时间冲突
  if (coachId) {
    // 解析日期范围（使用日期的开始和结束时间）
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const coachConflicts = await prisma.dailySchedule.findMany({
      where: {
        date: {
          gte: targetDate,
          lt: nextDate,
        },
        coachId,
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        OR: [
          {
            // 新时段开始在现有时段内
            startTime: { lte: new Date(startTime) },
            endTime: { gt: new Date(startTime) },
          },
          {
            // 新时段结束在现有时段内
            startTime: { lt: new Date(endTime) },
            endTime: { gte: new Date(endTime) },
          },
          {
            // 新时段包含现有时段
            startTime: { gte: new Date(startTime) },
            endTime: { lte: new Date(endTime) },
          },
        ],
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (coachConflicts.length > 0) {
      const coach = await prisma.coach.findUnique({
        where: { id: coachId },
        select: { id: true, name: true },
      });

      conflicts.push({
        type: 'coach',
        message: `教练时间冲突：${coach?.name || '教练'} 在该时段已有其他安排`,
        details: {
          coachId,
          coachName: coach?.name,
          conflictingSchedules: coachConflicts.map((s) => ({
            id: s.id,
            projectName: s.project.name,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        },
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
};

/**
 * @route   GET /api/schedules/daily
 * @desc    获取指定日期的所有排期（时间轴格式）
 * @access  Private (admin, operator, coach)
 */
const getDailySchedules = async (req, res) => {
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
    targetDate.setHours(0, 0, 0, 0);

    // 获取当天所有排期
    const schedules = await prisma.dailySchedule.findMany({
      where: {
        date: targetDate,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            duration: true,
            capacity: true,
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
      orderBy: [{ startTime: 'asc' }, { projectId: 'asc' }],
    });

    // 获取所有项目用于时间轴分组
    const projects = await prisma.project.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        duration: true,
        capacity: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 获取当天可用教练
    const coaches = await prisma.coach.findMany({
      where: { status: 'on_duty' },
      select: {
        id: true,
        name: true,
        phone: true,
        specialties: true,
      },
    });

    // 构建时间轴数据
    const timelineData = projects.map((project) => {
      const projectSchedules = schedules.filter((s) => s.projectId === project.id);

      // 计算该项目当天的总参与人数
      const totalParticipants = projectSchedules.reduce(
        (sum, s) => sum + s.participantCount,
        0
      );

      return {
        project: {
          id: project.id,
          name: project.name,
          duration: project.duration,
          capacity: project.capacity,
        },
        schedules: projectSchedules.map((s) => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          participantCount: s.participantCount,
          coach: s.coach,
          status: s.status,
          notes: s.notes,
          orderItemId: s.orderItemId,
        })),
        totalParticipants,
        remainingCapacity: project.capacity ? project.capacity - totalParticipants : null,
      };
    });

    // 统计信息
    const summary = {
      date: targetDate,
      totalSchedules: schedules.length,
      totalParticipants: schedules.reduce((sum, s) => sum + s.participantCount, 0),
      projectsWithSchedules: new Set(schedules.map((s) => s.projectId)).size,
      coachesAssigned: new Set(schedules.filter((s) => s.coachId).map((s) => s.coachId)).size,
    };

    return res.status(200).json({
      success: true,
      data: {
        timeline: timelineData,
        coaches,
        summary,
      },
    });
  } catch (error) {
    console.error('获取每日排期失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_DAILY_SCHEDULES_ERROR',
        message: '获取每日排期失败',
      },
    });
  }
};

/**
 * @route   POST /api/schedules
 * @desc    创建排期
 * @access  Private (admin, operator)
 */
const createSchedule = async (req, res) => {
  try {
    const {
      date,
      orderItemId,
      projectId,
      startTime,
      endTime,
      coachId,
      participantCount,
      notes,
      skipConflictCheck = false, // 允许跳过冲突检测（强制创建）
    } = req.body;

    // 验证必填字段
    if (!date || !projectId || !startTime || !endTime || !participantCount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段：date, projectId, startTime, endTime, participantCount',
        },
      });
    }

    // 验证项目存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: '项目不存在',
        },
      });
    }

    // 验证教练存在（如果提供）
    if (coachId) {
      const coach = await prisma.coach.findUnique({
        where: { id: coachId },
      });

      if (!coach) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'COACH_NOT_FOUND',
            message: '教练不存在',
          },
        });
      }
    }

    // 冲突检测
    if (!skipConflictCheck) {
      const conflictResult = await checkConflicts({
        date,
        projectId,
        startTime,
        endTime,
        coachId,
        participantCount,
      });

      if (conflictResult.hasConflict) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'SCHEDULE_CONFLICT',
            message: '存在排期冲突',
            conflicts: conflictResult.conflicts,
          },
        });
      }
    }

    // 解析日期
    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    // 创建排期
    const schedule = await prisma.dailySchedule.create({
      data: {
        date: scheduleDate,
        orderItemId: orderItemId || 0, // 0 表示手动创建的排期
        projectId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        coachId,
        participantCount,
        status: 'scheduled',
        notes,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            duration: true,
            capacity: true,
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
    });

    return res.status(201).json({
      success: true,
      data: schedule,
      message: '排期创建成功',
    });
  } catch (error) {
    console.error('创建排期失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_SCHEDULE_ERROR',
        message: '创建排期失败',
      },
    });
  }
};

/**
 * @route   GET /api/schedules/:id
 * @desc    获取排期详情
 * @access  Private (admin, operator, coach)
 */
const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.dailySchedule.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            capacity: true,
            price: true,
          },
        },
        coach: {
          select: {
            id: true,
            name: true,
            phone: true,
            specialties: true,
          },
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: '排期不存在',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error('获取排期详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_SCHEDULE_ERROR',
        message: '获取排期详情失败',
      },
    });
  }
};

/**
 * @route   PUT /api/schedules/:id
 * @desc    更新排期（支持拖拽调整时间）
 * @access  Private (admin, operator)
 */
const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      startTime,
      endTime,
      coachId,
      participantCount,
      status,
      notes,
      skipConflictCheck = false,
    } = req.body;

    // 检查排期存在
    const existing = await prisma.dailySchedule.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: '排期不存在',
        },
      });
    }

    // 验证教练存在（如果提供）
    if (coachId !== undefined && coachId !== null) {
      const coach = await prisma.coach.findUnique({
        where: { id: coachId },
      });

      if (!coach) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'COACH_NOT_FOUND',
            message: '教练不存在',
          },
        });
      }
    }

    // 冲突检测（如果更新了时间或教练或人数）
    if (!skipConflictCheck && (startTime || endTime || coachId !== undefined || participantCount)) {
      const conflictResult = await checkConflicts({
        date: existing.date,
        projectId: existing.projectId,
        startTime: startTime || existing.startTime,
        endTime: endTime || existing.endTime,
        coachId: coachId !== undefined ? coachId : existing.coachId,
        participantCount: participantCount || existing.participantCount,
        excludeScheduleId: parseInt(id),
      });

      if (conflictResult.hasConflict) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'SCHEDULE_CONFLICT',
            message: '存在排期冲突',
            conflicts: conflictResult.conflicts,
          },
        });
      }
    }

    // 构建更新数据
    const updateData = {};
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (coachId !== undefined) updateData.coachId = coachId;
    if (participantCount !== undefined) updateData.participantCount = participantCount;
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // 更新排期
    const schedule = await prisma.dailySchedule.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            duration: true,
            capacity: true,
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
    });

    return res.status(200).json({
      success: true,
      data: schedule,
      message: '排期更新成功',
    });
  } catch (error) {
    console.error('更新排期失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_SCHEDULE_ERROR',
        message: '更新排期失败',
      },
    });
  }
};

/**
 * @route   DELETE /api/schedules/:id
 * @desc    删除排期
 * @access  Private (admin, operator)
 */
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查排期存在
    const existing = await prisma.dailySchedule.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: '排期不存在',
        },
      });
    }

    // 删除排期
    await prisma.dailySchedule.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: '排期删除成功',
    });
  } catch (error) {
    console.error('删除排期失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_SCHEDULE_ERROR',
        message: '删除排期失败',
      },
    });
  }
};

/**
 * @route   POST /api/schedules/check-conflicts
 * @desc    检测排期冲突（预检）
 * @access  Private (admin, operator)
 */
const checkScheduleConflicts = async (req, res) => {
  try {
    const { date, projectId, startTime, endTime, coachId, participantCount, excludeScheduleId } = req.body;

    if (!date || !projectId || !startTime || !endTime || !participantCount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段：date, projectId, startTime, endTime, participantCount',
        },
      });
    }

    const result = await checkConflicts({
      date,
      projectId,
      startTime,
      endTime,
      coachId,
      participantCount,
      excludeScheduleId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('冲突检测失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CHECK_CONFLICTS_ERROR',
        message: '冲突检测失败',
      },
    });
  }
};

/**
 * @route   GET /api/schedules/coaches
 * @desc    获取教练列表
 * @access  Private (admin, operator, coach)
 */
const getCoaches = async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {};
    if (status) {
      where.status = status;
    }

    const [coaches, total] = await Promise.all([
      prisma.coach.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      prisma.coach.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: coaches,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    console.error('获取教练列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_COACHES_ERROR',
        message: '获取教练列表失败',
      },
    });
  }
};

/**
 * @route   POST /api/schedules/coaches
 * @desc    创建教练
 * @access  Private (admin)
 */
const createCoach = async (req, res) => {
  try {
    const { name, phone, specialties, status = 'on_duty', userId } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段：name, phone',
        },
      });
    }

    const coach = await prisma.coach.create({
      data: {
        name,
        phone,
        specialties: specialties ? JSON.stringify(specialties) : null,
        status,
        userId,
      },
    });

    return res.status(201).json({
      success: true,
      data: coach,
      message: '教练创建成功',
    });
  } catch (error) {
    console.error('创建教练失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_COACH_ERROR',
        message: '创建教练失败',
      },
    });
  }
};

/**
 * @route   PUT /api/schedules/coaches/:id
 * @desc    更新教练
 * @access  Private (admin)
 */
const updateCoach = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, specialties, status, userId } = req.body;

    const existing = await prisma.coach.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COACH_NOT_FOUND',
          message: '教练不存在',
        },
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (specialties !== undefined) updateData.specialties = JSON.stringify(specialties);
    if (status !== undefined) updateData.status = status;
    if (userId !== undefined) updateData.userId = userId;

    const coach = await prisma.coach.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      data: coach,
      message: '教练更新成功',
    });
  } catch (error) {
    console.error('更新教练失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_COACH_ERROR',
        message: '更新教练失败',
      },
    });
  }
};

/**
 * @route   GET /api/schedules/coaches/:id/availability
 * @desc    获取教练某日的可用时段
 * @access  Private (admin, operator)
 */
const getCoachAvailability = async (req, res) => {
  try {
    const { id } = req.params;
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

    const coach = await prisma.coach.findUnique({
      where: { id: parseInt(id) },
    });

    if (!coach) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COACH_NOT_FOUND',
          message: '教练不存在',
        },
      });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // 获取教练当天的排期
    const schedules = await prisma.dailySchedule.findMany({
      where: {
        date: targetDate,
        coachId: parseInt(id),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // 计算忙碌时段和空闲时段
    const busySlots = schedules.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      projectName: s.project.name,
      scheduleId: s.id,
    }));

    return res.status(200).json({
      success: true,
      data: {
        coach: {
          id: coach.id,
          name: coach.name,
          status: coach.status,
        },
        date: targetDate,
        busySlots,
        totalSchedules: schedules.length,
      },
    });
  } catch (error) {
    console.error('获取教练可用时段失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_COACH_AVAILABILITY_ERROR',
        message: '获取教练可用时段失败',
      },
    });
  }
};

/**
 * @route   PUT /api/schedules/:id/status
 * @desc    更新排期状态
 * @access  Private (admin, operator, coach)
 */
const updateScheduleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `无效的状态值，有效值为: ${validStatuses.join(', ')}`,
        },
      });
    }

    const existing = await prisma.dailySchedule.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SCHEDULE_NOT_FOUND',
          message: '排期不存在',
        },
      });
    }

    const schedule = await prisma.dailySchedule.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        coach: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: schedule,
      message: '排期状态更新成功',
    });
  } catch (error) {
    console.error('更新排期状态失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_STATUS_ERROR',
        message: '更新排期状态失败',
      },
    });
  }
};

module.exports = {
  getDailySchedules,
  createSchedule,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  checkScheduleConflicts,
  getCoaches,
  createCoach,
  updateCoach,
  getCoachAvailability,
  updateScheduleStatus,
};
