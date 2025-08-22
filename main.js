import { widgets } from './widgets.js';
import { schemaValidator, renderUtils, createDiagnosticFetch } from './testing.js';

// Global application state
const state = {
    settings: {
        utcMode: false,
        darkTheme: false,
        enabledWidgets: ['quote', 'finance', 'advanced-weather', 'current-weather', 'hourly-weather', 'daily-weather', 'air-quality-weather', 'marine-weather', 'weather-history', 'calendar'],
        widgets: {
            weather: {
                units: 'metric', // metric or imperial
                autoRefresh: false,
                refreshInterval: 15, // minutes
                advancedMode: false,
                educationalTips: true,
                sailingMode: true,
                enabledSections: {
                    command: true,
                    atmosphere: true,
                    precip: true,
                    wind: true,
                    sun: true,
                    environment: true,
                    advanced: true,
                    // Legacy tabs
                    now: true,
                    hourly: true,
                    daily: true,
                    airQuality: true,
                    marine: true,
                    history: true
                },
                alertThresholds: {
                    rainProbHigh: 0.8,
                    gustStrongKmh: 50,
                    pressureDropRapid_hPa_3h: 3,
                    uvHigh: 6,
                    waveHighM: 2.5
                }
            }
        }
    },
    quotes: [],
    currentQuote: null,
    weatherData: null,
    airQualityData: null,
    marineData: null,
    historyData: null,
    nowcastData: null,
    services: {}
};

