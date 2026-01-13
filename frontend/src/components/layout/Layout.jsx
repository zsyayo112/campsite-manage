import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

// 侧边栏菜单配置
const menuItems = [
  {
    path: '/dashboard',
    name: '仪表盘',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    path: '/customers',
    name: '客户管理',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
  },
  {
    path: '/orders',
    name: '订单管理',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    path: '/bookings',
    name: '预约管理',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    path: '/shuttle',
    name: '接送调度',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    children: [
      { path: '/shuttle/stats', name: '每日统计' },
      { path: '/shuttle/schedule', name: '调度管理' },
      { path: '/shuttle/vehicles', name: '车辆司机' },
    ],
  },
  {
    path: '/schedules',
    name: '行程排期',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    path: '/projects',
    name: '项目管理',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    path: '/packages',
    name: '套餐管理',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    path: '/users',
    name: '用户管理',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    roles: ['admin'], // 仅管理员可见
  },
];

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActivePath = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 侧边栏 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-800 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 bg-slate-900">
          {sidebarOpen && (
            <span className="text-xl font-bold text-white">营地管理系统</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="mt-4 px-2">
          {menuItems
            .filter((item) => !item.roles || item.roles.includes(user?.role))
            .map((item) => (
            <div key={item.path}>
              {item.children ? (
                <>
                  <button
                    onClick={() => setExpandedMenu(expandedMenu === item.path ? null : item.path)}
                    className={`w-full flex items-center justify-between px-4 py-3 mb-1 rounded-lg transition-colors ${
                      isActivePath(item.path)
                        ? 'bg-slate-700 text-white'
                        : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center">
                      {item.icon}
                      {sidebarOpen && <span className="ml-3">{item.name}</span>}
                    </div>
                    {sidebarOpen && (
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          expandedMenu === item.path || isActivePath(item.path) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                  {sidebarOpen && (expandedMenu === item.path || isActivePath(item.path)) && (
                    <div className="ml-4 mb-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                            location.pathname === child.path || location.pathname.startsWith(child.path + '/')
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 bg-current rounded-full mr-3 opacity-50"></span>
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 mb-1 rounded-lg transition-colors ${
                    isActivePath(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {sidebarOpen && <span className="ml-3">{item.name}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* 主内容区域 */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* 顶部栏 */}
        <header className="sticky top-0 z-40 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            {/* 左侧 - 面包屑或标题 */}
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-800">
                {menuItems.find((item) => isActivePath(item.path))?.name || '仪表盘'}
              </h1>
            </div>

            {/* 右侧 - 用户信息 */}
            <div className="flex items-center space-x-4">
              {/* 用户信息 */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full">
                  <span className="text-sm font-medium text-white">
                    {user?.realName?.[0] || user?.username?.[0] || 'U'}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-800">
                    {user?.realName || user?.username || '用户'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.role === 'admin'
                      ? '管理员'
                      : user?.role === 'operator'
                      ? '操作员'
                      : user?.role || '未知角色'}
                  </p>
                </div>
              </div>

              {/* 登出按钮 */}
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden md:inline">退出</span>
              </button>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
