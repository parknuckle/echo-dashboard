// ===========================
// Echo Dashboard
// app.js
// ===========================
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
// ----- Clock -----

function updateClock() {

    const now = new Date();

    const time = now.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });

    const date = now.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric"
    });

    document.getElementById("time").textContent = time;

    let dateElement = document.getElementById("date");

    if (!dateElement) {

        dateElement = document.createElement("div");

        dateElement.id = "date";

        document.querySelector(".clock").appendChild(dateElement);

    }

    dateElement.textContent = date;

}




// ===========================
// WEATHER
// ===========================

async function loadWeather() {

    const url =
`https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.latitude}&longitude=${CONFIG.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=sunrise&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;

    try {

        const response = await fetch(url);

        const data = await response.json();

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

 }

    catch(error){

        console.log(error);

    }

}   // <-- loadWeather() ends here

// ===========================
// START DASHBOARD
// ===========================

updateClock();
setInterval(updateClock, 1000);

loadWeather();
setInterval(loadWeather, 10 * 60 * 1000);