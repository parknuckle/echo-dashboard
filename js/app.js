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
        name: "",
        zip: ""
    },
    units: {},
    radar: {},
    dashboard: {},
    theme: {}
};

function loadSettings() {

    const saved = localStorage.getItem("skyPanelSettings");

    if (!saved) return;

    try {

        const parsed = JSON.parse(saved);

        userSettings = {
            ...userSettings,
            ...parsed,
            // Deep-merge location so old saved settings
            // without a zip property keep working.
            location: {
                ...userSettings.location,
                ...(parsed.location || {})
            }
        };

    }

    catch (err) {

        console.error("Unable to load settings.", err);

    }

}

function saveSettings() {

    localStorage.setItem(
        "skyPanelSettings",
        JSON.stringify(userSettings)
    );

}

// ==========================================================
// GLOBAL VARIABLES
// ==========================================================

let showingWeek = false;

// Live forecasts
let hourlyForecast = [];
let weeklyForecast = [];

// Staged location while the location screen is open.
// The active userSettings.location is untouched until
// the user presses Continue.
let pendingLocation = null;

// Whether the location overlay is open for first-time
// onboarding or Settings → Change Location.
let locationScreenMode = "onboarding";

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
    55: "🌧 Heavy Drizzle",

    56: "🌧 Light Freezing Drizzle",
    57: "🌧 Freezing Drizzle",

    61: "🌧 Light Rain",
    63: "🌧 Moderate Rain",
    65: "🌧 Heavy Rain",

    66: "🌧 Light Freezing Rain",
    67: "🌧 Freezing Rain",

    71: "❄️ Light Snow",
    73: "❄️ Moderate Snow",
    75: "❄️ Heavy Snow",
    77: "❄️ Snow Grains",

    80: "🌦 Light Rain Showers",
    81: "🌧 Rain Showers",
    82: "🌧 Heavy Rain Showers",

    85: "🌨 Light Snow Showers",
    86: "🌨 Heavy Snow Showers",

    95: "⛈ Thunderstorm",
    96: "⛈ Thunderstorm with Light Hail",
    99: "⛈ Thunderstorm with Heavy Hail"
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

function updateLocationDisplay() {

    const locationElement =
        document.getElementById("location");

    if (!locationElement) return;

    if (userSettings.location.name) {

        locationElement.textContent =
            userSettings.location.name;

    }

}

function enableContinueButton() {

    const continueButton =
        document.getElementById("get-started-btn");

    if (continueButton) {
        continueButton.disabled = false;
    }

}

function geolocateUser() {

    const status = document.getElementById("location-status");

    if (!status) return;

    if (!navigator.geolocation) {
        status.textContent =
            "Location is not supported by this browser.";
        return;
    }

    status.textContent = "Finding your location...";

    navigator.geolocation.getCurrentPosition(

        function(position) {

            // Stage the location. The active saved
            // location is not changed until Continue.
            pendingLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                name: "Current Location",
                // Geolocation is not ZIP-based; clear
                // any stale ZIP.
                zip: ""
            };

            status.textContent = "📍 Location found";
            enableContinueButton();

        },

        function(error) {

            console.error(
                "Geolocation failed:",
                error
            );

            status.textContent =
                "Unable to access your location. Try entering your ZIP code.";

        }

    );

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

        const response = await fetch(
            `https://api.zippopotam.us/us/${zip}`
        );

        if (!response.ok) {
            throw new Error("ZIP code not found");
        }

        const data = await response.json();
        const place = data.places[0];

        // Stage the location. The active saved
        // location is not changed until Continue.
        pendingLocation = {
            latitude: parseFloat(place.latitude),
            longitude: parseFloat(place.longitude),
            name: `${place["place name"]}, ${place["state abbreviation"]}`,
            zip: zip
        };

        status.textContent =
            `📍 ${pendingLocation.name}`;

        enableContinueButton();

    }

    catch (error) {

        console.error("ZIP lookup failed:", error);

        status.textContent =
            "ZIP code not found. Please try again.";

    }

}

// ==========================================================
// WEATHER
// ==========================================================

