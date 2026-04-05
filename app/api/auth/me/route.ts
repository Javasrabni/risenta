import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import RisentaAdm from "@/app/models/risentaAdm";

export async function GET() {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token");

    if (!token) {
      return NextResponse.json({ loggedIn: false });
    }

    // Get admin data from token
    const admin = await RisentaAdm.findOne({ token: token.value }).lean();
    
    if (!admin) {
      return NextResponse.json({ loggedIn: false });
    }

    return NextResponse.json({
      loggedIn: true,
      role: "admin",
      admin: {
        _id: admin._id.toString(),
        adm_usn: admin.adm_usn,
        photoProfile: admin.photoProfile,
      },
    });
  } catch (error) {
    console.error("Error in auth/me:", error);
    return NextResponse.json({ loggedIn: false });
  }
}
