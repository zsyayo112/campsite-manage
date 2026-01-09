import React from 'react';

/**
 * 样式指南组件 - 展示所有预设样式
 * 用于开发时参考和测试样式
 */
function StyleGuide() {
  return (
    <div className="container-custom py-8">
      <div className="page-header">
        <h1 className="page-title">样式指南</h1>
        <p className="text-gray-600 mt-2">营地管理系统 UI 组件展示</p>
      </div>

      {/* 颜色系统 */}
      <div className="section">
        <h2 className="section-title">颜色系统</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 主色 */}
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">主色 (Primary)</h3>
            <div className="space-y-2">
              <div className="bg-primary-50 p-3 rounded text-xs">50</div>
              <div className="bg-primary-100 p-3 rounded text-xs">100</div>
              <div className="bg-primary-500 p-3 rounded text-xs text-white">500 ⭐</div>
              <div className="bg-primary-600 p-3 rounded text-xs text-white">600</div>
              <div className="bg-primary-900 p-3 rounded text-xs text-white">900</div>
            </div>
          </div>

          {/* 成功 */}
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">成功 (Success)</h3>
            <div className="space-y-2">
              <div className="bg-success-50 p-3 rounded text-xs">50</div>
              <div className="bg-success-100 p-3 rounded text-xs">100</div>
              <div className="bg-success-500 p-3 rounded text-xs text-white">500</div>
              <div className="bg-success-600 p-3 rounded text-xs text-white">600</div>
              <div className="bg-success-900 p-3 rounded text-xs text-white">900</div>
            </div>
          </div>

          {/* 警告 */}
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">警告 (Warning)</h3>
            <div className="space-y-2">
              <div className="bg-warning-50 p-3 rounded text-xs">50</div>
              <div className="bg-warning-100 p-3 rounded text-xs">100</div>
              <div className="bg-warning-500 p-3 rounded text-xs text-white">500</div>
              <div className="bg-warning-600 p-3 rounded text-xs text-white">600</div>
              <div className="bg-warning-900 p-3 rounded text-xs text-white">900</div>
            </div>
          </div>

          {/* 错误 */}
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">错误 (Error)</h3>
            <div className="space-y-2">
              <div className="bg-error-50 p-3 rounded text-xs">50</div>
              <div className="bg-error-100 p-3 rounded text-xs">100</div>
              <div className="bg-error-500 p-3 rounded text-xs text-white">500</div>
              <div className="bg-error-600 p-3 rounded text-xs text-white">600</div>
              <div className="bg-error-900 p-3 rounded text-xs text-white">900</div>
            </div>
          </div>
        </div>
      </div>

      {/* 按钮 */}
      <div className="section">
        <h2 className="section-title">按钮</h2>

        <div className="card space-y-6">
          {/* 按钮类型 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">按钮类型</h3>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary">主按钮</button>
              <button className="btn-secondary">次要按钮</button>
              <button className="btn-success">成功</button>
              <button className="btn-warning">警告</button>
              <button className="btn-error">删除</button>
              <button className="btn-outline">轮廓</button>
            </div>
          </div>

          {/* 按钮尺寸 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">按钮尺寸</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <button className="btn-primary btn-sm">小按钮</button>
              <button className="btn-primary">默认按钮</button>
              <button className="btn-primary btn-lg">大按钮</button>
            </div>
          </div>

          {/* 禁用状态 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">禁用状态</h3>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled>禁用主按钮</button>
              <button className="btn-outline" disabled>禁用轮廓按钮</button>
            </div>
          </div>
        </div>
      </div>

      {/* 表单元素 */}
      <div className="section">
        <h2 className="section-title">表单元素</h2>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 正常输入框 */}
            <div>
              <label className="label">客户姓名</label>
              <input
                type="text"
                className="input"
                placeholder="请输入客户姓名"
              />
            </div>

            {/* 错误状态输入框 */}
            <div>
              <label className="label">手机号</label>
              <input
                type="tel"
                className="input-error"
                placeholder="请输入手机号"
              />
              <p className="error-message">手机号格式不正确</p>
            </div>

            {/* 下拉框 */}
            <div>
              <label className="label">客户来源</label>
              <select className="input">
                <option>请选择</option>
                <option>小红书</option>
                <option>微信</option>
                <option>其他</option>
              </select>
            </div>

            {/* 文本域 */}
            <div>
              <label className="label">备注</label>
              <textarea
                className="input"
                rows="3"
                placeholder="请输入备注信息"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      {/* 徽章 */}
      <div className="section">
        <h2 className="section-title">徽章 (Badges)</h2>

        <div className="card">
          <div className="flex flex-wrap gap-3">
            <span className="badge-primary">主要</span>
            <span className="badge-success">已完成</span>
            <span className="badge-warning">待确认</span>
            <span className="badge-error">已取消</span>
            <span className="badge-gray">草稿</span>
          </div>
        </div>
      </div>

      {/* 卡片 */}
      <div className="section">
        <h2 className="section-title">卡片</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-2">基础卡片</h3>
            <p className="text-sm text-gray-600">这是一个基础卡片示例</p>
          </div>

          <div className="card-hover">
            <h3 className="font-semibold mb-2">悬停卡片</h3>
            <p className="text-sm text-gray-600">鼠标悬停时有阴影效果</p>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-2">统计卡片</h3>
            <div className="text-3xl font-bold text-primary-600 mb-1">128</div>
            <p className="text-sm text-gray-600">总客户数</p>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="section">
        <h2 className="section-title">表格</h2>

        <div className="card">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-cell">客户姓名</th>
                <th className="table-cell">手机号</th>
                <th className="table-cell">来源</th>
                <th className="table-cell">状态</th>
                <th className="table-cell">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row">
                <td className="table-cell">张三</td>
                <td className="table-cell">13800138000</td>
                <td className="table-cell">
                  <span className="badge-primary">小红书</span>
                </td>
                <td className="table-cell">
                  <span className="badge-success">已确认</span>
                </td>
                <td className="table-cell">
                  <button className="btn-primary btn-sm">查看</button>
                </td>
              </tr>
              <tr className="table-row">
                <td className="table-cell">李四</td>
                <td className="table-cell">13900139000</td>
                <td className="table-cell">
                  <span className="badge-primary">微信</span>
                </td>
                <td className="table-cell">
                  <span className="badge-warning">待确认</span>
                </td>
                <td className="table-cell">
                  <button className="btn-primary btn-sm">查看</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 加载动画 */}
      <div className="section">
        <h2 className="section-title">加载动画</h2>

        <div className="card">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="spinner"></div>
              <span className="text-sm text-gray-600">加载中...</span>
            </div>

            <button className="btn-primary flex items-center gap-2">
              <div className="spinner border-white"></div>
              <span>处理中</span>
            </button>
          </div>
        </div>
      </div>

      {/* 动画效果 */}
      <div className="section">
        <h2 className="section-title">动画效果</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card animate-fade-in">
            <h3 className="font-semibold mb-2">淡入动画</h3>
            <p className="text-sm text-gray-600">animate-fade-in</p>
          </div>

          <div className="card animate-slide-up">
            <h3 className="font-semibold mb-2">上滑动画</h3>
            <p className="text-sm text-gray-600">animate-slide-up</p>
          </div>

          <div className="card animate-slide-down">
            <h3 className="font-semibold mb-2">下滑动画</h3>
            <p className="text-sm text-gray-600">animate-slide-down</p>
          </div>
        </div>
      </div>

      {/* 排版 */}
      <div className="section">
        <h2 className="section-title">排版</h2>

        <div className="card space-y-4">
          <h1>这是 H1 标题</h1>
          <h2>这是 H2 标题</h2>
          <h3>这是 H3 标题</h3>
          <h4>这是 H4 标题</h4>
          <p className="text-gray-600">
            这是一段普通文本。长白山营地旅游管理系统是一个现代化的管理平台，
            专为长白山地区的营地旅游企业设计。
          </p>
        </div>
      </div>
    </div>
  );
}

export default StyleGuide;
