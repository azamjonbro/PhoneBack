const express = require('express');
const { getPhones, getPhoneByIdOrImei, createPhone, updatePhone, deletePhone, getPhoneSuggestions, getCustomerSuggestions } = require('../controllers/phoneController');
const { protect } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/role');

const router = express.Router();

router.use(protect);

router.get('/suggestions', getPhoneSuggestions);
router.get('/customers', getCustomerSuggestions);

router.route('/')
  .get(getPhones)
  .post(checkPermission('inventory:write'), createPhone);

router.route('/:idOrImei')
  .get(getPhoneByIdOrImei);

router.route('/:id')
  .put(checkPermission('inventory:write'), updatePhone)
  .delete(checkPermission('inventory:write'), deletePhone);

module.exports = router;
