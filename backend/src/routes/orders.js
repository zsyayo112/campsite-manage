const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware, requireRole } = require('../middleware/auth');

/**
 * 订单管理路由
 * Base path: /api/orders
 * 所有路由都需要认证
 */

// 应用认证中间件到所有路由
router.use(authMiddleware);

/**
 * @route   GET /api/orders/stats/summary
 * @desc    获取订单统计摘要
 * @access  Private (admin, operator)
 * @query   startDate - 开始日期（可选）
 * @query   endDate - 结束日期（可选）
 */
router.get('/stats/summary', requireRole(['admin', 'operator']), orderController.getOrderStats);

/**
 * @route   GET /api/orders/export
 * @desc    导出订单到Excel
 * @access  Private (admin, operator)
 * @query   status - 订单状态筛选
 * @query   paymentStatus - 支付状态筛选
 * @query   startDate - 开始日期
 * @query   endDate - 结束日期
 * @query   search - 搜索关键词
 */
router.get('/export', requireRole(['admin', 'operator']), orderController.exportOrders);

/**
 * @route   GET /api/orders
 * @desc    获取订单列表（支持分页、筛选、搜索、排序）
 * @access  Private (admin, operator, marketer)
 * @query   page - 页码（默认: 1）
 * @query   pageSize - 每页数量（默认: 20）
 * @query   status - 订单状态筛选（pending/confirmed/completed/cancelled）
 * @query   paymentStatus - 支付状态筛选（unpaid/paid/refunded）
 * @query   customerId - 客户ID筛选
 * @query   accommodationPlaceId - 住宿地点ID筛选
 * @query   startDate - 访问日期开始
 * @query   endDate - 访问日期结束
 * @query   search - 搜索（订单号/客户名称/手机号）
 * @query   sortBy - 排序字段（createdAt/orderDate/visitDate/totalAmount/orderNumber，默认: createdAt）
 * @query   order - 排序方式（asc/desc，默认: desc）
 */
router.get('/', requireRole(['admin', 'operator', 'marketer']), orderController.getOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    获取订单详情
 * @access  Private (admin, operator, marketer)
 * @param   id - 订单ID
 */
router.get('/:id', requireRole(['admin', 'operator', 'marketer']), orderController.getOrderById);

/**
 * @route   POST /api/orders
 * @desc    创建订单
 * @access  Private (admin, operator)
 * @body    {
 *   customerId: number (必填),
 *   accommodationPlaceId: number (必填),
 *   roomNumber: string (可选),
 *   packageId: number (可选),
 *   visitDate: string (必填),
 *   peopleCount: number (必填),
 *   items: [{ projectId: number, quantity: number }] (必填或使用套餐),
 *   notes: string (可选)
 * }
 */
router.post('/', requireRole(['admin', 'operator']), orderController.createOrder);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    更新订单状态
 * @access  Private (admin, operator)
 * @param   id - 订单ID
 * @body    {
 *   status: string (pending/confirmed/completed/cancelled，可选),
 *   paymentStatus: string (unpaid/paid/refunded，可选)
 * }
 */
router.patch('/:id/status', requireRole(['admin', 'operator']), orderController.updateOrderStatus);

/**
 * @route   PATCH /api/orders/:id/payment
 * @desc    更新订单付款金额（收款）
 * @access  Private (admin, operator)
 * @param   id - 订单ID
 * @body    {
 *   amount: number (金额),
 *   action: string ('add' 追加收款, 'set' 设置总已付金额，默认 'set')
 * }
 */
router.patch('/:id/payment', requireRole(['admin', 'operator']), orderController.updateOrderPayment);

/**
 * @route   DELETE /api/orders/:id
 * @desc    删除订单（仅限待处理或已取消的订单）
 * @access  Private (admin)
 * @param   id - 订单ID
 */
router.delete('/:id', requireRole(['admin']), orderController.deleteOrder);

module.exports = router;
