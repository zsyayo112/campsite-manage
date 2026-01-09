const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, requireRole } = require('../middleware/auth');

/**
 * 用户管理路由
 * Base path: /api/users
 * 所有路由都需要管理员权限
 */

// 应用认证中间件
router.use(authMiddleware);

/**
 * @route   GET /api/users
 * @desc    获取用户列表
 * @access  Admin
 */
router.get('/', requireRole(['admin']), userController.getUsers);

/**
 * @route   GET /api/users/:id
 * @desc    获取用户详情
 * @access  Admin
 */
router.get('/:id', requireRole(['admin']), userController.getUserById);

/**
 * @route   POST /api/users
 * @desc    创建用户
 * @access  Admin
 */
router.post('/', requireRole(['admin']), userController.createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    更新用户
 * @access  Admin
 */
router.put('/:id', requireRole(['admin']), userController.updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    删除用户
 * @access  Admin
 */
router.delete('/:id', requireRole(['admin']), userController.deleteUser);

/**
 * @route   PUT /api/users/:id/reset-password
 * @desc    重置用户密码
 * @access  Admin
 */
router.put('/:id/reset-password', requireRole(['admin']), userController.resetPassword);

module.exports = router;