// Services for data loading
const services = {
    quotes: {
        async getAll() {
            try {
                const response = await fetch('./quotes.json');
                if (!response.ok) throw new Error('Failed to load quotes');
                return await response.json();
            } catch (error) {
                console.error('Error loading quotes:', error);
                return [];
            }
        }
    },
    
    // Mock services for future widgets
    finance: {
        async getPortfolio() {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
            return {
                totalValue: 125430.50,
                dayChange: 2340.75,
                dayChangePercent: 1.9,
                positions: [
                    { symbol: 'AAPL', value: 45230.50, change: 1.2 },
                    { symbol: 'GOOGL', value: 32450.25, change: -0.8 },
                    { symbol: 'MSFT', value: 28750.75, change: 2.1 }
                ]
            };
        }
    },
    
    weather: {
        baseUrl: 'https://api.open-meteo.com/v1/forecast',
        airQualityUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
        marineUrl: 'https://marine-api.open-meteo.com/v1/marine',
        location: { lat: 57.1497, lon: -2.0943, timezone: 'Europe/London' },
        
        cache: new Map(),
        
        getCacheKey(endpoint, params = {}) {
            return `${endpoint}_${JSON.stringify(params)}`;
        },
        
        getCachedData(key, ttlMinutes) {
            const cached = this.cache.get(key);
            if (!cached) return null;
            
            const now = Date.now();
            if (now - cached.timestamp > ttlMinutes * 60 * 1000) {
                this.cache.delete(key);
                return null;
            }
            return cached.data;
        },
        
        setCachedData(key, data) {
            this.cache.set(key, { data, timestamp: Date.now() });
        },
        
        async fetchWithCache(url, cacheKey, ttlMinutes = 15) {
            const cached = this.getCachedData(cacheKey, ttlMinutes);
            if (cached) {
                if (window.__WX_DIAG__?.isEnabled) {
                    console.log('💾 Cache hit for:', cacheKey);
                }
                return cached;
            }
            
            const diagnosticFetch = createDiagnosticFetch(fetch.bind(window));
            
            try {
                const data = await diagnosticFetch(url);
                
                // Run schema validation if diagnostics enabled
                if (window.__WX_DIAG__?.isEnabled) {
                    if (url.includes('/forecast')) {
                        schemaValidator.assertForecastShape(data);
                    } else if (url.includes('/marine')) {
                        schemaValidator.assertMarineShape(data);
                    }
                }
                
                this.setCachedData(cacheKey, data);
                return data;
            } catch (error) {
                console.error(`Weather API error:`, error);
                throw error;
            }
        },
        
        async getCurrentAndForecast(units = 'metric') {
            const { lat, lon, timezone } = this.location;
            const isMetric = units === 'metric';
            const tempUnit = isMetric ? 'celsius' : 'fahrenheit';
            const speedUnit = isMetric ? 'kmh' : 'mph';
            
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                timezone,
                temperature_unit: tempUnit,
                wind_speed_unit: speedUnit,
                precipitation_unit: 'mm',
                current: [
                    'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
                    'precipitation', 'rain', 'showers', 'snowfall', 'weather_code',
                    'cloud_cover', 'pressure_msl', 'surface_pressure', 'wind_speed_10m',
                    'wind_direction_10m', 'wind_gusts_10m'
                ].join(','),
                hourly: [
                    // Thermo/comfort
                    'temperature_2m', 'apparent_temperature', 'dew_point_2m', 'relative_humidity_2m', 'visibility',
                    // Pressure/clouds  
                    'surface_pressure', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high', 'cloud_cover',
                    // Precip & types
                    'precipitation_probability', 'precipitation', 'rain', 'showers', 'snowfall', 'weather_code',
                    // Wind (surface + elevated)
                    'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
                    'wind_speed_80m', 'wind_direction_80m', 'wind_speed_120m', 'wind_direction_120m',
                    // Marine relevance
                    'freezing_level_height',
                    // Convective/BL
                    'cape', 'lifted_index', 'boundary_layer_height',
                    // Solar/UV/ET
                    'shortwave_radiation', 'direct_normal_irradiance', 'uv_index', 'et0_fao_evapotranspiration', 'vapour_pressure_deficit',
                    // Soil (learning)
                    'soil_temperature_0cm', 'soil_temperature_6cm', 'soil_temperature_18cm', 'soil_temperature_54cm',
                    'soil_moisture_0_to_1cm', 'soil_moisture_1_to_3cm', 'soil_moisture_3_to_9cm', 'soil_moisture_9_to_27cm', 'soil_moisture_27_to_81cm',
                    // Other
                    'is_day'
                ].join(','),
                daily: [
                    'temperature_2m_max', 'temperature_2m_min', 'apparent_temperature_max', 'apparent_temperature_min',
                    'sunrise', 'sunset', 'daylight_duration', 'sunshine_duration',
                    'uv_index_max',
                    'precipitation_sum', 'precipitation_hours', 'rain_sum', 'showers_sum', 'snowfall_sum',
                    'shortwave_radiation_sum', 'et0_fao_evapotranspiration',
                    'weather_code', 'wind_speed_10m_max', 'wind_gusts_10m_max', 'wind_direction_10m_dominant'
                ].join(','),
                forecast_days: 7
            });
            
            const url = `${this.baseUrl}?${params}`;
            const cacheKey = this.getCacheKey('forecast', { units });
            return await this.fetchWithCache(url, cacheKey, 15);
        },
        
        async getAirQuality() {
            const { lat, lon, timezone } = this.location;
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                timezone,
                current: ['european_aqi', 'us_aqi', 'pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide', 'sulphur_dioxide', 'ozone'].join(','),
                hourly: ['european_aqi', 'us_aqi', 'pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide', 'sulphur_dioxide', 'ozone'].join(','),
                forecast_hours: 72
            });
            
            const url = `${this.airQualityUrl}?${params}`;
            const cacheKey = this.getCacheKey('air_quality');
            return await this.fetchWithCache(url, cacheKey, 60);
        },
        
        async getMarine() {
            const { lat, lon, timezone } = this.location;
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                timezone,
                current: ['wave_height', 'wave_direction', 'wave_period', 'wind_wave_height', 'wind_wave_direction', 'wind_wave_period'].join(','),
                hourly: ['wave_height', 'wave_direction', 'wave_period', 'wind_wave_height', 'wind_wave_direction', 'wind_wave_period'].join(','),
                forecast_hours: 48
            });
            
            const url = `${this.marineUrl}?${params}`;
            const cacheKey = this.getCacheKey('marine');
            return await this.fetchWithCache(url, cacheKey, 120);
        },
        
        async getNowcast() {
            const { lat, lon, timezone } = this.location;
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                timezone,
                minutely_15: [
                    'precipitation', 'rain', 'snowfall', 'weather_code',
                    'wind_gusts_10m', 'visibility', 'uv_index', 'shortwave_radiation_instant', 'is_day'
                ].join(','),
                forecast_minutely_15: 288 // Get all available minutely data to find rain
            });
            
            const url = `${this.baseUrl}?${params}`;
            const cacheKey = this.getCacheKey('nowcast');
            return await this.fetchWithCache(url, cacheKey, 10);
        },

        async getHistory() {
            const { lat, lon, timezone } = this.location;
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                timezone,
                start_date: startDate,
                end_date: endDate,
                daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'wind_speed_10m_max'].join(',')
            });
            
            const url = `https://archive-api.open-meteo.com/v1/archive?${params}`;
            const cacheKey = this.getCacheKey('history');
            return await this.fetchWithCache(url, cacheKey, 720); // 12 hour cache
        }
    },
    
    calendar: {
        async getUpcoming() {
            await new Promise(resolve => setTimeout(resolve, 200));
            const now = new Date();
            return [
                {
                    title: 'Team Meeting',
                    time: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
                    type: 'meeting'
                },
                {
                    title: 'Doctor Appointment',
                    time: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
                    type: 'appointment'
                },
                {
                    title: 'Project Deadline',
                    time: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                    type: 'deadline'
                }
            ];
        }
    }
};

