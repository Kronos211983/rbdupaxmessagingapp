const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const HOST = "192.168.1.8"; // Your local IP for LAN access

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("✅ Connected to MongoDB Compass");
}).catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static("public")); // Serve static HTML file

// Message Schema
const MessageSchema = new mongoose.Schema({
    sender: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", MessageSchema);

// API Routes
app.get("/messages", async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 });
        res.json(messages);
    } catch (error) {
        console.error("❌ Error fetching messages:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/messages", async (req, res) => {
    const { sender, content } = req.body;
    if (!sender || !content) {
        return res.status(400).json({ error: "Sender and content are required." });
    }
    try {
        const newMessage = new Message({ sender, content });
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (error) {
        console.error("❌ Error saving message:", error);
        res.status(500).json({ error: "Could not save message" });
    }
});

// Serve HTML file
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// WebSocket Setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log(`🔵 A user connected: ${socket.id}`);

    socket.on("sendMessage", async (data) => {
        console.log(`📩 Message received: ${data.content}`);
        const newMessage = new Message({ sender: data.sender, content: data.content });
        await newMessage.save();
        io.emit("newMessage", newMessage);
    });

    socket.on("disconnect", () => {
        console.log(`🔴 A user disconnected: ${socket.id}`);
    });
});

// Start server
server.listen(PORT, HOST, () => {
    console.log(`🚀 Server is running on http://${HOST}:${PORT}`);
});
