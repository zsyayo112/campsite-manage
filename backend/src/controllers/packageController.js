const prisma = require('../utils/prisma');
const { Prisma } = require('@prisma/client');

/**
 * @route   GET /api/packages
 * @desc    获取套餐列表
 * @access  Private (admin, operator, marketer)
 */
const getPackages = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, isActive, includeItems = 'true' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const include = {};
    if (includeItems === 'true') {
      include.packageItems = {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              unit: true,
              season: true,
              duration: true,
            },
          },
        },
      };
    }

    const [packages, total] = await Promise.all([
      prisma.package.findMany({
        where,
        skip,
        take,
        orderBy: { sortOrder: 'asc' },
        include,
      }),
      prisma.package.count({ where }),
    ]);

    // 计算每个套餐的项目总价值（用于显示优惠幅度）
    const packagesWithValue = packages.map((pkg) => {
      if (pkg.packageItems && pkg.packageItems.length > 0) {
        const totalProjectValue = pkg.packageItems.reduce(
          (sum, item) => sum + parseFloat(item.project.price),
          0
        );
        const savings = totalProjectValue - parseFloat(pkg.price);
        return {
          ...pkg,
          totalProjectValue,
          savings: savings > 0 ? savings : 0,
          savingsPercent: savings > 0 ? Math.round((savings / totalProjectValue) * 100) : 0,
        };
      }
      return pkg;
    });

    return res.status(200).json({
      success: true,
      data: {
        items: packagesWithValue,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
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
 * @route   GET /api/packages/:id
 * @desc    获取套餐详情
 * @access  Private (admin, operator, marketer)
 */
const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    const pkg = await prisma.package.findUnique({
      where: { id: parseInt(id) },
      include: {
        packageItems: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                unit: true,
                season: true,
                duration: true,
                capacity: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
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

    // 计算套餐价值
    const totalProjectValue = pkg.packageItems.reduce(
      (sum, item) => sum + parseFloat(item.project.price),
      0
    );
    const totalDuration = pkg.packageItems.reduce(
      (sum, item) => sum + item.project.duration,
      0
    );
    const savings = totalProjectValue - parseFloat(pkg.price);

    return res.status(200).json({
      success: true,
      data: {
        ...pkg,
        totalProjectValue,
        totalDuration,
        savings: savings > 0 ? savings : 0,
        savingsPercent: savings > 0 ? Math.round((savings / totalProjectValue) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('获取套餐详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_PACKAGE_ERROR',
        message: '获取套餐详情失败',
      },
    });
  }
};

/**
 * @route   POST /api/packages
 * @desc    创建套餐
 * @access  Private (admin)
 */
const createPackage = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      minPeople,
      isActive = true,
      sortOrder = 0,
      projectIds, // 项目ID数组
    } = req.body;

    // 验证必填字段
    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段：name, price',
        },
      });
    }

    // 验证项目存在（如果提供了项目列表）
    if (projectIds && projectIds.length > 0) {
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
      });

      if (projects.length !== projectIds.length) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PROJECTS',
            message: '部分项目ID无效',
          },
        });
      }
    }

    // 创建套餐
    const pkg = await prisma.package.create({
      data: {
        name,
        description,
        price: new Prisma.Decimal(price),
        minPeople: minPeople || null,
        isActive,
        sortOrder,
        packageItems: projectIds && projectIds.length > 0
          ? {
              create: projectIds.map((projectId) => ({
                projectId,
              })),
            }
          : undefined,
      },
      include: {
        packageItems: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: pkg,
      message: '套餐创建成功',
    });
  } catch (error) {
    console.error('创建套餐失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_PACKAGE_ERROR',
        message: '创建套餐失败',
      },
    });
  }
};

/**
 * @route   PUT /api/packages/:id
 * @desc    更新套餐
 * @access  Private (admin)
 */