// Weather utility functions
const weatherUtils = {
    weatherCodes: {
        0: { icon: 'ph-sun', label: 'Clear sky' },
        1: { icon: 'ph-cloud-sun', label: 'Mainly clear' },
        2: { icon: 'ph-cloud', label: 'Partly cloudy' },
        3: { icon: 'ph-clouds', label: 'Overcast' },
        45: { icon: 'ph-cloud-fog', label: 'Fog' },
        48: { icon: 'ph-cloud-fog', label: 'Depositing rime fog' },
        51: { icon: 'ph-cloud-drizzle', label: 'Light drizzle' },
        53: { icon: 'ph-cloud-drizzle', label: 'Moderate drizzle' },
        55: { icon: 'ph-cloud-drizzle', label: 'Dense drizzle' },
        56: { icon: 'ph-cloud-drizzle', label: 'Freezing drizzle' },
        57: { icon: 'ph-cloud-drizzle', label: 'Dense freezing drizzle' },
        61: { icon: 'ph-cloud-rain', label: 'Light rain' },
        63: { icon: 'ph-cloud-rain', label: 'Moderate rain' },
        65: { icon: 'ph-cloud-rain', label: 'Heavy rain' },
        66: { icon: 'ph-cloud-rain', label: 'Freezing rain' },
        67: { icon: 'ph-cloud-rain', label: 'Heavy freezing rain' },
        71: { icon: 'ph-cloud-snow', label: 'Light snow' },
        73: { icon: 'ph-cloud-snow', label: 'Moderate snow' },
        75: { icon: 'ph-cloud-snow', label: 'Heavy snow' },
        77: { icon: 'ph-cloud-snow', label: 'Snow grains' },
        80: { icon: 'ph-cloud-rain', label: 'Light showers' },
        81: { icon: 'ph-cloud-rain', label: 'Moderate showers' },
        82: { icon: 'ph-cloud-rain', label: 'Violent showers' },
        85: { icon: 'ph-cloud-snow', label: 'Light snow showers' },
        86: { icon: 'ph-cloud-snow', label: 'Heavy snow showers' },
        95: { icon: 'ph-cloud-lightning', label: 'Thunderstorm' },
        96: { icon: 'ph-cloud-lightning', label: 'Thunderstorm with hail' },
        99: { icon: 'ph-cloud-lightning', label: 'Heavy thunderstorm with hail' }
    },
    
    getWeatherInfo(code) {
        return this.weatherCodes[code] || { icon: 'ph-question', label: 'Unknown' };
    },
    
    convertTemp(celsius, toUnit = 'metric') {
        if (toUnit === 'imperial') {
            return Math.round((celsius * 9/5) + 32);
        }
        return Math.round(celsius);
    },
    
    convertSpeed(kmh, toUnit = 'metric') {
        if (toUnit === 'imperial') {
            return Math.round(kmh * 0.621371);
        }
        return Math.round(kmh);
    },
    
    convertPressure(hPa, toUnit = 'metric') {
        if (toUnit === 'imperial') {
            return (hPa * 0.02953).toFixed(2);
        }
        return Math.round(hPa);
    },
    
    getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    },
    
    getBeaufortScale(windSpeed) {
        if (windSpeed < 1) return { scale: 0, description: 'Calm' };
        if (windSpeed < 6) return { scale: 1, description: 'Light air' };
        if (windSpeed < 12) return { scale: 2, description: 'Light breeze' };
        if (windSpeed < 20) return { scale: 3, description: 'Gentle breeze' };
        if (windSpeed < 29) return { scale: 4, description: 'Moderate breeze' };
        if (windSpeed < 39) return { scale: 5, description: 'Fresh breeze' };
        if (windSpeed < 50) return { scale: 6, description: 'Strong breeze' };
        if (windSpeed < 62) return { scale: 7, description: 'High wind' };
        if (windSpeed < 75) return { scale: 8, description: 'Gale' };
        if (windSpeed < 89) return { scale: 9, description: 'Strong gale' };
        if (windSpeed < 103) return { scale: 10, description: 'Storm' };
        if (windSpeed < 118) return { scale: 11, description: 'Violent storm' };
        return { scale: 12, description: 'Hurricane' };
    },
    
    getAirQualityLevel(aqi) {
        if (aqi <= 20) return { level: 'Good', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900' };
        if (aqi <= 40) return { level: 'Fair', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900' };
        if (aqi <= 60) return { level: 'Moderate', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900' };
        if (aqi <= 80) return { level: 'Poor', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900' };
        if (aqi <= 100) return { level: 'Very Poor', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900' };
        return { level: 'Extremely Poor', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-200 dark:bg-red-800' };
    },
    
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit', 
            timeZone: 'Europe/London' 
        });
    },
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            timeZone: 'Europe/London'
        });
    },

    // Advanced computations for professional features
    computePressureTrend(hourlyPressure) {
        if (hourlyPressure.length < 4) return 'Unknown';
        const current = hourlyPressure[0];
        const threeHoursAgo = hourlyPressure[3];
        const change = current - threeHoursAgo;
        
        if (change <= -3) return 'Falling fast';
        if (change < -1) return 'Falling';
        if (change > 3) return 'Rising fast';
        if (change > 1) return 'Rising';
        return 'Steady';
    },

    computeFogRisk(temp, dewPoint, cloudCover, windSpeed, visibility) {
        const tempDiff = temp - dewPoint;
        if (tempDiff <= 1.5 && cloudCover > 70 && windSpeed < 10 && visibility < 5000) {
            return 'High';
        }
        if (tempDiff <= 3 && cloudCover > 50 && visibility < 10000) {
            return 'Moderate';
        }
        return 'Low';
    },

    computeInsideOutsideIndex(data) {
        const { precip, precipProb, windSpeed, gusts, temp, visibility, uvIndex, isDaylight } = data;
        let score = 0;
        let factors = [];

        // Precipitation (negative for outside)
        if (precipProb > 80 || precip > 5) {
            score -= 3;
            factors.push('Heavy rain likely');
        } else if (precipProb > 50 || precip > 1) {
            score -= 1;
            factors.push('Light rain possible');
        } else {
            score += 1;
        }

        // Wind (negative for strong winds)
        if (gusts > 50) {
            score -= 2;
            factors.push('Strong gusts');
        } else if (windSpeed > 30) {
            score -= 1;
            factors.push('Windy conditions');
        } else {
            score += 1;
        }

        // Temperature comfort
        if (temp < 0 || temp > 35) {
            score -= 2;
            factors.push('Extreme temperature');
        } else if (temp < 5 || temp > 30) {
            score -= 1;
            factors.push('Uncomfortable temperature');
        } else if (temp >= 15 && temp <= 25) {
            score += 1;
            factors.push('Comfortable temperature');
        }

        // Visibility
        if (visibility < 1000) {
            score -= 2;
            factors.push('Poor visibility');
        } else if (visibility < 5000) {
            score -= 1;
        }

        // UV (daylight hours only)
        if (isDaylight && uvIndex > 7) {
            score -= 1;
            factors.push('High UV exposure');
        }

        // Daylight bonus
        if (isDaylight) {
            score += 1;
        }

        let recommendation, color;
        if (score >= 2) {
            recommendation = 'Favorable';
            color = 'text-green-600 dark:text-green-400';
        } else if (score >= 0) {
            recommendation = 'Mixed';
            color = 'text-yellow-600 dark:text-yellow-400';
        } else {
            recommendation = 'Inside recommended';
            color = 'text-red-600 dark:text-red-400';
        }

        return { recommendation, color, factors, score };
    },

    computeMarineRisk(waveHeight, windSpeed, gusts, visibility) {
        const risks = [];
        let maxLevel = 'Low';

        // Wave risk
        if (waveHeight > 3) {
            risks.push({ type: 'High seas', level: 'High' });
            maxLevel = 'High';
        } else if (waveHeight > 2) {
            risks.push({ type: 'Moderate seas', level: 'Moderate' });
            if (maxLevel === 'Low') maxLevel = 'Moderate';
        }

        // Wind/gust risk
        if (gusts > 40) {
            risks.push({ type: 'Strong gusts', level: 'High' });
            maxLevel = 'High';
        } else if (windSpeed > 25) {
            risks.push({ type: 'Strong winds', level: 'Moderate' });
            if (maxLevel === 'Low') maxLevel = 'Moderate';
        }

        // Visibility risk
        if (visibility < 1000) {
            risks.push({ type: 'Poor visibility', level: 'High' });
            maxLevel = 'High';
        } else if (visibility < 5000) {
            risks.push({ type: 'Reduced visibility', level: 'Moderate' });
            if (maxLevel === 'Low') maxLevel = 'Moderate';
        }

        if (risks.length === 0) {
            risks.push({ type: 'Calm conditions', level: 'Low' });
        }

        return { risks, maxLevel };
    },

    createWindRose(windDirections, windSpeeds) {
        const bins = Array(16).fill(0);
        const binSize = 22.5;
        
        windDirections.forEach((dir, i) => {
            if (dir !== null && windSpeeds[i] > 0) {
                const binIndex = Math.round(dir / binSize) % 16;
                bins[binIndex] += windSpeeds[i];
            }
        });

        const max = Math.max(...bins);
        return bins.map(value => max > 0 ? (value / max) * 100 : 0);
    },

    getCapeLevel(cape) {
        if (cape < 1000) return { level: 'Low', color: 'text-green-600 dark:text-green-400', description: 'Stable atmosphere' };
        if (cape < 2500) return { level: 'Moderate', color: 'text-yellow-600 dark:text-yellow-400', description: 'Some instability' };
        if (cape < 4000) return { level: 'High', color: 'text-orange-600 dark:text-orange-400', description: 'Very unstable' };
        return { level: 'Extreme', color: 'text-red-600 dark:text-red-400', description: 'Severe weather possible' };
    },

    getLiftedIndexLevel(li) {
        if (li > 2) return { level: 'Stable', color: 'text-green-600 dark:text-green-400', description: 'No thunderstorms expected' };
        if (li > 0) return { level: 'Marginal', color: 'text-yellow-600 dark:text-yellow-400', description: 'Isolated storms possible' };
        if (li > -3) return { level: 'Unstable', color: 'text-orange-600 dark:text-orange-400', description: 'Scattered storms likely' };
        return { level: 'Very unstable', color: 'text-red-600 dark:text-red-400', description: 'Severe storms possible' };
    },

    getVisibilityLevel(vis) {
        if (vis >= 10000) return { level: 'Excellent', color: 'text-green-600 dark:text-green-400', description: '10+ km' };
        if (vis >= 5000) return { level: 'Good', color: 'text-blue-600 dark:text-blue-400', description: '5-10 km' };
        if (vis >= 1000) return { level: 'Moderate', color: 'text-yellow-600 dark:text-yellow-400', description: '1-5 km' };
        if (vis >= 200) return { level: 'Poor', color: 'text-orange-600 dark:text-orange-400', description: '200m-1km' };
        return { level: 'Very poor', color: 'text-red-600 dark:text-red-400', description: '<200m' };
    },
    
    // Integrate render utilities from testing module
    renderValue: renderUtils.renderValue,
    renderValueWithMissing: renderUtils.renderValueWithMissing,
    renderArrayValue: renderUtils.renderArrayValue
};

