const express = require('express');
const router = express.Router();
const {
  submitBooking,
  getPublicPackages,
  getPublicHotels,
  getBookingByCode,
  // V2.2 新增
  queryOrdersByPhone,
  getOrderDetail,
  getPublicActivities,
  getPublicActivityDetail,
  getCampInfo,
} = require('../controllers/publicController');
// V2.3 新增：从packageController导入公开套餐API
const {
  getPublicPackages: getPublicPackagesV23,
  getPublicPackageDetail,
} = require('../controllers/packageController');

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

/**
 * V2.2 新增：订单自助查询
 */

/**
 * @route   POST /api/public/orders/query
 * @desc    根据手机号查询预约和订单
 * @access  Public
 */
router.post('/orders/query', queryOrdersByPhone);

/**
 * @route   GET /api/public/orders/:type/:id
 * @desc    获取预约或订单详情
 * @access  Public
 */
router.get('/orders/:type/:id', getOrderDetail);

/**
 * V2.2 新增：营地活动介绍
 */

/**
 * @route   GET /api/public/activities
 * @desc    获取活动列表（公开展示）
 * @access  Public
 */
router.get('/activities', getPublicActivities);

/**
 * @route   GET /api/public/activities/:id
 * @desc    获取活动详情
 * @access  Public
 */
router.get('/activities/:id', getPublicActivityDetail);

/**
 * @route   GET /api/public/about
 * @desc    获取营地介绍信息
 * @access  Public
 */
router.get('/about', getCampInfo);

/**
 * V2.3 新增：套餐展示
 */

/**
 * @route   GET /api/public/packages-v2
 * @desc    获取公开套餐列表（V2.3增强版，包含多媒体内容）
 * @access  Public
 */
router.get('/packages-v2', getPublicPackagesV23);

/**
 * @route   GET /api/public/packages/:id
 * @desc    获取套餐详情（V2.3增强版）
 * @access  Public
 */
router.get('/packages/:id', getPublicPackageDetail);

module.exports = router;
