import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Customer from "@/app/models/customer";
import RisentaAdm from "@/app/models/risentaAdm";
import { logAdminAction, getRequestInfo } from "@/lib/adminAudit";
import { cookies } from "next/headers";

// GET - Get customer AI usage
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

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

    const customer = await Customer.findOne({ customerID: id });
    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      customerId: customer.customerID,
      planId: customer.aiUsage?.planId || 'free',
      autoGenerateRemaining: customer.aiUsage?.autoGenerateRemaining || 0,
      autoGenerateTotal: customer.aiUsage?.autoGenerateTotal || 0,
      promptRemaining: customer.aiUsage?.promptRemaining || 0,
      promptTotal: customer.aiUsage?.promptTotal || 0,
      planActivatedAt: customer.aiUsage?.planActivatedAt,
      planExpiresAt: customer.aiUsage?.planExpiresAt,
    }, { status: 200 });

  } catch (error) {
    console.error("Get customer usage error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data usage." },
      { status: 500 }
    );
  }
}

// POST - Update customer AI usage (admin override)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

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
    const { 
      autoGenerateRemaining, 
      autoGenerateTotal,
      promptRemaining, 
      promptTotal,
      planId,
      planExpiresAt 
    } = body;

    const customer = await Customer.findOne({ customerID: id });
    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};
    
    if (autoGenerateRemaining !== undefined) {
      updateData['aiUsage.autoGenerateRemaining'] = autoGenerateRemaining;
    }
    if (autoGenerateTotal !== undefined) {
      updateData['aiUsage.autoGenerateTotal'] = autoGenerateTotal;
    }
    if (promptRemaining !== undefined) {
      updateData['aiUsage.promptRemaining'] = promptRemaining;
    }
    if (promptTotal !== undefined) {
      updateData['aiUsage.promptTotal'] = promptTotal;
    }
    if (planId !== undefined) {
      updateData['aiUsage.planId'] = planId;
    }
    if (planExpiresAt !== undefined) {
      updateData['aiUsage.planExpiresAt'] = planExpiresAt ? new Date(planExpiresAt) : null;
    }

    // Update customer
    await Customer.findOneAndUpdate(
      { customerID: id },
      { $set: updateData },
      { new: true }
    );

    // Log action
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logAdminAction({
      adminID: admin.risentaID,
      adminName: admin.adm_usn,
      isInternalAdmin: admin.isInternalAdmin || false,
      action: 'UPDATE_CUSTOMER_USAGE',
      targetType: 'customer',
      targetId: id,
      description: `Updated AI usage for customer ${id}: ${JSON.stringify(updateData)}`,
      ipAddress,
      userAgent,
      subdomain: 'write'
    });

    return NextResponse.json({
      message: "Customer usage updated successfully",
      updates: updateData
    }, { status: 200 });

  } catch (error) {
    console.error("Update customer usage error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate usage." },
      { status: 500 }
    );
  }
}
