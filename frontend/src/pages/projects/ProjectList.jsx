import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/common/Toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import api from '../../utils/api';

// 季节映射
const seasonMap = {
  all: { label: '全年', color: 'bg-blue-100 text-blue-700' },
  winter: { label: '冬季', color: 'bg-cyan-100 text-cyan-700' },
  summer: { label: '夏季', color: 'bg-orange-100 text-orange-700' },
};

// 计价单位映射
const unitMap = {
  per_person: '每人',
  per_group: '每组',
};

const ProjectList = () => {
  const toast = useToast();

  // 数据状态
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 弹窗状态
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'per_person',
    season: 'all',
    duration: '',
    capacity: '',
    isActive: true,
    sortOrder: 0,
  });

  // 获取项目列表
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (search) params.search = search;
      if (seasonFilter) params.season = seasonFilter;
      if (activeFilter !== '') params.isActive = activeFilter;

      const response = await api.get('/projects', { params });
      if (response.data.success) {
        setProjects(response.data.data.items || []);
        setTotal(response.data.data.total || 0);
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
      toast.error('获取项目列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, seasonFilter, activeFilter, toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 打开新建弹窗
  const handleCreate = () => {
    setSelectedProject(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      unit: 'per_person',
      season: 'all',
      duration: '',
      capacity: '',
      isActive: true,
      sortOrder: 0,
    });
    setIsFormOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      price: project.price.toString(),
      unit: project.unit,
      season: project.season || 'all',
      duration: project.duration.toString(),
      capacity: project.capacity?.toString() || '',
      isActive: project.isActive,
      sortOrder: project.sortOrder || 0,
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
        duration: parseInt(formData.duration),
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
      };

      if (selectedProject) {
        await api.put(`/projects/${selectedProject.id}`, data);
        toast.success('项目更新成功');
      } else {
        await api.post('/projects', data);
        toast.success('项目创建成功');
      }

      setIsFormOpen(false);
      fetchProjects();
    } catch (error) {
      console.error('保存项目失败:', error);
      toast.error(error.response?.data?.error?.message || '保存失败');
    } finally {
      setFormLoading(false);
    }
  };

  // 删除确认
  const handleDeleteConfirm = (project) => {
    setSelectedProject(project);
    setIsDeleteOpen(true);
  };

  // 删除项目
  const handleDelete = async () => {
    if (!selectedProject) return;
    setDeleteLoading(true);

    try {
      await api.delete(`/projects/${selectedProject.id}`);
      toast.success('项目删除成功');
      setIsDeleteOpen(false);
      fetchProjects();
    } catch (error) {
      console.error('删除项目失败:', error);
      toast.error(error.response?.data?.error?.message || '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 快速切换状态
  const handleToggleActive = async (project) => {
    try {
      await api.put(`/projects/${project.id}`, { isActive: !project.isActive });
      toast.success(project.isActive ? '已停用' : '已启用');
      fetchProjects();
    } catch (error) {
      console.error('切换状态失败:', error);
      toast.error('操作失败');
    }
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
          <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
          <p className="mt-1 text-sm text-gray-500">共 {total} 个项目</p>
        </div>
        <button
          onClick={handleCreate}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新建项目
        </button>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 搜索框 */}
          <div className="lg:col-span-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜索项目名称..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* 季节筛选 */}
          <div>
            <select
              value={seasonFilter}
              onChange={(e) => { setSeasonFilter(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">全部季节</option>
              {Object.entries(seasonMap).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* 状态筛选 */}
          <div>
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

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">项目名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">价格</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">时长</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">季节</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">容量</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex justify-center items-center">
                      <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="ml-2 text-gray-500">加载中...</span>
                    </div>
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    暂无项目数据
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{project.name}</div>
                        {project.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{project.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{formatAmount(project.price)}</div>
                      <div className="text-xs text-gray-500">{unitMap[project.unit]}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{project.duration} 分钟</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${seasonMap[project.season]?.color || 'bg-gray-100 text-gray-700'}`}>
                        {seasonMap[project.season]?.label || project.season}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {project.capacity ? `${project.capacity} 人` : '不限'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(project)}
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          project.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {project.isActive ? '已启用' : '已停用'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(project)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="编辑"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteConfirm(project)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
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
      </div>

      {/* 新建/编辑弹窗 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedProject ? '编辑项目' : '新建项目'}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* 项目名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="如：冰钓体验"
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
                  placeholder="项目描述（选填）"
                />
              </div>

              {/* 价格和单位 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    价格 <span className="text-red-500">*</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    计价单位 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="per_person">每人</option>
                    <option value="per_group">每组</option>
                  </select>
                </div>
              </div>

              {/* 时长和容量 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    时长（分钟） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                    min="1"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">容量（人）</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    min="1"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="不限"
                  />
                </div>
              </div>

              {/* 季节和排序 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">适用季节</label>
                  <select
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="all">全年</option>
                    <option value="winter">冬季</option>
                    <option value="summer">夏季</option>
                  </select>
                </div>
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
              </div>

              {/* 状态 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">启用该项目</label>
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
                  {selectedProject ? '保存' : '创建'}
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
        title="删除项目"
        message={`确定要删除项目「${selectedProject?.name}」吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

export default ProjectList;
