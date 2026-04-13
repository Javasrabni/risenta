import Customer from "@/app/models/customer";
import RisentaAdm from "@/app/models/risentaAdm";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { logAdminAction, getRequestInfo } from "@/lib/adminAudit";
import { cookies } from "next/headers";

// GET - List all customers (admin only)
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
    
    // Get query params for pagination and filtering
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const plan = url.searchParams.get('plan') || '';
    const status = url.searchParams.get('status') || '';
    
    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { customerID: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (plan) {
      query.subscriptionPlan = plan;
    }
    
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    // Get customers with pagination
    const skip = (page - 1) * limit;
    const customers = await Customer.find(query)
      .select('-password') // Exclude password
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Customer.countDocuments(query);
    
    // Log view action
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logAdminAction({
      adminID: admin.risentaID,
      adminName: admin.adm_usn,
      isInternalAdmin: admin.isInternalAdmin || false,
      action: 'VIEW_CUSTOMER_DATA',
      targetType: 'system',
      description: `Viewed customer list (page ${page}, search: "${search}")`,
      ipAddress,
      userAgent,
      subdomain: 'write'
    });
    
    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error("Get customers error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data customer." },
      { status: 500 }
    );
  }
}
