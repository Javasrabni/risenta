import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/app/models/post";
import { cookies } from "next/headers";
import { v2 as cloudinary } from "cloudinary";
import RisenttaAdm from "@/app/models/risentaAdm";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

// GET all posts
export async function GET() {
  try {
    await connectDB();
    
    const posts = await Post.find({})
      .sort({ createdAt: -1 }) // Newest first
      .lean();
    
    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { message: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// POST new post
export async function POST(req: Request) {
  try {
    await connectDB();
    
    // Check authentication
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get admin data
    const admin = await RisenttaAdm.findOne({ token: sessionToken });
    if (!admin) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description") as string;
    
    if (!file || !description) {
      return NextResponse.json(
        { message: "File and description are required" },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Determine media type
    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    
    // Upload to Cloudinary with optimization
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: mediaType,
          folder: "risenta/posts",
          // Optimization settings
          quality: "auto:good", // Auto quality for images
          fetch_format: "auto", // Auto format (webp, avif, etc.)
          // For videos - simplified config
          ...(mediaType === "video" && {
            resource_type: "video"
          }),
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(buffer);
    });
    
    const result = uploadResult as any;
    
    // Create post in database
    const newPost = await Post.create({
      authorId: admin.risentaID,
      authorName: admin.adm_usn,
      authorPhoto: admin.photoProfile,
      description,
      mediaUrl: result.secure_url,
      mediaPublicId: result.public_id,
      mediaType,
      comments: [],
      views: [],
    });
    
    return NextResponse.json(
      { message: "Post created successfully", post: newPost },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { message: "Failed to create post" },
      { status: 500 }
    );
  }
}
