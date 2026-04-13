import mongoose from "mongoose";

const AdminAuditSchema = new mongoose.Schema({
  adminID: {
    type: String,
    required: true,
    trim: true
  },
  adminName: {
    type: String,
    required: true,
    trim: true
  },
  isInternalAdmin: {
    type: Boolean,
    default: false
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE_CUSTOMER',
      'UPDATE_CUSTOMER',
      'DELETE_CUSTOMER',
      'ACTIVATE_CUSTOMER',
      'DEACTIVATE_CUSTOMER',
      'UPDATE_SUBSCRIPTION',
      'RESET_PASSWORD',
      'VIEW_CUSTOMER_DATA',
      'EXPORT_CUSTOMER_DATA',
      'MANAGE_REFERRAL',
      'SYSTEM_CONFIG',
      'VIEW_PLAN_CONFIGS',
      'VIEW_PLANS',
      'UPDATE_PLAN',
      'DELETE_PLAN'
    ]
  },
  targetType: {
    type: String,
    required: true,
    enum: ['customer', 'system', 'referral', 'plan']
  },
  targetCustomerID: {
    type: String,
    trim: true
  },
  targetCustomerEmail: {
    type: String,
    trim: true
  },
  changes: {
    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  description: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  subdomain: {
    type: String,
    trim: true,
    default: 'write'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index untuk query cepat
AdminAuditSchema.index({ adminID: 1, timestamp: -1 });
AdminAuditSchema.index({ targetCustomerID: 1, timestamp: -1 });
AdminAuditSchema.index({ action: 1, timestamp: -1 });
AdminAuditSchema.index({ timestamp: -1 });

// Force delete model in development to pick up schema changes
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.AdminAudit;
}

const AdminAudit = mongoose.models.AdminAudit || mongoose.model("AdminAudit", AdminAuditSchema);

export default AdminAudit;
