import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Document from "@/app/models/document";
import RisenttaAdm from "@/app/models/risentaAdm";
import Customer from "@/app/models/customer";
import DocumentCollaborator from "@/app/models/documentCollaborator";
import { cookies } from "next/headers";

// Helper to get authenticated user from cookies
async function getAuthenticatedUser(req: NextRequest) {
  const cookieStore = await cookies();
  
  // Try customer session first (customer_session cookie from login)
  const customerSession = cookieStore.get("customer_session")?.value;
  const customerId = cookieStore.get("customer_id")?.value;
  
  if (customerSession && customerId) {
    const customer = await Customer.findOne({ customerID: customerId }).lean();
    if (customer) {
      return {
        userId: customer._id?.toString() || customer.customerID,
        userType: 'customer' as const,
        user: customer
      };
    }
  }
  
  // Try admin token (session_token)
  const adminToken = cookieStore.get("session_token")?.value;
  if (adminToken) {
    const admin = await RisenttaAdm.findOne({ token: adminToken }).lean();
    if (admin) {
      return {
        userId: admin._id?.toString() || admin.risentaID,
        userType: 'admin' as const,
        user: admin
      };
    }
  }
  
  // Try guest headers
  const guestId = req.headers.get("x-guest-id");
  const guestName = req.headers.get("x-guest-name");
  
  if (guestId) {
    return {
      userId: guestId,
      userType: 'guest' as any,
      user: null,
      name: guestName || 'Tamu'
    };
  }
  
  return null;
}

// DELETE /api/write/documents/:id - Delete a document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType } = auth;
    
    // Delete document only if it belongs to the user
    const result = await Document.findOneAndDelete({ _id: id, userId, userType });
    
    if (!result) {
      return NextResponse.json(
        { error: "Document not found or unauthorized" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, message: "Document deleted" });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}

// GET /api/write/documents/:id - Get a single document
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType } = auth;
    
    const doc = await Document.findOne({ _id: id }).lean();
    
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    
    // Check if user is owner
    const isOwner = doc.userId === userId && doc.userType === userType;
    
    // If not owner, check if user is a collaborator
    if (!isOwner) {
      const isCollaborator = await DocumentCollaborator.findOne({
        documentId: id,
        userId,
        userType,
        isActive: true,
      }).lean();
      
      if (!isCollaborator) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json({
      document: {
        id: doc._id.toString(),
        title: doc.title,
        content: doc.content,
        type: doc.type,
        wordCount: doc.wordCount,
        charCount: doc.charCount,
        pageSettings: doc.pageSettings,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        userId: doc.userId
      }
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}
