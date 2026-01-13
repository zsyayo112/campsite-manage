import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const PublicBookingForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [error, setError] = useState('');

  // 表单数据
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerWechat: '',
    visitDate: '',
    peopleCount: 2,
    childCount: 0,
    hotelName: '',
    hotelId: null,
    roomNumber: '',
    packageId: null,
    notes: '',
  });

  // 价格预览
  const [pricePreview, setPricePreview] = useState({
    unitPrice: 0,
    childPrice: 0,
    adultCount: 0,
    childCount: 0,
    totalAmount: 0,
  });

  // 特殊日期提示
  const [specialDateWarning, setSpecialDateWarning] = useState('');

  // 加载套餐和酒店列表
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [packagesRes, hotelsRes] = await Promise.all([
          api.get('/public/packages'),
          api.get('/public/hotels'),
        ]);

        if (packagesRes.data.success) {
          setPackages(packagesRes.data.data);
          // 默认选择第一个套餐
          if (packagesRes.data.data.length > 0) {
            setFormData((prev) => ({
              ...prev,
              packageId: packagesRes.data.data[0].id,
            }));
          }
        }

        if (hotelsRes.data.success) {
          setHotels(hotelsRes.data.data);
        }
      } catch (err) {
        console.error('加载数据失败:', err);
        setError('加载数据失败，请刷新重试');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 计算价格预览
  useEffect(() => {
    if (!formData.packageId || !formData.visitDate) {
      setPricePreview({ unitPrice: 0, childPrice: 0, adultCount: 0, childCount: 0, totalAmount: 0 });
      return;
    }

    const pkg = packages.find((p) => p.id === formData.packageId);
    if (!pkg) return;

    let unitPrice = pkg.price;
    let childPrice = pkg.childPrice || unitPrice * 0.8;
    let specialWarning = '';

    // 检查特殊日期
    if (pkg.specialPricing && formData.visitDate) {
      const visitDateStr = formData.visitDate;
      for (const [dateRange, pricing] of Object.entries(pkg.specialPricing)) {
        const [start, end] = dateRange.split('~');
        if (visitDateStr >= start && visitDateStr <= end) {
          unitPrice = pricing.price;
          childPrice = pricing.childPrice || unitPrice * 0.8;
          specialWarning = pricing.label || '特殊日期价格';
          break;
        }
      }
    }

    const adultCount = formData.peopleCount - formData.childCount;
    const totalAmount = adultCount * unitPrice + formData.childCount * childPrice;

    setPricePreview({
      unitPrice,
      childPrice,
      adultCount,
      childCount: formData.childCount,
      totalAmount,
    });
    setSpecialDateWarning(specialWarning);
  }, [formData.packageId, formData.visitDate, formData.peopleCount, formData.childCount, packages]);

  // 处理输入变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 处理数字输入
  const handleNumberChange = (name, delta) => {
    setFormData((prev) => {
      let newValue = (prev[name] || 0) + delta;
      if (name === 'peopleCount') {
        newValue = Math.max(1, Math.min(50, newValue));
        // 确保儿童人数不超过总人数
        if (prev.childCount > newValue) {
          return { ...prev, [name]: newValue, childCount: newValue };
        }
      } else if (name === 'childCount') {
        newValue = Math.max(0, Math.min(prev.peopleCount, newValue));
      }
      return { ...prev, [name]: newValue };
    });
  };

  // 处理酒店选择
  const handleHotelChange = (e) => {
    const selectedId = e.target.value;
    if (selectedId === 'other') {
      setFormData((prev) => ({ ...prev, hotelId: null, hotelName: '' }));
    } else {
      const hotel = hotels.find((h) => h.id === parseInt(selectedId));
      setFormData((prev) => ({
        ...prev,
        hotelId: hotel?.id || null,
        hotelName: hotel?.name || '',
      }));
    }
  };

  // 处理套餐选择
  const handlePackageChange = (packageId) => {
    setFormData((prev) => ({ ...prev, packageId }));
  };

  // 验证表单
  const validateForm = () => {
    if (!formData.customerName.trim()) {
      return '请输入姓名';
    }
    if (!/^1[3-9]\d{9}$/.test(formData.customerPhone)) {
      return '请输入正确的手机号';
    }
    if (!formData.visitDate) {
      return '请选择预约日期';
    }
    if (!formData.hotelName.trim()) {
      return '请选择或输入酒店名称';
    }
    if (!formData.packageId) {
      return '请选择套餐';
    }
    return null;
  };

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/public/bookings', formData);

      if (response.data.success) {
        // 跳转到成功页面，传递预约数据
        navigate('/booking/success', { state: response.data.data });
      } else {
        setError(response.data.error?.message || '提交失败');
      }
    } catch (err) {
      console.error('提交预约失败:', err);
      setError(err.response?.data?.error?.message || '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 获取明天的日期作为最小可选日期
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 头部 */}
      <div className="bg-blue-600 text-white py-6 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-2xl font-bold">长白山双溪森林营地</h1>
          <p className="mt-1 text-blue-100">冬季活动预约</p>
        </div>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {/* 选择日期 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="text-lg mr-2">📅</span>选择日期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="visitDate"
            value={formData.visitDate}
            onChange={handleChange}
            min={getMinDate()}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          {specialDateWarning && (
            <p className="mt-2 text-amber-600 text-sm flex items-center">
              <span className="mr-1">⚠️</span>
              {specialDateWarning}：价格有调整
            </p>
          )}
        </div>

        {/* 个人信息 */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <h3 className="font-medium text-gray-900">
            <span className="text-lg mr-2">👤</span>您的信息
          </h3>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              placeholder="请输入姓名"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              手机号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={handleChange}
              placeholder="请输入11位手机号"
              maxLength={11}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">微信号（选填）</label>
            <input
              type="text"
              name="customerWechat"
              value={formData.customerWechat}
              onChange={handleChange}
              placeholder="方便我们联系您"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 参与人数 */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <h3 className="font-medium text-gray-900">
            <span className="text-lg mr-2">👥</span>参与人数
          </h3>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">成人</span>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => handleNumberChange('peopleCount', -1)}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200"
              >
                -
              </button>
              <span className="w-8 text-center font-medium text-lg">
                {formData.peopleCount - formData.childCount}
              </span>
              <button
                type="button"
                onClick={() => handleNumberChange('peopleCount', 1)}
                className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-600">儿童（4岁以下）</span>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => handleNumberChange('childCount', -1)}
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200"
              >
                -
              </button>
              <span className="w-8 text-center font-medium text-lg">{formData.childCount}</span>
              <button
                type="button"
                onClick={() => handleNumberChange('childCount', 1)}
                className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* 住宿信息 */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <h3 className="font-medium text-gray-900">
            <span className="text-lg mr-2">🏨</span>住宿信息
          </h3>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              选择酒店 <span className="text-red-500">*</span>
            </label>
            <select
              onChange={handleHotelChange}
              value={formData.hotelId || 'other'}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">请选择酒店</option>
              {hotels.map((hotel) => (
                <option key={hotel.id || 'other'} value={hotel.id || 'other'}>
                  {hotel.name}
                  {hotel.area ? ` (${hotel.area})` : ''}
                </option>
              ))}
            </select>
          </div>

          {formData.hotelId === null && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">请输入酒店名称</label>
              <input
                type="text"
                name="hotelName"
                value={formData.hotelName}
                onChange={handleChange}
                placeholder="请输入您入住的酒店名称"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">房间号（选填）</label>
            <input
              type="text"
              name="roomNumber"
              value={formData.roomNumber}
              onChange={handleChange}
              placeholder="方便接送时联系"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 选择套餐 */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <h3 className="font-medium text-gray-900">
            <span className="text-lg mr-2">🎁</span>选择套餐 <span className="text-red-500">*</span>
          </h3>

          <div className="space-y-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => handlePackageChange(pkg.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.packageId === pkg.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                        formData.packageId === pkg.id ? 'border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      {formData.packageId === pkg.id && (
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      )}
                    </div>
                    <span className="font-medium">{pkg.name}</span>
                  </div>
                  <span className="text-blue-600 font-medium">¥{pkg.price}/人</span>
                </div>
                {pkg.description && (
                  <p className="mt-2 text-sm text-gray-500 ml-8">{pkg.description}</p>
                )}
                {pkg.childPrice && (
                  <p className="mt-1 text-sm text-gray-400 ml-8">儿童价：¥{pkg.childPrice}/人</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 备注 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="text-lg mr-2">📝</span>备注（选填）
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="如有特殊需求请在此说明"
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* 费用预估 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <h3 className="font-medium mb-3">💰 费用预估</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>成人 {pricePreview.adultCount}人 × ¥{pricePreview.unitPrice}</span>
              <span>¥{pricePreview.adultCount * pricePreview.unitPrice}</span>
            </div>
            {pricePreview.childCount > 0 && (
              <div className="flex justify-between">
                <span>儿童 {pricePreview.childCount}人 × ¥{pricePreview.childPrice}</span>
                <span>¥{pricePreview.childCount * pricePreview.childPrice}</span>
              </div>
            )}
            <div className="border-t border-blue-400 pt-2 mt-2 flex justify-between font-medium text-lg">
              <span>合计</span>
              <span>¥{pricePreview.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-4 rounded-xl font-medium text-lg transition-all ${
            submitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
          }`}
        >
          {submitting ? '提交中...' : '✓ 提交预约'}
        </button>

        {/* 提示信息 */}
        <p className="text-center text-sm text-gray-400">
          提交即表示同意《预约须知》
        </p>
      </form>

      {/* 底部信息 */}
      <div className="max-w-lg mx-auto px-4 py-6 text-center text-sm text-gray-400">
        <p>如有问题请联系客服</p>
        <p className="mt-1">© 长白山双溪森林营地</p>
      </div>
    </div>
  );
};

export default PublicBookingForm;
