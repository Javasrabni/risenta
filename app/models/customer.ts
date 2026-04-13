import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
  customerID: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    trim: true,
    default: ""
  },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'daily-12k', 'weekly-25k', 'biweekly-49k'],
    default: 'free'
  },
  aiUsage: {
    autoGenerateRemaining: { type: Number, default: 1 },
    promptRemaining: { type: Number, default: 4 },
    totalAutoGenerateUsed: { type: Number, default: 0 },
    totalPromptUsed: { type: Number, default: 0 },
    planActivatedAt: { type: Date, default: null },
    planExpiresAt: { type: Date, default: null },
    carriedOverAutoGenerate: { type: Number, default: 0 },
    carriedOverPrompt: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: String,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes are automatically created for fields with 'unique: true'
// Additional indexes can be added here if needed

// Pre-save middleware untuk update updatedAt
CustomerSchema.pre('save', function() {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
});

// Generate unique customerID sebelum save
CustomerSchema.pre('save', async function() {
  if (!this.customerID) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.customerID = `CST${timestamp}${random}`;
  }
  if (!this.referralCode) {
    const refTimestamp = Date.now().toString(36).toUpperCase();
    const refRandom = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.referralCode = `REF${refTimestamp}${refRandom}`;
  }
});

const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);

export default Customer;
