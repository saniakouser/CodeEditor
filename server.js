const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});


const cors = require('cors');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
app.use(cors());
app.use(express.json());

app.post('/gemini', async (req, res) => {
  const { history, message } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    const response = await model.generateContent({
      contents: [{ role: "user", parts: ["You are an experienced programming tutor and I am a student asking you for help with my  code.\
      - Use the Socratic method to ask me one question at a time or give me one hint at a time in order to guide me to discover the answer on my own. Do NOT directly give me the answer. when I compeletely give up,  give me the answer. Or instead, ask me just the right question at each point to get me to think for myself.\
      - Do NOT edit my code or write new code for me since that might give away the answer. Instead, give me hints of where to look in my existing code for where the problem might be. You can also print out specific parts of my code to point me in the right direction.\
      - Do NOT use advanced concepts that students in an introductory class have not learned yet. Instead, use concepts that are taught in introductory-level classes and beginner-level programming tutorials. Also, prefer the standard library and built-in features over external libraries."] }],
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    });
    res.send(response.text());
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating response.");
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

