// ==========================================================
// SkyPanel | app.js
// ==========================================================

// Global Variables
let showingWeek = false;
let hourlyForecast = [];
let weeklyForecast = [];

// ... (Keep your weatherDescription, updateClock, getCoordinates, loadWeather, displayForecast, and updateRadar functions exactly as they were in the previous block) ...

// ==========================================================
// MAIN INITIALIZATION (The "Bulletproof" way)
// ==========================================================

function initDashboard() {
    // 1. Fullscreen Handler
    const fsButton = document.getElementById("fullscreen-btn");
    if (fsButton) {
        fsButton.onclick = async () => {
            try {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                    fsButton.style.display = "none";
                }
            } catch(err) { console.log("FS Error:", err); }
        };
    }

    // 2. Wizard Handler
    const getStartedBtn = document.getElementById('get-started-btn');
    const nextBtn2 = document.getElementById('next-btn-2');
    const zipInput = document.getElementById('zip-input');
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');

    if (getStartedBtn) {
        getStartedBtn.onclick = () => {
            step1.classList.remove('active');
            step2.classList.add('active');
        };
    }

    if (nextBtn2) {
        nextBtn2.onclick = () => {
            const zipCode = zipInput.value.trim();
            if (zipCode.length === 5) {
                localStorage.setItem('skyPanelZip', zipCode);
                const coords = getCoordinates(zipCode);
                updateRadar(coords.lat, coords.lon);
                welcomeOverlay.style.display = 'none';
            }
        };
    }

    // 3. Startup
    updateClock();
    setInterval(updateClock, 1000);
    const savedZip = localStorage.getItem('skyPanelZip') || "14830";
    const coords = getCoordinates(savedZip);
    updateRadar(coords.lat, coords.lon);
    loadWeather();
    setInterval(loadWeather, 10 * 60 * 1000);
}

// Run immediately when page elements are ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}