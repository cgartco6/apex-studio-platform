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
        $set: { 'usageStats.last
