// backend/controllers/cartController.js
const {
  getCartItems,
  addProductToCart,
  removeCartItem,
  getRecommendedProducts, 
} = require('../models/cartModel');

const db = require('../models/db');


const fetchCartItems = async (req, res) => {
  console.log("Fetching cart for user ID:", req.user.id);
  const userId = req.user.id;

  try {
    const cartItems = await getCartItems(userId);
    console.log("Cart Items Found in DB:", cartItems);
    res.json(cartItems);
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).json({ error: error.message });
  }
};

const addToCart = async (req, res) => {
  const userId = req.user.id;
  const { product_id } = req.body;

  if (!product_id) {
    return res.status(400).json({ error: "Product ID is required" });
  }

  try {
    await addProductToCart(userId, product_id);
    res.status(201).json({ message: "Product added to cart" });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: error.message });
  }
};

const deleteCartItem = async (req, res) => {
  const userId = req.user.id;
  const productId = req.params.productId;

  try {
    const result = await removeCartItem(userId, productId);
    res.json(result);
  } catch (error) {
    console.error("Error deleting cart item:", error);
    res.status(500).json({ error: error.message });
  }
};

const clearCart = async (req, res) => {
  const userId = req.user.id;

  try {
    await db.query("DELETE FROM cart WHERE user_Id = ?", [userId]);

    res.status(200).json({ message: 'Cart cleared successfully.' });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ error: 'Failed to clear cart.' });
  }
};

const getRecommendations = async (req, res) => {
  const userId = req.user.id;

  try {
    const recommendations = await getRecommendedProducts(userId, 4); // top 4 items
    res.json(recommendations);
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
};

module.exports = {
  addToCart,
  fetchCartItems,
  deleteCartItem,
  clearCart,
  getRecommendations, 
};
