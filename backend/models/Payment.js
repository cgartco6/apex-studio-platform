const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true,
        enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
        default: 'pending',
        index: true
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'paypal', 'bank_transfer', 'crypto', 'stripe'],
        default: 'stripe'
    },
    paymentIntentId: {
        type: String,
        sparse: true
    },
    clientSecret: {
        type: String,
        select: false
    },
    transactionId: {
        type: String,
        sparse: true
    },
    refundAmount: {
        type: Number,
        min: 0
    },
    refundedAt: Date,
    paidAt: Date,
    paymentDetails: {
        card: {
            last4: String,
            brand: String,
            country: String
        },
        paypal: {
            email: String,
            payerId: String
        },
        bank: {
            name: String,
            account: String
        }
    },
    error: {
        code: String,
        message: String,
        declined_code: String
    },
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: this.currency
    }).format(this.amount);
});

// Method to check if payment is successful
paymentSchema.methods.isSuccessful = function() {
    return this.status === 'completed';
};

// Method to check if payment is refundable
paymentSchema.methods.isRefundable = function() {
    return this.status === 'completed' && 
           (!this.refundAmount || this.refundAmount < this.amount) &&
           this.paidAt > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Within 90 days
};

// Static method to get total revenue
paymentSchema.statics.getTotalRevenue = async function(startDate, endDate) {
    const match = { status: 'completed' };
    
    if (startDate || endDate) {
        match.paidAt = {};
        if (startDate) match.paidAt.$gte = startDate;
        if (endDate) match.paidAt.$lte = endDate;
    }
    
    const result = await this.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    return result[0]?.total || 0;
};

// Indexes for better query performance
paymentSchema.index({ order: 1 });
paymentSchema.index({ customer: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paidAt: 1 });
paymentSchema.index({ paymentIntentId: 1 }, { sparse: true });
paymentSchema.index({ transactionId: 1 }, { sparse: true });
paymentSchema.index({ createdAt: 1 });

// Pre-save middleware
paymentSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'completed' && !this.paidAt) {
        this.paidAt = new Date();
    }
    
    if (this.isModified('status') && this.status === 'refunded' && !this.refundedAt) {
        this.refundedAt = new Date();
    }
    
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);
