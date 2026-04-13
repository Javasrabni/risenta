import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/app/models/customer";
import RisentaAdm from "@/app/models/risentaAdm";
import { logAdminAction, getRequestInfo } from "@/lib/adminAudit";

// POST - Add custom AI credits to customer's existing plan (admin only)
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

    const body = await req.json();
    const { customerID, autoGenerateAmount, promptAmount } = body;

    if (!customerID) {
      return NextResponse.json(
        { message: "Missing required field: customerID" },
        { status: 400 }
      );
    }

    if (autoGenerateAmount === undefined && promptAmount === undefined) {
      return NextResponse.json(
        { message: "Missing required fields: autoGenerateAmount or promptAmount" },
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

    // Check if customer has an active plan
    const now = new Date();
    const hasActivePlan = customer.aiUsage?.planExpiresAt && customer.aiUsage.planExpiresAt > now;

    if (!hasActivePlan && customer.subscriptionPlan === 'free') {
      return NextResponse.json(
        { message: "Customer tidak memiliki plan aktif. Silakan aktifkan plan terlebih dahulu." },
        { status: 400 }
      );
    }

    // Add credits
    if (autoGenerateAmount !== undefined && autoGenerateAmount !== 0) {
      customer.aiUsage.autoGenerateRemaining = (customer.aiUsage.autoGenerateRemaining || 0) + autoGenerateAmount;
    }

    if (promptAmount !== undefined && promptAmount !== 0) {
      customer.aiUsage.promptRemaining = (customer.aiUsage.promptRemaining || 0) + promptAmount;
    }

    await customer.save();

    // Log action
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logAdminAction({
      adminID: admin.risentaID,
      adminName: admin.adm_usn,
      isInternalAdmin: admin.isInternalAdmin || false,
      action: 'ADD_AI_CREDITS',
      targetType: 'customer',
      targetId: customerID,
      description: `Added credits to customer ${customer.email}: autoGenerate=${autoGenerateAmount || 0}, prompt=${promptAmount || 0}`,
      ipAddress,
      userAgent,
      subdomain: 'write'
    });

    return NextResponse.json({
      message: "Credits added successfully",
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
    console.error("Add credit error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan kredit." },
      { status: 500 }
    );
  }
}
