const mongoose = require('mongoose');

const PhonePurchaseSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  customerName: {
    type: String,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  phones: [{
    model: String,
    imei1: String,
    imei2: String,
    purchasePrice: Number,
    sellingPrice: Number,
    condition: {
      type: String,
      enum: ['New', 'Used', 'Refurbished'],
      default: 'Used'
    },
    storage: String,
    color: String
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PhonePurchase', PhonePurchaseSchema);
