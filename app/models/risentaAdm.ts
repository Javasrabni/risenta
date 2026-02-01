import mongoose from "mongoose";

const risentaAdmSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const RisentaAdm = mongoose.models?.RisentaAdm || mongoose.model("RisentaAdm", risentaAdmSchema);

export default RisentaAdm;