document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.error('Service Worker Failed', err));
    }

    const guideBtn = document.getElementById('guide-btn');
    const viewMapBtn = document.getElementById('view-map-btn');
    const mapModal = document.getElementById('map-modal');
    const closeMapBtn = document.getElementById('close-map-btn');
    const addShelterForm = document.getElementById('add-shelter-form');
    const shelterTypeSelect = document.getElementById('shelter-type');
    const floorsGroup = document.getElementById('floors-group');
    const floorsInput = document.getElementById('floors');
    const statusMessage = document.getElementById('status-message');
    const shelterCountSpan = document.getElementById('shelter-count');

    // Admin Elements
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminPanelBtn = document.getElementById('admin-panel-btn');
    const loginModal = document.getElementById('login-modal');
    const closeLoginBtn = document.getElementById('close-login-btn');
    const submitLoginBtn = document.getElementById('submit-login-btn');
    const adminPasswordInput = document.getElementById('admin-password');
    const adminPanelModal = document.getElementById('admin-panel-modal');
    const closeAdminPanelBtn = document.getElementById('close-admin-panel-btn');
    const adminShelterList = document.getElementById('admin-shelter-list');
    
    // Edit Elements
    const editModal = document.getElementById('edit-modal');
    const closeEditBtn = document.getElementById('close-edit-btn');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const editShelterId = document.getElementById('edit-shelter-id');
    const editShelterType = document.getElementById('edit-shelter-type');
    const editFloorsGroup = document.getElementById('edit-floors-group');
    const editFloorsInput = document.getElementById('edit-floors');
    const editViewMapBtn = document.getElementById('edit-view-map-btn');

    // API URL
    const API_URL = '/api/shelters';
    let shelters = [];
    let map = null;
    let userMarker = null;
    let mapMarkers = [];
    let adminToken = sessionStorage.getItem('adminToken') || null;

    // Check if already logged in
    if (adminToken) {
        adminPanelBtn.style.display = 'block';
        adminLoginBtn.textContent = 'Logout';
    }

    // Render initial list
    fetchShelters();

    // Helper: Update status message
    function setStatus(msg) {
        statusMessage.textContent = msg;
    }

    // Helper: Fetch shelters from server
    async function fetchShelters() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to fetch data');
            shelters = await response.json();
            renderShelterStats();
        } catch (error) {
            console.error('Error fetching shelters:', error);
            setStatus('Failed to load shelter list.');
        }
    }

    // --- Admin Functions ---

    // Toggle Login Modal
    adminLoginBtn.addEventListener('click', () => {
        if (adminToken) {
            // Logout
            adminToken = null;
            sessionStorage.removeItem('adminToken');
            adminPanelBtn.style.display = 'none';
            adminLoginBtn.textContent = 'Admin Login';
            setStatus('Logged out.');
        } else {
            loginModal.style.display = 'flex';
        }
    });

    closeLoginBtn.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });

    submitLoginBtn.addEventListener('click', () => {
        const password = adminPasswordInput.value;
        if (password) {
            // We store the password as the token for simplicity as requested
            adminToken = password; 
            sessionStorage.setItem('adminToken', password);
            adminPanelBtn.style.display = 'block';
            adminLoginBtn.textContent = 'Logout';
            loginModal.style.display = 'none';
            adminPasswordInput.value = '';
            setStatus('Logged in as Admin.');
        }
    });

    // Open Admin Panel
    adminPanelBtn.addEventListener('click', () => {
        adminPanelModal.style.display = 'flex';
        renderAdminList();
    });

    closeAdminPanelBtn.addEventListener('click', () => {
        adminPanelModal.style.display = 'none';
    });

    // Render Admin List
    function renderAdminList() {
        adminShelterList.innerHTML = '';
        if (shelters.length === 0) {
            adminShelterList.innerHTML = '<p>No shelters found.</p>';
            return;
        }

        shelters.forEach(shelter => {
            const item = document.createElement('div');
            item.className = 'shelter-item';
            
            let typeDisplay = shelter.type ? shelter.type.replace('_', ' ') : 'Shelter';
            if (shelter.type === 'underground_parking' && shelter.floors) {
                typeDisplay += ` (${shelter.floors} floors)`;
            }

            item.innerHTML = `
                <div class="shelter-info">
                    <strong>${shelter.name}</strong><br>
                    Type: ${typeDisplay}<br>
                    <small>ID: ${shelter.id}</small>
                </div>
                <div class="admin-actions">
                    <button class="edit-btn" data-id="${shelter.id}">Edit</button>
                    <button class="delete-btn" data-id="${shelter.id}">Delete</button>
                </div>
            `;
            adminShelterList.appendChild(item);
        });

        // Attach event listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openEditModal(e.target.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteShelter(e.target.dataset.id));
        });
    }

    // Delete Shelter
    async function deleteShelter(id) {
        if (!confirm('Are you sure you want to delete this shelter?')) return;

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'x-admin-auth': adminToken
                }
            });

            if (!response.ok) {
                if (response.status === 403) throw new Error('Invalid Password');
                throw new Error('Failed to delete');
            }

            await fetchShelters(); // Refresh data
            renderAdminList(); // Refresh admin view
            setStatus('Shelter deleted.');
        } catch (error) {
            alert(error.message);
        }
    }

    // Open Edit Modal
    function openEditModal(id) {
        const shelter = shelters.find(s => s.id === id);
        if (!shelter) return;

        currentEditShelterId = id;
        editShelterId.value = shelter.id;
        editShelterType.value = shelter.type || 'public_shelter';
        
        if (shelter.type === 'underground_parking') {
            editFloorsGroup.style.display = 'block';
            editFloorsInput.value = shelter.floors || '';
        } else {
            editFloorsGroup.style.display = 'none';
        }

        editModal.style.display = 'flex';
    }

    closeEditBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    // Handle Edit Type Change
    editShelterType.addEventListener('change', () => {
        if (editShelterType.value === 'underground_parking') {
            editFloorsGroup.style.display = 'block';
        } else {
            editFloorsGroup.style.display = 'none';
            editFloorsInput.value = '';
        }
    });

    // Save Edit
    saveEditBtn.addEventListener('click', async () => {
        const id = editShelterId.value;
        const type = editShelterType.value;
        const floors = editFloorsInput.value ? parseInt(editFloorsInput.value) : null;

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-auth': adminToken
                },
                body: JSON.stringify({ type, floors })
            });

            if (!response.ok) {
                if (response.status === 403) throw new Error('Invalid Password');
                throw new Error('Failed to update');
            }

            await fetchShelters(); // Refresh data
            renderAdminList(); // Refresh admin view
            editModal.style.display = 'none';
            setStatus('Shelter updated.');
        } catch (error) {
            alert(error.message);
        }
    });

    // Show Map from Edit Modal
    editViewMapBtn.addEventListener('click', () => {
        const shelter = shelters.find(s => s.id === currentEditShelterId);
        if (!shelter) return;

        mapModal.style.display = 'flex';
        initMap();
        clearMapMarkers();
        
        addShelterMarkers([shelter]);
        map.setView([shelter.lat, shelter.lng], 16); // Close zoom for specific shelter
        
        setTimeout(() => map.invalidateSize(), 100);
    });

    // --- Map Functions ---
    function initMap() {
        if (!map) {
            map = L.map('map').setView([31.0461, 34.8516], 8);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: ' OpenStreetMap contributors'
            }).addTo(map);
        }
    }

    function clearMapMarkers() {
        if (mapMarkers.length > 0) {
            mapMarkers.forEach(marker => map.removeLayer(marker));
            mapMarkers = [];
        }
        if (userMarker && map) {
            map.removeLayer(userMarker);
            userMarker = null;
        }
    }

    function addShelterMarkers(sheltersToShow) {
        sheltersToShow.forEach(shelter => {
            let typeDisplay = shelter.type ? shelter.type.replace('_', ' ') : 'Shelter';
            if (shelter.type === 'underground_parking' && shelter.floors) {
                typeDisplay += ` (${shelter.floors} floors down)`;
            }
            
            const marker = L.marker([shelter.lat, shelter.lng])
                .addTo(map)
                .bindPopup(`<b>${shelter.name}</b><br>${typeDisplay}`);
            
            mapMarkers.push(marker);
            
            // If only showing one shelter, open its popup
            if (sheltersToShow.length === 1) {
                marker.openPopup();
            }
        });
    }

    // Feature: View Map (All Shelters)
    viewMapBtn.addEventListener('click', async () => {
        mapModal.style.display = 'flex';
        initMap();
        clearMapMarkers();

        // Try to center on user
        try {
            const position = await getCurrentLocation();
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            userMarker = L.marker([userLat, userLng])
                .addTo(map)
                .bindPopup('<b>You are here</b>')
                .openPopup();
                
            map.setView([userLat, userLng], 13);
        } catch (e) {
            console.log("Could not get user location for map center");
        }

        // Add all shelter markers
        addShelterMarkers(shelters);
        
        // Fix for map rendering in modal (invalidate size after modal is visible)
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    });

    closeMapBtn.addEventListener('click', () => {
        mapModal.style.display = 'none';
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === adminPanelModal) adminPanelModal.style.display = 'none';
        if (e.target === editModal) editModal.style.display = 'none';
        if (e.target === mapModal) mapModal.style.display = 'none';
    });

    // Helper: Get current location
    function getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser.'));
            } else {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            }
        });
    }

    // Feature 1: Guide to nearest shelter
    guideBtn.addEventListener('click', async () => {
        if (shelters.length === 0) {
            setStatus('No shelters found. Please add a shelter location first.');
            return;
        }

        setStatus('Locating you...');

        try {
            const position = await getCurrentLocation();
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            setStatus('Finding nearest shelter...');

            let minDistance = Infinity;
            let nearestShelter = null;

            shelters.forEach(shelter => {
                const distance = calculateDistance(userLat, userLng, shelter.lat, shelter.lng);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestShelter = shelter;
                }
            });

            if (nearestShelter) {
                let typeDisplay = nearestShelter.type ? nearestShelter.type.replace('_', ' ') : 'Shelter';
                if (nearestShelter.type === 'underground_parking' && nearestShelter.floors) {
                    typeDisplay += ` (${nearestShelter.floors} floors down)`;
                }
                setStatus(`Nearest: ${typeDisplay} - ${Math.round(minDistance * 1000)}m`);
                // Open Google Maps
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${nearestShelter.lat},${nearestShelter.lng}&travelmode=walking`, '_blank');
            } else {
                setStatus('Could not calculate nearest shelter.');
            }

        } catch (error) {
            console.error(error);
            setStatus('Error accessing location: ' + error.message);
        }
    });

    // Handle Shelter Type Change (Show/Hide Floors)
    shelterTypeSelect.addEventListener('change', () => {
        if (shelterTypeSelect.value === 'underground_parking') {
            floorsGroup.style.display = 'block';
            floorsInput.required = true;
        } else {
            floorsGroup.style.display = 'none';
            floorsInput.required = false;
            floorsInput.value = '';
        }
    });

    // Feature 2: Add current location as shelter (Form Submission)
    addShelterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        setStatus('Getting location to add...');
        try {
            const position = await getCurrentLocation();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            const type = shelterTypeSelect.value;
            const floors = floorsInput.value ? parseInt(floorsInput.value) : null;
            
            const name = `Shelter (${new Date().toLocaleTimeString()})`;
            
            const newShelter = {
                name: name,
                lat: lat,
                lng: lng,
                type: type,
                floors: floors
            };

            // Send to server
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newShelter)
            });

            if (!response.ok) throw new Error('Server rejected data');

            await fetchShelters(); // Refresh list from server
            setStatus('Shelter added successfully!');
            addShelterForm.reset();
            floorsGroup.style.display = 'none'; // Reset floor visibility
            
        } catch (error) {
            setStatus('Failed to add shelter: ' + error.message);
        }
    });

    // Render Stats (instead of list)
    function renderShelterStats() {
        if (shelterCountSpan) {
            shelterCountSpan.textContent = shelters.length;
        }
    }

    // Haversine formula to calculate distance in km

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        const d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg) {
        return deg * (Math.PI/180);
    }
});
