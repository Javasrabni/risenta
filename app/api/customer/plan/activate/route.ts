import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/app/models/customer";
import PlanConfig from "@/app/models/planConfig";
import RisentaAdm from "@/app/models/risentaAdm";
import { logAdminAction, getRequestInfo } from "@/lib/adminAudit";

// POST - Activate plan for a customer (admin only until payment gateway is ready)
export async function POST(req: Request) {
  try {
    await connectDB();

    // Get admin session (for now, only admins can activate plans)
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

    const body = await req.json();
    const { customerID, planId } = body;

    if (!customerID || !planId) {
      return NextResponse.json(
        { message: "Missing required fields: customerID, planId" },
        { status: 400 }
      );
    }

    // Get customer
    const customer = await Customer.findOne({ customerID });
    if (!customer) {
      return NextResponse.json(
        { message: "Customer tidak ditemukan." },
        { status: 404 }
      );
    }

    // Get plan configuration
    const planConfig = await PlanConfig.findOne({ planId, isActive: true });
    if (!planConfig) {
      return NextResponse.json(
        { message: "Plan tidak ditemukan atau tidak aktif." },
        { status: 404 }
      );
    }

    // Calculate carry-over from previous plan
    let carriedOverAutoGenerate = 0;
    let carriedOverPrompt = 0;

    if (customer.aiUsage) {
      // If previous plan still has remaining quota, carry it over
      if (customer.aiUsage.autoGenerateRemaining > 0) {
        carriedOverAutoGenerate = customer.aiUsage.autoGenerateRemaining + (customer.aiUsage.carriedOverAutoGenerate || 0);
      }
      if (customer.aiUsage.promptRemaining > 0) {
        carriedOverPrompt = customer.aiUsage.promptRemaining + (customer.aiUsage.carriedOverPrompt || 0);
      }
    }

    // Calculate new quota
    const newAutoGenerate = planConfig.limits.autoGenerate === -1
      ? -1
      : (planConfig.limits.autoGenerate + carriedOverAutoGenerate);

    const newPrompt = planConfig.limits.prompt === -1
      ? -1
      : (planConfig.limits.prompt + carriedOverPrompt);

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + planConfig.durationDays);

    // Update customer
    customer.subscriptionPlan = planId;
    customer.aiUsage = {
      autoGenerateRemaining: newAutoGenerate,
      promptRemaining: newPrompt,
      totalAutoGenerateUsed: customer.aiUsage?.totalAutoGenerateUsed || 0,
      totalPromptUsed: customer.aiUsage?.totalPromptUsed || 0,
      planActivatedAt: now,
      planExpiresAt: expiresAt,
      carriedOverAutoGenerate: carriedOverAutoGenerate > 0 ? carriedOverAutoGenerate : 0,
      carriedOverPrompt: carriedOverPrompt > 0 ? carriedOverPrompt : 0
    };

    await customer.save();

    // Log action
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logAdminAction({
      adminID: admin.risentaID,
      adminName: admin.adm_usn,
      isInternalAdmin: admin.isInternalAdmin || false,
      action: 'ACTIVATE_CUSTOMER_PLAN',
      targetType: 'customer',
      targetId: customerID,
      description: `Activated plan ${planId} for customer ${customer.email}`,
      ipAddress,
      userAgent,
      subdomain: 'write'
    });

    return NextResponse.json({
      message: "Plan activated successfully",
      customer: {
        customerID: customer.customerID,
        subscriptionPlan: customer.subscriptionPlan,
        aiUsage: {
          autoGenerateRemaining: customer.aiUsage.autoGenerateRemaining,
          promptRemaining: customer.aiUsage.promptRemaining,
          planExpiresAt: customer.aiUsage.planExpiresAt
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Activate plan error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengaktifkan plan." },
      { status: 500 }
    );
  }
}
