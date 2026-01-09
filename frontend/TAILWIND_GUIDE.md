# Tailwind CSS 配置指南

## 📦 已完成的配置

### 1. Tailwind 配置文件
✅ [tailwind.config.js](tailwind.config.js) - 已配置自定义主题

### 2. PostCSS 配置
✅ [postcss.config.js](postcss.config.js) - 已配置 Tailwind 和 Autoprefixer

### 3. 全局样式
✅ [src/index.css](src/index.css) - 已添加 Tailwind 指令和自定义组件样式

---

## 🎨 颜色主题

### 主色调 - 蓝色系 (primary)
```jsx
// 使用示例
<button className="bg-primary-500 hover:bg-primary-600 text-white">
  主按钮
</button>
```

**色阶**:
- `primary-50` - 最浅 (#eff6ff)
- `primary-500` - 主色 (#3b82f6) ⭐
- `primary-600` - 深色 (#2563eb)
- `primary-900` - 最深 (#1e3a8a)

### 成功 - 绿色系 (success)
```jsx
<span className="badge-success">已完成</span>
```

### 警告 - 黄色系 (warning)
```jsx
<span className="badge-warning">待确认</span>
```

### 错误 - 红色系 (error)
```jsx
<span className="badge-error">已取消</span>
```

### 中性 - 灰色系 (gray)
```jsx
<div className="bg-gray-50 text-gray-900">
  内容
</div>
```

---

## 🧩 预设组件样式

### 按钮 (Buttons)

```jsx
// 主按钮
<button className="btn-primary">主按钮</button>

// 次要按钮
<button className="btn-secondary">次要按钮</button>

// 成功按钮
<button className="btn-success">保存</button>

// 警告按钮
<button className="btn-warning">警告</button>

// 错误按钮
<button className="btn-error">删除</button>

// 轮廓按钮
<button className="btn-outline">轮廓按钮</button>

// 尺寸变体
<button className="btn-primary btn-sm">小按钮</button>
<button className="btn-primary">默认</button>
<button className="btn-primary btn-lg">大按钮</button>

// 禁用状态
<button className="btn-primary" disabled>禁用</button>
```

### 卡片 (Cards)

```jsx
// 基础卡片
<div className="card">
  <h3>卡片标题</h3>
  <p>卡片内容</p>
</div>

// 悬停效果卡片
<div className="card-hover">
  <h3>悬停卡片</h3>
  <p>鼠标悬停时有阴影效果</p>
</div>
```

### 表单 (Forms)

```jsx
// 输入框
<div>
  <label className="label">姓名</label>
  <input type="text" className="input" placeholder="请输入姓名" />
</div>

// 错误状态输入框
<div>
  <label className="label">手机号</label>
  <input type="tel" className="input-error" />
  <p className="error-message">手机号格式不正确</p>
</div>
```

### 徽章 (Badges)

```jsx
<span className="badge-primary">主要</span>
<span className="badge-success">成功</span>
<span className="badge-warning">警告</span>
<span className="badge-error">错误</span>
<span className="badge-gray">默认</span>
```

### 表格 (Tables)

```jsx
<table className="table">
  <thead className="table-header">
    <tr>
      <th className="table-cell">姓名</th>
      <th className="table-cell">手机</th>
      <th className="table-cell">状态</th>
    </tr>
  </thead>
  <tbody>
    <tr className="table-row">
      <td className="table-cell">张三</td>
      <td className="table-cell">13800138000</td>
      <td className="table-cell">
        <span className="badge-success">已确认</span>
      </td>
    </tr>
  </tbody>
</table>
```

### 加载动画 (Loading)

```jsx
<div className="spinner"></div>
```

### 布局容器

```jsx
// 页面容器
<div className="container-custom">
  {/* 内容 */}
</div>

// 页面标题
<div className="page-header">
  <h1 className="page-title">客户管理</h1>
</div>

// 内容区块
<div className="section">
  <h2 className="section-title">客户列表</h2>
  {/* 内容 */}
</div>
```

---

## 🎭 自定义动画

### 淡入动画
```jsx
<div className="animate-fade-in">
  淡入内容
</div>
```

### 上滑动画
```jsx
<div className="animate-slide-up">
  上滑内容
</div>
```

### 下滑动画
```jsx
<div className="animate-slide-down">
  下滑内容
</div>
```

---

## 📐 扩展配置

### 间距
- `128`: 32rem
- `144`: 36rem

### 圆角
- `4xl`: 2rem

### 阴影
```jsx
<div className="shadow-soft">柔和阴影</div>
<div className="shadow-card">卡片阴影</div>
```

---

## 💡 使用示例

### 完整的表单示例

```jsx
function CustomerForm() {
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-6">添加客户</h2>

      <form className="space-y-4">
        <div>
          <label className="label">客户姓名</label>
          <input
            type="text"
            className="input"
            placeholder="请输入姓名"
          />
        </div>

        <div>
          <label className="label">手机号</label>
          <input
            type="tel"
            className="input"
            placeholder="请输入手机号"
          />
        </div>

        <div>
          <label className="label">来源</label>
          <select className="input">
            <option>小红书</option>
            <option>微信</option>
            <option>其他</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1">
            保存
          </button>
          <button type="button" className="btn-secondary flex-1">
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 完整的列表页面示例

```jsx
function CustomerList() {
  return (
    <div className="container-custom py-8">
      <div className="page-header">
        <h1 className="page-title">客户管理</h1>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="section-title mb-0">客户列表</h2>
          <button className="btn-primary">
            添加客户
          </button>
        </div>

        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-cell">姓名</th>
              <th className="table-cell">手机</th>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 🎯 响应式设计

Tailwind 使用移动优先的断点系统：

```jsx
// 响应式示例
<div className="
  w-full           /* 移动端：全宽 */
  sm:w-1/2         /* 小屏：半宽 */
  md:w-1/3         /* 中屏：1/3 */
  lg:w-1/4         /* 大屏：1/4 */
">
  响应式内容
</div>
```

**断点**:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## 🛠️ 工具类

### 隐藏滚动条
```jsx
<div className="scrollbar-hide overflow-y-auto">
  内容
</div>
```

### 文本平衡
```jsx
<p className="text-balance">
  长段落文本
</p>
```

---

## 📚 参考资源

- **Tailwind 官方文档**: https://tailwindcss.com/docs
- **颜色工具**: https://tailwindcss.com/docs/customizing-colors
- **设计灵感**: https://tailwindui.com/

---

## 🔥 最佳实践

1. **优先使用预设样式类** (btn-primary, card, input)
2. **保持一致的间距** (使用 Tailwind 的间距系统)
3. **响应式优先** (从移动端开始设计)
4. **语义化类名** (使用 @apply 创建语义化组件)
5. **避免内联样式** (除非必要)

---

**创建日期**: 2026-01-09
**最后更新**: 2026-01-09
