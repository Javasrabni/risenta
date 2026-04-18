import { NextRequest, NextResponse } from "next/server";
import ytSearch from "yt-search";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ error: "Missing search query" }, { status: 400 });
    }

    const result = await ytSearch(query);
    const videos = result.videos.slice(0, 5); // Return top 5 results

    if (videos.length === 0) {
      return NextResponse.json({ error: "No videos found" }, { status: 404 });
    }

    const searchResults = videos.map((v) => ({
      videoId: v.videoId,
      title: v.title,
      channel: v.author.name,
      thumbnail: v.thumbnail,
      durationString: v.timestamp
    }));

    return NextResponse.json({ results: searchResults });
  } catch (error) {
    console.error("Error searching music:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