// Utility functions
function getDeterministicDailyIndex(array, seed = 'quote-of-day') {
    const today = state.settings.utcMode 
        ? new Date().toISOString().split('T')[0]
        : new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    
    const hashInput = today + seed;
    let hash = 0;
    
    for (let i = 0; i < hashInput.length; i++) {
        const char = hashInput.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash) % array.length;
}

function getRandomQuote() {
    if (state.quotes.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * state.quotes.length);
    return state.quotes[randomIndex];
}

function loadSettings() {
    const saved = localStorage.getItem('dashboard-settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.settings = { ...state.settings, ...parsed };
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
}

function saveSettings() {
    try {
        localStorage.setItem('dashboard-settings', JSON.stringify(state.settings));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy text');
    });
}

function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg px-4 py-2 text-neutral-800 dark:text-neutral-100 z-50 transform translate-x-full transition-transform duration-300 shadow-lg';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
        toast.style.transform = 'translateX(full)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2000);
}

// Widget management
function getEnabledWidgets() {
    return Object.entries(widgets)
        .filter(([id]) => state.settings.enabledWidgets.includes(id))
        .map(([id, widget]) => ({ id, ...widget }))
        .sort((a, b) => a.order - b.order);
}

async function renderWidgets() {
    const container = document.getElementById('widget-grid');
    container.innerHTML = '';
    
    const enabledWidgets = getEnabledWidgets();
    
    for (const widget of enabledWidgets) {
        const widgetElement = document.createElement('div');
        widgetElement.className = `p-6 text-neutral-800 dark:text-neutral-100 shadow-sm ${widget.size || 'col-span-1'}`;
        widgetElement.id = `widget-${widget.id}`;
        
        try {
            if (widget.mount) {
                await widget.mount(widgetElement, { state, services, utils: { copyToClipboard, showToast, weatherUtils } });
            }
            
            if (widget.load) {
                await widget.load(state, services);
            }
            
            if (widget.render) {
                widget.render(state);
            }
        } catch (error) {
            console.error(`Error rendering widget ${widget.id}:`, error);
            widgetElement.innerHTML = `
                <div class="text-center text-red-600 dark:text-red-400">
                    <i class="ph ph-warning text-2xl mb-2"></i>
                    <p>Error loading ${widget.title}</p>
                </div>
            `;
        }
        
        container.appendChild(widgetElement);
    }
}

