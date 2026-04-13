import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Document from "@/app/models/document";
import DocumentVersion from "@/app/models/documentVersion";
import RisenttaAdm from "@/app/models/risentaAdm";
import Customer from "@/app/models/customer";
import { cookies } from "next/headers";

// Helper to get authenticated user
async function getAuthenticatedUser(req: NextRequest) {
  const cookieStore = await cookies();
  
  const customerSession = cookieStore.get("customer_session")?.value;
  const customerId = cookieStore.get("customer_id")?.value;
  
  if (customerSession && customerId) {
    const customer = await Customer.findOne({ customerID: customerId }).lean();
    if (customer) {
      return {
        userId: customer._id?.toString() || customer.customerID,
        userType: 'customer' as const,
        user: customer,
      };
    }
  }
  
  const adminToken = cookieStore.get("session_token")?.value;
  if (adminToken) {
    const admin = await RisenttaAdm.findOne({ token: adminToken }).lean();
    if (admin) {
      return {
        userId: admin._id?.toString() || admin.risentaID,
        userType: 'admin' as const,
        user: admin,
      };
    }
  }
  
  return null;
}

// GET /api/write/versions/:docId/:versionId - Get specific version
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string; versionId: string }> }
) {
  try {
    await connectDB();
    
    const { docId, versionId } = await params;
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType } = auth;
    
    // Check access
    const doc = await Document.findById(docId).lean();
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    const isOwner = doc.userId === userId && doc.userType === userType;
    const collaborator = await import("@/app/models/documentCollaborator").then(m => 
      m.default.findOne({ documentId: docId, userId, userType, isActive: true }).lean()
    );
    
    if (!isOwner && !collaborator) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    
    const version = await DocumentVersion.findOne({
      _id: versionId,
      documentId: docId,
    }).lean();
    
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      version: {
        id: version._id.toString(),
        versionNumber: version.versionNumber,
        content: version.content,
        changes: version.changes,
        authorId: version.authorId,
        authorName: version.authorName,
        authorType: version.authorType,
        wordCount: version.wordCount,
        charCount: version.charCount,
        changeSummary: version.changeSummary,
        isAutoSnapshot: version.isAutoSnapshot,
        createdAt: version.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching version:", error);
    return NextResponse.json(
      { error: "Failed to fetch version" },
      { status: 500 }
    );
  }
}

// POST /api/write/versions/:docId/:versionId/restore - Restore version
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string; versionId: string }> }
) {
  try {
    await connectDB();
    
    const { docId, versionId } = await params;
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType, user } = auth;
    
    // Only owner can restore versions
    const doc = await Document.findById(docId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    if (doc.userId !== userId || doc.userType !== userType) {
      return NextResponse.json({ error: "Only owner can restore versions" }, { status: 403 });
    }
    
    const version = await DocumentVersion.findOne({
      _id: versionId,
      documentId: docId,
    }).lean();
    
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }
    
    // Restore content
    doc.content = version.content;
    doc.wordCount = version.wordCount;
    doc.charCount = version.charCount;
    doc.updatedAt = new Date();
    
    await doc.save();
    
    // Create a new version for the restore action
    const nextVersionNumber = (doc.lastVersionNumber || 0) + 1;
    const name = (user as any)?.name || (user as any)?.email || 'Unknown';
    
    await DocumentVersion.create({
      documentId: docId,
      versionNumber: nextVersionNumber,
      content: version.content,
      changes: [{
        operation: 'replace',
        position: 0,
        text: version.content,
        userId,
        userName: name,
        timestamp: new Date(),
      }],
      authorId: userId,
      authorName: name,
      authorType: userType,
      wordCount: version.wordCount,
      charCount: version.charCount,
      changeSummary: `Restored to version ${version.versionNumber}`,
      isAutoSnapshot: false,
      snapshotSize: Buffer.byteLength(version.content, 'utf8'),
    });
    
    doc.lastVersionNumber = nextVersionNumber;
    await doc.save();
    
    return NextResponse.json({
      success: true,
      message: `Restored to version ${version.versionNumber}`,
    });
  } catch (error) {
    console.error("Error restoring version:", error);
    return NextResponse.json(
      { error: "Failed to restore version" },
      { status: 500 }
    );
  }
}
