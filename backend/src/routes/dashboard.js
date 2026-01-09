const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

// 仪表盘统计 - admin, operator 可访问
router.get(
  '/stats',
  requireRole(['admin', 'operator']),
  dashboardController.getDashboardStats
);

router.get(
  '/revenue-trend',
  requireRole(['admin', 'operator']),
  dashboardController.getRevenueTrend
);

router.get(
  '/order-status',
  requireRole(['admin', 'operator']),
  dashboardController.getOrderStatusDistribution
);

router.get(
  '/project-ranking',
  requireRole(['admin', 'operator']),
  dashboardController.getProjectRanking
);

router.get(
  '/customer-source',
  requireRole(['admin', 'operator']),
  dashboardController.getCustomerSourceDistribution
);

module.exports = router;