function renderSettings() {
    const modal = document.getElementById('settings-modal');
    const togglesContainer = document.getElementById('widget-toggles');
    
    // Update setting toggles
    document.getElementById('utc-toggle').checked = state.settings.utcMode;
    document.getElementById('theme-toggle').checked = state.settings.darkTheme;
    
    // Render widget toggles
    togglesContainer.innerHTML = '';
    Object.entries(widgets).forEach(([id, widget]) => {
        const isEnabled = state.settings.enabledWidgets.includes(id);
        const toggle = document.createElement('div');
        toggle.className = 'flex justify-between items-center';
        toggle.innerHTML = `
            <label class="text-sm font-medium flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
                <i class="ph ${widget.icon} text-lg"></i>
                ${widget.title}
            </label>
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer widget-toggle" data-widget="${id}" ${isEnabled ? 'checked' : ''}>
                <div class="w-11 h-6 bg-neutral-300 dark:bg-neutral-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
        `;
        togglesContainer.appendChild(toggle);
    });
    
    // Show/hide weather settings based on weather widget being enabled
    const weatherSection = document.getElementById('weather-settings-section');
    const weatherWidgetIds = ['advanced-weather','current-weather','hourly-weather','daily-weather','air-quality-weather','marine-weather','weather-history'];
    const isWeatherEnabled = weatherWidgetIds.some(id => state.settings.enabledWidgets.includes(id));
    weatherSection.style.display = isWeatherEnabled ? 'block' : 'none';
    
    if (isWeatherEnabled) {
        // Initialize weather settings with proper defaults
        if (!state.settings.widgets) state.settings.widgets = {};
        if (!state.settings.widgets.weather) {
            state.settings.widgets.weather = {
                units: 'metric',
                autoRefresh: false,
                refreshInterval: 15,
                advancedMode: false,
                educationalTips: true,
                sailingMode: true,
                enabledSections: {
                    command: true,
                    atmosphere: true,
                    precip: true,
                    wind: true,
                    sun: true,
                    environment: true,
                    advanced: true,
                    now: true,
                    hourly: true,
                    daily: true,
                    airQuality: true,
                    marine: true,
                    history: true
                },
                alertThresholds: {
                    rainProbHigh: 0.8,
                    gustStrongKmh: 50,
                    pressureDropRapid_hPa_3h: 3,
                    uvHigh: 6,
                    waveHighM: 2.5
                }
            };
        }
        
        const weatherSettings = state.settings.widgets.weather;
        document.getElementById('weather-units-select').value = weatherSettings.units || 'metric';
        document.getElementById('weather-auto-refresh').checked = weatherSettings.autoRefresh || false;
        document.getElementById('weather-refresh-interval').value = weatherSettings.refreshInterval || 15;
    }
}

