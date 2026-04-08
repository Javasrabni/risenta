import Customer from "@/app/models/customer";
import Referral from "@/app/models/referral";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";

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
    
    // Get customer data
    const customer = await Customer.findOne({ customerID });
    if (!customer) {
      return NextResponse.json(
        { loggedIn: false, message: "Customer tidak ditemukan." },
        { status: 404 }
      );
    }
    
    if (!customer.isActive) {
      return NextResponse.json(
        { loggedIn: false, message: "Akun telah dinonaktifkan." },
        { status: 403 }
      );
    }
    
    // Get referral stats
    const referral = await Referral.findOne({ ownerCustomerID: customerID });
    
    return NextResponse.json({
      loggedIn: true,
      customer: {
        customerID: customer.customerID,
        email: customer.email,
        name: customer.name,
        companyName: customer.companyName,
        subscriptionPlan: customer.subscriptionPlan,
        referralCode: customer.referralCode,
        referredBy: customer.referredBy,
        emailVerified: customer.emailVerified,
        lastLogin: customer.lastLogin,
        createdAt: customer.createdAt
      },
      referralStats: referral ? {
        totalSignups: referral.totalSignups,
        activeReferrals: referral.activeReferrals,
        convertedToPaid: referral.convertedToPaid,
        totalRevenue: referral.totalRevenue,
        referredCustomers: referral.referredCustomers
      } : null
    }, { status: 200 });
    
  } catch (error) {
    console.error("Get customer me error:", error);
    return NextResponse.json(
      { loggedIn: false, message: "Terjadi kesalahan." },
      { status: 500 }
    );
  }
}
