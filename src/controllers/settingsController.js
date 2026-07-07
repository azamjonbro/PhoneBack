const Setting = require('../models/Setting');
const logActivity = require('../utils/historyLogger');

const getSettings = async (req, res, next) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({});
    }
    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create(req.body);
    } else {
      setting = await Setting.findByIdAndUpdate(setting._id, req.body, {
        new: true,
        runValidators: true
      });
    }

    await logActivity({
      action: 'Settings Updated',
      details: 'Updated global store configuration settings',
      createdBy: req.user._id,
      username: req.user.username
    });

    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSettings };
