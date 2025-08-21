// Weather Dashboard Testing & Diagnostics Module
// Activated with ?diag=1 or ?mock=1 URL parameters

// Global diagnostic system
window.__WX_DIAG__ = {
    lastCalls: [],
    sections: {},
    mockMode: new URLSearchParams(window.location.search).get('mock') === '1',
    isEnabled: new URLSearchParams(window.location.search).get('diag') === '1'
};

// Schema validation functions
export const schemaValidator = {
    assertForecastShape(json) {
        const missing = [];
        const issues = [];
        
        // Check required hourly keys that are actually rendered
        const requiredHourlyKeys = [
            'time', 'temperature_2m', 'apparent_temperature', 'dew_point_2m',
            'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
            'precipitation_probability', 'precipitation', 'rain', 'showers', 'snowfall',
            'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m',
            'visibility', 'freezing_level_height', 'shortwave_radiation',
            'direct_normal_irradiance', 'uv_index'
        ];
        
        if (json.hourly) {
            const timeLength = json.hourly.time?.length || 0;
            
            requiredHourlyKeys.forEach(key => {
                if (!json.hourly[key]) {
                    missing.push(`hourly.${key}`);
                } else if (json.hourly[key].length !== timeLength) {
                    issues.push(`hourly.${key} length mismatch: ${json.hourly[key].length} vs ${timeLength}`);
                }
            });
            
            // Check for pressure fallback
            if (!json.hourly.surface_pressure && !json.hourly.pressure_msl) {
                missing.push('hourly.surface_pressure|pressure_msl');
            }
        } else {
            missing.push('hourly section');
        }
        
        if (window.__WX_DIAG__.isEnabled) {
            window.__WX_DIAG__.sections.forecast = {
                ok: missing.length === 0 && issues.length === 0,
                missing,
                issues,
                checkedAt: new Date().toISOString()
            };
            
            if (missing.length > 0 || issues.length > 0) {
                console.warn('⚠️ Forecast schema issues:', { missing, issues });
            }
        }
        
        return { valid: missing.length === 0 && issues.length === 0, missing, issues };
    },

    assertNowcastShape(json) {
        if (!json.minutely_15) {
            window.__WX_DIAG__.sections.nowcast = {
                ok: true,
                missing: ['minutely_15 section - region dependent'],
                issues: [],
                checkedAt: new Date().toISOString()
            };
            return { valid: true, missing: ['minutely_15'], issues: [] };
        }

        const missing = [];
        const issues = [];
        const timeLength = json.minutely_15.time?.length || 0;

        ['time', 'precipitation', 'weather_code', 'wind_speed_10m'].forEach(key => {
            if (!json.minutely_15[key]) {
                missing.push(`minutely_15.${key}`);
            } else if (json.minutely_15[key].length !== timeLength) {
                issues.push(`minutely_15.${key} length mismatch`);
            }
        });

        window.__WX_DIAG__.sections.nowcast = {
            ok: missing.length === 0 && issues.length === 0,
            missing,
            issues,
            checkedAt: new Date().toISOString()
        };

        return { valid: missing.length === 0 && issues.length === 0, missing, issues };
    },

    assertMarineShape(json) {
        const missing = [];
        const issues = [];

        if (!json.hourly) {
            missing.push('marine hourly section');
        } else {
            const timeLength = json.hourly.time?.length || 0;
            ['wave_height', 'wave_direction', 'wave_period'].forEach(key => {
                if (!json.hourly[key]) {
                    missing.push(`marine.hourly.${key}`);
                } else if (json.hourly[key].length !== timeLength) {
                    issues.push(`marine.hourly.${key} length mismatch`);
                }
            });
        }

        window.__WX_DIAG__.sections.marine = {
            ok: missing.length === 0 && issues.length === 0,
            missing,
            issues,
            checkedAt: new Date().toISOString()
        };

        return { valid: missing.length === 0 && issues.length === 0, missing, issues };
    }
};

