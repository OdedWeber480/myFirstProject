const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'shelters.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// API Routes

// GET all shelters
app.get('/api/shelters', (req, res) => {
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to read database' });
        }
        try {
            const shelters = JSON.parse(data);
            res.json(shelters);
        } catch (parseErr) {
            res.status(500).json({ error: 'Failed to parse database' });
        }
    });
});

// POST new shelter
app.post('/api/shelters', (req, res) => {
    const newShelter = req.body;
    
    // Basic validation
    if (!newShelter.name || !newShelter.lat || !newShelter.lng) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read database' });
        }
        
        let shelters = [];
        try {
            shelters = JSON.parse(data);
        } catch (e) {
            shelters = [];
        }

        // Add ID if not present
        if (!newShelter.id) {
            newShelter.id = Date.now();
        }

        shelters.push(newShelter);

        fs.writeFile(DB_FILE, JSON.stringify(shelters, null, 2), (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ error: 'Failed to save shelter' });
            }
            res.status(201).json(newShelter);
        });
    });
});

// DELETE shelter (Optional but good to have)
app.delete('/api/shelters/:id', (req, res) => {
    const id = parseInt(req.params.id);

    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read database' });
        }
        
        let shelters = JSON.parse(data);
        const filteredShelters = shelters.filter(s => s.id !== id);

        fs.writeFile(DB_FILE, JSON.stringify(filteredShelters, null, 2), (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ error: 'Failed to delete shelter' });
            }
            res.json({ success: true });
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
