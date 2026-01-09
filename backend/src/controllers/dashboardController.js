const prisma = require('../utils/prisma');

/**
 * @route   GET /api/dashboard/stats
 * @desc    获取仪表盘核心统计数据
 * @access  Private (admin, operator)
 */
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 本月第一天
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // 上月第一天和最后一天
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 昨天
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. 今日营收
    const todayRevenue = await prisma.order.aggregate({
      where: {
        orderDate: { gte: today, lt: tomorrow },
        status: { in: ['confirmed', 'completed'] },
      },
      _sum: { totalAmount: true },
    });

    // 昨日营收（用于环比）
    const yesterdayRevenue = await prisma.order.aggregate({
      where: {
        orderDate: { gte: yesterday, lt: today },
        status: { in: ['confirmed', 'completed'] },
      },
      _sum: { totalAmount: true },
    });

    // 2. 本月营收
    const monthRevenue = await prisma.order.aggregate({
      where: {
        orderDate: { gte: firstDayOfMonth },
        status: { in: ['confirmed', 'completed'] },
      },
      _sum: { totalAmount: true },
    });

    // 上月营收（用于环比）
    const lastMonthRevenue = await prisma.order.aggregate({
      where: {
        orderDate: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth },
        status: { in: ['confirmed', 'completed'] },
      },
      _sum: { totalAmount: true },
    });

    // 3. 订单总数
    const totalOrders = await prisma.order.count();
    const lastMonthOrders = await prisma.order.count({
      where: {
        createdAt: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth },
      },
    });
    const thisMonthOrders = await prisma.order.count({
      where: {
        createdAt: { gte: firstDayOfMonth },
      },
    });

    // 4. 客户总数
    const totalCustomers = await prisma.customer.count();
    const lastMonthCustomers = await prisma.customer.count({
      where: {
        createdAt: { lte: lastDayOfLastMonth },
      },
    });
    const newCustomersThisMonth = await prisma.customer.count({
      where: {
        createdAt: { gte: firstDayOfMonth },
      },
    });

    // 计算环比
    const calculateGrowth = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    const todayRevenueValue = Number(todayRevenue._sum.totalAmount || 0);
    const yesterdayRevenueValue = Number(yesterdayRevenue._sum.totalAmount || 0);
    const monthRevenueValue = Number(monthRevenue._sum.totalAmount || 0);
    const lastMonthRevenueValue = Number(lastMonthRevenue._sum.totalAmount || 0);

    return res.status(200).json({
      success: true,
      data: {
        todayRevenue: {
          value: todayRevenueValue,
          growth: calculateGrowth(todayRevenueValue, yesterdayRevenueValue),
          label: '较昨日',
        },
        monthRevenue: {
          value: monthRevenueValue,
          growth: calculateGrowth(monthRevenueValue, lastMonthRevenueValue),
          label: '较上月',
        },
        totalOrders: {
          value: totalOrders,
          growth: calculateGrowth(thisMonthOrders, lastMonthOrders),
          label: '本月新增',
          newCount: thisMonthOrders,
        },
        totalCustomers: {
          value: totalCustomers,
          growth: calculateGrowth(newCustomersThisMonth, lastMonthCustomers - (totalCustomers - newCustomersThisMonth)),
          label: '本月新增',
          newCount: newCustomersThisMonth,
        },
      },
    });
  } catch (error) {
    console.error('获取仪表盘统计失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_DASHBOARD_STATS_ERROR',
        message: '获取仪表盘统计失败',
      },
    });
  }
};

/**
 * @route   GET /api/dashboard/revenue-trend
 * @desc    获取营收趋势（最近N天）
 * @access  Private (admin, operator)
 */
