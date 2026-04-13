import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PlanConfig from "@/app/models/planConfig";
import RisentaAdm from "@/app/models/risentaAdm";
import { logAdminAction, getRequestInfo } from "@/lib/adminAudit";

const defaultPlans = [
  {
    planId: 'free',
    name: 'Free',
    price: 0,
    durationDays: 365,
    limits: {
      autoGenerate: 1,
      prompt: 4,
    },
    features: ['1x Auto-generate', '4x Prompt AI', 'Basic features'],
    isActive: true,
  },
  {
    planId: 'daily-12k',
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
    planId: 'weekly-25k',
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
    planId: 'biweekly-49k',
    name: '2 Minggu (49K)',
    price: 49000,
    durationDays: 14,
    limits: {
      autoGenerate: -1,
      prompt: -1,
      dailyAutoGenerateCap: 10000,
      dailyPromptCap: 23,
    },
    features: ['Unlimited Auto-generate (10k/hari)', 'Unlimited Prompt (23/hari)', 'All features', '14 days duration'],
    isActive: true,
  },
];

// POST - Seed default plans (admin only)
export async function POST(req: Request) {
  try {
    await connectDB();

    // Get admin session
    const cookieHeader = req.headers.get('cookie');
    const sessionToken = cookieHeader?.match(/session_token=([^;]+)/)?.[1];

    if (!sessionToken) {
      return NextResponse.json(
        { message: "Unauthorized. Admin access only." },
        { status: 401 }
      );
    }

    // Verify admin
    const admin = await RisentaAdm.findOne({ token: sessionToken });
    if (!admin) {
      return NextResponse.json(
        { message: "Unauthorized. Invalid admin session." },
        { status: 401 }
      );
    }

    // Seed default plans
    const results = [];
    for (const plan of defaultPlans) {
      const updated = await PlanConfig.findOneAndUpdate(
        { planId: plan.planId },
        plan,
        { upsert: true, new: true }
      );
      results.push({
        planId: plan.planId,
        name: plan.name,
        action: updated.createdAt === updated.updatedAt ? 'created' : 'updated'
      });
    }

    // Log action
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logAdminAction({
      adminID: admin.risentaID,
      adminName: admin.adm_usn,
      isInternalAdmin: admin.isInternalAdmin || false,
      action: 'SEED_PLANS',
      targetType: 'system',
      description: `Seeded ${results.length} default plans`,
      ipAddress,
      userAgent,
      subdomain: 'write'
    });

    return NextResponse.json({
      message: "Default plans seeded successfully",
      results,
      count: results.length
    }, { status: 200 });

  } catch (error) {
    console.error("Seed plans error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat seeding plans." },
      { status: 500 }
    );
  }
}
