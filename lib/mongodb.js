import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUrl = process.env.MONGO_URL || "";

if (!mongoUrl) {
  throw new Error("MONGO_URL is not defined in environment variables");
}

mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("Connected to MongoDB successfully");
})
.catch((error) => {
  console.error("Error connecting to MongoDB:", error);
});

export default mongoose;