import mongoose, { Schema, Document } from "mongoose";

export interface Reply {
  _id?: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: Date;
  parentReplyId?: string; // For nested replies
  replies: Reply[]; // Nested replies
}

export interface Comment {
  _id?: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  replies: Reply[];
}

export interface IPost extends Document {
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  description: string;
  mediaUrl: string; // Cloudinary URL
  mediaPublicId: string; // Cloudinary public ID
  mediaType: "image" | "video";
  comments: Comment[];
  views: string[]; // Array of admin IDs who viewed
  createdAt: Date;
  updatedAt: Date;
}

// Define ReplySchema with recursive structure
const ReplySchema = new Schema<Reply>({
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  authorPhoto: { type: String },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  parentReplyId: { type: String },
});

// Add replies field after schema creation to support recursion
ReplySchema.add({
  replies: { type: [ReplySchema], default: [] }
});

const CommentSchema = new Schema<Comment>({
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  authorPhoto: { type: String },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  replies: { type: [ReplySchema], default: [] },
});

const PostSchema = new Schema<IPost>(
  {
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorPhoto: { type: String },
    description: { type: String, required: true },
    mediaUrl: { type: String, required: true },
    mediaPublicId: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    comments: { type: [CommentSchema], default: [] },
    views: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Post = mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default Post;
