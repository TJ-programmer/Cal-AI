require('dotenv').config();
const express = require("express");
const app = express();
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const cookieParser = require("cookie-parser");
const path = require("path");

const server = http.createServer(app);

const socketIO = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

const connection = require("./db");
const userRoutes = require('./routes/users');
const authRoutes = require("./routes/auth");
const forgotPasswordRoutes = require("./routes/forgot-password");
const ResetPasswordRoutes = require("./routes/reset-password.js");
const chatRoutes = require("./routes/chats");
const fileRoutes = require("./routes/File.js");
const Chat = require("./models/chat.js");
const Room = require("./models/room.js");
const roomRoutes = require('./routes/room.js');
const communityRoutes = require('./routes/community');
const jwt = require('jsonwebtoken');
const generateUniqueChatId = require('./utils/generateUniqueChatId');
const { retrieveFileContent } = require("./services/contextretrieve.js");

const GrpcChatClient = require('./grpc client/grpcClient.js');
app.use(express.static('public'));

connection();

app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

app.use("/api/users/", userRoutes);
app.use("/api/auth/", authRoutes);
app.use("/api/forgot-password", forgotPasswordRoutes);
app.use("/api/resetpassword", ResetPasswordRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/files", fileRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/api/community', communityRoutes);


const grpcClient = new GrpcChatClient(process.env.GRPC_SERVER_ADDRESS || 'localhost:50051');

app.get("/api/health", (req, res) => {
    const grpcStatus = grpcClient.getConnectionStatus();
    const serverStatus = {
        status: "ok",
        timestamp: new Date().toISOString(),
        grpc: grpcStatus,
        socketConnections: ChatNameSpace.sockets.size,
        uptime: process.uptime()
    };
    
    if (!grpcStatus.connected) {
        serverStatus.status = "warning";
        serverStatus.message = "gRPC connection is not available";
    }
    
    res.json(serverStatus);
});


const CONTEXT_CONFIG = {
    MAX_MESSAGES: 15,           
    MAX_TOKENS: 700,           
    SYSTEM_PROMPT_TOKENS: 50,   
    RESPONSE_TOKENS: 250        
};


function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}


const SYSTEM_PROMPT = "You are a helpful AI assistant. Respond naturally and be concise but informative.";

async function buildConversationContext(chat, currentMessage, maxMessages, maxTokens) {
    const context = [];
    let totalTokens = 0;
    
    
    context.push({
        role: "system",
        content: SYSTEM_PROMPT,
        timestamp: Date.now()
    });
    totalTokens += estimateTokens(SYSTEM_PROMPT);
    
    if (chat && chat.messages && chat.messages.length > 0) {
        const recentMessages = chat.messages.slice(-maxMessages);
        for (const msg of recentMessages) {
            const messageTokens = estimateTokens(msg.text);
            
            if (totalTokens + messageTokens > maxTokens) {
                break; 
            }
            
            context.push({
                role: msg.isBot ? "assistant" : "user",
                content: msg.text,
                timestamp: new Date(msg.timestamp).getTime()
            });
            
            totalTokens += messageTokens;
        }
    }
    
    
    const currentTokens = estimateTokens(currentMessage);
    if (totalTokens + currentTokens <= maxTokens) {
        context.push({
            role: "user",
            content: currentMessage,
            timestamp: Date.now()
        });
        totalTokens += currentTokens;
    }
    
    console.log(`Built context with ${context.length} messages, ~${totalTokens} tokens`);
    return context;
}

function logContextUsage(context, userId, chatId) {
    const totalTokens = context.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
    const roles = context.map(m => m.role).join(' -> ');
    
    console.log(`Context Stats - User: ${userId}, Chat: ${chatId}`, {
        messageCount: context.length,
        estimatedTokens: totalTokens,
        conversationFlow: roles
    });
}

const ChatNameSpace = socketIO.of('/Chat');

