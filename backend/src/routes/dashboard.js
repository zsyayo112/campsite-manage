const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { testConnection, getTableStructure } = require('../utils/sqlServerSync');

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

/**
 * @route   GET /api/dashboard/test-sqlserver
 * @desc    测试 SQL Server 连接（父亲的数据库）
 * @access  Private (admin only)
 */
router.get('/test-sqlserver', requireRole(['admin']), async (req, res) => {
  try {
    const connected = await testConnection();
    if (connected) {
      // 获取表结构
      const kehuStructure = await getTableStructure('table_kehu');
      const dingdanStructure = await getTableStructure('table_dingdan');

      return res.status(200).json({
        success: true,
        message: 'SQL Server 连接成功',
        data: {
          tables: {
            table_kehu: kehuStructure,
            table_dingdan: dingdanStructure,
          },
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: 'SQL Server 连接失败',
        },
      });
    }
  } catch (error) {
    console.error('测试 SQL Server 连接失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: error.message,
      },
    });
  }
});

module.exports = router;
