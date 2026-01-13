const express = require('express');
const router = express.Router();
const {
  submitBooking,
  getPublicPackages,
  getPublicHotels,
  getBookingByCode,
} = require('../controllers/publicController');

/**
 * 公开API路由 - 无需认证
 */

/**
 * @route   POST /api/public/bookings
 * @desc    提交预约（客户端）
 * @access  Public
 */
router.post('/bookings', submitBooking);

/**
 * @route   GET /api/public/packages
 * @desc    获取可用套餐列表
 * @access  Public
 */
router.get('/packages', getPublicPackages);

/**
 * @route   GET /api/public/hotels
 * @desc    获取酒店列表
 * @access  Public
 */
router.get('/hotels', getPublicHotels);

/**
 * @route   GET /api/public/booking/:code
 * @desc    根据确认码查询预约状态
 * @access  Public
 */
router.get('/booking/:code', getBookingByCode);

module.exports = router;
