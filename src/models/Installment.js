const mongoose = require('mongoose');

const InstallmentPaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment must be greater than 0']
  },
  date: {
    type: Date,
    default: Date.now
  },
  method: {
    type: String,
    enum: ['Cash', 'Card', 'Transfer'],
    default: 'Cash'
  },
  notes: {
    type: String,
    trim: true
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedByName: {
    type: String,
    trim: true
  }
}, { _id: true, timestamps: false });

const InstallmentItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['Product', 'Accessory'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'items.itemType'
  },
  name: {
    type: String,
    trim: true
  },
  sellingPrice: {
    type: Number,
    default: 0
  },
  purchasePrice: {
    type: Number,
    default: 0
  }
}, { _id: false });

const InstallmentSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  customerPhone: {
    type: String,
    required: [true, 'Customer phone is required'],
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  items: [InstallmentItemSchema],
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  initialPayment: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Initial payment cannot be negative']
  },
  remainingDebt: {
    type: Number,
    required: true,
    min: [0, 'Remaining debt cannot be negative']
  },
  monthlyPayment: {
    type: Number,
    required: true,
    min: [0, 'Monthly payment cannot be negative']
  },
  numberOfMonths: {
    type: Number,
    required: true,
    min: [1, 'Number of months must be at least 1']
  },
  firstPaymentDate: {
    type: Date,
    required: [true, 'First payment date is required']
  },
  nextPaymentDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'PaidOff', 'Overdue'],
    default: 'Active'
  },
  payments: [InstallmentPaymentSchema],
  totalPaid: {
    type: Number,
    default: 0,
    min: [0, 'Total paid cannot be negative']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  }
}, {
  timestamps: true
});

// Index for efficient queries
InstallmentSchema.index({ status: 1 });
InstallmentSchema.index({ customerName: 'text', customerPhone: 'text' });
InstallmentSchema.index({ nextPaymentDate: 1 });

module.exports = mongoose.model('Installment', InstallmentSchema);
