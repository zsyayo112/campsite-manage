import { useState, useEffect, useCallback } from 'react';
import { getDailySchedules, createSchedule, updateSchedule, deleteSchedule, getCoaches } from '../../api/schedules';
import { useToast } from '../../components/common/Toast';
import Modal from '../../components/common/Modal';

// 时间轴配置
const START_HOUR = 8;
const END_HOUR = 18;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const CELL_WIDTH = 120; // 每小时的宽度

// 项目颜色映射
const PROJECT_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
  { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
  { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800' },
  { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800' },
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800' },
  { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-800' },
];

const ScheduleTimeline = () => {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timelineData, setTimelineData] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // view, create, edit
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);

  // 表单数据
  const [formData, setFormData] = useState({
    projectId: '',
    startTime: '',
    endTime: '',
    coachId: '',
    participantCount: 1,
    notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const schedulesRes = await getDailySchedules(selectedDate);
      const data = schedulesRes.data.data;

      setTimelineData(data.timeline || []);
      // 使用 dailySchedules 返回的 coaches 数据
      setCoaches(Array.isArray(data.coaches) ? data.coaches : []);
      setSummary(data.summary);

      // 尝试获取更多教练数据
      try {
        const coachesRes = await getCoaches({ status: 'on_duty' });
        if (coachesRes.data.data && Array.isArray(coachesRes.data.data)) {
          setCoaches(coachesRes.data.data);
        }
      } catch {
        // 如果获取教练失败，使用 dailySchedules 返回的数据
      }
    } catch (error) {
      console.error('获取排期数据失败:', error);
      showToast('获取排期数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 计算活动块的位置和宽度
  const getBlockStyle = (schedule) => {
    const startTime = new Date(schedule.startTime);
    const endTime = new Date(schedule.endTime);

    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;

    const left = (startHour - START_HOUR) * CELL_WIDTH;
    const width = (endHour - startHour) * CELL_WIDTH - 4; // 留4px间隙

    return {
      left: `${left}px`,
      width: `${Math.max(width, 60)}px`, // 最小宽度60px
    };
  };

  // 获取项目颜色
  const getProjectColor = (projectId) => {
    const index = projectId % PROJECT_COLORS.length;
    return PROJECT_COLORS[index];
  };

  // 格式化时间
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 点击活动块查看详情
  const handleBlockClick = (schedule, project) => {
    setSelectedSchedule(schedule);
    setSelectedProject(project);
    setModalMode('view');
    setShowModal(true);
  };

  // 点击空白处创建排期
  const handleEmptyClick = (project, hour) => {
    setSelectedProject(project);
    setSelectedHour(hour);
    setModalMode('create');

    const startTime = `${selectedDate}T${hour.toString().padStart(2, '0')}:00:00`;
    const endHour = Math.min(hour + Math.ceil(project.duration / 60), END_HOUR);
    const endTime = `${selectedDate}T${endHour.toString().padStart(2, '0')}:00:00`;

    setFormData({
      projectId: project.id,
      startTime,
      endTime,
      coachId: '',
      participantCount: 1,
      notes: '',
    });
    setShowModal(true);
  };

  // 编辑排期
  const handleEdit = () => {
    if (!selectedSchedule) return;

    setFormData({
      projectId: selectedProject.id,
      startTime: selectedSchedule.startTime,
      endTime: selectedSchedule.endTime,
      coachId: selectedSchedule.coach?.id || '',
      participantCount: selectedSchedule.participantCount,
      notes: selectedSchedule.notes || '',
    });
    setModalMode('edit');
  };

  // 保存排期
  const handleSave = async () => {
    if (!formData.participantCount || formData.participantCount < 1) {
      showToast('请填写有效的参与人数', 'error');
      return;
    }

    try {
      if (modalMode === 'create') {
        await createSchedule({
          date: selectedDate,
          projectId: formData.projectId,
          startTime: formData.startTime,
          endTime: formData.endTime,
          coachId: formData.coachId ? parseInt(formData.coachId) : null,
          participantCount: parseInt(formData.participantCount),
          notes: formData.notes,
        });
        showToast('排期创建成功', 'success');
      } else if (modalMode === 'edit') {
        await updateSchedule(selectedSchedule.id, {
          startTime: formData.startTime,
          endTime: formData.endTime,
          coachId: formData.coachId ? parseInt(formData.coachId) : null,
          participantCount: parseInt(formData.participantCount),
          notes: formData.notes,
        });
        showToast('排期更新成功', 'success');
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('保存排期失败:', error);
      const message = error.response?.data?.error?.message || '保存排期失败';
      showToast(message, 'error');
    }
  };

  // 删除排期
  const handleDelete = async () => {
    if (!selectedSchedule) return;
    if (!window.confirm('确定要删除该排期吗？')) return;

    try {
      await deleteSchedule(selectedSchedule.id);
      showToast('排期删除成功', 'success');
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('删除排期失败:', error);
      showToast(error.response?.data?.error?.message || '删除排期失败', 'error');
    }
  };

  // 关闭弹窗
  const closeModal = () => {
    setShowModal(false);
    setSelectedSchedule(null);
    setSelectedProject(null);
    setSelectedHour(null);
    setFormData({
      projectId: '',
      startTime: '',
      endTime: '',
      coachId: '',
      participantCount: 1,
      notes: '',
    });
  };

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
  };

  const statusLabels = {
    scheduled: '已排期',
    in_progress: '进行中',
    completed: '已完成',
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">行程排期</h1>
          <p className="text-gray-500 mt-1">管理每日活动时间安排</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            刷新
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <p className="text-sm text-gray-500">排期数量</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalSchedules}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <p className="text-sm text-gray-500">总参与人数</p>
            <p className="text-2xl font-bold text-blue-600">{summary.totalParticipants}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <p className="text-sm text-gray-500">涉及项目</p>
            <p className="text-2xl font-bold text-green-600">{summary.projectsWithSchedules}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <p className="text-sm text-gray-500">已分配教练</p>
            <p className="text-2xl font-bold text-purple-600">{summary.coachesAssigned}</p>
          </div>
        </div>
      )}

      {/* 时间轴 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 时间轴头部 */}
            <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
              <div className="w-40 min-w-[160px] px-4 py-3 font-medium text-gray-700 border-r border-gray-200">
                项目
              </div>
              <div className="flex">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="text-center py-3 font-medium text-gray-600 border-r border-gray-100"
                    style={{ width: `${CELL_WIDTH}px`, minWidth: `${CELL_WIDTH}px` }}
                  >
                    {hour}:00
                  </div>
                ))}
              </div>
            </div>

            {/* 时间轴内容 */}
            <div className="divide-y divide-gray-100">
              {timelineData.length > 0 ? (
                timelineData.map((row) => {
                  const color = getProjectColor(row.project.id);

                  return (
                    <div key={row.project.id} className="flex hover:bg-gray-50">
                      {/* 项目名称 */}
                      <div className="w-40 min-w-[160px] px-4 py-4 border-r border-gray-200 bg-gray-50">
                        <div className="font-medium text-gray-900">{row.project.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {row.project.duration}分钟
                          {row.project.capacity && ` / 容量${row.project.capacity}`}
                        </div>
                        {row.totalParticipants > 0 && (
                          <div className="text-xs text-blue-600 mt-1">
                            今日: {row.totalParticipants}人
                          </div>
                        )}
                      </div>

                      {/* 时间格子 */}
                      <div className="relative flex-1" style={{ minHeight: '80px' }}>
                        {/* 网格背景 */}
                        <div className="absolute inset-0 flex">
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              className="border-r border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors"
                              style={{ width: `${CELL_WIDTH}px`, minWidth: `${CELL_WIDTH}px` }}
                              onClick={() => handleEmptyClick(row.project, hour)}
                            />
                          ))}
                        </div>

                        {/* 活动块 */}
                        <div className="relative h-full py-2">
                          {row.schedules.map((schedule) => {
                            const blockStyle = getBlockStyle(schedule);

                            return (
                              <div
                                key={schedule.id}
                                className={`absolute top-2 bottom-2 rounded-lg border-2 cursor-pointer transition-shadow hover:shadow-md ${color.bg} ${color.border} ${color.text}`}
                                style={blockStyle}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBlockClick(schedule, row.project);
                                }}
                              >
                                <div className="p-2 h-full flex flex-col justify-between overflow-hidden">
                                  <div className="text-xs font-medium truncate">
                                    {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs font-bold">{schedule.participantCount}人</span>
                                    {schedule.coach && (
                                      <span className="text-xs truncate ml-1">{schedule.coach.name}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-gray-500">
                  暂无项目数据
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 className="font-medium text-gray-700 mb-3">操作说明</h3>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>点击活动块查看详情</span>
          <span>|</span>
          <span>点击空白格子创建排期</span>
          <span>|</span>
          <span className="text-red-600">红色边框表示冲突</span>
        </div>
      </div>

      {/* 排期详情/编辑弹窗 */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={
          modalMode === 'view' ? '排期详情' :
          modalMode === 'create' ? '创建排期' : '编辑排期'
        }
      >
        {modalMode === 'view' && selectedSchedule ? (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-lg">{selectedProject?.name}</h3>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">时间:</span>
                  <span className="ml-2">{formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}</span>
                </div>
                <div>
                  <span className="text-gray-500">参与人数:</span>
                  <span className="ml-2 font-semibold">{selectedSchedule.participantCount}人</span>
                </div>
                <div>
                  <span className="text-gray-500">教练:</span>
                  <span className="ml-2">{selectedSchedule.coach?.name || '未分配'}</span>
                </div>
                <div>
                  <span className="text-gray-500">状态:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${statusColors[selectedSchedule.status]}`}>
                    {statusLabels[selectedSchedule.status]}
                  </span>
                </div>
              </div>
              {selectedSchedule.notes && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-gray-500 text-sm">备注:</span>
                  <p className="mt-1 text-sm">{selectedSchedule.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                删除
              </button>
              <div className="space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  关闭
                </button>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  编辑
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                项目: <span className="font-semibold">{selectedProject?.name}</span>
                {selectedProject?.capacity && (
                  <span className="ml-2">(容量: {selectedProject.capacity}人)</span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                <input
                  type="datetime-local"
                  value={formData.startTime.slice(0, 16)}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value + ':00' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                <input
                  type="datetime-local"
                  value={formData.endTime.slice(0, 16)}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value + ':00' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">参与人数</label>
                <input
                  type="number"
                  value={formData.participantCount}
                  onChange={(e) => setFormData({ ...formData, participantCount: e.target.value })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分配教练</label>
                <select
                  value={formData.coachId}
                  onChange={(e) => setFormData({ ...formData, coachId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">不分配教练</option>
                  {Array.isArray(coaches) && coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {modalMode === 'create' ? '创建' : '保存'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleTimeline;
