const saleRepository = require('../repositories/saleRepository');
const InventoryEntry = require('../models/InventoryEntry');
const productService = require('./productService');
const mongoose = require('mongoose');

class SaleService {
  async getWeightedAverageBuyPrice(productId) {
    const avgPriceAgg = await InventoryEntry.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: '$productId',
          totalQty: { $sum: '$quantity' },
          totalCost: { $sum: { $multiply: ['$quantity', '$buyPrice'] } }
        }
      }
    ]);

    if (avgPriceAgg.length === 0 || avgPriceAgg[0].totalQty === 0) {
      return 0;
    }

    return avgPriceAgg[0].totalCost / avgPriceAgg[0].totalQty;
  }

  async createSale(saleData) {
    const { productId } = saleData;
    // Calculate buy price using Weighted Average Cost
    const buyPrice = await this.getWeightedAverageBuyPrice(productId);
    
    return await saleRepository.create({
      ...saleData,
      buyPrice
    });
  }

  async getSales(filter = {}) {
    return await saleRepository.find(filter);
  }

  async getSaleById(id) {
    return await saleRepository.findById(id);
  }

  async deleteSale(id) {
    const sale = await saleRepository.findById(id);
    if (!sale) return null;

    const productId = sale.productId._id || sale.productId;
    await saleRepository.deleteById(id);

    // Recalculate and delete parent product if empty
    await productService.deleteProductIfEmpty(productId);

    return sale;
  }
}

module.exports = new SaleService();
