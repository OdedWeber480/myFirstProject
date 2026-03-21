document.addEventListener('DOMContentLoaded', () => {
    const addShelterForm = document.getElementById('add-shelter-form');
    const shelterTypeSelect = document.getElementById('shelter-type');
    const floorsGroup = document.getElementById('floors-group');
    const floorsInput = document.getElementById('floors');
    const shelterDescriptionInput = document.getElementById('shelter-description');
    const statusMessage = document.getElementById('status-message');
    const langToggleBtn = document.getElementById('lang-toggle');
    const cancelBtn = document.getElementById('cancel-btn');

    // API URL
    const API_URL = '/api/shelters';

    // --- Translations ---
    const translations = {
        en: {
            report_new_shelter: "Report a New Shelter",
            report_subtitle: "Help others by adding a safe zone location.",
            shelter_type_label: "Shelter Type:",
            type_public: "Public Shelter",
            type_building: "Building Shelter",
            type_parking: "Underground Parking Lot",
            select_type: "Select Type",
            floors_label: "Floors Underground:",
            description_label: "Description (Optional):",
            description_placeholder_long: "Describe the location, how to get there, etc.",
            report_btn: "Report Current Location",
            cancel_btn: "Cancel",
            status_getting_loc: "Getting location...",
            status_added: "Shelter added successfully! Redirecting...",
            status_failed_add: "Failed to add shelter: ",
            status_error_loc: "Error accessing location: "
        },
        he: {
            report_new_shelter: "דווח על מקלט חדש",
            report_subtitle: "עזור לאחרים על ידי הוספת מיקום מרחב מוגן.",
            shelter_type_label: "סוג מקלט:",
            type_public: "מקלט ציבורי",
            type_building: "מקלט בבניין",
            type_parking: "חניון תת קרקעי",
            select_type: "בחר סוג",
            floors_label: "קומות מתחת לקרקע:",
            description_label: "תיאור (אופציונלי):",
            description_placeholder_long: "תאר את המיקום, איך להגיע וכו'",
            report_btn: "דווח על המיקום הנוכחי",
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

    langToggleBtn.addEventListener('click', () => {
        const newLang = currentLang === 'en' ? 'he' : 'en';
        setLanguage(newLang);
    });

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
