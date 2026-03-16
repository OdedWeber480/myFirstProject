document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.error('Service Worker Failed', err));
    }

    const guideBtn = document.getElementById('guide-btn');
    const addShelterForm = document.getElementById('add-shelter-form');
    const shelterTypeSelect = document.getElementById('shelter-type');
    const floorsGroup = document.getElementById('floors-group');
    const floorsInput = document.getElementById('floors');
    const statusMessage = document.getElementById('status-message');
    const shelterCountSpan = document.getElementById('shelter-count');

    // API URL
    const API_URL = '/api/shelters';
    let shelters = [];

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
                let typeDisplay = nearestShelter.type.replace('_', ' ');
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
