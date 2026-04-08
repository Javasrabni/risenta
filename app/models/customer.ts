import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
  customerID: {
    type: String,
    required: true,
    unique: true,
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
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
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

// Index untuk pencarian cepat
CustomerSchema.index({ customerID: 1 });
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ referralCode: 1 });

// Pre-save middleware untuk update updatedAt
CustomerSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Generate unique customerID sebelum save
CustomerSchema.pre('save', async function(next) {
  if (!this.customerID) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.customerID = `CST${timestamp}${random}`;
  }
  if (!this.referralCode) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.referralCode = `REF${timestamp}${random}`;
  }
  next();
});

const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);

export default Customer;
