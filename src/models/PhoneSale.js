const mongoose = require('mongoose');

const PhoneSaleSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true
  },
  customerName: {
    type: String,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  phones: [{
    phoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Phone',
      required: true
    },
    brand: String,
    model: String,
    color: String,
    storage: String,
    ram: String,
    imei1: String,
    serialNumber: String,
    sellingPrice: Number,
    purchasePrice: Number // Captured for profit calculation
  }],
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number, // Selling price sum minus discount
    required: true
  },
  profit: {
    type: Number,
    default: 0
  },
  paymentType: {
    type: String,
    enum: ['Cash', 'Card', 'Transfer', 'Mixed', 'Installment'],
    required: true
  },
  paymentDetails: {
    cashAmount: { type: Number, default: 0 },
    cardAmount: { type: Number, default: 0 },
    transferAmount: { type: Number, default: 0 }
  },
  soldBy: {
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

module.exports = mongoose.model('PhoneSale', PhoneSaleSchema);
