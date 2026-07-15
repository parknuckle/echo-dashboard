// ==========================================================
// SkyPanel | app.js
// ==========================================================

// --- Utility Functions ---
function weatherDescription(code) {
    const weather = {
        0: "☀️ Clear", 1: "🌤 Mostly Clear", 2: "⛅ Partly Cloudy", 3: "☁️ Cloudy",
        45: "🌫 Fog", 48: "🌫 Freezing Fog", 51: "🌦 Light Drizzle", 53: "🌦 Drizzle",
        55: "🌦 Heavy Drizzle", 61: "🌧 Rain", 63: "🌧 Moderate Rain", 65: "🌧 Heavy Rain",
        71: "❄️ Snow", 73: "❄️ Moderate Snow", 75: "❄️ Heavy Snow", 80: "🌦 Rain Showers",
        81: "🌧 Heavy Showers", 95: "⛈ Thunderstorm"
    };
    return weather[code] || "Unknown";
}

function updateClock() {
    const now = new Date();
    document.getElementById("clock-time").textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).split(" ")[0];
    document.getElementById("clock-ampm").textContent = now.toLocaleTimeString([], { hour12: true }).slice(-2);
}

const ZIP_COORDINATES = { "32955": { lat: 28.3243, lon: -80.7303 }, "14830": { lat: 42.1429, lon: -77.0547 } };
function getCoordinates(zip) { return ZIP_COORDINATES[zip] || { lat: 42.1429, lon: -77.0547 }; }

// --- Weather Logic ---
async function fetchWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=sunrise,weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        document.getElementById("temp").textContent = Math.round(data.current.temperature_2m) + "°";
        document.getElementById("conditions").textContent = weatherDescription(data.current.weather_code);
        document.getElementById("wind").textContent = "💨 Wind " + Math.round(data.current.wind_speed_10m) + " mph";
        document.getElementById("humidity").textContent = "💧 Humidity " + data.current.relative_humidity_2m + "%";
        document.getElementById("sunrise").textContent = "🌅 Sunrise " + new Date(data.daily.sunrise[0]).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

        const startIdx = data.hourly.time.findIndex(t => new Date(t).getHours() === new Date().getHours());
        for (let i = 1; i <= 7; i++) {
            const h = data.hourly, idx = startIdx + i;
            document.getElementById(`hour${i}`).querySelector(".forecast-time").textContent = new Date(h.time[idx]).toLocaleTimeString([], { hour: "numeric" });
            document.getElementById(`hour${i}`).querySelector(".forecast-icon").textContent = weatherDescription(h.weather_code[idx]).split(" ")[0];
            document.getElementById(`hour${i}`).querySelector(".forecast-temp").textContent = Math.round(h.temperature_2m[idx]) + "°";
        }
    } catch(e) { console.error(e); }
}

function updateRadar(lat, lon) { document.getElementById("radarFrame").src = `https://www.rainviewer.com/map.html?loc=${lat},${lon},8&layer=radar`; }

// --- Initialization ---
function runStartup() {
    updateClock();
    setInterval(updateClock, 1000);
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'fullscreen-btn') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        e.target.style.display = "none";
    }
    if (e.target.id === 'get-started-btn') {
        document.getElementById('step-1').classList.remove('active');
        document.getElementById('step-2').classList.add('active');
    }
    if (e.target.id === 'use-location-btn') {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                updateRadar(pos.coords.latitude, pos.coords.longitude);
                fetchWeatherData(pos.coords.latitude, pos.coords.longitude);
                document.getElementById('welcome-overlay').style.display = 'none';
            },
            () => alert("Location access denied.")
        );
    }
    if (e.target.id === 'next-btn-2') {
        const zip = document.getElementById('zip-input').value.trim();
        if (zip.length === 5) {
            const coords = getCoordinates(zip);
            updateRadar(coords.lat, coords.lon);
            fetchWeatherData(coords.lat, coords.lon);
            document.getElementById('welcome-overlay').style.display = 'none';
        }
    }
});

runStartup();