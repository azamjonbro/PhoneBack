const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  shopName: {
    type: String,
    default: 'Mobile Zone'
  },
  currency: {
    type: String,
    default: 'USD'
  },
  lowStockThreshold: {
    type: Number,
    default: 5
  },
  receiptFooter: {
    type: String,
    default: 'Thank you for your purchase!'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', SettingSchema);
