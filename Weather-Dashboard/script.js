const apiKey = "a81633713dcc75f8e5cd49fcd4629169"; // Add your OpenWeatherMap API key here
const containerDiv = document.querySelector(".container");
const weatherDiv = document.getElementById("weather");
const forecastDiv = document.getElementById("forecast");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const unitBtn = document.getElementById("unitBtn");
const refreshBtn = document.getElementById("refreshBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const voiceBtn = document.getElementById("voiceBtn");
const darkModeBtn = document.getElementById("darkModeBtn");
const favoriteBtn = document.getElementById("favoriteBtn");
const cityInput = document.getElementById("city");
const historyDiv = document.getElementById("history");
const favoritesDiv = document.getElementById("favorites");
const weatherLocation = document.getElementById("weatherLocation");
const suggestionsList = document.getElementById("suggestions");

let searchHistory = JSON.parse(localStorage.getItem("weatherSearchHistory")) || [];
let favoriteCities = JSON.parse(localStorage.getItem("weatherFavoriteCities")) || [];
let currentUnit = localStorage.getItem("weatherUnit") || "metric";
let lastSearchCity = localStorage.getItem("weatherLastCity") || "";
let darkMode = false;

function updateUnitButton() {
    unitBtn.textContent = currentUnit === "metric" ? "Show °F" : "Show °C";
}

function setLoading(message = "Loading weather...") {
    weatherDiv.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
    forecastDiv.innerHTML = "";
}

function setError(message) {
    weatherDiv.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
    forecastDiv.innerHTML = "";
}

function renderFavorites() {
    favoritesDiv.innerHTML = "";
    if (favoriteCities.length === 0) {
        favoritesDiv.innerHTML = "<p class='empty-state'>No favorite cities yet.</p>";
        return;
    }

    favoriteCities.forEach((city) => {
        const wrapper = document.createElement("div");
        wrapper.className = "favorite-chip";

        const selectBtn = document.createElement("button");
        selectBtn.type = "button";
        selectBtn.className = "fav-select";
        selectBtn.textContent = city;
        selectBtn.addEventListener("click", () => getWeather(city));

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "fav-remove";
        removeBtn.title = "Remove favorite";
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeFavorite(city);
        });

        wrapper.appendChild(selectBtn);
        wrapper.appendChild(removeBtn);
        favoritesDiv.appendChild(wrapper);
    });
}

function renderHistory() {
    historyDiv.innerHTML = "";
    if (searchHistory.length === 0) {
        historyDiv.innerHTML = "<p class='empty-state'>No recent searches yet.</p>";
        return;
    }

    searchHistory.forEach((city) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "history-chip";
        chip.textContent = city;
        chip.addEventListener("click", () => getWeather(city));
        historyDiv.appendChild(chip);
    });
}

function saveToHistory(city) {
    city = city.trim();
    if (!city) return;

    searchHistory = searchHistory.filter((item) => item.toLowerCase() !== city.toLowerCase());
    searchHistory.unshift(city);
    if (searchHistory.length > 6) searchHistory.pop();
    localStorage.setItem("weatherSearchHistory", JSON.stringify(searchHistory));
    renderHistory();
}

function toggleFavorite(city) {
    const normalized = city.trim();
    if (!normalized) return;

    const existingIndex = favoriteCities.findIndex((item) => item.toLowerCase() === normalized.toLowerCase());
    if (existingIndex !== -1) {
        favoriteCities.splice(existingIndex, 1);
    } else {
        favoriteCities.unshift(normalized);
        if (favoriteCities.length > 6) favoriteCities.pop();
    }

    localStorage.setItem("weatherFavoriteCities", JSON.stringify(favoriteCities));
    renderFavorites();
}

// Add a city to favorites (idempotent)
function addFavorite(city) {
    const normalized = (city || "").trim();
    if (!normalized) return false;
    const exists = favoriteCities.some((c) => c.toLowerCase() === normalized.toLowerCase());
    if (!exists) {
        favoriteCities.unshift(normalized);
        if (favoriteCities.length > 6) favoriteCities.pop();
        localStorage.setItem("weatherFavoriteCities", JSON.stringify(favoriteCities));
        renderFavorites();
    }
    return true;
}

