const express = require('express');
const { receivePhones, getPurchases, getSuppliers, createSupplier } = require('../controllers/purchaseController');
const { protect } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/role');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPurchases)
  .post(checkPermission('inventory:write'), receivePhones);

router.route('/suppliers')
  .get(getSuppliers)
  .post(checkPermission('inventory:write'), createSupplier);

module.exports = router;
