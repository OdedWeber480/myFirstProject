document.addEventListener('DOMContentLoaded', () => {
    // --- CACHE BUSTING FOR MISSING OPTIONS ---
    // If the new 'portable_shelter' option is missing, it means we have stale HTML.
    // Force a hard reload/cache clear.
    if (!document.getElementById('option-portable')) {
        console.warn('Detected stale HTML (missing portable option). Forcing reload...');
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                    registration.unregister();
                }
                window.location.reload();
            });
        } else {
            window.location.reload();
        }
        return; // Stop execution
    }
    // ------------------------------------------

    const addShelterForm = document.getElementById('add-shelter-form');
    const shelterTypeSelect = document.getElementById('shelter-type');
    const floorsGroup = document.getElementById('floors-group');
    const floorsInput = document.getElementById('floors');
    const shelterDescriptionInput = document.getElementById('shelter-description');
    const statusMessage = document.getElementById('status-message');
    const langToggleBtn = document.getElementById('lang-toggle');
    const cancelBtn = document.getElementById('cancel-btn');
    const locationStatus = document.getElementById('location-status');
    const mapGroup = document.getElementById('map-group');
    const locationMethodRadios = document.getElementsByName('location-method');
    const reportBtnSpan = document.querySelector('[data-i18n="report_btn"]');

    // API URL
    const API_URL = '/api/shelters';
    
    // Map State
    let map = null;
    let marker = null;
    let selectedLat = null;
    let selectedLng = null;

    // --- Translations ---
    const translations = {
        en: {
            report_page_title: "Report a New Shelter",
            report_subtitle: "Help others by adding a safe zone location.",
            shelter_type_label: "Shelter Type:",
            type_public: "Public Shelter",
            type_building: "Building Shelter",
            type_portable: "Portable Shelter",
            type_parking: "Underground Parking Lot",
            select_type: "Select Type",
            floors_label: "Floors Underground:",
            description_label: "Description (Optional):",
            description_placeholder_long: "Describe the location, how to get there, etc.",
            location_label: "Location:",
            location_method_label: "Location Method:",
            method_current: "Current Location",
            method_manual: "Select on Map",
            drag_marker_hint: "Drag the marker to adjust the exact location.",
            report_btn: "Report Current Location",
            report_btn_manual: "Report Selected Location",
            cancel_btn: "Cancel",
            status_getting_loc: "Getting location...",
            status_added: "Shelter added successfully! Redirecting...",
            status_failed_add: "Failed to add shelter: ",
            status_error_loc: "Error accessing location: "
        },
        he: {
            report_page_title: "דווח על מקלט חדש",
            report_subtitle: "עזור לאחרים על ידי הוספת מיקום מרחב מוגן.",
            shelter_type_label: "סוג מקלט:",
            type_public: "מקלט ציבורי",
            type_bortable: "מיגונית",
            type_puilding: "מקלט בבניין",
            type_parking: "חניון תת קרקעי",
            select_type: "בחר סוג",
            floors_label: "קומות מתחת לקרקע:",
            description_label: "תיאור (אופציונלי):",
            description_placeholder_long: "תאר את המיקום, איך להגיע וכו'",
            location_label: "מיקום:",
            location_method_label: "שיטת מיקום:",
            method_current: "מיקום נוכחי",
            method_manual: "בחר על המפה",
            drag_marker_hint: "גרור את הסמן כדי לדייק את המיקום.",
            report_btn: "דווח על המיקום הנוכחי",
            report_btn_manual: "דווח על המיקום הנבחר",
            cancel_btn: "ביטול",
            status_getting_loc: "מקבל מיקום...",
            status_added: "המקלט נוסף בהצלחה! מעביר...",
            status_failed_add: "נכשל בהוספת מקלט: ",
            status_error_loc: "שגיאה בגישה למיקום: "
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
    }

    setLanguage(currentLang);

    // Initialize Map (Hidden by default)
    initMap();

    // Handle Location Method Change
    locationMethodRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'manual') {
                mapGroup.style.display = 'block';
                if (map) {
                    setTimeout(() => map.invalidateSize(), 100);
                }
                reportBtnSpan.setAttribute('data-i18n', 'report_btn_manual');
                reportBtnSpan.textContent = t.report_btn_manual;
            } else {
                mapGroup.style.display = 'none';
                reportBtnSpan.setAttribute('data-i18n', 'report_btn');
                reportBtnSpan.textContent = t.report_btn;
            }
        });
    });

    langToggleBtn.addEventListener('click', () => {
        const newLang = currentLang === 'en' ? 'he' : 'en';
        setLanguage(newLang);
    });

    // Helper: Update status message
    function setStatus(msg) {
        statusMessage.textContent = msg;
    }

    // Initialize Map
    async function initMap() {
        // Default center (Israel)
        const defaultLat = 31.0461;
        const defaultLng = 34.8516;
        
        map = L.map('report-map').setView([defaultLat, defaultLng], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        locationStatus.textContent = t.status_getting_loc;

        try {
            const position = await getCurrentLocation();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            updateMarker(lat, lng);
            map.setView([lat, lng], 16);
            locationStatus.textContent = t.drag_marker_hint;
        } catch (error) {
            console.error("Location error:", error);
            locationStatus.textContent = t.status_error_loc + error.message;
            // Fallback to center of map if location fails, let user choose
            updateMarker(defaultLat, defaultLng);
        }

        // Map Click Event
        map.on('click', (e) => {
            updateMarker(e.latlng.lat, e.latlng.lng);
        });
    }

    function updateMarker(lat, lng) {
        selectedLat = lat;
        selectedLng = lng;

        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng], { draggable: true }).addTo(map);
            
            marker.on('dragend', (e) => {
                const position = marker.getLatLng();
                selectedLat = position.lat;
                selectedLng = position.lng;
            });
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

    // Cancel Button
    cancelBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Form Submission
    addShelterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        setStatus(t.status_getting_loc);
        
        try {
            let lat, lng;
            const locationMethod = document.querySelector('input[name="location-method"]:checked').value;

            if (locationMethod === 'manual') {
                if (!selectedLat || !selectedLng) {
                    setStatus(t.status_error_loc + "No location selected");
                    return;
                }
                lat = selectedLat;
                lng = selectedLng;
            } else {
                // Get Current Location
                const position = await getCurrentLocation();
                lat = position.coords.latitude;
                lng = position.coords.longitude;
            }

            setStatus("Submitting...");

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

            setStatus(t.status_added);
            
            // Redirect back to main page after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            setStatus(t.status_failed_add + error.message);
        }
    });
});
