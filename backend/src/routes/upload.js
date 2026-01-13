const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authMiddleware: authenticate } = require('../middleware/auth');
const { uploadImage, uploadVideo, deleteFile } = require('../controllers/uploadController');

/**
 * Multer 配置
 */

// 临时存储目录
const tempDir = path.join(__dirname, '../../uploads/temp');

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // 生成临时文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// 文件过滤器
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG, PNG, GIF, WebP 格式的图片'), false);
  }
};

const videoFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 MP4, MOV, AVI 格式的视频'), false);
  }
};

// 创建上传实例
const uploadImageMulter = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const uploadVideoMulter = multer({
  storage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

/**
 * 错误处理中间件
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: '文件大小超出限制',
        },
      });
    }
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
      },
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE',
        message: err.message,
      },
    });
  }
  next();
};

/**
 * 上传路由
 */

/**
 * @route   POST /api/upload/image
 * @desc    上传图片
 * @access  Private (admin, operator)
 */
router.post(
  '/image',
  authenticate,
  uploadImageMulter.single('file'),
  handleMulterError,
  uploadImage
);

/**
 * @route   POST /api/upload/video
 * @desc    上传视频
 * @access  Private (admin, operator)
 */
router.post(
  '/video',
  authenticate,
  uploadVideoMulter.single('file'),
  handleMulterError,
  uploadVideo
);

/**
 * @route   DELETE /api/upload
 * @desc    删除文件
 * @access  Private (admin)
 */
router.delete('/', authenticate, deleteFile);

module.exports = router;
