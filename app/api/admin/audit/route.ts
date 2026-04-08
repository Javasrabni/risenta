import AdminAudit from "@/app/models/adminAudit";
import RisentaAdm from "@/app/models/risentaAdm";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";

// GET - Get audit trail (admin only)
export async function GET(req: Request) {
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
    
    const admin = await RisentaAdm.findOne({ token: sessionToken });
    if (!admin) {
      return NextResponse.json(
        { message: "Unauthorized. Invalid admin session." },
        { status: 401 }
      );
    }
    
    // Get query params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const adminID = url.searchParams.get('adminID') || '';
    const action = url.searchParams.get('action') || '';
    const targetCustomerID = url.searchParams.get('customerID') || '';
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';
    
    // Build query
    const query: any = {};
    
    if (adminID) {
      query.adminID = adminID;
    }
    
    if (action) {
      query.action = action;
    }
    
    if (targetCustomerID) {
      query.targetCustomerID = targetCustomerID;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    // Get audit logs with pagination
    const skip = (page - 1) * limit;
    const auditLogs = await AdminAudit.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await AdminAudit.countDocuments(query);
    
    // Get unique actions for filtering
    const actions = await AdminAudit.distinct('action');
    
    return NextResponse.json({
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        actions
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error("Get audit trail error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil audit trail." },
      { status: 500 }
    );
  }
}
