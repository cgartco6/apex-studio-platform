const mongoose = require('mongoose');

const designProjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
        maxlength: [200, 'Project name cannot exceed 200 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    type: {
        type: String,
        enum: ['logo', 'branding', 'website', 'mobile_app', 'print', 'social_media', 'packaging', 'other'],
        default: 'other',
        index: true
    },
    status: {
        type: String,
        enum: ['draft', 'brief_received', 'in_progress', 'review', 'revision', 'approved', 'delivered', 'archived'],
        default: 'draft',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    timeline: {
        startDate: Date,
        dueDate: Date,
        completedDate: Date,
        estimatedHours: Number,
        actualHours: Number
    },
    requirements: {
        brief: String,
        targetAudience: String,
        competitors: [String],
        inspiration: [String],
        doLikes: [String],
        dontLikes: [String],
        mustHaves: [String],
        niceToHaves: [String]
    },
    specifications: {
        dimensions: {
            width: Number,
            height: Number,
            unit: {
                type: String,
                enum: ['px', 'in', 'cm', 'mm'],
                default: 'px'
            }
        },
        colorPalette: [String],
        typography: [{
            fontFamily: String,
            weights: [String],
            usage: String
        }],
        fileFormats: [String],
        resolutions: [String]
    },
    designs: [{
        version: {
            type: Number,
            default: 1
        },
        name: String,
        description: String,
        files: [{
            url: String,
            type: String,
            size: Number,
            dimensions: String,
            format: String,
            thumbnail: String
        }],
        generatedBy: {
            type: {
                type: String,
                enum: ['ai', 'designer', 'both'],
                default: 'designer'
            },
            agentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'AIAgent'
            },
            designerId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        },
        feedback: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            comment: String,
            ratings: {
                overall: { type: Number, min: 1, max: 5 },
                creativity: { type: Number, min: 1, max: 5 },
                usability: { type: Number, min: 1, max: 5 },
                aesthetic: { type: Number, min: 1, max: 5 }
            },
            attachments: [String],
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],
        revisions: [{
            description: String,
            changes: [String],
            beforeFiles: [String],
            afterFiles: [String],
            requestedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            completedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            status: {
                type: String,
                enum: ['requested', 'in_progress', 'completed', 'rejected'],
                default: 'requested'
            },
            createdAt: {
                type: Date,
                default: Date.now
            },
            completedAt: Date
        }],
        aiAnalysis: {
            qualityScore: Number,
            suggestions: [String],
            improvements: [String],
            generatedAt: Date
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    collaboration: {
        team: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            role: {
                type: String,
                enum: ['viewer', 'commenter', 'editor', 'approver']
            },
            joinedAt: {
                type: Date,
                default: Date.now
            }
        }],
        comments: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            text: String,
            attachments: [String],
            mentions: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }],
            createdAt: {
                type: Date,
                default: Date.now
            },
            updatedAt: Date
        }]
    },
    deliverables: [{
        name: String,
        description: String,
        files: [{
            url: String,
            type: String,
            size: Number,
            format: String
        }],
        status: {
            type: String,
            enum: ['pending', 'ready', 'delivered', 'approved'],
            default: 'pending'
        },
        deliveryDate: Date,
        approval: {
            approvedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            approvedAt: Date,
            notes: String
        }
    }],
    pricing: {
        package: {
            type: String,
            enum: ['basic', 'standard', 'premium', 'custom'],
            default: 'standard'
        },
        basePrice: Number,
        additionalCosts: [{
            description: String,
            amount: Number
        }],
        discount: {
            type: Number,
            min: 0,
            max: 100
        },
        totalPrice: Number,
        paymentStatus: {
            type: String,
            enum: ['pending', 'partial', 'paid', 'refunded'],
            default: 'pending'
        }
    },
    metadata: {
        tags: [String],
        industry: String,
        references: [String],
        moodboard: [String]
    },
    settings: {
        notifications: {
            emailUpdates: { type: Boolean, default: true },
            revisionAlerts: { type: Boolean, default: true },
            deadlineReminders: { type: Boolean, default: true }
        },
        privacy: {
            isPublic: { type: Boolean, default: false },
            allowSharing: { type: Boolean, default: true },
            watermark: { type: Boolean, default: true }
        },
        versioning: {
            keepAllVersions: { type: Boolean, default: true },
            autoArchiveOld: { type: Boolean, default: true }
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for current design version
designProjectSchema.virtual('currentDesign').get(function() {
    if (this.designs.length === 0) return null;
    return this.designs.reduce((latest, design) => 
        design.version > latest.version ? design : latest, 
        this.designs[0]
    );
});

// Virtual for project progress percentage
designProjectSchema.virtual('progress').get(function() {
    const statusWeights = {
        'draft': 0,
        'brief_received': 10,
        'in_progress': 40,
        'review': 70,
        'revision': 50,
        'approved': 90,
        'delivered': 100,
        'archived': 100
    };
    return statusWeights[this.status] || 0;
});

// Virtual for days remaining
designProjectSchema.virtual('daysRemaining').get(function() {
    if (!this.timeline.dueDate) return null;
    const today = new Date();
    const dueDate = new Date(this.timeline.dueDate);
    const diffTime = dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for overdue status
designProjectSchema.virtual('isOverdue').get(function() {
    if (!this.timeline.dueDate) return false;
    const today = new Date();
    const dueDate = new Date(this.timeline.dueDate);
    return today > dueDate && this.status !== 'delivered' && this.status !== 'archived';
});

// Method to add a new design version
designProjectSchema.methods.addDesignVersion = function(designData) {
    const latestVersion = this.designs.length > 0 
        ? Math.max(...this.designs.map(d => d.version))
        : 0;
    
    const newDesign = {
        ...designData,
        version: latestVersion + 1,
        createdAt: new Date()
    };
    
    this.designs.push(newDesign);
    this.status = 'in_progress';
    return newDesign;
};

// Method to add feedback to a specific design
designProjectSchema.methods.addFeedback = function(designVersion, feedback) {
    const design = this.designs.find(d => d.version === designVersion);
    if (!design) {
        throw new Error(`Design version ${designVersion} not found`);
    }
    
    design.feedback.push({
        ...feedback,
        createdAt: new Date()
    });
    
    if (this.status === 'review') {
        this.status = 'revision';
    }
};

// Static method to get projects by status
designProjectSchema.statics.getProjectsByStatus = async function(status) {
    return this.aggregate([
        { $match: { status } },
        { $sort: { 'timeline.dueDate': 1 } },
        {
            $lookup: {
                from: 'users',
                localField: 'customer',
                foreignField: '_id',
                as: 'customer'
            }
        },
        { $unwind: '$customer' },
        {
            $project: {
                name: 1,
                type: 1,
                status: 1,
                priority: 1,
                'timeline.dueDate': 1,
                'customer.name': 1,
                'customer.email': 1,
                progress: { $ifNull: ['$progress', 0] },
                daysRemaining: {
                    $cond: [
                        { $gt: ['$timeline.dueDate', new Date()] },
                        { $ceil: { $divide: [{ $subtract: ['$timeline.dueDate', new Date()] }, 86400000] } },
                        null
                    ]
                }
            }
        }
    ]);
};

// Indexes for better query performance
designProjectSchema.index({ customer: 1, status: 1 });
designProjectSchema.index({ status: 1, priority: 1 });
designProjectSchema.index({ 'timeline.dueDate': 1 });
designProjectSchema.index({ type: 1, status: 1 });
designProjectSchema.index({ createdAt: -1 });
designProjectSchema.index({ 'metadata.tags': 1 });
designProjectSchema.index({ name: 'text', description: 'text' });

// Pre-save middleware
designProjectSchema.pre('save', function(next) {
    // Update completed date if status is delivered or archived
    if (this.isModified('status') && 
        (this.status === 'delivered' || this.status === 'archived') && 
        !this.timeline.completedDate) {
        this.timeline.completedDate = new Date();
    }
    
    // Calculate total price if not set
    if (this.isModified('pricing') && this.pricing.basePrice) {
        const additionalCosts = this.pricing.additionalCosts?.reduce((sum, cost) => sum + cost.amount, 0) || 0;
        const discountAmount = (this.pricing.basePrice + additionalCosts) * (this.pricing.discount || 0) / 100;
        this.pricing.totalPrice = this.pricing.basePrice + additionalCosts - discountAmount;
    }
    
    next();
});

module.exports = mongoose.model('DesignProject', designProjectSchema);
