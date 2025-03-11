require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// ✅ Serve Static Files from "public" Directory
app.use(express.static(path.join(__dirname, "public")));

// ✅ MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/messagingapp";

mongoose
    .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });

// ✅ Message Schema & Model
const MessageSchema = new mongoose.Schema({
    sender: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", MessageSchema);

// ✅ Get Messages API
app.get("/messages", async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 });
        res.json(messages);
    } catch (error) {
        console.error("❌ Error fetching messages:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Post Message API
app.post("/messages", async (req, res) => {
    try {
        const { sender, content } = req.body;
        if (!sender || !content) {
            return res.status(400).json({ error: "Sender and content are required." });
        }
        const message = new Message({ sender, content });
        await message.save();
        res.status(201).json(message);
    } catch (error) {
        console.error("❌ Error saving message:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Serve `index.html` for All Routes
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
