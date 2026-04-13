import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface IChangeOperation {
  operation: 'insert' | 'delete' | 'format' | 'replace';
  position: number;
  text?: string;
  length?: number;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface IDocumentVersion extends MongooseDocument {
  documentId: string;
  versionNumber: number;
  content: string; // Full snapshot
  changes: IChangeOperation[];
  authorId: string;
  authorName: string;
  authorType: 'customer' | 'admin';
  wordCount: number;
  charCount: number;
  changeSummary: string; // e.g., "Added 3 paragraphs, removed 1 sentence"
  isAutoSnapshot: boolean; // true if auto-created, false if manual save
  parentVersionId?: string; // For branching (future feature)
  createdAt: Date;
  snapshotSize: number; // Size in bytes for monitoring
}

const ChangeOperationSchema = new Schema<IChangeOperation>(
  {
    operation: {
      type: String,
      enum: ['insert', 'delete', 'format', 'replace'],
      required: true,
    },
    position: { type: Number, required: true },
    text: { type: String },
    length: { type: Number },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    changes: {
      type: [ChangeOperationSchema],
      default: [],
    },
    authorId: {
      type: String,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorType: {
      type: String,
      enum: ['customer', 'admin'],
      required: true,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    charCount: {
      type: Number,
      default: 0,
    },
    changeSummary: {
      type: String,
      default: '',
    },
    isAutoSnapshot: {
      type: Boolean,
      default: false,
    },
    parentVersionId: {
      type: String,
    },
    snapshotSize: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'document_versions',
  }
);

// Compound index untuk query versions per document
DocumentVersionSchema.index({ documentId: 1, versionNumber: -1 });
// Index untuk auto-cleanup old versions
DocumentVersionSchema.index({ documentId: 1, isAutoSnapshot: 1, createdAt: 1 });

const DocumentVersion = mongoose.models.DocumentVersion || 
  mongoose.model<IDocumentVersion>("DocumentVersion", DocumentVersionSchema);

export default DocumentVersion;
