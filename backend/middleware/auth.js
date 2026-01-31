const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error();
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.userId });
        
        if (!user || user.status !== 'active') {
            throw new Error();
        }
        
        req.user = {
            userId: user._id,
            email: user.email,
            name: user.name,
            role: user.role
        };
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

const adminAuth = async (req, res, next) => {
    try {
        await auth(req, res, () => {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Admin access required' });
            }
            next();
        });
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

const designerAuth = async (req, res, next) => {
    try {
        await auth(req, res, () => {
            if (!['admin', 'designer'].includes(req.user.role)) {
                return res.status(403).json({ error: 'Designer access required' });
            }
            next();
        });
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

module.exports = { auth, adminAuth, designerAuth };
