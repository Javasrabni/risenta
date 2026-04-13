import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PlanConfig from "@/app/models/planConfig";
import RisentaAdm from "@/app/models/risentaAdm";
import { logAdminAction, getRequestInfo } from "@/lib/adminAudit";
import { cookies } from "next/headers";

// GET - List all plan configurations (admin only)
export async function GET(req: Request) {
  try {
    await connectDB();

    // Get admin session using cookies() from next/headers
    const cookieStore = await cookies();
    const sessionTokenCookie = cookieStore.get("session_token");
    let sessionToken = sessionTokenCookie?.value;
    
    // Fallback: parse from request headers if cookies() doesn't work
    if (!sessionToken) {
      const cookieHeader = req.headers.get('cookie');
      const match = cookieHeader?.match(/session_token=([^;]+)/);
      if (match) {
        sessionToken = match[1];
      }
    }

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

    const plans = await PlanConfig.find({ isActive: true }).sort({ price: 1 });

    // Log view action
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logAdminAction({
      adminID: admin.risentaID,
      adminName: admin.adm_usn,
      isInternalAdmin: admin.isInternalAdmin || false,
      action: 'VIEW_PLAN_CONFIGS',
      targetType: 'system',
      description: 'Viewed plan configurations',
      ipAddress,
      userAgent,
      subdomain: 'write'
    });

    return NextResponse.json({ plans }, { status: 200 });

  } catch (error) {
    console.error("Get plans error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data plan." },
      { status: 500 }
    );
  }
}

// POST - Create or update plan configuration (admin only)
export async function POST(req: Request) {
  try {
    await connectDB();

    // Get admin session using cookies() from next/headers
    const cookieStore = await cookies();
    const sessionTokenCookie = cookieStore.get("session_token");
    let sessionToken = sessionTokenCookie?.value;
    
    // Fallback: parse from request headers if cookies() doesn't work
    if (!sessionToken) {
      const cookieHeader = req.headers.get('cookie');
      const match = cookieHeader?.match(/session_token=([^;]+)/);
      if (match) {
        sessionToken = match[1];
      }
    }

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
    const { planId, name, price, durationDays, limits, features } = body;

    // Validate required fields
    if (!planId || !name || price === undefined || !durationDays || !limits) {
      return NextResponse.json(
        { message: "Missing required fields: planId, name, price, durationDays, limits" },
        { status: 400 }
      );
    }

    // Validate limits structure
    if (limits.autoGenerate === undefined || limits.prompt === undefined) {
      return NextResponse.json(
        { message: "Invalid limits structure. Required: autoGenerate, prompt" },
        { status: 400 }
      );
    }

    // Upsert plan config
    const plan = await PlanConfig.findOneAndUpdate(
      { planId },
      {
        planId,
        name,
        price,
        durationDays,
        limits,
        features: features || [],
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Log action
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logAdminAction({
      adminID: admin.risentaID,
      adminName: admin.adm_usn,
      isInternalAdmin: admin.isInternalAdmin || false,
      action: 'UPDATE_PLAN_CONFIG',
      targetType: 'system',
      targetId: planId,
      description: `Updated plan configuration: ${name}`,
      ipAddress,
      userAgent,
      subdomain: 'write'
    });

    return NextResponse.json(
      { message: "Plan configuration saved successfully", plan },
      { status: 200 }
    );

  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyimpan plan." },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate a plan (admin only)
export async function DELETE(req: Request) {
  try {
    await connectDB();

    // Get admin session using cookies() from next/headers
    const cookieStore = await cookies();
    const sessionTokenCookie = cookieStore.get("session_token");
    let sessionToken = sessionTokenCookie?.value;
    
    // Fallback: parse from request headers if cookies() doesn't work
    if (!sessionToken) {
      const cookieHeader = req.headers.get('cookie');
      const match = cookieHeader?.match(/session_token=([^;]+)/);
      if (match) {
        sessionToken = match[1];
      }
    }

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

    const url = new URL(req.url);
    const planId = url.searchParams.get('planId');

    if (!planId) {
      return NextResponse.json(
        { message: "planId query parameter is required" },
        { status: 400 }
      );
    }

    const plan = await PlanConfig.findOneAndUpdate(
      { planId },
      { isActive: false },
      { new: true }
    );

    if (!plan) {
      return NextResponse.json(
        { message: "Plan not found" },
        { status: 404 }
      );
    }

    // Log action
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logAdminAction({
      adminID: admin.risentaID,
      adminName: admin.adm_usn,
      isInternalAdmin: admin.isInternalAdmin || false,
      action: 'DEACTIVATE_PLAN',
      targetType: 'system',
      targetId: planId,
      description: `Deactivated plan: ${planId}`,
      ipAddress,
      userAgent,
      subdomain: 'write'
    });

    return NextResponse.json(
      { message: "Plan deactivated successfully" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Delete plan error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menonaktifkan plan." },
      { status: 500 }
    );
  }
}
