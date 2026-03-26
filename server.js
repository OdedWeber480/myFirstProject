const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto'); // Built-in Node.js crypto
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with custom headers for caching
app.use(express.static(__dirname, {
    setHeaders: function (res, path, stat) {
        // Prevent caching of critical files to ensure updates are seen immediately
        if (path.includes('sw.js') || path.includes('v51')) {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
}));

// MongoDB Connection
if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in .env file');
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log('Connected to MongoDB');
            initializeAdmin(); // Check/Create Admin on startup
        })
        .catch(err => console.error('Could not connect to MongoDB:', err));
}

// In-memory session store (simple implementation for this scale)
// Map<token, timestamp>
const sessions = new Map();

// --- Schemas ---

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    hash: { type: String, required: true },
    salt: { type: String, required: true }
});

const Admin = mongoose.model('Admin', adminSchema);

// Shelter Schema
const shelterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        enum: ['underground_parking', 'public_shelter', 'building_shelter', 'portable_shelter'] 
    },
    floors: { type: Number }, // Only relevant for underground_parking
    description: { type: String, maxLength: 1000 },
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

// --- Auth Helpers ---

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === storedHash;
}

async function initializeAdmin() {
    try {
        const adminExists = await Admin.findOne({ username: 'admin' });
        if (!adminExists) {
            console.log('Initializing default admin account...');
            // The requested password
            const password = process.env.ADMIN_INIT_PASSWORD;
            if (!password) {
                console.error("ADMIN_INIT_PASSWORD not set in environment variables. Cannot initialize admin.");
                return;
            }

            const { salt, hash } = hashPassword(password);
            
            const newAdmin = new Admin({
                username: 'admin',
                salt: salt,
                hash: hash
            });
            
            await newAdmin.save();
            console.log('Admin account created in database.');
        } else {
            console.log('Admin account already exists.');
        }
    } catch (error) {
        console.error('Failed to initialize admin:', error);
    }
}

// --- API Routes ---

// Login Endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password required' });
        }

        let admin = await Admin.findOne({ username: 'admin' });
        
        // Lazy Initialization: If no admin exists, check if the provided password matches the init password
        if (!admin) {
            const initPassword = process.env.ADMIN_INIT_PASSWORD;
            
            if (initPassword && password === initPassword) {
                console.log("Lazy initialization: Creating admin user from valid login attempt.");
                const { salt, hash } = hashPassword(password);
                admin = new Admin({
                    username: 'admin',
                    salt: salt,
                    hash: hash
                });
                await admin.save();
                console.log("Admin user created successfully.");
            } else {
                // If init password isn't set, or doesn't match
                console.log("Login failed: Admin not configured and password did not match init password.");
                return res.status(401).json({ error: 'Admin not configured' });
            }
        }

        if (verifyPassword(password, admin.salt, admin.hash)) {
            // Generate Session Token
            const token = crypto.randomBytes(32).toString('hex');
            // Valid for 24 hours
            sessions.set(token, Date.now() + 24 * 60 * 60 * 1000);
            
            res.json({ success: true, token: token });
        } else {
            res.status(401).json({ error: 'Invalid Password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Middleware to verify session
function authenticate(req, res, next) {
    const token = req.headers['x-admin-token'];
    
    if (!token || !sessions.has(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const expiry = sessions.get(token);
    if (Date.now() > expiry) {
        sessions.delete(token);
        return res.status(401).json({ error: 'Session expired' });
    }

    next();
}

// GET all shelters
app.get('/api/shelters', async (req, res) => {
    try {
        const shelters = await Shelter.find().sort({ createdAt: -1 });
        res.json(shelters);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch shelters' });
    }
});

// POST new shelter (Admin only)
app.post('/api/shelters', authenticate, async (req, res) => {
    try {
        const { name, lat, lng, type, floors, description } = req.body;
        if (!name || !lat || !lng || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newShelter = new Shelter({ name, lat, lng, type, floors, description });
        const savedShelter = await newShelter.save();
        res.status(201).json(savedShelter);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save shelter' });
    }
});

// UPDATE shelter (Admin only)
app.put('/api/shelters/:id', authenticate, async (req, res) => {
    try {
        const { type, floors, description } = req.body;
        const updateData = { type, description };
        
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
app.delete('/api/shelters/:id', authenticate, async (req, res) => {
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
