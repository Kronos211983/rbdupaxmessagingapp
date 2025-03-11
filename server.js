require("dotenv").config(); // Load environment variables

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // Enable JSON parsing
app.use(cors()); // Enable CORS for frontend & mobile app

// ✅ Secure MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error("❌ MongoDB URI is missing! Check your .env file.");
    process.exit(1); // Stop execution if the URI is missing
}

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1); // Exit the app if connection fails
    });

// ✅ Define Message Schema & Model
const messageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

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

        io.emit("newMessage", newMessage); // Notify all connected users
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

    // ✅ Send last 50 messages when a user connects
    Message.find().sort({ timestamp: -1 }).limit(50).then((messages) => {
        socket.emit("messageHistory", messages.reverse());
    }).catch((err) => console.error("❌ Error fetching chat history:", err));

    // ✅ Handle message sending
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

// ✅ Root Route for Testing
app.get("/", (req, res) => {
    res.send("🚀 Messaging App Backend is running!");
});

// ✅ Start Server
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
