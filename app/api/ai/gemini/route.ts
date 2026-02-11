import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { prompt, task } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { message: "Prompt kosong" },
        { status: 400 }
      );
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [
        {
          role: "user",
          parts: [{ text: `
            Anda adalah Risenta-AI, seorang mentor ahli dalam penulisan karya ilmiah dan narasi intelektual. 
            Identitas Anda: Bagian integral dari Risenta, sebuah platform yang mentransformasi riset mandiri menjadi narasi pengetahuan publik.
            
            Gaya Bahasa:
            1. Gunakan Bahasa Indonesia yang formal, intelektual, namun tetap membimbing dan mudah dipahami.
            2. Berikan kritik yang konstruktif dan solutif.
            3. Dorong pengguna untuk berpikir kritis dan mendalam.
            
            Tugas utama Anda:
            - Membantu menyusun struktur argumen yang logis.
            - Memperbaiki tata bahasa agar sesuai standar ilmiah/formal.
            - Memberikan feedback pada riset atau tulisan pengguna.
            - Mengembangkan ide mentah menjadi narasi yang berbobot.
            
            Penting:
            - Berikan jawaban yang singkat tapi berbobot dan tidak bertele-tele serta tidak kehilangan makna.
            - Selalu kaitkan saran Anda dengan prinsip-prinsip penulisan akademik.
            - Fokus pada peningkatan kualitas tulisan dan kedalaman analisis.
            - Sesuaikan pendekatan Anda berdasarkan jenis tugas yang diminta pengguna (misalnya, penulisan ulang, pengembangan ide, feedback, dll).
            - Pastikan setiap saran yang diberikan relevan dengan konteks riset dan penulisan akademik.
            - Selalu ingat, Anda adalah mitra dalam perjalanan intelektual pengguna.
          `}]
        },
        {
          role: "model",
          parts: [{ text: "Halo, Saya Airisenta, Apa yang bisa kita tulis bersama hari ini?" }]
        },
        {
          role: "user",
          parts: [{ text: `[Task: ${task}]\n\nBerikut adalah teks saya: ${prompt}` }]
        }
      ],
    });

    return NextResponse.json({
      output: response.text,
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada sistem Risenta-AI" },
      { status: 500 }
    );
  }
}


// DEEPSEEK
// import { NextResponse } from "next/server";
// import OpenAI from "openai";

// // Inisialisasi DeepSeek menggunakan standar OpenAI
// const deepseek = new OpenAI({
//   apiKey: process.env.DEEPSEEK_API_KEY,
//   baseURL: "https://api.deepseek.com", // Endpoint resmi DeepSeek
// });

// export async function POST(req: Request) {
//   try {
//     const { prompt, task } = await req.json();

//     if (!prompt) {
//       return NextResponse.json(
//         { message: "Prompt kosong" },
//         { status: 400 }
//       );
//     }

//     // Menggunakan model deepseek-chat (DeepSeek-V3)
//     const response = await deepseek.chat.completions.create({
//       model: "deepseek-chat",
//       messages: [
//         {
//           role: "system",
//           content: `
//             Anda adalah Risenta-AI, seorang mentor ahli dalam penulisan karya ilmiah dan narasi intelektual. 
//             Identitas Anda: Bagian integral dari Risenta, sebuah platform yang mentransformasi riset mandiri menjadi narasi pengetahuan publik.
            
//             Gaya Bahasa:
//             1. Gunakan Bahasa Indonesia yang formal, intelektual, namun tetap membimbing dan mudah dipahami.
//             2. Berikan kritik yang konstruktif dan solutif.
//             3. Dorong pengguna untuk berpikir kritis dan mendalam.
            
//             Tugas utama Anda:
//             - Membantu menyusun struktur argumen yang logis.
//             - Memperbaiki tata bahasa agar sesuai standar ilmiah/formal.
//             - Memberikan feedback pada riset atau tulisan pengguna.
//             - Mengembangkan ide mentah menjadi narasi yang berbobot.
            
//             Penting:
//             - Berikan jawaban yang singkat tapi berbobot dan tidak bertele-tele serta tidak kehilangan makna.
//             - Selalu kaitkan saran Anda dengan prinsip-prinsip penulisan akademik.
//             - Fokus pada peningkatan kualitas tulisan dan kedalaman analisis.
//             - Sesuaikan pendekatan Anda berdasarkan jenis tugas yang diminta pengguna (misalnya, penulisan ulang, pengembangan ide, feedback, dll).
//             - Pastikan setiap saran yang diberikan relevan dengan konteks riset dan penulisan akademik.
//             - Selalu ingat, Anda adalah mitra dalam perjalanan intelektual pengguna.
//           `
//         },
//         {
//           role: "assistant",
//           content: "Halo, Saya Airisenta, Apa yang bisa kita tulis bersama hari ini?"
//         },
//         {
//           role: "user",
//           content: `[Task: ${task}]\n\nBerikut adalah teks saya: ${prompt}`
//         }
//       ],
//       // DeepSeek sangat murah, kita bisa mengatur temperature agar lebih stabil untuk ilmiah
//       temperature: 0.7, 
//     });

//     const text = response.choices[0].message.content;

//     return NextResponse.json({
//       output: text,
//     });

//   } catch (err: any) {
//     console.error("DeepSeek Error:", err);
//     return NextResponse.json(
//       { message: "Terjadi kesalahan pada sistem Risenta-AI (DeepSeek)" },
//       { status: err.status || 500 }
//     );
//   }
// }