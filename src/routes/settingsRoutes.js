const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect } = require('../middlewares/auth');
const { checkPermission } = require('../middlewares/role');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getSettings)
  .put(checkPermission('settings'), updateSettings);

module.exports = router;
