// Poison pill for v44
console.warn("Detected stale app.v44.js request. Forcing update...");
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for (let registration of registrations) {
            registration.unregister();
        }
        window.location.reload(true);
    });
} else {
    window.location.reload(true);
}
