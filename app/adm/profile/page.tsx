import { redirect } from "next/navigation";
import { GetAdminData } from "../lib/getAdminData";
import ProfilePageClient from "./ProfileClient";
import connectDB from "@/lib/mongodb";
import RisentaAdm from "@/app/models/risentaAdm";

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';

interface Admin {
  _id?: string;
  risentaID: string;
  adm_usn: string;
  photoProfile?: string;
  cloudinaryPublicId?: string;
  position?: string;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProfilePage({ searchParams }: PageProps) {
  // Get current logged-in admin (for verification)
  const currentAdmin = await GetAdminData() as Admin | null;
  if (!currentAdmin) {
    redirect("/login");
  }

  // Log untuk debugging
  console.log("[ProfilePage] Current admin _id:", currentAdmin._id?.toString());

  // Get query parameter
  const params = await searchParams;
  const targetRisentaID = params.user as string | undefined;

  let adminToDisplay = currentAdmin;
  let isOwnProfile = true;

  // If user parameter exists, fetch that admin's data
  if (targetRisentaID) {
    await connectDB();
    const targetAdmin = await RisentaAdm.findOne(
      { risentaID: targetRisentaID },
      { risentaID: 1, adm_usn: 1, photoProfile: 1, cloudinaryPublicId: 1, position: 1, _id: 1 }
    ).lean() as Admin | null;

    if (targetAdmin) {
      adminToDisplay = targetAdmin;
      // Compare using _id for reliable ownership check
      const currentId = currentAdmin._id?.toString();
      const targetId = targetAdmin._id?.toString();
      isOwnProfile = currentId === targetId;
      
      console.log("[ProfilePage] Target admin _id:", targetId);
      console.log("[ProfilePage] isOwnProfile:", isOwnProfile);
    }
  }

  // Serialize admin data to plain object (remove MongoDB-specific types)
  const serializedAdmin: Admin = {
    risentaID: adminToDisplay.risentaID,
    adm_usn: adminToDisplay.adm_usn,
    photoProfile: adminToDisplay.photoProfile,
    cloudinaryPublicId: adminToDisplay.cloudinaryPublicId,
    position: adminToDisplay.position,
  };

  console.log("[ProfilePage] Final isOwnProfile passed to client:", isOwnProfile);

  return <ProfilePageClient admin={serializedAdmin} isOwnProfile={isOwnProfile} />;
}