// Remove a city from favorites
function removeFavorite(city) {
    const normalized = (city || "").trim();
    if (!normalized) return false;
    const idx = favoriteCities.findIndex((c) => c.toLowerCase() === normalized.toLowerCase());
    if (idx !== -1) {
        favoriteCities.splice(idx, 1);
        localStorage.setItem("weatherFavoriteCities", JSON.stringify(favoriteCities));
        renderFavorites();
        return true;
    }
    return false;
}

function updateDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem("weatherDarkMode", JSON.stringify(darkMode));
    document.body.classList.toggle("dark-mode", darkMode);
    darkModeBtn.textContent = darkMode ? "Light Mode" : "Dark Mode";
}

function updateTheme(weatherMain) {
    containerDiv.className = "container";
    const key = weatherMain.toLowerCase();

    if (key.includes("cloud")) containerDiv.classList.add("cloudy");
    else if (key.includes("rain") || key.includes("drizzle")) containerDiv.classList.add("rainy");
    else if (key.includes("thunder")) containerDiv.classList.add("stormy");
    else if (key.includes("snow")) containerDiv.classList.add("snowy");
    else if (key.includes("clear")) containerDiv.classList.add("warm");
    else containerDiv.classList.add("cold");
}

function formatTime(timestamp, timezoneOffset) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatLocalDate(timestamp, timezoneOffset) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function displayWeather(data) {
    const description = data.weather[0].description;
    const icon = data.weather[0].icon;
    const localTime = formatTime(data.dt, data.timezone);
    const localDate = formatLocalDate(data.dt, data.timezone);
    const unitLabel = currentUnit === "metric" ? "°C" : "°F";
    const windUnit = currentUnit === "metric" ? "m/s" : "mph";
    const visibility = data.visibility ? `${Math.round(data.visibility / 1000)} km` : "N/A";

    weatherLocation.textContent = `${data.name}, ${data.sys.country}`;
    weatherDiv.innerHTML = `
        <div class="weather-header">
            <div class="weather-title">
                <h2>${data.name}, ${data.sys.country}</h2>
                <p class="local-time">${localDate} • ${localTime}</p>
            </div>
            <div class="weather-icon-wrap">
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}">
            </div>
        </div>
        <div class="weather-summary">
            <p>${description.charAt(0).toUpperCase() + description.slice(1)}</p>
        </div>
        <div class="weather-details">
            <div class="detail-card"><strong>Temperature</strong><span>${Math.round(data.main.temp)}${unitLabel}</span></div>
            <div class="detail-card"><strong>Feels Like</strong><span>${Math.round(data.main.feels_like)}${unitLabel}</span></div>
            <div class="detail-card"><strong>Humidity</strong><span>${data.main.humidity}%</span></div>
            <div class="detail-card"><strong>Wind</strong><span>${data.wind.speed} ${windUnit}</span></div>
            <div class="detail-card"><strong>Pressure</strong><span>${data.main.pressure} hPa</span></div>
            <div class="detail-card"><strong>Clouds</strong><span>${data.clouds.all}%</span></div>
            <div class="detail-card"><strong>Visibility</strong><span>${visibility}</span></div>
            <div class="detail-card"><strong>Sunrise</strong><span>${formatTime(data.sys.sunrise, data.timezone)}</span></div>
            <div class="detail-card"><strong>Sunset</strong><span>${formatTime(data.sys.sunset, data.timezone)}</span></div>
        </div>
    `;

    updateTheme(data.weather[0].main);
    loadForecast(data.coord.lat, data.coord.lon);
}

