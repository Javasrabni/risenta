import RisenttaAdm from "@/app/models/risentaAdm";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
// import { cookies } from "next/headers";

export async function POST(req: Request) {
  // console.log(await RisenttaAdm.collection.name);

  try {
    await connectDB();
    const { risentaID, token } = await req.json();
    const cleanRisenttaID = risentaID?.trim();
    const cleanToken = token?.trim();

    // Debug headers
    const headers = req.headers;
    const host = headers.get('host');
    const origin = headers.get('origin');
    console.log("[Login API] Host:", host);
    console.log("[Login API] Origin:", origin);
    console.log("[Login API] Node Env:", process.env.NODE_ENV);

    if (!cleanRisenttaID || !cleanToken) {
      return NextResponse.json(
        { message: "Masukkan ID atau Token terlebih dahulu." },
        { status: 400 }
      );
    }

    const admin = await RisenttaAdm.findOne({ risentaID: cleanRisenttaID });
    if (!admin) {
      return NextResponse.json(
        { message: "Risentta ID tidak ditemukan." },
        { status: 400 }
      );
    }

    if (cleanToken === admin.token) {
      const response = NextResponse.json(
        { 
          message: "Login berhasil", 
          success: true,
          isInternalAdmin: admin.isInternalAdmin || false
        },
        { status: 200 }
      );

      const isProd = process.env.NODE_ENV === "production";
      
      console.log("[Login API] Setting cookie - isProd:", isProd);
      
      // Cookie options for production vs development
      const cookieOptions: any = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "lax" : "lax", // Use lax for both - none requires secure
        path: "/",
        maxAge: 60 * 60 * 24
      };
      
      // Only set domain in production for cross-subdomain sharing
      if (isProd) {
        cookieOptions.domain = ".risentta.com";
      }
      
      console.log("[Login API] Cookie options:", cookieOptions);
      
      response.cookies.set("session_token", admin.token, cookieOptions);

      return response;
    }

    return NextResponse.json({ message: "Token salah!" }, { status: 401 });
  } catch (error) {
    console.error("[Login API] Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
