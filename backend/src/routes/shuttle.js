const express = require('express');
const router = express.Router();
const shuttleController = require('../controllers/shuttleController');
const { authMiddleware, requireRole } = require('../middleware/auth');

/**
 * 接送调度路由
 * Base path: /api/shuttle
 * 所有路由都需要认证
 */

// 应用认证中间件到所有路由
router.use(authMiddleware);

// ==================== 统计相关 ====================

/**
 * @route   GET /api/shuttle/daily-stats
 * @desc    获取指定日期的接送人数统计
 * @access  Private (admin, operator, driver)
 * @query   date - 日期 (YYYY-MM-DD，必填)
 */
router.get('/daily-stats', requireRole(['admin', 'operator', 'driver']), shuttleController.getDailyStats);

/**
 * @route   GET /api/shuttle/daily-stats/export
 * @desc    导出指定日期的接送统计Excel
 * @access  Private (admin, operator)
 * @query   date - 日期 (YYYY-MM-DD，必填)
 */
router.get('/daily-stats/export', requireRole(['admin', 'operator']), shuttleController.exportDailyStats);

// ==================== 接送调度管理 ====================

/**
 * @route   GET /api/shuttle/schedules
 * @desc    获取接送调度列表
 * @access  Private (admin, operator, driver)
 * @query   page - 页码（默认: 1）
 * @query   pageSize - 每页数量（默认: 20）
 * @query   date - 日期筛选 (YYYY-MM-DD)
 * @query   status - 状态筛选 (pending/in_progress/completed)
 * @query   vehicleId - 车辆ID筛选
 * @query   driverId - 司机ID筛选
 * @query   sortBy - 排序字段（date/departureTime/createdAt/batchName，默认: date）
 * @query   order - 排序方式（asc/desc，默认: desc）
 */
router.get('/schedules', requireRole(['admin', 'operator', 'driver']), shuttleController.getSchedules);

/**
 * @route   GET /api/shuttle/schedules/:id
 * @desc    获取接送调度详情
 * @access  Private (admin, operator, driver)
 * @param   id - 调度ID
 */
router.get('/schedules/:id', requireRole(['admin', 'operator', 'driver']), shuttleController.getScheduleById);

/**
 * @route   GET /api/shuttle/schedules/:id/stops
 * @desc    获取接送站点详情（含客人名单）
 * @access  Private (admin, operator, driver)
 * @param   id - 调度ID
 */
router.get('/schedules/:id/stops', requireRole(['admin', 'operator', 'driver']), shuttleController.getScheduleStops);

/**
 * @route   POST /api/shuttle/schedules
 * @desc    创建接送调度
 * @access  Private (admin, operator)
 * @body    {
 *   date: string (必填),
 *   batchName: string (必填),
 *   vehicleId: number (必填),
 *   driverId: number (必填),
 *   departureTime: string (必填),
 *   returnTime: string (可选),
 *   stops: [{ accommodationPlaceId, stopOrder, passengerCount }] (必填),
 *   notes: string (可选)
 * }
 */
router.post('/schedules', requireRole(['admin', 'operator']), shuttleController.createSchedule);

/**
 * @route   PATCH /api/shuttle/schedules/:id/status
 * @desc    更新接送调度状态
 * @access  Private (admin, operator, driver)
 * @param   id - 调度ID
 * @body    {
 *   status: string (pending/in_progress/completed，必填),
 *   returnTime: string (可选，状态为completed时可更新)
 * }
 */
router.patch('/schedules/:id/status', requireRole(['admin', 'operator', 'driver']), shuttleController.updateScheduleStatus);

/**
 * @route   DELETE /api/shuttle/schedules/:id
 * @desc    删除接送调度（仅限待出发的调度）
 * @access  Private (admin)
 * @param   id - 调度ID
 */
router.delete('/schedules/:id', requireRole(['admin']), shuttleController.deleteSchedule);

// ==================== 车辆管理 ====================

/**
 * @route   GET /api/shuttle/vehicles
 * @desc    获取车辆列表
 * @access  Private (admin, operator, driver)
 * @query   status - 状态筛选 (available/maintenance/assigned)
 * @query   vehicleType - 车辆类型筛选
 */
router.get('/vehicles', requireRole(['admin', 'operator', 'driver']), shuttleController.getVehicles);

/**
 * @route   POST /api/shuttle/vehicles
 * @desc    创建车辆
 * @access  Private (admin)
 * @body    {
 *   plateNumber: string (必填),
 *   vehicleType: string (必填),
 *   seats: number (必填),
 *   status: string (可选，默认: available),
 *   notes: string (可选)
 * }
 */
router.post('/vehicles', requireRole(['admin']), shuttleController.createVehicle);

/**
 * @route   PUT /api/shuttle/vehicles/:id
 * @desc    更新车辆
 * @access  Private (admin)
 * @param   id - 车辆ID
 * @body    { plateNumber, vehicleType, seats, status, notes }
 */
router.put('/vehicles/:id', requireRole(['admin']), shuttleController.updateVehicle);

// ==================== 司机管理 ====================

/**
 * @route   GET /api/shuttle/drivers
 * @desc    获取司机列表
 * @access  Private (admin, operator)
 * @query   status - 状态筛选 (on_duty/off_duty)
 */
router.get('/drivers', requireRole(['admin', 'operator']), shuttleController.getDrivers);

/**
 * @route   POST /api/shuttle/drivers
 * @desc    创建司机
 * @access  Private (admin)
 * @body    {
 *   name: string (必填),
 *   phone: string (必填),
 *   userId: number (可选),
 *   status: string (可选，默认: on_duty)
 * }
 */
router.post('/drivers', requireRole(['admin']), shuttleController.createDriver);

/**
 * @route   PUT /api/shuttle/drivers/:id
 * @desc    更新司机
 * @access  Private (admin)
 * @param   id - 司机ID
 * @body    { name, phone, userId, status }
 */
router.put('/drivers/:id', requireRole(['admin']), shuttleController.updateDriver);

module.exports = router;
