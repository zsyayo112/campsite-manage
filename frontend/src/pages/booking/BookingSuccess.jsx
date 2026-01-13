import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state;
  const [copied, setCopied] = useState(false);

  // 如果没有预约数据，重定向到预约页面
  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">预约信息不存在</p>
          <button
            onClick={() => navigate('/book')}
            className="text-blue-600 hover:underline"
          >
            返回预约页面
          </button>
        </div>
      </div>
    );
  }

  // 复制确认文本
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(booking.confirmText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // 降级方案：创建临时 textarea
      const textarea = document.createElement('textarea');
      textarea.value = booking.confirmText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* 成功提示头部 */}
      <div className="bg-green-500 text-white py-8 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">预约提交成功！</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 确认码 */}
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">预约确认码</p>
          <p className="text-2xl font-bold text-blue-600 tracking-wider">{booking.bookingCode}</p>
        </div>

        {/* 预约信息 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center">
            <span className="text-lg mr-2">📋</span>预约信息
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">日期</span>
              <span className="font-medium">{booking.visitDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">姓名</span>
              <span className="font-medium">{booking.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">电话</span>
              <span className="font-medium">{booking.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">人数</span>
              <span className="font-medium">
                {booking.adultCount + booking.childCount}人
                （成人{booking.adultCount}人{booking.childCount > 0 && `，儿童${booking.childCount}人`}）
              </span>
            </div>
            {/* V2.2: 优先显示住宿备注 */}
            {(booking.accommodationNotes || booking.hotelName) && (
              <div className="flex justify-between">
                <span className="text-gray-500">住宿</span>
                <span className="font-medium">{booking.accommodationNotes || booking.hotelName}</span>
              </div>
            )}
            {booking.roomNumber && (
              <div className="flex justify-between">
                <span className="text-gray-500">房间号</span>
                <span className="font-medium">{booking.roomNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">套餐</span>
              <span className="font-medium">{booking.packageName}</span>
            </div>
          </div>
        </div>

        {/* 费用明细 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center">
            <span className="text-lg mr-2">💰</span>费用预估
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">
                成人 {booking.adultCount}人 × ¥{booking.adultPrice || booking.unitPrice}
              </span>
              <span className="font-medium">¥{booking.adultCount * (booking.adultPrice || booking.unitPrice)}</span>
            </div>
            {booking.childCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">
                  儿童 {booking.childCount}人 × ¥{booking.childPrice}
                </span>
                <span className="font-medium">¥{booking.childCount * booking.childPrice}</span>
              </div>
            )}
            <div className="border-t pt-3 mt-3 flex justify-between font-medium text-lg">
              <span>合计</span>
              <span className="text-blue-600">¥{booking.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* 接送安排 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center">
            <span className="text-lg mr-2">📍</span>接送安排
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>上午 9:00 {booking.accommodationNotes || booking.hotelName || '酒店'}大堂集合</p>
            <p>下午 16:00 返回酒店</p>
          </div>
        </div>

        {/* 温馨提示 */}
        <div className="bg-amber-50 rounded-xl p-4">
          <h3 className="font-medium text-amber-800 mb-3 flex items-center">
            <span className="text-lg mr-2">⚠️</span>温馨提示
          </h3>
          <ul className="space-y-2 text-sm text-amber-700">
            <li>• 请提前一天联系我们确认行程</li>
            <li>• 需支付100元/人定金确认预约</li>
            <li>• 活动当天请穿着保暖衣物</li>
            <li>• 如需取消请提前24小时告知</li>
          </ul>
        </div>

        {/* 联系方式 */}
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-gray-500 text-sm mb-2">如有问题请联系</p>
          <p className="text-lg font-medium text-blue-600">131-9620-1942（郑长岭）</p>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleCopy}
            className={`w-full py-3 rounded-xl font-medium transition-all ${copied
              ? 'bg-green-500 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
              }`}
          >
            {copied ? '✓ 已复制' : '复制预约信息'}
          </button>
          <button
            onClick={() => navigate('/book')}
            className="w-full py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
          >
            返回首页
          </button>
        </div>

        {/* 预约确认文本预览 */}
        <div className="bg-gray-50 rounded-xl p-4 mt-4">
          <p className="text-xs text-gray-400 mb-2">预约信息文本（点击上方按钮复制）</p>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
            {booking.confirmText}
          </pre>
        </div>
      </div>

      {/* 底部 */}
      <div className="max-w-lg mx-auto px-4 py-6 text-center text-sm text-gray-400">
        <p>© 长白山双溪森林营地</p>
      </div>
    </div>
  );
};

export default BookingSuccess;
