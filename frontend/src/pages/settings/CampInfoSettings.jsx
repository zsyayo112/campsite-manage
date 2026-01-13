import { useState, useEffect } from 'react';
import api from '../../utils/api';

const CampInfoSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('basic');

  // 营地基本信息
  const [campInfo, setCampInfo] = useState({
    name: '',
    slogan: '',
    description: '',
    location: {
      address: '',
      coordinates: { lat: '', lng: '' },
    },
    contact: {
      phone: '',
      name: '',
      wechat: '',
    },
    features: [],
    serviceFlow: [],
    gallery: [],
  });

  // 加载配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/site-config/camp/info');
        if (response.data.success) {
          setCampInfo(response.data.data);
        }
      } catch (error) {
        console.error('加载配置失败:', error);
        setMessage({ type: 'error', text: '加载配置失败' });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.put('/site-config/camp/info', campInfo);
      if (response.data.success) {
        setMessage({ type: 'success', text: '保存成功！' });
      } else {
        throw new Error(response.data.error?.message || '保存失败');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  // 更新基本字段
  const handleChange = (field, value) => {
    setCampInfo((prev) => ({ ...prev, [field]: value }));
  };

  // 更新嵌套字段
  const handleNestedChange = (parent, field, value) => {
    setCampInfo((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  // 添加特色
  const addFeature = () => {
    setCampInfo((prev) => ({
      ...prev,
      features: [
        ...prev.features,
        { icon: 'mountain', title: '', description: '' },
      ],
    }));
  };

  // 更新特色
  const updateFeature = (index, field, value) => {
    setCampInfo((prev) => ({
      ...prev,
      features: prev.features.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // 删除特色
  const removeFeature = (index) => {
    setCampInfo((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  // 添加服务流程
  const addServiceStep = () => {
    const nextStep = campInfo.serviceFlow.length + 1;
    setCampInfo((prev) => ({
      ...prev,
      serviceFlow: [
        ...prev.serviceFlow,
        { step: nextStep, title: '', description: '' },
      ],
    }));
  };

  // 更新服务流程
  const updateServiceStep = (index, field, value) => {
    setCampInfo((prev) => ({
      ...prev,
      serviceFlow: prev.serviceFlow.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // 删除服务流程
  const removeServiceStep = (index) => {
    setCampInfo((prev) => ({
      ...prev,
      serviceFlow: prev.serviceFlow
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, step: i + 1 })),
    }));
  };

  // 图标选项
  const iconOptions = [
    { value: 'mountain', label: '山峰' },
    { value: 'snowflake', label: '雪花' },
    { value: 'shield', label: '盾牌' },
    { value: 'users', label: '团队' },
    { value: 'star', label: '星星' },
    { value: 'heart', label: '爱心' },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">营地信息设置</h1>
          <p className="text-gray-500 mt-1">配置公开展示的营地介绍信息</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              保存中...
            </>
          ) : (
            '保存设置'
          )}
        </button>
      </div>

      {/* 消息提示 */}
      {message.text && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 标签页 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'basic', label: '基本信息' },
            { id: 'contact', label: '联系方式' },
            { id: 'features', label: '营地特色' },
            { id: 'flow', label: '服务流程' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 基本信息 */}
      {activeTab === 'basic' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              营地名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={campInfo.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：长白山双溪森林营地"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              营地标语
            </label>
            <input
              type="text"
              value={campInfo.slogan}
              onChange={(e) => handleChange('slogan', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：在自然中探索，在冰雪中成长"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              营地介绍
            </label>
            <textarea
              value={campInfo.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="详细介绍营地的特色和服务..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              营地地址
            </label>
            <input
              type="text"
              value={campInfo.location?.address || ''}
              onChange={(e) => handleNestedChange('location', 'address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：吉林省延边朝鲜族自治州安图县二道白河镇"
            />
          </div>
        </div>
      )}

      {/* 联系方式 */}
      {activeTab === 'contact' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              联系电话 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={campInfo.contact?.phone || ''}
              onChange={(e) => handleNestedChange('contact', 'phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：131-9620-1942"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              联系人姓名
            </label>
            <input
              type="text"
              value={campInfo.contact?.name || ''}
              onChange={(e) => handleNestedChange('contact', 'name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：郑长岭"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              微信号
            </label>
            <input
              type="text"
              value={campInfo.contact?.wechat || ''}
              onChange={(e) => handleNestedChange('contact', 'wechat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：shuangxi_camp"
            />
          </div>
        </div>
      )}

      {/* 营地特色 */}
      {activeTab === 'features' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">最多添加 4 个特色</p>
            <button
              onClick={addFeature}
              disabled={campInfo.features.length >= 4}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + 添加特色
            </button>
          </div>

          <div className="space-y-4">
            {campInfo.features.map((feature, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-700">特色 {index + 1}</span>
                  <button
                    onClick={() => removeFeature(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">图标</label>
                    <select
                      value={feature.icon}
                      onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {iconOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">标题</label>
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => updateFeature(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="例如：得天独厚"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">描述</label>
                    <input
                      type="text"
                      value={feature.description}
                      onChange={(e) => updateFeature(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="简短描述"
                    />
                  </div>
                </div>
              </div>
            ))}

            {campInfo.features.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                暂无特色，点击上方按钮添加
              </div>
            )}
          </div>
        </div>
      )}

      {/* 服务流程 */}
      {activeTab === 'flow' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">按顺序添加服务流程步骤</p>
            <button
              onClick={addServiceStep}
              disabled={campInfo.serviceFlow.length >= 8}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + 添加步骤
            </button>
          </div>

          <div className="space-y-3">
            {campInfo.serviceFlow.map((step, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {step.step}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => updateServiceStep(index, 'title', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="步骤标题"
                  />
                  <input
                    type="text"
                    value={step.description}
                    onChange={(e) => updateServiceStep(index, 'description', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="步骤说明"
                  />
                </div>
                <button
                  onClick={() => removeServiceStep(index)}
                  className="flex-shrink-0 text-red-500 hover:text-red-700 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {campInfo.serviceFlow.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                暂无流程步骤，点击上方按钮添加
              </div>
            )}
          </div>
        </div>
      )}

      {/* 预览链接 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <span className="font-medium">提示：</span>
          保存后可访问 <a href="/about" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">/about</a> 查看公开展示效果
        </p>
      </div>
    </div>
  );
};

export default CampInfoSettings;
