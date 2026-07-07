const mongoose = require('mongoose');

const MoneyPaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than zero']
  },
  supplier: {
    type: String,
    trim: true
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
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

module.exports = mongoose.model('MoneyPayment', MoneyPaymentSchema);
