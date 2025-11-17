
const pool = require('./db');


const getCartItems = async (userId) => {
    try {
        const [cartItems] = await pool.query(
            `
            SELECT 
                products.id,              -- product id
                products.name,
                products.price,
                products.image,
                products.description,
                products.category,        -- for recommendations
                cart.quantity             -- how many of this product in cart
            FROM cart 
            JOIN products ON cart.product_id = products.id 
            WHERE cart.user_id = ?
            `,
            [userId]
        );

        return cartItems;
    } catch (error) {
        console.error("Error fetching cart items:", error);
        throw new Error("Failed to fetch cart items");
    }
};


const addProductToCart = async (userId, productId) => {
    try {
       
        const [existingCart] = await pool.query(
            "SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?",
            [userId, productId]
        );

        if (existingCart.length > 0) {
          
            await pool.query(
                "UPDATE cart SET quantity = quantity + 1 WHERE user_id = ? AND product_id = ?",
                [userId, productId]
            );
            return { message: "Product quantity increased in cart" };
        }

        // Otherwise insert with quantity = 1
        await pool.query(
            "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)",
            [userId, productId]
        );

        return { message: "Product added to cart" };
    } catch (error) {
        console.error("Error adding product to cart:", error);
        throw new Error("Failed to add product to cart");
    }
};

// ================================
// Remove a product completely
// from the cart
// ================================
const removeCartItem = async (userId, productId) => {
    try {
        const [result] = await pool.query(
            "DELETE FROM cart WHERE user_id = ? AND product_id = ?",
            [userId, productId]
        );

        if (result.affectedRows === 0) {
            return { message: "Product not found in cart" };
        }

        return { message: "Item removed from cart" };
    } catch (error) {
        console.error("Error removing item from cart:", error);
        throw new Error("Failed to remove item from cart");
    }
};

// ====================================================
// ⭐ NEW: Content-based Recommendation System
//     (category + normalized price similarity)
// ====================================================
const getRecommendedProducts = async (userId, topN = 4) => {
    try {
        // 1️⃣ Fetch items currently in the user's cart
        const [cartItems] = await pool.query(
            `
            SELECT 
                p.id,
                p.name,
                p.price,
                p.category
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
            `,
            [userId]
        );

        // If cart is empty, no basis for recommendation
        if (!cartItems.length) return [];

        // 2️⃣ Fetch all products from catalog
        const [allProducts] = await pool.query(
            `
            SELECT 
                id,
                name,
                price,
                image,
                description,
                category
            FROM products
            `
        );

        if (!allProducts.length) return [];

        // 3️⃣ Prepare helpers: price normalization & sets to exclude cart items
        const prices = allProducts.map(p => Number(p.price) || 0);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        const normalizePrice = (price) => {
            const p = Number(price) || 0;
            const denom = maxPrice - minPrice;
            if (denom === 0) return 0.5; // all prices same; neutral value
            return (p - minPrice) / denom;
        };

        const cartIds = new Set(cartItems.map(i => i.id));

        // 4️⃣ Define weights for similarity components
        const wCat = 0.7;  // category importance
        const wPrice = 0.3; // price similarity importance

        // 5️⃣ Compute similarity score for each candidate product
        const scored = allProducts
            .filter(p => !cartIds.has(p.id)) // don't recommend items already in cart
            .map(p => {
                const candidatePriceNorm = normalizePrice(p.price);
                const candidateCategory = (p.category || '').toLowerCase();

                // Compare candidate against each cart item
                let sumSim = 0;
                for (const c of cartItems) {
                    const cartCategory = (c.category || '').toLowerCase();
                    const cartPriceNorm = normalizePrice(c.price);

                    // Category similarity: 1 if same category, else 0
                    const catSim = candidateCategory && cartCategory &&
                                   candidateCategory === cartCategory ? 1 : 0;

                    // Price similarity: 1 - |difference|
                    const priceSim = 1 - Math.abs(candidatePriceNorm - cartPriceNorm);

                    // Combined weighted similarity
                    const sim = (wCat * catSim) + (wPrice * priceSim);
                    sumSim += sim;
                }

                // Average similarity over cart items
                const avgScore = sumSim / cartItems.length;

                return {
                    ...p,
                    score: avgScore
                };
            });

        // 6️⃣ Sort by score (descending) and return top N
        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, topN);
    } catch (error) {
        console.error("Error generating recommendations:", error);
        throw new Error("Failed to generate recommendations");
    }
};

module.exports = { 
    getCartItems, 
    addProductToCart, 
    removeCartItem,
    getRecommendedProducts    
};