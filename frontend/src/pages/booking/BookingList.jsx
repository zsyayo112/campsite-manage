import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  getBookings,
  updateBookingStatus,
  updateBookingDeposit,
  convertToOrder,
  deleteBooking,
  getBookingStats,
} from '../../api/bookings';

// 预约状态映射
const statusMap = {
  pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-700' },
  converted: { label: '已转订单', color: 'bg-purple-100 text-purple-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
};

// 来源映射
const sourceMap = {
  wechat_form: '微信表单',
  manual: '手动创建',
  phone: '电话预约',
};

// 每页条数选项
const pageSizeOptions = [10, 20, 50, 100];

const BookingList = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // 数据状态
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);

  // 筛选和分页状态
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 弹窗状态
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  // 获取预约列表
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        sortBy,
        order: sortOrder,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await getBookings(params);
      if (response.success) {
        setBookings(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('获取预约列表失败:', error);
      toast.error('获取预约列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, startDate, endDate, sortBy, sortOrder, toast]);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    try {
      const response = await getBookingStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  // 确认预约
  const handleConfirm = async (booking) => {
    try {
      await updateBookingStatus(booking.id, { status: 'confirmed' });
      toast.success('预约已确认');
      fetchBookings();
      fetchStats();
    } catch (error) {
      console.error('确认预约失败:', error);
      toast.error(error.response?.data?.error?.message || '确认失败');
    }
  };

  // 取消预约
  const handleCancel = async (booking) => {
    try {
      await updateBookingStatus(booking.id, { status: 'cancelled' });
      toast.success('预约已取消');
      fetchBookings();
      fetchStats();
    } catch (error) {
      console.error('取消预约失败:', error);
      toast.error(error.response?.data?.error?.message || '取消失败');
    }
  };

  // 打开转订单弹窗
  const handleConvertOpen = (booking) => {
    setSelectedBooking(booking);
    setIsConvertOpen(true);
  };

  // 转为订单
  const handleConvert = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    try {
      const response = await convertToOrder(selectedBooking.id);
      toast.success('已转为订单');
      setIsConvertOpen(false);
      fetchBookings();
      fetchStats();
      // 跳转到新订单
      if (response.data?.orderId) {
        navigate(`/orders/${response.data.orderId}`);
      }
    } catch (error) {
      console.error('转订单失败:', error);
      toast.error(error.response?.data?.error?.message || '转订单失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 打开定金弹窗
  const handleDepositOpen = (booking) => {
    setSelectedBooking(booking);
    setDepositAmount(booking.depositAmount ? String(booking.depositAmount) : '');
    setIsDepositOpen(true);
  };

  // 记录定金
  const handleDeposit = async () => {
    if (!selectedBooking) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('请输入有效的定金金额');
      return;
    }
    setActionLoading(true);
    try {
      await updateBookingDeposit(selectedBooking.id, { depositAmount: amount });
      toast.success('定金已记录');
      setIsDepositOpen(false);
      fetchBookings();
    } catch (error) {
      console.error('记录定金失败:', error);
      toast.error(error.response?.data?.error?.message || '记录定金失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 打开删除弹窗
  const handleDeleteOpen = (booking) => {
    setSelectedBooking(booking);
    setIsDeleteOpen(true);
  };

  // 删除预约
  const handleDelete = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    try {
      await deleteBooking(selectedBooking.id);
      toast.success('预约已删除');
      setIsDeleteOpen(false);
      fetchBookings();
      fetchStats();
    } catch (error) {
      console.error('删除预约失败:', error);
      toast.error(error.response?.data?.error?.message || '删除失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  // 格式化日期时间
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化金额
  const formatAmount = (amount) => {
    return `¥${Number(amount || 0).toLocaleString()}`;
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

  // 重置筛选
  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // 复制预约链接
  const handleCopyLink = async () => {
    const bookingUrl = `${window.location.origin}/book`;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast.success('预约链接已复制');
    } catch (err) {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = bookingUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('预约链接已复制');
    }
  };

  return (
    <div className="p-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">预约管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            共 {total} 个预约
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            复制预约链接
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">待确认</div>
            <div className="mt-1 text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">已确认</div>
            <div className="mt-1 text-2xl font-bold text-blue-600">{stats.confirmed || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">今日预约</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{stats.todayCount || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">本周预约</div>
            <div className="mt-1 text-2xl font-bold text-purple-600">{stats.weekCount || 0}</div>
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                placeholder="搜索确认码、客户姓名、手机号..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* 预约状态筛选 */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
            >
              <option value="">全部状态</option>
              {Object.entries(statusMap).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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

          {/* 日期范围 */}
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

          {/* 重置按钮 */}
          <div className="lg:col-span-2 flex justify-end">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              重置筛选
            </button>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('bookingCode')}
                >
                  <div className="flex items-center gap-1">
                    确认码
                    <SortIcon field="bookingCode" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  客户信息
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('visitDate')}
                >
                  <div className="flex items-center gap-1">
                    到访日期
                    <SortIcon field="visitDate" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  酒店/人数
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  套餐
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalAmount')}
                >
                  <div className="flex items-center gap-1">
                    金额/定金
                    <SortIcon field="totalAmount" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  状态
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    提交时间
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
              ) : bookings.length === 0 ? (
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
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-gray-500">暂无预约数据</p>
                      <button
                        onClick={handleCopyLink}
                        className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        复制预约链接分享给客户
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-blue-600">
                        {booking.bookingCode}
                      </div>
                      <div className="text-xs text-gray-400">
                        {sourceMap[booking.source] || booking.source}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {booking.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.customerPhone}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(booking.visitDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{booking.hotelName}</div>
                      <div className="text-sm text-gray-500">
                        {booking.peopleCount}人
                        {booking.childCount > 0 && `（含${booking.childCount}儿童）`}
                        {booking.roomNumber && ` · ${booking.roomNumber}房`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {booking.packageName || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {formatAmount(booking.totalAmount)}
                      </div>
                      {booking.depositAmount > 0 && (
                        <div className="text-sm text-green-600">
                          定金 {formatAmount(booking.depositAmount)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusMap[booking.status]?.color || 'bg-gray-100 text-gray-700'}`}
                      >
                        {statusMap[booking.status]?.label || booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {formatDateTime(booking.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* 确认按钮 */}
                        {booking.status === 'pending' && (
                          <button
                            onClick={() => handleConfirm(booking)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="确认预约"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        {/* 记录定金按钮 */}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <button
                            onClick={() => handleDepositOpen(booking)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="记录定金"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        {/* 转订单按钮 */}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleConvertOpen(booking)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="转为订单"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </button>
                        )}
                        {/* 取消按钮 */}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <button
                            onClick={() => handleCancel(booking)}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            title="取消预约"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        {/* 删除按钮 */}
                        {booking.status === 'cancelled' && (
                          <button
                            onClick={() => handleDeleteOpen(booking)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="删除"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
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

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="删除预约"
        message={`确定要删除预约「${selectedBooking?.bookingCode}」吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        loading={actionLoading}
      />

      {/* 转订单确认弹窗 */}
      <ConfirmDialog
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        onConfirm={handleConvert}
        title="转为订单"
        message={`确定要将预约「${selectedBooking?.bookingCode}」转为正式订单吗？转换后将自动创建订单并关联客户信息。`}
        confirmText="确认转换"
        cancelText="取消"
        type="primary"
        loading={actionLoading}
      />

      {/* 定金弹窗 */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsDepositOpen(false)} />
            <div className="relative inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                记录定金
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">
                  预约确认码：{selectedBooking?.bookingCode}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  预估总额：{formatAmount(selectedBooking?.totalAmount)}
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  定金金额 (元)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="请输入定金金额"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsDepositOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingList;
