import { useState, useEffect } from 'react';
import { shuttleAPI } from '../utils/api';

const Shuttle = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [stats, setStats] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, schedulesRes] = await Promise.all([
        shuttleAPI.getDailyStats(selectedDate),
        shuttleAPI.getSchedules({ date: selectedDate }),
      ]);
      setStats(statsRes.data.data);
      setSchedules(schedulesRes.data.data?.list || []);
    } catch (error) {
      console.error('获取接送数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
    };
    const labels = {
      pending: '待出发',
      in_progress: '进行中',
      completed: '已完成',
    };
    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          styles[status] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和日期选择 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">接送调度</h1>
          <p className="text-gray-500 mt-1">管理每日接送安排</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新建调度
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">总批次</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {stats.scheduleCount || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">总乘客</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {stats.totalPassengers || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">已完成</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {stats.completedCount || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">待出发</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {stats.pendingCount || 0}
            </p>
          </div>
        </div>
      )}

      {/* 调度列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">调度列表</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            当日暂无接送安排
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {schedule.batchName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {schedule.vehicle?.plateNumber} - {schedule.driver?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-800">
                      {new Date(schedule.departureTime).toLocaleTimeString(
                        'zh-CN',
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </p>
                    {getStatusBadge(schedule.status)}
                  </div>
                </div>
                {schedule.shuttleStops && schedule.shuttleStops.length > 0 && (
                  <div className="mt-3 pl-16">
                    <p className="text-xs text-gray-500 mb-1">停靠点：</p>
                    <div className="flex flex-wrap gap-2">
                      {schedule.shuttleStops.map((stop, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                        >
                          {stop.accommodationPlace?.name} ({stop.passengerCount}人)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shuttle;
