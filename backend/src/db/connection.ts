import { connect, disconnect } from "mongoose";

export const connectDB = async () => {
  const URI = process.env.MONGODB_URI;
  if (!URI) throw new Error("MongoDB URI is not defined in the env.");
  try {
    await connect(URI);
  } catch (error) {
    console.log(error);
    throw new Error("Failed to connect to MongoDB.");
  }
};

export const disconnectDB = async () => {
  try {
    await disconnect();
  } catch (error) {
    console.log(error);
    throw new Error("Failed to disconnect from MongoDB.");
  }
};
