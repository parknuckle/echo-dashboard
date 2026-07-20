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
// SETTINGS
// ==========================================================

let userSettings = {
    onboardingComplete: false,
    location: {
        latitude: null,
        longitude: null,
        name: ""
    },
    units: {},
    radar: {},
    dashboard: {},
    theme: {}
};

// ==========================================================
// LOCAL STORAGE
// ==========================================================

function loadSettings() {
    const saved = localStorage.getItem("skyPanelSettings");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Merge saved settings with default architecture
            userSettings = { ...userSettings, ...parsed };
        } catch (e) {
            console.error("Failed to parse settings", e);
        }
    }
}

function saveSettings() {
    localStorage.setItem("skyPanelSettings", JSON.stringify(userSettings));
}

// ==========================================================
// CONFIGURATION
// Future
// ==========================================================

// ==========================================================
// CONSTANTS
// Future
// ==========================================================

// ==========================================================
// GLOBAL VARIABLES
// ==========================================================

let showingWeek = false;

// Stores the live hourly forecast
let hourlyForecast = [];

// Stores the live weekly forecast
let weeklyForecast = [];

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================

function weatherDescription(code) {

    const weather = {
        0: "☀️ Clear",
        1: "🌤 Mostly Clear",
        2: "⛅ Partly Cloudy",
        3: "☁️ Cloudy",
        45: "🌫 Fog",
        48: "🌫 Freezing Fog",
        51: "🌦 Light Drizzle",
        53: "🌦 Drizzle",
        55: "🌦 Heavy Drizzle",
        61: "🌧 Rain",
        63: "🌧 Moderate Rain",
        65: "🌧 Heavy Rain",
        71: "❄️ Snow",
        73: "❄️ Moderate Snow",
        75: "❄️ Heavy Snow",
        80: "🌦 Rain Showers",
        81: "🌧 Heavy Showers",
        95: "⛈ Thunderstorm"
    };

    return weather[code] || "Unknown";
}

// ==========================================================
// CLOCK
// ==========================================================

function updateClock() {

    const now = new Date();

    const clock = now.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });

    const [timePart, ampm] = clock.split(" ");

    const date = now.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric"
    });

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

function setLocationReady(locationName) {
    const status = document.getElementById("location-status");
    if (status) {
        status.textContent = `📍 ${locationName}`;
    }
    
    if (welcomeButton) {
        welcomeButton.disabled = false;
        welcomeButton.style.opacity = "1";
        welcomeButton.style.cursor = "pointer";
    }
}

async function geolocateUser() {
    const status = document.getElementById("location-status");
    if (status) status.textContent = "Locating...";

    if (!navigator.geolocation) {
        if (status) status.textContent = "Geolocation is not supported by your browser.";
        return;
    }
    console.log("Attempting geolocation...");
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        userSettings.location.latitude = lat;
        userSettings.location.longitude = lon;

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            
            const city = data.address.city || data.address.town || data.address.village || "Unknown";
            const state = data.address.state || "";
            
            userSettings.location.name = state ? `${city}, ${state}` : city;
            saveSettings();
            setLocationReady(userSettings.location.name);

        } catch (e) {
            userSettings.location.name = "Current Location";
            saveSettings();
            setLocationReady(userSettings.location.name);
        }
    }, () => {
        if (status) status.textContent = "Location permission denied or failed.";
    });
}

async function lookupZip() {
    const zipInput = document.getElementById("zip-input");
    const status = document.getElementById("location-status");
    
    if (!zipInput || !status) return;
    
    const zip = zipInput.value.trim();
    if (zip.length !== 5 || isNaN(zip)) {
        status.textContent = "Please enter a valid 5-digit ZIP code.";
        return;
    }

    status.textContent = "Searching...";

    try {
        const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (!res.ok) throw new Error("Invalid ZIP");
        
        const data = await res.json();
        const place = data.places[0];
        
        userSettings.location.latitude = parseFloat(place.latitude);
        userSettings.location.longitude = parseFloat(place.longitude);
        userSettings.location.name = `${place["place name"]}, ${place["state abbreviation"]}`;
        
        saveSettings();
        setLocationReady(userSettings.location.name);

    } catch (e) {
        status.textContent = "ZIP Code not found. Please try again.";
    }
}

// ==========================================================
// WEATHER
// ==========================================================

