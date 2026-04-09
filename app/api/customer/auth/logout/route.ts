import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const response = NextResponse.json(
      { message: "Logout berhasil.", success: true },
      { status: 200 }
    );
    
    const isProd = process.env.NODE_ENV === "production";
    const cookieDomain = isProd ? ".risentta.com" : undefined;
    
    // Clear session cookies
    response.cookies.set("customer_session", "", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "lax" : "none",
      path: "/",
      domain: cookieDomain,
      maxAge: 0
    });
    
    response.cookies.set("customer_id", "", {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? "lax" : "none",
      path: "/",
      domain: cookieDomain,
      maxAge: 0
    });
    
    return response;
    
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat logout." },
      { status: 500 }
    );
  }
}
