import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface ISelectionRange {
  startOffset: number;
  endOffset: number;
  selectedText: string;
  nodePath?: string; // DOM path untuk re-highlight
}

export interface IDocumentComment extends MongooseDocument {
  documentId: string;
  userId: string;
  userType: 'customer' | 'admin';
  userName: string;
  userAvatar?: string;
  selectionRange: ISelectionRange;
  content: string;
  type: 'comment' | 'suggestion' | 'approval';
  status: 'open' | 'resolved' | 'rejected';
  threadId?: string; // For threaded replies
  parentId?: string; // Parent comment for replies
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

const SelectionRangeSchema = new Schema<ISelectionRange>(
  {
    startOffset: { type: Number, required: true },
    endOffset: { type: Number, required: true },
    selectedText: { type: String, required: true },
    nodePath: { type: String },
  },
  { _id: false }
);

const DocumentCommentSchema = new Schema<IDocumentComment>(
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
      enum: ['customer', 'admin'],
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userAvatar: {
      type: String,
    },
    selectionRange: {
      type: SelectionRangeSchema,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['comment', 'suggestion', 'approval'],
      default: 'comment',
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'rejected'],
      default: 'open',
    },
    threadId: {
      type: String,
      index: true,
    },
    parentId: {
      type: String,
      index: true,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'document_comments',
  }
);

// Index untuk query comments per document
DocumentCommentSchema.index({ documentId: 1, status: 1, createdAt: -1 });
// Index untuk threaded comments
DocumentCommentSchema.index({ documentId: 1, threadId: 1 });
// Index untuk parent-child replies is already defined via index: true in the schema

const DocumentComment = mongoose.models.DocumentComment || 
  mongoose.model<IDocumentComment>("DocumentComment", DocumentCommentSchema);

export default DocumentComment;