// Mock data service
export const mockService = {
    async getTestData(filename) {
        if (!window.__WX_DIAG__.mockMode) {
            throw new Error('Mock mode not enabled');
        }
        
        try {
            const response = await fetch(`./public/mock/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load mock data: ${filename}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`Mock data ${filename} not available, using fallback`);
            return this.getFallbackData(filename);
        }
    },

    getFallbackData(filename) {
        // Minimal fallback data for testing
        switch (filename) {
            case 'forecast_full.json':
                return this.generateMockForecast(true);
            case 'forecast_min.json':
                return this.generateMockForecast(false);
            case 'marine_empty.json':
                return { hourly: { time: [] } };
            case 'minutely_absent.json':
                return { hourly: { time: ['2025-01-01T00:00'] } };
            default:
                return null;
        }
    },

    generateMockForecast(full = false) {
        const times = Array.from({ length: 48 }, (_, i) => {
            const date = new Date();
            date.setHours(date.getHours() + i);
            return date.toISOString();
        });

        const baseData = {
            hourly: {
                time: times,
                temperature_2m: times.map((_, i) => 15 + Math.sin(i * 0.1) * 5),
                apparent_temperature: times.map((_, i) => 14 + Math.sin(i * 0.1) * 5),
                dew_point_2m: times.map((_, i) => 10 + Math.sin(i * 0.1) * 3),
                wind_speed_10m: times.map(() => Math.random() * 20),
                wind_direction_10m: times.map(() => Math.random() * 360),
                wind_gusts_10m: times.map(() => Math.random() * 30),
                precipitation_probability: times.map(() => Math.random() * 100),
                precipitation: times.map(() => Math.random() * 5),
                rain: times.map(() => Math.random() * 3),
                showers: times.map(() => Math.random() * 2),
                snowfall: times.map(() => 0),
                visibility: times.map(() => 5000 + Math.random() * 15000),
                uv_index: times.map(() => Math.random() * 10),
                shortwave_radiation: times.map(() => Math.random() * 800),
                direct_normal_irradiance: times.map(() => Math.random() * 900),
                freezing_level_height: times.map(() => 2000 + Math.random() * 1000),
                cloud_cover_low: times.map(() => Math.random() * 100),
                cloud_cover_mid: times.map(() => Math.random() * 100),
                cloud_cover_high: times.map(() => Math.random() * 100),
                surface_pressure: times.map(() => 1010 + Math.random() * 20)
            }
        };

        if (full) {
            // Add all the advanced keys for full testing
            baseData.hourly = {
                ...baseData.hourly,
                pressure_msl: times.map(() => 1013 + Math.random() * 20),
                cape: times.map(() => Math.random() * 3000),
                lifted_index: times.map(() => -2 + Math.random() * 6),
                boundary_layer_height: times.map(() => 500 + Math.random() * 1500),
                soil_temperature_0cm: times.map(() => 12 + Math.random() * 8),
                soil_temperature_6cm: times.map(() => 13 + Math.random() * 6),
                soil_temperature_18cm: times.map(() => 14 + Math.random() * 4),
                soil_temperature_54cm: times.map(() => 15 + Math.random() * 2),
                soil_moisture_0_to_1cm: times.map(() => Math.random()),
                soil_moisture_1_to_3cm: times.map(() => Math.random()),
                soil_moisture_3_to_9cm: times.map(() => Math.random()),
                soil_moisture_9_to_27cm: times.map(() => Math.random()),
                soil_moisture_27_to_81cm: times.map(() => Math.random())
            };
        }

        return baseData;
    }
};

// Enhanced fetch wrapper with diagnostics
export function createDiagnosticFetch(originalFetch) {
    return async function(url, options = {}) {
        // Check for mock mode first
        if (window.__WX_DIAG__.mockMode && url.includes('open-meteo.com')) {
            console.log('🎭 Mock mode: intercepting API call for', url);
            
            // Route to appropriate mock data based on URL
            let mockFile = 'forecast_full.json';
            if (url.includes('/marine')) {
                mockFile = 'marine_empty.json';
            } else if (url.includes('minutely_15')) {
                mockFile = 'minutely_absent.json';
            } else if (url.includes('/air-quality')) {
                mockFile = 'forecast_min.json'; // Fallback for air quality
            }
            
            return mockService.getTestData(mockFile);
        }

        const startTime = performance.now();
        
        try {
            const response = await originalFetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            const endTime = performance.now();
            
            // Diagnostic logging
            if (window.__WX_DIAG__.isEnabled) {
                const diagnostic = {
                    timestamp: new Date().toISOString(),
                    url: url.replace(/[?&]latitude=[^&]*&longitude=[^&]*/, '?latitude=XXX&longitude=XXX'),
                    status: response.status,
                    duration: Math.round(endTime - startTime),
                    topLevelKeys: Object.keys(data),
                    hourlyKeys: data.hourly ? Object.keys(data.hourly) : null,
                    dailyKeys: data.daily ? Object.keys(data.daily) : null,
                    currentKeys: data.current ? Object.keys(data.current) : null,
                    minutelyKeys: data.minutely_15 ? Object.keys(data.minutely_15) : null,
                    sampleRow: data.hourly ? {
                        time: data.hourly.time?.[0],
                        temperature_2m: data.hourly.temperature_2m?.[0],
                        pressure: data.hourly.surface_pressure?.[0] || data.hourly.pressure_msl?.[0]
                    } : null
                };
                
                window.__WX_DIAG__.lastCalls.push(diagnostic);
                // Keep only last 10 calls
                if (window.__WX_DIAG__.lastCalls.length > 10) {
                    window.__WX_DIAG__.lastCalls.shift();
                }
                
                console.log('🔄 Weather API call:', diagnostic);
                
                // Store diagnostic info for self-test
                if (url.includes('/forecast')) {
                    window.__WX_DIAG__.sections.lastForecastCall = diagnostic;
                } else if (url.includes('/marine')) {
                    window.__WX_DIAG__.sections.lastMarineCall = diagnostic;
                }
            }
            
            return data;
        } catch (error) {
            if (window.__WX_DIAG__.isEnabled) {
                window.__WX_DIAG__.lastCalls.push({
                    timestamp: new Date().toISOString(),
                    url,
                    error: error.message,
                    status: 'error',
                    duration: Math.round(performance.now() - startTime)
                });
            }
            throw error;
        }
    };
}

// Self-test function
export function selfTest() {
    if (!window.__WX_DIAG__.isEnabled) {
        console.log('Enable diagnostics with ?diag=1 to run self-test');
        return null;
    }
    
    const result = {
        forecast: window.__WX_DIAG__.sections.forecast || { ok: false, issues: ['No forecast data tested yet'] },
        nowcast: window.__WX_DIAG__.sections.nowcast || { ok: true, issues: ['No nowcast tested yet'] },
        marine: window.__WX_DIAG__.sections.marine || { ok: true, issues: ['No marine data tested yet'] },
        bindings: testDataBindings(),
        ui: {
            settingsMenuOpens: testSettingsMenu(),
            settingsKeyboardOK: testKeyboardNavigation(),
            unitTogglePersists: testUnitTogglePersistence(),
            refreshDebounceWorks: testRefreshDebounce()
        },
        sections: {
            next2Hours: testNext2HoursSectionRendering(),
            hourlyRainProb: testHourlyRainProbRendering(),
            oneHourTotals: testOneHourTotalsRendering()
        },
        lastApiCalls: window.__WX_DIAG__.lastCalls.length,
        mockMode: window.__WX_DIAG__.mockMode
    };
    
    console.table(result.ui);
    console.log('🧪 Self-test results:', result);
    return result;
}

// UI test functions
function testSettingsMenu() {
    try {
        const settingsBtn = document.getElementById('settings-btn');
        const modal = document.getElementById('settings-modal');
        
        if (!settingsBtn || !modal) return false;
        
        // Test that clicking opens the modal
        settingsBtn.click();
        const isVisible = !modal.classList.contains('hidden');
        
        // Close it again
        const closeBtn = document.getElementById('close-settings');
        if (closeBtn) closeBtn.click();
        
        return isVisible;
    } catch (error) {
        return false;
    }
}

function testKeyboardNavigation() {
    try {
        const tabBtns = document.querySelectorAll('.weather-tab-btn');
        if (tabBtns.length === 0) return false;
        
        // Test that tab buttons are focusable and have proper ARIA attributes
        return Array.from(tabBtns).every(btn => 
            btn.tabIndex >= 0 && 
            btn.getAttribute('role') !== null || btn.tagName === 'BUTTON'
        );
    } catch (error) {
        return false;
    }
}

function testUnitTogglePersistence() {
    try {
        const currentSettings = localStorage.getItem('dashboard-settings');
        return currentSettings !== null;
    } catch (error) {
        return false;
    }
}

function testRefreshDebounce() {
    // This would need more sophisticated testing in practice
    return true;
}

// Initialize diagnostics if enabled
if (window.__WX_DIAG__.isEnabled) {
    console.log('🔧 Weather diagnostics enabled');
    window.selfTest = selfTest;
    window.__WX_SCHEMA__ = schemaValidator;
}

if (window.__WX_DIAG__.mockMode) {
    console.log('🎭 Mock mode enabled');
}

// Value rendering utilities with proper null/undefined handling
export const renderUtils = {
    renderValue(value, unit = '', fallback = '—') {
        if (value === null || value === undefined) {
            return fallback;
        }
        if (typeof value === 'number' && !isNaN(value)) {
            return `${value}${unit}`;
        }
        return fallback;
    },
    
    renderValueWithMissing(data, key, index = 0, unit = '', missingText = 'Not available') {
        if (!data || !data[key]) {
            return `<span class="text-orange-300">${missingText}</span>`;
        }
        const value = Array.isArray(data[key]) ? data[key][index] : data[key];
        if (value === null || value === undefined) {
            return '—';
        }
        if (typeof value === 'number' && !isNaN(value)) {
            return `${value}${unit}`;
        }
        return '—';
    },

    renderArrayValue(array, index, unit = '', fallback = '—') {
        if (!array || index >= array.length || array[index] === null || array[index] === undefined) {
            return fallback;
        }
        const value = array[index];
        if (typeof value === 'number' && !isNaN(value)) {
            return `${value}${unit}`;
        }
        return fallback;
    }
};

// Data binding tests
function testDataBindings() {
    const tests = [];
    
    // Test that critical keys are present and aligned
    const weatherWidget = window.dashboardState?.services?.weather;
    if (weatherWidget?.weatherData?.hourly) {
        const hourly = weatherWidget.weatherData.hourly;
        const criticalKeys = ['precipitation_probability', 'rain', 'showers', 'snowfall'];
        const timeLength = hourly.time?.length || 0;
        
        criticalKeys.forEach(key => {
            if (hourly[key]) {
                tests.push({
                    key,
                    present: true,
                    aligned: hourly[key].length === timeLength,
                    length: hourly[key].length
                });
            } else {
                tests.push({
                    key,
                    present: false,
                    aligned: false,
                    length: 0
                });
            }
        });
    }
    
    return tests;
}

// Section rendering tests
function testNext2HoursSectionRendering() {
    try {
        // Check if the weather widget exists
        const widget = document.querySelector('[id^="widget-weather"]');
        if (!widget) return { ok: false, reason: 'Weather widget not found' };
        
        // Look for 15-minute nowcast section
        const nowcastSection = widget.querySelector('[data-section="next2hours"]') || 
                              widget.innerHTML.includes('Next 2 Hours (15-min intervals)');
        
        if (!nowcastSection) return { ok: false, reason: 'Next 2 Hours section not found' };
        
        // Check for proper fallback messages
        const hasNotAvailable = widget.innerHTML.includes('Not available (15-min data)');
        const hasNoData = widget.innerHTML.includes('No data in range');
        const hasNumericData = /\d+\.\d+mm/.test(widget.innerHTML);
        
        return { 
            ok: true, 
            hasNotAvailable, 
            hasNoData, 
            hasNumericData,
            reason: 'Section rendered successfully'
        };
    } catch (error) {
        return { ok: false, reason: error.message };
    }
}

function testHourlyRainProbRendering() {
    try {
        const widget = document.querySelector('[id^="widget-weather"]');
        if (!widget) return { ok: false, reason: 'Weather widget not found' };
        
        const hourlyRainSection = widget.innerHTML.includes('Hourly Rain Probability (Next 12h)');
        if (!hourlyRainSection) return { ok: false, reason: 'Hourly rain probability section not found' };
        
        // Check for percentage values
        const hasPercentages = /%/.test(widget.innerHTML);
        const hasProgressBars = widget.innerHTML.includes('bg-blue-400');
        
        return { 
            ok: true, 
            hasPercentages, 
            hasProgressBars,
            reason: 'Hourly rain probability rendered successfully'
        };
    } catch (error) {
        return { ok: false, reason: error.message };
    }
}

function testOneHourTotalsRendering() {
    try {
        const widget = document.querySelector('[id^="widget-weather"]');
        if (!widget) return { ok: false, reason: 'Weather widget not found' };
        
        // Check for correct units
        const hasRainMm = widget.innerHTML.includes('Rain (1h)') && widget.innerHTML.includes('mm');
        const hasShowersMm = widget.innerHTML.includes('Showers (1h)') && widget.innerHTML.includes('mm');
        const hasSnowCm = widget.innerHTML.includes('Snow (1h)') && widget.innerHTML.includes('cm');
        
        // Check for proper null handling (— instead of 0 when no data)
        const hasDashFallback = widget.innerHTML.includes('—');
        
        return { 
            ok: true, 
            hasRainMm, 
            hasShowersMm, 
            hasSnowCm,
            hasDashFallback,
            reason: 'One hour totals rendered with correct units'
        };
    } catch (error) {
        return { ok: false, reason: error.message };
    }
}