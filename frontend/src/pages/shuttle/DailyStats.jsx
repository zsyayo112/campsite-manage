import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDailyStats, exportDailyStats } from '../../api/shuttle';
import { useToast } from '../../components/common/Toast';

const DailyStats = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDailyStats(selectedDate);
      setStats(response.data.data);
    } catch (error) {
      console.error('获取每日统计失败:', error);
      toast.error('获取每日统计失败');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // 计算车辆需求（假设大巴45座，中巴20座，商务车7座）
  const calculateVehicleNeeds = (peopleCount) => {
    if (peopleCount <= 0) return { buses: 0, minibuses: 0, vans: 0 };

    let remaining = peopleCount;
    const buses = Math.floor(remaining / 45);
    remaining = remaining % 45;
    const minibuses = Math.floor(remaining / 20);
    remaining = remaining % 20;
    const vans = Math.ceil(remaining / 7);

    return { buses, minibuses, vans };
  };

  const vehicleNeeds = stats ? calculateVehicleNeeds(stats.unassignedPeople) : null;

  // 导出Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await exportDailyStats(selectedDate);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `接送统计_${selectedDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  const statusLabels = {
    pending: '待出发',
    in_progress: '进行中',
    completed: '已完成',
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和日期选择 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">每日接送统计</h1>
          <p className="text-gray-500 mt-1">查看指定日期的接送人数和调度情况</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleExport}
            disabled={exporting || !stats}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {exporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                导出中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                导出Excel
              </>
            )}
          </button>
          <button
            onClick={() => navigate('/shuttle/schedule')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            创建调度
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : stats ? (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">总人数</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalPeople}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{stats.totalOrders} 个订单</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">已安排</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.assignedPeople}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">{stats.existingSchedules?.length || 0} 个调度批次</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">待安排</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{stats.unassignedPeople}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">需要创建调度</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">车辆需求</p>
                  <div className="mt-1">
                    {vehicleNeeds && stats.unassignedPeople > 0 ? (
                      <div className="text-sm space-y-1">
                        {vehicleNeeds.buses > 0 && <p className="font-medium">大巴 x {vehicleNeeds.buses}</p>}
                        {vehicleNeeds.minibuses > 0 && <p className="font-medium">中巴 x {vehicleNeeds.minibuses}</p>}
                        {vehicleNeeds.vans > 0 && <p className="font-medium">商务车 x {vehicleNeeds.vans}</p>}
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-gray-400">-</p>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">预估最低需求</p>
            </div>
          </div>

          {/* 住宿分布表格 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">住宿分布</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">住宿地点</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">人数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">客人列表</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.accommodationStats?.length > 0 ? (
                    stats.accommodationStats.map((item) => (
                      <tr key={item.accommodationPlace.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.accommodationPlace.name}</div>
                          {item.accommodationPlace.distance && (
                            <div className="text-sm text-gray-500">
                              距离: {Number(item.accommodationPlace.distance).toFixed(1)} km
                              {item.accommodationPlace.duration && ` / ${item.accommodationPlace.duration} 分钟`}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.accommodationPlace.type === 'self'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.accommodationPlace.type === 'self' ? '自营' : '外部'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-900">{item.orderCount}</td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-semibold text-blue-600">{item.totalPeople}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {item.customers.map((customer) => (
                              <div key={customer.orderId} className="text-sm">
                                <span className="font-medium">{customer.customer.name}</span>
                                <span className="text-gray-500 ml-2">{customer.customer.phone}</span>
                                <span className="text-blue-600 ml-2">{customer.peopleCount}人</span>
                                {customer.roomNumber && (
                                  <span className="text-gray-400 ml-2">房号: {customer.roomNumber}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        该日期暂无已确认的订单
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 已有调度 */}
          {stats.existingSchedules?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">已安排调度</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {stats.existingSchedules.map((schedule) => (
                  <div key={schedule.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">{schedule.batchName}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${statusColors[schedule.status]}`}>
                            {statusLabels[schedule.status]}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <p>车辆: {schedule.vehicle.plateNumber} ({schedule.vehicle.vehicleType}, {schedule.vehicle.seats}座)</p>
                          <p>司机: {schedule.driver.name} ({schedule.driver.phone})</p>
                          <p>出发时间: {new Date(schedule.departureTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/shuttle/schedule/${schedule.id}`)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        查看详情
                      </button>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-500 mb-2">停靠站点:</p>
                      <div className="flex flex-wrap gap-2">
                        {schedule.shuttleStops.map((stop, index) => (
                          <span key={stop.id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            {index + 1}. {stop.accommodationPlace.name} ({stop.passengerCount}人)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          请选择日期查看统计数据
        </div>
      )}
    </div>
  );
};

export default DailyStats;
