import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Document from "@/app/models/document";
import DocumentVersion from "@/app/models/documentVersion";
import RisenttaAdm from "@/app/models/risentaAdm";
import Customer from "@/app/models/customer";
import { cookies } from "next/headers";

// Helper to get authenticated user from cookies
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
        name: customer.name || customer.email || 'Unknown',
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
        name: admin.name || admin.email || 'Unknown',
      };
    }
  }
  
  return null;
}

// GET /api/write/versions/:docId - Get version history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    await connectDB();
    
    const { docId } = await params;
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
    
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const versions = await DocumentVersion.find({ documentId: docId })
      .sort({ versionNumber: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
    
    const total = await DocumentVersion.countDocuments({ documentId: docId });
    
    return NextResponse.json({
      versions: versions.map(v => ({
        id: v._id.toString(),
        versionNumber: v.versionNumber,
        authorId: v.authorId,
        authorName: v.authorName,
        authorType: v.authorType,
        wordCount: v.wordCount,
        charCount: v.charCount,
        changeSummary: v.changeSummary,
        isAutoSnapshot: v.isAutoSnapshot,
        createdAt: v.createdAt,
      })),
      total,
      hasMore: offset + versions.length < total,
    });
  } catch (error) {
    console.error("Error fetching versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    );
  }
}

// POST /api/write/versions/:docId - Create a new version snapshot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    await connectDB();
    
    const { docId } = await params;
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType, name } = auth;
    
    const doc = await Document.findById(docId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    const isOwner = doc.userId === userId && doc.userType === userType;
    if (!isOwner) {
      return NextResponse.json({ error: "Only owner can create versions" }, { status: 403 });
    }
    
    // Get previous version to calculate diff
    const previousVersion = await DocumentVersion.findOne({ documentId: docId })
      .sort({ versionNumber: -1 })
      .lean();
    
    const previousContent = previousVersion?.content || '';
    const currentContent = doc.content || '';
    
    // Simple change tracking
    const prevLength = previousContent.length;
    const currLength = currentContent.length;
    const charDiff = currLength - prevLength;
    
    const changes: any[] = [];
    if (charDiff !== 0) {
      changes.push({
        operation: charDiff > 0 ? 'insert' : 'delete',
        position: 0,
        length: Math.abs(charDiff),
        userId,
        userName: name,
        timestamp: new Date(),
      });
    }
    
    // Generate change summary
    let changeSummary = '';
    const addedCount = Math.max(0, charDiff);
    const removedCount = Math.max(0, -charDiff);
    
    if (addedCount > 0 && removedCount > 0) {
      changeSummary = `Added ${addedCount} chars, removed ${removedCount} chars`;
    } else if (addedCount > 0) {
      changeSummary = `Added ${addedCount} chars`;
    } else if (removedCount > 0) {
      changeSummary = `Removed ${removedCount} chars`;
    } else {
      changeSummary = 'Manual save';
    }
    
    const nextVersionNumber = (doc.lastVersionNumber || 0) + 1;
    
    const version = await DocumentVersion.create({
      documentId: docId,
      versionNumber: nextVersionNumber,
      content: currentContent,
      changes,
      authorId: userId,
      authorName: name,
      authorType: userType,
      wordCount: doc.wordCount || 0,
      charCount: doc.charCount || 0,
      changeSummary,
      isAutoSnapshot: false,
      snapshotSize: Buffer.byteLength(currentContent, 'utf8'),
    });
    
    // Update document version number
    doc.lastVersionNumber = nextVersionNumber;
    await doc.save();
    
    return NextResponse.json({
      success: true,
      version: {
        id: version._id.toString(),
        versionNumber: version.versionNumber,
        authorId: version.authorId,
        authorName: version.authorName,
        changeSummary: version.changeSummary,
        createdAt: version.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating version:", error);
    return NextResponse.json(
      { error: "Failed to create version" },
      { status: 500 }
    );
  }
}
