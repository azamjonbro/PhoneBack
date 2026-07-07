const mongoose = require('mongoose');

const MoneyReceiptSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than zero']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true
  },
  customer: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MoneyReceipt', MoneyReceiptSchema);