const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      minPeople,
      isActive,
      sortOrder,
      projectIds, // 更新后的项目ID数组
    } = req.body;

    // 检查套餐是否存在
    const existing = await prisma.package.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PACKAGE_NOT_FOUND',
          message: '套餐不存在',
        },
      });
    }

    // 验证项目存在（如果提供了项目列表）
    if (projectIds && projectIds.length > 0) {
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
      });

      if (projects.length !== projectIds.length) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PROJECTS',
            message: '部分项目ID无效',
          },
        });
      }
    }

    // 构建更新数据
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = new Prisma.Decimal(price);
    if (minPeople !== undefined) updateData.minPeople = minPeople;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    // 使用事务更新套餐和项目关联
    const pkg = await prisma.$transaction(async (tx) => {
      // 更新套餐基本信息
      const updated = await tx.package.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      // 如果提供了项目列表，更新关联关系
      if (projectIds !== undefined) {
        // 删除旧的关联
        await tx.packageItem.deleteMany({
          where: { packageId: parseInt(id) },
        });

        // 创建新的关联
        if (projectIds.length > 0) {
          await tx.packageItem.createMany({
            data: projectIds.map((projectId) => ({
              packageId: parseInt(id),
              projectId,
            })),
          });
        }
      }

      // 返回更新后的完整数据
      return tx.package.findUnique({
        where: { id: parseInt(id) },
        include: {
          packageItems: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
      });
    });

    return res.status(200).json({
      success: true,
      data: pkg,
      message: '套餐更新成功',
    });
  } catch (error) {
    console.error('更新套餐失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_PACKAGE_ERROR',
        message: '更新套餐失败',
      },
    });
  }
};

/**
 * @route   DELETE /api/packages/:id
 * @desc    删除套餐
 * @access  Private (admin)
 */
const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查套餐是否存在
    const existing = await prisma.package.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PACKAGE_NOT_FOUND',
          message: '套餐不存在',
        },
      });
    }

    // 检查是否有关联订单
    if (existing._count.orders > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PACKAGE_HAS_ORDERS',
          message: `该套餐有 ${existing._count.orders} 个关联订单，无法删除。建议设置为停用状态。`,
        },
      });
    }

    // 删除套餐（级联删除关联项目）
    await prisma.package.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: '套餐删除成功',
    });
  } catch (error) {
    console.error('删除套餐失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_PACKAGE_ERROR',
        message: '删除套餐失败',
      },
    });
  }
};

/**
 * @route   POST /api/packages/:id/items
 * @desc    添加项目到套餐
 * @access  Private (admin)
 */
const addPackageItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请提供项目ID (projectId)',
        },
      });
    }

    // 检查套餐存在
    const pkg = await prisma.package.findUnique({
      where: { id: parseInt(id) },
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

    // 检查项目存在
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

    // 检查项目是否已在套餐中
    const existingItem = await prisma.packageItem.findFirst({
      where: {
        packageId: parseInt(id),
        projectId,
      },
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ITEM_EXISTS',
          message: '该项目已在套餐中',
        },
      });
    }

    // 添加项目到套餐
    await prisma.packageItem.create({
      data: {
        packageId: parseInt(id),
        projectId,
      },
    });

    // 返回更新后的套餐
    const updatedPkg = await prisma.package.findUnique({
      where: { id: parseInt(id) },
      include: {
        packageItems: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedPkg,
      message: '项目添加成功',
    });
  } catch (error) {
    console.error('添加项目到套餐失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'ADD_PACKAGE_ITEM_ERROR',
        message: '添加项目到套餐失败',
      },
    });
  }
};

/**
 * @route   DELETE /api/packages/:id/items/:projectId
 * @desc    从套餐中移除项目
 * @access  Private (admin)
 */
const removePackageItem = async (req, res) => {
  try {
    const { id, projectId } = req.params;

    // 检查套餐存在
    const pkg = await prisma.package.findUnique({
      where: { id: parseInt(id) },
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

    // 查找并删除关联
    const deleted = await prisma.packageItem.deleteMany({
      where: {
        packageId: parseInt(id),
        projectId: parseInt(projectId),
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: '该项目不在套餐中',
        },
      });
    }

    // 返回更新后的套餐
    const updatedPkg = await prisma.package.findUnique({
      where: { id: parseInt(id) },
      include: {
        packageItems: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedPkg,
      message: '项目移除成功',
    });
  } catch (error) {
    console.error('从套餐移除项目失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'REMOVE_PACKAGE_ITEM_ERROR',
        message: '从套餐移除项目失败',
      },
    });
  }
};

