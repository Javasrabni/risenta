import { NextResponse } from "next/server";

const OPENROUTER_ENDPOINT =
  "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { message: "Prompt tidak valid" },
        { status: 400 }
      );
    }

    const res = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Risenta AI Writer",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-nano-12b-v2-vl:free",
        messages: [
          {
            role: "system",
            content: "Kamu adalah asisten penulis bahasa Indonesia.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { message: "OpenRouter error", detail: err },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      output: data.choices?.[0]?.message?.content ?? "",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