async function loadWeather() {

    // Do not attempt to load weather if location is unconfigured
    if (
        userSettings.location.latitude === null ||
        userSettings.location.longitude === null
    ) {
        return; 
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${userSettings.location.latitude}&longitude=${userSettings.location.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=sunrise,weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
    
    try {

        const response = await fetch(url);

            console.log("Response:", response.status, response.ok);

       const data = await response.json();

           console.log("Weather Data:", data);
           console.log("Hourly:", data.hourly);
           console.log("Daily:", data.daily); 


        // Current hour
        const now = new Date();
        const currentHour = now.getHours();

        // Find the current hour in the API data
        const startIndex = data.hourly.time.findIndex(time => {
            return new Date(time).getHours() === currentHour;

        });

            console.log("Current Hour:", currentHour);
            console.log("Start Index:", startIndex);
            console.log("Hourly Times:", data.hourly.time);

        // Update the next seven hours
        hourlyForecast = [];
        for (let i = 1; i <= 7; i++) {

            const index = startIndex + i;
            const hour = new Date(data.hourly.time[index]);

            const hourText = hour.toLocaleTimeString([], {
                hour: "numeric"
            });

            hourlyForecast.push({
                time: hourText,
                icon: weatherDescription(data.hourly.weather_code[index]).split(" ")[0],
                temp: Math.round(data.hourly.temperature_2m[index]) + "°"
            });

        }   // <-- end of for loop
           console.log("Hourly Forecast:", hourlyForecast);   
        if (!showingWeek) {
            displayForecast(hourlyForecast);
        }

        // Build the weekly forecast
        weeklyForecast = [];

        for (let i = 0; i < 7; i++) {

            const day = new Date(data.daily.time[i] + "T12:00:00");
            const dayName = day.toLocaleDateString([], {
                weekday: "short"
            });

            weeklyForecast.push({
                time: dayName,
                icon: weatherDescription(data.daily.weather_code[i]).split(" ")[0],
                temp: Math.round(data.daily.temperature_2m_max[i]) + "°",
                low: Math.round(data.daily.temperature_2m_min[i]) + "°"
            });

        }

        // Temperature
        document.getElementById("temp").textContent =
            Math.round(data.current.temperature_2m) + "°";

        // Weather Conditions (temporary)
        document.getElementById("conditions").textContent =
            weatherDescription(data.current.weather_code);

        // Wind
        document.getElementById("wind").textContent =
            "💨 Wind " + Math.round(data.current.wind_speed_10m) + " mph";

        // Humidity
        document.getElementById("humidity").textContent =
            "💧 Humidity " + data.current.relative_humidity_2m + "%";

        // Sunrise
        const sunrise = new Date(data.daily.sunrise[0]);

        document.getElementById("sunrise").textContent =
            "🌅 Sunrise " +
            sunrise.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
            });

    } catch(error) {
        console.log(error);
    }

}   // <-- loadWeather() ends here

// ==========================================================
// FORECAST
// ==========================================================

function displayForecast(data) {

    console.log("i =", i, "item =", data[i - 1]);
    console.log("Length:", data.length);

    for (let i = 1; i <= 7; i++) {

        document.getElementById(`hour${i}-time`).textContent =
            data[i - 1].time;

        document.getElementById(`hour${i}-icon`).textContent =
            data[i - 1].icon;

        document.getElementById(`hour${i}-temp`).textContent =
            data[i - 1].temp;

        document.getElementById(`hour${i}-low`).textContent =
            data[i - 1].low || "";

        const item = document.querySelectorAll(".forecast-item")[i - 1];

        item.classList.remove("week-panel");

        if (data[i - 1].low) {
            item.classList.add("week-panel");
        }   

    }

}

function fadeForecast(data) {

    const strip = document.querySelector(".forecast-strip");

    strip.style.opacity = 0;

    setTimeout(() => {
        displayForecast(data);
        strip.style.opacity = 1;
    }, 600);

}

// ==========================================================
// RADAR
// Future
// ==========================================================


// ==========================================================
// SCREEN ROTATION
// ==========================================================

function rotateHeader() {

    if (showingWeek) {
        fadeForecast(hourlyForecast);
    } else {
        fadeForecast(weeklyForecast);
    }

    showingWeek = !showingWeek;

}

// ==========================================================
// ONBOARDING
// ==========================================================

// Data
const onboardingSteps = [
    {
        title: "SkyPanel",
        description: "Beautiful dashboards, made simple.",
        buttonText: "Next"
    },
    {
        title: "Choose Your Location",
        description: "SkyPanel needs your location to display local weather.",
        buttonText: "Continue"
    }
];

// State
let currentStep = 0;

// DOM References
const obTitle = document.getElementById("onboarding-title");
const obDescription = document.getElementById("onboarding-description");
const welcomeButton = document.getElementById("get-started-btn");
const obDotsContainer = document.getElementById("onboarding-dots");
const obContainer = document.getElementById("onboarding-content");
const welcomeOverlay = document.getElementById("welcome-overlay");

