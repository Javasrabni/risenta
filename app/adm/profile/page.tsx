import { redirect } from "next/navigation";
import { GetAdminData } from "../lib/getAdminData";
import ProfilePageClient from "./ProfileClient";
import connectDB from "@/lib/mongodb";
import RisenttaAdm from "@/app/models/risentaAdm";
import Post from "@/app/models/post";

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic';

// Team order for role lookup
const TEAM_ORDER = [
  "Javas Anggaraksa Rabbani",
  "Rasyid Ali Nurhakim",
  "Fiska Andini Putri",
  "Saskia Hanina Sadiyah",
  "Daffa Adnan Asyarof",
  "M. Albar Hakim"
];

// Role mapping based on name
const ROLES: Record<string, string> = {
  "Javas Anggaraksa Rabbani": "Law & Software Engineer",
  "Rasyid Ali Nurhakim": "Public Health",
  "Fiska Andini Putri": "Accounting/Finance",
  "Saskia Hanina Sadiyah": "Communication Science",
  "Daffa Adnan Asyarof": "History",
  "M. Albar Hakim": "Industrial Engineering"
};

// Function to determine division based on role (same logic as DivisionSection)
function getDivisionFromRole(role: string, name: string): string {
  const roleLower = role.toLowerCase();
  
  // Check for Instagram division
  if (roleLower.includes("communication") || roleLower.includes("social")) {
    return "Instagram";
  }
  
  // Check for Bisnis division
  if (roleLower.includes("accounting") || 
      roleLower.includes("finance") || 
      roleLower.includes("bisnis") || 
      roleLower.includes("business") || 
      roleLower.includes("law")) {
    return "Bisnis";
  }
  
  // Special coordinators
  if (name === "Rasyid Ali Nurhakim") {
    return "Coordinator";
  }
  
  return "Risentta";
}

interface Admin {
  _id?: string;
  risentaID: string;
  adm_usn: string;
  photoProfile?: string;
  cloudinaryPublicId?: string;
  position?: string;
  division?: string;
  createdAt?: string;
  skills?: string[];
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
  const targetRisenttaID = params.user as string | undefined;

  let adminToDisplay = currentAdmin;
  let isOwnProfile = true;

  await connectDB();

  // If user parameter exists, fetch that admin's data
  if (targetRisenttaID) {
    // Try find by risentaID first, then by _id (MongoDB ObjectId)
    let targetAdmin = await RisenttaAdm.findOne(
      { risentaID: targetRisenttaID },
      { risentaID: 1, adm_usn: 1, photoProfile: 1, cloudinaryPublicId: 1, position: 1, division: 1, skills: 1, createdAt: 1, _id: 1 }
    ).lean() as Admin | null;
    
    // If not found, try finding by _id (for backward compatibility)
    if (!targetAdmin) {
      try {
        targetAdmin = await RisenttaAdm.findOne(
          { _id: targetRisenttaID },
          { risentaID: 1, adm_usn: 1, photoProfile: 1, cloudinaryPublicId: 1, position: 1, division: 1, skills: 1, createdAt: 1, _id: 1 }
        ).lean() as Admin | null;
      } catch {
        // Invalid ObjectId format, ignore
      }
    }

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

  // Fetch posts by this admin
  const targetAuthorId = adminToDisplay.risentaID || adminToDisplay._id?.toString() || "";
  const authorIdForQuery = adminToDisplay._id?.toString() || targetAuthorId;
  
  // Try to find posts by risentaID or _id
  let posts = await Post.find({
    $or: [
      { authorId: targetAuthorId },
      { authorId: authorIdForQuery }
    ]
  }).sort({ createdAt: -1 }).lean();

  const postCount = posts.length;

  // Determine division based on role (sync with DivisionSection logic)
  const adminName = adminToDisplay.adm_usn;
  const adminRole = adminToDisplay.position || ROLES[adminName] || "Team Member";
  const determinedDivision = getDivisionFromRole(adminRole, adminName);

  // Serialize admin data to plain object (remove MongoDB-specific types)
  const serializedAdmin: Admin = {
    risentaID: adminToDisplay.risentaID,
    adm_usn: adminToDisplay.adm_usn,
    photoProfile: adminToDisplay.photoProfile,
    cloudinaryPublicId: adminToDisplay.cloudinaryPublicId,
    position: adminToDisplay.position,
    division: determinedDivision,
    createdAt: adminToDisplay.createdAt?.toString(),
    skills: adminToDisplay.skills || ["Belum menambah label"],
  };

  // Serialize posts with proper handling of nested comments/replies
  const serializeReply = (reply: any) => ({
    _id: reply._id?.toString() || reply._id,
    authorId: reply.authorId,
    authorName: reply.authorName,
    authorPhoto: reply.authorPhoto,
    content: reply.content,
    createdAt: reply.createdAt?.toString() || reply.createdAt,
    replies: (reply.replies || []).map(serializeReply),
  });

  const serializeComment = (comment: any) => ({
    _id: comment._id?.toString() || comment._id,
    authorId: comment.authorId,
    authorName: comment.authorName,
    authorPhoto: comment.authorPhoto,
    content: comment.content,
    createdAt: comment.createdAt?.toString() || comment.createdAt,
    replies: (comment.replies || []).map(serializeReply),
  });

  const serializedPosts = posts.map(post => ({
    _id: post._id.toString(),
    authorId: post.authorId,
    authorName: post.authorName,
    authorPhoto: post.authorPhoto,
    description: post.description,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    comments: (post.comments || []).map(serializeComment),
    views: (post.views || []).map((v: any) => v?.toString ? v.toString() : v),
    createdAt: post.createdAt.toString(),
  }));

  console.log("[ProfilePage] Final isOwnProfile passed to client:", isOwnProfile);

  return (
    <ProfilePageClient 
      admin={serializedAdmin} 
      isOwnProfile={isOwnProfile} 
      postCount={postCount}
      posts={serializedPosts}
    />
  );
}
