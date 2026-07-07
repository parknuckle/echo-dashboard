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
`https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.latitude}&longitude=${CONFIG.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=sunrise&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
    try {

        const response = await fetch(url);

        const data = await response.json();

    // ===========================
// HOURLY FORECAST
// ===========================

// Current hour
const now = new Date();
const currentHour = now.getHours();

// Find the current hour in the API data
const startIndex = data.hourly.time.findIndex(time => {
    return new Date(time).getHours() === currentHour;
});

// Update the next four hours
for (let i = 1; i <= 4; i++) {

    const index = startIndex + i;

    const hour = new Date(data.hourly.time[index]);

    const hourText = hour.toLocaleTimeString([], {
        hour: "numeric"
    });

    document.getElementById(`hour${i}-time`).textContent =
        hourText;

    document.getElementById(`hour${i}-temp`).textContent =
        Math.round(data.hourly.temperature_2m[index]) + "°";

    document.getElementById(`hour${i}-icon`).textContent =
        weatherDescription(data.hourly.weather_code[index]).split(" ")[0];

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
// ===========================
// FULLSCREEN
// ===========================

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