const express = require('express');
const router = express.Router();
const { authMiddleware: authenticate } = require('../middleware/auth');
const {
  getAllConfigs,
  getConfig,
  saveConfig,
  saveConfigs,
  deleteConfig,
  getCampInfo,
  saveCampInfo,
} = require('../controllers/siteConfigController');

/**
 * 站点配置管理路由
 * 所有路由需要认证
 */

// 营地信息专用路由
router.get('/camp/info', authenticate, getCampInfo);
router.put('/camp/info', authenticate, saveCampInfo);

// 通用配置路由
router.get('/', authenticate, getAllConfigs);
router.put('/', authenticate, saveConfigs);
router.get('/:key', authenticate, getConfig);
router.put('/:key', authenticate, saveConfig);
router.delete('/:key', authenticate, deleteConfig);

module.exports = router;