// Functions
function renderStep() {
    if (!obContainer) return;

    obContainer.style.opacity = "0";

    setTimeout(() => {
        const step = onboardingSteps[currentStep];

        if (obTitle) obTitle.textContent = step.title;
        if (obDescription) obDescription.textContent = step.description;
        if (welcomeButton) welcomeButton.textContent = step.buttonText;

        // Future:
        // When onboarding grows beyond a few screens,
        // move this injected UI into index.html so
        // presentation remains separate from application logic.

        // Location UI Injection for Step 2
        let locationUI = document.getElementById("location-ui");
        
        if (currentStep === 1) {
            if (!locationUI) {
                locationUI = document.createElement("div");
                locationUI.id = "location-ui";
                locationUI.style.margin = "20px 0";
                
                locationUI.innerHTML = `
                    <button id="geo-btn" style="padding: 10px 15px; margin-bottom: 10px; cursor: pointer;">📍 Use Current Location</button>
                    <div style="margin: 15px 0; font-size: 0.9em; opacity: 0.7;">------------- OR -------------</div>
                    <div>
                        <label for="zip-input" style="display: block; margin-bottom: 5px;">ZIP Code</label>
                        <input type="text" id="zip-input" maxlength="5" placeholder="_____" style="width: 80px; text-align: center; padding: 8px;">
                        <button id="zip-btn" style="padding: 8px 12px; cursor: pointer;">Search</button>
                    </div>
                    <div id="location-status" style="margin-top: 20px; font-weight: bold; min-height: 24px;"></div>
                `;
                
                obContainer.insertBefore(locationUI, welcomeButton);
                
                document.getElementById("geo-btn").addEventListener("click", geolocateUser);
                document.getElementById("zip-btn").addEventListener("click", lookupZip);
                document.getElementById("zip-input").addEventListener("keypress", (e) => {
                    if (e.key === "Enter") lookupZip();
                });
            }
            
            locationUI.style.display = "block";
            
            // Disable Continue button until a valid location exists
            if (!userSettings.location.name) {
                welcomeButton.disabled = true;
                welcomeButton.style.opacity = "0.5";
                welcomeButton.style.cursor = "not-allowed";
            }
            
        } else {
            if (locationUI) locationUI.style.display = "none";
            welcomeButton.disabled = false;
            welcomeButton.style.opacity = "1";
            welcomeButton.style.cursor = "pointer";
        }

        updateDots();

        obContainer.style.opacity = "0";

        requestAnimationFrame(() => {
            obContainer.style.opacity = "1";
        });

    }, 300);
}

function updateDots() {
    if (!obDotsContainer) return;
    
    obDotsContainer.innerHTML = "";
    
    onboardingSteps.forEach((_, index) => {
        const dot = document.createElement("div");
        dot.classList.add("dot");
        if (index === currentStep) {
            dot.classList.add("active");
        }
        obDotsContainer.appendChild(dot);
    });
}

function nextStep() {
    if (currentStep < onboardingSteps.length - 1) {
        currentStep++;
        renderStep();
    } else {
        finishOnboarding();
    }
}

function finishOnboarding() {
    userSettings.onboardingComplete = true;
    saveSettings();

    if (welcomeOverlay) {
        welcomeOverlay.style.transition = "opacity 0.3s ease";
        welcomeOverlay.style.opacity = "0";
        setTimeout(() => {
            welcomeOverlay.style.display = "none";
            startDashboard();
        }, 300);
    }
}

// Event Listeners
if (welcomeButton) {
    welcomeButton.addEventListener("click", () => {
        nextStep();
    });
}

// ==========================================================
// FULLSCREEN
// ==========================================================

const fsButton = document.getElementById("fullscreen-btn");

if (fsButton){

    fsButton.addEventListener("click", async () => {

        try{

            if(!document.fullscreenElement){

                await document.documentElement.requestFullscreen();

                fsButton.style.display="none";

            }

        }

        catch(err){

            alert("Fullscreen isn't supported on this device.");

            console.log(err);

        }

    });

}

// ==========================================================
// EVENT LISTENERS
// Future
// ==========================================================

// ==========================================================
// APPLICATION STARTUP
// ==========================================================

function startDashboard() {

    updateClock();
    setInterval(updateClock, 1000);

    loadWeather();
    setInterval(loadWeather, 10 * 60 * 1000);

    setInterval(rotateHeader, 45000);

}

function initApp() {
    loadSettings();

    if (userSettings.onboardingComplete) {
        if (welcomeOverlay) welcomeOverlay.style.display = "none";
        startDashboard();
    } else {
        renderStep();
    }
}

// Kick off initialization
initApp();