import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  getDrivers,
  createDriver,
  updateDriver,
} from '../../api/shuttle';
import { useToast } from '../../components/common/Toast';
import Modal from '../../components/common/Modal';

const VehicleManagement = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // 当前选项卡
  const [activeTab, setActiveTab] = useState('vehicles');

  // 车辆数据
  const [vehicles, setVehicles] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    plateNumber: '',
    vehicleType: '大巴',
    seats: '',
    status: 'available',
    notes: '',
  });

  // 司机数据
  const [drivers, setDrivers] = useState([]);
  const [driverLoading, setDriverLoading] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    status: 'on_duty',
  });

  const fetchVehicles = useCallback(async () => {
    setVehicleLoading(true);
    try {
      const response = await getVehicles();
      setVehicles(response.data.data || []);
    } catch (error) {
      console.error('获取车辆列表失败:', error);
      showToast('获取车辆列表失败', 'error');
    } finally {
      setVehicleLoading(false);
    }
  }, [showToast]);

  const fetchDrivers = useCallback(async () => {
    setDriverLoading(true);
    try {
      const response = await getDrivers();
      setDrivers(response.data.data || []);
    } catch (error) {
      console.error('获取司机列表失败:', error);
      showToast('获取司机列表失败', 'error');
    } finally {
      setDriverLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, [fetchVehicles, fetchDrivers]);

  // 车辆操作
  const handleVehicleSubmit = async () => {
    if (!vehicleForm.plateNumber || !vehicleForm.vehicleType || !vehicleForm.seats) {
      showToast('请填写完整的车辆信息', 'error');
      return;
    }

    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, vehicleForm);
        showToast('车辆更新成功', 'success');
      } else {
        await createVehicle(vehicleForm);
        showToast('车辆创建成功', 'success');
      }
      setShowVehicleModal(false);
      resetVehicleForm();
      fetchVehicles();
    } catch (error) {
      console.error('保存车辆失败:', error);
      showToast(error.response?.data?.error?.message || '保存车辆失败', 'error');
    }
  };

  const openEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      plateNumber: vehicle.plateNumber,
      vehicleType: vehicle.vehicleType,
      seats: vehicle.seats.toString(),
      status: vehicle.status,
      notes: vehicle.notes || '',
    });
    setShowVehicleModal(true);
  };

  const resetVehicleForm = () => {
    setEditingVehicle(null);
    setVehicleForm({
      plateNumber: '',
      vehicleType: '大巴',
      seats: '',
      status: 'available',
      notes: '',
    });
  };

  // 司机操作
  const handleDriverSubmit = async () => {
    if (!driverForm.name || !driverForm.phone) {
      showToast('请填写完整的司机信息', 'error');
      return;
    }

    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, driverForm);
        showToast('司机更新成功', 'success');
      } else {
        await createDriver(driverForm);
        showToast('司机创建成功', 'success');
      }
      setShowDriverModal(false);
      resetDriverForm();
      fetchDrivers();
    } catch (error) {
      console.error('保存司机失败:', error);
      showToast(error.response?.data?.error?.message || '保存司机失败', 'error');
    }
  };

  const openEditDriver = (driver) => {
    setEditingDriver(driver);
    setDriverForm({
      name: driver.name,
      phone: driver.phone,
      status: driver.status,
    });
    setShowDriverModal(true);
  };

  const resetDriverForm = () => {
    setEditingDriver(null);
    setDriverForm({
      name: '',
      phone: '',
      status: 'on_duty',
    });
  };

  const vehicleStatusColors = {
    available: 'bg-green-100 text-green-800',
    maintenance: 'bg-red-100 text-red-800',
    assigned: 'bg-blue-100 text-blue-800',
  };

  const vehicleStatusLabels = {
    available: '可用',
    maintenance: '维护中',
    assigned: '已分配',
  };

  const driverStatusColors = {
    on_duty: 'bg-green-100 text-green-800',
    off_duty: 'bg-gray-100 text-gray-800',
  };

  const driverStatusLabels = {
    on_duty: '在岗',
    off_duty: '离岗',
  };

  const vehicleTypes = ['大巴', '中巴', '商务车'];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">车辆与司机管理</h1>
          <p className="text-gray-500 mt-1">管理接送车辆和司机信息</p>
        </div>
        <button
          onClick={() => navigate('/shuttle/schedule')}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          返回调度管理
        </button>
      </div>

      {/* 选项卡 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'vehicles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            车辆管理
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
              {vehicles.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'drivers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            司机管理
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
              {drivers.length}
            </span>
          </button>
        </nav>
      </div>

      {/* 车辆列表 */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">车辆列表</h2>
            <button
              onClick={() => {
                resetVehicleForm();
                setShowVehicleModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              添加车辆
            </button>
          </div>

          {vehicleLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : vehicles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">车牌号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">座位数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{vehicle.plateNumber}</td>
                      <td className="px-6 py-4 text-gray-600">{vehicle.vehicleType}</td>
                      <td className="px-6 py-4 text-gray-600">{vehicle.seats} 座</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${vehicleStatusColors[vehicle.status]}`}>
                          {vehicleStatusLabels[vehicle.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{vehicle.notes || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEditVehicle(vehicle)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              暂无车辆数据，请添加车辆
            </div>
          )}
        </div>
      )}

      {/* 司机列表 */}
      {activeTab === 'drivers' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">司机列表</h2>
            <button
              onClick={() => {
                resetDriverForm();
                setShowDriverModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              添加司机
            </button>
          </div>

          {driverLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : drivers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">电话</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {drivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{driver.name}</td>
                      <td className="px-6 py-4 text-gray-600">{driver.phone}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${driverStatusColors[driver.status]}`}>
                          {driverStatusLabels[driver.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEditDriver(driver)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              暂无司机数据，请添加司机
            </div>
          )}
        </div>
      )}

      {/* 车辆编辑弹窗 */}
      <Modal
        isOpen={showVehicleModal}
        onClose={() => {
          setShowVehicleModal(false);
          resetVehicleForm();
        }}
        title={editingVehicle ? '编辑车辆' : '添加车辆'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">车牌号 *</label>
            <input
              type="text"
              value={vehicleForm.plateNumber}
              onChange={(e) => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })}
              placeholder="如：吉A12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">车辆类型 *</label>
            <select
              value={vehicleForm.vehicleType}
              onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {vehicleTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">座位数 *</label>
            <input
              type="number"
              value={vehicleForm.seats}
              onChange={(e) => setVehicleForm({ ...vehicleForm, seats: e.target.value })}
              placeholder="如：45"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={vehicleForm.status}
              onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="available">可用</option>
              <option value="maintenance">维护中</option>
              <option value="assigned">已分配</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={vehicleForm.notes}
              onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="可选"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowVehicleModal(false);
                resetVehicleForm();
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleVehicleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingVehicle ? '更新' : '添加'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 司机编辑弹窗 */}
      <Modal
        isOpen={showDriverModal}
        onClose={() => {
          setShowDriverModal(false);
          resetDriverForm();
        }}
        title={editingDriver ? '编辑司机' : '添加司机'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
            <input
              type="text"
              value={driverForm.name}
              onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
              placeholder="司机姓名"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">电话 *</label>
            <input
              type="tel"
              value={driverForm.phone}
              onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
              placeholder="联系电话"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={driverForm.status}
              onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="on_duty">在岗</option>
              <option value="off_duty">离岗</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowDriverModal(false);
                resetDriverForm();
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleDriverSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingDriver ? '更新' : '添加'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VehicleManagement;