async function getWeather(cityName) {
    const city = (cityName || cityInput.value).trim();
    if (!city) {
        setError("Please enter a city name.");
        return;
    }

    if (!apiKey.trim()) {
        setError("Please add your OpenWeatherMap API key in script.js.");
        return;
    }

    setLoading(`Loading weather for ${city}...`);

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=${currentUnit}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const message = errorData?.message ? errorData.message : "Unable to fetch weather data.";
            if (response.status === 404) throw new Error("City not found.");
            throw new Error(message);
        }

        const data = await response.json();
        lastSearchCity = data.name;
        localStorage.setItem("weatherLastCity", lastSearchCity);
        saveToHistory(data.name);
        displayWeather(data);
        favoriteBtn.disabled = false;
    } catch (error) {
        setError(error.message);
    }
}

async function getWeatherByLocation() {
    if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        return;
    }

    if (!apiKey.trim()) {
        setError("Please add your OpenWeatherMap API key in script.js.");
        return;
    }

    setLoading("Finding your location...");

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`;

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    const message = errorData?.message ? errorData.message : "Unable to fetch location weather.";
                    throw new Error(message);
                }

                const data = await response.json();
                lastSearchCity = data.name;
                localStorage.setItem("weatherLastCity", lastSearchCity);
                saveToHistory(data.name);
                displayWeather(data);
            } catch (error) {
                setError(error.message);
            }
        },
        (error) => {
            setError(`Location error: ${error.message}`);
        }
    );
}

function refreshWeather() {
    if (!lastSearchCity) {
        setError("Search a city first to refresh.");
        return;
    }
    getWeather(lastSearchCity);
}

function startVoiceSearch() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        setError("Voice search is not supported in this browser.");
        return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.start();
    voiceBtn.textContent = "Listening...";

    recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript;
        cityInput.value = spoken;
        getWeather(spoken);
    };

    recognition.onend = () => {
        voiceBtn.textContent = "Voice Search";
    };

    recognition.onerror = () => {
        setError("Voice search failed. Try again.");
        voiceBtn.textContent = "Voice Search";
    };
}

async function loadForecast(lat, lon) {
    forecastDiv.innerHTML = "";
    if (!apiKey.trim()) return;

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Unable to fetch forecast data.");
        }

        const forecast = await response.json();
        const dailyForecast = {};

        forecast.list.forEach((item) => {
            const dateKey = formatDate(item.dt, forecast.city.timezone);
            if (!dailyForecast[dateKey] || item.dt_txt.includes("12:00:00")) {
                dailyForecast[dateKey] = item;
            }
        });

        const todayKey = formatDate(Math.floor(Date.now() / 1000), forecast.city.timezone);
        const forecastItems = Object.keys(dailyForecast)
            .filter((date) => date !== todayKey)
            .slice(0, 5)
            .map((date) => dailyForecast[date]);

        if (forecastItems.length === 0) {
            forecastDiv.innerHTML = "<div class='empty-state'><p>No forecast available.</p></div>";
            return;
        }

        forecastDiv.innerHTML = `
            <h2>5-Day Forecast</h2>
            <div class="forecast-grid">
                ${forecastItems.map((item) => {
                    const icon = item.weather[0].icon;
                    const dayName = new Date((item.dt + forecast.city.timezone) * 1000)
                        .toLocaleDateString("en-US", { weekday: "short" });
                    const temp = Math.round(item.main.temp);
                    const description = item.weather[0].description;
                    return `
                        <article class="forecast-item">
                            <span class="forecast-day">${dayName}</span>
                            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}">
                            <span class="forecast-temp">${temp}${currentUnit === "metric" ? "°C" : "°F"}</span>
                            <span class="forecast-desc">${description.charAt(0).toUpperCase() + description.slice(1)}</span>
                        </article>
                    `;
                }).join("")}
            </div>
        `;
    } catch (error) {
        forecastDiv.innerHTML = `<div class='empty-state'><p>${error.message}</p></div>`;
    }
}

function formatDate(timestamp, timezoneOffset) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    return date.toISOString().split("T")[0];
}

// --- Autocomplete / search suggestions using OpenWeatherMap geocoding API ---
let suggestionsTimer = null;
let highlightedIndex = -1;

function clearSuggestions() {
    if (!suggestionsList) return;
    suggestionsList.innerHTML = "";
    suggestionsList.style.display = "none";
    highlightedIndex = -1;
}

function updateSuggestionHighlight(items) {
    items.forEach((it, i) => {
        it.classList.toggle("active", i === highlightedIndex);
        if (i === highlightedIndex) it.scrollIntoView({ block: "nearest" });
    });
}

function renderSuggestions(items) {
    if (!suggestionsList) return;
    suggestionsList.innerHTML = "";
    if (!items || items.length === 0) {
        clearSuggestions();
        return;
    }

    items.forEach((it, idx) => {
        const li = document.createElement("li");
        li.className = "suggestion-item";
        li.setAttribute("role", "option");
        li.tabIndex = -1;
        li.textContent = `${it.name}${it.state ? ", " + it.state : ""}${it.country ? ", " + it.country : ""}`;
        li.addEventListener("click", () => selectSuggestion(it));
        suggestionsList.appendChild(li);
    });

    suggestionsList.style.display = "block";
    highlightedIndex = -1;
}

async function fetchSuggestions(query) {
    if (!query || !apiKey.trim()) {
        clearSuggestions();
        return;
    }

    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=6&appid=${apiKey}`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            clearSuggestions();
            return;
        }
        const data = await res.json();
        renderSuggestions(data);
    } catch (err) {
        clearSuggestions();
    }
}

