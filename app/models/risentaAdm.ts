import mongoose from "mongoose";

const risentaAdmSchema = new mongoose.Schema({
  risentaID: { type: String, required: true, unique: true },
  adm_usn: {type: String, required: true, unique: true},
  token: { type: String, required: true },
  role: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const RisentaAdm = mongoose.models?.risenta_admin || mongoose.model("risenta_admin", risentaAdmSchema, 'risenta_admin');

export default RisentaAdm;