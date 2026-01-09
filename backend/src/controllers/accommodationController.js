const prisma = require('../utils/prisma');

/**
 * @route   GET /api/accommodations
 * @desc    获取住宿地点列表
 * @access  Private
 */
const getAccommodations = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, isActive } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [accommodations, total] = await Promise.all([
      prisma.accommodationPlace.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'asc' },
      }),
      prisma.accommodationPlace.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: accommodations,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    console.error('获取住宿地点列表失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_ACCOMMODATIONS_ERROR',
        message: '获取住宿地点列表失败',
      },
    });
  }
};

module.exports = {
  getAccommodations,
};
