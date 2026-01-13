import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const AboutCamp = () => {
  const navigate = useNavigate();
  const [campInfo, setCampInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 获取营地信息
  useEffect(() => {
    const fetchCampInfo = async () => {
      try {
        const response = await api.get('/public/about');

        if (!response.data.success) {
          throw new Error(response.data.error?.message || '获取营地信息失败');
        }

        setCampInfo(response.data.data);
      } catch (err) {
        setError(err.message || '网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchCampInfo();
  }, []);

  // 特色图标映射
  const getFeatureIcon = (iconName) => {
    const icons = {
      mountain: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      snowflake: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v18m0-18l4 4m-4-4L8 7m4 14l4-4m-4 4l-4-4m-5-5h18M3 12l4 4m-4-4l4-4m14 4l-4 4m4-4l-4-4" />
        </svg>
      ),
      shield: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      users: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    };
    return icons[iconName] || icons.mountain;
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
          <p className="text-gray-700 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="text-blue-600 hover:underline">
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!campInfo) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero 区域 */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-3">{campInfo.name}</h1>
          <p className="text-blue-100 text-lg">{campInfo.slogan}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 营地简介 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">🏕️</span>关于我们
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {campInfo.description}
          </p>
        </div>

        {/* 营地特色 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-2xl mr-2">✨</span>营地特色
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {campInfo.features.map((feature, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                  {getFeatureIcon(feature.icon)}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 服务流程 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-2xl mr-2">📋</span>服务流程
          </h2>
          <div className="relative">
            {/* 连接线 */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-blue-100 hidden md:block" />

            <div className="space-y-4">
              {campInfo.serviceFlow.map((step, index) => (
                <div key={index} className="flex items-start">
                  {/* 步骤数字 */}
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg z-10">
                    {step.step}
                  </div>
                  {/* 内容 */}
                  <div className="ml-4 flex-1 bg-gray-50 rounded-xl p-4">
                    <h3 className="font-bold text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 位置信息 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">📍</span>营地位置
          </h2>
          <div className="bg-gray-100 rounded-xl p-4">
            <p className="text-gray-700 font-medium">{campInfo.location.address}</p>
            <p className="text-sm text-gray-500 mt-2">
              位于长白山北坡核心区域，交通便利，风景优美
            </p>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="text-2xl mr-2">📞</span>联系我们
          </h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-lg">{campInfo.contact.phone}</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>联系人：{campInfo.contact.name}</span>
            </div>
            {campInfo.contact.wechat && (
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18z" />
                  <path d="M23.95 14.571c0-3.529-3.381-6.4-7.551-6.4-4.17 0-7.551 2.871-7.551 6.4 0 3.529 3.381 6.4 7.551 6.4.842 0 1.65-.12 2.409-.347a.737.737 0 01.611.082l1.617.946a.28.28 0 00.142.046c.137 0 .247-.113.247-.253a.405.405 0 00-.041-.18l-.331-1.257a.502.502 0 01.181-.567c1.558-1.143 2.716-2.844 2.716-4.87zm-9.834-1.257c-.546 0-.989-.449-.989-1.002 0-.553.443-1.002.989-1.002.546 0 .989.449.989 1.002 0 .553-.443 1.002-.989 1.002zm4.566 0c-.546 0-.989-.449-.989-1.002 0-.553.443-1.002.989-1.002.546 0 .989.449.989 1.002 0 .553-.443 1.002-.989 1.002z" />
                </svg>
                <span>微信：{campInfo.contact.wechat}</span>
              </div>
            )}
          </div>
        </div>

        {/* 快捷导航 */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/activities')}
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">查看活动</p>
            <p className="text-xs text-gray-500">探索精彩项目</p>
          </button>
          <button
            onClick={() => navigate('/packages')}
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">精选套餐</p>
            <p className="text-xs text-gray-500">超值优惠组合</p>
          </button>
          <button
            onClick={() => navigate('/book')}
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">立即预约</p>
            <p className="text-xs text-gray-500">开启冰雪之旅</p>
          </button>
        </div>

        {/* 查询入口 */}
        <button
          onClick={() => navigate('/my-orders')}
          className="w-full bg-gray-100 rounded-xl p-4 text-center hover:bg-gray-200 transition-all"
        >
          <span className="text-gray-600">已有预约？</span>
          <span className="text-blue-600 ml-2 font-medium">查询我的订单</span>
        </button>
      </div>

      {/* 底部 */}
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} {campInfo.name}</p>
        <p className="mt-1">期待与您相遇</p>
      </div>
    </div>
  );
};

export default AboutCamp;
