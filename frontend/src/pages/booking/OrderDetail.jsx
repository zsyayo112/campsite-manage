import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';

const OrderDetail = () => {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const phone = searchParams.get('phone') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  // 获取状态显示配置
  const getStatusConfig = (status, recordType) => {
    if (recordType === 'booking') {
      const configs = {
        pending: { text: '待确认', color: 'bg-yellow-100 text-yellow-800', desc: '预约已提交，等待工作人员确认' },
        confirmed: { text: '已确认', color: 'bg-blue-100 text-blue-800', desc: '预约已确认，请按时到达' },
        converted: { text: '已转订单', color: 'bg-green-100 text-green-800', desc: '预约已转为正式订单' },
        completed: { text: '已完成', color: 'bg-gray-100 text-gray-800', desc: '行程已完成，感谢您的支持' },
        cancelled: { text: '已取消', color: 'bg-red-100 text-red-800', desc: '预约已取消' },
      };
      return configs[status] || { text: status, color: 'bg-gray-100 text-gray-800', desc: '' };
    } else {
      const configs = {
        pending: { text: '待确认', color: 'bg-yellow-100 text-yellow-800', desc: '订单待确认' },
        confirmed: { text: '已确认', color: 'bg-blue-100 text-blue-800', desc: '订单已确认，请按时到达' },
        completed: { text: '已完成', color: 'bg-gray-100 text-gray-800', desc: '行程已完成，感谢您的支持' },
        cancelled: { text: '已取消', color: 'bg-red-100 text-red-800', desc: '订单已取消' },
      };
      return configs[status] || { text: status, color: 'bg-gray-100 text-gray-800', desc: '' };
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

  // 格式化日期时间
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取详情
  useEffect(() => {
    const fetchDetail = async () => {
      if (!phone) {
        setError('缺少验证信息');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/public/orders/${type}/${id}`, {
          params: { phone }
        });

        if (!response.data.success) {
          throw new Error(response.data.error?.message || '获取详情失败');
        }

        setDetail(response.data.data);
      } catch (err) {
        setError(err.message || '网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [type, id, phone]);

  // 返回列表
  const goBack = () => {
    navigate('/my-orders');
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  // 错误
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button onClick={goBack} className="text-blue-600 hover:underline">
            返回查询页面
          </button>
        </div>
      </div>
    );
  }

  const isBooking = type === 'booking';
  const statusConfig = getStatusConfig(detail.status, type);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-blue-600 text-white py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center">
          <button onClick={goBack} className="mr-4 p-1 hover:bg-blue-700 rounded">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold">
            {isBooking ? '预约详情' : '订单详情'}
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 状态卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              {isBooking ? '预约号' : '订单号'}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
              {statusConfig.text}
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-2">
            {isBooking ? detail.bookingCode : detail.orderNumber}
          </p>
          <p className="text-sm text-gray-500">{statusConfig.desc}</p>
        </div>

        {/* 行程信息 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center">
            <span className="text-lg mr-2">📅</span>行程信息
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">到访日期</span>
              <span className="font-medium">{formatDate(detail.visitDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">人数</span>
              <span className="font-medium">
                {detail.peopleCount}人
                {detail.adultCount !== undefined && (
                  <span className="text-gray-400 ml-1">
                    （成人{detail.adultCount}
                    {detail.childCount > 0 && `，儿童${detail.childCount}`}）
                  </span>
                )}
              </span>
            </div>
            {detail.packageName && (
              <div className="flex justify-between">
                <span className="text-gray-500">套餐</span>
                <span className="font-medium">{detail.packageName}</span>
              </div>
            )}
          </div>
        </div>

        {/* 联系信息 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center">
            <span className="text-lg mr-2">👤</span>联系信息
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">姓名</span>
              <span className="font-medium">{detail.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">电话</span>
              <span className="font-medium">{detail.customerPhone}</span>
            </div>
            {detail.customerWechat && (
              <div className="flex justify-between">
                <span className="text-gray-500">微信</span>
                <span className="font-medium">{detail.customerWechat}</span>
              </div>
            )}
          </div>
        </div>

        {/* 住宿信息 */}
        {(detail.accommodationNotes || detail.hotelName || detail.roomNumber) && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="text-lg mr-2">🏨</span>住宿信息
            </h3>
            <div className="space-y-3 text-sm">
              {(detail.accommodationNotes || detail.hotelName) && (
                <div className="flex justify-between">
                  <span className="text-gray-500">住宿</span>
                  <span className="font-medium">{detail.accommodationNotes || detail.hotelName}</span>
                </div>
              )}
              {detail.roomNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">房间号</span>
                  <span className="font-medium">{detail.roomNumber}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 费用信息 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center">
            <span className="text-lg mr-2">💰</span>费用信息
          </h3>
          <div className="space-y-3 text-sm">
            {detail.adultCount !== undefined && detail.adultPrice && (
              <div className="flex justify-between">
                <span className="text-gray-500">
                  成人 {detail.adultCount}人 × ¥{detail.adultPrice}
                </span>
                <span className="font-medium">¥{detail.adultCount * detail.adultPrice}</span>
              </div>
            )}
            {detail.childCount > 0 && detail.childPrice && (
              <div className="flex justify-between">
                <span className="text-gray-500">
                  儿童 {detail.childCount}人 × ¥{detail.childPrice}
                </span>
                <span className="font-medium">¥{detail.childCount * detail.childPrice}</span>
              </div>
            )}
            {(!detail.adultPrice || detail.adultCount === undefined) && (
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {detail.peopleCount}人 × ¥{detail.unitPrice}
                </span>
                <span className="font-medium">¥{detail.peopleCount * detail.unitPrice}</span>
              </div>
            )}
            <div className="border-t pt-3 mt-3 flex justify-between font-medium text-lg">
              <span>合计</span>
              <span className="text-blue-600">¥{detail.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* 定金信息（仅预约） */}
        {isBooking && detail.depositAmount > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="text-lg mr-2">💳</span>定金信息
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">定金金额</span>
                <span className="font-medium">¥{detail.depositAmount}</span>
              </div>
              {detail.depositPaidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">支付时间</span>
                  <span className="font-medium">{formatDateTime(detail.depositPaidAt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">状态</span>
                <span className={`font-medium ${detail.depositPaidAt ? 'text-green-600' : 'text-yellow-600'}`}>
                  {detail.depositPaidAt ? '已支付' : '待支付'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 备注 */}
        {(detail.customerNotes || detail.notes) && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="text-lg mr-2">📝</span>备注
            </h3>
            <p className="text-sm text-gray-600">
              {detail.customerNotes || detail.notes}
            </p>
          </div>
        )}

        {/* 时间线 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center">
            <span className="text-lg mr-2">⏱️</span>时间记录
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">提交时间</span>
              <span className="font-medium">{formatDateTime(detail.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">更新时间</span>
              <span className="font-medium">{formatDateTime(detail.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* 接送安排（预约已确认状态） */}
        {isBooking && (detail.status === 'confirmed' || detail.status === 'converted') && (
          <div className="bg-green-50 rounded-xl p-4">
            <h3 className="font-medium text-green-800 mb-3 flex items-center">
              <span className="text-lg mr-2">📍</span>接送安排
            </h3>
            <div className="space-y-2 text-sm text-green-700">
              <p>上午 9:00 {detail.accommodationNotes || detail.hotelName || '酒店'}大堂集合</p>
              <p>下午 16:00 返回酒店</p>
            </div>
          </div>
        )}

        {/* 联系方式 */}
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-gray-500 text-sm mb-2">如有问题请联系</p>
          <p className="text-lg font-medium text-blue-600">131-9620-1942（郑长岭）</p>
        </div>

        {/* 返回按钮 */}
        <button
          onClick={goBack}
          className="w-full py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
        >
          返回列表
        </button>
      </div>

      {/* 底部 */}
      <div className="max-w-lg mx-auto px-4 py-6 text-center text-sm text-gray-400">
        <p>&copy; 长白山双溪森林营地</p>
      </div>
    </div>
  );
};

export default OrderDetail;
