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

// Admin Password (Hardcoded as per request, but ideally should be in env)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SecureplacefinderMashoo1500!';

// Schema Definition
const shelterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        enum: ['underground_parking', 'public_shelter', 'building_shelter'] 
    },
    floors: { type: Number }, // Only relevant for underground_parking
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
        const { name, lat, lng, type, floors } = req.body;
        if (!name || !lat || !lng || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newShelter = new Shelter({ name, lat, lng, type, floors });
        const savedShelter = await newShelter.save();
        res.status(201).json(savedShelter);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save shelter' });
    }
});

// UPDATE shelter (Admin only)
app.put('/api/shelters/:id', async (req, res) => {
    const adminAuth = req.headers['x-admin-auth'];
    if (adminAuth !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Unauthorized: Invalid Admin Password' });
    }

    try {
        const { type, floors } = req.body;
        const updateData = { type };
        
        // Handle floors update logic
        if (type === 'underground_parking') {
            updateData.floors = floors;
        } else {
            updateData.floors = undefined; // Unset floors if not parking
        }

        const updatedShelter = await Shelter.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true } // Return the updated document
        );

        if (!updatedShelter) {
            return res.status(404).json({ error: 'Shelter not found' });
        }
        res.json(updatedShelter);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update shelter' });
    }
});

// DELETE shelter (Admin only)
app.delete('/api/shelters/:id', async (req, res) => {
    const adminAuth = req.headers['x-admin-auth'];
    if (adminAuth !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Unauthorized: Invalid Admin Password' });
    }

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
