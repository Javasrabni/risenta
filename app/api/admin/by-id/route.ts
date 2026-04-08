import RisenttaAdm from "@/app/models/risentaAdm";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    // Verify session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get risentaID from query params
    const { searchParams } = new URL(req.url);
    const risentaID = searchParams.get("id");

    if (!risentaID) {
      return NextResponse.json(
        { message: "RisenttaID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find admin by risentaID
    const admin = await RisenttaAdm.findOne(
      { risentaID },
      { risentaID: 1, adm_usn: 1, photoProfile: 1, cloudinaryPublicId: 1, position: 1, _id: 0 }
    );

    if (!admin) {
      return NextResponse.json(
        { message: "Admin not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { admin },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get admin error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
