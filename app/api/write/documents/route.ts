import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Document from "@/app/models/document";
import RisenttaAdm from "@/app/models/risentaAdm";
import Customer from "@/app/models/customer";
import DocumentCollaborator from "@/app/models/documentCollaborator";
import mongoose from "mongoose";
import { cookies } from "next/headers";

// Helper to get authenticated user from cookies
async function getAuthenticatedUser(req: NextRequest) {
  const cookieStore = await cookies();
  
  // Try customer session first (customer_session cookie from login)
  const customerSession = cookieStore.get("customer_session")?.value;
  const customerId = cookieStore.get("customer_id")?.value;
  
  if (customerSession && customerId) {
    // Verify session format and find customer
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
  if (guestId) {
    return {
      userId: guestId,
      userType: 'guest' as any,
      user: null
    };
  }
  
  return null;
}

// GET /api/write/documents - Get all documents for the authenticated user
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType } = auth;
    
    // Fetch documents from database
    const documents = await Document.find({ userId, userType })
      .sort({ updatedAt: -1 })
      .lean();
    
    // Transform to match frontend Document type
    const formattedDocs = documents.map(doc => ({
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      type: doc.type,
      template: doc.template,
      wordCount: doc.wordCount,
      charCount: doc.charCount,
      pageSettings: doc.pageSettings,
      analysisData: doc.analysisData,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      userId: doc.userId
    }));
    
    return NextResponse.json({ documents: formattedDocs });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST /api/write/documents - Create or update a document
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType } = auth;
    
    const body = await req.json();
    const { id, title, content, type, template, wordCount, charCount, pageSettings, analysisData, todos, chats, citations } = body;
    
    let document;
    
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      // Update existing document
      let docObj = await Document.findById(id);
      if (!docObj) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }
      
      const isOwner = docObj.userId === userId && docObj.userType === userType;
      
      if (!isOwner) {
        const isCollaborator = await DocumentCollaborator.findOne({
          documentId: id,
          userId,
          userType,
          isActive: true
        });
        
        // Ensure they have permission to edit (e.g. role 'editor', or at least they are a collaborator)
        // If we strictly want 'editor' we can do: isCollaborator?.role === 'editor'
        if (!isCollaborator || (isCollaborator.role !== 'editor')) {
          return NextResponse.json(
            { error: "Unauthorized to edit document" },
            { status: 403 }
          );
        }
      }
      
      const updatePayload: any = {
        title,
        content,
        type,
        ...(template !== undefined && { template }),
        wordCount,
        charCount,
        pageSettings,
        ...(analysisData !== undefined && { analysisData }),
        updatedAt: new Date()
      };

      if (todos !== undefined) updatePayload.todos = todos;
      if (chats !== undefined) updatePayload.chats = chats;
      if (citations !== undefined) updatePayload.citations = citations;

      document = await Document.findByIdAndUpdate(
        id,
        updatePayload,
        { new: true }
      );
    } else {
      // Create new document
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      let l = '';
      let n = '';
      for(let i=0; i<3; i++) l += letters.charAt(Math.floor(Math.random() * letters.length));
      for(let i=0; i<3; i++) n += numbers.charAt(Math.floor(Math.random() * numbers.length));
      const joinId = `${l}-${n}`;

      document = await Document.create({
        joinId,
        userId,
        userType,
        title: title || 'Dokumen Tanpa Judul',
        content: content || '',
        type: type || 'essay',
        template: template || 'blank',
        wordCount: wordCount || 0,
        charCount: charCount || 0,
        pageSettings: pageSettings || {
          size: 'a4',
          margins: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 }
        }
      });
    }
    
    return NextResponse.json({
      document: {
        id: document._id.toString(),
        joinId: document.joinId,
        title: document.title,
        content: document.content,
        type: document.type,
        template: document.template,
        wordCount: document.wordCount,
        charCount: document.charCount,
        pageSettings: document.pageSettings,
        analysisData: document.analysisData,
        todos: document.todos || [],
        chats: document.chats || [],
        citations: document.citations || [],
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        userId: document.userId
      }
    });
  } catch (error) {
    console.error("Error saving document:", error);
    return NextResponse.json(
      { error: "Failed to save document" },
      { status: 500 }
    );
  }
}
