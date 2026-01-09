const prisma = require('../utils/prisma');
const XLSX = require('xlsx');
const {
  isValidPhone,
  isValidWechat,
  isValidSource,
  isValidTags,
  validatePagination,
  validateSort,
} = require('../utils/validators');

/**
 * 获取客户列表
 * GET /api/customers
 * 支持分页、搜索、筛选、排序
 */
const getCustomers = async (req, res) => {
  try {
    const {
      page,
      pageSize,
      search,
      source,
      sortBy,
      order,
    } = req.query;

    // 验证分页参数
    const pagination = validatePagination(page, pageSize);

    // 验证排序参数
    const sort = validateSort(
      sortBy,
      order,
      ['name', 'createdAt', 'lastVisitDate', 'totalSpent', 'visitCount']
    );

    // 构建查询条件
    const where = {};

    // 搜索条件（姓名或手机号）
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    // 来源筛选
    if (source && isValidSource(source)) {
      where.source = source;
    }

    // 查询客户列表
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: {
          [sort.sortBy]: sort.order,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          wechat: true,
          source: true,
          tags: true,
          notes: true,
          firstVisitDate: true,
          lastVisitDate: true,
          totalSpent: true,
          visitCount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    // 解析标签 JSON
    const customersWithParsedTags = customers.map(customer => ({
      ...customer,
      tags: customer.tags ? JSON.parse(customer.tags) : [],
      totalSpent: Number(customer.totalSpent),
    }));

    return res.status(200).json({
      success: true,
      data: {
        items: customersWithParsedTags,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取客户列表失败',
      },
    });
  }
};

/**
 * 获取客户详情
 * GET /api/customers/:id
 */
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            orderDate: true,
            visitDate: true,
            totalAmount: true,
            status: true,
            paymentStatus: true,
          },
          orderBy: {
            visitDate: 'desc',
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: '客户不存在',
        },
      });
    }

    // 解析标签和金额
    const customerData = {
      ...customer,
      tags: customer.tags ? JSON.parse(customer.tags) : [],
      totalSpent: Number(customer.totalSpent),
      orders: customer.orders.map(order => ({
        ...order,
        totalAmount: Number(order.totalAmount),
      })),
    };

    return res.status(200).json({
      success: true,
      data: customerData,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取客户信息失败',
      },
    });
  }
};

/**
 * 创建客户
 * POST /api/customers
 */
const createCustomer = async (req, res) => {
  try {
    const { name, phone, wechat, source, tags, notes } = req.body;

    // 验证必填字段
    if (!name || !phone || !source) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少必填字段',
          details: {
            name: !name ? '客户姓名不能为空' : undefined,
            phone: !phone ? '手机号不能为空' : undefined,
            source: !source ? '客户来源不能为空' : undefined,
          },
        },
      });
    }

    // 验证手机号格式
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '手机号格式不正确',
        },
      });
    }

    // 验证微信号格式
    if (wechat && !isValidWechat(wechat)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '微信号格式不正确',
        },
      });
    }

    // 验证来源
    if (!isValidSource(source)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '客户来源无效，必须是: xiaohongshu, wechat, douyin, friend, other',
        },
      });
    }

    // 验证标签
    const tagsJson = tags ? JSON.stringify(tags) : null;
    if (tagsJson && !isValidTags(tagsJson)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '标签格式不正确',
        },
      });
    }

    // 检查手机号是否已存在
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone },
    });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_PHONE',
          message: '该手机号已存在',
        },
      });
    }

    // 创建客户
    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        wechat: wechat || null,
        source,
        tags: tagsJson,
        notes: notes || null,
      },
    });

    // 返回结果
    const customerData = {
      ...customer,
      tags: customer.tags ? JSON.parse(customer.tags) : [],
      totalSpent: Number(customer.totalSpent),
    };

    return res.status(201).json({
      success: true,
      data: customerData,
      message: '客户创建成功',
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '创建客户失败',
      },
    });
  }
};

/**
 * 更新客户
 * PUT /api/customers/:id
 */
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, wechat, source, tags, notes } = req.body;

    // 检查客户是否存在
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: '客户不存在',
        },
      });
    }

    // 验证字段
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '手机号格式不正确',
        },
      });
    }

    if (wechat && !isValidWechat(wechat)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '微信号格式不正确',
        },
      });
    }

    if (source && !isValidSource(source)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '客户来源无效',
        },
      });
    }

    // 如果修改手机号，检查是否与其他客户重复
    if (phone && phone !== existingCustomer.phone) {
      const duplicateCustomer = await prisma.customer.findUnique({
        where: { phone },
      });

      if (duplicateCustomer) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_PHONE',
            message: '该手机号已被其他客户使用',
          },
        });
      }
    }

    // 准备更新数据
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (wechat !== undefined) updateData.wechat = wechat || null;
    if (source !== undefined) updateData.source = source;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (notes !== undefined) updateData.notes = notes || null;

    // 更新客户
    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // 返回结果
    const customerData = {
      ...customer,
      tags: customer.tags ? JSON.parse(customer.tags) : [],
      totalSpent: Number(customer.totalSpent),
    };

    return res.status(200).json({
      success: true,
      data: customerData,
      message: '客户更新成功',
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '更新客户失败',
      },
    });
  }
};

