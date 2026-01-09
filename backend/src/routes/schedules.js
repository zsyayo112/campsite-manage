const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const scheduleController = require('../controllers/scheduleController');

// 所有路由需要认证
router.use(authMiddleware);

// ==================== 教练管理（放在前面避免与 :id 冲突） ====================

// 获取教练列表
router.get(
  '/coaches',
  requireRole(['admin', 'operator', 'coach']),
  scheduleController.getCoaches
);

// 创建教练
router.post(
  '/coaches',
  requireRole(['admin']),
  scheduleController.createCoach
);

// 更新教练
router.put(
  '/coaches/:id',
  requireRole(['admin']),
  scheduleController.updateCoach
);

// 获取教练可用时段
router.get(
  '/coaches/:id/availability',
  requireRole(['admin', 'operator']),
  scheduleController.getCoachAvailability
);

// ==================== 排期管理 ====================

// 获取每日排期（时间轴）
router.get(
  '/daily',
  requireRole(['admin', 'operator', 'coach']),
  scheduleController.getDailySchedules
);

// 冲突检测（预检）
router.post(
  '/check-conflicts',
  requireRole(['admin', 'operator']),
  scheduleController.checkScheduleConflicts
);

// 创建排期
router.post(
  '/',
  requireRole(['admin', 'operator']),
  scheduleController.createSchedule
);

// 获取排期详情
router.get(
  '/:id',
  requireRole(['admin', 'operator', 'coach']),
  scheduleController.getScheduleById
);

// 更新排期（支持拖拽调整）
router.put(
  '/:id',
  requireRole(['admin', 'operator']),
  scheduleController.updateSchedule
);

// 更新排期状态
router.put(
  '/:id/status',
  requireRole(['admin', 'operator', 'coach']),
  scheduleController.updateScheduleStatus
);

// 删除排期
router.delete(
  '/:id',
  requireRole(['admin', 'operator']),
  scheduleController.deleteSchedule
);

module.exports = router;
