const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  updateBookingDeposit,
  convertToOrder,
  deleteBooking,
  getBookingStats,
} = require('../controllers/bookingController');

// 所有路由需要认证
router.use(authMiddleware);

/**
 * @route   GET /api/bookings
 * @desc    获取预约列表
 * @access  Private (admin, operator)
 */
router.get('/', requireRole(['admin', 'operator']), getBookings);

/**
 * @route   GET /api/bookings/stats
 * @desc    获取预约统计
 * @access  Private (admin, operator)
 */
router.get('/stats', requireRole(['admin', 'operator']), getBookingStats);

/**
 * @route   GET /api/bookings/:id
 * @desc    获取预约详情
 * @access  Private (admin, operator)
 */
router.get('/:id', requireRole(['admin', 'operator']), getBookingById);

/**
 * @route   POST /api/bookings
 * @desc    手动创建预约
 * @access  Private (admin, operator)
 */
router.post('/', requireRole(['admin', 'operator']), createBooking);

/**
 * @route   PATCH /api/bookings/:id/status
 * @desc    更新预约状态
 * @access  Private (admin, operator)
 */
router.patch('/:id/status', requireRole(['admin', 'operator']), updateBookingStatus);

/**
 * @route   PATCH /api/bookings/:id/deposit
 * @desc    记录定金
 * @access  Private (admin, operator)
 */
router.patch('/:id/deposit', requireRole(['admin', 'operator']), updateBookingDeposit);

/**
 * @route   POST /api/bookings/:id/convert
 * @desc    将预约转为订单
 * @access  Private (admin, operator)
 */
router.post('/:id/convert', requireRole(['admin', 'operator']), convertToOrder);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    删除预约
 * @access  Private (admin)
 */
router.delete('/:id', requireRole(['admin']), deleteBooking);

module.exports = router;
