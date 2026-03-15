const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// MongoDB Connection
if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in .env file');
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Connected to MongoDB'))
        .catch(err => console.error('Could not connect to MongoDB:', err));
}

// Schema Definition
const shelterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Transform _id to id for frontend compatibility
shelterSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
    }
});

const Shelter = mongoose.model('Shelter', shelterSchema);

// API Routes

// GET all shelters
app.get('/api/shelters', async (req, res) => {
    try {
        const shelters = await Shelter.find().sort({ createdAt: -1 });
        res.json(shelters);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch shelters' });
    }
});

// POST new shelter
app.post('/api/shelters', async (req, res) => {
    try {
        const { name, lat, lng } = req.body;
        if (!name || !lat || !lng) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newShelter = new Shelter({ name, lat, lng });
        const savedShelter = await newShelter.save();
        res.status(201).json(savedShelter);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save shelter' });
    }
});

// DELETE shelter
app.delete('/api/shelters/:id', async (req, res) => {
    try {
        const result = await Shelter.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Shelter not found' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete shelter' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
