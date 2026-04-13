import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import RisenttaAdm from "@/app/models/risentaAdm";

export async function GET() {
  try {
    await connectDB();
    
    const admins = await RisenttaAdm.find(
      {}, 
      { risentaID: 1, adm_usn: 1, _id: 0 }
    ).lean();
    
    return NextResponse.json(admins);
  } catch (error) {
    console.error("Error fetching all admins:", error);
    return NextResponse.json(
      { message: "Failed to fetch admins" },
      { status: 500 }
    );
  }
}
