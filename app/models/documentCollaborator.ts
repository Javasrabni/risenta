import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface IDocumentCollaborator extends MongooseDocument {
  documentId: string;
  userId: string;
  userType: 'customer' | 'admin' | 'guest';
  userName?: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter' | 'pending';
  invitedBy: string;
  invitedByType: 'customer' | 'admin';
  invitedAt: Date;
  lastAccessedAt: Date;
  isActive: boolean;
}

const DocumentCollaboratorSchema = new Schema<IDocumentCollaborator>(
  {
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userType: {
      type: String,
      enum: ['customer', 'admin', 'guest'],
      required: true,
      default: 'customer',
    },
    userName: {
      type: String,
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer', 'commenter', 'pending'],
      required: true,
      default: 'pending',
    },
    invitedBy: {
      type: String,
      required: true,
    },
    invitedByType: {
      type: String,
      enum: ['customer', 'admin', 'guest'],
      required: true,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: false,
    collection: 'document_collaborators',
  }
);

// Compound index untuk query collaborators per document
DocumentCollaboratorSchema.index({ documentId: 1, isActive: 1 });
// Index untuk cek user access ke document
DocumentCollaboratorSchema.index({ documentId: 1, userId: 1, userType: 1 });
// Index untuk list documents yang di-share ke user
DocumentCollaboratorSchema.index({ userId: 1, userType: 1, isActive: 1 });

const DocumentCollaborator = mongoose.models.DocumentCollaborator || 
  mongoose.model<IDocumentCollaborator>("DocumentCollaborator", DocumentCollaboratorSchema);

export default DocumentCollaborator;
