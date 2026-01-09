import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/common/Toast';
import {
  createOrder,
  getAccommodations,
  getProjects,
  getPackages,
  searchCustomers,
} from '../../api/orders';

// 步骤配置
const steps = [
  { id: 1, title: '选择客户', description: '选择或搜索客户' },
  { id: 2, title: '住宿信息', description: '选择住宿地点' },
  { id: 3, title: '选择项目', description: '套餐或自由组合' },
  { id: 4, title: '填写详情', description: '日期和人数' },
  { id: 5, title: '确认订单', description: '核对并提交' },
];

const CreateOrder = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // 当前步骤
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // 基础数据
  const [accommodations, setAccommodations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [packages, setPackages] = useState([]);

  // 客户搜索
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // 订单数据
  const [orderData, setOrderData] = useState({
    customerId: null,
    customer: null,
    accommodationPlaceId: null,
    accommodation: null,
    roomNumber: '',
    packageId: null,
    package: null,
    selectedProjects: [], // [{projectId, quantity, project}]
    visitDate: '',
    peopleCount: 1,
    notes: '',
  });

  // 加载基础数据
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const [accRes, projRes, pkgRes] = await Promise.all([
          getAccommodations(),
          getProjects(),
          getPackages(),
        ]);

        if (accRes.success) {
          setAccommodations(accRes.data.items || accRes.data || []);
        }
        if (projRes.success) {
          setProjects((projRes.data.items || projRes.data || []).filter(p => p.isActive));
        }
        if (pkgRes.success) {
          setPackages((pkgRes.data.items || pkgRes.data || []).filter(p => p.isActive));
        }
      } catch (error) {
        console.error('加载基础数据失败:', error);
        toast.error('加载数据失败，请刷新重试');
      }
    };
    fetchBaseData();
  }, [toast]);

  // 搜索客户
  const handleSearchCustomer = useCallback(async () => {
    if (!customerSearch.trim()) {
      setCustomerResults([]);
      return;
    }
    setSearchingCustomer(true);
    try {
      const res = await searchCustomers(customerSearch);
      if (res.success) {
        setCustomerResults(res.data.items || []);
      }
    } catch (error) {
      console.error('搜索客户失败:', error);
    } finally {
      setSearchingCustomer(false);
    }
  }, [customerSearch]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearchCustomer();
    }, 300);
    return () => clearTimeout(timer);
  }, [handleSearchCustomer]);

  // 选择客户
  const handleSelectCustomer = (customer) => {
    setOrderData(prev => ({
      ...prev,
      customerId: customer.id,
      customer,
    }));
    setCustomerResults([]);
    setCustomerSearch('');
  };

  // 选择住宿
  const handleSelectAccommodation = (acc) => {
    setOrderData(prev => ({
      ...prev,
      accommodationPlaceId: acc.id,
      accommodation: acc,
    }));
  };

  // 选择套餐
  const handleSelectPackage = (pkg) => {
    if (orderData.packageId === pkg.id) {
      // 取消选择
      setOrderData(prev => ({
        ...prev,
        packageId: null,
        package: null,
      }));
    } else {
      setOrderData(prev => ({
        ...prev,
        packageId: pkg.id,
        package: pkg,
        selectedProjects: [], // 选择套餐后清空自由组合
      }));
    }
  };

  // 切换项目选择
  const handleToggleProject = (project) => {
    if (orderData.packageId) {
      // 如果已选套餐，不允许选择项目（作为额外项目处理）
      toast.warning('已选择套餐，项目将包含在套餐中');
      return;
    }

    setOrderData(prev => {
      const exists = prev.selectedProjects.find(p => p.projectId === project.id);
      if (exists) {
        return {
          ...prev,
          selectedProjects: prev.selectedProjects.filter(p => p.projectId !== project.id),
        };
      } else {
        return {
          ...prev,
          selectedProjects: [
            ...prev.selectedProjects,
            { projectId: project.id, quantity: prev.peopleCount, project },
          ],
        };
      }
    });
  };

  // 更新项目数量
  const handleUpdateProjectQuantity = (projectId, quantity) => {
    setOrderData(prev => ({
      ...prev,
      selectedProjects: prev.selectedProjects.map(p =>
        p.projectId === projectId ? { ...p, quantity: Math.max(1, quantity) } : p
      ),
    }));
  };

  // 计算总价
  const calculateTotal = () => {
    let total = 0;

    if (orderData.packageId && orderData.package) {
      total = Number(orderData.package.price) * orderData.peopleCount;
    } else {
      orderData.selectedProjects.forEach(item => {
        total += Number(item.project.price) * item.quantity;
      });
    }

    return total;
  };

  // 验证当前步骤
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return !!orderData.customerId;
      case 2:
        return !!orderData.accommodationPlaceId;
      case 3:
        return !!orderData.packageId || orderData.selectedProjects.length > 0;
      case 4:
        return !!orderData.visitDate && orderData.peopleCount >= 1;
      default:
        return true;
    }
  };

  // 下一步
  const handleNext = () => {
    if (!validateStep(currentStep)) {
      const messages = {
        1: '请选择客户',
        2: '请选择住宿地点',
        3: '请选择套餐或项目',
        4: '请填写到访日期和人数',
      };
      toast.error(messages[currentStep]);
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  // 上一步
  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // 提交订单
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const submitData = {
        customerId: orderData.customerId,
        accommodationPlaceId: orderData.accommodationPlaceId,
        roomNumber: orderData.roomNumber || null,
        visitDate: orderData.visitDate,
        peopleCount: orderData.peopleCount,
        notes: orderData.notes || null,
      };

      if (orderData.packageId) {
        submitData.packageId = orderData.packageId;
      } else {
        submitData.items = orderData.selectedProjects.map(p => ({
          projectId: p.projectId,
          quantity: p.quantity,
        }));
      }

      const res = await createOrder(submitData);
      if (res.success) {
        toast.success('订单创建成功');
        navigate(`/orders/${res.data.id}`);
      }
    } catch (error) {
      console.error('创建订单失败:', error);
      toast.error(error.response?.data?.error?.message || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  // 格式化金额
  const formatAmount = (amount) => {
    return `¥${Number(amount || 0).toLocaleString()}`;
  };

  // 渲染步骤指示器
  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : currentStep === step.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {currentStep > step.id ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <div className="mt-2 text-center">
                <div className={`text-sm font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-400 hidden sm:block">
                  {step.description}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // 步骤1: 选择客户
  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">选择客户</h3>

      {orderData.customer ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{orderData.customer.name}</div>
              <div className="text-sm text-gray-600">{orderData.customer.phone}</div>
              {orderData.customer.wechat && (
                <div className="text-sm text-gray-500">微信: {orderData.customer.wechat}</div>
              )}
            </div>
            <button
              onClick={() => setOrderData(prev => ({ ...prev, customerId: null, customer: null }))}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              更换客户
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="relative">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="搜索客户姓名或手机号..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {searchingCustomer && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>

          {customerResults.length > 0 && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {customerResults.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <div className="font-medium text-gray-900">{customer.name}</div>
                  <div className="text-sm text-gray-500">{customer.phone}</div>
                </button>
              ))}
            </div>
          )}

          {customerSearch && customerResults.length === 0 && !searchingCustomer && (
            <div className="mt-4 text-center py-8 text-gray-500">
              <p>未找到匹配的客户</p>
              <button
                onClick={() => navigate('/customers')}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                去创建新客户
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // 步骤2: 住宿信息
  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">选择住宿地点</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accommodations.map(acc => (
          <button
            key={acc.id}
            onClick={() => handleSelectAccommodation(acc)}
            className={`p-4 border rounded-lg text-left transition-all ${
              orderData.accommodationPlaceId === acc.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-gray-900">{acc.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {acc.type === 'owned' ? '自营' : '外部'} · {acc.distance}km · 约{acc.duration}分钟
                </div>
                {acc.address && (
                  <div className="text-sm text-gray-400 mt-1">{acc.address}</div>
                )}
              </div>
              {orderData.accommodationPlaceId === acc.id && (
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {orderData.accommodationPlaceId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            房间号（选填）
          </label>
          <input
            type="text"
            value={orderData.roomNumber}
            onChange={(e) => setOrderData(prev => ({ ...prev, roomNumber: e.target.value }))}
            placeholder="如: 301"
            className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      )}
    </div>
  );

  // 步骤3: 选择项目
  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">选择套餐或项目</h3>

      {/* 套餐选择 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">推荐套餐</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => handleSelectPackage(pkg)}
              className={`p-4 border rounded-lg text-left transition-all ${
                orderData.packageId === pkg.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">{pkg.name}</div>
                  {pkg.description && (
                    <div className="text-sm text-gray-500 mt-1 line-clamp-2">{pkg.description}</div>
                  )}
                  <div className="text-lg font-bold text-blue-600 mt-2">
                    {formatAmount(pkg.price)}/人
                  </div>
                  {pkg.minPeople && (
                    <div className="text-xs text-gray-400 mt-1">最低 {pkg.minPeople} 人起</div>
                  )}
                </div>
                {orderData.packageId === pkg.id && (
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 或者分割线 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">或者自由组合项目</span>
        </div>
      </div>

      {/* 项目选择 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          单选项目
          {orderData.packageId && (
            <span className="ml-2 text-xs text-orange-500">(已选套餐，项目将包含在套餐中)</span>
          )}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const isSelected = orderData.selectedProjects.some(p => p.projectId === project.id);
            return (
              <button
                key={project.id}
                onClick={() => handleToggleProject(project)}
                disabled={!!orderData.packageId}
                className={`p-4 border rounded-lg text-left transition-all ${
                  isSelected
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-500'
                    : orderData.packageId
                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{project.name}</div>
                    {project.description && (
                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg font-bold text-green-600">
                        {formatAmount(project.price)}/人
                      </span>
                      {project.duration && (
                        <span className="text-xs text-gray-400">{project.duration}分钟</span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 已选项目列表 */}
      {!orderData.packageId && orderData.selectedProjects.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">已选项目</h4>
          <div className="space-y-2">
            {orderData.selectedProjects.map(item => (
              <div key={item.projectId} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                <div>
                  <span className="font-medium">{item.project.name}</span>
                  <span className="text-gray-500 ml-2">{formatAmount(item.project.price)}/人</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateProjectQuantity(item.projectId, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateProjectQuantity(item.projectId, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // 步骤4: 填写详情
  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">填写订单详情</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            到访日期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={orderData.visitDate}
            onChange={(e) => setOrderData(prev => ({ ...prev, visitDate: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            人数 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOrderData(prev => ({ ...prev, peopleCount: Math.max(1, prev.peopleCount - 1) }))}
              className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl"
            >
              -
            </button>
            <input
              type="number"
              value={orderData.peopleCount}
              onChange={(e) => setOrderData(prev => ({ ...prev, peopleCount: Math.max(1, parseInt(e.target.value) || 1) }))}
              min="1"
              className="w-20 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center"
            />
            <button
              onClick={() => setOrderData(prev => ({ ...prev, peopleCount: prev.peopleCount + 1 }))}
              className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl"
            >
              +
            </button>
            <span className="text-gray-500">人</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          备注（选填）
        </label>
        <textarea
          value={orderData.notes}
          onChange={(e) => setOrderData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          placeholder="请输入备注信息..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
        />
      </div>
    </div>
  );

  // 步骤5: 确认订单
  const renderStep5 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">确认订单信息</h3>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        {/* 客户信息 */}
        <div className="flex justify-between py-3 border-b border-gray-200">
          <span className="text-gray-600">客户</span>
          <span className="font-medium text-gray-900">
            {orderData.customer?.name} ({orderData.customer?.phone})
          </span>
        </div>

        {/* 住宿信息 */}
        <div className="flex justify-between py-3 border-b border-gray-200">
          <span className="text-gray-600">住宿地点</span>
          <span className="font-medium text-gray-900">
            {orderData.accommodation?.name}
            {orderData.roomNumber && ` - ${orderData.roomNumber}号房`}
          </span>
        </div>

        {/* 到访日期 */}
        <div className="flex justify-between py-3 border-b border-gray-200">
          <span className="text-gray-600">到访日期</span>
          <span className="font-medium text-gray-900">{orderData.visitDate}</span>
        </div>

        {/* 人数 */}
        <div className="flex justify-between py-3 border-b border-gray-200">
          <span className="text-gray-600">人数</span>
          <span className="font-medium text-gray-900">{orderData.peopleCount} 人</span>
        </div>

        {/* 套餐/项目 */}
        <div className="py-3 border-b border-gray-200">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">{orderData.packageId ? '套餐' : '项目'}</span>
          </div>
          {orderData.packageId ? (
            <div className="bg-white rounded p-3 border border-gray-200">
              <div className="flex justify-between">
                <span>{orderData.package?.name}</span>
                <span>{formatAmount(orderData.package?.price)} × {orderData.peopleCount}人</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {orderData.selectedProjects.map(item => (
                <div key={item.projectId} className="bg-white rounded p-3 border border-gray-200">
                  <div className="flex justify-between">
                    <span>{item.project.name}</span>
                    <span>{formatAmount(item.project.price)} × {item.quantity}人</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 备注 */}
        {orderData.notes && (
          <div className="py-3 border-b border-gray-200">
            <div className="text-gray-600 mb-1">备注</div>
            <div className="text-gray-900">{orderData.notes}</div>
          </div>
        )}

        {/* 总金额 */}
        <div className="flex justify-between py-4 text-lg">
          <span className="font-medium text-gray-900">订单总额</span>
          <span className="font-bold text-blue-600">{formatAmount(calculateTotal())}</span>
        </div>
      </div>
    </div>
  );

  // 渲染当前步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">创建订单</h1>
      </div>

      {/* 步骤指示器 */}
      {renderStepIndicator()}

      {/* 步骤内容 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        {renderStepContent()}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-lg font-medium text-gray-900">
          预计金额: <span className="text-blue-600">{formatAmount(calculateTotal())}</span>
        </div>
        <div className="flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={handlePrev}
              disabled={loading}
              className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              上一步
            </button>
          )}
          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              提交订单
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;
