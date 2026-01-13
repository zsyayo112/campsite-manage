import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { getFileUrl } from '../../utils/api';

const PublicPackageList = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 获取公开套餐列表
  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/public/packages-v2');
      if (response.data.success) {
        setPackages(response.data.data || []);
      }
    } catch (err) {
      console.error('获取套餐列表失败:', err);
      setError('获取套餐列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

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
        <div className="text-center">
          <svg className="w-16 h-16 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="mt-4 text-gray-600">{error}</p>
          <button
            onClick={fetchPackages}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

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

      {/* 页面标题 */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-10 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">精选套餐</h1>
          <p className="text-blue-100 text-sm sm:text-lg max-w-2xl mx-auto">
            我们精心设计了多种套餐，满足不同需求。无论是亲子游玩还是团队建设，总有一款适合您。
          </p>
        </div>
      </div>

      {/* 套餐列表 */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-12">
        {packages.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <svg className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="mt-4 text-gray-500">暂无可用套餐</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {packages.map((pkg) => {
              const discount = getDiscount(pkg.price, pkg.originalPrice);
              const highlights = pkg.highlights || [];

              return (
                <Link
                  key={pkg.id}
                  to={`/packages/${pkg.id}`}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group"
                >
                  {/* 封面图 */}
                  <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                    {pkg.coverImage ? (
                      <img
                        src={getFileUrl(pkg.coverImage)}
                        alt={pkg.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* 角标 */}
                    {pkg.badge && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-full">
                        {pkg.badge}
                      </div>
                    )}
                    {/* 折扣标签 */}
                    {discount && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">
                        省{discount}%
                      </div>
                    )}
                  </div>

                  {/* 套餐信息 */}
                  <div className="p-5">
                    <div className="mb-3">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {pkg.name}
                      </h3>
                      {pkg.subtitle && (
                        <p className="text-sm text-gray-500 mt-1">{pkg.subtitle}</p>
                      )}
                    </div>

                    {pkg.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">{pkg.description}</p>
                    )}

                    {/* 亮点标签 */}
                    {highlights.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {highlights.slice(0, 3).map((item, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full"
                          >
                            {item}
                          </span>
                        ))}
                        {highlights.length > 3 && (
                          <span className="px-2 py-1 text-gray-400 text-xs">
                            +{highlights.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 底部信息 */}
                    <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-blue-600">{formatAmount(pkg.price)}</span>
                          <span className="text-sm text-gray-400">/人</span>
                        </div>
                        {pkg.originalPrice && parseFloat(pkg.originalPrice) > parseFloat(pkg.price) && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatAmount(pkg.originalPrice)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {pkg.duration && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {pkg.duration}分钟
                          </span>
                        )}
                        {pkg.maxPeople && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {pkg.maxPeople}人
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-10 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">准备好开始您的冒险了吗？</h2>
          <p className="text-blue-100 text-sm sm:text-base mb-6 sm:mb-8">
            选择适合您的套餐，开启一段难忘的长白山之旅
          </p>
          <Link
            to="/book"
            className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 text-base sm:text-lg font-semibold rounded-full hover:bg-blue-50 transition-colors shadow-lg"
          >
            立即预约
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-gray-400 py-6 sm:py-8">
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

export default PublicPackageList;
