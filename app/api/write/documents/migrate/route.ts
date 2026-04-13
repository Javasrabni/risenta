import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Document from "@/app/models/document";
import RisenttaAdm from "@/app/models/risentaAdm";
import Customer from "@/app/models/customer";
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
  
  return null;
}

// POST /api/write/documents/migrate - Migrate guest documents to user account
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const auth = await getAuthenticatedUser(req);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { userId, userType } = auth;
    
    const body = await req.json();
    const { documents } = body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No documents to migrate",
        migrated: 0 
      });
    }
    
    const migratedDocs = [];
    const errors = [];
    
    // Migrate each document
    for (const doc of documents) {
      try {
        // Check if document with same title and content already exists
        const existingDoc = await Document.findOne({
          userId,
          userType,
          title: doc.title,
          content: doc.content
        }).lean();
        
        if (existingDoc) {
          // Skip if already exists
          continue;
        }
        
        // Create new document in DB
        const newDoc = await Document.create({
          userId,
          userType,
          title: doc.title || 'Dokumen Tanpa Judul',
          content: doc.content || '',
          type: doc.type || 'essay',
          wordCount: doc.wordCount || 0,
          charCount: doc.charCount || 0,
          pageSettings: doc.pageSettings || {
            size: 'a4',
            margins: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 }
          },
          createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date()
        });
        
        migratedDocs.push({
          id: newDoc._id.toString(),
          title: newDoc.title,
          createdAt: newDoc.createdAt
        });
      } catch (docError) {
        console.error('Error migrating document:', docError);
        errors.push({ title: doc.title, error: (docError as Error).message });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${migratedDocs.length} documents`,
      migrated: migratedDocs.length,
      documents: migratedDocs,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error("Error migrating documents:", error);
    return NextResponse.json(
      { error: "Failed to migrate documents" },
      { status: 500 }
    );
  }
}
