require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const socketIo = require("socket.io");

// 🔹 Express App & Server Setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 🔹 Middleware
app.use(cors());
app.use(express.json());

// 🔹 MongoDB Compass Connection
const MONGO_URI = "mongodb://localhost:27017/messagingapp";  // Replace with your local database name

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("✅ Connected to MongoDB (Local Compass)");
}).catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
});

// 🔹 Message Schema & Model
const messageSchema = new mongoose.Schema({
    sender: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

// 🔹 API Route to Fetch Messages
app.get("/messages", async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 });
        res.json(messages);
    } catch (error) {
        console.error("❌ Error fetching messages:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// 🔹 API Route to Send Messages
app.post("/messages", async (req, res) => {
    try {
        const { sender, content } = req.body;
        if (!sender || !content) {
            return res.status(400).json({ error: "Sender and content are required!" });
        }

        const newMessage = new Message({ sender, content });
        await newMessage.save();

        // Emit message to all connected clients
        io.emit("newMessage", newMessage);
        res.status(201).json(newMessage);
    } catch (error) {
        console.error("❌ Error sending message:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// 🔹 WebSocket Connection for Real-Time Chat
io.on("connection", (socket) => {
    console.log("🔵 A user connected:", socket.id);

    socket.on("sendMessage", async (data) => {
        try {
            const { sender, content } = data;
            if (!sender || !content) {
                console.log("❌ Validation Error: sender and content are required.");
                return;
            }

            const newMessage = new Message({ sender, content });
            await newMessage.save();
            io.emit("newMessage", newMessage);
        } catch (error) {
            console.error("❌ Error handling WebSocket message:", error);
        }
    });

    socket.on("disconnect", () => {
        console.log("🔴 A user disconnected:", socket.id);
    });
});

// 🔹 Start Server on Local Network (192.168.1.8)
const PORT = 5000;
server.listen(PORT, "192.168.1.8", () => {
    console.log(`🚀 Server is running on http://192.168.1.8:${PORT}`);
});
