const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            connectTimeoutMS: 30000, // Increase connection timeout to 30 seconds (adjust as needed)
        });
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("MongoDB connection error:", err.message);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;
