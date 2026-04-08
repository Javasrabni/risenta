import Customer from "@/app/models/customer";
import Referral from "@/app/models/referral";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const { email, password, name, companyName, referralCode } = await req.json();
    
    // Validasi input
    if (!email || !password || !name) {
      return NextResponse.json(
        { message: "Email, password, dan nama wajib diisi." },
        { status: 400 }
      );
    }
    
    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Format email tidak valid." },
        { status: 400 }
      );
    }
    
    // Validasi password strength
    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password minimal 8 karakter." },
        { status: 400 }
      );
    }
    
    // Cek apakah email sudah terdaftar
    const existingCustomer = await Customer.findOne({ email: email.toLowerCase() });
    if (existingCustomer) {
      return NextResponse.json(
        { message: "Email sudah terdaftar. Silakan login." },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Siapkan data customer
    const customerData: any = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      companyName: companyName?.trim() || "",
      subscriptionPlan: 'free',
      isActive: true,
      emailVerified: false
    };
    
    // Cek referral code jika ada
    let referredBy = null;
    if (referralCode) {
      const referral = await Referral.findOne({ referralCode: referralCode.toUpperCase() });
      if (referral && referral.isActive) {
        referredBy = referral.ownerCustomerID;
        customerData.referredBy = referredBy;
        
        // Update referral stats (akan dilakukan setelah customer dibuat)
      }
    }
    
    // Buat customer baru
    const customer = new Customer(customerData);
    await customer.save();
    
    // Buat referral record untuk customer baru
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
    
    // Update referral stats jika ada referrer
    if (referredBy && referralCode) {
      const referrerReferral = await Referral.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrerReferral) {
        await referrerReferral.addReferredCustomer({
          customerID: customer.customerID,
          email: customer.email,
          name: customer.name,
          signupDate: new Date(),
          subscriptionPlan: customer.subscriptionPlan
        });
      }
    }
    
    // Set session cookie
    const response = NextResponse.json(
      {
        message: "Registrasi berhasil! Silakan login.",
        success: true,
        customer: {
          customerID: customer.customerID,
          email: customer.email,
          name: customer.name,
          referralCode: customer.referralCode
        }
      },
      { status: 201 }
    );
    
    return response;
    
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat registrasi. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
