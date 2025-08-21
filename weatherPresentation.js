// Weather Presentation Utilities
// Centralized formatting, unit conversion, and state-triad rendering

export const weatherPresentation = {
    // Unit conversion utilities
    convertWithUnits(value, fromUnit, toUnit, type = 'temperature') {
        if (value === null || value === undefined) return value;
        
        // Temperature conversion
        if (type === 'temperature') {
            if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
                return (value * 9/5) + 32;
            } else if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
                return (value - 32) * 5/9;
            }
            return value;
        }
        
        // Wind speed conversion
        if (type === 'wind') {
            if (fromUnit === 'kmh' && toUnit === 'mph') {
                return value * 0.621371;
            } else if (fromUnit === 'mph' && toUnit === 'kmh') {
                return value / 0.621371;
            }
            return value;
        }
        
        // Pressure conversion
        if (type === 'pressure') {
            if (fromUnit === 'hPa' && toUnit === 'inHg') {
                return value * 0.02953;
            } else if (fromUnit === 'inHg' && toUnit === 'hPa') {
                return value / 0.02953;
            }
            return value;
        }
        
        return value;
    },

    // Safe value rendering with unit formatting
    formatWithUnits(value, unit = '', options = {}) {
        const { precision = 1, fallback = '—', prefix = '', suffix = '' } = options;
        
        if (value === null || value === undefined) {
            return fallback;
        }
        
        if (typeof value === 'number') {
            const formatted = precision === 0 ? Math.round(value) : value.toFixed(precision);
            return `${prefix}${formatted}${unit}${suffix}`;
        }
        
        return `${prefix}${value}${unit}${suffix}`;
    },

    // State triad rendering (null/missing/zero handling)
    renderStateTriad(data, key, options = {}) {
        const { 
            index = 0, 
            unit = '', 
            precision = 1, 
            fallback = '—',
            showZero = true,
            prefix = '',
            suffix = ''
        } = options;

        if (!data || !Array.isArray(data[key])) {
            return `<span class="text-gray-400">${fallback}</span>`;
        }

        const value = data[key][index];
        
        if (value === null || value === undefined) {
            return `<span class="text-gray-400">${fallback}</span>`;
        }

        if (value === 0 && !showZero) {
            return `<span class="text-gray-500">0${unit}</span>`;
        }

        const formatted = this.formatWithUnits(value, unit, { precision, prefix, suffix });
        return `<span>${formatted}</span>`;
    },

    // Safe array value rendering
    renderArrayValue(array, index, unit = '', fallback = '—') {
        if (!Array.isArray(array) || index >= array.length || index < 0) {
            return `<span class="text-gray-400">${fallback}</span>`;
        }
        
        const value = array[index];
        if (value === null || value === undefined) {
            return `<span class="text-gray-400">${fallback}</span>`;
        }
        
        return `<span>${this.formatWithUnits(value, unit)}</span>`;
    },

    // Chart data rendering with fallback
    renderChart(data, minPoints = 2, fallbackValue = null, fallbackUnit = '') {
        if (!Array.isArray(data) || data.length < minPoints) {
            if (fallbackValue !== null) {
                return `<div class="text-center py-4 text-gray-400">${this.formatWithUnits(fallbackValue, fallbackUnit)}</div>`;
            }
            return `<div class="text-center py-4 text-gray-400">Insufficient data</div>`;
        }
        
        // Return data for chart rendering
        return data.filter(val => val !== null && val !== undefined);
    },

    // Loading skeleton
    renderLoadingSkeleton(height = 'h-16') {
        return `
            <div class="animate-pulse">
                <div class="bg-gray-600 bg-opacity-30 rounded ${height}"></div>
            </div>
        `;
    },

    // Not available message
    renderNotAvailable(message = 'Not available', icon = 'ph-warning') {
        return `
            <div class="text-center py-8 text-gray-400">
                <i class="ph ${icon} text-2xl mb-2"></i>
                <p>${message}</p>
            </div>
        `;
    },

    // No data in range message
    renderNoDataInRange(message = 'No data in range') {
        return `
            <div class="text-center py-4 text-gray-400">
                <i class="ph ph-calendar-x text-xl mb-1"></i>
                <p class="text-sm">${message}</p>
            </div>
        `;
    },

    // Unit label helpers
    getTemperatureUnit(units = 'metric') {
        return units === 'metric' ? '°C' : '°F';
    },

    getSpeedUnit(units = 'metric') {
        return units === 'metric' ? ' km/h' : ' mph';
    },

    getPressureUnit(units = 'metric') {
        return units === 'metric' ? ' hPa' : ' inHg';
    },

    // Time formatting utilities
    formatTime(dateString, timezone = 'Europe/London') {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit', 
            timeZone: timezone
        });
    },

    formatDate(dateString, timezone = 'Europe/London') {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            timeZone: timezone
        });
    }
};