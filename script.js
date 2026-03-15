document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.error('Service Worker Failed', err));
    }

    const guideBtn = document.getElementById('guide-btn');
    const addShelterBtn = document.getElementById('add-shelter-btn');
    const statusMessage = document.getElementById('status-message');
    const sheltersList = document.getElementById('shelters-ul');

    // Load shelters from local storage or initialize with empty array
    let shelters = JSON.parse(localStorage.getItem('securePlaces')) || [];

    // Render initial list
    renderShelters();

    // Helper: Update status message
    function setStatus(msg) {
        statusMessage.textContent = msg;
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
                setStatus(`Nearest shelter found: ${nearestShelter.name} (${Math.round(minDistance * 1000)}m)`);
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

    // Feature 2: Add current location as shelter
    addShelterBtn.addEventListener('click', async () => {
        setStatus('Getting location to add...');
        try {
            const position = await getCurrentLocation();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Generate a simple name based on count or timestamp
            const name = `Shelter ${shelters.length + 1} (${new Date().toLocaleTimeString()})`;
            
            const newShelter = {
                id: Date.now(),
                name: name,
                lat: lat,
                lng: lng
            };

            shelters.push(newShelter);
            saveShelters();
            renderShelters();
            setStatus('Shelter added successfully!');
            
        } catch (error) {
            setStatus('Failed to add shelter: ' + error.message);
        }
    });

    // Save to LocalStorage
    function saveShelters() {
        localStorage.setItem('securePlaces', JSON.stringify(shelters));
    }

    // Render list
    function renderShelters() {
        sheltersList.innerHTML = '';
        shelters.forEach(shelter => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${shelter.name}</span>
                <button class="delete-btn" onclick="removeShelter(${shelter.id})">&times;</button>
            `;
            sheltersList.appendChild(li);
        });
    }

    // Make removeShelter globally available for the onclick handler
    window.removeShelter = function(id) {
        shelters = shelters.filter(s => s.id !== id);
        saveShelters();
        renderShelters();
    };

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
