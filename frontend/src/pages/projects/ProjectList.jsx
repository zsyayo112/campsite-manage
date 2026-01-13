import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/common/Toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ImageUpload from '../../components/common/ImageUpload';
import MultiImageUpload from '../../components/common/MultiImageUpload';
import DynamicList from '../../components/common/DynamicList';
import api, { getFileUrl } from '../../utils/api';

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

// 标签选项
const badgeOptions = [
  { value: '', label: '无标签' },
  { value: '热门', label: '热门' },
  { value: '推荐', label: '推荐' },
  { value: '新品', label: '新品' },
];

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

  // 表单标签页
  const [activeTab, setActiveTab] = useState('basic');

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
    // V2.3 多媒体字段
    coverImage: '',
    images: [],
    videos: [],
    // V2.3 内容字段
    highlights: [],
    precautions: [],
    longDescription: '',
    // V2.3 展示配置
    showInPublic: true,
    displayOrder: 0,
    badge: '',
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
      coverImage: '',
      images: [],
      videos: [],
      highlights: [],
      precautions: [],
      longDescription: '',
      showInPublic: true,
      displayOrder: 0,
      badge: '',
    });
    setActiveTab('basic');
    setIsFormOpen(true);
  };

  // 解析 JSON 字段
  const parseJsonField = (value, defaultValue = []) => {
    if (!value) return defaultValue;
    if (Array.isArray(value)) return value;
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
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
      coverImage: project.coverImage || '',
      images: parseJsonField(project.images, []),
      videos: parseJsonField(project.videos, []),
      highlights: parseJsonField(project.highlights, []),
      precautions: parseJsonField(project.precautions, []),
      longDescription: project.longDescription || '',
      showInPublic: project.showInPublic !== false,
      displayOrder: project.displayOrder || 0,
      badge: project.badge || '',
    });
    setActiveTab('basic');
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
        // JSON 字段序列化
        images: JSON.stringify(formData.images),
        videos: JSON.stringify(formData.videos),
        highlights: JSON.stringify(formData.highlights),
        precautions: JSON.stringify(formData.precautions),
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

  // 表单标签页配置
  const tabs = [
    { id: 'basic', label: '基本信息' },
    { id: 'media', label: '图片视频' },
    { id: 'content', label: '详细内容' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">项目管理</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">共 {total} 个项目</p>
        </div>
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新建项目
        </button>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

      {/* 项目卡片列表 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            暂无项目数据
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* 封面图 */}
              <div className="relative aspect-video bg-gray-100">
                {project.coverImage ? (
                  <img
                    src={getFileUrl(project.coverImage)}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {/* 状态和标签 */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${seasonMap[project.season]?.color || 'bg-gray-100 text-gray-700'}`}>
                    {seasonMap[project.season]?.label || project.season}
                  </span>
                  {project.badge && (
                    <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-medium">
                      {project.badge}
                    </span>
                  )}
                </div>
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    project.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {project.isActive ? '启用' : '停用'}
                  </span>
                </div>
              </div>

              {/* 内容 */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{project.description}</p>
                )}

                {/* 信息 */}
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {project.duration}分钟
                  </span>
                  {project.capacity && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {project.capacity}人
                    </span>
                  )}
                </div>

                {/* 价格和操作 */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-blue-600">{formatAmount(project.price)}</span>
                    <span className="text-xs text-gray-400">/{unitMap[project.unit]}</span>
                  </div>
                  <div className="flex gap-1">
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
                      onClick={() => handleToggleActive(project)}
                      className={`p-1.5 rounded transition-colors ${
                        project.isActive
                          ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={project.isActive ? '停用' : '启用'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {project.isActive ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        )}
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
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-lg shadow-sm border border-gray-200 px-3 sm:px-4 py-3">
          <div className="text-xs sm:text-sm text-gray-500">
            共 {total} 条
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-2xl sm:mx-4 max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* 标题 */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                {selectedProject ? '编辑项目' : '新建项目'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="sm:hidden p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 标签页 */}
            <div className="border-b border-gray-200 flex-shrink-0">
              <div className="flex px-4 sm:px-6 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 表单内容 */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6 space-y-4">
                {/* 基本信息标签页 */}
                {activeTab === 'basic' && (
                  <>
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

                    {/* 简短描述 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">简短描述</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        placeholder="项目简短描述（一句话概括）"
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

                    {/* 季节和标签 */}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">角标</label>
                        <select
                          value={formData.badge}
                          onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                        >
                          {badgeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 排序和展示顺序 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">排序权重</label>
                        <input
                          type="number"
                          value={formData.sortOrder}
                          onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                          min="0"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">展示顺序</label>
                        <input
                          type="number"
                          value={formData.displayOrder}
                          onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                          min="0"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* 状态开关 */}
                    <div className="flex items-center gap-6">
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
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="showInPublic"
                          checked={formData.showInPublic}
                          onChange={(e) => setFormData({ ...formData, showInPublic: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="showInPublic" className="ml-2 text-sm text-gray-700">在公开页面展示</label>
                      </div>
                    </div>
                  </>
                )}

                {/* 图片视频标签页 */}
                {activeTab === 'media' && (
                  <>
                    {/* 封面图 */}
                    <ImageUpload
                      value={formData.coverImage}
                      onChange={(url) => setFormData({ ...formData, coverImage: url })}
                      label="封面图"
                      placeholder="上传项目封面图片"
                    />

                    {/* 更多图片 */}
                    <MultiImageUpload
                      value={formData.images}
                      onChange={(images) => setFormData({ ...formData, images })}
                      label="更多图片"
                      maxCount={10}
                    />

                    {/* 视频链接 */}
                    <DynamicList
                      value={formData.videos}
                      onChange={(videos) => setFormData({ ...formData, videos })}
                      label="视频链接"
                      placeholder="输入视频URL"
                      addText="添加视频"
                    />
                  </>
                )}

                {/* 详细内容标签页 */}
                {activeTab === 'content' && (
                  <>
                    {/* 详细介绍 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">详细介绍</label>
                      <textarea
                        value={formData.longDescription}
                        onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        placeholder="详细的项目介绍文字，可包含多段内容..."
                      />
                    </div>

                    {/* 项目亮点 */}
                    <DynamicList
                      value={formData.highlights}
                      onChange={(highlights) => setFormData({ ...formData, highlights })}
                      label="项目亮点"
                      placeholder="输入一个亮点"
                      addText="添加亮点"
                      itemClassName="bg-green-100 text-green-700"
                    />

                    {/* 注意事项 */}
                    <DynamicList
                      value={formData.precautions}
                      onChange={(precautions) => setFormData({ ...formData, precautions })}
                      label="注意事项"
                      placeholder="输入一条注意事项"
                      addText="添加注意事项"
                      itemClassName="bg-amber-100 text-amber-700"
                    />
                  </>
                )}
              </div>

              {/* 按钮 */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 flex-shrink-0 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center text-sm font-medium"
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
