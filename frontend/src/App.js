import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/PrivateRoute';
import { ToastProvider } from './components/common/Toast';

// Loading 组件
const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-500">加载中...</p>
    </div>
  </div>
);

// 使用 React.lazy 进行代码分割
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CustomerList = lazy(() => import('./pages/customers/CustomerList'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const OrderList = lazy(() => import('./pages/orders/OrderList'));
const CreateOrder = lazy(() => import('./pages/orders/CreateOrder'));
const OrderDetail = lazy(() => import('./pages/orders/OrderDetail'));
const DailyStats = lazy(() => import('./pages/shuttle/DailyStats'));
const ScheduleManagement = lazy(() => import('./pages/shuttle/ScheduleManagement'));
const VehicleManagement = lazy(() => import('./pages/shuttle/VehicleManagement'));
const ScheduleTimeline = lazy(() => import('./pages/schedules/ScheduleTimeline'));
const ProjectList = lazy(() => import('./pages/projects/ProjectList'));
const PackageList = lazy(() => import('./pages/packages/PackageList'));
const UserList = lazy(() => import('./pages/users/UserList'));
const BookingList = lazy(() => import('./pages/booking/BookingList'));
const PublicBookingForm = lazy(() => import('./pages/booking/PublicBookingForm'));
const BookingSuccess = lazy(() => import('./pages/booking/BookingSuccess'));

// 带 Layout 的私有路由组件
const PrivateLayoutRoute = ({ children }) => (
  <PrivateRoute>
    <Layout>
      <Suspense fallback={<PageLoading />}>{children}</Suspense>
    </Layout>
  </PrivateRoute>
);

function App() {
  return (
    <ToastProvider>
      <Router>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            {/* 公开路由 - 客户预约表单（无需登录）*/}
            <Route path="/book" element={<PublicBookingForm />} />
            <Route path="/booking/success" element={<BookingSuccess />} />
            <Route path="/login" element={<Login />} />

            {/* 需要认证的路由 */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Navigate to="/dashboard" replace />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateLayoutRoute>
                  <Dashboard />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <PrivateLayoutRoute>
                  <CustomerList />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/customers/:id"
              element={
                <PrivateLayoutRoute>
                  <CustomerDetail />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <PrivateLayoutRoute>
                  <OrderList />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/orders/create"
              element={
                <PrivateLayoutRoute>
                  <CreateOrder />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <PrivateLayoutRoute>
                  <OrderDetail />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/shuttle/stats"
              element={
                <PrivateLayoutRoute>
                  <DailyStats />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/shuttle/schedule"
              element={
                <PrivateLayoutRoute>
                  <ScheduleManagement />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/shuttle/schedule/:id"
              element={
                <PrivateLayoutRoute>
                  <ScheduleManagement />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/shuttle/vehicles"
              element={
                <PrivateLayoutRoute>
                  <VehicleManagement />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/shuttle"
              element={
                <PrivateRoute>
                  <Navigate to="/shuttle/stats" replace />
                </PrivateRoute>
              }
            />
            <Route
              path="/schedules"
              element={
                <PrivateLayoutRoute>
                  <ScheduleTimeline />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <PrivateLayoutRoute>
                  <ProjectList />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/packages"
              element={
                <PrivateLayoutRoute>
                  <PackageList />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/users"
              element={
                <PrivateLayoutRoute>
                  <UserList />
                </PrivateLayoutRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <PrivateLayoutRoute>
                  <BookingList />
                </PrivateLayoutRoute>
              }
            />

            {/* 404 处理 */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-800">404</h1>
                    <p className="text-gray-500 mt-2">页面不存在</p>
                    <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">
                      返回首页
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </ToastProvider>
  );
}

export default App;
