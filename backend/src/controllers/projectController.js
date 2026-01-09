const prisma = require('../utils/prisma');

/**
 * @route   GET /api/projects
 * @desc    获取项目列表
 * @access  Private
 */
const getProjects = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search, season, isActive } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (season) {
      where.season = season;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.project.count({ where }),
    ]);

    // 转换价格为数字
    const projectsWithPrice = projects.map(p => ({
      ...p,
      price: Number(p.price),
    }));

    return res.status(200).json({
      success: true,
      data: {
        items: projectsWithPrice,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_PROJECTS_ERROR',
        message: '获取项目列表失败',
      },
    });
  }
};

/**
 * @route   GET /api/projects/:id
 * @desc    获取项目详情
 * @access  Private
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        packageItems: {
          include: {
            package: true,
          },
        },
      },
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

    return res.status(200).json({
      success: true,
      data: {
        ...project,
        price: Number(project.price),
      },
    });
  } catch (error) {
    console.error('获取项目详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_PROJECT_ERROR',
        message: '获取项目详情失败',
      },
    });
  }
};

/**
 * @route   POST /api/projects
 * @desc    创建项目
 * @access  Admin
 */
const createProject = async (req, res) => {
  try {
    const { name, description, price, unit, season, duration, capacity, isActive, sortOrder } = req.body;

    // 验证必填字段
    if (!name || price === undefined || !unit || duration === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段',
          details: {
            name: !name ? '项目名称不能为空' : undefined,
            price: price === undefined ? '价格不能为空' : undefined,
            unit: !unit ? '计价单位不能为空' : undefined,
            duration: duration === undefined ? '时长不能为空' : undefined,
          },
        },
      });
    }

    // 验证计价单位
    if (!['per_person', 'per_group'].includes(unit)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '计价单位无效，必须是 per_person 或 per_group',
        },
      });
    }

    // 验证季节
    if (season && !['winter', 'summer', 'all'].includes(season)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '季节无效，必须是 winter、summer 或 all',
        },
      });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        price,
        unit,
        season: season || 'all',
        duration: parseInt(duration),
        capacity: capacity ? parseInt(capacity) : null,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        ...project,
        price: Number(project.price),
      },
      message: '项目创建成功',
    });
  } catch (error) {
    console.error('创建项目失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_PROJECT_ERROR',
        message: '创建项目失败',
      },
    });
  }
};

/**
 * @route   PUT /api/projects/:id
 * @desc    更新项目
 * @access  Admin
 */
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, unit, season, duration, capacity, isActive, sortOrder } = req.body;

    // 检查项目是否存在
    const existingProject = await prisma.project.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: '项目不存在',
        },
      });
    }

    // 验证计价单位
    if (unit && !['per_person', 'per_group'].includes(unit)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '计价单位无效',
        },
      });
    }

    // 验证季节
    if (season && !['winter', 'summer', 'all'].includes(season)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '季节无效',
        },
      });
    }

    // 准备更新数据
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (price !== undefined) updateData.price = price;
    if (unit !== undefined) updateData.unit = unit;
    if (season !== undefined) updateData.season = season;
    if (duration !== undefined) updateData.duration = parseInt(duration);
    if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const project = await prisma.project.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      data: {
        ...project,
        price: Number(project.price),
      },
      message: '项目更新成功',
    });
  } catch (error) {
    console.error('更新项目失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_PROJECT_ERROR',
        message: '更新项目失败',
      },
    });
  }
};

/**
 * @route   DELETE /api/projects/:id
 * @desc    删除项目
 * @access  Admin
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        orderItems: true,
        packageItems: true,
      },
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

    // 检查是否有关联订单
    if (project.orderItems.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PROJECT_HAS_ORDERS',
          message: '该项目有关联订单，无法删除',
          details: {
            orderCount: project.orderItems.length,
          },
        },
      });
    }

    // 检查是否有关联套餐
    if (project.packageItems.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PROJECT_HAS_PACKAGES',
          message: '该项目被套餐引用，请先从套餐中移除',
          details: {
            packageCount: project.packageItems.length,
          },
        },
      });
    }

    await prisma.project.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: '项目删除成功',
    });
  } catch (error) {
    console.error('删除项目失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_PROJECT_ERROR',
        message: '删除项目失败',
      },
    });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
