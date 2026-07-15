// ==========================================================
//
// SkyPanel
// app.js
//
// Beautiful dashboards, made simple.
//
// Author: Shawn Boyle
//
// ==========================================================

// ==========================================================
// GLOBAL VARIABLES
// ==========================================================

let showingWeek = false;
let hourlyForecast = [];
let weeklyForecast = [];

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================

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

// ==========================================================
// CLOCK
// ==========================================================

function updateClock() {
    const now = new Date();
    const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    const [timePart, ampm] = clock.split(" ");
    const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

    document.getElementById("clock-time").textContent = timePart;
    document.getElementById("clock-ampm").textContent = ampm;

    let dateElement = document.getElementById("date");
    if (!dateElement) {
        dateElement = document.createElement("div");
        dateElement.id = "date";
        document.querySelector(".clock").appendChild(dateElement);
    }
    dateElement.textContent = date;
}

// ==========================================================
// LOCATION
// ==========================================================

const ZIP_COORDINATES = {
    "32955": { lat: 28.3243, lon: -80.7303 },
    "14830": { lat: 42.1429, lon: -77.0547 }
};

function getCoordinates(zip) {
    return ZIP_COORDINATES[zip] || { lat: 42.1429, lon: -77.0547 };
}

// ==========================================================
// WEATHER
// ==========================================================

async function loadWeather() {
    const savedZip = localStorage.getItem('skyPanelZip') || "14830";
    const coords = getCoordinates(savedZip);
    
    // FIX: Using dynamic coords.lat and coords.lon here
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=sunrise,weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
    
    const cityNames = { "32955": "Rockledge, FL", "14830": "Corning, NY" };
    document.getElementById("location").textContent = cityNames[savedZip] || "SkyPanel";
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        const now = new Date();
        const currentHour = now.getHours();
        const startIndex = data.hourly.time.findIndex(time => new Date(time).getHours() === currentHour);

        hourlyForecast = [];
        for (let i = 1; i <= 7; i++) {
            const index = startIndex + i;
            const hour = new Date(data.hourly.time[index]);
            const hourText = hour.toLocaleTimeString([], { hour: "numeric" });
            hourlyForecast.push({
                time: hourText,
                icon: weatherDescription(data.hourly.weather_code[index]).split(" ")[0],
                temp: Math.round(data.hourly.temperature_2m[index]) + "°"
            });
        }

        if (!showingWeek) displayForecast(hourlyForecast);

        document.getElementById("temp").textContent = Math.round(data.current.temperature_2m) + "°";
        document.getElementById("conditions").textContent = weatherDescription(data.current.weather_code);
        document.getElementById("wind").textContent = "💨 Wind " + Math.round(data.current.wind_speed_10m) + " mph";
        document.getElementById("humidity").textContent = "💧 Humidity " + data.current.relative_humidity_2m + "%";
        
        const sunrise = new Date(data.daily.sunrise[0]);
        document.getElementById("sunrise").textContent = "🌅 Sunrise " + sunrise.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch(error) { console.log(error); }
}

function displayForecast(data) {
    for (let i = 1; i <= 7; i++) {
        document.getElementById(`hour${i}-time`).textContent = data[i - 1].time;
        document.getElementById(`hour${i}-icon`).textContent = data[i - 1].icon;
        document.getElementById(`hour${i}-temp`).textContent = data[i - 1].temp;
    }
}

function fadeForecast(data) {
    const strip = document.querySelector(".forecast-strip");
    strip.style.opacity = 0;
    setTimeout(() => { displayForecast(data); strip.style.opacity = 1; }, 600);
}

// ==========================================================
// RADAR
// ==========================================================

function updateRadar(lat, lon) {
    const radarFrame = document.getElementById("radarFrame");
    radarFrame.src = `https://www.rainviewer.com/map.html?loc=${lat},${lon},8&oFa=1&oC=1&oU=0&oCS=1&oF=0&oAP=1&c=3&o=83&lm=1&layer=radar&sm=1&sn=1`;
}

// ==========================================================
// WELCOME WIZARD & EVENT LISTENERS
// ==========================================================

const getStartedBtn = document.getElementById('get-started-btn');
const nextBtn2 = document.getElementById('next-btn-2');
const zipInput = document.getElementById('zip-input');
const welcomeOverlay = document.getElementById('welcome-overlay');
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');

if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
        step1.classList.remove('active');
        step2.classList.add('active');
    });
}

if (nextBtn2) {
    nextBtn2.addEventListener('click', () => {
        const zipCode = zipInput.value.trim();
        if (zipCode.length === 5) {
            localStorage.setItem('skyPanelZip', zipCode);
            const coords = getCoordinates(zipCode);
            updateRadar(coords.lat, coords.lon);
            welcomeOverlay.style.display = 'none';
        }
    });
}

// ==========================================================
// APPLICATION STARTUP
// ==========================================================

function startDashboard() {
    updateClock();
    setInterval(updateClock, 1000);

    const savedZip = localStorage.getItem('skyPanelZip') || "14830";
    const coords = getCoordinates(savedZip);
    updateRadar(coords.lat, coords.lon);

    loadWeather();
    setInterval(loadWeather, 10 * 60 * 1000);
}

startDashboard();
