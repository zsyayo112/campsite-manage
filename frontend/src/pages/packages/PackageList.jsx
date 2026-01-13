import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/common/Toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ImageUpload from '../../components/common/ImageUpload';
import MultiImageUpload from '../../components/common/MultiImageUpload';
import DynamicList from '../../components/common/DynamicList';
import api, { getFileUrl } from '../../utils/api';

const PackageList = () => {
  const toast = useToast();

  // 数据状态
  const [packages, setPackages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [activeFilter, setActiveFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showInPublicFilter, setShowInPublicFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 弹窗状态
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // 表单数据 - V2.3 完整字段
  const [formData, setFormData] = useState({
    // 基本信息
    name: '',
    subtitle: '',
    description: '',
    longDescription: '',
    price: '',
    originalPrice: '',
    minPeople: '',
    maxPeople: '',
    duration: '',
    isActive: true,
    status: 'active',
    showInPublic: true,
    displayOrder: 0,
    badge: '',
    // 多媒体
    coverImage: '',
    images: [],
    videos: [],
    // 详情内容
    includedItems: [],
    highlights: [],
    schedule: [],
    precautions: [],
    // 关联项目
    projectIds: [],
  });

  // 获取套餐列表
  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize, includeItems: 'true' };
      if (activeFilter !== '') params.isActive = activeFilter;
      if (statusFilter !== '') params.status = statusFilter;
      if (showInPublicFilter !== '') params.showInPublic = showInPublicFilter;

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
  }, [page, pageSize, activeFilter, statusFilter, showInPublicFilter, toast]);

  // 获取项目列表
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

  // 打开新建弹窗
  const handleCreate = () => {
    setSelectedPackage(null);
    setFormData({
      name: '',
      subtitle: '',
      description: '',
      longDescription: '',
      price: '',
      originalPrice: '',
      minPeople: '',
      maxPeople: '',
      duration: '',
      isActive: true,
      status: 'active',
      showInPublic: true,
      displayOrder: 0,
      badge: '',
      coverImage: '',
      images: [],
      videos: [],
      includedItems: [],
      highlights: [],
      schedule: [],
      precautions: [],
      projectIds: [],
    });
    setActiveTab('basic');
    setIsFormOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (pkg) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name,
      subtitle: pkg.subtitle || '',
      description: pkg.description || '',
      longDescription: pkg.longDescription || '',
      price: parseFloat(pkg.price).toString(),
      originalPrice: pkg.originalPrice ? parseFloat(pkg.originalPrice).toString() : '',
      minPeople: pkg.minPeople?.toString() || '',
      maxPeople: pkg.maxPeople?.toString() || '',
      duration: pkg.duration?.toString() || '',
      isActive: pkg.isActive,
      status: pkg.status || 'active',
      showInPublic: pkg.showInPublic !== false,
      displayOrder: pkg.displayOrder || 0,
      badge: pkg.badge || '',
      coverImage: pkg.coverImage || '',
      images: parseJsonField(pkg.images, []),
      videos: parseJsonField(pkg.videos, []),
      includedItems: parseJsonField(pkg.includedItems, []),
      highlights: parseJsonField(pkg.highlights, []),
      schedule: parseJsonField(pkg.schedule, []),
      precautions: parseJsonField(pkg.precautions, []),
      projectIds: pkg.packageItems?.map(item => item.project.id) || parseJsonField(pkg.projectIds, []),
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
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        minPeople: formData.minPeople ? parseInt(formData.minPeople) : null,
        maxPeople: formData.maxPeople ? parseInt(formData.maxPeople) : null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        displayOrder: parseInt(formData.displayOrder) || 0,
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

  // 切换公开展示
  const handleTogglePublic = async (pkg) => {
    try {
      await api.put(`/packages/${pkg.id}`, { showInPublic: !pkg.showInPublic });
      toast.success(pkg.showInPublic ? '已隐藏' : '已公开');
      fetchPackages();
    } catch (error) {
      console.error('切换公开状态失败:', error);
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

  // 状态标签颜色
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-gray-100 text-gray-500';
      case 'sold_out': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '销售中';
      case 'inactive': return '已下架';
      case 'sold_out': return '已售罄';
      default: return '未知';
    }
  };

  // 表单标签页配置
  const tabs = [
    { id: 'basic', label: '基本信息' },
    { id: 'media', label: '图片/视频' },
    { id: 'content', label: '详情内容' },
    { id: 'projects', label: '关联项目' },
  ];

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">套餐管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理套餐展示内容、图片、视频等</p>
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
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-40">
            <select
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
            >
              <option value="">全部状态</option>
              <option value="true">已启用</option>
              <option value="false">已停用</option>
            </select>
          </div>
          <div className="w-40">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
            >
              <option value="">全部销售状态</option>
              <option value="active">销售中</option>
              <option value="inactive">已下架</option>
              <option value="sold_out">已售罄</option>
            </select>
          </div>
          <div className="w-40">
            <select
              value={showInPublicFilter}
              onChange={(e) => { setShowInPublicFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
            >
              <option value="">公开展示</option>
              <option value="true">已公开</option>
              <option value="false">已隐藏</option>
            </select>
          </div>
          <div className="text-sm text-gray-500">
            共 {total} 个套餐
          </div>
        </div>
      </div>

      {/* 套餐卡片列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
              {/* 封面图 */}
              <div className="relative aspect-video bg-gray-100">
                {pkg.coverImage ? (
                  <img
                    src={getFileUrl(pkg.coverImage)}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {/* 角标 */}
                {pkg.badge && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                    {pkg.badge}
                  </div>
                )}
                {/* 状态标签 */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(pkg.status)}`}>
                    {getStatusText(pkg.status)}
                  </span>
                </div>
              </div>

              {/* 套餐信息 */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                    {pkg.subtitle && (
                      <p className="text-sm text-gray-500">{pkg.subtitle}</p>
                    )}
                  </div>
                </div>

                {pkg.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{pkg.description}</p>
                )}

                {/* 价格 */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold text-blue-600">{formatAmount(pkg.price)}</span>
                  <span className="text-sm text-gray-500">/人</span>
                  {pkg.originalPrice && parseFloat(pkg.originalPrice) > parseFloat(pkg.price) && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatAmount(pkg.originalPrice)}
                    </span>
                  )}
                </div>

                {/* 标签 */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {pkg.duration && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
                      {pkg.duration}分钟
                    </span>
                  )}
                  {pkg.maxPeople && (
                    <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded">
                      最多{pkg.maxPeople}人
                    </span>
                  )}
                  {pkg.minPeople && (
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded">
                      {pkg.minPeople}人起订
                    </span>
                  )}
                </div>

                {/* 状态开关 */}
                <div className="flex items-center gap-3 text-sm">
                  <button
                    onClick={() => handleToggleActive(pkg)}
                    className={`flex items-center gap-1 ${pkg.isActive ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${pkg.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    {pkg.isActive ? '已启用' : '已停用'}
                  </button>
                  <button
                    onClick={() => handleTogglePublic(pkg)}
                    className={`flex items-center gap-1 ${pkg.showInPublic ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {pkg.showInPublic ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      )}
                    </svg>
                    {pkg.showInPublic ? '已公开' : '已隐藏'}
                  </button>
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            {/* 弹窗头部 */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedPackage ? '编辑套餐' : '新建套餐'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 标签页导航 */}
            <div className="px-6 border-b border-gray-200">
              <nav className="flex gap-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* 表单内容 */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* 基本信息 */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                          placeholder="如：冬季亲子畅玩套餐"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">副标题</label>
                        <input
                          type="text"
                          value={formData.subtitle}
                          onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="如：最受欢迎的亲子体验"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">简短描述</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        placeholder="在列表页显示的简短描述"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">详细介绍</label>
                      <textarea
                        value={formData.longDescription}
                        onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        placeholder="在详情页显示的完整介绍"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">原价</label>
                        <input
                          type="number"
                          value={formData.originalPrice}
                          onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="划线价"
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">最多人数</label>
                        <input
                          type="number"
                          value={formData.maxPeople}
                          onChange={(e) => setFormData({ ...formData, maxPeople: e.target.value })}
                          min="1"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="不限"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">时长（分钟）</label>
                        <input
                          type="number"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                          min="0"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="如：180"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                        <input
                          type="number"
                          value={formData.displayOrder}
                          onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                          min="0"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">角标文字</label>
                        <input
                          type="text"
                          value={formData.badge}
                          onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="如：热卖、新品"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">销售状态</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                        >
                          <option value="active">销售中</option>
                          <option value="inactive">已下架</option>
                          <option value="sold_out">已售罄</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">启用套餐</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.showInPublic}
                          onChange={(e) => setFormData({ ...formData, showInPublic: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">在公开页面展示</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* 图片/视频 */}
                {activeTab === 'media' && (
                  <div className="space-y-6">
                    <ImageUpload
                      value={formData.coverImage}
                      onChange={(url) => setFormData({ ...formData, coverImage: url })}
                      label="封面图片"
                      placeholder="点击上传封面图（推荐 16:9 比例）"
                    />

                    <MultiImageUpload
                      value={formData.images}
                      onChange={(images) => setFormData({ ...formData, images })}
                      label="套餐图片集"
                      maxCount={10}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        视频链接
                        <span className="ml-2 text-gray-400">({formData.videos.length}/3)</span>
                      </label>
                      <DynamicList
                        value={formData.videos}
                        onChange={(videos) => setFormData({ ...formData, videos })}
                        placeholder="输入视频URL"
                        maxItems={3}
                      />
                      <p className="mt-1 text-xs text-gray-400">支持 MP4 视频链接或第三方视频平台链接</p>
                    </div>
                  </div>
                )}

                {/* 详情内容 */}
                {activeTab === 'content' && (
                  <div className="space-y-6">
                    <DynamicList
                      value={formData.includedItems}
                      onChange={(items) => setFormData({ ...formData, includedItems: items })}
                      label="套餐包含"
                      placeholder="如：雪圈无限畅玩"
                      maxItems={15}
                    />

                    <DynamicList
                      value={formData.highlights}
                      onChange={(items) => setFormData({ ...formData, highlights: items })}
                      label="套餐亮点"
                      placeholder="如：专业教练全程指导"
                      maxItems={10}
                    />

                    <DynamicList
                      value={formData.schedule}
                      onChange={(items) => setFormData({ ...formData, schedule: items })}
                      label="行程安排"
                      placeholder="如：9:00 酒店集合出发"
                      maxItems={20}
                    />

                    <DynamicList
                      value={formData.precautions}
                      onChange={(items) => setFormData({ ...formData, precautions: items })}
                      label="注意事项"
                      placeholder="如：请穿着保暖衣物"
                      maxItems={15}
                    />
                  </div>
                )}

                {/* 关联项目 */}
                {activeTab === 'projects' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      包含项目
                      {formData.projectIds.length > 0 && (
                        <span className="ml-2 text-blue-600">（已选 {formData.projectIds.length} 项）</span>
                      )}
                    </label>
                    <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {projects.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">暂无可选项目</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {projects.map((project) => (
                            <label
                              key={project.id}
                              className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                                formData.projectIds.includes(project.id)
                                  ? 'bg-blue-50 border-2 border-blue-200'
                                  : 'hover:bg-gray-50 border-2 border-transparent'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.projectIds.includes(project.id)}
                                onChange={() => toggleProjectSelection(project.id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{project.name}</p>
                                <p className="text-xs text-gray-500">¥{Number(project.price).toLocaleString()}/人</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 底部按钮 */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
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