/**
 * @route   POST /api/packages/calculate-price
 * @desc    计算订单价格（预览）
 * @access  Private (admin, operator)
 */
const calculatePrice = async (req, res) => {
  try {
    const {
      packageId,
      extraProjectIds, // 额外项目ID数组
      customProjectIds, // 自由组合项目ID数组（不使用套餐时）
      peopleCount = 1,
    } = req.body;

    if (!peopleCount || peopleCount < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '人数 (peopleCount) 必须大于0',
        },
      });
    }

    let packagePrice = 0;
    let packageInfo = null;
    let extraProjectsPrice = 0;
    let extraProjects = [];
    let customProjectsPrice = 0;
    let customProjects = [];

    // 1. 计算套餐价格
    if (packageId) {
      const pkg = await prisma.package.findUnique({
        where: { id: packageId },
        include: {
          packageItems: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  unit: true,
                },
              },
            },
          },
        },
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

      // 检查最低人数限制
      if (pkg.minPeople && peopleCount < pkg.minPeople) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MIN_PEOPLE_NOT_MET',
            message: `该套餐最低需要 ${pkg.minPeople} 人`,
          },
        });
      }

      packagePrice = parseFloat(pkg.price) * peopleCount;
      packageInfo = {
        id: pkg.id,
        name: pkg.name,
        unitPrice: parseFloat(pkg.price),
        peopleCount,
        subtotal: packagePrice,
        projects: pkg.packageItems.map((item) => item.project),
      };
    }

    // 2. 计算额外项目价格（套餐之外的）
    if (extraProjectIds && extraProjectIds.length > 0) {
      const projects = await prisma.project.findMany({
        where: { id: { in: extraProjectIds } },
        select: {
          id: true,
          name: true,
          price: true,
          unit: true,
          isActive: true,
        },
      });

      for (const project of projects) {
        if (!project.isActive) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'PROJECT_INACTIVE',
              message: `项目"${project.name}"已停用`,
            },
          });
        }

        const subtotal = parseFloat(project.price) * peopleCount;
        extraProjectsPrice += subtotal;
        extraProjects.push({
          id: project.id,
          name: project.name,
          unitPrice: parseFloat(project.price),
          peopleCount,
          subtotal,
        });
      }
    }

    // 3. 计算自由组合项目价格（不使用套餐时）
    if (!packageId && customProjectIds && customProjectIds.length > 0) {
      const projects = await prisma.project.findMany({
        where: { id: { in: customProjectIds } },
        select: {
          id: true,
          name: true,
          price: true,
          unit: true,
          isActive: true,
        },
      });

      for (const project of projects) {
        if (!project.isActive) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'PROJECT_INACTIVE',
              message: `项目"${project.name}"已停用`,
            },
          });
        }

        const subtotal = parseFloat(project.price) * peopleCount;
        customProjectsPrice += subtotal;
        customProjects.push({
          id: project.id,
          name: project.name,
          unitPrice: parseFloat(project.price),
          peopleCount,
          subtotal,
        });
      }
    }

    // 计算总价
    const totalAmount = packagePrice + extraProjectsPrice + customProjectsPrice;

    return res.status(200).json({
      success: true,
      data: {
        package: packageInfo,
        extraProjects: extraProjects.length > 0 ? extraProjects : null,
        customProjects: customProjects.length > 0 ? customProjects : null,
        summary: {
          packagePrice,
          extraProjectsPrice,
          customProjectsPrice,
          totalAmount,
          peopleCount,
        },
      },
    });
  } catch (error) {
    console.error('计算价格失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CALCULATE_PRICE_ERROR',
        message: '计算价格失败',
      },
    });
  }
};

module.exports = {
  getPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  addPackageItem,
  removePackageItem,
  calculatePrice,
};
