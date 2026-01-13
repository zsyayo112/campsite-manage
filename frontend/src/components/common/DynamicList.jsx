import { useState } from 'react';

/**
 * 动态列表编辑组件
 * @param {Object} props
 * @param {string[]} props.value - 当前列表项
 * @param {function} props.onChange - 变更回调
 * @param {string} props.label - 标签
 * @param {string} props.placeholder - 输入框占位符
 * @param {number} props.maxItems - 最大项目数
 * @param {boolean} props.disabled - 是否禁用
 * @param {string} props.className - 额外样式
 */
const DynamicList = ({
  value = [],
  onChange,
  label,
  placeholder = '输入内容',
  maxItems = 20,
  disabled = false,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || value.length >= maxItems) return;
    onChange([...value, trimmed]);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index) => {
    const newList = [...value];
    newList.splice(index, 1);
    onChange(newList);
  };

  const handleUpdate = (index, newValue) => {
    const newList = [...value];
    newList[index] = newValue;
    onChange(newList);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newList = [...value];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    onChange(newList);
  };

  const handleMoveDown = (index) => {
    if (index === value.length - 1) return;
    const newList = [...value];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    onChange(newList);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          <span className="ml-2 text-gray-400">({value.length}/{maxItems})</span>
        </label>
      )}

      {/* 列表项 */}
      <div className="space-y-2 mb-2">
        {value.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-6 text-center text-xs text-gray-400">{index + 1}.</span>
            <input
              type="text"
              value={item}
              onChange={(e) => handleUpdate(index, e.target.value)}
              disabled={disabled}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            {!disabled && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="上移"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === value.length - 1}
                  className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="下移"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-1.5 text-red-400 hover:text-red-600"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 添加新项 */}
      {!disabled && value.length < maxItems && (
        <div className="flex items-center gap-2">
          <span className="w-6"></span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            添加
          </button>
        </div>
      )}
    </div>
  );
};

export default DynamicList;
