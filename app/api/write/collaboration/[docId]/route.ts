import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Document from "@/app/models/document";
import DocumentCollaborator from "@/app/models/documentCollaborator";
import CollaborationSession from "@/app/models/collaborationSession";
import RisenttaAdm from "@/app/models/risentaAdm";
import Customer from "@/app/models/customer";
import mongoose from "mongoose";
import { cookies } from "next/headers";

// Helper to get authenticated user from cookies
async function getAuthenticatedUser(req: NextRequest) {
  const cookieStore = await cookies();
  
  // Try customer session first
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
  
  // Try admin token
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
  
  // Try guest headers
  const guestId = req.headers.get("x-guest-id");
  const guestName = req.headers.get("x-guest-name");
  
  if (guestId) {
    return {
      userId: guestId,
      userType: 'guest' as any,
      user: null,
      name: guestName || 'Tamu',
    };
  }
  
  return null;
}

// GET /api/write/collaboration/:docId - Get collaborators and active sessions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    await connectDB();
    
    const { docId } = await params;

    // Validate docId
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType } = auth;
    
    // Check if user has access to document
    const doc = await Document.findById(docId).lean();
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    const isOwner = doc.userId === userId && doc.userType === userType;
    const isCollaborator = await DocumentCollaborator.findOne({
      documentId: docId,
      userId,
      userType,
      isActive: true,
    }).lean();
    
    if (!isOwner && !isCollaborator) {
      // Even if not collaborative, return 200 with status so the guest can join/request
      return NextResponse.json({
        collaborators: [],
        activeUsers: [],
        isOwner: false,
        myRole: 'none',
        settings: doc.collaborationSettings || { isCollaborative: false }
      });
    }
    
    // Get all collaborators
    const collaborators = await DocumentCollaborator.find({
      documentId: docId,
      isActive: true,
    }).lean();
    
    // Get active sessions (currently online users)
    const activeSessions = await CollaborationSession.find({
      documentId: docId,
      isActive: true,
    }).lean();
    
    // Format response
    const formattedCollaborators = collaborators.map((collab) => ({
      id: collab._id.toString(),
      userId: collab.userId,
      userType: collab.userType,
      userName: collab.userName,
      role: collab.role,
      invitedBy: collab.invitedBy,
      invitedAt: collab.invitedAt,
      lastAccessedAt: collab.lastAccessedAt,
      isActive: collab.isActive,
    }));
    
    const formattedSessions = activeSessions.map((session) => ({
      id: session._id.toString(),
      userId: session.userId,
      userType: session.userType,
      userName: session.userName,
      userAvatar: session.userAvatar,
      userColor: session.userColor,
      cursorPosition: session.cursorPosition,
      selection: session.selection,
      lastSeenAt: session.lastSeenAt,
    }));
    
    return NextResponse.json({
      collaborators: formattedCollaborators,
      activeUsers: formattedSessions,
      isOwner,
      myRole: isOwner ? 'owner' : isCollaborator?.role || 'viewer',
      settings: doc.collaborationSettings || {
        isCollaborative: false,
        allowComments: true,
        allowSuggestions: true,
        defaultRole: 'viewer',
        maxCollaborators: 20,
        requireApproval: false,
      },
    });
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    return NextResponse.json(
      { error: "Failed to fetch collaborators" },
      { status: 500 }
    );
  }
}

// PATCH /api/write/collaboration/:docId - Update collaboration settings
export async function PATCH(
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
    
    // Only owner can update settings
    const doc = await Document.findById(docId).lean();
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    if (doc.userId !== userId || doc.userType !== userType) {
      return NextResponse.json({ error: "Only owner can update settings" }, { status: 403 });
    }
    
    const body = await req.json();
    const { isCollaborative, allowComments, allowSuggestions, defaultRole, maxCollaborators, requireApproval } = body;
    
    const updatedDoc = await Document.findByIdAndUpdate(
      docId,
      {
        $set: {
          collaborationSettings: {
            isCollaborative: isCollaborative ?? doc.collaborationSettings?.isCollaborative ?? false,
            allowComments: allowComments ?? doc.collaborationSettings?.allowComments ?? true,
            allowSuggestions: allowSuggestions ?? doc.collaborationSettings?.allowSuggestions ?? true,
            defaultRole: defaultRole ?? doc.collaborationSettings?.defaultRole ?? 'viewer',
            maxCollaborators: maxCollaborators ?? doc.collaborationSettings?.maxCollaborators ?? 20,
            requireApproval: requireApproval ?? doc.collaborationSettings?.requireApproval ?? false,
          },
        },
      },
      { new: true }
    );
    
    return NextResponse.json({
      success: true,
      settings: updatedDoc?.collaborationSettings,
    });
  } catch (error) {
    console.error("Error updating collaboration settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
