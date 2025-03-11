require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const path = require("path");

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public"))); // Serve static frontend

// ✅ Connect to MongoDB Atlas
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
    console.error("❌ MongoDB URI is missing! Check your .env file.");
    process.exit(1);
}

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });

// ✅ Define Message Schema & Model
const messageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

// ✅ Serve Frontend HTML
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ API Endpoint: Get All Messages
app.get("/messages", async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 });
        res.json(messages);
    } catch (error) {
        console.error("❌ Error fetching messages:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ API Endpoint: Send a Message
app.post("/messages", async (req, res) => {
    try {
        const { sender, content } = req.body;
        if (!sender || !content) {
            return res.status(400).json({ error: "Both sender and content are required" });
        }

        const newMessage = new Message({ sender, content });
        await newMessage.save();

        io.emit("newMessage", newMessage);
        res.status(201).json({ message: "Message sent successfully!", newMessage });
    } catch (error) {
        console.error("❌ Error sending message:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ WebSocket (Socket.IO) Setup
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
    console.log(`🔵 A user connected: ${socket.id}`);

    Message.find().sort({ timestamp: -1 }).limit(50).then((messages) => {
        socket.emit("messageHistory", messages.reverse());
    }).catch((err) => console.error("❌ Error fetching chat history:", err));

    socket.on("sendMessage", async (data) => {
        console.log("📩 Message received:", data);

        if (!data.sender || !data.content) {
            console.error("❌ Validation Error: sender and content are required.");
            return;
        }

        try {
            const message = new Message({ sender: data.sender, content: data.content });
            await message.save();
            io.emit("newMessage", message);
            console.log("✅ Message saved:", message);
        } catch (error) {
            console.error("❌ Error saving message:", error);
        }
    });

    socket.on("disconnect", () => {
        console.log(`🔴 A user disconnected: ${socket.id}`);
    });
});

// ✅ Start Server
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
