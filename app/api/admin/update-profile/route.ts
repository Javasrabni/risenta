import RisentaAdm from "@/app/models/risentaAdm";
import connectDB from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Helper function to get current admin from session
async function getCurrentAdminFromSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;
  
  if (!sessionToken) return null;
  
  await connectDB();
  const admin = await RisentaAdm.findOne({ sessionToken }).lean();
  return admin;
}

// PUT handler for full profile updates
export async function PUT(req: Request) {
  try {
    // Get current admin from session
    const currentAdmin = await getCurrentAdminFromSession();
    
    if (!currentAdmin) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { risentaID, adm_usn, position, photoProfile, cloudinaryPublicId } = await req.json();

    if (!risentaID) {
      return NextResponse.json(
        { message: "RisentaID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // SECURITY CHECK: Only allow updating own profile using _id comparison
    const targetAdmin = await RisentaAdm.findOne({ risentaID }).lean();
    if (!targetAdmin || targetAdmin._id.toString() !== currentAdmin._id.toString()) {
      return NextResponse.json(
        { message: "Forbidden - You can only update your own profile" },
        { status: 403 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, string> = {};
    if (adm_usn !== undefined) updateData.adm_usn = adm_usn;
    if (position !== undefined) updateData.position = position;
    if (photoProfile !== undefined) updateData.photoProfile = photoProfile;
    if (cloudinaryPublicId !== undefined) updateData.cloudinaryPublicId = cloudinaryPublicId;

    // Update using findOneAndUpdate for atomic update
    const admin = await RisentaAdm.findOneAndUpdate(
      { risentaID },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!admin) {
      return NextResponse.json(
        { message: "Admin not found" },
        { status: 404 }
      );
    }

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

export async function POST(req: Request) {
  try {
    // Get current admin from session
    const currentAdmin = await getCurrentAdminFromSession();
    
    if (!currentAdmin) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { risentaID, photoProfile, cloudinaryPublicId, position } = await req.json();

    if (!risentaID) {
      return NextResponse.json(
        { message: "RisentaID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // SECURITY CHECK: Only allow updating own profile using _id comparison
    const targetAdmin = await RisentaAdm.findOne({ risentaID }).lean();
    if (!targetAdmin || targetAdmin._id.toString() !== currentAdmin._id.toString()) {
      return NextResponse.json(
        { message: "Forbidden - You can only update your own profile" },
        { status: 403 }
      );
    }

    // Update admin profile
    const admin = await RisentaAdm.findOne({ risentaID });
    
    if (!admin) {
      return NextResponse.json(
        { message: "Admin not found" },
        { status: 404 }
      );
    }

    // Update photoProfile with Cloudinary URL
    if (photoProfile !== undefined) {
      admin.photoProfile = photoProfile;
    }
    
    // Update Cloudinary public ID for tracking
    if (cloudinaryPublicId !== undefined) {
      admin.cloudinaryPublicId = cloudinaryPublicId;
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
