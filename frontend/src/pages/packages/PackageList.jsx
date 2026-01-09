import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/common/Toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import api from '../../utils/api';

const PackageList = () => {
  const toast = useToast();

  // 数据状态
  const [packages, setPackages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 弹窗状态
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    minPeople: '',
    isActive: true,
    sortOrder: 0,
    projectIds: [],
  });

  // 获取套餐列表
  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize, includeItems: 'true' };
      if (activeFilter !== '') params.isActive = activeFilter;

      const response = await api.get('/packages', { params });
      if (response.data.success) {
        setPackages(response.data.data.items || []);
        setTotal(response.data.data.total || 0);
      }
    } catch (error) {
      console.error('获取套餐列表失败:', error);
      toast.error('获取套餐列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeFilter, toast]);

  // 获取项目列表（用于选择）
  const fetchProjects = useCallback(async () => {
    try {
      const response = await api.get('/projects', { params: { pageSize: 100, isActive: 'true' } });
      if (response.data.success) {
        setProjects(response.data.data.items || []);
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
    fetchProjects();
  }, [fetchPackages, fetchProjects]);

  // 打开新建弹窗
  const handleCreate = () => {
    setSelectedPackage(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      minPeople: '',
      isActive: true,
      sortOrder: 0,
      projectIds: [],
    });
    setIsFormOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (pkg) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: parseFloat(pkg.price).toString(),
      minPeople: pkg.minPeople?.toString() || '',
      isActive: pkg.isActive,
      sortOrder: pkg.sortOrder || 0,
      projectIds: pkg.packageItems?.map(item => item.project.id) || [],
    });
    setIsFormOpen(true);
  };

  // 表单提交
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        minPeople: formData.minPeople ? parseInt(formData.minPeople) : null,
      };

      if (selectedPackage) {
        await api.put(`/packages/${selectedPackage.id}`, data);
        toast.success('套餐更新成功');
      } else {
        await api.post('/packages', data);
        toast.success('套餐创建成功');
      }

      setIsFormOpen(false);
      fetchPackages();
    } catch (error) {
      console.error('保存套餐失败:', error);
      toast.error(error.response?.data?.error?.message || '保存失败');
    } finally {
      setFormLoading(false);
    }
  };

  // 删除确认
  const handleDeleteConfirm = (pkg) => {
    setSelectedPackage(pkg);
    setIsDeleteOpen(true);
  };

  // 删除套餐
  const handleDelete = async () => {
    if (!selectedPackage) return;
    setDeleteLoading(true);

    try {
      await api.delete(`/packages/${selectedPackage.id}`);
      toast.success('套餐删除成功');
      setIsDeleteOpen(false);
      fetchPackages();
    } catch (error) {
      console.error('删除套餐失败:', error);
      toast.error(error.response?.data?.error?.message || '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 快速切换状态
  const handleToggleActive = async (pkg) => {
    try {
      await api.put(`/packages/${pkg.id}`, { isActive: !pkg.isActive });
      toast.success(pkg.isActive ? '已停用' : '已启用');
      fetchPackages();
    } catch (error) {
      console.error('切换状态失败:', error);
      toast.error('操作失败');
    }
  };

  // 切换项目选择
  const toggleProjectSelection = (projectId) => {
    setFormData(prev => {
      const isSelected = prev.projectIds.includes(projectId);
      return {
        ...prev,
        projectIds: isSelected
          ? prev.projectIds.filter(id => id !== projectId)
          : [...prev.projectIds, projectId],
      };
    });
  };

  // 格式化金额
  const formatAmount = (amount) => `¥${Number(amount || 0).toLocaleString()}`;

  // 计算总页数
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">套餐管理</h1>
          <p className="mt-1 text-sm text-gray-500">共 {total} 个套餐</p>
        </div>
        <button
          onClick={handleCreate}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新建套餐
        </button>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-48">
            <select
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">全部状态</option>
              <option value="true">已启用</option>
              <option value="false">已停用</option>
            </select>
          </div>
        </div>
      </div>

      {/* 套餐卡片列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        ) : packages.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            暂无套餐数据
          </div>
        ) : (
          packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* 套餐头部 */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                    {pkg.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{pkg.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleActive(pkg)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pkg.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {pkg.isActive ? '已启用' : '已停用'}
                  </button>
                </div>
              </div>

              {/* 套餐价格 */}
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold text-blue-600">{formatAmount(pkg.price)}</span>
                    <span className="text-sm text-gray-500 ml-1">/人</span>
                  </div>
                  {pkg.savings > 0 && (
                    <div className="text-right">
                      <span className="text-xs text-gray-500 line-through">{formatAmount(pkg.totalProjectValue)}</span>
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                        省{pkg.savingsPercent}%
                      </span>
                    </div>
                  )}
                </div>
                {pkg.minPeople && (
                  <p className="text-xs text-gray-500 mt-1">最低 {pkg.minPeople} 人起订</p>
                )}
              </div>

              {/* 包含项目 */}
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-2">包含项目：</p>
                <div className="flex flex-wrap gap-1">
                  {pkg.packageItems?.length > 0 ? (
                    pkg.packageItems.map((item) => (
                      <span
                        key={item.id}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {item.project.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">暂无项目</span>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => handleEdit(pkg)}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDeleteConfirm(pkg)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
          <div className="text-sm text-gray-500">
            共 {total} 条
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedPackage ? '编辑套餐' : '新建套餐'}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* 套餐名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  套餐名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="如：冬季亲子套餐"
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="套餐描述（选填）"
                />
              </div>

              {/* 价格和人数 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    套餐价格 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低人数</label>
                  <input
                    type="number"
                    value={formData.minPeople}
                    onChange={(e) => setFormData({ ...formData, minPeople: e.target.value })}
                    min="1"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="不限"
                  />
                </div>
              </div>

              {/* 排序和状态 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center pt-7">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">启用该套餐</label>
                </div>
              </div>

              {/* 选择项目 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  包含项目
                  {formData.projectIds.length > 0 && (
                    <span className="ml-2 text-blue-600">（已选 {formData.projectIds.length} 项）</span>
                  )}
                </label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {projects.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">暂无可选项目</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {projects.map((project) => (
                        <label
                          key={project.id}
                          className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                            formData.projectIds.includes(project.id)
                              ? 'bg-blue-50 border border-blue-200'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.projectIds.includes(project.id)}
                            onChange={() => toggleProjectSelection(project.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="ml-2 flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{project.name}</p>
                            <p className="text-xs text-gray-500">¥{Number(project.price).toLocaleString()}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 按钮 */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
                >
                  {formLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {selectedPackage ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="删除套餐"
        message={`确定要删除套餐「${selectedPackage?.name}」吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

export default PackageList;
