import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/app/models/customer";
import PlanConfig from "@/app/models/planConfig";

// GET - Get current customer's plan and usage
export async function GET(req: Request) {
  try {
    await connectDB();

    // Get customer session from cookie
    const cookieHeader = req.headers.get('cookie');
    const customerSession = cookieHeader?.match(/customer_session=([^;]+)/)?.[1];
    const customerID = cookieHeader?.match(/customer_id=([^;]+)/)?.[1];

    if (!customerSession || !customerID) {
      return NextResponse.json(
        { loggedIn: false, message: "Tidak ada session." },
        { status: 401 }
      );
    }

    // Verify session format
    if (!customerSession.startsWith(`customer_${customerID}_`)) {
      return NextResponse.json(
        { loggedIn: false, message: "Session tidak valid." },
        { status: 401 }
      );
    }

    // Get customer data with AI usage
    const customer = await Customer.findOne({ customerID }).select('+aiUsage');
    if (!customer) {
      return NextResponse.json(
        { loggedIn: false, message: "Customer tidak ditemukan." },
        { status: 404 }
      );
    }

    // Get plan configuration
    const planConfig = await PlanConfig.findOne({ planId: customer.subscriptionPlan });

    // Check if plan has expired
    const now = new Date();
    const isExpired = customer.aiUsage?.planExpiresAt && customer.aiUsage.planExpiresAt < now;

    // Calculate totals (including carried over)
    const totalAutoGenerate = (customer.aiUsage?.autoGenerateRemaining || 0) + (customer.aiUsage?.carriedOverAutoGenerate || 0);
    const totalPrompt = (customer.aiUsage?.promptRemaining || 0) + (customer.aiUsage?.carriedOverPrompt || 0);

    return NextResponse.json({
      loggedIn: true,
      plan: {
        planId: customer.subscriptionPlan,
        planName: planConfig?.name || customer.subscriptionPlan,
        price: planConfig?.price || 0,
        durationDays: planConfig?.durationDays || 0,
        limits: planConfig?.limits || {
          autoGenerate: customer.subscriptionPlan === 'free' ? 1 : 0,
          prompt: customer.subscriptionPlan === 'free' ? 4 : 0
        },
        isExpired: !!isExpired,
        activatedAt: customer.aiUsage?.planActivatedAt,
        expiresAt: customer.aiUsage?.planExpiresAt
      },
      usage: {
        autoGenerateRemaining: customer.aiUsage?.autoGenerateRemaining || 0,
        autoGenerateCarriedOver: customer.aiUsage?.carriedOverAutoGenerate || 0,
        autoGenerateTotal: totalAutoGenerate,
        promptRemaining: customer.aiUsage?.promptRemaining || 0,
        promptCarriedOver: customer.aiUsage?.carriedOverPrompt || 0,
        promptTotal: totalPrompt,
        totalAutoGenerateUsed: customer.aiUsage?.totalAutoGenerateUsed || 0,
        totalPromptUsed: customer.aiUsage?.totalPromptUsed || 0
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Get customer plan error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data plan." },
      { status: 500 }
    );
  }
}
