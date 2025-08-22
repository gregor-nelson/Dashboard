// Weather Data Adapter
// Transforms raw API data into view-ready structures

import { weatherPresentation } from './weatherPresentation.js';

export class WeatherDataAdapter {
    constructor(weatherUtils) {
        this.weatherUtils = weatherUtils;
    }

    // Helper function to get current hour index
    getCurrentHourIndex(hourlyTime, timezone = 'Europe/London') {
        if (!hourlyTime || !hourlyTime.length) return 0;
        
        const nowUTC = new Date();
        const nowLocalISO = nowUTC.toLocaleString('sv-SE', { timeZone: timezone }).slice(0, 19);
        
        // Convert current time to comparable format
        const now = new Date(nowLocalISO);
        const flooredMinutes = Math.floor(now.getMinutes() / 60) * 60; // Floor to nearest hour
        const flooredNow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), flooredMinutes);
        
        // Find matching time in hourly array
        for (let i = 0; i < hourlyTime.length; i++) {
            const seriesTime = new Date(hourlyTime[i]);
            if (seriesTime >= flooredNow) {
                return i;
            }
        }
        return 0;
    }

    // Data alignment verification
    verifyAlignment(hourly, keys) {
        if (!hourly || !hourly.time) {
            return { valid: false, issues: ['No hourly.time array'], missingKeys: keys };
        }
        
        const timeLength = hourly.time.length;
        const issues = [];
        const missingKeys = [];
        
        keys.forEach(key => {
            if (!hourly[key]) {
                missingKeys.push(key);
            } else if (Array.isArray(hourly[key]) && hourly[key].length !== timeLength) {
                issues.push(`Data length mismatch: ${key} (${hourly[key].length} vs ${timeLength})`);
                if (window.__WX_DIAG__?.isEnabled) {
                    console.warn(`⚠️ ${key} length mismatch:`, hourly[key].length, 'vs', timeLength);
                }
            }
        });
        
        return {
            valid: issues.length === 0 && missingKeys.length === 0,
            issues,
            missingKeys,
            timeLength
        };
    }

    // Pick best available pressure series
    pickPressureSeries(hourly) {
        if (hourly.surface_pressure && Array.isArray(hourly.surface_pressure)) {
            return {
                key: 'surface_pressure',
                data: hourly.surface_pressure,
                label: 'Surface Pressure',
                unit: 'hPa'
            };
        } else if (hourly.pressure_msl && Array.isArray(hourly.pressure_msl)) {
            return {
                key: 'pressure_msl',
                data: hourly.pressure_msl,
                label: 'Sea Level Pressure',
                unit: 'hPa'
            };
        }
        
        return {
            key: null,
            data: [],
            label: 'Not available (pressure)',
            unit: 'hPa'
        };
    }

    // Generate command center data structure
    adaptCommandData(weatherData, marineData, units, thresholds, timezone) {
        if (!weatherData?.current || !weatherData?.hourly) {
            return { error: 'Weather data unavailable' };
        }

        const current = weatherData.current;
        const hourly = weatherData.hourly;
        const daily = weatherData.daily;

        // Verify critical data alignment
        const criticalKeys = [
            'precipitation_probability', 'visibility', 'uv_index', 
            'wind_speed_10m', 'wind_gusts_10m', 'temperature_2m'
        ];
        const alignment = this.verifyAlignment(hourly, criticalKeys);
        
        // Inside/Outside Index with proper null handling
        const currentHourIndex = this.getCurrentHourIndex(hourly.time);
        const indexData = {
            precip: current.precipitation ?? 0,
            precipProb: hourly.precipitation_probability?.[currentHourIndex] ?? 0,
            windSpeed: current.wind_speed_10m ?? 0,
            gusts: current.wind_gusts_10m ?? 0,
            temp: current.temperature_2m,
            visibility: hourly.visibility?.[currentHourIndex] ?? 10000,
            uvIndex: hourly.uv_index?.[currentHourIndex] ?? 0,
            isDaylight: current.is_day === 1
        };
        
        // Compute inside/outside index
        let insideOutside;
        if (indexData.temp !== null && indexData.temp !== undefined) {
            insideOutside = this.weatherUtils.computeInsideOutsideIndex(indexData);
        } else {
            insideOutside = {
                recommendation: 'Insufficient data',
                color: 'text-neutral-500 dark:text-neutral-400',
                factors: ['Temperature data missing'],
                score: 0
            };
        }

        // Marine risk assessment
        const marineRisk = this.weatherUtils.computeMarineRisk(
            marineData?.current?.wave_height ?? 0,
            current.wind_speed_10m ?? 0,
            current.wind_gusts_10m ?? 0,
            hourly.visibility?.[currentHourIndex] ?? 10000
        );

        // Generate alerts
        const alerts = [];
        const precipProb = hourly.precipitation_probability?.[currentHourIndex];
        const windGusts = current.wind_gusts_10m;
        const uvIndex = hourly.uv_index?.[currentHourIndex];
        
        if (precipProb !== null && precipProb !== undefined && precipProb >= thresholds.rainProbHigh * 100) {
            alerts.push({ 
                icon: 'ph-cloud-rain', 
                text: `${Math.round(precipProb)}% rain likely`, 
                color: 'text-blue-600 dark:text-blue-400' 
            });
        }
        if (windGusts !== null && windGusts !== undefined && windGusts >= thresholds.gustStrongKmh) {
            const gustStr = weatherPresentation.formatWithUnits(windGusts, units === 'metric' ? ' km/h' : ' mph');
            alerts.push({ 
                icon: 'ph-wind', 
                text: `Strong gusts ${gustStr}`, 
                color: 'text-orange-600 dark:text-orange-400' 
            });
        }
        if (uvIndex !== null && uvIndex !== undefined && uvIndex >= thresholds.uvHigh && current.is_day) {
            alerts.push({ 
                icon: 'ph-sun', 
                text: `High UV ${Math.round(uvIndex)}`, 
                color: 'text-yellow-600 dark:text-yellow-400' 
            });
        }

        // Generate opportunities
        const opportunities = [];
        if (daily?.daylight_duration?.[0]) {
            const daylightHours = Math.round(daily.daylight_duration[0] / 3600);
            opportunities.push({ 
                icon: 'ph-sun-dim', 
                text: `${daylightHours}h daylight today` 
            });
        }

        // Current conditions summary
        const currentConditions = {
            temperature: weatherPresentation.formatWithUnits(current.temperature_2m, weatherPresentation.getTemperatureUnit(units)),
            feelsLike: weatherPresentation.formatWithUnits(current.apparent_temperature, weatherPresentation.getTemperatureUnit(units)),
            humidity: weatherPresentation.formatWithUnits(current.relative_humidity_2m, '%', { precision: 0 }),
            windSpeed: weatherPresentation.formatWithUnits(current.wind_speed_10m, weatherPresentation.getSpeedUnit(units), { precision: 0 }),
            windDirection: current.wind_direction_10m ? this.weatherUtils.getWindDirection(current.wind_direction_10m) : '—',
            pressure: weatherPresentation.formatWithUnits(current.pressure_msl, weatherPresentation.getPressureUnit(units)),
            weatherCode: current.weather_code,
            isDay: current.is_day === 1
        };

        return {
            valid: true,
            alignment,
            insideOutside,
            marineRisk,
            alerts,
            opportunities,
            currentConditions,
            rawData: { current, hourly, daily } // For diagnostics
        };
    }

    // Generate atmosphere tab data structure
    adaptAtmosphereData(weatherData, units, timezone) {
        if (!weatherData?.current || !weatherData?.hourly) {
            return { error: 'Weather data unavailable' };
        }

        const current = weatherData.current;
        const hourly = weatherData.hourly;
        const currentHourIndex = this.getCurrentHourIndex(hourly.time, timezone);
        
        // Temperature data
        const temperature = {
            current: weatherPresentation.formatWithUnits(current.temperature_2m, weatherPresentation.getTemperatureUnit(units)),
            feelsLike: weatherPresentation.formatWithUnits(current.apparent_temperature, weatherPresentation.getTemperatureUnit(units)),
            dewPoint: weatherPresentation.formatWithUnits(hourly.dew_point_2m?.[currentHourIndex], weatherPresentation.getTemperatureUnit(units)),
            humidity: weatherPresentation.formatWithUnits(current.relative_humidity_2m, '%', { precision: 0 })
        };

        // Pressure data
        const pressureSeries = this.pickPressureSeries(hourly);
        const pressure = {
            current: weatherPresentation.formatWithUnits(current.pressure_msl, weatherPresentation.getPressureUnit(units)),
            trend: hourly.surface_pressure?.length >= 4 ? 
                this.weatherUtils.computePressureTrend(hourly.surface_pressure.slice(0, 4)) : 'Unknown',
            series: pressureSeries
        };

        // Cloud data
        const clouds = {
            total: weatherPresentation.formatWithUnits(current.cloud_cover, '%', { precision: 0 }),
            low: weatherPresentation.formatWithUnits(hourly.cloud_cover_low?.[currentHourIndex], '%', { precision: 0 }),
            mid: weatherPresentation.formatWithUnits(hourly.cloud_cover_mid?.[currentHourIndex], '%', { precision: 0 }),
            high: weatherPresentation.formatWithUnits(hourly.cloud_cover_high?.[currentHourIndex], '%', { precision: 0 })
        };

        // Visibility and fog data
        const visibility = {
            current: hourly.visibility?.[currentHourIndex] ? 
                this.weatherUtils.getVisibilityLevel(hourly.visibility[currentHourIndex]) : 
                { level: 'Unknown', color: 'text-neutral-500 dark:text-neutral-400', description: 'Not available' },
            fogRisk: hourly.dew_point_2m?.[currentHourIndex] && current.temperature_2m ? 
                this.weatherUtils.computeFogRisk(
                    current.temperature_2m,
                    hourly.dew_point_2m[currentHourIndex],
                    current.cloud_cover,
                    current.wind_speed_10m,
                    hourly.visibility?.[currentHourIndex] ?? 10000
                ) : 'Unknown'
        };

        return {
            valid: true,
            temperature,
            pressure,
            clouds,
            visibility,
            rawData: { current, hourly } // For diagnostics
        };
    }

    // Generate precipitation tab data structure  
    adaptPrecipData(weatherData, nowcastData, units, timezone) {
        if (!weatherData?.current || !weatherData?.hourly) {
            return { error: 'Weather data unavailable' };
        }

        const current = weatherData.current;
        const hourly = weatherData.hourly;

        // Current precipitation
        const currentPrecip = {
            total: weatherPresentation.formatWithUnits(current.precipitation, ' mm', { precision: 1 }),
            rain: weatherPresentation.formatWithUnits(current.rain, ' mm', { precision: 1 }),
            snow: weatherPresentation.formatWithUnits(current.snowfall, ' mm', { precision: 1 }),
            probability: weatherPresentation.formatWithUnits(hourly.precipitation_probability?.[currentHourIndex], '%', { precision: 0 })
        };

        // Next 2 hours minutely data
        const next2Hours = nowcastData?.minutely_15 ? 
            this.renderNext2HoursMinutely(nowcastData.minutely_15, timezone) : null;

        // Next 12 hours rain probability
        const rainProb12h = this.renderHourlyRainProbNext12h(hourly, timezone);

        // One hour totals
        const nowHourIndex = 0; // Current hour
        const hourTotals = this.renderOneHourTotals(hourly, nowHourIndex, timezone);

        return {
            valid: true,
            currentPrecip,
            next2Hours,
            rainProb12h,
            hourTotals,
            rawData: { current, hourly, minutely: nowcastData?.minutely_15 }
        };
    }

    // Helper methods for precipitation processing
    renderNext2HoursMinutely(minutely, timezone) {
        if (!minutely?.time || minutely.time.length === 0) return null;
        
        const periods = [];
        const maxPeriods = Math.min(8, minutely.time.length); // 8 x 15min = 2 hours
        
        for (let i = 0; i < maxPeriods; i++) {
            const time = weatherPresentation.formatTime(minutely.time[i], timezone);
            const precip = minutely.precipitation?.[i] ?? 0;
            const rain = minutely.rain?.[i] ?? 0;
            const snow = minutely.snowfall?.[i] ?? 0;
            const weatherCode = minutely.weather_code?.[i];
            
            periods.push({
                time,
                precip: weatherPresentation.formatWithUnits(precip, ' mm', { precision: 1 }),
                rain: weatherPresentation.formatWithUnits(rain, ' mm', { precision: 1 }),
                snow: weatherPresentation.formatWithUnits(snow, ' mm', { precision: 1 }),
                weatherInfo: weatherCode ? this.weatherUtils.getWeatherInfo(weatherCode) : null
            });
        }
        
        return periods;
    }

    renderHourlyRainProbNext12h(hourly, timezone) {
        if (!hourly?.time || !hourly.precipitation_probability) return [];
        
        const hours = [];
        const maxHours = Math.min(12, hourly.time.length);
        
        for (let i = 0; i < maxHours; i++) {
            const time = weatherPresentation.formatTime(hourly.time[i], timezone);
            const prob = hourly.precipitation_probability[i];
            const precip = hourly.precipitation?.[i] ?? 0;
            
            hours.push({
                time,
                probability: weatherPresentation.formatWithUnits(prob, '%', { precision: 0 }),
                amount: weatherPresentation.formatWithUnits(precip, ' mm', { precision: 1 })
            });
        }
        
        return hours;
    }

    renderOneHourTotals(hourly, hourIndex, timezone) {
        if (!hourly?.time || hourIndex >= hourly.time.length) return null;
        
        const time = weatherPresentation.formatTime(hourly.time[hourIndex], timezone);
        return {
            time,
            precipitation: weatherPresentation.formatWithUnits(hourly.precipitation?.[hourIndex], ' mm', { precision: 1 }),
            rain: weatherPresentation.formatWithUnits(hourly.rain?.[hourIndex], ' mm', { precision: 1 }),
            snow: weatherPresentation.formatWithUnits(hourly.snowfall?.[hourIndex], ' mm', { precision: 1 }),
            probability: weatherPresentation.formatWithUnits(hourly.precipitation_probability?.[hourIndex], '%', { precision: 0 })
        };
    }
}