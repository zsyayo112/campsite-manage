import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../common/Modal';

// 客户来源选项
const sourceOptions = [
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'wechat', label: '微信' },
  { value: 'douyin', label: '抖音' },
  { value: 'friend', label: '朋友推荐' },
  { value: 'other', label: '其他' },
];

// 标签选项
const tagOptions = [
  { value: 'vip', label: 'VIP', color: 'bg-purple-100 text-purple-700' },
  { value: 'family', label: '家庭游', color: 'bg-blue-100 text-blue-700' },
  { value: 'team', label: '团队', color: 'bg-green-100 text-green-700' },
  { value: 'repeat', label: '回头客', color: 'bg-orange-100 text-orange-700' },
  { value: 'photography', label: '摄影爱好者', color: 'bg-pink-100 text-pink-700' },
];

const CustomerForm = ({ isOpen, onClose, onSubmit, customer = null, loading = false }) => {
  const [selectedTags, setSelectedTags] = useState([]);
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      wechat: '',
      source: 'xiaohongshu',
      notes: '',
    },
  });

  // 编辑时填充数据
  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name || '',
        phone: customer.phone || '',
        wechat: customer.wechat || '',
        source: customer.source || 'xiaohongshu',
        notes: customer.notes || '',
      });
      // 解析标签
      try {
        const tags = customer.tags ? JSON.parse(customer.tags) : [];
        setSelectedTags(tags);
      } catch {
        setSelectedTags([]);
      }
    } else {
      reset({
        name: '',
        phone: '',
        wechat: '',
        source: 'xiaohongshu',
        notes: '',
      });
      setSelectedTags([]);
    }
  }, [customer, reset]);

  // 标签切换
  const toggleTag = (tagValue) => {
    setSelectedTags((prev) =>
      prev.includes(tagValue)
        ? prev.filter((t) => t !== tagValue)
        : [...prev, tagValue]
    );
  };

  // 表单提交
  const handleFormSubmit = (data) => {
    onSubmit({
      ...data,
      tags: selectedTags,
    });
  };

  // 关闭时重置
  const handleClose = () => {
    reset();
    setSelectedTags([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? '编辑客户' : '新建客户'}
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('name', { required: '请输入姓名' })}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="请输入客户姓名"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              手机号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              {...register('phone', {
                required: '请输入手机号',
                pattern: {
                  value: /^1[3-9]\d{9}$/,
                  message: '请输入正确的手机号',
                },
              })}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="请输入手机号"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* 微信号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              微信号
            </label>
            <input
              type="text"
              {...register('wechat')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入微信号"
            />
          </div>

          {/* 来源 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              客户来源 <span className="text-red-500">*</span>
            </label>
            <select
              {...register('source', { required: '请选择客户来源' })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 标签 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            客户标签
          </label>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleTag(tag.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedTags.includes(tag.value)
                    ? `${tag.color} ring-2 ring-offset-1 ring-blue-400`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            备注
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
            placeholder="请输入备注信息..."
          />
        </div>

        {/* 按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
          >
            {loading && (
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isEdit ? '保存修改' : '创建客户'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerForm;
