const mongoose = require('mongoose');

const aiAgentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Agent name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],
        index: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    type: {
        type: String,
        required: true,
        enum: ['design', 'workflow', 'strategy', 'helper'],
        index: true
    },
    category: {
        type: String,
        required: true,
        enum: ['logo_generator', 'brand_identity', 'design_optimizer', 
               'task_scheduler', 'process_optimizer', 'market_analyzer', 
               'pricing_optimizer', 'customer_support', 'content_generator'],
        index: true
    },
    model: {
        provider: {
            type: String,
            enum: ['openai', 'stability', 'replicate', 'custom', 'anthropic'],
            default: 'openai'
        },
        name: String,
        version: String,
        apiEndpoint: String
    },
    capabilities: [{
        name: String,
        description: String,
        inputType: String,
        outputType: String,
        estimatedTime: Number // in seconds
    }],
    settings: {
        temperature: {
            type: Number,
            min: 0,
            max: 2,
            default: 0.7
        },
        maxTokens: {
            type: Number,
            default: 1000
        },
        quality: {
            type: String,
            enum: ['standard', 'premium', 'ultra'],
            default: 'standard'
        },
        stylePresets: [String],
        constraints: {
            maxFileSize: Number,
            allowedFormats: [String],
            maxResolution: String
        }
    },
    status: {
        type: String,
        enum: ['active', 'maintenance', 'deprecated', 'beta'],
        default: 'active',
        index: true
    },
    usageStats: {
        totalRequests: {
            type: Number,
            default: 0
        },
        successfulRequests: {
            type: Number,
            default: 0
        },
        failedRequests: {
            type: Number,
            default: 0
        },
        totalProcessingTime: {
            type: Number,
            default: 0 // in milliseconds
        },
        avgResponseTime: {
            type: Number,
            default: 0
        },
        lastUsed: Date
    },
    performanceMetrics: {
        accuracy: Number,
        speed: Number,
        quality: Number,
        userSatisfaction: Number
    },
    pricing: {
        type: {
            type: String,
            enum: ['free', 'pay_per_use', 'subscription', 'custom'],
            default: 'free'
        },
        costPerRequest: Number,
        monthlyFee: Number,
        credits: Number
    },
    dependencies: [{
        name: String,
        version: String,
        required: Boolean
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    version: {
        type: String,
        default: '1.0.0'
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    metadata: {
        tags: [String],
        industries: [String],
        languages: [String],
        regions: [String]
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for success rate
aiAgentSchema.virtual('successRate').get(function() {
    if (this.usageStats.totalRequests === 0) return 0;
    return (this.usageStats.successfulRequests / this.usageStats.totalRequests) * 100;
});

// Method to increment usage stats
aiAgentSchema.methods.incrementUsage = async function(success = true, processingTime = 0) {
    const update = {
        $inc: {
            'usageStats.totalRequests': 1,
            'usageStats.totalProcessingTime': processingTime
        },
        $set: { 'usageStats.lastUsed': new Date() }
    };
    
    if (success) {
        update.$inc['usageStats.successfulRequests'] = 1;
    } else {
        update.$inc['usageStats.failedRequests'] = 1;
    }
    
    // Calculate new average response time
    if (processingTime > 0) {
        const newTotalTime = this.usageStats.totalProcessingTime + processingTime;
        const newTotalRequests = this.usageStats.totalRequests + 1;
        update.$set['usageStats.avgResponseTime'] = newTotalTime / newTotalRequests;
    }
    
    await this.updateOne(update);
    return this;
};

// Static method to get top performing agents
aiAgentSchema.statics.getTopAgents = async function(limit = 10) {
    return this.aggregate([
        {
            $addFields: {
                successRate: {
                    $cond: [
                        { $eq: ['$usageStats.totalRequests', 0] },
                        0,
                        {
                            $multiply: [
                                { $divide: ['$usageStats.successfulRequests', '$usageStats.totalRequests'] },
                                100
                            ]
                        }
                    ]
                }
            }
        },
        { $sort: { successRate: -1, 'usageStats.totalRequests': -1 } },
        { $limit: limit },
        {
            $project: {
                name: 1,
                type: 1,
                category: 1,
                status: 1,
                successRate: 1,
                totalRequests: '$usageStats.totalRequests',
                avgResponseTime: '$usageStats.avgResponseTime'
            }
        }
    ]);
};

// Static method to get agent statistics by type
aiAgentSchema.statics.getAgentStatsByType = async function() {
    return this.aggregate([
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalRequests: { $sum: '$usageStats.totalRequests' },
                avgSuccessRate: {
                    $avg: {
                        $cond: [
                            { $eq: ['$usageStats.totalRequests', 0] },
                            0,
                            {
                                $multiply: [
                                    { $divide: ['$usageStats.successfulRequests', '$usageStats.totalRequests'] },
                                    100
                                ]
                            }
                        ]
                    }
                }
            }
        },
        { $sort: { totalRequests: -1 } }
    ]);
};

// Indexes for better query performance
aiAgentSchema.index({ type: 1, category: 1 });
aiAgentSchema.index({ status: 1, isPublic: 1 });
aiAgentSchema.index({ 'metadata.tags': 1 });
aiAgentSchema.index({ createdAt: -1 });
aiAgentSchema.index({ 'usageStats.lastUsed': -1 });
aiAgentSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware
aiAgentSchema.pre('save', function(next) {
    if (this.isModified('version')) {
        this.updatedAt = new Date();
    }
    next();
});

module.exports = mongoose.model('AIAgent', aiAgentSchema);
