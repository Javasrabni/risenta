"use server";

import connectDB from "@/utils/mongodb";
import RisentaAdm from "@/app/models/risentaAdm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const { note } = await req.json();
  if (!note) {
    return NextResponse.json(
      { message: "Note tidak boleh kosong" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const admin = await RisentaAdm.findOneAndUpdate(
    { token },
    { $set: { notes: note } },
    { new: true }
  );

  if (!admin) {
    return NextResponse.json(
      { message: "Admin tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { message: "Notes berhasil diperbarui", notes: admin.notes },
    { status: 200 }
  );
}
