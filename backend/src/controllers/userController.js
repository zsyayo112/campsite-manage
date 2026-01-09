const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');

// 角色映射
const roleLabels = {
  admin: '管理员',
  operator: '运营',
  driver: '司机',
  coach: '教练',
  marketer: '营销',
};

/**
 * @route   GET /api/users
 * @desc    获取用户列表
 * @access  Admin
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search, role } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {};

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { realName: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          role: true,
          realName: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: users,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_USERS_ERROR',
        message: '获取用户列表失败',
      },
    });
  }
};

/**
 * @route   GET /api/users/:id
 * @desc    获取用户详情
 * @access  Admin
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        role: true,
        realName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_USER_ERROR',
        message: '获取用户详情失败',
      },
    });
  }
};

/**
 * @route   POST /api/users
 * @desc    创建用户
 * @access  Admin
 */
const createUser = async (req, res) => {
  try {
    const { username, password, role, realName, phone } = req.body;

    // 验证必填字段
    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段',
          details: {
            username: !username ? '用户名不能为空' : undefined,
            password: !password ? '密码不能为空' : undefined,
            role: !role ? '角色不能为空' : undefined,
          },
        },
      });
    }

    // 验证角色
    const validRoles = ['admin', 'operator', 'driver', 'coach', 'marketer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `角色无效，有效值: ${validRoles.join(', ')}`,
        },
      });
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '密码长度不能少于6位',
        },
      });
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: '用户名已存在',
        },
      });
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
        realName: realName || null,
        phone: phone || null,
      },
      select: {
        id: true,
        username: true,
        role: true,
        realName: true,
        phone: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: user,
      message: '用户创建成功',
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_USER_ERROR',
        message: '创建用户失败',
      },
    });
  }
};

/**
 * @route   PUT /api/users/:id
 * @desc    更新用户
 * @access  Admin
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, realName, phone } = req.body;

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
        },
      });
    }

    // 验证角色
    if (role) {
      const validRoles = ['admin', 'operator', 'driver', 'coach', 'marketer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `角色无效，有效值: ${validRoles.join(', ')}`,
          },
        });
      }
    }

    // 如果更改用户名，检查是否已存在
    if (username && username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username },
      });

      if (usernameExists) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'USERNAME_EXISTS',
            message: '用户名已存在',
          },
        });
      }
    }

    // 构建更新数据
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (role !== undefined) updateData.role = role;
    if (realName !== undefined) updateData.realName = realName || null;
    if (phone !== undefined) updateData.phone = phone || null;

    // 如果提供了新密码
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '密码长度不能少于6位',
          },
        });
      }
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        realName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: user,
      message: '用户更新成功',
    });
  } catch (error) {
    console.error('更新用户失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_USER_ERROR',
        message: '更新用户失败',
      },
    });
  }
};

/**
 * @route   DELETE /api/users/:id
 * @desc    删除用户
 * @access  Admin
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
        },
      });
    }

    // 防止删除自己
    if (req.user && req.user.id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: '不能删除当前登录的账号',
        },
      });
    }

    // 检查是否是最后一个管理员
    if (user.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin' },
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'LAST_ADMIN',
            message: '不能删除最后一个管理员账号',
          },
        });
      }
    }

    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: '用户删除成功',
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_USER_ERROR',
        message: '删除用户失败',
      },
    });
  }
};

/**
 * @route   PUT /api/users/:id/reset-password
 * @desc    重置用户密码
 * @access  Admin
 */
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '新密码不能为空',
        },
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '密码长度不能少于6位',
        },
      });
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
        },
      });
    }

    // 加密新密码
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { passwordHash },
    });

    return res.status(200).json({
      success: true,
      message: '密码重置成功',
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'RESET_PASSWORD_ERROR',
        message: '重置密码失败',
      },
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
};
