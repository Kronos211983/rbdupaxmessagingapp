const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, "public")));

// ✅ Serve index.html on root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Message Schema & Model
const Message = mongoose.model("Message", new mongoose.Schema({
    sender: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
}));

// ✅ API: Get Messages
app.get("/messages", async (req, res) => {
    const messages = await Message.find().sort({ timestamp: 1 });
    res.json(messages);
});

// ✅ WebSocket (Socket.io) Setup
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
    console.log(`🔵 User connected: ${socket.id}`);

    Message.find().sort({ timestamp: -1 }).limit(50).then((messages) => {
        socket.emit("messageHistory", messages.reverse());
    });

    socket.on("sendMessage", async (data) => {
        if (!data.sender || !data.content) return;
        const message = new Message({ sender: data.sender, content: data.content });
        await message.save();
        io.emit("newMessage", message);
    });

    socket.on("disconnect", () => console.log(`🔴 User disconnected: ${socket.id}`));
});

// ✅ Start Server
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
