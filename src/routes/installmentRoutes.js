const express = require('express');
const {
  getInstallments,
  getInstallmentById,
  createInstallment,
  receivePayment,
  getInstallmentStats,
  getInstallmentReport
} = require('../controllers/installmentController');
const { protect } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/role');

const router = express.Router();

router.use(protect);

// Stats and report routes must be before /:id to avoid conflicts
router.get('/stats', getInstallmentStats);
router.get('/report', getInstallmentReport);

router.route('/')
  .get(getInstallments)
  .post(checkPermission('sales'), createInstallment);

router.route('/:id')
  .get(getInstallmentById);

router.post('/:id/payments', checkPermission('sales'), receivePayment);

module.exports = router;
