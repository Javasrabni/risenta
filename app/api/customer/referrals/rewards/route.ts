import ReferralReward from "@/app/models/referralReward";
import Customer from "@/app/models/customer";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";

// GET - Get customer's referral rewards
export async function GET(req: Request) {
  try {
    await connectDB();
    
    // Get customer session
    const cookieHeader = req.headers.get('cookie');
    const customerSession = cookieHeader?.match(/customer_session=([^;]+)/)?.[1];
    const customerID = cookieHeader?.match(/customer_id=([^;]+)/)?.[1];
    
    if (!customerSession || !customerID) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get query params
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || '';
    
    // Build query
    const query: any = { recipientCustomerID: customerID };
    if (status) {
      query.status = status;
    }
    
    // Get rewards
    const rewards = await ReferralReward.find(query)
      .sort({ createdAt: -1 });
    
    // Get stats
    const stats = await ReferralReward.getRewardStats(customerID);
    const pendingTotal = await ReferralReward.getPendingRewardsTotal(customerID);
    
    return NextResponse.json({
      rewards,
      stats,
      pendingTotal
    }, { status: 200 });
    
  } catch (error) {
    console.error("Get rewards error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// POST - Create reward (triggered when referral upgrades or signs up)
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const { 
      recipientCustomerID, 
      referredCustomerID, 
      rewardType,
      rewardValue,
      triggeredBy 
    } = await req.json();
    
    if (!recipientCustomerID || !referredCustomerID) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Get recipient info
    const recipient = await Customer.findOne({ customerID: recipientCustomerID });
    if (!recipient) {
      return NextResponse.json(
        { message: "Recipient not found" },
        { status: 404 }
      );
    }
    
    // Get referred customer info
    const referred = await Customer.findOne({ customerID: referredCustomerID });
    if (!referred) {
      return NextResponse.json(
        { message: "Referred customer not found" },
        { status: 404 }
      );
    }
    
    // Create reward
    const reward = new ReferralReward({
      recipientCustomerID: recipient.customerID,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      referredCustomerID: referred.customerID,
      referredCustomerEmail: referred.email,
      rewardType: rewardType || 'signup_bonus',
      rewardValue: rewardValue || 10, // Default 10 credits
      rewardCurrency: 'credits',
      description: `Reward for referring ${referred.name}`,
      status: 'pending',
      triggeredBy: triggeredBy || 'signup',
      subscriptionPlan: referred.subscriptionPlan
    });
    
    await reward.save();
    
    return NextResponse.json({
      message: "Reward created successfully",
      reward
    }, { status: 201 });
    
  } catch (error) {
    console.error("Create reward error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
