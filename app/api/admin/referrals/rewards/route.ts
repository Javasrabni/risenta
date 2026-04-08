import ReferralReward from "@/app/models/referralReward";
import RisentaAdm from "@/app/models/risentaAdm";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { logAdminAction, getRequestInfo } from "@/lib/adminAudit";

// GET - Get all referral rewards (admin only)
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
    const status = url.searchParams.get('status') || '';
    const customerID = url.searchParams.get('customerID') || '';
    
    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (customerID) {
      query.recipientCustomerID = customerID;
    }
    
    // Get rewards with pagination
    const skip = (page - 1) * limit;
    const rewards = await ReferralReward.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await ReferralReward.countDocuments(query);
    
    // Get stats
    const stats = await ReferralReward.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalValue: { $sum: "$rewardValue" }
        }
      }
    ]);
    
    return NextResponse.json({
      rewards,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error("Get admin rewards error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// PUT - Approve and pay reward (admin only)
export async function PUT(req: Request) {
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
    
    const { rewardID, paymentMethod, paymentReference } = await req.json();
    
    if (!rewardID) {
      return NextResponse.json(
        { message: "Reward ID required" },
        { status: 400 }
      );
    }
    
    // Find reward
    const reward = await ReferralReward.findById(rewardID);
    if (!reward) {
      return NextResponse.json(
        { message: "Reward not found" },
        { status: 404 }
      );
    }
    
    if (reward.status !== 'pending') {
      return NextResponse.json(
        { message: `Reward is already ${reward.status}` },
        { status: 400 }
      );
    }
    
    // Update reward
    reward.status = 'paid';
    reward.paidAt = new Date();
    reward.paidBy = admin.adm_usn;
    reward.paymentMethod = paymentMethod || 'manual';
    reward.paymentReference = paymentReference || '';
    
    await reward.save();
    
    // Log action
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logAdminAction({
      adminID: admin.risentaID,
      adminName: admin.adm_usn,
      isInternalAdmin: admin.isInternalAdmin || false,
      action: 'MANAGE_REFERRAL',
      targetType: 'referral',
      description: `Paid referral reward ${rewardID} to ${reward.recipientEmail}`,
      ipAddress,
      userAgent,
      subdomain: 'write'
    });
    
    return NextResponse.json({
      message: "Reward paid successfully",
      reward
    }, { status: 200 });
    
  } catch (error) {
    console.error("Pay reward error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
