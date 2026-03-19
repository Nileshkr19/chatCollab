    import mongoose from "mongoose";
    import logger from "../utils/logger.js";

    const connectMongoDB = async () => {
    if (!process.env.MONGODB_URI) {
        logger.error("MONGODB_URI is not defined in environment variables");
        throw new Error("MONGODB_URI is not defined in environment variables");
    }
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        mongoose.connection.on("error", (err) => {
        logger.error(`MongoDB connection error: ${err.message}`);
        });

        mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB connection lost. Attempting to reconnect...");
        });

        return conn;
    } catch (error) {
        logger.error(`Failed to connect to MongoDB: ${error.message}`);
        throw error;
    }
    };
    export default connectMongoDB;
