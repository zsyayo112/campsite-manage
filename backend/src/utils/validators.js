/**
 * 数据验证工具函数
 */

/**
 * 验证手机号格式（中国大陆）
 * @param {string} phone - 手机号
 * @returns {boolean}
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * 验证微信号格式
 * @param {string} wechat - 微信号
 * @returns {boolean}
 */
const isValidWechat = (wechat) => {
  if (!wechat) return true; // 微信号可选
  // 微信号规则：6-20位，字母开头，可包含字母、数字、-、_
  const wechatRegex = /^[a-zA-Z][-_a-zA-Z0-9]{5,19}$/;
  return wechatRegex.test(wechat);
};

/**
 * 验证客户来源
 * @param {string} source - 来源
 * @returns {boolean}
 */
const isValidSource = (source) => {
  const validSources = ['xiaohongshu', 'wechat', 'douyin', 'friend', 'other'];
  return validSources.includes(source);
};

/**
 * 验证标签数组
 * @param {string} tags - JSON 字符串
 * @returns {boolean}
 */
const isValidTags = (tags) => {
  if (!tags) return true; // 标签可选
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) && parsed.every(tag => typeof tag === 'string');
  } catch {
    return false;
  }
};

/**
 * 验证分页参数
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {object} - 验证后的参数
 */
const validatePagination = (page, pageSize) => {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validPageSize = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  return {
    page: validPage,
    pageSize: validPageSize,
    skip: (validPage - 1) * validPageSize,
    take: validPageSize,
  };
};

/**
 * 验证排序参数
 * @param {string} sortBy - 排序字段
 * @param {string} order - 排序方向
 * @param {string[]} allowedFields - 允许的排序字段
 * @returns {object} - 验证后的参数
 */
const validateSort = (sortBy, order, allowedFields = []) => {
  const validSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt';
  const validOrder = ['asc', 'desc'].includes(order) ? order : 'desc';
  return {
    sortBy: validSortBy,
    order: validOrder,
  };
};

module.exports = {
  isValidPhone,
  isValidWechat,
  isValidSource,
  isValidTags,
  validatePagination,
  validateSort,
};
