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

      response.cookies.set("session_token", admin.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
        domain: ".risentta.com"
      });

      return response;
    }

    return NextResponse.json({ message: "Token salah!" }, { status: 401 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
