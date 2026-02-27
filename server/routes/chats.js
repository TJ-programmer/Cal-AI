const express = require('express');
const router = express.Router();
const Chat = require('../models/chat');
const auth = require('../middleware/auth');
const generateUniqueChatId = require('../utils/generateUniqueChatId');

router.get('/sessions', auth, async (req, res) => {
    try {
        const chats = await Chat.findByUserId(req.user._id);
        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat sessions', error: error.message });
    }
});

router.post('/create', auth, async (req, res) => {
    console.log('=== CHAT CREATE ENDPOINT CALLED ===');
    console.log('Request body:', req.body);
    console.log('User from auth middleware:', req.user);
    
    try {
        const { title } = req.body;
        console.log('Creating new chat with title:', title);
        console.log('User ID:', req.user._id);

        
        const chatId = await generateUniqueChatId(Chat);
        console.log('Generated chatId:', chatId);
        
        const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('Generated sessionId:', sessionId);

        const chat = new Chat({
            chatId: chatId,
            sessionId: sessionId,
            userId: req.user._id,
            title: title || "new chat",
            messages: [] 
        });

        console.log('Saving chat object:', chat);
        await chat.save();
        console.log('Chat saved successfully:', chat);
        console.log('Chat ID in saved object:', chat.chatId);
        
        res.status(201).json(chat);
    } catch (error) {
        console.error('Error creating chat session:', error);
        res.status(500).json({ message: 'Error creating chat session', error: error.message });
    }
});



router.get('/:chatId',auth,async(req,res)=>{
    try {
        const chat = await Chat.findOne({
            chatId:req.params.chatId,
            userId:req.user._id,
            isActive:true
        });

        if(!chat){
            return res.status(404).json({message:'Chat not found'});
        }

        res.json(chat)
    } catch (error) {
       res.status(500).json({message:'Error fetching chat session',error:error.message});
    }
});


router.get('/:chatId/session', auth, async (req, res) => {
    try {
        const chat = await Chat.findOne({ 
            chatId:req.params.chatId,
            userId: req.user._id,
            isActive: true 
        });
        
        if (!chat) {
            return res.status(404).json({ message: 'Chat session not found' });
        }
        
        res.json({
            chatId: chat.chatId,
            sessionId: chat.sessionId,
            title: chat.title,
            messages: chat.getMessages(),
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat session', error: error.message });
    }
});


router.post('/:chatId/message', auth, async (req, res) => {
    try {
        const { text, isBot } = req.body;
        
        let chat = await Chat.findOne({ 
            chatId:req.params.chatId,
            userId: req.user._id,
            isActive: true 
        });
        
        if (!chat) {
            return res.status(404).json({ message: 'Chat session not found' });
        }
        
        await chat.addMessage(text, isBot);
        res.json(chat);
    } catch (error) {
        res.status(500).json({ message: 'Error saving message', error: error.message });
    }
});

router.delete('/:chatId', auth, async (req, res) => {
    try {
        const chat = await Chat.findOne({ 
            chatId: req.params.chatId,
            userId: req.user._id 
        });
        
        if (!chat) {
            return res.status(404).json({ message: 'Chat session not found' });
        }
        
        chat.isActive = false;
        await chat.save();
        
        res.json({ 
            message: 'Chat deleted successfully',
            chatId: req.params.chatId 
        });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ 
            message: 'Error deleting chat', 
            error: error.message 
        });
    }
});

router.put('/:chatId/title', auth, async (req, res) => {
    try {
        const { title } = req.body;
        
        const chat = await Chat.findOne({ 
            chatId: req.params.chatId,
            userId: req.user._id,
            isActive: true 
        });
        
        if (!chat) {
            return res.status(404).json({ message: 'Chat  not found' });
        }
        
        chat.title = title;
        await chat.save();
        
        res.json(chat);
    } catch (error) {
        res.status(500).json({ message: 'Error updating chat title', error: error.message });
    }
});

router.get('/:chatId/message',auth,async(req,res)=>{
    try {
        const{page= 1,limit= 50} =req.query;

        const chat = await Chat.findOne({ 
            chatId: req.params.chatId,
            userId: req.user._id,
            isActive: true 
        });
        
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const messages = chat.getMessages();
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedMessages = messages.slice(startIndex, endIndex);
        
        res.json({
            messages: paginatedMessages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: messages.length,
                hasNext: endIndex < messages.length,
                hasPrev: startIndex > 0
            }
        });

    } catch (error) {
        
    }
});
module.exports = router;