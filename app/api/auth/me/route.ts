import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import RisenttaAdm from "@/app/models/risentaAdm";

export async function GET(req: Request) {
  try {
    await connectDB();
    
    // Try to get token from cookies() first
    const cookieStore = await cookies();
    let token = cookieStore.get("session_token");
    
    // Fallback: parse from request headers if cookies() doesn't work
    if (!token) {
      const cookieHeader = req.headers.get('cookie');
      console.log('[Auth/Me] Cookie header:', cookieHeader);
      
      if (cookieHeader) {
        const match = cookieHeader.match(/session_token=([^;]+)/);
        if (match) {
          token = { name: 'session_token', value: match[1] };
          console.log('[Auth/Me] Token from header:', token.value);
        }
      }
    } else {
      console.log('[Auth/Me] Token from cookies():', token.value);
    }

    if (!token) {
      console.log('[Auth/Me] No session_token found');
      return NextResponse.json({ loggedIn: false, debug: 'No token found' });
    }

    // Get admin data from token
    const admin = await RisenttaAdm.findOne({ token: token.value }).lean();
    
    if (!admin) {
      console.log('[Auth/Me] No admin found for token');
      return NextResponse.json({ loggedIn: false, debug: 'Invalid token' });
    }

    return NextResponse.json({
      loggedIn: true,
      role: "admin",
      isInternalAdmin: admin.isInternalAdmin || false,
      admin: {
        _id: admin._id.toString(),
        risentaID: admin.risentaID,
        adm_usn: admin.adm_usn,
        photoProfile: admin.photoProfile,
        isInternalAdmin: admin.isInternalAdmin || false,
      },
    });
  } catch (error) {
    console.error("Error in auth/me:", error);
    return NextResponse.json({ loggedIn: false });
  }
}
