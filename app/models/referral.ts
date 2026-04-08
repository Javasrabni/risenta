import mongoose from "mongoose";

const ReferredCustomerSchema = new mongoose.Schema({
  customerID: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  signupDate: {
    type: Date,
    default: Date.now
  },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  }
}, { _id: false });

const ReferralSchema = new mongoose.Schema({
  referralCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  ownerCustomerID: {
    type: String,
    required: true,
    trim: true
  },
  ownerEmail: {
    type: String,
    required: true,
    trim: true
  },
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  totalSignups: {
    type: Number,
    default: 0
  },
  activeReferrals: {
    type: Number,
    default: 0
  },
  convertedToPaid: {
    type: Number,
    default: 0
  },
  referredCustomers: {
    type: [ReferredCustomerSchema],
    default: []
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
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

// Index untuk query cepat
ReferralSchema.index({ referralCode: 1 });
ReferralSchema.index({ ownerCustomerID: 1 });
ReferralSchema.index({ ownerEmail: 1 });

// Pre-save middleware untuk update updatedAt
ReferralSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Method untuk menambah referred customer
ReferralSchema.methods.addReferredCustomer = async function(customerData: any) {
  this.referredCustomers.push(customerData);
  this.totalSignups += 1;
  
  if (customerData.subscriptionPlan !== 'free') {
    this.convertedToPaid += 1;
  }
  
  this.activeReferrals = this.referredCustomers.filter(
    (c: any) => c.subscriptionPlan !== 'free'
  ).length;
  
  await this.save();
};

const Referral = mongoose.models.Referral || mongoose.model("Referral", ReferralSchema);

export default Referral;
