import Customer from "@/app/models/customer";
import RisentaAdm from "@/app/models/risentaAdm";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const { identifier, password } = await req.json();
    
    if (!identifier || !password) {
      return NextResponse.json(
        { message: "Email/ID dan password diperlukan" },
        { status: 400 }
      );
    }
    
    // Try customer login first (email-based)
    const customer = await Customer.findOne({ email: identifier.toLowerCase() });
    
    if (customer) {
      // Check if account is active
      if (!customer.isActive) {
        return NextResponse.json(
          { message: "Akun telah dinonaktifkan. Silakan hubungi support." },
          { status: 403 }
        );
      }
      
      // Verify password
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
      
      // Generate session token
      const sessionToken = `customer_${customer.customerID}_${Date.now()}`;
      
      // Set cookies
      const response = NextResponse.json({
        message: "Login berhasil",
        success: true,
        userType: "customer",
        customer: {
          customerID: customer.customerID,
          email: customer.email,
          name: customer.name,
          subscriptionPlan: customer.subscriptionPlan
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
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      
      response.cookies.set("customer_id", customer.customerID, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "lax" : "none",
        path: "/",
        domain: cookieDomain,
        maxAge: 60 * 60 * 24 * 7,
      });
      
      return response;
    }
    
    // Try admin login (RisentaID or username based)
    const admin = await RisentaAdm.findOne({
      $or: [
        { risentaID: identifier },
        { adm_usn: identifier }
      ]
    });
    
    if (admin) {
      // Verify token (admin uses token as password)
      const cleanToken = password.trim();
      
      if (cleanToken === admin.token) {
        const response = NextResponse.json({
          message: "Login berhasil",
          success: true,
          userType: "admin",
          isInternalAdmin: admin.isInternalAdmin || false,
          admin: {
            risentaID: admin.risentaID,
            adm_usn: admin.adm_usn,
            photoProfile: admin.photoProfile,
            isInternalAdmin: admin.isInternalAdmin || false
          }
        }, { status: 200 });
        
        // Set session cookie
        const isProd = process.env.NODE_ENV === "production";
        const cookieDomain = isProd ? ".risentta.com" : undefined;
        
        response.cookies.set("session_token", admin.token, {
          httpOnly: true,
          secure: isProd,
          sameSite: isProd ? "lax" : "none",
          path: "/",
          domain: cookieDomain,
          maxAge: 60 * 60 * 24, // 1 day
        });
        
        return response;
      } else {
        return NextResponse.json(
          { message: "ID atau token salah." },
          { status: 401 }
        );
      }
    }
    
    // No user found
    return NextResponse.json(
      { message: "Email/ID atau password salah." },
      { status: 401 }
    );
    
  } catch (error) {
    console.error("SSO Login error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat login" },
      { status: 500 }
    );
  }
}
