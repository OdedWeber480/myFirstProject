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
    const shelterDescriptionInput = document.getElementById('shelter-description');
    const statusMessage = document.getElementById('status-message');
    const shelterCountSpan = document.getElementById('shelter-count');
    const langToggleBtn = document.getElementById('lang-toggle');

    // --- Translations ---
    const translations = {
        en: {
            app_title: "Red Alert Safe Zone",
            app_subtitle: "Find the nearest secure place immediately.",
            admin_login: "Admin Login",
            admin_logout: "Logout",
            guide_btn: "Guide me to closest shelter",
            view_map_btn: "View All Shelters on Map",
            manage_shelters_btn: "Manage Shelters (Admin)",
            admin_login_title: "Admin Login",
            password_placeholder: "Enter Password",
            login_btn: "Login",
            manage_shelters_title: "Manage Shelters",
            edit_shelter_title: "Edit Shelter",
            view_location_map: "View Location on Map",
            shelter_type_label: "Shelter Type:",
            type_public: "Public Shelter",
            type_building: "Building Shelter",
            type_parking: "Underground Parking Lot",
            select_type: "Select Type",
            floors_label: "Floors Underground:",
            description_label: "Description (Optional):",
            description_placeholder: "Enter description...",
            description_placeholder_long: "Describe the location, how to get there, etc.",
            update_shelter_btn: "Update Shelter",
            total_shelters: "Total Shelters in Database:",
            report_new_shelter: "Report a New Shelter",
            report_btn: "Report Current Location",
            status_locating: "Locating you...",
            status_finding: "Finding nearest shelter...",
            status_no_shelters: "No shelters found. Please add a shelter location first.",
            status_error_loc: "Error accessing location: ",
            status_getting_loc: "Getting location to add...",
            status_added: "Shelter added successfully!",
            status_failed_add: "Failed to add shelter: ",
            status_updated: "Shelter updated.",
            status_deleted: "Shelter deleted.",
            status_logged_in: "Logged in as Admin.",
            status_logged_out: "Logged out.",
            status_failed_load: "Failed to load shelter list.",
            floors_down: "floors down",
            floors_count: "floors",
            you_are_here: "You are here",
            confirm_delete: "Are you sure you want to delete this shelter?",
            status_calc_error: "Could not calculate nearest shelter.",
            btn_edit: "Edit",
            btn_delete: "Delete"
        },
        he: {
            app_title: "אזור בטוח - צבע אדום",
            app_subtitle: "מצא את המרחב המוגן הקרוב ביותר מיד.",
            admin_login: "כניסת מנהל",
            admin_logout: "התנתק",
            guide_btn: "נווט למקלט הקרוב ביותר",
            view_map_btn: "הצג את כל המקלטים במפה",
            manage_shelters_btn: "ניהול מקלטים (מנהל)",
            admin_login_title: "כניסת מנהל",
            password_placeholder: "הכנס סיסמה",
            login_btn: "התחבר",
            manage_shelters_title: "ניהול מקלטים",
            edit_shelter_title: "עריכת מקלט",
            view_location_map: "הצג מיקום במפה",
            shelter_type_label: "סוג מקלט:",
            type_public: "מקלט ציבורי",
            type_building: "מקלט בבניין",
            type_parking: "חניון תת קרקעי",
            select_type: "בחר סוג",
            floors_label: "קומות מתחת לקרקע:",
            description_label: "תיאור (אופציונלי):",
            description_placeholder: "הכנס תיאור...",
            description_placeholder_long: "תאר את המיקום, איך להגיע וכו'.",
            update_shelter_btn: "עדכן מקלט",
            total_shelters: "סה\"כ מקלטים במאגר:",
            report_new_shelter: "דווח על מקלט חדש",
            report_btn: "דווח על המיקום הנוכחי",
            status_locating: "מאתר מיקום...",
            status_finding: "מחפש את המקלט הקרוב...",
            status_no_shelters: "לא נמצאו מקלטים. אנא הוסף מיקום מקלט תחילה.",
            status_error_loc: "שגיאה בגישה למיקום: ",
            status_getting_loc: "מקבל מיקום להוספה...",
            status_added: "המקלט נוסף בהצלחה!",
            status_failed_add: "נכשל בהוספת מקלט: ",
            status_updated: "המקלט עודכן.",
            status_deleted: "המקלט נמחק.",
            status_logged_in: "מחובר כמנהל.",
            status_logged_out: "התנתק בהצלחה.",
            status_failed_load: "נכשל בטעינת רשימת המקלטים.",
            floors_down: "קומות למטה",
            floors_count: "קומות",
            you_are_here: "אתה כאן",
            confirm_delete: "האם אתה בטוח שברצונך למחוק מקלט זה?",
            status_calc_error: "לא ניתן לחשב את המקלט הקרוב ביותר.",
            btn_edit: "ערוך",
            btn_delete: "מחק"
        }
    };

    let currentLang = localStorage.getItem('appLang') || 'he'; // Default to Hebrew
    let t = translations[currentLang];

    // Initialize Language
    setLanguage(currentLang);

    langToggleBtn.addEventListener('click', () => {
        const newLang = currentLang === 'en' ? 'he' : 'en';
        setLanguage(newLang);
    });

    function setLanguage(lang) {
        currentLang = lang;
        t = translations[lang];
        localStorage.setItem('appLang', lang);

        // Update Direction
        document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;

        // Update Text Elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                el.textContent = t[key];
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (t[key]) {
                el.placeholder = t[key];
            }
        });

        // Update Admin Button Dynamic State
        if (adminToken) {
            adminLoginBtn.textContent = t.admin_logout;
        } else {
            adminLoginBtn.textContent = t.admin_login;
        }
        
        // Re-render things that depend on language (like lists)
        renderAdminList();
    }

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
    const editDescriptionInput = document.getElementById('edit-description');
    const editViewMapBtn = document.getElementById('edit-view-map-btn');

    // API URL
    const API_URL = '/api/shelters';
    let shelters = [];
    let map = null;
    let userMarker = null;
    let mapMarkers = [];
    let adminToken = sessionStorage.getItem('adminToken') || null;
    let currentEditShelterId = null;

    // Check if already logged in
    if (adminToken) {
        adminPanelBtn.style.display = 'block';
        adminLoginBtn.textContent = t.admin_logout;
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
            setStatus(t.status_failed_load);
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
            adminLoginBtn.textContent = t.admin_login;
            setStatus(t.status_logged_out);
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
            adminLoginBtn.textContent = t.admin_logout;
            loginModal.style.display = 'none';
            adminPasswordInput.value = '';
            setStatus(t.status_logged_in);
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
            adminShelterList.innerHTML = `<p>${t.status_no_shelters}</p>`;
            return;
        }

        shelters.forEach(shelter => {
            const item = document.createElement('div');
            item.className = 'shelter-item';
            
            // Translate type
            let typeKey = '';
            if (shelter.type === 'public_shelter') typeKey = 'type_public';
            else if (shelter.type === 'building_shelter') typeKey = 'type_building';
            else if (shelter.type === 'underground_parking') typeKey = 'type_parking';
            
            let typeDisplay = t[typeKey] || shelter.type;

            if (shelter.type === 'underground_parking' && shelter.floors) {
                typeDisplay += ` (${shelter.floors} ${t.floors_count})`;
            }

            item.innerHTML = `
                <div class="shelter-info">${t.btn_e}
                    <strong>${shelter.name}</strong><br>${t.btn_d}
                    ${t.shelter_type_label} ${typeDisplay}<br>
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
        if (!confirm(t.confirm_delete)) return;

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
            setStatus(t.status_deleted);
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
        editDescriptionInput.value = shelter.description || '';
        
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
        const description = editDescriptionInput.value;

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-auth': adminToken
                },
                body: JSON.stringify({ type, floors, description })
            });

            if (!response.ok) {
                if (response.status === 403) throw new Error('Invalid Password');
                throw new Error('Failed to update');
            }

            await fetchShelters(); // Refresh data
            renderAdminList(); // Refresh admin view
            editModal.style.display = 'none';
            setStatus(t.status_updated);
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
                attribution: '© OpenStreetMap contributors'
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
            // Translate type for map
            let typeKey = '';
            if (shelter.type === 'public_shelter') typeKey = 'type_public';
            else if (shelter.type === 'building_shelter') typeKey = 'type_building';
            else if (shelter.type === 'underground_parking') typeKey = 'type_parking';
            
            let typeDisplay = t[typeKey] || shelter.type;

            if (shelter.type === 'underground_parking' && shelter.floors) {
                typeDisplay += ` (${shelter.floors} ${t.floors_down})`;
            }
            
            let popupContent = `<b>${shelter.name}</b><br>${typeDisplay}`;
            if (shelter.description) {
                popupContent += `<br><br><i>${shelter.description}</i>`;
            }
            
            const marker = L.marker([shelter.lat, shelter.lng])
                .addTo(map)
                .bindPopup(popupContent);
            
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
                .bindPopup(`<b>${t.you_are_here}</b>`)
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
            setStatus(t.status_no_shelters);
            return;
        }

        setStatus(t.status_locating);

        try {
            const position = await getCurrentLocation();
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            setStatus(t.status_finding);

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
                // Translate type
                let typeKey = '';
                if (nearestShelter.type === 'public_shelter') typeKey = 'type_public';
                else if (nearestShelter.type === 'building_shelter') typeKey = 'type_building';
                else if (nearestShelter.type === 'underground_parking') typeKey = 'type_parking';
                
                let typeDisplay = t[typeKey] || nearestShelter.type;

                if (nearestShelter.type === 'underground_parking' && nearestShelter.floors) {
                    typeDi`.status_(${n_hrlo}{t.floors_down})`;
                }
                setStatus(`Nearest: ${typeDisplay} - ${Math.round(minDistance * 1000)}m`);
                // Open Google Maps
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${nearestShelter.lat},${nearestShelter.lng}&travelmode=walking`, '_blank');
            } else {
                setStatus('Could not calculate nearest shelter.');
            }

        } catch (error) {
            console.error(error);
            setStatus(t.status_error_loc + error.message);
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
        
        setStatus(t.status_getting_loc);
        try {
            const position = await getCurrentLocation();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            const type = shelterTypeSelect.value;
            const floors = floorsInput.value ? parseInt(floorsInput.value) : null;
            const description = shelterDescriptionInput.value;
            
            const name = `Shelter (${new Date().toLocaleTimeString()})`;
            
            const newShelter = {
                name: name,
                lat: lat,
                lng: lng,
                type: type,
                floors: floors,
                description: description
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
            setStatus(t.status_added);
            addShelterForm.reset();
            floorsGroup.style.display = 'none'; // Reset floor visibility
            
        } catch (error) {
            setStatus(t.status_failed_add + error.message);
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
