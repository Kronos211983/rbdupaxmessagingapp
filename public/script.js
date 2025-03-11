const socket = io();

function sendMessage() {
    const sender = document.getElementById("username").value;
    const content = document.getElementById("message").value;
    
    if (!sender || !content) {
        alert("Both sender and message are required!");
        return;
    }

    socket.emit("sendMessage", { sender, content });
}

socket.on("newMessage", (message) => {
    const li = document.createElement("li");
    li.textContent = `${message.sender}: ${message.content}`;
    document.getElementById("messages").appendChild(li);
});
