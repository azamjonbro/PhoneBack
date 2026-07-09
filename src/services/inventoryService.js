const inventoryRepository = require('../repositories/inventoryRepository');
const productService = require('./productService');

class InventoryService {
  async createEntry(entryData) {
    return await inventoryRepository.create(entryData);
  }

  async getEntriesByProduct(productId) {
    return await inventoryRepository.find({ productId });
  }

  async getEntryById(id) {
    return await inventoryRepository.findById(id);
  }

  async updateEntry(id, updateData) {
    return await inventoryRepository.updateById(id, {
      quantity: updateData.quantity,
      buyPrice: updateData.buyPrice,
      note: updateData.note,
      supplierId: updateData.supplierId
    });
  }

  async deleteEntry(id) {
    const entry = await inventoryRepository.findById(id);
    if (!entry) return null;

    const productId = entry.productId._id || entry.productId;
    await inventoryRepository.deleteById(id);

    // Recalculate and delete parent product if no other entries and sales exist
    await productService.deleteProductIfEmpty(productId);

    return entry;
  }
}

module.exports = new InventoryService();
