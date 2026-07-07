const History = require('../models/History');

const logActivity = async ({ action, details, createdBy, username }) => {
  try {
    await History.create({
      action,
      details,
      createdBy,
      username
    });
  } catch (error) {
    console.error('Failed to log activity history:', error.message);
  }
};

module.exports = logActivity;
