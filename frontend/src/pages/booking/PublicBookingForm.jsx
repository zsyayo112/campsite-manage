import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

/**
 * V2.7 公开预约表单 - 手机满屏优化版
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
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-emerald-400 to-green-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-emerald-400 to-green-500 flex flex-col">
      {/* 头部 */}
      <div className="text-white text-center py-4 px-4">
        <h1 className="text-lg font-bold drop-shadow-sm">原始森林一日营@长白山双溪森林营地</h1>
        <p className="text-white/80 text-sm mt-1">在线预约</p>
      </div>

      {/* 表单卡片 */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col max-w-lg w-full mx-auto px-4 pb-4">
        <div className="flex-1 bg-white/95 backdrop-blur rounded-2xl shadow-xl p-4 flex flex-col">
          {error && (
            <div className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm mb-3">{error}</div>
          )}

          {/* 日期 + 人数 */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1 bg-gray-50 rounded-xl p-3">
              <div className="text-gray-500 text-xs mb-1.5">出行日期</div>
              <input type="date" name="visitDate" value={formData.visitDate} onChange={handleChange} min={getMinDate()}
                className="w-full bg-transparent text-gray-800 text-base font-medium focus:outline-none" required />
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl p-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-gray-500 text-xs">预约人数</span>
                <span className="text-emerald-600 text-sm font-bold">{formData.adultCount + formData.childCount}人</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600 text-sm">大</span>
                  <button type="button" onClick={() => handleAdultChange(-1)} disabled={formData.adultCount <= 1}
                    className="w-6 h-6 rounded-lg bg-gray-200 text-gray-500 text-sm flex items-center justify-center">-</button>
                  <span className="text-base font-bold w-5 text-center">{formData.adultCount}</span>
                  <button type="button" onClick={() => handleAdultChange(1)}
                    className="w-6 h-6 rounded-lg bg-emerald-500 text-white text-sm flex items-center justify-center">+</button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600 text-sm">小</span>
                  <button type="button" onClick={() => handleChildChange(-1)} disabled={formData.childCount <= 0}
                    className="w-6 h-6 rounded-lg bg-gray-200 text-gray-500 text-sm flex items-center justify-center">-</button>
                  <span className="text-base font-bold w-5 text-center">{formData.childCount}</span>
                  <button type="button" onClick={() => handleChildChange(1)}
                    className="w-6 h-6 rounded-lg bg-emerald-500 text-white text-sm flex items-center justify-center">+</button>
                </div>
              </div>
            </div>
          </div>

          {/* 联系信息 */}
          <div className="space-y-3 mb-3">
            <input type="text" name="customerName" value={formData.customerName} onChange={handleChange}
              placeholder="姓名" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" required />
            <input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleChange}
              placeholder="手机号" maxLength={11} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" required />
            <input type="text" name="customerWechat" value={formData.customerWechat} onChange={handleChange}
              placeholder="微信号（选填）" className="w-full bg-gray-50 rounded-xl px-4 py-3 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            <input type="text" name="accommodationNotes" value={formData.accommodationNotes} onChange={handleChange}
              placeholder="接送酒店（选填）" maxLength={100} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>

          {/* 套餐选择 */}
          <div className="flex-1 mb-3">
            <div className="text-gray-700 text-sm font-medium mb-2">选择套餐</div>
            <div className="space-y-2">
              {packages.map((pkg) => (
                <div key={pkg.id} onClick={() => handlePackageChange(pkg.id)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.packageId === pkg.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-100 bg-gray-50'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.packageId === pkg.id ? 'border-emerald-500' : 'border-gray-300'
                      }`}>
                        {formData.packageId === pkg.id && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>}
                      </div>
                      <span className="text-base font-medium text-gray-800">{pkg.name}</span>
                    </div>
                    <span className="text-emerald-600 font-bold text-base">¥{pkg.price}</span>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-gray-500 mt-1.5 ml-7">{pkg.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 备注 */}
          <input type="text" name="notes" value={formData.notes} onChange={handleChange}
            placeholder="备注信息（选填）" maxLength={500}
            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-3" />

          {/* 底部：费用 + 提交 */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-white/80 text-sm">
                {pricePreview.adultCount}大{pricePreview.childCount > 0 ? ` ${pricePreview.childCount}小` : ''}
              </div>
              <div className="text-white font-bold text-2xl">¥{pricePreview.totalAmount}</div>
            </div>
            <button type="submit" disabled={submitting}
              className={`px-10 py-3 rounded-xl font-bold text-base transition-all ${
                submitting
                  ? 'bg-white/50 text-emerald-600 cursor-not-allowed'
                  : 'bg-white text-emerald-600 shadow-lg active:scale-95'
              }`}>
              {submitting ? '提交中...' : '立即预约'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PublicBookingForm;
