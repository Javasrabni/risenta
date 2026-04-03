import RisentaAdm from "@/app/models/risentaAdm";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// PUT handler specifically for position updates
export async function PUT(req: Request) {
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

    const { risentaID, position } = await req.json();

    if (!risentaID) {
      return NextResponse.json(
        { message: "RisentaID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Update only position using findOneAndUpdate for atomic update
    const admin = await RisentaAdm.findOneAndUpdate(
      { risentaID },
      { position },
      { new: true, runValidators: true }
    );
    
    if (!admin) {
      return NextResponse.json(
        { message: "Admin not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Position updated successfully", admin },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update position error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const { risentaID, photoProfile, photoProfileBuffer, photoProfileContentType, position } = await req.json();

    if (!risentaID) {
      return NextResponse.json(
        { message: "RisentaID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Update admin profile
    const admin = await RisentaAdm.findOne({ risentaID });
    
    if (!admin) {
      return NextResponse.json(
        { message: "Admin not found" },
        { status: 404 }
      );
    }

    // Update photoProfile
    if (photoProfile !== undefined) {
      admin.photoProfile = photoProfile;
    }
    
    // Update binary image data
    if (photoProfileBuffer) {
      // Convert base64 to Buffer
      const buffer = Buffer.from(photoProfileBuffer, 'base64');
      admin.photoProfileBuffer = buffer;
      admin.photoProfileContentType = photoProfileContentType || 'image/jpeg';
    }
    
    // Update position
    if (position !== undefined) {
      admin.position = position;
    }
    
    await admin.save();

    return NextResponse.json(
      { message: "Profile updated successfully", admin },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
