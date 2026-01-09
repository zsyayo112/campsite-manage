import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customerAPI } from '../utils/api';

const CustomerDetail = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await customerAPI.getById(id);
        setCustomer(res.data.data);
      } catch (error) {
        console.error('获取客户详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">客户不存在</p>
        <Link to="/customers" className="text-blue-600 hover:underline mt-2 inline-block">
          返回客户列表
        </Link>
      </div>
    );
  }

  const getSourceLabel = (source) => {
    const labels = {
      xiaohongshu: '小红书',
      wechat: '微信',
      douyin: '抖音',
      other: '其他',
    };
    return labels[source] || source;
  };

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <Link to="/customers" className="hover:text-blue-600">
          客户管理
        </Link>
        <span>/</span>
        <span className="text-gray-800">{customer.name}</span>
      </nav>

      {/* 客户信息卡片 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {customer.name[0]}
              </span>
            </div>
            <div className="ml-4 text-white">
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              <p className="text-blue-100">{customer.phone}</p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">微信号</p>
            <p className="text-gray-800">{customer.wechat || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">客户来源</p>
            <p className="text-gray-800">{getSourceLabel(customer.source)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">创建时间</p>
            <p className="text-gray-800">
              {new Date(customer.createdAt).toLocaleDateString('zh-CN')}
            </p>
          </div>
        </div>
      </div>

      {/* 消费统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">累计消费</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            ¥{parseFloat(customer.totalSpent || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">消费次数</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {customer.visitCount || 0} 次
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-500">最近消费</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {customer.lastVisitDate
              ? new Date(customer.lastVisitDate).toLocaleDateString('zh-CN')
              : '-'}
          </p>
        </div>
      </div>

      {/* 备注 */}
      {customer.notes && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">备注</h3>
          <p className="text-gray-600">{customer.notes}</p>
        </div>
      )}

      {/* 订单历史 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">订单历史</h3>
        {customer.orders && customer.orders.length > 0 ? (
          <div className="space-y-3">
            {customer.orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">
                      {order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.visitDate).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800">
                      ¥{parseFloat(order.totalAmount).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">{order.status}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">暂无订单记录</p>
        )}
      </div>
    </div>
  );
};

export default CustomerDetail;
