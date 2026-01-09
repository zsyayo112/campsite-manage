const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

/**
 * @route   GET /api/projects
 * @desc    获取项目列表
 * @access  Admin, Operator, Marketer
 */
router.get('/', requireRole(['admin', 'operator', 'marketer']), projectController.getProjects);

/**
 * @route   GET /api/projects/:id
 * @desc    获取项目详情
 * @access  Admin, Operator
 */
router.get('/:id', requireRole(['admin', 'operator']), projectController.getProjectById);

/**
 * @route   POST /api/projects
 * @desc    创建项目
 * @access  Admin
 */
router.post('/', requireRole(['admin']), projectController.createProject);

/**
 * @route   PUT /api/projects/:id
 * @desc    更新项目
 * @access  Admin
 */
router.put('/:id', requireRole(['admin']), projectController.updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    删除项目
 * @access  Admin
 */
router.delete('/:id', requireRole(['admin']), projectController.deleteProject);

module.exports = router;
