import Customer from "@/app/models/customer";
import Referral from "@/app/models/referral";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const { email, name, googleId, picture } = await req.json();
    
    if (!email || !googleId) {
      return NextResponse.json(
        { message: "Email dan Google ID wajib diisi." },
        { status: 400 }
      );
    }
    
    // Cek apakah customer sudah terdaftar dengan email ini
    let customer = await Customer.findOne({ email: email.toLowerCase() });
    
    if (customer) {
      // Customer sudah ada, update last login
      if (!customer.isActive) {
        return NextResponse.json(
          { message: "Akun telah dinonaktifkan. Silakan hubungi support." },
          { status: 403 }
        );
      }
      
      customer.lastLogin = new Date();
      await customer.save();
    } else {
      // Customer belum ada, buat akun baru
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const customerID = `CST${timestamp}${random}`;
      
      const refTimestamp = Date.now().toString(36).toUpperCase();
      const refRandom = Math.random().toString(36).substring(2, 5).toUpperCase();
      const referralCode = `REF${refTimestamp}${refRandom}`;
      
      // Generate random password (customer bisa set password later)
      const randomPassword = Math.random().toString(36).substring(2, 15);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      customer = new Customer({
        customerID,
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || email.split('@')[0],
        companyName: "",
        subscriptionPlan: 'free',
        isActive: true,
        referralCode,
        emailVerified: true, // Google email sudah verified
        lastLogin: new Date()
      });
      
      await customer.save();
      
      // Buat referral record
      const newReferral = new Referral({
        referralCode: customer.referralCode,
        ownerCustomerID: customer.customerID,
        ownerEmail: customer.email,
        ownerName: customer.name,
        totalSignups: 0,
        activeReferrals: 0,
        convertedToPaid: 0,
        referredCustomers: [],
        totalRevenue: 0
      });
      await newReferral.save();
    }
    
    // Generate session token
    const sessionToken = `customer_${customer.customerID}_${Date.now()}`;
    
    // Set cookies
    const response = NextResponse.json({
      message: "Login dengan Google berhasil!",
      success: true,
      customer: {
        customerID: customer.customerID,
        email: customer.email,
        name: customer.name,
        companyName: customer.companyName,
        subscriptionPlan: customer.subscriptionPlan,
        referralCode: customer.referralCode
      }
    }, { status: 200 });
    
    const isProd = process.env.NODE_ENV === "production";
    const cookieDomain = isProd ? ".risentta.com" : undefined;
    
    response.cookies.set("customer_session", sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "lax" : "none",
      path: "/",
      domain: cookieDomain,
      maxAge: 60 * 60 * 24 * 7 // 7 hari
    });
    
    response.cookies.set("customer_id", customer.customerID, {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? "lax" : "none",
      path: "/",
      domain: cookieDomain,
      maxAge: 60 * 60 * 24 * 7
    });
    
    return response;
    
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat login dengan Google." },
      { status: 500 }
    );
  }
}