const getRevenueTrend = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysCount = parseInt(days);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysCount + 1);
    startDate.setHours(0, 0, 0, 0);

    // 获取日期范围内的所有订单
    const orders = await prisma.order.findMany({
      where: {
        orderDate: { gte: startDate, lte: today },
        status: { in: ['confirmed', 'completed'] },
      },
      select: {
        orderDate: true,
        totalAmount: true,
      },
    });

    // 按日期聚合
    const revenueByDate = {};
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      revenueByDate[dateStr] = 0;
    }

    orders.forEach((order) => {
      const dateStr = order.orderDate.toISOString().split('T')[0];
      if (revenueByDate[dateStr] !== undefined) {
        revenueByDate[dateStr] += Number(order.totalAmount);
      }
    });

    // 转换为数组格式
    const trend = Object.entries(revenueByDate).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100,
      label: new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    }));

    return res.status(200).json({
      success: true,
      data: trend,
    });
  } catch (error) {
    console.error('获取营收趋势失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_REVENUE_TREND_ERROR',
        message: '获取营收趋势失败',
      },
    });
  }
};

/**
 * @route   GET /api/dashboard/order-status
 * @desc    获取订单状态分布
 * @access  Private (admin, operator)
 */
const getOrderStatusDistribution = async (req, res) => {
  try {
    const distribution = await prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const statusLabels = {
      pending: '待处理',
      confirmed: '已确认',
      completed: '已完成',
      cancelled: '已取消',
    };

    const statusColors = {
      pending: '#FBBF24',
      confirmed: '#3B82F6',
      completed: '#10B981',
      cancelled: '#EF4444',
    };

    const data = distribution.map((item) => ({
      name: statusLabels[item.status] || item.status,
      value: item._count.status,
      color: statusColors[item.status] || '#6B7280',
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('获取订单状态分布失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_ORDER_STATUS_ERROR',
        message: '获取订单状态分布失败',
      },
    });
  }
};

/**
 * @route   GET /api/dashboard/project-ranking
 * @desc    获取项目热度排行
 * @access  Private (admin, operator)
 */
const getProjectRanking = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // 统计每个项目的订单数量
    const projectStats = await prisma.orderItem.groupBy({
      by: ['projectId'],
      _sum: { quantity: true },
      _count: { projectId: true },
    });

    // 获取项目名称
    const projectIds = projectStats.map((s) => s.projectId);
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });

    const projectMap = {};
    projects.forEach((p) => {
      projectMap[p.id] = p.name;
    });

    // 构建排行榜
    const ranking = projectStats
      .map((item) => ({
        name: projectMap[item.projectId] || `项目${item.projectId}`,
        count: item._count.projectId,
        quantity: item._sum.quantity || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit));

    return res.status(200).json({
      success: true,
      data: ranking,
    });
  } catch (error) {
    console.error('获取项目排行失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_PROJECT_RANKING_ERROR',
        message: '获取项目排行失败',
      },
    });
  }
};

/**
 * @route   GET /api/dashboard/customer-source
 * @desc    获取客户来源分布
 * @access  Private (admin, operator)
 */
const getCustomerSourceDistribution = async (req, res) => {
  try {
    const distribution = await prisma.customer.groupBy({
      by: ['source'],
      _count: { source: true },
    });

    const sourceLabels = {
      xiaohongshu: '小红书',
      wechat: '微信',
      douyin: '抖音',
      friend: '朋友推荐',
      other: '其他',
    };

    const sourceColors = {
      xiaohongshu: '#FF2442',
      wechat: '#07C160',
      douyin: '#000000',
      friend: '#8B5CF6',
      other: '#6B7280',
    };

    const data = distribution.map((item) => ({
      name: sourceLabels[item.source] || item.source,
      value: item._count.source,
      color: sourceColors[item.source] || '#6B7280',
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('获取客户来源分布失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_CUSTOMER_SOURCE_ERROR',
        message: '获取客户来源分布失败',
      },
    });
  }
};

module.exports = {
  getDashboardStats,
  getRevenueTrend,
  getOrderStatusDistribution,
  getProjectRanking,
  getCustomerSourceDistribution,
};
