const express = require('express');
const { getDashboardStats, getReports } = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/role');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/analytics', checkPermission('reports'), getReports);

module.exports = router;