ChatNameSpace.on("connection", async (socket) => {
    console.log(`User connected: ${socket.id} at ${new Date().toISOString()}`);
    
    let currentUser = null;
    let currentSessionId = null;
    let currentChatId = null;
    let currentRoomId = null;
    let activeGrpcCall = null;
    

    socket.on('authenticate', async (token) => {
        try {
            console.log('Attempting to authenticate with token:', token ? 'Token received' : 'No token');
            const decoded = jwt.verify(token, process.env.SESSIONKEY);
            currentUser = decoded._id;
            console.log('Authentication successful for user:', currentUser, 'at', new Date().toISOString());
            socket.emit('authenticated', { success: true ,user:currentUser});
        } catch (error) {
            console.error('Authentication failed:', error.message);
            socket.emit('authenticated', { success: false, error: 'Invalid token' });
        }
    });

    socket.on('join_chat', async (chatId) => {
        if (!currentUser) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
        }

        currentChatId = chatId ;
        console.log(`User ${currentUser} joining chat ${chatId} at ${new Date().toISOString()}`);
        
        
        try {
            let chat = await Chat.findOne({ 
                chatId:chatId, 
                userId: currentUser,
                isActive: true 
            });

            if (!chat) {
                socket.emit('error', { message: 'Chat not found' });
                return;
            }

            currentSessionId = chat.sessionId;
            const messages = chat.getMessages();
            
            socket.emit('chat_joined', {
                chatId: chatId,
                sessionId: chat.sessionId,
                title: chat.title,
                messages: messages,
                joinedAt: new Date().toISOString()
            });

            
            const welcomeText = "Hello! How can I help you today?";
            const hasWelcome = chat.messages.some(
                m => m.isBot && m.text === welcomeText
            );
            if (!hasWelcome) {
                const welcomeTimestamp = new Date();
                socket.emit("AI", { 
                    sender: "AI", 
                    message: welcomeText,
                    timestamp: welcomeTimestamp.toISOString()
                });
                await chat.addMessage(welcomeText, true);
            }
            
        } catch (error) {
            console.error('Error joining chat:', error);
            socket.emit('error', { message: 'Error joining chat' });
        }
    });

    socket.on('join_room_session', async (data) => {
        const { roomId, sessionId } = data;
        
        if (!currentUser) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
        }

        try {
            const room = await Room.findOne({ roomId, isActive: true });
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            const isParticipant = room.participants.some(p => 
                p.userId.toString() === currentUser.toString()
            );

            if (!isParticipant) {
                socket.emit('error', { message: 'Not a room participant' });
                return;
            }

            currentRoomId = roomId;
            currentSessionId = sessionId;
            
            socket.join(roomId);
            
            let chat = await Chat.findOne({ 
                sessionId, 
                roomId,
                isActive: true 
            });

            if (!chat) {
                chat = new Chat({
                    chatId: await generateUniqueChatId(Chat),
                    userId: currentUser,
                    sessionId,
                    roomId,
                    messages: []
                });
                await chat.save();
            }

            currentChatId = chat.chatId;
            const messages = chat.getMessages();
            
            socket.emit('room_session_joined', {
                chatId: chat.chatId,
                roomId,
                sessionId,
                room: room,
                messages: messages,
                joinedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error joining room session:', error);
            socket.emit('error', { message: 'Error joining room session' });
        }
    });

    async function handleAIMessage(socket, message, userId, chatId, sessionId, roomId, ragContext = "") {
    socket.hasReceivedStreamData = false;
    
    try {
        if (!userId || !message) {
            console.error('Missing required parameters for AI message handling');
            socket.emit('error', { message: 'Invalid request parameters' });
            return;
        }
        
        socket.emit("AI_typing", { typing: true });
        
        let aiResponseAccumulator = "";
        let chat = null;
        
        if (chatId) {
            chat = await Chat.findOne({ 
                chatId: chatId,
                userId: userId,
                isActive: true 
            });
        }
        
        if (!chat && sessionId) {
            if (roomId) {
                chat = await Chat.findOne({ 
                    sessionId: sessionId, 
                    roomId: roomId,
                    isActive: true 
                });
            } else {
                chat = await Chat.findOne({ 
                    sessionId: sessionId, 
                    userId: userId,
                    isActive: true 
                });
            }
        }
        
        let conversationContext = [];
        try {
            conversationContext = await buildConversationContext(
                chat, 
                message, 
                CONTEXT_CONFIG.MAX_MESSAGES,
                CONTEXT_CONFIG.MAX_TOKENS
            );
            
            // Inject RAG context if available
            if (ragContext && ragContext.trim() !== "") {
                // Find the last user message and append context to it
                for (let i = conversationContext.length - 1; i >= 0; i--) {
                    if (conversationContext[i].role === "user") {
                        conversationContext[i].content += ragContext;
                        console.log(`✓ RAG context injected into conversation (${ragContext.length} chars)`);
                        break;
                    }
                }
            }
            
            logContextUsage(conversationContext, userId, chatId);
        } catch (contextError) {
            console.warn('Failed to build context, using simple mode:', contextError);
            
            // Include RAG context in simple mode too
            const userMessage = ragContext ? message + ragContext : message;
            
            conversationContext = [
                {
                    role: "system",
                    content: SYSTEM_PROMPT,
                    timestamp: Date.now()
                },
                {
                    role: "user",
                    content: userMessage,
                    timestamp: Date.now()
                }
            ];
        }
        
        activeGrpcCall = grpcClient.streamChatWithContext(
            userId,
            sessionId,
            conversationContext,
            async (response) => {
                try {
                    const aiResponseTimestamp = new Date();
                    
                    socket.hasReceivedStreamData = true;
                    
                    aiResponseAccumulator += response.message;
                    
                    socket.emit("AI_stream", { 
                        sender: "AI", 
                        message: response.message,
                        timestamp: aiResponseTimestamp.toISOString(),
                        is_final: response.is_final,
                        response_id: response.response_id,
                        chatId: chatId
                    });

                    if (response.is_final && chat) {
                        if (aiResponseAccumulator && aiResponseAccumulator.trim() !== "") {
                            await chat.addMessage(aiResponseAccumulator, true);
                            console.log(`AI response saved with context at ${aiResponseTimestamp.toISOString()}`);
                        } else {
                            console.warn("AI response was empty, not saving to database.");
                        }
                        aiResponseAccumulator = ""; 
                    }
                    
                    if (roomId) {
                        socket.to(roomId).emit("AI_stream_room", { 
                            sender: "AI", 
                            message: response.message,
                            timestamp: new Date().toISOString(),
                            is_final: response.is_final,
                            response_id: response.response_id,
                            roomId: roomId,
                            chatId: chatId
                        });
                    }
                } catch (error) {
                    console.error('Error processing streaming response:', error);
                }
            },
            () => {
                socket.emit("AI_typing", { typing: false });
                socket.emit("AI_stream_end", { 
                    timestamp: new Date().toISOString(),
                    chatId: chatId
                });
                activeGrpcCall = null;
                console.log('Context-aware AI response stream completed successfully');
            },
            async (error) => {
                console.error('gRPC streaming error with context:', {
                    message: error.message,
                    code: error.code,
                    contextSize: conversationContext.length
                });
                
                if (!socket.hasReceivedStreamData) {
                    socket.emit("AI_typing", { typing: false });
                    
                    const fallbackTimestamp = new Date();
                    const fallbackResponse = `I apologize, but I'm experiencing technical difficulties. Please try again. Error: ${error.message}`;
                    
                    if (chat) {
                        await chat.addMessage(fallbackResponse, true);
                    }

                    socket.emit("AI", { 
                        sender: "AI", 
                        message: fallbackResponse,
                        timestamp: fallbackTimestamp.toISOString(),
                        error: true,
                        chatId: chatId
                    });
                } else {
                    socket.emit("AI_typing", { typing: false });
                    socket.emit("AI_stream_end", { 
                        timestamp: new Date().toISOString(),
                        chatId: chatId
                    });
                }
                
                activeGrpcCall = null;
            }
        );

    } catch (error) {
        console.error('Error processing message with context:', error);
        socket.emit('error', { message: 'Error processing message' });
        socket.emit("AI_typing", { typing: false });
    }
}

socket.on('User', async (data) => {
    if (!currentUser || !currentSessionId || !currentChatId) {
        socket.emit('error', { message: 'Not authenticated or no active chat' });
        return;
    }

    if (!data || typeof data.message !== 'string') {
        socket.emit('error', { message: 'Invalid message format' });
        return;
    }

    let contextText = "";

    try {
        const fileResponse = await retrieveFileContent({
            chatId: currentChatId,
            query: data.message
        });

        if (fileResponse?.context) {
            contextText = "\n\nContext:\n" + fileResponse.context;
            console.log(`✓ Retrieved RAG context (${contextText.length} chars)`);
        }
    } catch (err) {
        console.error("Context retrieval failed:", err.message);
    }

    const messageTimestamp = new Date();
    console.log(`Received message: ${data.message}`);

    try {
        let chat = await Chat.findOne({
            chatId: currentChatId,
            sessionId: currentSessionId,
            userId: currentUser,
            isActive: true
        });

        if (currentRoomId) {
            chat = await Chat.findOne({
                sessionId: currentSessionId,
                roomId: currentRoomId,
                isActive: true
            });
        }

        if (chat) {
            // Save ONLY the original user message (without context)
            await chat.addMessage(data.message, false);
        }

        socket.activeGrpcCall?.cancel();
        socket.activeGrpcCall = null;
        
        console.log({
            userMessage: data.message,
            contextAvailable: !!contextText,
            contextLength: contextText.length
        });

        // Pass context as a separate parameter
        await handleAIMessage(
            socket,
            data.message,        // Original message
            currentUser,
            currentChatId,
            currentSessionId,
            currentRoomId,
            contextText          // RAG context passed separately
        );

    } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('error', { message: 'Error processing message' });
        socket.emit("AI_typing", { typing: false });
    }
});


    socket.on('cancel_stream', () => {
        if (activeGrpcCall) {
            console.log('Cancelling active gRPC stream');
            activeGrpcCall.cancel();
            activeGrpcCall = null;
            socket.emit("AI_typing", { typing: false });
            socket.emit("AI_stream_cancelled", { 
                timestamp: new Date().toISOString(),
                chatId:currentChatId
            });
        }
    });

    socket.on('disconnect', (reason) => {
        const disconnectTime = new Date().toISOString();
        console.log(`User disconnected: ${socket.id}, reason: ${reason}, time: ${disconnectTime}`);
        
        if (activeGrpcCall) {
            activeGrpcCall.cancel();
            activeGrpcCall = null;
        }
    });

    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id} at ${new Date().toISOString()}:`, error);
    });
});

socketIO.on('connection_error', (error) => {
    console.error('Socket.IO connection error at', new Date().toISOString(), ':', error);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing gRPC client...');
    grpcClient.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, closing gRPC client...');
    grpcClient.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

const port = process.env.PORT || 5000;

server.listen(port, () => {
    console.log(`Server is running on port ${port} at ${new Date().toISOString()}...`);
    console.log(`Socket.IO server is ready for connections`);
    console.log(`gRPC client configured for: ${process.env.GRPC_SERVER_ADDRESS || 'localhost:50051'}`);
});