function updateTheme() {
    if (state.settings.darkTheme) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// Event handlers
function setupEventListeners() {
    // Settings modal
    document.getElementById('settings-btn').addEventListener('click', () => {
        renderSettings();
        document.getElementById('settings-modal').classList.remove('hidden');
        document.getElementById('settings-modal').classList.add('flex');
    });
    
    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('hidden');
        document.getElementById('settings-modal').classList.remove('flex');
    });
    
    // Settings toggles
    document.getElementById('utc-toggle').addEventListener('change', (e) => {
        state.settings.utcMode = e.target.checked;
        saveSettings();
        // Reload quote for new timezone
        if (state.quotes.length > 0) {
            const dailyIndex = getDeterministicDailyIndex(state.quotes);
            state.currentQuote = state.quotes[dailyIndex];
            renderWidgets();
        }
    });
    
    document.getElementById('theme-toggle').addEventListener('change', (e) => {
        state.settings.darkTheme = e.target.checked;
        saveSettings();
        updateTheme();
    });
    
    // Widget toggles (delegated event handling)
    document.getElementById('widget-toggles').addEventListener('change', (e) => {
        if (e.target.classList.contains('widget-toggle')) {
            const widgetId = e.target.dataset.widget;
            const isEnabled = e.target.checked;
            
            if (isEnabled && !state.settings.enabledWidgets.includes(widgetId)) {
                state.settings.enabledWidgets.push(widgetId);
            } else if (!isEnabled) {
                state.settings.enabledWidgets = state.settings.enabledWidgets.filter(id => id !== widgetId);
            }
            
            // Show/hide weather settings when weather widget is toggled
            const weatherSection = document.getElementById('weather-settings-section');
            const weatherWidgetIds = ['advanced-weather','current-weather','hourly-weather','daily-weather','air-quality-weather','marine-weather','weather-history'];
            if (weatherWidgetIds.includes(widgetId)) {
                const anyEnabled = weatherWidgetIds.some(id => state.settings.enabledWidgets.includes(id));
                weatherSection.style.display = anyEnabled ? 'block' : 'none';
            }
            
            saveSettings();
            renderWidgets();
        }
    });
    
    // Weather settings
    document.getElementById('weather-units-select').addEventListener('change', (e) => {
        if (!state.settings.widgets) state.settings.widgets = {};
        if (!state.settings.widgets.weather) state.settings.widgets.weather = {};
        
        state.settings.widgets.weather.units = e.target.value;
        saveSettings();
        renderWidgets(); // Re-render to apply new units
    });
    
    document.getElementById('weather-auto-refresh').addEventListener('change', (e) => {
        if (!state.settings.widgets) state.settings.widgets = {};
        if (!state.settings.widgets.weather) state.settings.widgets.weather = {};
        
        state.settings.widgets.weather.autoRefresh = e.target.checked;
        saveSettings();
        renderWidgets(); // Re-render to apply auto-refresh setting
    });
    
    document.getElementById('weather-refresh-interval').addEventListener('change', (e) => {
        if (!state.settings.widgets) state.settings.widgets = {};
        if (!state.settings.widgets.weather) state.settings.widgets.weather = {};
        
        const interval = parseInt(e.target.value);
        if (interval >= 5 && interval <= 60) {
            state.settings.widgets.weather.refreshInterval = interval;
            saveSettings();
            renderWidgets(); // Re-render to apply new refresh interval
        }
    });
    
    // Close modal when clicking backdrop
    document.getElementById('settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') {
            document.getElementById('settings-modal').classList.add('hidden');
            document.getElementById('settings-modal').classList.remove('flex');
        }
    });
}

// Application initialization
async function init() {
    console.log('Initializing dashboard...');
    
    // Load settings
    loadSettings();
    updateTheme();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize services
    state.services = services;
    
    // Load quotes
    try {
        state.quotes = await services.quotes.getAll();
        console.log(`Loaded ${state.quotes.length} quotes`);
        
        if (state.quotes.length > 0) {
            // Set daily quote
            const dailyIndex = getDeterministicDailyIndex(state.quotes);
            state.currentQuote = state.quotes[dailyIndex];
            console.log(`Daily quote index: ${dailyIndex}`);
        }
    } catch (error) {
        console.error('Failed to load quotes:', error);
    }
    
    // Render widgets
    await renderWidgets();
    
    console.log('Dashboard initialized successfully');
}

// Start the application
document.addEventListener('DOMContentLoaded', init);

// Export for debugging
window.dashboardState = state;

