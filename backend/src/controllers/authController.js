const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

/**
 * 用户登录
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '用户名和密码不能为空',
          details: {
            username: !username ? '用户名不能为空' : undefined,
            password: !password ? '密码不能为空' : undefined,
          },
        },
      });
    }

    // 查询用户
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '用户名或密码错误',
        },
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '用户名或密码错误',
        },
      });
    }

    // 生成 JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      }
    );

    // 返回成功响应
    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          realName: user.realName,
          phone: user.phone,
        },
      },
      message: '登录成功',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '服务器错误',
      },
    });
  }
};

/**
 * 用户登出
 * POST /api/auth/logout
 * 注意：JWT 是无状态的，前端需要删除存储的 token
 */
const logout = async (req, res) => {
  try {
    // 在实际应用中，可以在这里实现 token 黑名单
    // 或者记录登出日志等操作

    return res.status(200).json({
      success: true,
      message: '登出成功',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '服务器错误',
      },
    });
  }
};

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
  try {
    // req.user 由 authMiddleware 中间件设置
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '服务器错误',
      },
    });
  }
};

/**
 * 修改密码
 * PUT /api/auth/password
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // 验证必填字段
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '旧密码和新密码不能为空',
        },
      });
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '新密码长度不能少于 6 位',
        },
      });
    }

    // 查询用户
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: '旧密码错误',
        },
      });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passwordHash: hashedPassword,
      },
    });

    return res.status(200).json({
      success: true,
      message: '密码修改成功',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '服务器错误',
      },
    });
  }
};

module.exports = {
  login,
  logout,
  getCurrentUser,
  changePassword,
};
