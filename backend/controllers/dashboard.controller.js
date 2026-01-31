const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const AIAgent = require('../models/AIAgent');

exports.getAdminDashboard = async (req, res) => {
    try {
        // Only allow admin access
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Get date range for analytics
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
        const endDate = new Date();
        
        // Get counts
        const totalOrders = await Order.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalRevenue = await Payment.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        // Get recent orders
        const recentOrders = await Order.find()
            .populate('product', 'name')
            .populate('customer', 'name')
            .sort({ createdAt: -1 })
            .limit(10);
        
        // Get revenue by day for chart
        const revenueByDay = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    paidAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // Get top products
        const topProducts = await Order.aggregate([
            { $group: { _id: '$product', count: { $sum: '$quantity' } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' }
        ]);
        
        // Get AI agent usage
        const aiUsage = await AIAgent.aggregate([
            { $group: {
                _id: '$type',
                count: { $sum: '$usageCount' },
                agents: { $sum: 1 }
            }},
            { $sort: { count: -1 } }
        ]);
        
        res.json({
            overview: {
                totalOrders,
                totalUsers,
                totalProducts,
                totalRevenue: totalRevenue[0]?.total || 0
            },
            charts: {
                revenueByDay,
                topProducts
            },
            analytics: {
                aiUsage,
                recentOrders
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
};

exports.getUserDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Get user's orders
        const userOrders = await Order.find({ customer: userId })
            .populate('product', 'name price')
            .sort({ createdAt: -1 })
            .limit(5);
        
        // Get user's design projects
        const designProjects = await DesignProject.find({ customer: userId })
            .sort({ updatedAt: -1 })
            .limit(5);
        
        // Calculate total spent
        const totalSpent = await Order.aggregate([
            { $match: { customer: userId, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);
        
        res.json({
            userInfo: {
                name: req.user.name,
                email: req.user.email,
                joinDate: req.user.createdAt
            },
            orders: {
                recent: userOrders,
                total: userOrders.length,
                totalSpent: totalSpent[0]?.total || 0
            },
            projects: {
                recent: designProjects,
                total: designProjects.length
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user dashboard' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        let dateFilter = {};
        
        // Set date range based on period
        const now = new Date();
        switch (period) {
            case 'week':
                dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
                break;
            case 'month':
                dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
                break;
            case 'year':
                dateFilter = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
                break;
        }
        
        // Get various analytics
        const [orders, users, revenue, aiUsage] = await Promise.all([
            Order.countDocuments({ createdAt: dateFilter }),
            User.countDocuments({ createdAt: dateFilter }),
            Payment.aggregate([
                { $match: { status: 'completed', paidAt: dateFilter } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            AIAgent.aggregate([
                { $match: { lastUsed: dateFilter } },
                { $group: { _id: null, usage: { $sum: '$usageCount' } } }
            ])
        ]);
        
        res.json({
            period,
            metrics: {
                orders,
                newUsers: users,
                revenue: revenue[0]?.total || 0,
                aiUsage: aiUsage[0]?.usage || 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};
