import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api, { getFileUrl } from '../../utils/api';

const ActivityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 获取活动详情
  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/public/activities/${id}`);

        if (!response.data.success) {
          throw new Error(response.data.error?.message || '获取活动详情失败');
        }

        setActivity(response.data.data);
      } catch (err) {
        setError(err.message || '网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [id]);

  // 季节标签颜色
  const getSeasonStyle = (season) => {
    const styles = {
      winter: 'bg-blue-100 text-blue-700',
      summer: 'bg-green-100 text-green-700',
      all: 'bg-purple-100 text-purple-700',
    };
    return styles[season] || styles.all;
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
          <button onClick={() => navigate('/activities')} className="text-blue-600 hover:underline">
            返回活动列表
          </button>
        </div>
      </div>
    );
  }

  if (!activity) return null;

  // 所有图片（封面 + 其他图片），转换为完整URL
  const allImages = [
    activity.coverImage,
    ...(activity.images || []),
  ].filter(Boolean).map(img => getFileUrl(img));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 p-1 hover:bg-gray-100 rounded">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold truncate">{activity.name}</h1>
        </div>
      </div>

      {/* 图片轮播 */}
      <div className="relative">
        <div className="aspect-video bg-gray-100">
          {allImages.length > 0 ? (
            <img
              src={allImages[currentImageIndex]}
              alt={activity.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
              <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* 图片指示器 */}
        {allImages.length > 1 && (
          <>
            {/* 左右箭头 */}
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* 点指示器 */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
              {allImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* 季节标签 */}
        <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-medium ${getSeasonStyle(activity.season)}`}>
          {activity.seasonText}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {/* 基本信息 */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{activity.name}</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">{activity.description}</p>

          {/* 信息标签 */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              时长: {activity.durationText}
            </div>
            {activity.capacity && (
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                容量: {activity.capacity}人/场
              </div>
            )}
          </div>

          {/* 价格 */}
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-blue-600">¥{activity.price}</span>
            <span className="text-gray-400 ml-1">/{activity.unit}</span>
          </div>
        </div>

        {/* 亮点 */}
        {activity.highlights && activity.highlights.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center">
              <span className="text-lg mr-2">✨</span>项目亮点
            </h3>
            <div className="space-y-2">
              {activity.highlights.map((item, index) => (
                <div key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 详细介绍 */}
        {activity.longDescription && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center">
              <span className="text-lg mr-2">📝</span>详细介绍
            </h3>
            <div className="text-gray-600 whitespace-pre-wrap">
              {activity.longDescription}
            </div>
          </div>
        )}

        {/* 注意事项 */}
        {activity.precautions && activity.precautions.length > 0 && (
          <div className="bg-amber-50 rounded-xl p-4">
            <h3 className="font-bold text-amber-800 mb-3 flex items-center">
              <span className="text-lg mr-2">⚠️</span>注意事项
            </h3>
            <ul className="space-y-2">
              {activity.precautions.map((item, index) => (
                <li key={index} className="flex items-start text-sm text-amber-700">
                  <span className="mr-2">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 联系方式 */}
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-gray-500 text-sm mb-2">咨询或预约请联系</p>
          <p className="text-lg font-medium text-blue-600">131-9620-1942（郑长岭）</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
          <Link
            to="/activities"
            className="flex-1 py-2.5 sm:py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all text-center text-sm sm:text-base"
          >
            返回列表
          </Link>
          <Link
            to="/packages"
            className="flex-1 py-2.5 sm:py-3 rounded-xl font-medium bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 transition-all text-center text-sm sm:text-base"
          >
            精选套餐
          </Link>
          <Link
            to="/book"
            className="flex-1 py-2.5 sm:py-3 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all text-center text-sm sm:text-base"
          >
            立即预约
          </Link>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-gray-400 py-6 sm:py-8 mt-6">
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

export default ActivityDetail;
