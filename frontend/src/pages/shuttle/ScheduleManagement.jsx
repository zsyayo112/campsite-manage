import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getDailyStats,
  getSchedules,
  getScheduleStops,
  createSchedule,
  updateScheduleStatus,
  deleteSchedule,
  getVehicles,
  getDrivers,
} from '../../api/shuttle';
import { useToast } from '../../components/common/Toast';
import Modal from '../../components/common/Modal';

const ScheduleManagement = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();

  // 状态
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedules, setSchedules] = useState([]);
  const [dailyStats, setDailyStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [scheduleDetail, setScheduleDetail] = useState(null);

  // 创建表单
  const [formData, setFormData] = useState({
    batchName: '',
    vehicleId: '',
    driverId: '',
    departureTime: '',
    notes: '',
    stops: [],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesRes, statsRes, vehiclesRes, driversRes] = await Promise.all([
        getSchedules({ date: selectedDate }),
        getDailyStats(selectedDate),
        getVehicles({ status: 'available' }),
        getDrivers({ status: 'on_duty' }),
      ]);

      setSchedules(schedulesRes.data.data.items || []);
      setDailyStats(statsRes.data.data);
      setVehicles(vehiclesRes.data.data || []);
      setDrivers(driversRes.data.data || []);
    } catch (error) {
      console.error('获取数据失败:', error);
      showToast('获取数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showToast]);

  const fetchScheduleDetail = useCallback(async (scheduleId) => {
    try {
      const response = await getScheduleStops(scheduleId);
      setScheduleDetail(response.data.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('获取调度详情失败:', error);
      showToast('获取调度详情失败', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (id) {
      fetchScheduleDetail(id);
    }
  }, [id, fetchScheduleDetail]);

  const handleCreateSchedule = async () => {
    if (!formData.batchName || !formData.vehicleId || !formData.driverId || !formData.departureTime) {
      showToast('请填写完整的调度信息', 'error');
      return;
    }

    if (formData.stops.length === 0) {
      showToast('请至少添加一个停靠站点', 'error');
      return;
    }

    try {
      await createSchedule({
        date: selectedDate,
        batchName: formData.batchName,
        vehicleId: parseInt(formData.vehicleId),
        driverId: parseInt(formData.driverId),
        departureTime: `${selectedDate}T${formData.departureTime}:00`,
        notes: formData.notes,
        stops: formData.stops.map((stop, index) => ({
          accommodationPlaceId: stop.accommodationPlaceId,
          stopOrder: index + 1,
          passengerCount: stop.passengerCount,
        })),
      });

      showToast('调度创建成功', 'success');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('创建调度失败:', error);
      showToast(error.response?.data?.error?.message || '创建调度失败', 'error');
    }
  };

  const handleUpdateStatus = async (scheduleId, status) => {
    try {
      await updateScheduleStatus(scheduleId, { status });
      showToast('状态更新成功', 'success');
      fetchData();
      if (showDetailModal) {
        fetchScheduleDetail(scheduleId);
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      showToast(error.response?.data?.error?.message || '更新状态失败', 'error');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('确定要删除该调度吗？')) return;

    try {
      await deleteSchedule(scheduleId);
      showToast('调度删除成功', 'success');
      setShowDetailModal(false);
      fetchData();
    } catch (error) {
      console.error('删除调度失败:', error);
      showToast(error.response?.data?.error?.message || '删除调度失败', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      batchName: '',
      vehicleId: '',
      driverId: '',
      departureTime: '',
      notes: '',
      stops: [],
    });
  };

  const addStop = (accommodation) => {
    const existingStop = formData.stops.find(
      (s) => s.accommodationPlaceId === accommodation.accommodationPlace.id
    );

    if (existingStop) {
      showToast('该站点已添加', 'warning');
      return;
    }

    setFormData({
      ...formData,
      stops: [
        ...formData.stops,
        {
          accommodationPlaceId: accommodation.accommodationPlace.id,
          accommodationName: accommodation.accommodationPlace.name,
          passengerCount: accommodation.totalPeople,
          maxPeople: accommodation.totalPeople,
        },
      ],
    });
  };

  const removeStop = (index) => {
    const newStops = [...formData.stops];
    newStops.splice(index, 1);
    setFormData({ ...formData, stops: newStops });
  };

  const updateStopPassengers = (index, count) => {
    const newStops = [...formData.stops];
    newStops[index].passengerCount = Math.min(Math.max(1, count), newStops[index].maxPeople);
    setFormData({ ...formData, stops: newStops });
  };

  const moveStop = (index, direction) => {
    const newStops = [...formData.stops];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newStops.length) return;

    [newStops[index], newStops[newIndex]] = [newStops[newIndex], newStops[index]];
    setFormData({ ...formData, stops: newStops });
  };

  const getTotalPassengers = () => {
    return formData.stops.reduce((sum, stop) => sum + stop.passengerCount, 0);
  };

  const getSelectedVehicle = () => {
    return vehicles.find((v) => v.id === parseInt(formData.vehicleId));
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
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">车辆调度管理</h1>
          <p className="text-gray-500 mt-1">创建和管理接送调度</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => navigate('/shuttle/stats')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            查看统计
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            创建调度
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 调度列表 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedDate} 调度列表
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    共 {schedules.length} 个批次
                  </span>
                </h2>
              </div>

              {schedules.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-6 hover:bg-gray-50 cursor-pointer"
                      onClick={() => fetchScheduleDetail(schedule.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-gray-900">{schedule.batchName}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${statusColors[schedule.status]}`}>
                              {statusLabels[schedule.status]}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <p>车辆: {schedule.vehicle.plateNumber}</p>
                            <p>司机: {schedule.driver.name}</p>
                            <p>出发: {new Date(schedule.departureTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
                            <p>乘客: {schedule.shuttleStops.reduce((sum, s) => sum + s.passengerCount, 0)} 人</p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {schedule.shuttleStops.map((stop, index) => (
                              <span key={stop.id} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                {index + 1}. {stop.accommodationPlace.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {schedule.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(schedule.id, 'in_progress');
                              }}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              开始
                            </button>
                          )}
                          {schedule.status === 'in_progress' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(schedule.id, 'completed');
                              }}
                              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              完成
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  该日期暂无调度安排
                </div>
              )}
            </div>
          </div>

          {/* 侧边统计 */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">当日统计</h3>
              {dailyStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">总人数</span>
                    <span className="font-semibold">{dailyStats.totalPeople}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">已安排</span>
                    <span className="font-semibold text-green-600">{dailyStats.assignedPeople}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">待安排</span>
                    <span className="font-semibold text-orange-600">{dailyStats.unassignedPeople}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${dailyStats.totalPeople > 0 ? (dailyStats.assignedPeople / dailyStats.totalPeople) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      完成率: {dailyStats.totalPeople > 0 ? Math.round((dailyStats.assignedPeople / dailyStats.totalPeople) * 100) : 0}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">暂无数据</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">可用资源</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">可用车辆</span>
                  <span className="font-semibold">{vehicles.length} 辆</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">在岗司机</span>
                  <span className="font-semibold">{drivers.length} 人</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/shuttle/vehicles')}
                className="w-full mt-4 px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                管理车辆和司机
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建调度弹窗 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="创建接送调度"
        size="xl"
      >
        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">批次名称</label>
              <input
                type="text"
                value={formData.batchName}
                onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
                placeholder="如：第一批次早班"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出发时间</label>
              <input
                type="time"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择车辆</label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择车辆</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plateNumber} - {vehicle.vehicleType} ({vehicle.seats}座)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择司机</label>
              <select
                value={formData.driverId}
                onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择司机</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} ({driver.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 容量提示 */}
          {formData.vehicleId && (
            <div className={`p-3 rounded-lg ${
              getTotalPassengers() > (getSelectedVehicle()?.seats || 0)
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              <p className="text-sm">
                已选乘客: <strong>{getTotalPassengers()}</strong> 人 /
                车辆容量: <strong>{getSelectedVehicle()?.seats || 0}</strong> 座
                {getTotalPassengers() > (getSelectedVehicle()?.seats || 0) && (
                  <span className="ml-2 text-red-600">⚠ 超出车辆容量</span>
                )}
              </p>
            </div>
          )}

          {/* 可选站点 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">可选停靠站点</label>
            <div className="border rounded-lg max-h-40 overflow-y-auto">
              {dailyStats?.accommodationStats?.length > 0 ? (
                <div className="divide-y">
                  {dailyStats.accommodationStats.map((item) => (
                    <div
                      key={item.accommodationPlace.id}
                      className="px-4 py-3 flex justify-between items-center hover:bg-gray-50"
                    >
                      <div>
                        <span className="font-medium">{item.accommodationPlace.name}</span>
                        <span className="text-gray-500 text-sm ml-2">({item.totalPeople}人)</span>
                      </div>
                      <button
                        onClick={() => addStop(item)}
                        disabled={formData.stops.some((s) => s.accommodationPlaceId === item.accommodationPlace.id)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        添加
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-center text-gray-500 text-sm">该日期暂无需接送的客人</p>
              )}
            </div>
          </div>

          {/* 已选站点 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              已选站点 (拖拽排序)
              {formData.stops.length > 0 && (
                <span className="ml-2 text-gray-400 font-normal">共 {formData.stops.length} 站</span>
              )}
            </label>
            <div className="border rounded-lg min-h-[100px]">
              {formData.stops.length > 0 ? (
                <div className="divide-y">
                  {formData.stops.map((stop, index) => (
                    <div key={stop.accommodationPlaceId} className="px-4 py-3 flex items-center space-x-4">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => moveStop(index, -1)}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveStop(index, 1)}
                          disabled={index === formData.stops.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <span className="font-medium">{stop.accommodationName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateStopPassengers(index, stop.passengerCount - 1)}
                          className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="w-12 text-center">{stop.passengerCount}人</span>
                        <button
                          onClick={() => updateStopPassengers(index, stop.passengerCount + 1)}
                          className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeStop(index)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-8 text-center text-gray-500 text-sm">请从上方添加停靠站点</p>
              )}
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="可选"
            />
          </div>

          {/* 按钮 */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleCreateSchedule}
              disabled={getTotalPassengers() > (getSelectedVehicle()?.seats || 0)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建调度
            </button>
          </div>
        </div>
      </Modal>

      {/* 调度详情弹窗 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setScheduleDetail(null);
        }}
        title="调度详情 / 接送单"
        size="lg"
      >
        {scheduleDetail && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{scheduleDetail.schedule.batchName}</h3>
                  <p className="text-gray-500">
                    {new Date(scheduleDetail.schedule.date).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${statusColors[scheduleDetail.schedule.status]}`}>
                  {statusLabels[scheduleDetail.schedule.status]}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">车辆:</span>
                  <span className="ml-2 font-medium">
                    {scheduleDetail.schedule.vehicle.plateNumber} ({scheduleDetail.schedule.vehicle.vehicleType})
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">司机:</span>
                  <span className="ml-2 font-medium">
                    {scheduleDetail.schedule.driver.name} ({scheduleDetail.schedule.driver.phone})
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">出发时间:</span>
                  <span className="ml-2 font-medium">
                    {new Date(scheduleDetail.schedule.departureTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {scheduleDetail.schedule.returnTime && (
                  <div>
                    <span className="text-gray-500">返回时间:</span>
                    <span className="ml-2 font-medium">
                      {new Date(scheduleDetail.schedule.returnTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
              {scheduleDetail.schedule.notes && (
                <div className="mt-3 text-sm">
                  <span className="text-gray-500">备注:</span>
                  <span className="ml-2">{scheduleDetail.schedule.notes}</span>
                </div>
              )}
            </div>

            {/* 站点和客人名单 */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">接送路线</h4>
              <div className="space-y-4">
                {scheduleDetail.stops.map((stop, index) => (
                  <div key={stop.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full font-medium">
                          {index + 1}
                        </span>
                        <span className="font-medium">{stop.accommodationPlace.name}</span>
                      </div>
                      <span className="text-blue-700">{stop.passengerCount} 人</span>
                    </div>
                    {stop.customers && stop.customers.length > 0 && (
                      <div className="p-4">
                        <table className="w-full text-sm">
                          <thead className="text-gray-500">
                            <tr>
                              <th className="text-left pb-2">客人</th>
                              <th className="text-left pb-2">电话</th>
                              <th className="text-left pb-2">人数</th>
                              <th className="text-left pb-2">房号</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {stop.customers.map((customer) => (
                              <tr key={customer.orderId}>
                                <td className="py-2 font-medium">{customer.customer.name}</td>
                                <td className="py-2">{customer.customer.phone}</td>
                                <td className="py-2">{customer.peopleCount}人</td>
                                <td className="py-2">{customer.roomNumber || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between pt-4 border-t">
              <div>
                {scheduleDetail.schedule.status === 'pending' && (
                  <button
                    onClick={() => handleDeleteSchedule(scheduleDetail.schedule.id)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    删除调度
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  打印接送单
                </button>
                {scheduleDetail.schedule.status === 'pending' && (
                  <button
                    onClick={() => handleUpdateStatus(scheduleDetail.schedule.id, 'in_progress')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    开始接送
                  </button>
                )}
                {scheduleDetail.schedule.status === 'in_progress' && (
                  <button
                    onClick={() => handleUpdateStatus(scheduleDetail.schedule.id, 'completed')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    完成接送
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleManagement;