async function loadWeather() {

    const latitude =
        userSettings.location.latitude ?? CONFIG.latitude;

    const longitude =
        userSettings.location.longitude ?? CONFIG.longitude;

    const url =
`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=sunrise,weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;

    try {

        const response = await fetch(url);

        const data = await response.json();

        // Current hour
        const now = new Date();
        const currentHour = now.getHours();

        // Find the current hour in the API data
        const startIndex = data.hourly.time.findIndex(time => {
            return new Date(time).getHours() === currentHour;
        });

        // Build the next seven hours
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

        }

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

        // Conditions
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

    }

    catch (error) {

        console.log(error);

    }

}

// ==========================================================
// FORECAST
// ==========================================================

function displayForecast(data) {

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
// ==========================================================
function loadRadar() {

    const radarMapElement =
        document.getElementById("radarMap");

    if (!radarMapElement) return;

    const latitude =
        userSettings.location.latitude ?? CONFIG.latitude;

    const longitude =
        userSettings.location.longitude ?? CONFIG.longitude;

    // Clean up an existing radar map/timer
    if (window.skyPanelRadarTimer) {
        clearInterval(window.skyPanelRadarTimer);
        window.skyPanelRadarTimer = null;
    }

    if (window.skyPanelRadarMap) {
        window.skyPanelRadarMap.remove();
        window.skyPanelRadarMap = null;
    }

    const map =
        new maplibregl.Map({
            container: "radarMap",
            style: "https://tiles.openfreemap.org/styles/dark",
            center: [longitude, latitude],
            zoom: 8
        });

    window.skyPanelRadarMap = map;

    map.addControl(
        new maplibregl.NavigationControl(),
        "top-right"
    );

    map.on("load", async () => {

        try {

            // Get the actual radar frames currently available
            // from LibreWXR instead of constructing timestamps.
            const response =
                await fetch(
                    "https://api.librewxr.net/public/weather-maps.json"
                );

            if (!response.ok) {
                throw new Error(
                    "LibreWXR metadata request failed: " +
                    response.status
                );
            }

            const data = await response.json();

            const radarFrames =
                data?.radar?.past || [];

            if (!radarFrames.length) {
                throw new Error(
                    "LibreWXR returned no radar frames."
                );
            }

            // Use the most recent 13 available frames.
            const frames =
                radarFrames.slice(-13);

            function radarTileUrl(frame) {

                const timestamp =
                    frame.time;

                return (
                    "https://api.librewxr.net/v2/radar/" +
                    timestamp +
                    "/512/{z}/{x}/{y}/10/1_1.png"
                );
            }

            map.addSource("librewxr-radar", {
                type: "raster",
                tiles: [
                    radarTileUrl(frames[frames.length - 1])
                ],
                tileSize: 512
            });

            map.addLayer({
                id: "librewxr-radar-layer",
                type: "raster",
                source: "librewxr-radar",
                paint: {
                    "raster-opacity": 0.9
                }
            });

            // Make city/place labels easier to see
            map.getStyle().layers.forEach(layer => {

                if (
                    layer.type === "symbol" &&
                    layer.layout &&
                    layer.layout["text-field"] &&
                    /place/i.test(layer.id)
                ) {

                    map.setPaintProperty(
                        layer.id,
                        "text-color",
                        "#f4f7fb"
                    );

                    map.setPaintProperty(
                        layer.id,
                        "text-halo-color",
                        "#111111"
                    );

                    map.setPaintProperty(
                        layer.id,
                        "text-halo-width",
                        1.1
                    );

                }

            });

            // Make map lines more visible
            map.getStyle().layers.forEach(layer => {

                if (
                    layer.type === "line" &&
                    layer.paint &&
                    map.getPaintProperty(
                        layer.id,
                        "line-opacity"
                    ) !== undefined
                ) {

                    map.setPaintProperty(
                        layer.id,
                        "line-opacity",
                        0.96
                    );

                }

            });

            let frameIndex = frames.length - 1;

            // Animate through the available radar frames.
            window.skyPanelRadarTimer =
                setInterval(() => {

                    frameIndex =
                        (frameIndex + 1) % frames.length;

                    map.getSource(
                        "librewxr-radar"
                    ).setTiles([
                        radarTileUrl(
                            frames[frameIndex]
                        )
                    ]);

                }, 1600);

            console.log(
                "LibreWXR radar loaded:",
                frames.length,
                "frames"
            );

        }
        catch (error) {

            console.error(
                "LibreWXR radar failed:",
                error
            );

        }

    });

}

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
// ONBOARDING / LOCATION SCREEN
// Single step: Choose Your Location.
// Also reused for Settings → Change Location.
// ==========================================================

const welcomeButton = document.getElementById("get-started-btn");
const welcomeOverlay = document.getElementById("welcome-overlay");

function openLocationScreen(mode) {

    locationScreenMode = mode;
    pendingLocation = null;

    const status = document.getElementById("location-status");
    const zipInput = document.getElementById("zip-input");

    // Reset the location screen state.
    if (status) status.textContent = "";
    if (zipInput) zipInput.value = "";

    // Pre-fill the saved ZIP for Change Location,
    // but never auto-search or auto-submit it.
    if (mode === "change-location" && zipInput && userSettings.location.zip) {
        zipInput.value = userSettings.location.zip;
    }

    if (welcomeButton) welcomeButton.disabled = true;

    if (welcomeOverlay) {
        welcomeOverlay.style.display = "flex";
        welcomeOverlay.style.opacity = "1";
    }

}

// Called directly from the Continue button's click
// handler. Commits the staged location.
function finishLocationScreen() {

    // Safety: nothing selected yet.
    if (!pendingLocation) return;

    // Commit the staged location as the active location.
    userSettings.location = {
        ...pendingLocation
    };
    pendingLocation = null;

    saveSettings();

    if (locationScreenMode === "onboarding") {

        userSettings.onboardingComplete = true;
        saveSettings();

        hideLocationOverlay(() => {
            startDashboard();
        });

        // Fullscreen attempt is made synchronously here,
        // inside the user gesture (no setTimeout).
        requestFullscreenIfPossible();

    } else {

        // Change Location: onboarding stays complete.
        hideLocationOverlay(() => {

            // Reuse the existing update/load functions
            // for the newly selected location.
            updateLocationDisplay();
            loadWeather();
            loadRadar();

        });

    }

}

function hideLocationOverlay(callback) {

    if (!welcomeOverlay) {
        if (callback) callback();
        return;
    }

    welcomeOverlay.style.transition = "opacity 0.3s ease";
    welcomeOverlay.style.opacity = "0";

    setTimeout(() => {
        welcomeOverlay.style.display = "none";
        if (callback) callback();
    }, 300);

}

// Event Listeners
if (welcomeButton) {
    welcomeButton.addEventListener("click", () => {
        finishLocationScreen();
    });
}

// ==========================================================
// SETTINGS
// ==========================================================

const settingsOverlay = document.getElementById("settings-overlay");
const settingsGear = document.getElementById("settings-gear");
const settingsCloseBtn = document.getElementById("settings-close-btn");
const changeLocationBtn = document.getElementById("change-location-btn");

if (settingsGear) {
    settingsGear.addEventListener("click", () => {
        if (settingsOverlay) {
            settingsOverlay.style.display = "flex";
        }
    });
}

if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener("click", () => {
        if (settingsOverlay) {
            settingsOverlay.style.display = "none";
        }
    });
}

if (changeLocationBtn) {
    changeLocationBtn.addEventListener("click", () => {

        // Close Settings, then reuse the existing
        // location screen. No second location system.
        if (settingsOverlay) {
            settingsOverlay.style.display = "none";
        }

        openLocationScreen("change-location");

    });
}

// ==========================================================
// FULLSCREEN
// ==========================================================

const fsButton = document.getElementById("fullscreen-btn");

async function requestFullscreenIfPossible() {

    try {

        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
            if (fsButton) fsButton.style.display = "none";
        }

    }

    catch (err) {
        // Fullscreen not permitted/supported.
        // The fullscreen button remains as the fallback.
        console.log("Fullscreen not permitted:", err);
    }

}

if (fsButton) {

    fsButton.addEventListener("click", async () => {

        try {

            if (!document.fullscreenElement) {

                await document.documentElement.requestFullscreen();

                fsButton.style.display = "none";

            }

        }

        catch (err) {

            alert("Fullscreen isn't supported on this device.");

            console.log(err);

        }

    });

}

// ==========================================================
// EVENT LISTENERS
// ==========================================================

const useLocationButton =
    document.getElementById("use-location-btn");

if (useLocationButton) {

    useLocationButton.addEventListener(
        "click",
        geolocateUser
    );

}

const zipSearchButton =
    document.getElementById("zip-search-btn");

if (zipSearchButton) {

    zipSearchButton.addEventListener(
        "click",
        lookupZip
    );

}

// ==========================================================
// APPLICATION STARTUP
// ==========================================================

function startDashboard() {

    updateClock();
    setInterval(updateClock, 1000);

    updateLocationDisplay();
    loadWeather();
    loadRadar();
    setInterval(loadWeather, 10 * 60 * 1000);

    setInterval(rotateHeader, 45000);

}

loadSettings();

// Returning users with completed onboarding and a valid
// saved location go straight to the dashboard.
if (
    userSettings.onboardingComplete &&
    userSettings.location.latitude !== null &&
    userSettings.location.longitude !== null
) {

    startDashboard();

} else {

    // First-time user: go directly to Choose Your Location.
    openLocationScreen("onboarding");

}
