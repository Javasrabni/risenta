import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Document from "@/app/models/document";
import DocumentCollaborator from "@/app/models/documentCollaborator";
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

// POST /api/write/collaboration/:docId/invite - Invite a user to collaborate
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
    
    // Only owner or editor with invite permission can invite
    const doc = await Document.findById(docId).lean();
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    const isOwner = doc.userId === userId && doc.userType === userType;
    const body = await req.json();
    const { email, role, selfJoin } = body;
    
    const isSelfJoin = selfJoin === true || email === userId;
    
    // Force role to pending for self-joins so owner can approve
    let finalRole = role;
    if (isSelfJoin) {
      finalRole = 'pending';
    }
    
    if (!isOwner && !isSelfJoin) {
      return NextResponse.json({ error: "Only owner can invite collaborators" }, { status: 403 });
    }
    
    // For self-join, check if document is collaborative
    // Self-join requests (via link) are allowed even if not currently collaborative,
    // they will just stay as 'pending' for the owner to approve.
    // However, if we want to strictly follow the setting:
    if (isSelfJoin && !doc.collaborationSettings?.isCollaborative) {
       // We still allow it but it will be role: 'pending' (which is default)
    }
    
    if (!isSelfJoin && !email || !role) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }
    
    let targetUserId = '';
    let targetUserType: 'customer' | 'admin' | 'guest' = 'customer';
    let targetUserName = '';
    
    if (isSelfJoin) {
      targetUserId = userId;
      targetUserType = userType;
      targetUserName = name;
    } else {
      // Find user by email
      let targetUser = await Customer.findOne({ email }).lean();
      
      if (!targetUser) {
        targetUser = await RisenttaAdm.findOne({ email }).lean();
        targetUserType = 'admin';
      }
      
      if (!targetUser) {
        return NextResponse.json({ error: "User not found with this email" }, { status: 404 });
      }
      
      targetUserId = targetUser._id?.toString() || 
        (targetUserType === 'customer' ? (targetUser as any).customerID : (targetUser as any).risentaID);
    }
    
    // Check if already a collaborator
    const existing = await DocumentCollaborator.findOne({
      documentId: docId,
      userId: targetUserId,
      userType: targetUserType,
    }).lean();
    
    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: "User is already a collaborator",
        collaborator: {
          id: existing._id.toString(),
          userId: existing.userId,
          userType: existing.userType,
          role: existing.role,
        }
      });
    }
    
    // Check max collaborators limit
    const collaboratorCount = await DocumentCollaborator.countDocuments({
      documentId: docId,
      isActive: true,
    });
    
    const maxCollaborators = doc.collaborationSettings?.maxCollaborators || 20;
    if (collaboratorCount >= maxCollaborators) {
      return NextResponse.json(
        { error: `Maximum ${maxCollaborators} collaborators allowed` },
        { status: 400 }
      );
    }
    
    // Create collaborator
    const collaborator = await DocumentCollaborator.create({
      documentId: docId,
      userId: targetUserId,
      userType: targetUserType,
      userName: targetUserName,
      role: finalRole,
      invitedBy: userId,
      invitedByType: userType,
      invitedAt: new Date(),
      lastAccessedAt: new Date(),
      isActive: true,
    });
    
    return NextResponse.json({
      success: true,
      collaborator: {
        id: collaborator._id.toString(),
        userId: targetUserId,
        userType: targetUserType,
        role: finalRole,
        invitedBy: userId,
        invitedAt: collaborator.invitedAt,
      },
    });
  } catch (error) {
    console.error("Error inviting collaborator:", error);
    return NextResponse.json(
      { error: "Failed to invite collaborator" },
      { status: 500 }
    );
  }
}

// DELETE /api/write/collaboration/:docId/invite - Remove a collaborator
export async function DELETE(
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
    
    // Only owner can remove collaborators
    const doc = await Document.findById(docId).lean();
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    if (doc.userId !== userId || doc.userType !== userType) {
      return NextResponse.json({ error: "Only owner can remove collaborators" }, { status: 403 });
    }
    
    const { searchParams } = new URL(req.url);
    const collaboratorId = searchParams.get('collaboratorId');
    
    if (!collaboratorId) {
      return NextResponse.json({ error: "Collaborator ID is required" }, { status: 400 });
    }
    
    // Remove collaborator
    await DocumentCollaborator.findByIdAndUpdate(collaboratorId, {
      isActive: false,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    return NextResponse.json(
      { error: "Failed to remove collaborator" },
      { status: 500 }
    );
  }
}

// PATCH /api/write/collaboration/:docId/invite - Update a collaborator's role
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
    
    // Only owner can update collaborators
    const doc = await Document.findById(docId).lean();
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    if (doc.userId !== userId || doc.userType !== userType) {
      return NextResponse.json({ error: "Only owner can update collaborators" }, { status: 403 });
    }
    
    const body = await req.json();
    const { collaboratorId, role } = body;
    
    if (!collaboratorId || !role) {
      return NextResponse.json({ error: "Collaborator ID and role are required" }, { status: 400 });
    }
    
    // Update collaborator
    await DocumentCollaborator.findByIdAndUpdate(collaboratorId, {
      role,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating collaborator:", error);
    return NextResponse.json(
      { error: "Failed to update collaborator" },
      { status: 500 }
    );
  }
}
