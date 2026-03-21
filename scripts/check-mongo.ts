import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../apps/api/.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/testlab";

async function checkConnection() {
  try {
    console.log(`Testing connection to ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not connected");
    const collections = await db.listCollections().toArray();
    console.log(
      "Collections:",
      collections.map((c) => c.name)
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Connection failed:", err);
    process.exit(1);
  }
}

checkConnection();
