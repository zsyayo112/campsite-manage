const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
const imageDir = path.join(uploadDir, 'images');
const videoDir = path.join(uploadDir, 'videos');

// 创建目录
[uploadDir, imageDir, videoDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * 生成文件名
 * @param {string} originalName - 原始文件名
 * @returns {string} 新文件名
 */
const generateFileName = (originalName) => {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}${ext}`;
};

/**
 * @route   POST /api/upload/image
 * @desc    上传图片
 * @access  Private (admin, operator)
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: '请选择要上传的图片',
        },
      });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      // 删除上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: '只支持 JPG, PNG, GIF, WebP 格式的图片',
        },
      });
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: '图片大小不能超过 5MB',
        },
      });
    }

    // 生成新文件名并移动文件
    const newFileName = generateFileName(req.file.originalname);
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const targetDir = path.join(imageDir, String(year), month);

    // 创建年月目录
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, newFileName);
    fs.renameSync(req.file.path, targetPath);

    // 返回相对路径
    const relativePath = `/uploads/images/${year}/${month}/${newFileName}`;

    return res.status(200).json({
      success: true,
      data: {
        url: relativePath,
        filename: newFileName,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
      message: '图片上传成功',
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: '图片上传失败',
      },
    });
  }
};

/**
 * @route   POST /api/upload/video
 * @desc    上传视频
 * @access  Private (admin, operator)
 */
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: '请选择要上传的视频',
        },
      });
    }

    // 验证文件类型
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: '只支持 MP4, MOV, AVI 格式的视频',
        },
      });
    }

    // 验证文件大小 (100MB)
    const maxSize = 100 * 1024 * 1024;
    if (req.file.size > maxSize) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: '视频大小不能超过 100MB',
        },
      });
    }

    // 生成新文件名并移动文件
    const newFileName = generateFileName(req.file.originalname);
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const targetDir = path.join(videoDir, String(year), month);

    // 创建年月目录
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, newFileName);
    fs.renameSync(req.file.path, targetPath);

    // 返回相对路径
    const relativePath = `/uploads/videos/${year}/${month}/${newFileName}`;

    return res.status(200).json({
      success: true,
      data: {
        url: relativePath,
        filename: newFileName,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
      message: '视频上传成功',
    });
  } catch (error) {
    console.error('视频上传失败:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: '视频上传失败',
      },
    });
  }
};

/**
 * @route   DELETE /api/upload
 * @desc    删除文件
 * @access  Private (admin)
 */
const deleteFile = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请提供要删除的文件URL',
        },
      });
    }

    // 安全检查：只允许删除 /uploads/ 目录下的文件
    if (!url.startsWith('/uploads/')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: '无效的文件路径',
        },
      });
    }

    const filePath = path.join(__dirname, '../..', url);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: '文件不存在',
        },
      });
    }

    // 删除文件
    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      message: '文件删除成功',
    });
  } catch (error) {
    console.error('删除文件失败:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: '删除文件失败',
      },
    });
  }
};

module.exports = {
  uploadImage,
  uploadVideo,
  deleteFile,
};
