/**
 * Seed script untuk menginisialisasi plan configurations default
 * Run with: npx ts-node scripts/seedPlans.ts
 */

import connectDB from '../lib/mongodb';
import PlanConfig from '../app/models/planConfig';

const defaultPlans = [
  {
    planId: 'free' as const,
    name: 'Free',
    price: 0,
    durationDays: 365, // 1 year effective
    limits: {
      autoGenerate: 1,
      prompt: 4,
    },
    features: ['1x Auto-generate', '4x Prompt AI', 'Basic features'],
    isActive: true,
  },
  {
    planId: 'daily-12k' as const,
    name: 'Harian (12K)',
    price: 12000,
    durationDays: 1,
    limits: {
      autoGenerate: 3,
      prompt: 8,
    },
    features: ['3x Auto-generate', '8x Prompt AI', 'All features', '1 day duration'],
    isActive: true,
  },
  {
    planId: 'weekly-25k' as const,
    name: 'Mingguan (25K)',
    price: 25000,
    durationDays: 7,
    limits: {
      autoGenerate: 5,
      prompt: 12,
    },
    features: ['5x Auto-generate', '12x Prompt AI', 'All features', '7 days duration'],
    isActive: true,
  },
  {
    planId: 'biweekly-49k' as const,
    name: '2 Minggu (49K)',
    price: 49000,
    durationDays: 14,
    limits: {
      autoGenerate: -1, // Unlimited
      prompt: -1, // Unlimited
      dailyAutoGenerateCap: 10000,
      dailyPromptCap: 23,
    },
    features: ['Unlimited Auto-generate (10k/hari)', 'Unlimited Prompt (23/hari)', 'All features', '14 days duration'],
    isActive: true,
  },
];

async function seedPlans() {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Seeding plan configurations...');

    for (const plan of defaultPlans) {
      await PlanConfig.findOneAndUpdate(
        { planId: plan.planId },
        plan,
        { upsert: true, new: true }
      );
      console.log(`✓ Plan "${plan.name}" seeded/updated`);
    }

    console.log('\n✅ All plans seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedPlans();
}

export default seedPlans;
