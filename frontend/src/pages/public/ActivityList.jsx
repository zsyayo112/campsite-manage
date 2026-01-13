import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { getFileUrl } from '../../utils/api';

const ActivityList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentSeason = searchParams.get('season') || 'all';

  // 获取活动列表
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const params = currentSeason !== 'all' ? { season: currentSeason } : {};
        const response = await api.get('/public/activities', { params });

        if (!response.data.success) {
          throw new Error(response.data.error?.message || '获取活动列表失败');
        }

        setActivities(response.data.data || []);
      } catch (err) {
        setError(err.message || '网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [currentSeason]);

  // 切换季节
  const handleSeasonChange = (season) => {
    setSearchParams({ season });
  };

  // 跳转到详情页
  const goToDetail = (id) => {
    navigate(`/activities/${id}`);
  };

  // 季节标签颜色
  const getSeasonStyle = (season) => {
    const styles = {
      winter: 'bg-blue-100 text-blue-700',
      summer: 'bg-green-100 text-green-700',
      all: 'bg-purple-100 text-purple-700',
    };
    return styles[season] || styles.all;
  };

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
            <Link to="/activities" className="text-blue-600 font-medium">活动</Link>
            <Link to="/packages" className="text-gray-600 hover:text-blue-600">套餐</Link>
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
                className="block px-3 py-2 text-blue-600 font-medium bg-blue-50 rounded-lg"
              >
                活动
              </Link>
              <Link
                to="/packages"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
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
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">营地活动</h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl mx-auto">
            探索精彩户外体验项目，感受大自然的魅力
          </p>
        </div>
      </div>

      {/* 季节筛选 */}
      <div className="sticky top-14 sm:top-16 bg-white shadow-sm z-10">
        <div className="max-w-6xl mx-auto px-4 py-2 sm:py-3">
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {[
              { value: 'all', label: '全部' },
              { value: 'winter', label: '冬季项目' },
              { value: 'summer', label: '夏季项目' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => handleSeasonChange(item.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  currentSeason === item.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        {/* 加载中 */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-500">加载中...</p>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && activities.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-500">暂无活动项目</p>
          </div>
        )}

        {/* 活动列表 */}
        {!loading && !error && activities.length > 0 && (
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => goToDetail(activity.id)}
                className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                {/* 封面图 */}
                <div className="aspect-video bg-gray-100 relative">
                  {activity.coverImage ? (
                    <img
                      src={getFileUrl(activity.coverImage)}
                      alt={activity.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                      <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* 季节标签 */}
                  <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${getSeasonStyle(activity.season)}`}>
                    {activity.seasonText}
                  </span>
                </div>

                {/* 内容 */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">
                    {activity.name}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                    {activity.description}
                  </p>

                  {/* 信息标签 */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {activity.durationText}
                    </span>
                    {activity.capacity && (
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {activity.capacity}人/场
                      </span>
                    )}
                  </div>

                  {/* 价格和按钮 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xl font-bold text-blue-600">¥{activity.price}</span>
                      <span className="text-sm text-gray-400">/{activity.unit}</span>
                    </div>
                    <span className="text-sm text-blue-600 flex items-center">
                      查看详情
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 底部CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-10 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">想体验更多精彩活动？</h2>
          <p className="text-blue-100 text-sm sm:text-base mb-6 sm:mb-8">
            查看我们精心设计的套餐，享受更多优惠
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link
              to="/packages"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 text-base sm:text-lg font-semibold rounded-full hover:bg-blue-50 transition-colors shadow-lg"
            >
              查看套餐
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              to="/book"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-transparent text-white text-base sm:text-lg font-semibold rounded-full border-2 border-white/50 hover:bg-white/10 transition-colors"
            >
              立即预约
            </Link>
          </div>
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

export default ActivityList;
