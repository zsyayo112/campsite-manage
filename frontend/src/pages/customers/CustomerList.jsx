import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import CustomerForm from '../../components/customers/CustomerForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  exportCustomers,
} from '../../api/customers';

// 来源映射
const sourceMap = {
  xiaohongshu: { label: '小红书', color: 'bg-red-100 text-red-700' },
  wechat: { label: '微信', color: 'bg-green-100 text-green-700' },
  douyin: { label: '抖音', color: 'bg-purple-100 text-purple-700' },
  friend: { label: '朋友推荐', color: 'bg-blue-100 text-blue-700' },
  other: { label: '其他', color: 'bg-gray-100 text-gray-700' },
};

// 标签映射
const tagMap = {
  vip: { label: 'VIP', color: 'bg-purple-100 text-purple-700' },
  family: { label: '家庭游', color: 'bg-blue-100 text-blue-700' },
  team: { label: '团队', color: 'bg-green-100 text-green-700' },
  repeat: { label: '回头客', color: 'bg-orange-100 text-orange-700' },
  photography: { label: '摄影爱好者', color: 'bg-pink-100 text-pink-700' },
};

// 每页条数选项
const pageSizeOptions = [10, 20, 50, 100];

const CustomerList = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // 数据状态
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // 筛选和分页状态
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 弹窗状态
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // 获取客户列表
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        sortBy,
        sortOrder,
      };
      if (search) params.search = search;
      if (sourceFilter) params.source = sourceFilter;

      const response = await getCustomers(params);
      if (response.success) {
        setCustomers(response.data.items || response.data.list || []);
        setTotal(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('获取客户列表失败:', error);
      toast.error('获取客户列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sourceFilter, sortBy, sortOrder, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 排序切换
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // 排序图标
  const SortIcon = ({ field }) => {
    if (sortBy !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // 新建客户
  const handleCreate = () => {
    setSelectedCustomer(null);
    setIsFormOpen(true);
  };

  // 编辑客户
  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  // 删除确认
  const handleDeleteConfirm = (customer) => {
    setSelectedCustomer(customer);
    setIsDeleteOpen(true);
  };

  // 查看详情
  const handleViewDetail = (customerId) => {
    navigate(`/customers/${customerId}`);
  };

  // 导出 Excel
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (sourceFilter) params.source = sourceFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await exportCustomers(params);

      // 创建 Blob 并下载
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 从响应头获取文件名，或使用默认名
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'customers.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    } finally {
      setExportLoading(false);
    }
  };

  // 表单提交
  const handleFormSubmit = async (data) => {
    setFormLoading(true);
    try {
      if (selectedCustomer) {
        await updateCustomer(selectedCustomer.id, data);
        toast.success('客户信息更新成功');
      } else {
        await createCustomer(data);
        toast.success('客户创建成功');
      }
      setIsFormOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('保存客户失败:', error);
      toast.error(error.response?.data?.message || '保存失败，请重试');
    } finally {
      setFormLoading(false);
    }
  };

  // 删除客户
  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setDeleteLoading(true);
    try {
      await deleteCustomer(selectedCustomer.id);
      toast.success('客户删除成功');
      setIsDeleteOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('删除客户失败:', error);
      toast.error(error.response?.data?.message || '删除失败，请重试');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 解析标签
  const parseTags = (tagsStr) => {
    try {
      return tagsStr ? JSON.parse(tagsStr) : [];
    } catch {
      return [];
    }
  };

  // 计算总页数
  const totalPages = Math.ceil(total / pageSize);

  // 生成页码数组
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="p-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            共 {total} 位客户
          </p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="inline-flex items-center px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                导出中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                导出 Excel
              </>
            )}
          </button>
          {/* 新建按钮 */}
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新建客户
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* 搜索框 */}
          <div className="lg:col-span-2">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜索客户姓名、手机号..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* 来源筛选 */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
            >
              <option value="">全部来源</option>
              {Object.entries(sourceMap).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 开始日期 */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
              placeholder="开始日期"
            />
          </div>

          {/* 结束日期 */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
              placeholder="结束日期"
            />
          </div>

          {/* 每页条数 */}
          <div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} 条/页
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 筛选条件提示 */}
        {(search || sourceFilter || startDate || endDate) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <span>当前筛选：</span>
            {search && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">搜索: {search}</span>}
            {sourceFilter && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">{sourceMap[sourceFilter]?.label}</span>}
            {startDate && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">从: {startDate}</span>}
            {endDate && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">至: {endDate}</span>}
            <button
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setSourceFilter('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="text-red-500 hover:text-red-700 ml-2"
            >
              清除筛选
            </button>
          </div>
        )}
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    姓名
                    <SortIcon field="name" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  手机号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  微信号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  来源
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  标签
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalSpent')}
                >
                  <div className="flex items-center gap-1">
                    总消费
                    <SortIcon field="totalSpent" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('visitCount')}
                >
                  <div className="flex items-center gap-1">
                    访问次数
                    <SortIcon field="visitCount" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    创建时间
                    <SortIcon field="createdAt" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex justify-center items-center">
                      <svg
                        className="animate-spin h-8 w-8 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span className="ml-2 text-gray-500">加载中...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg
                        className="w-12 h-12 text-gray-300 mb-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <p className="text-gray-500">暂无客户数据</p>
                      <button
                        onClick={handleCreate}
                        className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        创建第一个客户
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewDetail(customer.id)}
                        className="text-gray-900 font-medium hover:text-blue-600 transition-colors"
                      >
                        {customer.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.phone}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.wechat || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {customer.source && sourceMap[customer.source] ? (
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${sourceMap[customer.source].color}`}
                        >
                          {sourceMap[customer.source].label}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {parseTags(customer.tags).map((tag) =>
                          tagMap[tag] ? (
                            <span
                              key={tag}
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tagMap[tag].color}`}
                            >
                              {tagMap[tag].label}
                            </span>
                          ) : null
                        )}
                        {parseTags(customer.tags).length === 0 && '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      ¥{(customer.totalSpent || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.visitCount || 0} 次
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {new Date(customer.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetail(customer.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="查看详情"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="编辑"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteConfirm(customer)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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
              显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 text-sm rounded transition-colors ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 新建/编辑表单弹窗 */}
      <CustomerForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        customer={selectedCustomer}
        loading={formLoading}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="删除客户"
        message={`确定要删除客户「${selectedCustomer?.name}」吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

export default CustomerList;
