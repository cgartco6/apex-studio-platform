const User = require('../models/User');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
    try {
        // Admin only
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const { page = 1, limit = 20, role } = req.query;
        const filter = role ? { role } : {};
        
        const users = await User.find(filter)
            .select('-password')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });
        
        const total = await User.countDocuments(filter);
        
        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

exports.getUser = async (req, res) => {
    try {
        // Users can view their own profile, admins can view any
        if (req.user.role !== 'admin' && req.user.userId !== req.params.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate({
                path: 'orders',
                select: 'status totalPrice createdAt',
                options: { limit: 5, sort: { createdAt: -1 } }
            });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const updates = req.body;
        const userId = req.params.id;
        
        // Check permissions
        if (req.user.role !== 'admin' && req.user.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Remove sensitive fields if not admin
        if (req.user.role !== 'admin') {
            delete updates.role;
            delete updates.status;
        }
        
        // Handle password update
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        } else {
            delete updates.password;
        }
        
        const user = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        // Only admin can delete users
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Also delete user's orders and related data
        await Order.deleteMany({ customer: req.params.id });
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        // Admin only
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const { status } = req.body;
        const validStatuses = ['active', 'suspended', 'inactive'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User status updated', user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user status' });
    }
};

exports.getUserStats = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Get user stats
        const [orders, totalSpent, avgOrderValue] = await Promise.all([
            Order.countDocuments({ customer: userId }),
            Order.aggregate([
                { $match: { customer: userId, status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$totalPrice' } } }
            ]),
            Order.aggregate([
                { $match: { customer: userId } },
                { $group: { _id: null, avg: { $avg: '$totalPrice' } } }
            ])
        ]);
        
        res.json({
            stats: {
                totalOrders: orders,
                totalSpent: totalSpent[0]?.total || 0,
                avgOrderValue: avgOrderValue[0]?.avg || 0,
                lastOrder: await Order.findOne({ customer: userId })
                    .sort({ createdAt: -1 })
                    .select('createdAt')
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
};
