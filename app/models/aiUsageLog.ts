import mongoose, { Schema, Document } from "mongoose";

export interface IAIUsageLog extends Document {
  customerId: mongoose.Types.ObjectId;
  action: 'auto-generate' | 'prompt';
  timestamp: Date;
  success: boolean;
  prompt?: string;
  responseLength: number;
  metadata?: {
    documentId?: string;
    template?: string;
    topic?: string;
  };
}

const AIUsageLogSchema = new Schema<IAIUsageLog>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['auto-generate', 'prompt'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    success: {
      type: Boolean,
      required: true,
    },
    prompt: {
      type: String,
    },
    responseLength: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: {
        documentId: String,
        template: String,
        topic: String,
      },
    },
  },
  {
    timestamps: false,
    collection: 'ai_usage_logs',
  }
);

// Indexes untuk query audit dan analitik
AIUsageLogSchema.index({ customerId: 1, timestamp: -1 });
AIUsageLogSchema.index({ action: 1, timestamp: -1 });
AIUsageLogSchema.index({ customerId: 1, action: 1, timestamp: -1 });

const AIUsageLog = mongoose.models.AIUsageLog || mongoose.model<IAIUsageLog>("AIUsageLog", AIUsageLogSchema);

export default AIUsageLog;
