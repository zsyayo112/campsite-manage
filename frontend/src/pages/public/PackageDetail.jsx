import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api, { getFileUrl } from '../../utils/api';

const PublicPackageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 获取套餐详情
  const fetchPackage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/public/packages/${id}`);
      if (response.data.success) {
        setPkg(response.data.data);
      }
    } catch (err) {
      console.error('获取套餐详情失败:', err);
      if (err.response?.status === 404) {
        setError('套餐不存在或已下架');
      } else {
        setError('获取套餐详情失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPackage();
  }, [fetchPackage]);

  // 格式化金额
  const formatAmount = (amount) => `¥${Number(amount || 0).toLocaleString()}`;

  // 计算折扣
  const getDiscount = (price, originalPrice) => {
    if (!originalPrice || parseFloat(originalPrice) <= parseFloat(price)) return null;
    const discount = Math.round((1 - parseFloat(price) / parseFloat(originalPrice)) * 100);
    return discount > 0 ? discount : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <svg className="w-12 sm:w-16 h-12 sm:h-16 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="mt-4 text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/packages')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回套餐列表
          </button>
        </div>
      </div>
    );
  }

  if (!pkg) return null;

  const discount = getDiscount(pkg.price, pkg.originalPrice);
  const allImages = [pkg.coverImage, ...(pkg.images || [])].filter(Boolean);
  const highlights = pkg.highlights || [];
  const includedItems = pkg.includedItems || [];
  const schedule = pkg.schedule || [];
  const precautions = pkg.precautions || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/about" className="text-lg sm:text-xl font-bold text-blue-600">
            长白山双溪森林营地
          </Link>

          {/* 桌面端导航 */}
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/activities" className="text-gray-600 hover:text-blue-600">活动</Link>
            <Link to="/packages" className="text-blue-600 font-medium">套餐</Link>
            <Link to="/about" className="text-gray-600 hover:text-blue-600">关于我们</Link>
            <Link
              to="/book"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              立即预约
            </Link>
          </nav>

          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* 移动端下拉菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-2">
              <Link
                to="/activities"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                活动
              </Link>
              <Link
                to="/packages"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-blue-600 font-medium bg-blue-50 rounded-lg"
              >
                套餐
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                关于我们
              </Link>
              <Link
                to="/book"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700"
              >
                立即预约
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 面包屑导航 */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-2 sm:py-3">
          <nav className="flex items-center gap-2 text-xs sm:text-sm">
            <Link to="/packages" className="text-gray-500 hover:text-blue-600">套餐</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 truncate">{pkg.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* 左侧：图片展示 */}
          <div className="space-y-3 sm:space-y-4">
            {/* 主图 */}
            <div className="relative aspect-[4/3] bg-gray-100 rounded-lg sm:rounded-xl overflow-hidden">
              {allImages.length > 0 ? (
                <img
                  src={getFileUrl(allImages[activeImageIndex])}
                  alt={pkg.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-16 sm:w-20 h-16 sm:h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {/* 角标 */}
              {pkg.badge && (
                <div className="absolute top-2 sm:top-4 left-2 sm:left-4 px-3 sm:px-4 py-1 sm:py-2 bg-red-500 text-white text-sm font-medium rounded-full">
                  {pkg.badge}
                </div>
              )}
            </div>

            {/* 缩略图列表 */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`flex-shrink-0 w-16 sm:w-20 h-16 sm:h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      activeImageIndex === index ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={getFileUrl(image)}
                      alt={`${pkg.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：套餐信息 */}
          <div>
            {/* 标题和副标题 */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{pkg.name}</h1>
              {pkg.subtitle && (
                <p className="text-sm sm:text-lg text-gray-500">{pkg.subtitle}</p>
              )}
            </div>

            {/* 价格区域 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                <span className="text-2xl sm:text-4xl font-bold text-blue-600">{formatAmount(pkg.price)}</span>
                <span className="text-gray-500 text-sm sm:text-base">/人</span>
                {pkg.originalPrice && parseFloat(pkg.originalPrice) > parseFloat(pkg.price) && (
                  <>
                    <span className="text-sm sm:text-lg text-gray-400 line-through">
                      {formatAmount(pkg.originalPrice)}
                    </span>
                    {discount && (
                      <span className="px-2 py-0.5 sm:py-1 bg-red-500 text-white text-xs sm:text-sm font-bold rounded">
                        省{discount}%
                      </span>
                    )}
                  </>
                )}
              </div>
              {/* 标签 */}
              <div className="flex flex-wrap gap-3 mt-3 sm:mt-4">
                {pkg.duration && (
                  <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                    <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    时长 {pkg.duration} 分钟
                  </span>
                )}
                {pkg.minPeople && (
                  <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                    <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {pkg.minPeople} 人起订
                  </span>
                )}
                {pkg.maxPeople && (
                  <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                    <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    最多 {pkg.maxPeople} 人
                  </span>
                )}
              </div>
            </div>

            {/* 套餐亮点 */}
            {highlights.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">套餐亮点</h3>
                <div className="flex flex-wrap gap-2">
                  {highlights.map((item, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100 text-blue-700 text-xs sm:text-sm rounded-full"
                    >
                      <svg className="w-3 sm:w-4 h-3 sm:h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 预约按钮 */}
            <Link
              to="/book"
              className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white text-base sm:text-lg font-semibold rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors"
            >
              立即预约
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* 详情内容 */}
        <div className="mt-6 sm:mt-12 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* 套餐介绍 */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">
            {/* 详细介绍 */}
            {(pkg.description || pkg.longDescription) && (
              <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">套餐介绍</h3>
                <div className="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-line">
                  {pkg.longDescription || pkg.description}
                </div>
              </div>
            )}

            {/* 套餐包含 */}
            {includedItems.length > 0 && (
              <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">套餐包含</h3>
                <ul className="space-y-2 sm:space-y-3">
                  {includedItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 sm:gap-3">
                      <span className="flex-shrink-0 w-5 sm:w-6 h-5 sm:h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm sm:text-base text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 行程安排 */}
            {schedule.length > 0 && (
              <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">行程安排</h3>
                <div className="space-y-3 sm:space-y-4">
                  {schedule.map((item, index) => (
                    <div key={index} className="flex gap-3 sm:gap-4">
                      <div className="flex-shrink-0 w-6 sm:w-8 h-6 sm:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 pt-0.5 sm:pt-1">
                        <p className="text-sm sm:text-base text-gray-700">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 侧边栏 */}
          <div className="space-y-4 sm:space-y-6">
            {/* 注意事项 */}
            {precautions.length > 0 && (
              <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <svg className="w-4 sm:w-5 h-4 sm:h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  注意事项
                </h3>
                <ul className="space-y-2">
                  {precautions.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                      <span className="flex-shrink-0 w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 sm:mt-2"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 联系预约 */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg sm:rounded-xl p-4 sm:p-6 text-white">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">需要帮助？</h3>
              <p className="text-blue-100 text-xs sm:text-sm mb-3 sm:mb-4">
                如有任何问题，欢迎联系我们的客服人员，我们将为您提供最优质的服务。
              </p>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>131-9620-1942</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>郑长岭</span>
                </div>
              </div>
              <Link
                to="/book"
                className="mt-3 sm:mt-4 block w-full text-center px-4 py-2 sm:py-3 bg-white text-blue-600 text-sm sm:text-base font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                在线预约
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-gray-400 py-6 sm:py-8 mt-8 sm:mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs sm:text-sm">
            &copy; 2024 长白山双溪森林营地. All rights reserved.
          </p>
          <div className="mt-3 sm:mt-4 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <Link to="/about" className="hover:text-white">关于我们</Link>
            <Link to="/activities" className="hover:text-white">活动介绍</Link>
            <Link to="/packages" className="hover:text-white">精选套餐</Link>
            <Link to="/book" className="hover:text-white">在线预约</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicPackageDetail;
