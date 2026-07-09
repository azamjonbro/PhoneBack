const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },
  buyPrice: {
    type: Number,
    required: [true, 'Buy price is required'],
    min: [0, 'Buy price cannot be negative']
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    trim: true
  },
  paymentType: {
    type: String,
    enum: ['Cash', 'Card', 'Transfer', 'Mixed', 'Installment'],
    required: [true, 'Payment type is required']
  },
  paymentDetails: {
    cashAmount: { type: Number, default: 0 },
    cardAmount: { type: Number, default: 0 },
    transferAmount: { type: Number, default: 0 }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Sale', SaleSchema);
