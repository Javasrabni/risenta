import RisentaAdm from "@/app/models/risentaAdm";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  console.log(await RisentaAdm.collection.name);

  try {
    await connectDB();
    const { risentaID, token } = await req.json();
    const cleanRisentaID = risentaID?.trim();
    const cleanToken = token?.trim();

    if (!cleanRisentaID || !cleanToken) {
      return NextResponse.json(
        { message: "Masukkan ID atau Token terlebih dahulu." },
        { status: 400 }
      );
    }

    const admin = await RisentaAdm.findOne({ risentaID: cleanRisentaID });
    if (!admin) {
      return NextResponse.json(
        { message: "Risenta ID tidak ditemukan." },
        { status: 400 }
      );
    }

    if (cleanToken === admin.token) {
      const response = NextResponse.json(
        { message: "Login berhasil", success: true },
        { status: 200 }
      );

      response.cookies.set("session_token", admin.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
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
