const express = require('express');
const router = express.Router();
const Room = require('../models/room');
const { User } = require('../models/user');
const auth = require('../middleware/auth');


const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};


router.post('/create', auth, async (req, res) => {
    try {
        const { name, password = 'default' } = req.body;
        const joinCode = generateJoinCode();
        const roomId = `room_${Date.now()}`;
        
        const user = await User.findById(req.user._id);
        
        const room = new Room({
            roomId,
            name,
            creator: req.user._id,
            joinCode,
            password,
            participants: [{
                userId: req.user._id,
                username: user.firstName + ' ' + user.lastName
            }]
        });
        
        await room.save();
        res.status(201).json({ room, joinCode });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.post('/join', auth, async (req, res) => {
    try {
        const { joinCode, password } = req.body;
        
        const room = await Room.findOne({ joinCode, isActive: true });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        
        if (room.password !== password) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        
        const user = await User.findById(req.user._id);
        const isAlreadyParticipant = room.participants.some(p => 
            p.userId.toString() === req.user._id.toString()
        );
        
        if (!isAlreadyParticipant) {
            room.participants.push({
                userId: req.user._id,
                username: user.firstName + ' ' + user.lastName
            });
            await room.save();
        }
        
        res.json({ room });
    } catch (error) {
        res.status500.json({ message: error.message });
    }
});


router.get('/my-rooms', auth, async (req, res) => {
    try {
        const rooms = await Room.find({
            'participants.userId': req.user._id,
            isActive: true
        }).populate('creator', 'firstName lastName');
        
        res.json({ rooms });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.post('/leave/:roomId', auth, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        
        room.participants = room.participants.filter(p => 
            p.userId.toString() !== req.user._id.toString()
        );
        
        await room.save();
        res.json({ message: 'Left room successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/close/:roomId', auth, async (req, res) => {
    try {
        const room = await Room.findOne({ 
            roomId: req.params.roomId,
            creator: req.user._id
        });
        
        if (!room) {
            return res.status(404).json({ message: 'Room not found or unauthorized' });
        }
        
        room.isActive = false;
        await room.save();
        
        res.json({ message: 'Room closed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;