/**
 * 删除客户
 * DELETE /api/customers/:id
 */
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查客户是否存在
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        orders: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: '客户不存在',
        },
      });
    }

    // 检查是否有关联订单
    if (customer.orders.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CUSTOMER_HAS_ORDERS',
          message: '该客户有关联订单，无法删除',
          details: {
            orderCount: customer.orders.length,
          },
        },
      });
    }

    // 删除客户
    await prisma.customer.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({
      success: true,
      message: '客户删除成功',
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '删除客户失败',
      },
    });
  }
};

/**
 * 导出客户列表到 Excel
 * GET /api/customers/export
 * 支持筛选条件：search, source, startDate, endDate
 */
const exportCustomers = async (req, res) => {
  try {
    const { search, source, startDate, endDate } = req.query;

    // 构建查询条件（与 getCustomers 相同）
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (source && isValidSource(source)) {
      where.source = source;
    }

    // 日期范围筛选（基于创建时间）
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 设置结束日期为当天的最后一秒
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // 查询所有符合条件的客户
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        wechat: true,
        source: true,
        tags: true,
        notes: true,
        firstVisitDate: true,
        lastVisitDate: true,
        totalSpent: true,
        visitCount: true,
        createdAt: true,
      },
    });

    // 来源映射
    const sourceMap = {
      xiaohongshu: '小红书',
      wechat: '微信',
      douyin: '抖音',
      friend: '朋友介绍',
      other: '其他',
    };

    // 格式化日期
    const formatDate = (date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('zh-CN');
    };

    // 转换为 Excel 数据格式
    const excelData = customers.map((customer, index) => ({
      '序号': index + 1,
      '客户姓名': customer.name,
      '手机号': customer.phone,
      '微信号': customer.wechat || '',
      '客户来源': sourceMap[customer.source] || customer.source,
      '标签': customer.tags ? JSON.parse(customer.tags).join(', ') : '',
      '首次到访': formatDate(customer.firstVisitDate),
      '最近到访': formatDate(customer.lastVisitDate),
      '累计消费': Number(customer.totalSpent).toFixed(2),
      '到访次数': customer.visitCount,
      '备注': customer.notes || '',
      '创建时间': formatDate(customer.createdAt),
    }));

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 设置列宽
    worksheet['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 12 },  // 客户姓名
      { wch: 14 },  // 手机号
      { wch: 16 },  // 微信号
      { wch: 12 },  // 客户来源
      { wch: 20 },  // 标签
      { wch: 12 },  // 首次到访
      { wch: 12 },  // 最近到访
      { wch: 12 },  // 累计消费
      { wch: 10 },  // 到访次数
      { wch: 30 },  // 备注
      { wch: 12 },  // 创建时间
    ];

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '客户列表');

    // 生成 Buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `customers_${timestamp}.xlsx`;

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    // 发送文件
    return res.send(buffer);
  } catch (error) {
    console.error('Export customers error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_ERROR',
        message: '导出客户列表失败',
      },
    });
  }
};

/**
 * 获取客户统计信息
 * GET /api/customers/stats
 */
const getCustomerStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      totalSpent,
      averageSpent,
      sourceDistribution,
    ] = await Promise.all([
      // 总客户数
      prisma.customer.count(),

      // 总消费金额
      prisma.customer.aggregate({
        _sum: {
          totalSpent: true,
        },
      }),

      // 平均消费金额
      prisma.customer.aggregate({
        _avg: {
          totalSpent: true,
        },
      }),

      // 客户来源分布
      prisma.customer.groupBy({
        by: ['source'],
        _count: {
          source: true,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        totalSpent: Number(totalSpent._sum.totalSpent || 0),
        averageSpent: Number(averageSpent._avg.totalSpent || 0),
        sourceDistribution: sourceDistribution.map(item => ({
          source: item.source,
          count: item._count.source,
        })),
      },
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '获取客户统计失败',
      },
    });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  exportCustomers,
  getCustomerStats,
};
