import { useState, useEffect } from 'react';
import { scheduleAPI } from '../utils/api';

const Schedules = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [timeline, setTimeline] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, [selectedDate]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await scheduleAPI.getDailySchedules(selectedDate);
      setTimeline(res.data.data?.timeline || []);
      setSummary(res.data.data?.summary || null);
    } catch (error) {
      console.error('获取排期数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-500',
      in_progress: 'bg-yellow-500',
      completed: 'bg-green-500',
      cancelled: 'bg-gray-400',
    };
    return colors[status] || 'bg-gray-400';
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和日期选择 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">行程排期</h1>
          <p className="text-gray-500 mt-1">管理每日项目安排</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新建排期
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">总排期数</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {summary.totalSchedules || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">总参与人数</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {summary.totalParticipants || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">活动项目数</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {summary.projectsWithSchedules || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">安排教练数</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {summary.coachesAssigned || 0}
            </p>
          </div>
        </div>
      )}

      {/* 时间轴视图 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">项目时间轴</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        ) : timeline.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            当日暂无排期安排
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {timeline.map((item) => (
              <div key={item.project.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {item.project.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        时长: {item.project.duration}分钟
                        {item.project.capacity && ` | 容量: ${item.project.capacity}人`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-800">
                      {item.totalParticipants || 0} 人
                    </p>
                    {item.remainingCapacity !== null && (
                      <p className="text-xs text-gray-500">
                        剩余: {item.remainingCapacity}
                      </p>
                    )}
                  </div>
                </div>

                {/* 排期列表 */}
                {item.schedules && item.schedules.length > 0 ? (
                  <div className="ml-13 space-y-2">
                    {item.schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-2 h-2 rounded-full ${getStatusColor(
                              schedule.status
                            )}`}
                          ></div>
                          <div>
                            <p className="text-sm text-gray-800">
                              {formatTime(schedule.startTime)} -{' '}
                              {formatTime(schedule.endTime)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {schedule.participantCount}人
                              {schedule.coach && ` | ${schedule.coach.name}`}
                            </p>
                          </div>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          编辑
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ml-13 text-sm text-gray-400">暂无排期</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedules;
