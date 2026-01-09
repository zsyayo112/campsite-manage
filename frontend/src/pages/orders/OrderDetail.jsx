import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getOrderById, updateOrderStatus, deleteOrder } from '../../api/orders';

// 订单状态映射
const statusMap = {
  pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-700', bgColor: 'bg-yellow-500' },
  confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-700', bgColor: 'bg-blue-500' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700', bgColor: 'bg-green-500' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500', bgColor: 'bg-gray-400' },
};

// 支付状态映射
const paymentStatusMap = {
  unpaid: { label: '未支付', color: 'bg-red-100 text-red-700' },
  paid: { label: '已支付', color: 'bg-green-100 text-green-700' },
  refunded: { label: '已退款', color: 'bg-orange-100 text-orange-700' },
};

// 来源映射
const sourceMap = {
  xiaohongshu: '小红书',
  wechat: '微信',
  douyin: '抖音',
  friend: '朋友推荐',
  other: '其他',
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // 弹窗状态
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState(null);

  // 获取订单详情
  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrderById(id);
      if (res.success) {
        setOrder(res.data);
      }
    } catch (error) {
      console.error('获取订单详情失败:', error);
      toast.error('获取订单详情失败');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // 格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 格式化日期时间
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
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

  // 处理状态变更
  const handleStatusChange = (newStatus) => {
    setPendingStatus(newStatus);
    setIsStatusDialogOpen(true);
  };

  // 确认状态变更
  const confirmStatusChange = async () => {
    if (!pendingStatus) return;
    setActionLoading(true);
    try {
      await updateOrderStatus(id, { status: pendingStatus });
      toast.success('状态更新成功');
      setIsStatusDialogOpen(false);
      fetchOrder();
    } catch (error) {
      console.error('更新状态失败:', error);
      toast.error(error.response?.data?.error?.message || '状态更新失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 处理支付状态变更
  const handlePaymentStatusChange = (newStatus) => {
    setPendingPaymentStatus(newStatus);
    setIsPaymentDialogOpen(true);
  };

  // 确认支付状态变更
  const confirmPaymentStatusChange = async () => {
    if (!pendingPaymentStatus) return;
    setActionLoading(true);
    try {
      await updateOrderStatus(id, { paymentStatus: pendingPaymentStatus });
      toast.success('支付状态更新成功');
      setIsPaymentDialogOpen(false);
      fetchOrder();
    } catch (error) {
      console.error('更新支付状态失败:', error);
      toast.error(error.response?.data?.error?.message || '支付状态更新失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 处理删除
  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteOrder(id);
      toast.success('订单删除成功');
      navigate('/orders');
    } catch (error) {
      console.error('删除订单失败:', error);
      toast.error(error.response?.data?.error?.message || '删除订单失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 获取可用的状态操作
  const getAvailableStatusActions = () => {
    if (!order) return [];
    const actions = [];

    switch (order.status) {
      case 'pending':
        actions.push({ status: 'confirmed', label: '确认订单', color: 'blue' });
        actions.push({ status: 'cancelled', label: '取消订单', color: 'red' });
        break;
      case 'confirmed':
        actions.push({ status: 'completed', label: '完成订单', color: 'green' });
        actions.push({ status: 'cancelled', label: '取消订单', color: 'red' });
        break;
      default:
        break;
    }

    return actions;
  };

  // 获取可用的支付状态操作
  const getAvailablePaymentActions = () => {
    if (!order) return [];
    const actions = [];

    switch (order.paymentStatus) {
      case 'unpaid':
        actions.push({ status: 'paid', label: '标记已支付', color: 'green' });
        break;
      case 'paid':
        if (order.status === 'cancelled') {
          actions.push({ status: 'refunded', label: '标记已退款', color: 'orange' });
        }
        break;
      default:
        break;
    }

    return actions;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-2 text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">订单不存在</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            返回订单列表
          </button>
        </div>
      </div>
    );
  }

  const statusActions = getAvailableStatusActions();
  const paymentActions = getAvailablePaymentActions();

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/orders')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">创建于 {formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
          {(order.status === 'pending' || order.status === 'cancelled') && (
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              删除订单
            </button>
          )}
        </div>
      </div>

      {/* 状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* 订单状态 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">订单状态</div>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusMap[order.status]?.color}`}>
                {statusMap[order.status]?.label}
              </span>
            </div>
            {statusActions.length > 0 && (
              <div className="flex gap-2">
                {statusActions.map(action => (
                  <button
                    key={action.status}
                    onClick={() => handleStatusChange(action.status)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      action.color === 'blue'
                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                        : action.color === 'green'
                        ? 'text-green-600 bg-green-50 hover:bg-green-100'
                        : 'text-red-600 bg-red-50 hover:bg-red-100'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 支付状态 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">支付状态</div>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${paymentStatusMap[order.paymentStatus]?.color}`}>
                {paymentStatusMap[order.paymentStatus]?.label}
              </span>
            </div>
            {paymentActions.length > 0 && (
              <div className="flex gap-2">
                {paymentActions.map(action => (
                  <button
                    key={action.status}
                    onClick={() => handlePaymentStatusChange(action.status)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      action.color === 'green'
                        ? 'text-green-600 bg-green-50 hover:bg-green-100'
                        : 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧: 订单详情 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 客户信息 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">客户信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">姓名</div>
                <div className="font-medium text-gray-900 mt-1">
                  <button
                    onClick={() => navigate(`/customers/${order.customer?.id}`)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {order.customer?.name || '-'}
                  </button>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">手机号</div>
                <div className="font-medium text-gray-900 mt-1">{order.customer?.phone || '-'}</div>
              </div>
              {order.customer?.wechat && (
                <div>
                  <div className="text-sm text-gray-500">微信号</div>
                  <div className="font-medium text-gray-900 mt-1">{order.customer.wechat}</div>
                </div>
              )}
              {order.customer?.source && (
                <div>
                  <div className="text-sm text-gray-500">来源</div>
                  <div className="font-medium text-gray-900 mt-1">
                    {sourceMap[order.customer.source] || order.customer.source}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 行程信息 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">行程信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">到访日期</div>
                <div className="font-medium text-gray-900 mt-1">{formatDate(order.visitDate)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">人数</div>
                <div className="font-medium text-gray-900 mt-1">{order.peopleCount} 人</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">住宿地点</div>
                <div className="font-medium text-gray-900 mt-1">
                  {order.accommodationPlace?.name || '-'}
                  {order.roomNumber && ` (${order.roomNumber}号房)`}
                </div>
              </div>
              {order.accommodationPlace && (
                <div>
                  <div className="text-sm text-gray-500">距离/车程</div>
                  <div className="font-medium text-gray-900 mt-1">
                    {order.accommodationPlace.distance}km / 约{order.accommodationPlace.duration}分钟
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 项目明细 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {order.package ? '套餐内容' : '项目明细'}
            </h3>

            {order.package && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-blue-900">{order.package.name}</div>
                    {order.package.description && (
                      <div className="text-sm text-blue-700 mt-1">{order.package.description}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{formatAmount(order.package.price)}/人</div>
                  </div>
                </div>
              </div>
            )}

            {order.orderItems && order.orderItems.length > 0 && (
              <div className="space-y-3">
                {order.orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{item.project?.name || '-'}</div>
                      {item.project?.description && (
                        <div className="text-sm text-gray-500 mt-0.5">{item.project.description}</div>
                      )}
                      {item.project?.duration && (
                        <div className="text-xs text-gray-400 mt-1">时长: {item.project.duration}分钟</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {formatAmount(item.unitPrice)} × {item.quantity}
                      </div>
                      <div className="font-medium text-gray-900">{formatAmount(item.subtotal)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 备注 */}
          {order.notes && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">备注</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        {/* 右侧: 金额摘要 */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">金额摘要</h3>

            <div className="space-y-3">
              {order.package && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">套餐费用</span>
                  <span className="text-gray-900">
                    {formatAmount(order.package.price)} × {order.peopleCount}人
                  </span>
                </div>
              )}

              {!order.package && order.orderItems && order.orderItems.length > 0 && (
                order.orderItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-500">{item.project?.name}</span>
                    <span className="text-gray-900">{formatAmount(item.subtotal)}</span>
                  </div>
                ))
              )}

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-900">订单总额</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatAmount(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* 时间线 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-4">订单时间</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">创建时间</span>
                  <span className="text-gray-900">{formatDateTime(order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">下单日期</span>
                  <span className="text-gray-900">{formatDate(order.orderDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">更新时间</span>
                  <span className="text-gray-900">{formatDateTime(order.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 状态变更确认弹窗 */}
      <ConfirmDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        onConfirm={confirmStatusChange}
        title="确认状态变更"
        message={`确定要将订单状态更改为「${statusMap[pendingStatus]?.label}」吗？`}
        confirmText="确认"
        cancelText="取消"
        type={pendingStatus === 'cancelled' ? 'danger' : 'primary'}
        loading={actionLoading}
      />

      {/* 支付状态变更确认弹窗 */}
      <ConfirmDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        onConfirm={confirmPaymentStatusChange}
        title="确认支付状态变更"
        message={`确定要将支付状态更改为「${paymentStatusMap[pendingPaymentStatus]?.label}」吗？`}
        confirmText="确认"
        cancelText="取消"
        type="primary"
        loading={actionLoading}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="删除订单"
        message={`确定要删除订单「${order.orderNumber}」吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default OrderDetail;
