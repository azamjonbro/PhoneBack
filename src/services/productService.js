const productRepository = require('../repositories/productRepository');
const InventoryEntry = require('../models/InventoryEntry');
const Sale = require('../models/Sale');

class ProductService {
  async getProductsWithStock(filters) {
    return await productRepository.getProductsWithStock(filters);
  }

  async getProductById(id) {
    return await productRepository.findById(id);
  }

  async createOrGetProduct(productData) {
    const { name, brand, storage, condition } = productData;
    
    // Check if product already exists
    let product = await productRepository.findOne({
      name: name.trim(),
      brand: brand.trim(),
      storage: storage ? storage.trim() : '',
      condition: condition
    });

    if (!product) {
      product = await productRepository.create({
        name: name.trim(),
        brand: brand.trim(),
        storage: storage ? storage.trim() : '',
        condition: condition
      });
    }

    return product;
  }

  async updateProduct(id, updateData) {
    return await productRepository.updateById(id, {
      name: updateData.name?.trim(),
      brand: updateData.brand?.trim(),
      storage: updateData.storage?.trim(),
      condition: updateData.condition
    });
  }

  // Deletes product only if it has zero associated entries and sales
  async deleteProductIfEmpty(productId) {
    const entryCount = await InventoryEntry.countDocuments({ productId });
    const saleCount = await Sale.countDocuments({ productId });

    if (entryCount === 0 && saleCount === 0) {
      await productRepository.deleteById(productId);
      return true;
    }
    return false;
  }

  async deleteProduct(id) {
    return await productRepository.deleteById(id);
  }

  async getSuggestions(searchQuery) {
    return await productRepository.getSuggestions(searchQuery);
  }
}

module.exports = new ProductService();
