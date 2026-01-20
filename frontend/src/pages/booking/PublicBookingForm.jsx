import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

/**
 * V2.3 公开预约表单 - 精简版
 *
 * 优化内容：
 * 1. 压缩版面，减少行间距
 * 2. 配色改为柔和的绿色系，适合年轻妈妈群体
 * 3. 精简文案，去除冗余文字
 */
const PublicBookingForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerWechat: '',
    adultCount: 2,
    childCount: 0,
    accommodationNotes: '',
    visitDate: '',
    packageId: null,
    notes: '',
  });

  const [pricePreview, setPricePreview] = useState({
    adultPrice: 298,
    childPrice: 338,
    adultCount: 2,
    childCount: 0,
    totalAmount: 596,
  });

  const [specialDateWarning, setSpecialDateWarning] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const packagesRes = await api.get('/public/packages');
        if (packagesRes.data.success) {
          setPackages(packagesRes.data.data);
          if (packagesRes.data.data.length > 0) {
            setFormData((prev) => ({
              ...prev,
              packageId: packagesRes.data.data[0].id,
            }));
          }
        }
      } catch (err) {
        console.error('加载数据失败:', err);
        setError('加载失败，请刷新重试');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const pkg = packages.find((p) => p.id === formData.packageId);
    let adultPrice = 298;
    let childPrice = 338;
    let specialWarning = '';

    if (pkg) {
      adultPrice = pkg.price || 298;
      childPrice = pkg.childPrice || 338;

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

  const handlePackageChange = (packageId) => {
    setFormData((prev) => ({ ...prev, packageId }));
  };

  const validateForm = () => {
    if (!formData.customerName.trim()) return '请输入姓名';
    if (formData.customerName.trim().length < 2) return '姓名至少2个字符';
    if (!/^1[3-9]\d{9}$/.test(formData.customerPhone)) return '请输入正确的手机号';
    if (!formData.visitDate) return '请选择预约日期';
    if (!formData.packageId) return '请选择套餐';
    return null;
  };

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

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-3 text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-green-50 to-white">
      {/* 头部 - 紧凑版 */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-base font-bold">原始森林一日营@长白山双溪森林营地</h1>
          <p className="text-emerald-100 text-xs mt-0.5">预约系统</p>
        </div>
      </div>

      {/* 表单 - 紧凑版 */}
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-3 py-3 space-y-3">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">{error}</div>
        )}

        {/* 个人信息 */}
        <div className="bg-white rounded-xl shadow-sm p-3 space-y-2.5">
          <h3 className="font-medium text-gray-800 text-sm flex items-center">
            <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mr-2 text-xs">1</span>
            您的信息
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="姓名 *"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="手机号 *"
                maxLength={11}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <input
            type="text"
            name="customerWechat"
            value={formData.customerWechat}
            onChange={handleChange}
            placeholder="微信号（选填）"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* 参与人数 */}
        <div className="bg-white rounded-xl shadow-sm p-3">
          <h3 className="font-medium text-gray-800 text-sm flex items-center mb-2">
            <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mr-2 text-xs">2</span>
            参与人数
          </h3>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-gray-700 text-sm">成人<span className="text-gray-400 text-xs ml-1">(4岁以上)</span></span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleAdultChange(-1)}
                disabled={formData.adultCount <= 1}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-medium ${
                  formData.adultCount <= 1 ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
              >−</button>
              <span className="w-6 text-center font-medium">{formData.adultCount}</span>
              <button
                type="button"
                onClick={() => handleAdultChange(1)}
                disabled={formData.adultCount >= 50}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-medium ${
                  formData.adultCount >= 50 ? 'bg-emerald-50 text-emerald-200' : 'bg-emerald-100 text-emerald-600 active:bg-emerald-200'
                }`}
              >+</button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
            <span className="text-gray-700 text-sm">儿童<span className="text-gray-400 text-xs ml-1">(4岁以下)</span></span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleChildChange(-1)}
                disabled={formData.childCount <= 0}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-medium ${
                  formData.childCount <= 0 ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
              >−</button>
              <span className="w-6 text-center font-medium">{formData.childCount}</span>
              <button
                type="button"
                onClick={() => handleChildChange(1)}
                disabled={formData.childCount >= 50}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-medium ${
                  formData.childCount >= 50 ? 'bg-emerald-50 text-emerald-200' : 'bg-emerald-100 text-emerald-600 active:bg-emerald-200'
                }`}
              >+</button>
            </div>
          </div>

          <div className="pt-1.5 border-t border-gray-100 text-center text-gray-500 text-xs">
            共 <span className="font-medium text-gray-700">{formData.adultCount + formData.childCount}</span> 人
          </div>
        </div>

        {/* 接送酒店 + 日期 并排 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-3">
            <h3 className="font-medium text-gray-800 text-sm flex items-center mb-2">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mr-2 text-xs">3</span>
              接送酒店
            </h3>
            <input
              type="text"
              name="accommodationNotes"
              value={formData.accommodationNotes}
              onChange={handleChange}
              placeholder="如：皇冠酒店801"
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-3">
            <h3 className="font-medium text-gray-800 text-sm flex items-center mb-2">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mr-2 text-xs">4</span>
              日期 <span className="text-red-400 ml-0.5">*</span>
            </h3>
            <input
              type="date"
              name="visitDate"
              value={formData.visitDate}
              onChange={handleChange}
              min={getMinDate()}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
            {specialDateWarning && (
              <p className="mt-1 text-amber-600 text-xs">{specialDateWarning}</p>
            )}
          </div>
        </div>

        {/* 选择套餐 */}
        <div className="bg-white rounded-xl shadow-sm p-3">
          <h3 className="font-medium text-gray-800 text-sm flex items-center mb-2">
            <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mr-2 text-xs">5</span>
            选择套餐 <span className="text-red-400 ml-0.5">*</span>
          </h3>

          <div className="space-y-2">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => handlePackageChange(pkg.id)}
                className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.packageId === pkg.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 active:border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center ${
                      formData.packageId === pkg.id ? 'border-emerald-500' : 'border-gray-300'
                    }`}>
                      {formData.packageId === pkg.id && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      )}
                    </div>
                    <span className="font-medium text-sm">{pkg.name}</span>
                  </div>
                  <span className="text-emerald-600 font-medium text-sm">¥{pkg.price}/人</span>
                </div>
                {pkg.description && (
                  <p className="mt-1 text-xs text-gray-500 ml-6">{pkg.description}</p>
                )}
                {pkg.childPrice && pkg.childPrice !== pkg.price && (
                  <p className="text-xs text-gray-400 ml-6">儿童¥{pkg.childPrice}/人</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 备注 */}
        <div className="bg-white rounded-xl shadow-sm p-3">
          <h3 className="font-medium text-gray-800 text-sm flex items-center mb-2">
            <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mr-2 text-xs">6</span>
            备注
          </h3>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="如有特殊需求请说明"
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
          />
        </div>

        {/* 费用明细 */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-3 text-white">
          <div className="flex justify-between items-center text-sm">
            <div>
              <span>成人{pricePreview.adultCount}人×¥{pricePreview.adultPrice}</span>
              {pricePreview.childCount > 0 && (
                <span className="ml-2">+ 儿童{pricePreview.childCount}人×¥{pricePreview.childPrice}</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-emerald-100 text-xs">合计</span>
              <span className="text-xl font-bold ml-2">¥{pricePreview.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 rounded-xl font-medium text-base transition-all ${
            submitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-[0.98] shadow-lg shadow-emerald-200'
          }`}
        >
          {submitting ? '提交中...' : '提交预约'}
        </button>
      </form>
    </div>
  );
};

export default PublicBookingForm;
