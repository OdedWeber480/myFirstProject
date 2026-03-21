const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises; // Use fs.promises
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'shelters.json');
const ADMIN_FILE = path.join(__dirname, 'admin.json');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with custom headers for caching
app.use(express.static(__dirname, {
    setHeaders: function (res, path, stat) {
        // Prevent caching of critical files to ensure updates are seen immediately
        if (path.endsWith('sw.js') || path.endsWith('index.html') || path.endsWith('app.v41.js') || path.endsWith('main.css') || path.endsWith('report.v41.js')) {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
}));

// In-memory session store
const sessions = new Map();

// --- Helper Functions for File Persistence ---

async function readData(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return empty structure
        if (error.code === 'ENOENT') {
            return filePath === DATA_FILE ? [] : null;
        }
        throw error;
    }
}

async function writeData(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

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

// Initialize Admin
async function initializeAdmin() {
    try {
        let admin = await readData(ADMIN_FILE);
        
        if (!admin) {
            console.log('Initializing default admin account...');
            const password = process.env.ADMIN_INIT_PASSWORD;
            
            if (!password) {
                console.warn("ADMIN_INIT_PASSWORD not set. Admin features will be disabled until configured.");
                return;
            }

            const { salt, hash } = hashPassword(password);
            admin = {
                username: 'admin',
                salt: salt,
                hash: hash
            };
            
            await writeData(ADMIN_FILE, admin);
            console.log('Admin account created in admin.json.');
        } else {
            console.log('Admin account loaded from admin.json.');
        }
    } catch (error) {
        console.error('Failed to initialize admin:', error);
    }
}

// Call init
initializeAdmin();

// --- API Routes ---

// Login Endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password required' });
        }

        let admin = await readData(ADMIN_FILE);
        
        // Lazy Initialization
        if (!admin) {
            const initPassword = process.env.ADMIN_INIT_PASSWORD;
            if (initPassword && password === initPassword) {
                console.log("Lazy initialization: Creating admin user.");
                const { salt, hash } = hashPassword(password);
                admin = { username: 'admin', salt, hash };
                await writeData(ADMIN_FILE, admin);
            } else {
                return res.status(401).json({ error: 'Admin not configured' });
            }
        }

        if (verifyPassword(password, admin.salt, admin.hash)) {
            const token = crypto.randomBytes(32).toString('hex');
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
        const shelters = await readData(DATA_FILE);
        // Sort by createdAt descending (newest first)
        shelters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(shelters);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch shelters' });
    }
});

// POST new shelter
app.post('/api/shelters', async (req, res) => {
    try {
        const { name, lat, lng, type, floors, description } = req.body;
        if (!name || !lat || !lng || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const shelters = await readData(DATA_FILE);
        
        const newShelter = {
            id: crypto.randomUUID(), // Generate a unique ID
            name,
            lat,
            lng,
            type,
            floors,
            description,
            createdAt: new Date().toISOString()
        };

        shelters.push(newShelter);
        await writeData(DATA_FILE, shelters);
        
        res.status(201).json(newShelter);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save shelter' });
    }
});

// UPDATE shelter (Admin only)
app.put('/api/shelters/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, floors, description } = req.body;
        
        const shelters = await readData(DATA_FILE);
        const index = shelters.findIndex(s => s.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Shelter not found' });
        }

        // Update fields
        shelters[index].type = type;
        shelters[index].description = description;
        
        if (type === 'underground_parking') {
            shelters[index].floors = floors;
        } else {
            delete shelters[index].floors;
        }

        await writeData(DATA_FILE, shelters);
        res.json(shelters[index]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update shelter' });
    }
});

// DELETE shelter (Admin only)
app.delete('/api/shelters/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        let shelters = await readData(DATA_FILE);
        const initialLength = shelters.length;
        
        shelters = shelters.filter(s => s.id !== id);

        if (shelters.length === initialLength) {
            return res.status(404).json({ error: 'Shelter not found' });
        }

        await writeData(DATA_FILE, shelters);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete shelter' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Using local JSON storage for data persistence.');
});
