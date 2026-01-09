const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const { authMiddleware, requireRole } = require('../middleware/auth');

/**
 * 套餐管理路由
 * Base path: /api/packages
 * 所有路由都需要认证
 */

// 应用认证中间件到所有路由
router.use(authMiddleware);

/**
 * @route   POST /api/packages/calculate-price
 * @desc    计算订单价格（预览）
 * @access  Private (admin, operator)
 * @body    {
 *   packageId: number (可选),
 *   extraProjectIds: number[] (可选，套餐外额外项目),
 *   customProjectIds: number[] (可选，自由组合项目，不使用套餐时),
 *   peopleCount: number (必填)
 * }
 */
router.post('/calculate-price', requireRole(['admin', 'operator']), packageController.calculatePrice);

/**
 * @route   GET /api/packages
 * @desc    获取套餐列表
 * @access  Private (admin, operator, marketer)
 * @query   page - 页码（默认: 1）
 * @query   pageSize - 每页数量（默认: 20）
 * @query   isActive - 是否激活筛选
 * @query   includeItems - 是否包含项目详情（默认: true）
 */
router.get('/', requireRole(['admin', 'operator', 'marketer']), packageController.getPackages);

/**
 * @route   GET /api/packages/:id
 * @desc    获取套餐详情
 * @access  Private (admin, operator, marketer)
 * @param   id - 套餐ID
 */
router.get('/:id', requireRole(['admin', 'operator', 'marketer']), packageController.getPackageById);

/**
 * @route   POST /api/packages
 * @desc    创建套餐
 * @access  Private (admin)
 * @body    {
 *   name: string (必填),
 *   description: string (可选),
 *   price: number (必填),
 *   minPeople: number (可选),
 *   isActive: boolean (可选，默认: true),
 *   sortOrder: number (可选，默认: 0),
 *   projectIds: number[] (可选，套餐包含的项目ID列表)
 * }
 */
router.post('/', requireRole(['admin']), packageController.createPackage);

/**
 * @route   PUT /api/packages/:id
 * @desc    更新套餐
 * @access  Private (admin)
 * @param   id - 套餐ID
 * @body    { name, description, price, minPeople, isActive, sortOrder, projectIds }
 */
router.put('/:id', requireRole(['admin']), packageController.updatePackage);

/**
 * @route   DELETE /api/packages/:id
 * @desc    删除套餐
 * @access  Private (admin)
 * @param   id - 套餐ID
 */
router.delete('/:id', requireRole(['admin']), packageController.deletePackage);

/**
 * @route   POST /api/packages/:id/items
 * @desc    添加项目到套餐
 * @access  Private (admin)
 * @param   id - 套餐ID
 * @body    { projectId: number }
 */
router.post('/:id/items', requireRole(['admin']), packageController.addPackageItem);

/**
 * @route   DELETE /api/packages/:id/items/:projectId
 * @desc    从套餐中移除项目
 * @access  Private (admin)
 * @param   id - 套餐ID
 * @param   projectId - 项目ID
 */
router.delete('/:id/items/:projectId', requireRole(['admin']), packageController.removePackageItem);

module.exports = router;
