const Product = require('../models');
const User = require('../../auth-service/models');

const resolvers = {
  Query: {

    products: async () => {
      try {
        const products = await Product.find();
        return products;
      } catch (error) {
        console.error('Error fetching products:', error);
        throw new Error('Failed to fetch products');
      }
    },
    

    product: async (_, { id }) => {
      try {
        const product = await Product.findById(id);
        return product;
      } catch (error) {
        console.error('Error fetching product:', error);
        throw new Error('Failed to fetch product');
      }
    }
  },
  
  Mutation: {

    createProduct: async (_, { name, description, price, stock }, context) => {

      if (!context.userId) {
        throw new Error('Not authenticated');
      }
      

      if (!context.isAdmin) {
        throw new Error('Not authorized. Admin role required');
      }
      
      try {
        const product = new Product({
          name,
          description,
          price,
          stock
        });
        
        await product.save();
        return product;
      } catch (error) {
        console.error('Error creating product:', error);
        throw new Error(error.message || 'Failed to create product');
      }
    },
    

    updateProduct: async (_, { id, name, description, price, stock }, context) => {

      if (!context.userId) {
        throw new Error('Not authenticated');
      }
      

      if (!context.isAdmin) {
        throw new Error('Not authorized. Admin role required');
      }
      
      try {
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (price !== undefined) updates.price = price;
        if (stock !== undefined) updates.stock = stock;
        
        const product = await Product.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true }
        );
        
        if (!product) {
          throw new Error('Product not found');
        }
        
        return product;
      } catch (error) {
        console.error('Error updating product:', error);
        throw new Error(error.message || 'Failed to update product');
      }
    },
    

    deleteProduct: async (_, { id }, context) => {

      if (!context.userId) {
        throw new Error('Not authenticated');
      }
      

      if (!context.isAdmin) {
        throw new Error('Not authorized. Admin role required');
      }
      
      try {
        const product = await Product.findByIdAndDelete(id);
        
        if (!product) {
          throw new Error('Product not found');
        }
        
        return true;
      } catch (error) {
        console.error('Error deleting product:', error);
        throw new Error(error.message || 'Failed to delete product');
      }
    }
  }
};

module.exports = resolvers;