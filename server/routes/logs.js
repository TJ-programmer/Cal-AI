const router = require('express').Router();
const { Log, validateLog } = require('../models/log');
const auth = require('../middleware/auth');

// Fetch all logs for the authenticated user, sorted by date descending
router.get('/', auth, async (req, res) => {
    try {
        const logs = await Log.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Create a new log entry
router.post('/', auth, async (req, res) => {
    try {
        const { error, value } = validateLog(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const logEntry = new Log({
            user: req.user._id,
            ...value
        });

        await logEntry.save();
        res.status(201).json(logEntry);
    } catch (error) {
        console.error('Error saving log:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete a specific log entry
router.delete('/:id', auth, async (req, res) => {
    try {
        const logEntry = await Log.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!logEntry) {
            return res.status(404).json({ message: 'Log entry not found or unauthorized to delete.' });
        }
        res.json({ message: 'Log entry deleted successfully', id: logEntry._id });
    } catch (error) {
        console.error('Error deleting log:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
