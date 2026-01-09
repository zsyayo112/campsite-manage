const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

/**
 * 认证路由
 * Base path: /api/auth
 */

// 公开路由 - 不需要认证
router.post('/login', authController.login);

// 受保护路由 - 需要认证
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/password', authMiddleware, authController.changePassword);

module.exports = router;
