const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authMiddleware, requireRole } = require('../middleware/auth');

/**
 * 客户管理路由
 * Base path: /api/customers
 * 所有路由都需要认证
 */

// 应用认证中间件到所有路由
router.use(authMiddleware);

/**
 * @route   GET /api/customers/stats
 * @desc    获取客户统计信息
 * @access  Admin, Operator
 */
router.get('/stats',
  requireRole(['admin', 'operator']),
  customerController.getCustomerStats
);

/**
 * @route   GET /api/customers/export
 * @desc    导出客户列表到 Excel
 * @access  Admin, Operator
 */
router.get('/export',
  requireRole(['admin', 'operator']),
  customerController.exportCustomers
);

/**
 * @route   GET /api/customers
 * @desc    获取客户列表（支持分页、搜索、筛选、排序）
 * @access  Admin, Operator, Marketer
 */
router.get('/',
  requireRole(['admin', 'operator', 'marketer']),
  customerController.getCustomers
);

/**
 * @route   GET /api/customers/:id
 * @desc    获取客户详情
 * @access  Admin, Operator
 */
router.get('/:id',
  requireRole(['admin', 'operator']),
  customerController.getCustomerById
);

/**
 * @route   POST /api/customers
 * @desc    创建客户
 * @access  Admin, Operator
 */
router.post('/',
  requireRole(['admin', 'operator']),
  customerController.createCustomer
);

/**
 * @route   PUT /api/customers/:id
 * @desc    更新客户信息
 * @access  Admin, Operator
 */
router.put('/:id',
  requireRole(['admin', 'operator']),
  customerController.updateCustomer
);

/**
 * @route   DELETE /api/customers/:id
 * @desc    删除客户
 * @access  Admin
 */
router.delete('/:id',
  requireRole(['admin']),
  customerController.deleteCustomer
);

module.exports = router;
