import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

/**
 * V2.4 公开预约表单 - 超紧凑版
 * 目标：一屏显示完整表单，无需滚动
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const packagesRes = await api.get('/public/packages');
        if (packagesRes.data.success) {
          setPackages(packagesRes.data.data);
          if (packagesRes.data.data.length > 0) {
            setFormData((prev) => ({ ...prev, packageId: packagesRes.data.data[0].id }));
          }
        }
      } catch (err) {
        setError('加载失败，请刷新');
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

    if (pkg) {
      adultPrice = pkg.price || 298;
      childPrice = pkg.childPrice || 338;

      if (pkg.specialPricing && formData.visitDate) {
        for (const [dateRange, pricing] of Object.entries(pkg.specialPricing)) {
          const [start, end] = dateRange.split('~');
          if (formData.visitDate >= start && formData.visitDate <= end) {
            adultPrice = pricing.price || adultPrice;
            childPrice = pricing.childPrice || childPrice;
            break;
          }
        }
      }
    }

    setPricePreview({
      adultPrice,
      childPrice,
      adultCount: formData.adultCount,
      childCount: formData.childCount,
      totalAmount: formData.adultCount * adultPrice + formData.childCount * childPrice,
    });
  }, [formData.packageId, formData.visitDate, formData.adultCount, formData.childCount, packages]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdultChange = (delta) => {
    setFormData((prev) => ({
      ...prev,
      adultCount: Math.max(1, Math.min(50, prev.adultCount + delta)),
    }));
  };

  const handleChildChange = (delta) => {
    setFormData((prev) => ({
      ...prev,
      childCount: Math.max(0, Math.min(50, prev.childCount + delta)),
    }));
  };

  const handlePackageChange = (packageId) => {
    setFormData((prev) => ({ ...prev, packageId }));
  };

  const validateForm = () => {
    if (!formData.customerName.trim()) return '请输入姓名';
    if (formData.customerName.trim().length < 2) return '姓名至少2个字符';
    if (!/^1[3-9]\d{9}$/.test(formData.customerPhone)) return '请输入正确的手机号';
    if (!formData.visitDate) return '请选择日期';
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
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* 头部 - 单行 */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 px-3">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-sm font-bold">原始森林一日营@长白山双溪森林营地 · 预约系统</h1>
        </div>
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-3 py-2 space-y-2">
        {error && (
          <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs">{error}</div>
        )}

        {/* 第一行：日期 */}
        <div className="bg-white rounded-xl shadow-sm p-2.5 flex items-center justify-between">
          <span className="text-gray-700 text-sm font-medium">日期 <span className="text-red-400">*</span></span>
          <input
            type="date"
            name="visitDate"
            value={formData.visitDate}
            onChange={handleChange}
            min={getMinDate()}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            required
          />
        </div>

        {/* 第二行：预约人数（标题+共X人）和 成人/儿童选择器 */}
        <div className="bg-white rounded-xl shadow-sm p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 text-sm font-medium">预约人数</span>
            <span className="text-emerald-600 text-sm font-medium">共 {formData.adultCount + formData.childCount} 人</span>
          </div>
          <div className="flex items-center justify-between">
            {/* 成人 */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 text-xs">成人</span>
              <button type="button" onClick={() => handleAdultChange(-1)} disabled={formData.adultCount <= 1}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${formData.adultCount <= 1 ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>−</button>
              <span className="w-5 text-center text-sm font-medium">{formData.adultCount}</span>
              <button type="button" onClick={() => handleAdultChange(1)} disabled={formData.adultCount >= 50}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${formData.adultCount >= 50 ? 'bg-emerald-50 text-emerald-200' : 'bg-emerald-100 text-emerald-600 active:bg-emerald-200'}`}>+</button>
            </div>
            {/* 儿童 */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 text-xs">儿童</span>
              <button type="button" onClick={() => handleChildChange(-1)} disabled={formData.childCount <= 0}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${formData.childCount <= 0 ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>−</button>
              <span className="w-5 text-center text-sm font-medium">{formData.childCount}</span>
              <button type="button" onClick={() => handleChildChange(1)} disabled={formData.childCount >= 50}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${formData.childCount >= 50 ? 'bg-emerald-50 text-emerald-200' : 'bg-emerald-100 text-emerald-600 active:bg-emerald-200'}`}>+</button>
            </div>
          </div>
        </div>

        {/* 第三行：姓名 + 手机 */}
        <div className="bg-white rounded-xl shadow-sm p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" name="customerName" value={formData.customerName} onChange={handleChange}
              placeholder="姓名 *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required />
            <input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleChange}
              placeholder="手机号 *" maxLength={11} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" required />
          </div>
        </div>

        {/* 第四行：微信 + 接送酒店 */}
        <div className="bg-white rounded-xl shadow-sm p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" name="customerWechat" value={formData.customerWechat} onChange={handleChange}
              placeholder="微信号（选填）" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
            <input type="text" name="accommodationNotes" value={formData.accommodationNotes} onChange={handleChange}
              placeholder="接送酒店（选填）" maxLength={100} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        {/* 第五行：选择套餐 */}
        <div className="bg-white rounded-xl shadow-sm p-2.5">
          <div className="text-gray-700 text-sm font-medium mb-2">选择套餐 <span className="text-red-400">*</span></div>
          <div className="space-y-1.5">
            {packages.map((pkg) => (
              <div key={pkg.id} onClick={() => handlePackageChange(pkg.id)}
                className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${formData.packageId === pkg.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center ${formData.packageId === pkg.id ? 'border-emerald-500' : 'border-gray-300'}`}>
                      {formData.packageId === pkg.id && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                    </div>
                    <span className="text-sm font-medium">{pkg.name}</span>
                  </div>
                  <span className="text-emerald-600 text-sm font-medium">¥{pkg.price}/人</span>
                </div>
                {pkg.description && <p className="text-xs text-gray-500 ml-6 mt-0.5">{pkg.description}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* 第六行：备注 */}
        <div className="bg-white rounded-xl shadow-sm p-2.5">
          <input type="text" name="notes" value={formData.notes} onChange={handleChange}
            placeholder="备注（选填）" maxLength={500} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
        </div>

        {/* 费用明细 + 提交按钮 */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-3 text-white">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs">
              成人{pricePreview.adultCount}×¥{pricePreview.adultPrice}
              {pricePreview.childCount > 0 && <span> + 儿童{pricePreview.childCount}×¥{pricePreview.childPrice}</span>}
            </div>
            <div className="text-right">
              <span className="text-emerald-100 text-xs">合计 </span>
              <span className="text-xl font-bold">¥{pricePreview.totalAmount}</span>
            </div>
          </div>
          <button type="submit" disabled={submitting}
            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${submitting ? 'bg-white/30 cursor-not-allowed' : 'bg-white text-emerald-600 active:scale-[0.98]'}`}>
            {submitting ? '提交中...' : '提交预约'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PublicBookingForm;
