const express = require('express');
const router = express.Router();
const {
    getAllAgents,
    createAgent,
    generateDesign,
    optimizeDesign,
    analyzeMarket,
    getAgentStats
} = require('../controllers/ai.controller');
const { auth, adminAuth, designerAuth } = require('../middleware/auth');

// Public routes
router.get('/agents', getAllAgents);

// Protected routes for all authenticated users
router.post('/generate-design', auth, generateDesign);
router.post('/optimize-design', auth, optimizeDesign);
router.post('/analyze-market', auth, analyzeMarket);
router.get('/agents/:id/stats', auth, getAgentStats);

// Admin only routes
router.post('/agents', auth, adminAuth, createAgent);

module.exports = router;
