const mongoose = require('mongoose');
const joi = require('joi');

const logSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['meal', 'workout'],
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    quantity: {
        type: String,
        required: true
    },
    calories: {
        type: Number,
        required: true,
        min: 0
    },
    macronutrients: {
        protein: { type: Number, default: 0, min: 0 },
        carbs: { type: Number, default: 0, min: 0 },
        fat: { type: Number, default: 0, min: 0 }
    },
    micronutrients: {
        fiber: { type: Number, default: 0, min: 0 }
    },
    notes: {
        type: String,
        default: ''
    },
    imagePreview: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const Log = mongoose.model('Log', logSchema);

const validateLog = (data) => {
    const schema = joi.object({
        type: joi.string().valid('meal', 'workout').required(),
        itemName: joi.string().required(),
        quantity: joi.string().allow(''),
        calories: joi.number().min(0).required(),
        macronutrients: joi.object({
            protein: joi.number().min(0).allow(null),
            carbs: joi.number().min(0).allow(null),
            fat: joi.number().min(0).allow(null)
        }).optional(),
        micronutrients: joi.object({
            fiber: joi.number().min(0).allow(null)
        }).optional(),
        notes: joi.string().allow(''),
        imagePreview: joi.string().allow(''),
        createdAt: joi.string().isoDate().optional()
    });
    return schema.validate(data);
};

module.exports = { Log, validateLog };
