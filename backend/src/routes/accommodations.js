const express = require('express');
const router = express.Router();
const accommodationController = require('../controllers/accommodationController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', requireRole(['admin', 'operator', 'marketer']), accommodationController.getAccommodations);

module.exports = router;
