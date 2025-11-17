// backend/routes/cartRoutes.js
const express = require('express');
const {
  addToCart,
  fetchCartItems,
  deleteCartItem,
  clearCart,
  getRecommendations, 
} = require('../controllers/cartController');
const authenticateUser = require('../middleware/authMiddleware');

const router = express.Router();

router.get("/", authenticateUser, fetchCartItems);


router.post("/", authenticateUser, addToCart);

router.delete("/:productId", authenticateUser, deleteCartItem);

router.delete("/", authenticateUser, clearCart);


router.get("/recommendations", authenticateUser, getRecommendations);

module.exports = router;
