const prisma = require('../utils/prisma');

/**
 * 默认营地配置
 */
const DEFAULT_CAMP_INFO = {
  name: '长白山双溪森林营地',
  slogan: '在自然中探索，在冰雪中成长',
  description: '长白山双溪森林营地位于长白山北坡，依托得天独厚的自然资源，为游客提供丰富的户外体验活动。冬季可体验滑雪、雪圈、冰雪徒步等项目；夏季可参与森林徒步、野外探险等活动。',
  location: {
    address: '吉林省延边朝鲜族自治州安图县二道白河镇',
    coordinates: { lat: 42.0389, lng: 128.0619 },
  },
  contact: {
    phone: '131-9620-1942',
    name: '郑长岭',
    wechat: 'shuangxi_camp',
  },
  features: [
    { icon: 'mountain', title: '得天独厚', description: '位于长白山北坡核心区域，自然风光优美' },
    { icon: 'snowflake', title: '冰雪乐园', description: '冬季积雪期长达5个月，雪质优良' },
    { icon: 'shield', title: '安全保障', description: '专业教练团队，完善的安全措施' },
    { icon: 'users', title: '贴心服务', description: '酒店接送，全程陪同，省心省力' },
  ],
  serviceFlow: [
    { step: 1, title: '在线预约', description: '通过微信表单提交预约信息' },
    { step: 2, title: '确认行程', description: '工作人员联系确认详细安排' },
    { step: 3, title: '支付定金', description: '支付100元/人定金确认预约' },
    { step: 4, title: '酒店接送', description: '9:00酒店大堂集合出发' },
    { step: 5, title: '畅玩体验', description: '专业教练带领畅玩各项活动' },
    { step: 6, title: '安全返回', description: '16:00送返酒店，结束愉快行程' },
  ],
  gallery: [],
};

/**
 * 获取所有配置
 * @route GET /api/site-config
 */
const getAllConfigs = async (req, res) => {
  try {
    const { group } = req.query;

    const where = group ? { group } : {};
    const configs = await prisma.siteConfig.findMany({
      where,
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    // 转换为键值对格式
    const configMap = {};
    configs.forEach((config) => {
      try {
        configMap[config.key] = JSON.parse(config.value);
      } catch {
        configMap[config.key] = config.value;
      }
    });

    return res.status(200).json({
      success: true,
      data: configMap,
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_CONFIG_ERROR', message: '获取配置失败' },
    });
  }
};

/**
 * 获取单个配置
 * @route GET /api/site-config/:key
 */
const getConfig = async (req, res) => {
  try {
    const { key } = req.params;

    const config = await prisma.siteConfig.findUnique({
      where: { key },
    });

    if (!config) {
      // 返回默认值
      if (key === 'camp_info') {
        return res.status(200).json({
          success: true,
          data: DEFAULT_CAMP_INFO,
        });
      }
      return res.status(404).json({
        success: false,
        error: { code: 'CONFIG_NOT_FOUND', message: '配置不存在' },
      });
    }

    let value;
    try {
      value = JSON.parse(config.value);
    } catch {
      value = config.value;
    }

    return res.status(200).json({
      success: true,
      data: value,
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_CONFIG_ERROR', message: '获取配置失败' },
    });
  }
};

/**
 * 保存配置
 * @route PUT /api/site-config/:key
 */
const saveConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, label, group } = req.body;

    // 序列化值
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

    const config = await prisma.siteConfig.upsert({
      where: { key },
      update: {
        value: serializedValue,
        label: label || undefined,
        group: group || undefined,
      },
      create: {
        key,
        value: serializedValue,
        label: label || key,
        group: group || 'general',
      },
    });

    return res.status(200).json({
      success: true,
      data: config,
      message: '配置保存成功',
    });
  } catch (error) {
    console.error('保存配置失败:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SAVE_CONFIG_ERROR', message: '保存配置失败' },
    });
  }
};

/**
 * 批量保存配置
 * @route PUT /api/site-config
 */
const saveConfigs = async (req, res) => {
  try {
    const { configs } = req.body;

    if (!configs || !Array.isArray(configs)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATA', message: '配置数据格式错误' },
      });
    }

    const results = [];
    for (const item of configs) {
      const serializedValue = typeof item.value === 'string'
        ? item.value
        : JSON.stringify(item.value);

      const config = await prisma.siteConfig.upsert({
        where: { key: item.key },
        update: {
          value: serializedValue,
          label: item.label || undefined,
          group: item.group || undefined,
        },
        create: {
          key: item.key,
          value: serializedValue,
          label: item.label || item.key,
          group: item.group || 'general',
        },
      });
      results.push(config);
    }

    return res.status(200).json({
      success: true,
      data: results,
      message: '配置批量保存成功',
    });
  } catch (error) {
    console.error('批量保存配置失败:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SAVE_CONFIGS_ERROR', message: '批量保存配置失败' },
    });
  }
};

/**
 * 删除配置
 * @route DELETE /api/site-config/:key
 */
const deleteConfig = async (req, res) => {
  try {
    const { key } = req.params;

    await prisma.siteConfig.delete({
      where: { key },
    });

    return res.status(200).json({
      success: true,
      message: '配置删除成功',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'CONFIG_NOT_FOUND', message: '配置不存在' },
      });
    }
    console.error('删除配置失败:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'DELETE_CONFIG_ERROR', message: '删除配置失败' },
    });
  }
};

/**
 * 获取营地信息（带默认值）
 * @route GET /api/site-config/camp/info
 */
const getCampInfo = async (req, res) => {
  try {
    const config = await prisma.siteConfig.findUnique({
      where: { key: 'camp_info' },
    });

    let campInfo = DEFAULT_CAMP_INFO;
    if (config) {
      try {
        campInfo = { ...DEFAULT_CAMP_INFO, ...JSON.parse(config.value) };
      } catch {
        // 使用默认值
      }
    }

    return res.status(200).json({
      success: true,
      data: campInfo,
    });
  } catch (error) {
    console.error('获取营地信息失败:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GET_CAMP_INFO_ERROR', message: '获取营地信息失败' },
    });
  }
};

/**
 * 保存营地信息
 * @route PUT /api/site-config/camp/info
 */
const saveCampInfo = async (req, res) => {
  try {
    const campInfo = req.body;

    // 验证必要字段
    if (!campInfo.name) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATA', message: '营地名称不能为空' },
      });
    }

    const config = await prisma.siteConfig.upsert({
      where: { key: 'camp_info' },
      update: {
        value: JSON.stringify(campInfo),
      },
      create: {
        key: 'camp_info',
        value: JSON.stringify(campInfo),
        label: '营地信息',
        group: 'about',
      },
    });

    return res.status(200).json({
      success: true,
      data: campInfo,
      message: '营地信息保存成功',
    });
  } catch (error) {
    console.error('保存营地信息失败:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SAVE_CAMP_INFO_ERROR', message: '保存营地信息失败' },
    });
  }
};

module.exports = {
  getAllConfigs,
  getConfig,
  saveConfig,
  saveConfigs,
  deleteConfig,
  getCampInfo,
  saveCampInfo,
  DEFAULT_CAMP_INFO,
};
