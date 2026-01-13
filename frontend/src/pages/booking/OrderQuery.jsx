import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const OrderQuery = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  // 手机号格式验证
  const isValidPhone = (phone) => /^1[3-9]\d{9}$/.test(phone);

  // 查询订单
  const handleQuery = async (e) => {
    e.preventDefault();

    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }

    if (!isValidPhone(phone)) {
      setError('请输入正确的手机号格式');
      return;
    }

    setError('');
    setLoading(true);
    setResults(null);

    try {
      const response = await api.post('/public/orders/query', { phone });

      if (!response.data.success) {
        throw new Error(response.data.error?.message || '查询失败');
      }

      setResults(response.data.data);
    } catch (err) {
      setError(err.message || '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取状态显示配置
  const getStatusConfig = (status, type) => {
    if (type === 'booking') {
      const configs = {
        pending: { text: '待确认', color: 'bg-yellow-100 text-yellow-800' },
        confirmed: { text: '已确认', color: 'bg-blue-100 text-blue-800' },
        converted: { text: '已转订单', color: 'bg-green-100 text-green-800' },
        completed: { text: '已完成', color: 'bg-gray-100 text-gray-800' },
        cancelled: { text: '已取消', color: 'bg-red-100 text-red-800' },
      };
      return configs[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    } else {
      const configs = {
        pending: { text: '待确认', color: 'bg-yellow-100 text-yellow-800' },
        confirmed: { text: '已确认', color: 'bg-blue-100 text-blue-800' },
        completed: { text: '已完成', color: 'bg-green-100 text-green-800' },
        cancelled: { text: '已取消', color: 'bg-red-100 text-red-800' },
      };
      return configs[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 跳转到详情页
  const goToDetail = (type, id) => {
    navigate(`/my-orders/${type}/${id}?phone=${encodeURIComponent(phone)}`);
  };

  // 渲染订单卡片
  const renderOrderCard = (item, type) => {
    const statusConfig = getStatusConfig(item.status, type);
    const isBooking = type === 'booking';

    return (
      <div
        key={`${type}-${item.id}`}
        onClick={() => goToDetail(type, item.id)}
        className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow active:bg-gray-50"
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-xs text-gray-400">
              {isBooking ? '预约' : '订单'}
            </span>
            <p className="font-medium text-gray-900">
              {isBooking ? item.bookingCode : item.orderNumber}
            </p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.text}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">到访日期</span>
            <span className="font-medium">{formatDate(item.visitDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">人数</span>
            <span className="font-medium">{item.peopleCount}人</span>
          </div>
          {item.packageName && (
            <div className="flex justify-between">
              <span className="text-gray-500">套餐</span>
              <span className="font-medium">{item.packageName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">金额</span>
            <span className="font-medium text-blue-600">¥{item.totalAmount}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t flex justify-between items-center">
          <span className="text-xs text-gray-400">
            {formatDate(item.createdAt)} 提交
          </span>
          <span className="text-xs text-blue-600 flex items-center">
            查看详情
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-blue-600 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-center">我的预约/订单</h1>
          <p className="text-blue-100 text-sm text-center mt-1">
            输入手机号查询您的预约和订单
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 查询表单 */}
        <form onSubmit={handleQuery} className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              手机号码
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="请输入预约时使用的手机号"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              maxLength={11}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-medium transition-all ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                查询中...
              </span>
            ) : (
              '查询'
            )}
          </button>
        </form>

        {/* 查询结果 */}
        {results && (
          <div className="space-y-4">
            {/* 统计信息 */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{results.bookings.length}</p>
                  <p className="text-sm text-gray-500">预约记录</p>
                </div>
                <div className="border-l" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{results.orders.length}</p>
                  <p className="text-sm text-gray-500">订单记录</p>
                </div>
              </div>
            </div>

            {/* 无记录提示 */}
            {results.bookings.length === 0 && results.orders.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">暂无预约或订单记录</p>
                <button
                  onClick={() => navigate('/book')}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  立即预约
                </button>
              </div>
            )}

            {/* 预约列表 */}
            {results.bookings.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <span className="mr-2">📋</span>
                  预约记录
                </h2>
                <div className="space-y-3">
                  {results.bookings.map((item) => renderOrderCard(item, 'booking'))}
                </div>
              </div>
            )}

            {/* 订单列表 */}
            {results.orders.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <span className="mr-2">📦</span>
                  订单记录
                </h2>
                <div className="space-y-3">
                  {results.orders.map((item) => renderOrderCard(item, 'order'))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 底部导航 */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/book')}
            className="text-blue-600 hover:underline text-sm"
          >
            返回预约首页
          </button>
        </div>
      </div>

      {/* 底部 */}
      <div className="max-w-lg mx-auto px-4 py-6 text-center text-sm text-gray-400">
        <p>&copy; 长白山双溪森林营地</p>
      </div>
    </div>
  );
};

export default OrderQuery;
