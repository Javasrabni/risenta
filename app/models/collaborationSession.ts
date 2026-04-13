import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface ICursorPosition {
  anchor: number;
  head: number;
}

export interface ISelection {
  start: number;
  end: number;
  text?: string;
}

export interface ICollaborationSession extends MongooseDocument {
  documentId: string;
  userId: string;
  userType: 'customer' | 'admin';
  userName: string;
  userAvatar?: string;
  userColor: string; // Hex color for cursor/selection
  socketId: string; // Socket.io connection ID
  cursorPosition?: ICursorPosition;
  selection?: ISelection;
  lastSeenAt: Date;
  isActive: boolean;
  joinedAt: Date;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
  };
}

const CursorPositionSchema = new Schema<ICursorPosition>(
  {
    anchor: { type: Number, required: true },
    head: { type: Number, required: true },
  },
  { _id: false }
);

const SelectionSchema = new Schema<ISelection>(
  {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    text: { type: String },
  },
  { _id: false }
);

const DeviceInfoSchema = new Schema(
  {
    userAgent: { type: String },
    ip: { type: String },
  },
  { _id: false }
);

const CollaborationSessionSchema = new Schema<ICollaborationSession>(
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
    userColor: {
      type: String,
      required: true,
      default: '#2563eb', // Default blue
    },
    socketId: {
      type: String,
      required: true,
      index: true,
    },
    cursorPosition: {
      type: CursorPositionSchema,
    },
    selection: {
      type: SelectionSchema,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    deviceInfo: {
      type: DeviceInfoSchema,
    },
  },
  {
    timestamps: false,
    collection: 'collaboration_sessions',
  }
);

// Compound index untuk query active sessions per document
CollaborationSessionSchema.index({ documentId: 1, isActive: 1, lastSeenAt: -1 });
// Index untuk cleanup inactive sessions
CollaborationSessionSchema.index({ isActive: 1, lastSeenAt: 1 });
// Unique index untuk prevent duplicate sessions per user per document
CollaborationSessionSchema.index({ documentId: 1, userId: 1, userType: 1, socketId: 1 }, { unique: true });

const CollaborationSession = mongoose.models.CollaborationSession || 
  mongoose.model<ICollaborationSession>("CollaborationSession", CollaborationSessionSchema);

export default CollaborationSession;
