const express = require('express');
const router = express.Router();
const {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/product.controller');
const { auth, adminAuth } = require('../middleware/auth');

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Protected routes (admin only)
router.post('/', auth, adminAuth, createProduct);
router.put('/:id', auth, adminAuth, updateProduct);
router.delete('/:id', auth, adminAuth, deleteProduct);

module.exports = router;
