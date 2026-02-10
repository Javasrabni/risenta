import { NextResponse } from "next/server";
import connectDB from "@/utils/mongodb";
import RisentaAdm from "@/app/models/risentaAdm";

export async function GET() {
  try {
    await connectDB();
    const admin = await RisentaAdm.find({}).select("token");
    return NextResponse.json(
      {
        success: true,
        data: admin,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data admin" },
      { status: 500 }
    );
  }
}
