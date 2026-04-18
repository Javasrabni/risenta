import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface ITodo {
  id: string;
  text: string;
  isDone: boolean;
  assignedTo?: string;
}

export interface IChat {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

export interface ICitation {
  id: string;
  title: string;
  authors: string;
  year: string;
  source: string;
  url?: string;
}

export interface IMusicQueueItem {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  durationString: string;
  addedBy: string;
  addedById: string;
}

export interface IPageSettings {
  size: 'a4' | 'a5' | 'letter' | 'legal' | 'custom';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  customWidth?: number;
  customHeight?: number;
}

export interface IAnalysisData {
  strengths: string[];
  weaknesses: string[];
  predictedQuestions: string[];
  recommendations: string[];
  overallScore: number;
  generatedAt: string;
}

export interface ICollaborationSettings {
  isCollaborative: boolean;
  allowComments: boolean;
  allowSuggestions: boolean;
  defaultRole: 'editor' | 'viewer' | 'commenter';
  maxCollaborators: number;
  requireApproval: boolean; // Owner must approve changes
}

export interface IDocument extends MongooseDocument {
  joinId?: string;
  userId: string;
  userType: 'customer' | 'admin' | 'guest';
  title: string;
  content: string;
  todos?: ITodo[];
  chats?: IChat[];
  citations?: ICitation[];
  musicQueue?: IMusicQueueItem[];
  type: 'essay' | 'article' | 'journal' | 'thesis';
  template?: 'blank' | 'essay' | 'thesis' | 'article' | 'journal' | 'research' | 'report';
  wordCount: number;
  charCount: number;
  pageSettings: IPageSettings;
  analysisData?: IAnalysisData;
  collaborationSettings?: ICollaborationSettings;
  lastVersionNumber: number; // For versioning
  yjsState?: Buffer; // Binary Yjs document state
  createdAt: Date;
  updatedAt: Date;
}

const PageSettingsSchema = new Schema<IPageSettings>({
  size: { 
    type: String, 
    enum: ['a4', 'a5', 'letter', 'legal', 'custom'],
    default: 'a4'
  },
  margins: {
    top: { type: Number, default: 2.5 },
    right: { type: Number, default: 2.5 },
    bottom: { type: Number, default: 2.5 },
    left: { type: Number, default: 2.5 }
  },
  customWidth: { type: Number },
  customHeight: { type: Number }
}, { _id: false });

const AnalysisDataSchema = new Schema<IAnalysisData>({
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  predictedQuestions: [{ type: String }],
  recommendations: [{ type: String }],
  overallScore: { type: Number, default: 0 },
  generatedAt: { type: String }
}, { _id: false });

const CollaborationSettingsSchema = new Schema<ICollaborationSettings>({
  isCollaborative: { type: Boolean, default: false },
  allowComments: { type: Boolean, default: true },
  allowSuggestions: { type: Boolean, default: true },
  defaultRole: { 
    type: String, 
    enum: ['editor', 'viewer', 'commenter'],
    default: 'viewer'
  },
  maxCollaborators: { type: Number, default: 20 },
  requireApproval: { type: Boolean, default: false }
}, { _id: false });

const DocumentSchema = new Schema<IDocument>(
  {
    joinId: {
      type: String,
      sparse: true,
      unique: true
    },
    userId: { 
      type: String, 
      required: true,
      index: true
    },
    userType: { 
      type: String, 
      enum: ['customer', 'admin', 'guest'],
      required: true,
      default: 'customer'
    },
    title: { 
      type: String, 
      required: true,
      default: 'Dokumen Tanpa Judul'
    },
    content: { 
      type: String, 
      default: '' 
    },
    type: { 
      type: String, 
      enum: ['essay', 'article', 'journal', 'thesis'],
      default: 'essay'
    },
    template: { 
      type: String, 
      enum: ['blank', 'essay', 'thesis', 'article', 'journal', 'research', 'report'],
      default: 'blank'
    },
    wordCount: { 
      type: Number, 
      default: 0 
    },
    charCount: { 
      type: Number, 
      default: 0 
    },
    pageSettings: { 
      type: PageSettingsSchema,
      default: () => ({
        size: 'a4',
        margins: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 }
      })
    },
    analysisData: {
      type: AnalysisDataSchema,
      default: null
    },
    collaborationSettings: {
      type: CollaborationSettingsSchema,
      default: () => ({
        isCollaborative: false,
        allowComments: true,
        allowSuggestions: true,
        defaultRole: 'viewer',
        maxCollaborators: 20,
        requireApproval: false
      })
    },
    lastVersionNumber: {
      type: Number,
      default: 0
    },
    yjsState: {
      type: Buffer,
      default: null
    },
    todos: {
      type: [{
        id: String,
        text: String,
        isDone: { type: Boolean, default: false },
        assignedTo: String
      }],
      default: []
    },
    chats: {
      type: [{
        id: String,
        senderId: String,
        senderName: String,
        text: String,
        timestamp: { type: Date, default: Date.now }
      }],
      default: []
    },
    citations: {
      type: [{
        id: String,
        title: String,
        authors: String,
        year: String,
        source: String,
        url: String
      }],
      default: []
    },
    musicQueue: {
      type: [{
        id: String,
        videoId: String,
        title: String,
        channel: String,
        thumbnail: String,
        durationString: String,
        addedBy: String,
        addedById: String
      }],
      default: []
    }
  },
  { 
    timestamps: true,
    collection: 'documents'
  }
);

// Compound index untuk query dokumen berdasarkan user
DocumentSchema.index({ userId: 1, userType: 1, updatedAt: -1 });

const Document = mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema);

export default Document;