function selectSuggestion(item) {
    if (!item) return;
    cityInput.value = item.name;
    clearSuggestions();
    getWeather(item.name);
}

function debounceFetch(query, delay = 300) {
    clearTimeout(suggestionsTimer);
    suggestionsTimer = setTimeout(() => fetchSuggestions(query), delay);
}

// Close suggestions when clicking outside
document.addEventListener("click", (e) => {
    if (!suggestionsList) return;
    if (e.target === cityInput || suggestionsList.contains(e.target)) return;
    clearSuggestions();
});


searchBtn.addEventListener("click", () => getWeather());
locationBtn.addEventListener("click", getWeatherByLocation);
unitBtn.addEventListener("click", () => {
    currentUnit = currentUnit === "metric" ? "imperial" : "metric";
    localStorage.setItem("weatherUnit", currentUnit);
    updateUnitButton();
    if (lastSearchCity) getWeather(lastSearchCity);
});
voiceBtn.addEventListener("click", startVoiceSearch);
darkModeBtn.addEventListener("click", updateDarkMode);
favoriteBtn.addEventListener("click", () => {
    if (lastSearchCity) {
        const ok = addFavorite(lastSearchCity);
        if (!ok) setError("Unable to add favorite.");
    } else setError("Search a city first to add favorites.");
});
refreshBtn.addEventListener("click", refreshWeather);
clearHistoryBtn.addEventListener("click", () => {
    searchHistory = [];
    localStorage.removeItem("weatherSearchHistory");
    renderHistory();
});
cityInput.addEventListener("input", (event) => {
    const q = event.target.value.trim();
    if (!q) {
        clearSuggestions();
        return;
    }
    debounceFetch(q);
});

cityInput.addEventListener("keydown", (event) => {
    const items = suggestionsList ? suggestionsList.querySelectorAll('.suggestion-item') : [];
    if (event.key === "ArrowDown") {
        if (items.length === 0) return;
        event.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
        updateSuggestionHighlight(Array.from(items));
    } else if (event.key === "ArrowUp") {
        if (items.length === 0) return;
        event.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, 0);
        updateSuggestionHighlight(Array.from(items));
    } else if (event.key === "Enter") {
        if (highlightedIndex >= 0 && items.length > 0) {
            event.preventDefault();
            items[highlightedIndex].click();
        } else {
            getWeather();
        }
    } else if (event.key === "Escape") {
        clearSuggestions();
    }
});

document.body.classList.toggle("dark-mode", darkMode);
updateUnitButton();
renderHistory();
renderFavorites();
favoriteBtn.disabled = !lastSearchCity;
if (lastSearchCity) getWeather(lastSearchCity);
