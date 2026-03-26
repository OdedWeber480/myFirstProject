document.addEventListener('DOMContentLoaded', () => {
    // --- CACHE BUSTING FOR MISSING OPTIONS ---
    // Check if the edit modal has the new option. If not, force reload.
    // We need to wait a tick because the modal HTML is in the DOM but maybe the browser
    // hasn't fully parsed/updated if it was serving a stale cached version of index.html.
    setTimeout(() => {
        if (!document.getElementById('edit-option-portable')) {
            console.warn('Detected stale HTML (missing portable option in edit modal). Forcing reload...');
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let registration of registrations) {
                        registration.unregister();
                    }
                    window.location.reload(true);
                });
            } else {
                window.location.reload(true);
            }
        }
    }, 1000);
    // ------------------------------------------

    // --- CACHE BUSTING FOR STALE TRANSLATIONS ---
    setTimeout(() => {
        console.log('Running App Version 45.0'); 
        const editPortableOption = document.getElementById('edit-option-portable');
        let lang = localStorage.getItem('appLang');
        if (!lang) lang = 'he'; // Default to Hebrew if not set

        if (editPortableOption && lang === 'he' && editPortableOption.textContent.trim() === 'Portable Shelter') {
             console.warn('Detected stale translations in Admin Modal. Forcing reload...');
             if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let registration of registrations) {
                        registration.unregister();
                    }
                    window.location.reload(true);
                });
            } else {
                window.location.reload(true);
            }
        }
    }, 2000);
    // ------------------------------------------

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js?v=45')
            .then(reg => {
                console.log('Service Worker Registered');
                
                // Check for updates
                reg.onupdatefound = () => {
                    const newWorker = reg.installing;
                    newWorker.onstatechange = () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content available, force refresh
                            console.log('New content available, refreshing...');
                            window.location.reload();
                        }
                    };
                };
            })
            .catch(err => console.error('Service Worker Failed', err));
    }

    // --- AGGRESSIVE CLEANUP FOR STALE CACHE ---
    // If the user has old HTML cached, remove the unwanted heading manually
    const legacyHeading = document.querySelector('[data-i18n="report_new_shelter"]');
    if (legacyHeading) {
        console.log('Detected stale HTML: Removing legacy heading');
        legacyHeading.style.display = 'none';
        legacyHeading.remove();
    }
    // ------------------------------------------

    const guideBtn = document.getElementById('guide-btn');
    const viewMapBtn = document.getElementById('view-map-btn');
    const mapModal = document.getElementById('map-modal');
    const closeMapBtn = document.getElementById('close-map-btn');
    // Form elements removed - moved to report.html
    const statusMessage = document.getElementById('status-message');
    const shelterCountSpan = document.getElementById('shelter-count');
    const langToggleBtn = document.getElementById('lang-toggle');

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
    const addShelterContainer = document.getElementById('add-shelter-container'); // NEW
    
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

    // Nearest Shelter Modal Elements
    const nearestModal = document.getElementById('nearest-shelter-modal');
    const closeNearestBtn = document.getElementById('close-nearest-btn');
    const nearestSheltersList = document.getElementById('nearest-shelters-list'); // NEW LIST CONTAINER
    let nearestMap = null; // Separate map instance for the nearest modal
    let nearestMapMarkers = [];
    
    // Removed legacy single-result elements logic
    // const navigateBtn = document.getElementById('navigate-btn');
    // const nearestType = document.getElementById('nearest-type');
    // ...
    
    let currentNearestShelters = []; // Changed to array

    // API URL & State
    const API_URL = '/api/shelters';
    let shelters = [];
    let map = null;
    let userMarker = null;
    let mapMarkers = [];
    let adminToken = sessionStorage.getItem('adminToken') || null;
    let currentEditShelterId = null;

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
            type_portable: "Portable Shelter",
            type_parking: "Underground Parking Lot",
            select_type: "Select Type",
            floors_label: "Floors Underground:",
            description_label: "Description (Optional):",
            description_placeholder: "Enter description...",
            description_placeholder_long: "Describe the location, how to get there, etc.",
            update_shelter_btn: "Update Shelter",
            total_shelters: "Total Shelters in Database:",
            nav_report_btn: "Report a new Shelter",
            report_new_shelter: "",
            report_btn: "Report a new Shelter",
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
            btn_delete: "Delete",
            nearest_shelter_title: "Nearest Shelter Found",
            distance_label: "Distance:",
            navigate_btn: "Navigate Now"
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
            type_portable: "מיגונית",
            type_parking: "חניון תת קרקעי",
            select_type: "בחר סוג",
            floors_label: "קומות מתחת לקרקע:",
            description_label: "תיאור (אופציונלי):",
            total_shelters: "סה\"כ מקלטים במאגר:",
            nav_report_btn: "דווח על מקלט חדש",
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
            btn_delete: "מחק",
            nearest_shelter_title: "המקלט הקרוב ביותר נמצא",
            distance_label: "מרחק:",
            navigate_btn: "נווט עכשיו"
        }
    };

    let currentLang = localStorage.getItem('appLang') || 'he'; // Default to Hebrew
    let t = translations[currentLang];

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
        updateAdminUI();
        
        // Re-render things that depend on language (like lists)
        renderAdminList();
    }

    setLanguage(currentLang);

    langToggleBtn.addEventListener('click', () => {
        const newLang = currentLang === 'en' ? 'he' : 'en';
        setLanguage(newLang);
    });

    // Helper: Update UI based on Admin Status
    function updateAdminUI() {
        if (adminToken) {
            adminPanelBtn.style.display = 'block';
            adminLoginBtn.textContent = t.admin_logout;
            if (addShelterContainer) addShelterContainer.style.display = 'block'; // Show Report Button
        } else {
            adminPanelBtn.style.display = 'none';
            adminLoginBtn.textContent = t.admin_login;
            if (addShelterContainer) addShelterContainer.style.display = 'none'; // Hide Report Button
        }
    }

    // Check if already logged in
    updateAdminUI();

    // Render initial list
    fetchShelters();

    // Helper: Update status message
    function setStatus(msg) {
        statusMessage.textContent = msg;
    }

    // Helper: Update shelter stats
    function renderShelterStats() {
        console.log('Rendering Stats. Shelters count:', shelters ? shelters.length : 'null');
        if (shelterCountSpan) {
            if (Array.isArray(shelters)) {
                shelterCountSpan.textContent = shelters.length;
            } else {
                console.error('Shelters is not an array:', shelters);
            }
        } else {
            console.error('shelterCountSpan element not found');
        }
    }

    // Helper: Fetch shelters from server
    async function fetchShelters() {
        console.log('Fetching shelters...');
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to fetch data');
            shelters = await response.json();
            console.log('Shelters fetched successfully:', shelters.length);
            setStatus(''); // Clear any previous error messages
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
            updateAdminUI(); // Update UI on logout
            setStatus(t.status_logged_out);
        } else {
            loginModal.style.display = 'flex';
        }
    });

    closeLoginBtn.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });

    submitLoginBtn.addEventListener('click', async () => {
        const password = adminPasswordInput.value;
        if (password) {
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    adminToken = data.token; 
                    sessionStorage.setItem('adminToken', adminToken);
                    updateAdminUI(); // Update UI on login
                    loginModal.style.display = 'none';
                    adminPasswordInput.value = '';
                    setStatus(t.status_logged_in);
                } else {
                    alert(data.error || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed due to server error');
            }
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
            else if (shelter.type === 'portable_shelter') typeKey = 'type_portable';
            else if (shelter.type === 'underground_parking') typeKey = 'type_parking';
            
            let typeDisplay = t[typeKey] || shelter.type;

            if (shelter.type === 'underground_parking' && shelter.floors) {
                typeDisplay += ` (${shelter.floors} ${t.floors_count})`;
            }

            item.innerHTML = `
                <div class="shelter-info">
                    <strong>${shelter.name}</strong><br>
                    ${t.shelter_type_label} ${typeDisplay}<br>
                    <small>ID: ${shelter.id}</small>
                </div>
                <div class="admin-actions">
                    <button class="edit-btn" data-id="${shelter.id}">${t.btn_edit}</button>
                    <button class="delete-btn" data-id="${shelter.id}">${t.btn_delete}</button>
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
                    'x-admin-token': adminToken
                }
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error('Unauthorized or Session Expired');
                throw new Error('Failed to delete');
            }

            await fetchShelters(); // Refresh data
            renderAdminList(); // Refresh admin view
            setStatus(t.status_deleted);
        } catch (error) {
            alert(error.message);
            if (error.message.includes('Unauthorized')) {
                // Force logout
                adminToken = null;
                sessionStorage.removeItem('adminToken');
                adminPanelBtn.style.display = 'none';
                adminLoginBtn.textContent = t.admin_login;
                adminPanelModal.style.display = 'none';
            }
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
                    'x-admin-token': adminToken
                },
                body: JSON.stringify({ type, floors, description })
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error('Unauthorized or Session Expired');
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
            else if (shelter.type === 'portable_shelter') typeKey = 'type_portable';
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
        if (e.target === nearestModal) nearestModal.style.display = 'none';
    });

    closeNearestBtn.addEventListener('click', () => {
        nearestModal.style.display = 'none';
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
        setStatus(t.status_locating);

        try {
            // 1. Get User Location
            const position = await getCurrentLocation();
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            console.log(`User Location: ${userLat}, ${userLng} (Accuracy: ${position.coords.accuracy}m)`);

            // 2. Refresh Shelter Data to ensure we have the latest list
            setStatus("Updating data...");
            await fetchShelters();

            if (shelters.length === 0) {
                alert(t.status_no_shelters);
                setStatus(t.status_no_shelters);
                return;
            }

            setStatus(t.status_finding);

            // 3. Calculate all distances and sort
            const sheltersWithDistance = shelters.map(shelter => {
                if (!shelter.lat || !shelter.lng) return null;
                const d = calculateDistance(userLat, userLng, parseFloat(shelter.lat), parseFloat(shelter.lng));
                return { ...shelter, distance: d };
            }).filter(s => s !== null);

            // Sort by distance (ascending)
            sheltersWithDistance.sort((a, b) => a.distance - b.distance);

            // Get top 3
            currentNearestShelters = sheltersWithDistance.slice(0, 3);
            
            console.log("Closest Shelters:", currentNearestShelters);

            if (currentNearestShelters.length > 0) {
                renderNearestSheltersList(currentNearestShelters);
                
                // Initialize/Update Nearest Map
                setTimeout(() => {
                    initNearestMap(userLat, userLng, currentNearestShelters);
                }, 200);
                nearestModal.style.display = 'flex';
                setStatus(`Found ${currentNearestShelters.length} nearby shelters.`);
            } else {
                setStatus(t.status_calc_error);
                alert(t.status_no_shelters);
            }

        } catch (error) {
            console.error("Guide Error:", error);
            const errorMsg = error.code === 1 ? "Location access denied. Please enable GPS." : (t.status_error_loc + error.message);
            setStatus(errorMsg);
            alert(errorMsg);
        }
    });

    function initNearestMap(userLat, userLng, sheltersToShow) {
        if (!nearestMap) {
            nearestMap = L.map('nearest-map').setView([userLat, userLng], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(nearestMap);
        } else {
            nearestMap.invalidateSize();
        }

        // Clear existing markers
        nearestMapMarkers.forEach(m => nearestMap.removeLayer(m));
        nearestMapMarkers = [];

        // Add User Marker
        const userMarker = L.marker([userLat, userLng])
            .addTo(nearestMap)
            .bindPopup(`<b>${t.you_are_here}</b>`);
        nearestMapMarkers.push(userMarker);

        // Add Shelter Markers with Numbers 1, 2, 3
        const group = new L.featureGroup([userMarker]);

        sheltersToShow.forEach((shelter, index) => {
            const num = index + 1;
            
            // Create Numbered Icon
            const numberedIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #d32f2f; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${num}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const marker = L.marker([shelter.lat, shelter.lng], { icon: numberedIcon })
                .addTo(nearestMap)
                .bindPopup(`<b>${num}. ${shelter.name}</b><br>${Math.round(shelter.distance * 1000)}m`);
            
            nearestMapMarkers.push(marker);
            group.addLayer(marker);
        });

        // Fit bounds to show all markers
        nearestMap.fitBounds(group.getBounds(), { padding: [50, 50] });
    }

    function renderNearestSheltersList(topShelters) {
        if (!nearestSheltersList) return;
        nearestSheltersList.innerHTML = '';
        
        topShelters.forEach((shelter, index) => {
            const distanceMeters = Math.round(shelter.distance * 1000);
            
            // Translate type
            let typeKey = '';
            if (shelter.type === 'public_shelter') typeKey = 'type_public';
            else if (shelter.type === 'building_shelter') typeKey = 'type_building';
            else if (shelter.type === 'portable_shelter') typeKey = 'type_portable';
            else if (shelter.type === 'underground_parking') typeKey = 'type_parking';
            
            let typeDisplay = t[typeKey] || shelter.type;
            if (shelter.type === 'underground_parking' && shelter.floors) {
                typeDisplay += ` (${shelter.floors} ${t.floors_down})`;
            }

            const item = document.createElement('div');
            item.className = 'nearest-shelter-item';
            item.style.borderBottom = "1px solid #eee";
            item.style.padding = "15px 0";

            item.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <h4 style="margin: 0 0 5px 0; font-size: 1.1rem;">
                        <span style="background: #d32f2f; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.9rem; margin-right: 8px;">${index + 1}</span>
                        ${shelter.name}
                    </h4>
                    <div style="font-size: 0.95rem; color: #555; margin-left: 32px;">
                        <p style="margin: 2px 0;"><strong>${t.shelter_type_label}</strong> ${typeDisplay}</p>
                        <p style="margin: 2px 0;"><strong>${t.distance_label}</strong> ${distanceMeters}m</p>
                        ${shelter.description ? `<p style="margin: 5px 0 0 0; font-style: italic; font-size: 0.9rem;">${shelter.description}</p>` : ''}
                    </div>
                </div>
                <button class="nav-btn-small secondary-btn" style="width: 100%; margin-top: 5px; background-color: #4CAF50; padding: 8px;" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}&travelmode=walking', '_blank')">
                    <span class="icon" style="font-size: 1.2rem; display: inline; margin: 0;">🏃</span> ${t.navigate_btn}
                </button>
            `;
            nearestSheltersList.appendChild(item);
        });
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
