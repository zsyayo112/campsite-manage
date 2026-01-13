import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

/**
 * V2.2 公开预约表单
 *
 * 优化内容：
 * 1. 调整字段顺序：姓名 → 手机号 → 微信号 → 人数 → 住宿备注 → 日期 → 套餐 → 备注
 * 2. 修复人数选择器Bug：成人和儿童独立计数
 * 3. 取消酒店选择，改为住宿备注文本输入
 * 4. 定价：成人298元/人，儿童(4岁以下)238元/人
 */
const PublicBookingForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState('');

  // V2.2: 表单数据 - 使用独立的 adultCount 和 childCount
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerWechat: '',
    adultCount: 2,          // V2.2: 成人人数（独立状态）
    childCount: 0,          // 儿童人数（独立状态）
    accommodationNotes: '', // V2.2: 住宿备注（替代酒店选择）
    visitDate: '',
    packageId: null,
    notes: '',
  });

  // 价格预览
  const [pricePreview, setPricePreview] = useState({
    adultPrice: 298,
    childPrice: 238,
    adultCount: 2,
    childCount: 0,
    totalAmount: 596,
  });

  // 特殊日期提示
  const [specialDateWarning, setSpecialDateWarning] = useState('');

  // 加载套餐列表
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const packagesRes = await api.get('/public/packages');

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
      } catch (err) {
        console.error('加载数据失败:', err);
        setError('加载数据失败，请刷新重试');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // V2.2: 计算价格预览 - 使用独立的 adultCount 和 childCount
  useEffect(() => {
    const pkg = packages.find((p) => p.id === formData.packageId);

    // 默认价格
    let adultPrice = 298;
    let childPrice = 238;
    let specialWarning = '';

    if (pkg) {
      adultPrice = pkg.price || 298;
      childPrice = pkg.childPrice || 238;

      // 检查特殊日期
      if (pkg.specialPricing && formData.visitDate) {
        const visitDateStr = formData.visitDate;
        for (const [dateRange, pricing] of Object.entries(pkg.specialPricing)) {
          const [start, end] = dateRange.split('~');
          if (visitDateStr >= start && visitDateStr <= end) {
            adultPrice = pricing.price || adultPrice;
            childPrice = pricing.childPrice || childPrice;
            specialWarning = pricing.label || '特殊日期价格';
            break;
          }
        }
      }
    }

    const totalAmount = formData.adultCount * adultPrice + formData.childCount * childPrice;

    setPricePreview({
      adultPrice,
      childPrice,
      adultCount: formData.adultCount,
      childCount: formData.childCount,
      totalAmount,
    });
    setSpecialDateWarning(specialWarning);
  }, [formData.packageId, formData.visitDate, formData.adultCount, formData.childCount, packages]);

  // 处理输入变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // V2.2: 处理人数变化 - 成人和儿童完全独立
  const handleAdultChange = (delta) => {
    setFormData((prev) => {
      const newValue = Math.max(1, Math.min(50, prev.adultCount + delta));
      return { ...prev, adultCount: newValue };
    });
  };

  const handleChildChange = (delta) => {
    setFormData((prev) => {
      const newValue = Math.max(0, Math.min(50, prev.childCount + delta));
      return { ...prev, childCount: newValue };
    });
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
    if (formData.customerName.trim().length < 2) {
      return '姓名至少2个字符';
    }
    if (!/^1[3-9]\d{9}$/.test(formData.customerPhone)) {
      return '请输入正确的手机号';
    }
    if (!formData.visitDate) {
      return '请选择预约日期';
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
      // V2.2: 发送新格式的数据
      const response = await api.post('/public/bookings', {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone,
        customerWechat: formData.customerWechat,
        adultCount: formData.adultCount,
        childCount: formData.childCount,
        accommodationNotes: formData.accommodationNotes,
        visitDate: formData.visitDate,
        packageId: formData.packageId,
        notes: formData.notes,
      });

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
          <h1 className="text-2xl font-bold">🏔️ 长白山双溪森林营地</h1>
          <p className="mt-1 text-blue-100">冬季活动预约</p>
        </div>
      </div>

      {/* 表单 - V2.2 调整字段顺序 */}
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {/* 1. 个人信息 - 放在最前面 */}
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

        {/* 2. 参与人数 - V2.2 修复Bug：成人和儿童独立控制 */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <h3 className="font-medium text-gray-900">
            <span className="text-lg mr-2">👥</span>参与人数
          </h3>

          {/* 成人 */}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-gray-800 font-medium">成人</span>
              <span className="text-gray-500 text-sm ml-2">(4岁以上)</span>
              <p className="text-blue-600 text-sm">¥{pricePreview.adultPrice}/人</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => handleAdultChange(-1)}
                disabled={formData.adultCount <= 1}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-colors ${
                  formData.adultCount <= 1
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                −
              </button>
              <span className="w-8 text-center font-medium text-lg">{formData.adultCount}</span>
              <button
                type="button"
                onClick={() => handleAdultChange(1)}
                disabled={formData.adultCount >= 50}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-colors ${
                  formData.adultCount >= 50
                    ? 'bg-blue-50 text-blue-200 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                +
              </button>
            </div>
          </div>

          {/* 儿童 */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <span className="text-gray-800 font-medium">儿童</span>
              <span className="text-gray-500 text-sm ml-2">(4岁以下)</span>
              <p className="text-blue-600 text-sm">¥{pricePreview.childPrice}/人</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => handleChildChange(-1)}
                disabled={formData.childCount <= 0}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-colors ${
                  formData.childCount <= 0
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                −
              </button>
              <span className="w-8 text-center font-medium text-lg">{formData.childCount}</span>
              <button
                type="button"
                onClick={() => handleChildChange(1)}
                disabled={formData.childCount >= 50}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-colors ${
                  formData.childCount >= 50
                    ? 'bg-blue-50 text-blue-200 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                +
              </button>
            </div>
          </div>

          {/* 合计人数 */}
          <div className="pt-2 border-t border-gray-100 text-center text-gray-500">
            合计：<span className="font-medium text-gray-800">{formData.adultCount + formData.childCount}</span> 人
          </div>
        </div>

        {/* 3. 住宿信息 - V2.2 改为备注文本输入 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="text-lg mr-2">🏨</span>住宿信息（选填）
          </label>
          <input
            type="text"
            name="accommodationNotes"
            value={formData.accommodationNotes}
            onChange={handleChange}
            placeholder="例如：二道白河喆啡酒店801房"
            maxLength={100}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-2 text-xs text-gray-400">
            请填写您的住宿地点（酒店名称、地址等），方便我们安排接送
          </p>
        </div>

        {/* 4. 选择日期 */}
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

        {/* 5. 选择套餐 */}
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

        {/* 6. 备注 */}
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
          <h3 className="font-medium mb-3">💰 费用明细</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>成人 {pricePreview.adultCount}人 × ¥{pricePreview.adultPrice}</span>
              <span>¥{pricePreview.adultCount * pricePreview.adultPrice}</span>
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
