import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const response = NextResponse.json(
      { message: "Logout berhasil.", success: true },
      { status: 200 }
    );
    
    // Clear session cookies
    response.cookies.set("customer_session", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 0
    });
    
    response.cookies.set("customer_id", "", {
      httpOnly: false,
      secure: true,
      sameSite: "none",
      path: "/",
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
