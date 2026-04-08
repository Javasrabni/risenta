import mongoose from "mongoose";

const ReferralRewardSchema = new mongoose.Schema({
  // Reward recipient (the referrer)
  recipientCustomerID: {
    type: String,
    required: true,
    index: true
  },
  recipientEmail: {
    type: String,
    required: true
  },
  recipientName: {
    type: String,
    required: true
  },
  
  // The referred customer who triggered this reward
  referredCustomerID: {
    type: String,
    required: true
  },
  referredCustomerEmail: {
    type: String,
    required: true
  },
  
  // Reward details
  rewardType: {
    type: String,
    required: true,
    enum: ['signup_bonus', 'upgrade_bonus', 'milestone_bonus', 'cash'],
    default: 'signup_bonus'
  },
  rewardValue: {
    type: Number,
    required: true,
    default: 0
  },
  rewardCurrency: {
    type: String,
    default: 'credits' // or 'USD', 'IDR', etc.
  },
  description: {
    type: String,
    default: ''
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending'
  },
  
  // Payment/Redemption info
  paidAt: {
    type: Date,
    default: null
  },
  paidBy: {
    type: String,
    default: null
  },
  paymentMethod: {
    type: String,
    default: null
  },
  paymentReference: {
    type: String,
    default: null
  },
  
  // Metadata
  triggeredBy: {
    type: String,
    enum: ['signup', 'subscription_upgrade', 'manual'],
    default: 'signup'
  },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
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

// Indexes
ReferralRewardSchema.index({ recipientCustomerID: 1, status: 1 });
ReferralRewardSchema.index({ referredCustomerID: 1 });
ReferralRewardSchema.index({ status: 1 });
ReferralRewardSchema.index({ createdAt: -1 });

// Pre-save middleware
ReferralRewardSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Static method to calculate total pending rewards
ReferralRewardSchema.statics.getPendingRewardsTotal = async function(customerID: string) {
  const result = await this.aggregate([
    { $match: { recipientCustomerID: customerID, status: 'pending' } },
    { $group: { _id: null, total: { $sum: "$rewardValue" } } }
  ]);
  return result[0]?.total || 0;
};

// Static method to get reward stats
ReferralRewardSchema.statics.getRewardStats = async function(customerID: string) {
  const stats = await this.aggregate([
    { $match: { recipientCustomerID: customerID } },
    { 
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalValue: { $sum: "$rewardValue" }
      }
    }
  ]);
  
  const result = {
    pending: { count: 0, totalValue: 0 },
    approved: { count: 0, totalValue: 0 },
    paid: { count: 0, totalValue: 0 },
    cancelled: { count: 0, totalValue: 0 }
  };
  
  stats.forEach((stat: any) => {
    if (result[stat._id as keyof typeof result]) {
      result[stat._id as keyof typeof result] = {
        count: stat.count,
        totalValue: stat.totalValue
      };
    }
  });
  
  return result;
};

const ReferralReward = mongoose.models.ReferralReward || 
  mongoose.model("ReferralReward", ReferralRewardSchema);

export default ReferralReward;
