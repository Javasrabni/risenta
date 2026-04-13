import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PlanConfig from "@/app/models/planConfig";

// GET - List all active plan configurations (public API, no auth required)
export async function GET(req: Request) {
  try {
    await connectDB();

    const plans = await PlanConfig.find({ isActive: true }).sort({ price: 1 }).lean();

    return NextResponse.json({ plans }, { status: 200 });

  } catch (error) {
    console.error("Get plans error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data plan." },
      { status: 500 }
    );
  }
}
