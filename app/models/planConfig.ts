import mongoose, { Schema, Document } from "mongoose";

export interface IPlanLimits {
  autoGenerate: number;
  prompt: number;
  dailyAutoGenerateCap?: number;
  dailyPromptCap?: number;
}

export interface IPlanConfig extends Document {
  planId: 'free' | 'daily-12k' | 'weekly-25k' | 'biweekly-49k';
  name: string;
  price: number;
  durationDays: number;
  limits: IPlanLimits;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanLimitsSchema = new Schema<IPlanLimits>(
  {
    autoGenerate: { type: Number, required: true },
    prompt: { type: Number, required: true },
    dailyAutoGenerateCap: { type: Number },
    dailyPromptCap: { type: Number },
  },
  { _id: false }
);

const PlanConfigSchema = new Schema<IPlanConfig>(
  {
    planId: {
      type: String,
      enum: ['free', 'daily-12k', 'weekly-25k', 'biweekly-49k'],
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    durationDays: {
      type: Number,
      required: true,
    },
    limits: {
      type: PlanLimitsSchema,
      required: true,
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'plan_configs',
  }
);

// Index untuk query cepat
PlanConfigSchema.index({ planId: 1 });
PlanConfigSchema.index({ isActive: 1 });

const PlanConfig = mongoose.models.PlanConfig || mongoose.model<IPlanConfig>("PlanConfig", PlanConfigSchema);

export default PlanConfig;
