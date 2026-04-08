import Customer from "@/app/models/customer";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const { email, password } = await req.json();
    
    // Validasi input
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }
    
    // Cari customer berdasarkan email
    const customer = await Customer.findOne({ email: email.toLowerCase() });
    if (!customer) {
      return NextResponse.json(
        { message: "Email atau password salah." },
        { status: 401 }
      );
    }
    
    // Cek apakah account aktif
    if (!customer.isActive) {
      return NextResponse.json(
        { message: "Akun telah dinonaktifkan. Silakan hubungi support." },
        { status: 403 }
      );
    }
    
    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Email atau password salah." },
        { status: 401 }
      );
    }
    
    // Update last login
    customer.lastLogin = new Date();
    await customer.save();
    
    // Generate session token (gunakan customerID sebagai token untuk simplicity)
    const sessionToken = `customer_${customer.customerID}_${Date.now()}`;
    
    // Set session cookie
    const response = NextResponse.json(
      {
        message: "Login berhasil!",
        success: true,
        customer: {
          customerID: customer.customerID,
          email: customer.email,
          name: customer.name,
          companyName: customer.companyName,
          subscriptionPlan: customer.subscriptionPlan,
          referralCode: customer.referralCode
        }
      },
      { status: 200 }
    );
    
    // Set cookie dengan domain untuk subdomain write.risentta.com
    response.cookies.set("customer_session", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 7 hari
    });
    
    // Set cookie tambahan untuk identifier (non-httpOnly, bisa diakses JS)
    response.cookies.set("customer_id", customer.customerID, {
      httpOnly: false,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    
    return response;
    
  } catch (error) {
    console.error("Customer login error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat login. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
