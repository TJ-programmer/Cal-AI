const jwt = require('jsonwebtoken');
const { User } = require('../models/user'); // Destructure User from the exported object

const auth = async (req, res, next) => {
    try {
        console.log('=== AUTH MIDDLEWARE DEBUG ===');
        console.log('Request URL:', req.url);
        console.log('Request method:', req.method);
        console.log('User model:', User);
        console.log('User.findById exists:', typeof User.findById);
        
        const authHeader = req.header('Authorization');
        const xAuthToken = req.header('x-auth-token');
        
        console.log('Auth header:', authHeader);
        console.log('X-Auth-Token:', xAuthToken);
        
        let token = null;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
        } else if (xAuthToken) {
            token = xAuthToken;
        }
        
        console.log('Extracted token:', token ? token.substring(0, 20) + '...' : 'No token');
        
        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.SESSIONKEY);
        console.log('Decoded token:', decoded);
        
        const user = await User.findById(decoded._id);
        console.log('User found:', !!user);
        console.log('User ID:', user?._id);
        
        if (!user) {
            console.log('User not found in database');
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        console.log('User attached to request:', req.user._id);
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token format' });
        }
        
        res.status(401).json({ message: 'Token is not valid', error: error.message });
    }
};

module.exports = auth;