// Widget Registry
import { renderUtils } from './testing.js';
export const widgets = {
    quote: {
        id: 'quote',
        title: 'Daily Quote',
        icon: 'ph-quotes',
        size: 'md:col-span-2',
        order: 1,
        container: null,
        deps: null,
        
        async mount(container, deps) {
            this.container = container;
            this.deps = deps;
            
            // Set up initial HTML structure
            container.innerHTML = `
                <div class="quote-widget">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <i class="ph ph-quotes text-2xl"></i>
                            <h3 class="text-lg font-semibold">Daily Quote</h3>
                        </div>
                        <div class="quote-actions flex gap-2">
                            <button id="quote-copy" class="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors" title="Copy Quote">
                                <i class="ph ph-copy text-lg"></i>
                            </button>
                            <button id="quote-shuffle" class="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors" title="Random Quote">
                                <i class="ph ph-shuffle text-lg"></i>
                            </button>
                            <button id="quote-context" class="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors" title="Show Context">
                                <i class="ph ph-info text-lg"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div id="quote-content" class="quote-content">
                        <div class="text-center text-gray-300 py-8">
                            <i class="ph ph-spinner text-2xl animate-spin mb-2"></i>
                            <p>Loading quote...</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Set up event listeners
            this.setupEventListeners();
        },
        
        async load(state, services) {
            // Data is already loaded in main.js, just ensure we have current quote
            if (!state.currentQuote && state.quotes.length > 0) {
                const dailyIndex = this.getDeterministicDailyIndex(state.quotes);
                state.currentQuote = state.quotes[dailyIndex];
            }
        },
        
        render(state) {
            const contentEl = this.container?.querySelector('#quote-content');
            if (!contentEl) return;
            
            if (!state.currentQuote) {
                contentEl.innerHTML = `
                    <div class="text-center text-red-300 py-8">
                        <i class="ph ph-warning text-2xl mb-2"></i>
                        <p>No quotes available</p>
                    </div>
                `;
                return;
            }
            
            const quote = state.currentQuote;
            const themeColor = this.getThemeColor(quote.theme);
            
            contentEl.innerHTML = `
                <div class="space-y-4">
                    <blockquote class="text-lg leading-relaxed italic">
                        "${quote.text}"
                    </blockquote>
                    
                    <div class="flex items-center justify-between text-sm">
                        <div class="flex items-center gap-3">
                            <span class="theme-badge px-3 py-1 rounded-full text-xs font-medium ${themeColor}">
                                ${quote.theme}
                            </span>
                            <span class="text-gray-300">Book ${quote.book_roman}</span>
                        </div>
                    </div>
                    
                    <div class="text-sm text-gray-300 border-t border-white border-opacity-20 pt-3">
                        <p class="font-medium">${quote.work}</p>
                        <p>Translated by ${quote.translator}</p>
                    </div>
                </div>
            `;
        },
        
        setupEventListeners() {
            if (!this.container || !this.deps) return;
            
            const copyBtn = this.container.querySelector('#quote-copy');
            const shuffleBtn = this.container.querySelector('#quote-shuffle');
            const contextBtn = this.container.querySelector('#quote-context');
            
            copyBtn?.addEventListener('click', () => {
                const quote = this.deps.state.currentQuote;
                if (quote) {
                    const text = `"${quote.text}" - ${quote.work} (${quote.translator})`;
                    this.deps.utils.copyToClipboard(text);
                }
            });
            
            shuffleBtn?.addEventListener('click', () => {
                const quotes = this.deps.state.quotes;
                if (quotes.length > 0) {
                    const randomIndex = Math.floor(Math.random() * quotes.length);
                    this.deps.state.currentQuote = quotes[randomIndex];
                    this.render(this.deps.state);
                    this.deps.utils.showToast('Random quote loaded!');
                }
            });
            
            contextBtn?.addEventListener('click', () => {
                const quote = this.deps.state.currentQuote;
                if (quote) {
                    this.deps.utils.showToast(`Context: Paragraph ${quote.para_idx}, Sentence ${quote.sent_idx}`);
                }
            });
        },
        
        getThemeColor(theme) {
            const colors = {
                justice: 'bg-blue-500 bg-opacity-60 text-blue-100',
                truth: 'bg-green-500 bg-opacity-60 text-green-100',
                good: 'bg-yellow-500 bg-opacity-60 text-yellow-100',
                soul: 'bg-purple-500 bg-opacity-60 text-purple-100',
                city: 'bg-red-500 bg-opacity-60 text-red-100',
                education: 'bg-indigo-500 bg-opacity-60 text-indigo-100',
                general: 'bg-gray-500 bg-opacity-60 text-gray-100'
            };
            return colors[theme] || colors.general;
        },
        
        destroy() {
            // Clean up if needed
            this.container = null;
            this.deps = null;
        }
    },
    
    finance: {
        id: 'finance',
        title: 'Portfolio',
        icon: 'ph-chart-line',
        size: 'col-span-1',
        order: 2,
        container: null,
        deps: null,
        
        async mount(container, deps) {
            this.container = container;
            this.deps = deps;
            
            container.innerHTML = `
                <div class="finance-widget">
                    <div class="flex items-center gap-3 mb-4">
                        <i class="ph ph-chart-line text-2xl"></i>
                        <h3 class="text-lg font-semibold">Portfolio</h3>
                    </div>
                    
                    <div id="finance-content" class="finance-content">
                        <div class="text-center text-gray-300 py-8">
                            <i class="ph ph-spinner text-2xl animate-spin mb-2"></i>
                            <p>Loading portfolio...</p>
                        </div>
                    </div>
                </div>
            `;
        },
        
        async load(state, services) {
            try {
                this.portfolioData = await services.finance.getPortfolio();
            } catch (error) {
                console.error('Failed to load portfolio:', error);
                this.portfolioData = null;
            }
        },
        
        render(state) {
            const contentEl = this.container?.querySelector('#finance-content');
            if (!contentEl) return;
            
            if (!this.portfolioData) {
                contentEl.innerHTML = `
                    <div class="text-center text-red-300 py-4">
                        <i class="ph ph-warning text-xl mb-2"></i>
                        <p class="text-sm">Failed to load portfolio</p>
                    </div>
                `;
                return;
            }
            
            const data = this.portfolioData;
            const changeColor = data.dayChange >= 0 ? 'text-green-400' : 'text-red-400';
            const changeIcon = data.dayChange >= 0 ? 'ph-trend-up' : 'ph-trend-down';
            
            contentEl.innerHTML = `
                <div class="space-y-4">
                    <div class="text-center">
                        <div class="text-2xl font-bold">$${data.totalValue.toLocaleString()}</div>
                        <div class="flex items-center justify-center gap-1 ${changeColor}">
                            <i class="ph ${changeIcon} text-sm"></i>
                            <span class="text-sm">$${Math.abs(data.dayChange).toLocaleString()} (${data.dayChangePercent}%)</span>
                        </div>
                    </div>
                    
                    <div class="space-y-2">
                        ${data.positions.map(pos => `
                            <div class="flex justify-between items-center text-sm">
                                <span class="font-medium">${pos.symbol}</span>
                                <div class="text-right">
                                    <div>$${pos.value.toLocaleString()}</div>
                                    <div class="${pos.change >= 0 ? 'text-green-400' : 'text-red-400'}">${pos.change >= 0 ? '+' : ''}${pos.change}%</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },
        
        destroy() {
            this.container = null;
            this.deps = null;
            this.portfolioData = null;
        }
    },
    
    weather: {
        id: 'weather',
        title: 'Weather — Aberdeen',
        icon: 'ph-cloud-sun',
        size: 'md:col-span-2',
        order: 3,
        container: null,
        deps: null,
        weatherData: null,
        airQualityData: null,
        marineData: null,
        historyData: null,
        nowcastData: null,
        currentTab: 'command',
        refreshTimeout: null,
        
        async mount(container, deps) {
            this.container = container;
            this.deps = deps;
            
            container.innerHTML = `
                <div class="weather-widget">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <i class="ph ph-cloud-sun text-2xl"></i>
                            <h3 class="text-lg font-semibold">Weather — Aberdeen</h3>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="weather-units" class="px-2 py-1 text-xs rounded hover:bg-white hover:bg-opacity-10 transition-colors">
                                ${this.getUnitsLabel()}
                            </button>
                            <button id="weather-refresh" class="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors" title="Refresh">
                                <i class="ph ph-arrows-clockwise text-lg"></i>
                            </button>
                            <div class="relative">
                                <button id="weather-settings" class="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors" 
                                        title="Weather Settings" aria-haspopup="menu" aria-expanded="false">
                                    <i class="ph ph-gear text-lg"></i>
                                </button>
                                <!-- Settings Popover -->
                                <div id="weather-settings-popover" class="absolute right-0 top-8 z-[100] w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4 hidden" role="menu">
                                    <div class="space-y-4">
                                        <div class="flex items-center justify-between">
                                            <h4 class="text-sm font-medium text-white">Weather Settings</h4>
                                            <button id="close-weather-settings" class="text-gray-400 hover:text-white" aria-label="Close settings">
                                                <i class="ph ph-x text-sm"></i>
                                            </button>
                                        </div>
                                        
                                        <!-- Units -->
                                        <div class="space-y-2">
                                            <label class="text-xs font-medium text-gray-300">Units</label>
                                            <div class="flex gap-2">
                                                <button class="weather-unit-toggle flex-1 px-3 py-2 text-xs rounded border border-gray-600 transition-colors" 
                                                        data-units="metric" role="menuitemradio">
                                                    Metric (°C, km/h)
                                                </button>
                                                <button class="weather-unit-toggle flex-1 px-3 py-2 text-xs rounded border border-gray-600 transition-colors" 
                                                        data-units="imperial" role="menuitemradio">
                                                    Imperial (°F, mph)
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <!-- Auto Refresh -->
                                        <div class="flex items-center justify-between">
                                            <label class="text-xs font-medium text-gray-300">Auto Refresh</label>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="weather-auto-refresh-toggle" class="sr-only peer">
                                                <div class="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                        
                                        <!-- Refresh Interval -->
                                        <div id="refresh-interval-setting" class="space-y-2">
                                            <label class="text-xs font-medium text-gray-300">Refresh Interval (minutes)</label>
                                            <input type="range" id="weather-refresh-interval-slider" min="5" max="60" step="5" 
                                                   class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer">
                                            <div class="flex justify-between text-xs text-gray-400">
                                                <span>5</span>
                                                <span id="refresh-interval-display">15</span>
                                                <span>60</span>
                                            </div>
                                        </div>
                                        
                                        <!-- Section Visibility -->
                                        <div class="space-y-2">
                                            <label class="text-xs font-medium text-gray-300">Enabled Sections</label>
                                            <div class="grid grid-cols-2 gap-2 text-xs">
                                                <label class="flex items-center gap-2">
                                                    <input type="checkbox" class="section-toggle" data-section="command" checked>
                                                    <span>Command</span>
                                                </label>
                                                <label class="flex items-center gap-2">
                                                    <input type="checkbox" class="section-toggle" data-section="atmosphere" checked>
                                                    <span>Atmosphere</span>
                                                </label>
                                                <label class="flex items-center gap-2">
                                                    <input type="checkbox" class="section-toggle" data-section="precip" checked>
                                                    <span>Precipitation</span>
                                                </label>
                                                <label class="flex items-center gap-2">
                                                    <input type="checkbox" class="section-toggle" data-section="wind" checked>
                                                    <span>Wind</span>
                                                </label>
                                                <label class="flex items-center gap-2">
                                                    <input type="checkbox" class="section-toggle" data-section="sun" checked>
                                                    <span>Sun</span>
                                                </label>
                                                <label class="flex items-center gap-2">
                                                    <input type="checkbox" class="section-toggle" data-section="environment" checked>
                                                    <span>Environment</span>
                                                </label>
                                            </div>
                                        </div>
                                        
                                        <!-- Educational Tips -->
                                        <div class="flex items-center justify-between">
                                            <label class="text-xs font-medium text-gray-300">Educational Tips</label>
                                            <label class="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" id="weather-tips-toggle" class="sr-only peer" checked>
                                                <div class="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="weather-tabs mb-4">
                        <nav class="grid grid-cols-4 lg:grid-cols-8 gap-1 bg-white bg-opacity-10 rounded-lg p-1">
                            <button class="weather-tab-btn py-2 px-2 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300" data-tab="command" title="Command Center">
                                <i class="ph ph-flag text-lg mb-1"></i>
                                <div>Cmd</div>
                            </button>
                            <button class="weather-tab-btn py-2 px-2 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300" data-tab="atmosphere" title="Atmosphere">
                                <i class="ph ph-thermometer text-lg mb-1"></i>
                                <div>Atmo</div>
                            </button>
                            <button class="weather-tab-btn py-2 px-2 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300" data-tab="precip" title="Precipitation">
                                <i class="ph ph-cloud-rain text-lg mb-1"></i>
                                <div>Rain</div>
                            </button>
                            <button class="weather-tab-btn py-2 px-2 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300" data-tab="wind" title="Wind & Marine">
                                <i class="ph ph-wind text-lg mb-1"></i>
                                <div>Wind</div>
                            </button>
                            <button class="weather-tab-btn py-2 px-2 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300" data-tab="sun" title="Sun & Solar">
                                <i class="ph ph-sun text-lg mb-1"></i>
                                <div>Sun</div>
                            </button>
                            <button class="weather-tab-btn py-2 px-2 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300" data-tab="environment" title="Environment">
                                <i class="ph ph-leaf text-lg mb-1"></i>
                                <div>Env</div>
                            </button>
                            <button class="weather-tab-btn py-2 px-2 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300" data-tab="advanced" title="Advanced">
                                <i class="ph ph-lightning text-lg mb-1"></i>
                                <div>Adv</div>
                            </button>
                            <button class="weather-tab-btn py-2 px-2 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300" data-tab="legacy" title="Classic View">
                                <i class="ph ph-list text-lg mb-1"></i>
                                <div>List</div>
                            </button>
                        </nav>
                    </div>
                    
                    <div id="weather-content" class="weather-content min-h-[300px]">
                        <div class="text-center text-gray-300 py-12">
                            <i class="ph ph-spinner text-3xl animate-spin mb-3"></i>
                            <p>Loading weather data...</p>
                        </div>
                    </div>
                    
                    <div class="text-xs text-gray-400 mt-4 text-center">
                        <a href="https://open-meteo.com/" target="_blank" class="hover:text-gray-300">Weather data by Open-Meteo</a>
                    </div>
                </div>
            `;
            
            this.setupEventListeners();
            this.setupSettingsPopover();
            this.updateTabButtons();
        },
        
        getUnitsLabel() {
            const units = this.deps?.state?.settings?.widgets?.weather?.units || 'metric';
            return units === 'metric' ? '°C' : '°F';
        },
        
        getUnits() {
            return this.deps?.state?.settings?.widgets?.weather?.units || 'metric';
        },
        
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
        },

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
        },

        convertValueWithoutMutation(value, fromUnit, toUnit, type = 'temperature') {
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

        setupSettingsPopover() {
            if (!this.container || !this.deps) return;
            
            const settingsBtn = this.container.querySelector('#weather-settings');
            const popover = this.container.querySelector('#weather-settings-popover');
            const closeBtn = this.container.querySelector('#close-weather-settings');
            
            if (!settingsBtn || !popover || !closeBtn) return;
            
            // Toggle popover visibility
            const togglePopover = () => {
                const isOpen = !popover.classList.contains('hidden');
                
                if (isOpen) {
                    this.closeSettingsPopover();
                } else {
                    this.openSettingsPopover();
                }
            };
            
            // Open popover
            this.openSettingsPopover = () => {
                popover.classList.remove('hidden');
                settingsBtn.setAttribute('aria-expanded', 'true');
                this.loadSettingsToPopover();
                
                // Focus first interactive element
                const firstInput = popover.querySelector('button, input');
                if (firstInput) firstInput.focus();
            };
            
            // Close popover
            this.closeSettingsPopover = () => {
                popover.classList.add('hidden');
                settingsBtn.setAttribute('aria-expanded', 'false');
                settingsBtn.focus(); // Return focus to trigger button
            };
            
            // Check if click is outside popover
            const isOutsideClick = (event) => {
                return !popover.contains(event.target) && !settingsBtn.contains(event.target);
            };
            
            // Event listeners
            settingsBtn.addEventListener('click', togglePopover);
            closeBtn.addEventListener('click', this.closeSettingsPopover);
            
            // Close on outside click
            document.addEventListener('click', (event) => {
                if (!popover.classList.contains('hidden') && isOutsideClick(event)) {
                    this.closeSettingsPopover();
                }
            });
            
            // Close on Escape key
            popover.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    this.closeSettingsPopover();
                }
            });
            
            // Units toggle
            popover.querySelectorAll('.weather-unit-toggle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const units = e.target.dataset.units;
                    this.updateSetting('units', units);
                    this.updateUnitButtons();
                    this.renderCurrentTab(); // Re-render with new units
                });
            });
            
            // Auto refresh toggle
            const autoRefreshToggle = popover.querySelector('#weather-auto-refresh-toggle');
            autoRefreshToggle?.addEventListener('change', (e) => {
                this.updateSetting('autoRefresh', e.target.checked);
                this.updateRefreshIntervalVisibility();
            });
            
            // Refresh interval slider
            const intervalSlider = popover.querySelector('#weather-refresh-interval-slider');
            const intervalDisplay = popover.querySelector('#refresh-interval-display');
            
            intervalSlider?.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                intervalDisplay.textContent = value;
                this.updateSetting('refreshInterval', value);
            });
            
            // Section toggles
            popover.querySelectorAll('.section-toggle').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const section = e.target.dataset.section;
                    const enabled = e.target.checked;
                    this.updateSectionSetting(section, enabled);
                });
            });
            
            // Educational tips toggle
            const tipsToggle = popover.querySelector('#weather-tips-toggle');
            tipsToggle?.addEventListener('change', (e) => {
                this.updateSetting('educationalTips', e.target.checked);
                this.renderCurrentTab(); // Re-render to show/hide tips
            });
        },
        
        loadSettingsToPopover() {
            if (!this.deps?.state?.settings?.widgets?.weather) return;
            
            const settings = this.deps.state.settings.widgets.weather;
            
            // Update unit buttons
            this.updateUnitButtons();
            
            // Auto refresh
            const autoRefreshToggle = this.container.querySelector('#weather-auto-refresh-toggle');
            if (autoRefreshToggle) {
                autoRefreshToggle.checked = settings.autoRefresh || false;
            }
            
            // Refresh interval
            const intervalSlider = this.container.querySelector('#weather-refresh-interval-slider');
            const intervalDisplay = this.container.querySelector('#refresh-interval-display');
            if (intervalSlider && intervalDisplay) {
                const interval = settings.refreshInterval || 15;
                intervalSlider.value = interval;
                intervalDisplay.textContent = interval;
            }
            
            // Section toggles
            if (settings.enabledSections) {
                this.container.querySelectorAll('.section-toggle').forEach(checkbox => {
                    const section = checkbox.dataset.section;
                    checkbox.checked = settings.enabledSections[section] !== false;
                });
            }
            
            // Educational tips
            const tipsToggle = this.container.querySelector('#weather-tips-toggle');
            if (tipsToggle) {
                tipsToggle.checked = settings.educationalTips !== false;
            }
            
            this.updateRefreshIntervalVisibility();
        },
        
        updateUnitButtons() {
            const currentUnits = this.getUnits();
            this.container.querySelectorAll('.weather-unit-toggle').forEach(btn => {
                if (btn.dataset.units === currentUnits) {
                    btn.classList.add('bg-blue-600', 'text-white');
                    btn.classList.remove('text-gray-300');
                    btn.setAttribute('aria-checked', 'true');
                } else {
                    btn.classList.remove('bg-blue-600', 'text-white');
                    btn.classList.add('text-gray-300');
                    btn.setAttribute('aria-checked', 'false');
                }
            });
            
            // Update units label in header
            const unitsBtn = this.container.querySelector('#weather-units');
            if (unitsBtn) {
                unitsBtn.textContent = this.getUnitsLabel();
            }
        },
        
        updateRefreshIntervalVisibility() {
            const autoRefreshToggle = this.container.querySelector('#weather-auto-refresh-toggle');
            const intervalSetting = this.container.querySelector('#refresh-interval-setting');
            
            if (autoRefreshToggle && intervalSetting) {
                intervalSetting.style.opacity = autoRefreshToggle.checked ? '1' : '0.5';
                intervalSetting.style.pointerEvents = autoRefreshToggle.checked ? 'auto' : 'none';
            }
        },
        
        updateSetting(key, value) {
            if (!this.deps.state.settings.widgets) {
                this.deps.state.settings.widgets = { weather: {} };
            }
            if (!this.deps.state.settings.widgets.weather) {
                this.deps.state.settings.widgets.weather = {};
            }
            
            this.deps.state.settings.widgets.weather[key] = value;
            
            // Persist to localStorage
            try {
                localStorage.setItem('dashboard-settings', JSON.stringify(this.deps.state.settings));
            } catch (error) {
                console.error('Error saving settings:', error);
            }
        },
        
        updateSectionSetting(section, enabled) {
            if (!this.deps.state.settings.widgets) {
                this.deps.state.settings.widgets = { weather: {} };
            }
            if (!this.deps.state.settings.widgets.weather) {
                this.deps.state.settings.widgets.weather = {};
            }
            if (!this.deps.state.settings.widgets.weather.enabledSections) {
                this.deps.state.settings.widgets.weather.enabledSections = {};
            }
            
            this.deps.state.settings.widgets.weather.enabledSections[section] = enabled;
            
            // Persist to localStorage
            try {
                localStorage.setItem('dashboard-settings', JSON.stringify(this.deps.state.settings));
            } catch (error) {
                console.error('Error saving settings:', error);
            }
        },

        // Phase 5: Utility Functions
        getNowIndexForSeries(timesISO, nowLocalISO, stepMinutes) {
            const now = new Date(nowLocalISO);
            const flooredMinutes = Math.floor(now.getMinutes() / stepMinutes) * stepMinutes;
            const flooredNow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), flooredMinutes);
            
            for (let i = 0; i < timesISO.length; i++) {
                const seriesTime = new Date(timesISO[i]);
                if (seriesTime >= flooredNow) {
                    return i;
                }
            }
            return -1;
        },

        renderNext2HoursMinutely(minutely, timezone = 'Europe/London') {
            if (!minutely || !minutely.time) {
                return `
                    <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                        <i class="ph ph-warning text-orange-400 text-xl mb-2"></i>
                        <div class="text-sm text-orange-300">Not available (15-min data)</div>
                        <div class="text-xs text-gray-400 mt-1">15-minute forecasts not supported for this region</div>
                    </div>
                `;
            }

            if (!minutely.time.length || minutely.time.length === 0) {
                return `
                    <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                        <i class="ph ph-chart-line-down text-gray-400 text-xl mb-2"></i>
                        <div class="text-sm text-gray-400">No data in range</div>
                        <div class="text-xs text-gray-400 mt-1">15-minute data unavailable</div>
                    </div>
                `;
            }

            // Check for required keys
            const requiredKeys = ['precipitation', 'rain', 'snowfall', 'weather_code'];
            const availableKeys = requiredKeys.filter(key => minutely[key]);
            if (availableKeys.length === 0) {
                return `
                    <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                        <i class="ph ph-warning text-orange-400 text-xl mb-2"></i>
                        <div class="text-sm text-orange-300">Not available (15-min data)</div>
                        <div class="text-xs text-gray-400 mt-1">Required forecast variables missing</div>
                    </div>
                `;
            }

            const nowLocalISO = new Date().toLocaleString('sv-SE', { timeZone: timezone });
            const nowIndex = this.getNowIndexForSeries(minutely.time, nowLocalISO, 15);
            
            if (nowIndex === -1) {
                return `
                    <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                        <i class="ph ph-clock-countdown text-gray-400 text-xl mb-2"></i>
                        <div class="text-sm text-gray-400">No data in range</div>
                        <div class="text-xs text-gray-400 mt-1">Current time not found in forecast range</div>
                    </div>
                `;
            }

            const endIndex = Math.min(nowIndex + 8, minutely.time.length);
            const sliceLength = endIndex - nowIndex;
            
            if (sliceLength < 2) {
                return `
                    <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                        <i class="ph ph-chart-line-down text-gray-400 text-xl mb-2"></i>
                        <div class="text-sm text-gray-400">No data in range</div>
                        <div class="text-xs text-gray-400 mt-1">Less than 2 forecast points available</div>
                    </div>
                `;
            }

            return `
                <div class="p-4 bg-white bg-opacity-10 rounded-lg">
                    <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                        <i class="ph ph-clock"></i> Next 2 Hours (15-min intervals)
                    </h4>
                    <div class="grid grid-cols-8 gap-1 text-xs">
                        ${minutely.time.slice(nowIndex, endIndex).map((timeStr, i) => {
                            const actualIndex = nowIndex + i;
                            const time = new Date(timeStr);
                            const precip = renderUtils.renderValue(minutely.precipitation?.[actualIndex], { suffix: 'mm' });
                            const rain = minutely.rain?.[actualIndex];
                            const snow = minutely.snowfall?.[actualIndex];
                            const weatherCode = minutely.weather_code?.[actualIndex] || 0;
                            const weatherInfo = this.deps.utils.weatherUtils.getWeatherInfo(weatherCode);
                            
                            let precipDisplay = '—';
                            let colorClass = 'text-gray-400';
                            
                            if (Number.isFinite(rain) && rain > 0) {
                                precipDisplay = rain.toFixed(1) + 'mm';
                                colorClass = 'text-blue-400';
                            } else if (Number.isFinite(snow) && snow > 0) {
                                precipDisplay = (snow * 10).toFixed(1) + 'mm';
                                colorClass = 'text-blue-200';
                            } else if (Number.isFinite(minutely.precipitation?.[actualIndex]) && minutely.precipitation[actualIndex] > 0) {
                                precipDisplay = minutely.precipitation[actualIndex].toFixed(1) + 'mm';
                                colorClass = 'text-blue-400';
                            }
                            
                            return `
                                <div class="p-2 bg-white bg-opacity-5 rounded text-center">
                                    <div class="font-medium">${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}</div>
                                    <i class="ph ${weatherInfo.icon} text-sm ${colorClass} my-1"></i>
                                    <div class="text-xs ${colorClass}">
                                        ${precipDisplay}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        },

        renderHourlyRainProbNext12h(hourly, timezone = 'Europe/London') {
            if (!hourly || !hourly.time) {
                return `
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg text-center">
                        <i class="ph ph-warning text-orange-400 text-xl mb-2"></i>
                        <div class="text-sm text-orange-300">Not available</div>
                        <div class="text-xs text-gray-400 mt-1">Hourly data missing</div>
                    </div>
                `;
            }

            if (!hourly.precipitation_probability) {
                return `
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg text-center">
                        <i class="ph ph-warning text-orange-400 text-xl mb-2"></i>
                        <div class="text-sm text-orange-300">Not available</div>
                        <div class="text-xs text-gray-400 mt-1">Rain probability data missing</div>
                    </div>
                `;
            }

            if (!hourly.time.length || hourly.time.length === 0) {
                return `
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg text-center">
                        <i class="ph ph-chart-line-down text-gray-400 text-xl mb-2"></i>
                        <div class="text-sm text-gray-400">No data in range</div>
                        <div class="text-xs text-gray-400 mt-1">Hourly forecast unavailable</div>
                    </div>
                `;
            }

            const nowLocalISO = new Date().toLocaleString('sv-SE', { timeZone: timezone });
            const nowHourIndex = this.getNowIndexForSeries(hourly.time, nowLocalISO, 60);
            
            if (nowHourIndex === -1) {
                return `
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg text-center">
                        <i class="ph ph-clock-countdown text-gray-400 text-xl mb-2"></i>
                        <div class="text-sm text-gray-400">No data in range</div>
                        <div class="text-xs text-gray-400 mt-1">Current time not found in forecast range</div>
                    </div>
                `;
            }

            const endIndex = Math.min(nowHourIndex + 12, hourly.time.length);
            const sliceLength = endIndex - nowHourIndex;
            
            if (sliceLength < 2) {
                return `
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg text-center">
                        <i class="ph ph-chart-line-down text-gray-400 text-xl mb-2"></i>
                        <div class="text-sm text-gray-400">No data in range</div>
                        <div class="text-xs text-gray-400 mt-1">Less than 2 forecast points available</div>
                    </div>
                `;
            }

            return `
                <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                    <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                        <i class="ph ph-percent"></i> Hourly Rain Probability (Next 12h)
                    </h4>
                    <div class="space-y-2">
                        ${hourly.time.slice(nowHourIndex, endIndex).map((timeStr, i) => {
                            const actualIndex = nowHourIndex + i;
                            const time = new Date(timeStr);
                            const precipProb = hourly.precipitation_probability[actualIndex];
                            
                            let probDisplay = '—';
                            if (Number.isFinite(precipProb)) {
                                probDisplay = `${Math.round(precipProb)}%`;
                            }
                            
                            return `
                                <div class="flex items-center justify-between">
                                    <div class="text-sm font-medium w-16">
                                        ${time.getHours().toString().padStart(2, '0')}:00
                                    </div>
                                    <div class="flex-1 mx-3">
                                        <div class="h-2 bg-gray-600 rounded-full overflow-hidden">
                                            <div class="h-full bg-blue-400 rounded-full" style="width: ${Number.isFinite(precipProb) ? Math.min(precipProb, 100) : 0}%"></div>
                                        </div>
                                    </div>
                                    <div class="text-sm w-12 text-right">
                                        ${probDisplay}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        },

        renderOneHourTotals(hourly, nowHourIndex, timezone = 'Europe/London') {
            if (!hourly || !hourly.time) {
                return `
                    <div class="grid grid-cols-3 gap-3 text-sm">
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <i class="ph ph-cloud-rain text-gray-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Rain (1h)</div>
                            <div class="text-sm text-orange-300">Not available</div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <i class="ph ph-cloud-drizzle text-gray-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Showers (1h)</div>
                            <div class="text-sm text-orange-300">Not available</div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <i class="ph ph-cloud-snow text-gray-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Snow (1h)</div>
                            <div class="text-sm text-orange-300">Not available</div>
                        </div>
                    </div>
                `;
            }

            // Calculate nowHourIndex if not provided
            if (nowHourIndex === undefined || nowHourIndex === null) {
                const nowLocalISO = new Date().toLocaleString('sv-SE', { timeZone: timezone });
                nowHourIndex = this.getNowIndexForSeries(hourly.time, nowLocalISO, 60);
            }

            if (nowHourIndex === -1 || nowHourIndex >= hourly.time.length) {
                nowHourIndex = 0;
            }

            const rainValue = hourly.rain?.[nowHourIndex];
            const showersValue = hourly.showers?.[nowHourIndex];
            const snowValue = hourly.snowfall?.[nowHourIndex];

            return `
                <div class="grid grid-cols-3 gap-3 text-sm">
                    <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                        <i class="ph ph-cloud-rain text-blue-400 text-lg mb-1"></i>
                        <div class="text-xs text-gray-400 mb-1">Rain (1h)</div>
                        <div class="font-medium">
                            ${rainValue == null ? '—' : Number.isFinite(rainValue) ? rainValue.toFixed(1) + 'mm' : '—'}
                        </div>
                    </div>
                    <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                        <i class="ph ph-cloud-drizzle text-gray-400 text-lg mb-1"></i>
                        <div class="text-xs text-gray-400 mb-1">Showers (1h)</div>
                        <div class="font-medium">
                            ${showersValue == null ? '—' : Number.isFinite(showersValue) ? showersValue.toFixed(1) + 'mm' : '—'}
                        </div>
                    </div>
                    <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                        <i class="ph ph-cloud-snow text-blue-200 text-lg mb-1"></i>
                        <div class="text-xs text-gray-400 mb-1">Snow (1h)</div>
                        <div class="font-medium">
                            ${snowValue == null ? '—' : Number.isFinite(snowValue) ? snowValue.toFixed(1) + 'cm' : '—'}
                        </div>
                    </div>
                </div>
            `;
        },

        // Phase 5: Visual & State Integrity helpers
        renderStateTriad(data, key, options = {}) {
            const { index = 0, unit = '', missingText = 'Not available', loadingText = 'Loading...', noDataText = 'No data in range' } = options;
            
            // Loading state
            if (data === null || data === undefined) {
                return `<span class="text-gray-400">${loadingText}</span>`;
            }
            
            // Not available state (key missing)
            if (!data.hasOwnProperty(key)) {
                return `<span class="text-orange-300">${missingText}</span>`;
            }
            
            const value = Array.isArray(data[key]) ? data[key][index] : data[key];
            
            // No data in range (array exists but empty or null/undefined value)
            if (value === null || value === undefined) {
                return `<span class="text-gray-400">—</span>`;
            }
            
            // Valid data (including legitimate 0)
            if (typeof value === 'number') {
                return `${value}${unit}`;
            }
            
            return `${value}${unit}`;
        },

        renderChart(data, minPoints = 2, fallbackValue = null, fallbackUnit = '') {
            if (!Array.isArray(data) || data.length < minPoints) {
                if (fallbackValue !== null && typeof fallbackValue === 'number') {
                    return `
                        <div class="flex items-center justify-center h-16 bg-white bg-opacity-5 rounded-lg">
                            <div class="text-center">
                                <div class="text-lg font-bold">${fallbackValue}${fallbackUnit}</div>
                                <div class="text-xs text-gray-400">Insufficient data for chart</div>
                            </div>
                        </div>
                    `;
                }
                return `
                    <div class="flex items-center justify-center h-16 bg-white bg-opacity-5 rounded-lg">
                        <div class="text-center text-gray-400">
                            <i class="ph ph-chart-line text-xl mb-1"></i>
                            <div class="text-xs">Insufficient data points</div>
                        </div>
                    </div>
                `;
            }
            
            // Return chart data for rendering
            return { valid: true, data };
        },

        renderLoadingSkeleton(height = 'h-16') {
            return `
                <div class="animate-pulse">
                    <div class="${height} bg-gray-600 rounded-lg"></div>
                </div>
            `;
        },

        renderNotAvailable(message = 'Not available', icon = 'ph-warning') {
            return `
                <div class="flex items-center justify-center h-16 text-center text-orange-300">
                    <div>
                        <i class="ph ${icon} text-xl mb-1"></i>
                        <div class="text-sm">${message}</div>
                    </div>
                </div>
            `;
        },

        renderNoDataInRange(message = 'No data in range') {
            return `
                <div class="flex items-center justify-center h-16 text-center text-gray-400">
                    <div>
                        <i class="ph ph-database text-xl mb-1"></i>
                        <div class="text-sm">${message}</div>
                    </div>
                </div>
            `;
        },

        setupEventListeners() {
            if (!this.container || !this.deps) return;
            
            // Tab switching with keyboard support
            this.container.querySelectorAll('.weather-tab-btn').forEach((btn, index) => {
                btn.addEventListener('click', (e) => {
                    this.currentTab = e.target.dataset.tab;
                    this.updateTabButtons();
                    this.renderCurrentTab();
                });

                // Keyboard navigation
                btn.addEventListener('keydown', (e) => {
                    const tabs = Array.from(this.container.querySelectorAll('.weather-tab-btn'));
                    const currentIndex = tabs.indexOf(btn);
                    
                    switch (e.key) {
                        case 'ArrowRight':
                        case 'ArrowDown':
                            e.preventDefault();
                            const nextIndex = (currentIndex + 1) % tabs.length;
                            tabs[nextIndex].focus();
                            break;
                        case 'ArrowLeft':
                        case 'ArrowUp':
                            e.preventDefault();
                            const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                            tabs[prevIndex].focus();
                            break;
                        case 'Enter':
                        case ' ':
                            e.preventDefault();
                            btn.click();
                            break;
                    }
                });
            });
            
            // Units toggle
            const unitsBtn = this.container.querySelector('#weather-units');
            unitsBtn?.addEventListener('click', () => {
                const currentUnits = this.getUnits();
                const newUnits = currentUnits === 'metric' ? 'imperial' : 'metric';
                
                if (!this.deps.state.settings.widgets) {
                    this.deps.state.settings.widgets = { weather: {} };
                }
                if (!this.deps.state.settings.widgets.weather) {
                    this.deps.state.settings.widgets.weather = {};
                }
                
                this.deps.state.settings.widgets.weather.units = newUnits;
                unitsBtn.textContent = this.getUnitsLabel();
                this.renderCurrentTab(); // Re-render with new units
                
                // Save settings
                try {
                    localStorage.setItem('dashboard-settings', JSON.stringify(this.deps.state.settings));
                } catch (error) {
                    console.error('Error saving settings:', error);
                }
            });
            
            // Refresh
            const refreshBtn = this.container.querySelector('#weather-refresh');
            refreshBtn?.addEventListener('click', () => {
                this.refreshData();
            });
        },
        
        updateTabButtons() {
            this.container?.querySelectorAll('.weather-tab-btn').forEach(btn => {
                if (btn.dataset.tab === this.currentTab) {
                    btn.classList.add('bg-blue-600', 'text-white');
                    btn.classList.remove('text-gray-300', 'hover:text-white');
                } else {
                    btn.classList.remove('bg-blue-600', 'text-white');
                    btn.classList.add('text-gray-300', 'hover:text-white');
                }
            });
        },
        
        async refreshData() {
            const refreshBtn = this.container?.querySelector('#weather-refresh i');
            if (refreshBtn) {
                refreshBtn.classList.add('animate-spin');
            }
            
            try {
                // Clear cache for immediate refresh
                this.deps.services.weather.cache.clear();
                await this.load(this.deps.state, this.deps.services);
                this.renderCurrentTab();
                this.deps.utils.showToast('Weather data refreshed');
            } catch (error) {
                console.error('Failed to refresh weather:', error);
                this.deps.utils.showToast('Failed to refresh weather');
            } finally {
                if (refreshBtn) {
                    refreshBtn.classList.remove('animate-spin');
                }
            }
        },
        
        async load(state, services) {
            const units = this.getUnits();
            
            try {
                // Load all data sources
                const [weather, airQuality, marine, history, nowcast] = await Promise.allSettled([
                    services.weather.getCurrentAndForecast(units),
                    services.weather.getAirQuality(),
                    services.weather.getMarine(),
                    services.weather.getHistory(),
                    services.weather.getNowcast()
                ]);
                
                this.weatherData = weather.status === 'fulfilled' ? weather.value : null;
                this.airQualityData = airQuality.status === 'fulfilled' ? airQuality.value : null;
                this.marineData = marine.status === 'fulfilled' ? marine.value : null;
                this.historyData = history.status === 'fulfilled' ? history.value : null;
                this.nowcastData = nowcast.status === 'fulfilled' ? nowcast.value : null;
                
            } catch (error) {
                console.error('Failed to load weather data:', error);
            }
        },
        
        render(state) {
            this.renderCurrentTab();
            
            // Set up auto-refresh if enabled
            const autoRefresh = state.settings?.widgets?.weather?.autoRefresh;
            const interval = (state.settings?.widgets?.weather?.refreshInterval || 15) * 60 * 1000;
            
            if (autoRefresh && !this.refreshTimeout) {
                this.refreshTimeout = setInterval(() => {
                    this.refreshData();
                }, interval);
            } else if (!autoRefresh && this.refreshTimeout) {
                clearInterval(this.refreshTimeout);
                this.refreshTimeout = null;
            }
        },
        
        renderCurrentTab() {
            const contentEl = this.container?.querySelector('#weather-content');
            if (!contentEl) return;
            
            // Show loading skeleton if no weather data at all
            if (!this.weatherData) {
                contentEl.innerHTML = this.renderLoadingSkeleton('h-64');
                return;
            }
            
            switch (this.currentTab) {
                case 'command':
                    this.renderCommand(contentEl);
                    break;
                case 'atmosphere':
                    this.renderAtmosphere(contentEl);
                    break;
                case 'precip':
                    this.renderPrecip(contentEl);
                    break;
                case 'wind':
                    this.renderWind(contentEl);
                    break;
                case 'sun':
                    this.renderSun(contentEl);
                    break;
                case 'environment':
                    this.renderEnvironment(contentEl);
                    break;
                case 'advanced':
                    this.renderAdvanced(contentEl);
                    break;
                case 'legacy':
                    this.renderLegacy(contentEl);
                    break;
                // Legacy tabs
                case 'now':
                    this.renderNow(contentEl);
                    break;
                case 'hourly':
                    this.renderHourly(contentEl);
                    break;
                case 'daily':
                    this.renderDaily(contentEl);
                    break;
                case 'airquality':
                    this.renderAirQuality(contentEl);
                    break;
                case 'marine':
                    this.renderMarine(contentEl);
                    break;
                case 'history':
                    this.renderHistory(contentEl);
                    break;
            }
        },

        renderCommand(contentEl) {
            if (!this.weatherData?.current || !this.weatherData?.hourly) {
                contentEl.innerHTML = this.getErrorMessage('Weather data unavailable');
                return;
            }

            const current = this.weatherData.current;
            const hourly = this.weatherData.hourly;
            const daily = this.weatherData.daily;
            const units = this.getUnits();
            const utils = this.deps.utils.weatherUtils;

            // Verify data alignment for critical fields
            const criticalKeys = [
                'precipitation_probability', 'visibility', 'uv_index', 
                'wind_speed_10m', 'wind_gusts_10m', 'temperature_2m'
            ];
            const alignment = this.verifyAlignment(hourly, criticalKeys);
            
            if (!alignment.valid && window.__WX_DIAG__?.isEnabled) {
                console.warn('⚠️ Data alignment issues in command center:', alignment);
            }

            // Show alignment issues as notices
            let alignmentNotices = '';
            if (alignment.issues.length > 0) {
                alignmentNotices = alignment.issues.map(issue => 
                    `<div class="text-xs text-orange-300 mb-1">⚠️ ${issue}</div>`
                ).join('');
            }
            
            // Show missing key notices
            if (alignment.missingKeys.length > 0) {
                alignmentNotices += alignment.missingKeys.map(key => 
                    `<div class="text-xs text-orange-300 mb-1">Not available: ${key}</div>`
                ).join('');
            }

            // Inside/Outside Index calculation with proper null handling
            const indexData = {
                precip: current.precipitation ?? 0,
                precipProb: hourly.precipitation_probability?.[0] ?? 0,
                windSpeed: current.wind_speed_10m ?? 0,
                gusts: current.wind_gusts_10m ?? 0,
                temp: current.temperature_2m,
                visibility: hourly.visibility?.[0] ?? 10000,
                uvIndex: hourly.uv_index?.[0] ?? 0,
                isDaylight: current.is_day === 1
            };
            
            // Only compute index if we have essential data
            let insideOutside;
            if (indexData.temp !== null && indexData.temp !== undefined) {
                insideOutside = utils.computeInsideOutsideIndex(indexData);
            } else {
                insideOutside = {
                    recommendation: 'Insufficient data',
                    color: 'text-gray-400',
                    factors: ['Temperature data missing'],
                    score: 0
                };
            }

            // Marine risk assessment with proper null handling
            const marineRisk = utils.computeMarineRisk(
                this.marineData?.current?.wave_height ?? 0,
                current.wind_speed_10m ?? 0,
                current.wind_gusts_10m ?? 0,
                hourly.visibility?.[0] ?? 10000
            );

            // Alerts with safe threshold access
            const alerts = [];
            const thresholds = this.deps.state.settings?.widgets?.weather?.alertThresholds || {
                rainProbHigh: 0.8,
                gustStrongKmh: 50,
                pressureDropRapid_hPa_3h: 3,
                uvHigh: 6,
                waveHighM: 2.5
            };
            
            // Use exact API field names with proper null checking
            const precipProb = hourly.precipitation_probability?.[0];
            const windGusts = current.wind_gusts_10m;
            const uvIndex = hourly.uv_index?.[0];
            
            if (precipProb !== null && precipProb !== undefined && precipProb >= thresholds.rainProbHigh * 100) {
                alerts.push({ icon: 'ph-cloud-rain', text: `${Math.round(precipProb)}% rain likely`, color: 'text-blue-400' });
            }
            if (windGusts !== null && windGusts !== undefined && windGusts >= thresholds.gustStrongKmh) {
                alerts.push({ icon: 'ph-wind', text: `Strong gusts ${renderUtils.renderValue(windGusts, units === 'metric' ? ' km/h' : ' mph')}`, color: 'text-orange-400' });
            }
            if (uvIndex !== null && uvIndex !== undefined && uvIndex >= thresholds.uvHigh && current.is_day) {
                alerts.push({ icon: 'ph-sun', text: `High UV ${Math.round(uvIndex)}`, color: 'text-yellow-400' });
            }

            // Opportunities
            const opportunities = [];
            if (daily?.daylight_duration?.[0]) {
                const daylightHours = Math.round(daily.daylight_duration[0] / 3600);
                opportunities.push(`${daylightHours}h daylight today`);
            }
            const cloudCover = current.cloud_cover;
            if (cloudCover !== null && cloudCover !== undefined && cloudCover < 30) {
                opportunities.push('clear skies');
            }
            if (marineRisk.maxLevel === 'Low') {
                opportunities.push('calm seas');
            }

            contentEl.innerHTML = `
                <div class="space-y-4">
                    <!-- Inside/Outside Index -->
                    <div class="p-4 bg-white bg-opacity-10 rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-medium text-gray-200">Outside Conditions</h4>
                            <span class="text-lg font-bold ${insideOutside.color}">${insideOutside.recommendation}</span>
                        </div>
                        <div class="text-sm text-gray-300">
                            ${insideOutside.factors.slice(0, 3).join(' • ')}
                        </div>
                    </div>

                    <!-- Alerts -->
                    ${alerts.length > 0 ? `
                        <div class="space-y-2">
                            <h4 class="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <i class="ph ph-warning-circle"></i> Active Alerts
                            </h4>
                            ${alerts.map(alert => `
                                <div class="flex items-center gap-2 p-2 bg-red-500 bg-opacity-20 rounded">
                                    <i class="ph ${alert.icon} ${alert.color}"></i>
                                    <span class="text-sm">${alert.text}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    <!-- Marine Risk -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg">
                            <div class="text-xs text-gray-400 mb-1">Marine Risk</div>
                            <div class="font-medium ${
                                marineRisk.maxLevel === 'High' ? 'text-red-400' :
                                marineRisk.maxLevel === 'Moderate' ? 'text-yellow-400' : 'text-green-400'
                            }">${marineRisk.maxLevel}</div>
                            <div class="text-xs text-gray-300">${marineRisk.risks[0]?.type || 'Calm'}</div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg">
                            <div class="text-xs text-gray-400 mb-1">Pressure Trend</div>
                            <div class="font-medium">${(() => {
                                const pressureData = this.pickPressureSeries(hourly);
                                return utils.computePressureTrend(pressureData.data.slice(0, 4) || []);
                            })()}</div>
                            <div class="text-xs text-gray-300">${(() => {
                                const pressureData = this.pickPressureSeries(hourly);
                                if (pressureData.key) {
                                    const currentValue = current[pressureData.key] || pressureData.data[0];
                                    return `${Math.round(currentValue || 0)} ${pressureData.unit}`;
                                }
                                return pressureData.label;
                            })()}</div>
                        </div>
                    </div>

                    <!-- Opportunities -->
                    ${opportunities.length > 0 ? `
                        <div class="p-3 bg-green-500 bg-opacity-10 rounded-lg">
                            <div class="flex items-center gap-2 mb-1">
                                <i class="ph ph-shooting-star text-green-400"></i>
                                <span class="text-sm font-medium text-green-300">Today's highlights</span>
                            </div>
                            <div class="text-sm text-gray-300">${opportunities.join(', ')}</div>
                        </div>
                    ` : ''}

                    <!-- Data Alignment Notices -->
                    ${alignmentNotices ? `
                        <div class="p-3 bg-yellow-500 bg-opacity-10 rounded-lg">
                            <div class="text-xs text-yellow-300 font-medium mb-1">Data Quality Notices:</div>
                            ${alignmentNotices}
                        </div>
                    ` : ''}
                </div>
            `;
        },

        renderAtmosphere(contentEl) {
            if (!this.weatherData?.current || !this.weatherData?.hourly) {
                contentEl.innerHTML = this.getErrorMessage('Weather data unavailable');
                return;
            }

            const current = this.weatherData.current;
            const hourly = this.weatherData.hourly;
            const units = this.getUnits();
            const utils = this.deps.utils.weatherUtils;
            const tempUnit = units === 'metric' ? '°C' : '°F';

            // Verify data alignment for atmosphere fields
            const atmosphereKeys = [
                'temperature_2m', 'apparent_temperature', 'dew_point_2m', 
                'relative_humidity_2m', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high'
            ];
            const alignment = this.verifyAlignment(hourly, atmosphereKeys);
            
            if (!alignment.valid && window.__WX_DIAG__?.isEnabled) {
                console.warn('⚠️ Data alignment issues in atmosphere:', alignment);
            }

            // Fog risk calculation
            const fogRisk = utils.computeFogRisk(
                current.temperature_2m,
                hourly.dew_point_2m?.[0] || current.temperature_2m - 5,
                current.cloud_cover || 0,
                current.wind_speed_10m || 0,
                hourly.visibility?.[0] || 10000
            );

            // Pressure trend using correct pressure series
            const pressureData = this.pickPressureSeries(hourly);
            const pressureTrend = utils.computePressureTrend(pressureData.data.slice(0, 4) || []);

            // Cloud layer analysis
            const cloudLayers = [];
            if (hourly.cloud_cover_low?.[0] > 20) {
                cloudLayers.push(`${Math.round(hourly.cloud_cover_low[0])}% low`);
            }
            if (hourly.cloud_cover_mid?.[0] > 20) {
                cloudLayers.push(`${Math.round(hourly.cloud_cover_mid[0])}% mid`);
            }
            if (hourly.cloud_cover_high?.[0] > 20) {
                cloudLayers.push(`${Math.round(hourly.cloud_cover_high[0])}% high`);
            }

            contentEl.innerHTML = `
                <div class="space-y-4">
                    <!-- Temperature & Comfort -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                            <i class="ph ph-thermometer text-3xl text-red-400 mb-2"></i>
                            <div class="text-2xl font-bold">${Math.round(current.temperature_2m)}${tempUnit}</div>
                            <div class="text-sm text-gray-300">Current</div>
                        </div>
                        <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                            <i class="ph ph-thermometer-simple text-3xl text-orange-400 mb-2"></i>
                            <div class="text-2xl font-bold">${Math.round(current.apparent_temperature)}${tempUnit}</div>
                            <div class="text-sm text-gray-300">Feels like</div>
                        </div>
                    </div>

                    <!-- Humidity & Dew Point -->
                    <div class="grid grid-cols-3 gap-3 text-sm">
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <i class="ph ph-drop text-blue-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Humidity</div>
                            <div class="font-medium">${current.relative_humidity_2m}%</div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <i class="ph ph-drop-half text-blue-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Dew Point</div>
                            <div class="font-medium">${Math.round(hourly.dew_point_2m?.[0] || current.temperature_2m - 5)}${tempUnit}</div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <i class="ph ph-cloud-fog text-gray-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Fog Risk</div>
                            <div class="font-medium ${
                                fogRisk === 'High' ? 'text-red-400' :
                                fogRisk === 'Moderate' ? 'text-yellow-400' : 'text-green-400'
                            }">${fogRisk}</div>
                        </div>
                    </div>

                    <!-- Pressure Analysis -->
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <i class="ph ph-gauge"></i> Atmospheric Pressure
                        </h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                ${(() => {
                                    const pressureData = this.pickPressureSeries(hourly);
                                    if (pressureData.key) {
                                        const currentValue = current[pressureData.key] || pressureData.data[0];
                                        return `
                                            <div class="text-lg font-bold">${Math.round(currentValue || 0)} ${pressureData.unit}</div>
                                            <div class="text-xs text-gray-400">${pressureData.label}</div>
                                        `;
                                    }
                                    return `
                                        <div class="text-lg text-orange-300">${pressureData.label}</div>
                                        <div class="text-xs text-gray-400">Pressure data</div>
                                    `;
                                })()}
                            </div>
                            <div>
                                <div class="text-lg font-bold ${
                                    pressureTrend.includes('Falling') ? 'text-red-400' :
                                    pressureTrend.includes('Rising') ? 'text-green-400' : 'text-yellow-400'
                                }">${pressureTrend}</div>
                                <div class="text-xs text-gray-400">3-hour trend</div>
                            </div>
                        </div>
                        ${this.deps.state.settings?.widgets?.weather?.educationalTips ? `
                            <div class="mt-3 text-xs text-gray-400 p-2 bg-blue-500 bg-opacity-10 rounded">
                                💡 ${pressureTrend.includes('Falling') ? 'Falling pressure often brings unsettled weather' : 
                                     pressureTrend.includes('Rising') ? 'Rising pressure typically means improving conditions' :
                                     'Steady pressure suggests stable weather'}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Cloud Layers -->
                    ${cloudLayers.length > 0 ? `
                        <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                            <h4 class="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                <i class="ph ph-cloud"></i> Cloud Layers
                            </h4>
                            <div class="text-sm text-gray-300">${cloudLayers.join(', ')}</div>
                            ${this.deps.state.settings?.widgets?.weather?.educationalTips ? `
                                <div class="mt-2 text-xs text-gray-400">
                                    💡 High clouds often indicate weather changes in 24-48h
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    <!-- Visibility -->
                    ${hourly.visibility?.[0] ? `
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <i class="ph ph-eye text-gray-400"></i>
                                    <span class="text-sm font-medium">Visibility</span>
                                </div>
                                <span class="font-medium">${utils.getVisibilityLevel(hourly.visibility[0]).description}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        },

        renderPrecip(contentEl) {
            if (!this.weatherData?.hourly) {
                contentEl.innerHTML = this.getErrorMessage('Weather data unavailable');
                return;
            }

            const hourly = this.weatherData.hourly;
            const nowcast = this.nowcastData?.minutely_15;
            const units = this.getUnits();

            // Next 2 hours nowcast
            const nowcastAvailable = nowcast && nowcast.time && nowcast.time.length > 0;
            
            contentEl.innerHTML = `
                <div class="space-y-4">
                    <!-- 2-Hour Nowcast -->
                    ${this.renderNext2HoursMinutely(nowcast)}

                    <!-- Hourly Precipitation Probability -->
                    ${this.renderHourlyRainProbNext12h(hourly)}

                    <!-- Precipitation Type Breakdown -->
                    ${this.renderOneHourTotals(hourly)}

                    <!-- Alert Thresholds -->
                    ${hourly.precipitation_probability?.slice(0, 24).some((prob, i) => {
                        const time = new Date(hourly.time[i]);
                        return prob >= 80;
                    }) ? `
                        <div class="p-3 bg-red-500 bg-opacity-20 rounded-lg">
                            <div class="flex items-center gap-2 text-red-300 mb-2">
                                <i class="ph ph-warning-circle"></i>
                                <span class="font-medium">High Rain Probability Alert</span>
                            </div>
                            <div class="text-sm text-gray-300">
                                ${hourly.precipitation_probability.slice(0, 24)
                                    .map((prob, i) => ({ prob, hour: i }))
                                    .filter(({ prob }) => prob >= 80)
                                    .slice(0, 3)
                                    .map(({ prob, hour }) => `${hour}:00 (${Math.round(prob)}%)`)
                                    .join(', ')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        },

        renderWind(contentEl) {
            if (!this.weatherData?.current || !this.weatherData?.hourly) {
                contentEl.innerHTML = this.getErrorMessage('Weather data unavailable');
                return;
            }

            const current = this.weatherData.current;
            const hourly = this.weatherData.hourly;
            const marine = this.marineData;
            const units = this.getUnits();
            const utils = this.deps.utils.weatherUtils;
            const speedUnit = units === 'metric' ? ' km/h' : ' mph';

            // Wind rose data (past 24 hours)
            const windDirs = hourly.wind_direction_10m?.slice(0, 24) || [];
            const windSpeeds = hourly.wind_speed_10m?.slice(0, 24) || [];
            const windRose = utils.createWindRose(windDirs, windSpeeds);

            // Generate SVG wind rose
            const windRoseSVG = this.generateWindRoseSVG(windRose);

            // Elevated winds analysis
            const elevatedWinds = [];
            if (hourly.wind_speed_80m?.[0]) {
                elevatedWinds.push({ height: '80m', speed: hourly.wind_speed_80m[0], dir: hourly.wind_direction_80m?.[0] || 0 });
            }
            if (hourly.wind_speed_120m?.[0]) {
                elevatedWinds.push({ height: '120m', speed: hourly.wind_speed_120m[0], dir: hourly.wind_direction_120m?.[0] || 0 });
            }

            // Beaufort scale
            const beaufort = utils.getBeaufortScale(current.wind_speed_10m || 0);

            contentEl.innerHTML = `
                <div class="space-y-4">
                    <!-- Current Wind Conditions -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                            <i class="ph ph-wind text-3xl text-blue-400 mb-2"></i>
                            <div class="text-2xl font-bold">${Math.round(current.wind_speed_10m || 0)}${speedUnit}</div>
                            <div class="text-sm text-gray-300">${utils.getWindDirection(current.wind_direction_10m || 0)} • ${beaufort.description}</div>
                        </div>
                        <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                            <i class="ph ph-arrows-out text-3xl text-orange-400 mb-2"></i>
                            <div class="text-2xl font-bold">${Math.round(current.wind_gusts_10m || 0)}${speedUnit}</div>
                            <div class="text-sm text-gray-300">Gusts</div>
                        </div>
                    </div>

                    <!-- Wind Rose -->
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <i class="ph ph-compass"></i> Wind Rose (24h)
                        </h4>
                        <div class="flex justify-center">${windRoseSVG}</div>
                        <div class="text-xs text-gray-400 text-center mt-2">Dominant direction: ${utils.getWindDirection(this.getDominantWindDirection(windDirs))}</div>
                    </div>

                    <!-- Elevated Winds -->
                    ${elevatedWinds.length > 0 ? `
                        <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                            <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                                <i class="ph ph-airplane"></i> Elevated Winds
                            </h4>
                            <div class="space-y-2">
                                <div class="flex items-center justify-between text-sm">
                                    <span>Surface (10m)</span>
                                    <span>${Math.round(current.wind_speed_10m || 0)}${speedUnit} ${utils.getWindDirection(current.wind_direction_10m || 0)}</span>
                                </div>
                                ${elevatedWinds.map(wind => `
                                    <div class="flex items-center justify-between text-sm">
                                        <span>${wind.height}</span>
                                        <span>${Math.round(wind.speed)}${speedUnit} ${utils.getWindDirection(wind.dir)}</span>
                                    </div>
                                `).join('')}
                            </div>
                            ${this.deps.state.settings?.widgets?.weather?.educationalTips ? `
                                <div class="mt-3 text-xs text-gray-400 p-2 bg-blue-500 bg-opacity-10 rounded">
                                    💡 Wind typically increases with altitude due to reduced surface friction
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    <!-- Marine Conditions -->
                    ${marine?.current ? `
                        <div class="grid grid-cols-2 gap-3">
                            <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                                <i class="ph ph-waves text-blue-400 text-lg mb-1"></i>
                                <div class="text-xs text-gray-400 mb-1">Wave Height</div>
                                <div class="font-medium">${(marine.current.wave_height || 0).toFixed(1)}m</div>
                            </div>
                            <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                                <i class="ph ph-thermometer-cold text-blue-300 text-lg mb-1"></i>
                                <div class="text-xs text-gray-400 mb-1">Freezing Level</div>
                                <div class="font-medium">${Math.round((hourly.freezing_level_height?.[0] || 0) / 1000)}km</div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Wind Alerts -->
                    ${(current.wind_gusts_10m || 0) > 40 ? `
                        <div class="p-3 bg-orange-500 bg-opacity-20 rounded-lg">
                            <div class="flex items-center gap-2 text-orange-300 mb-1">
                                <i class="ph ph-warning-circle"></i>
                                <span class="font-medium">Strong Wind Alert</span>
                            </div>
                            <div class="text-sm text-gray-300">
                                Gusts reaching ${Math.round(current.wind_gusts_10m)}${speedUnit} - exercise caution outdoors
                            </div>
                        </div>
                    ` : ''}

                    <!-- Sailing Conditions -->
                    ${this.deps.state.settings?.widgets?.weather?.sailingMode ? `
                        <div class="p-3 bg-blue-500 bg-opacity-10 rounded-lg">
                            <div class="flex items-center gap-2 text-blue-300 mb-2">
                                <i class="ph ph-sailboat"></i>
                                <span class="font-medium">Sailing Conditions</span>
                            </div>
                            <div class="text-sm text-gray-300">
                                ${this.getSailingConditions(current.wind_speed_10m || 0, current.wind_gusts_10m || 0, marine?.current?.wave_height || 0)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        },

        generateWindRoseSVG(windRose) {
            const size = 120;
            const center = size / 2;
            const maxRadius = 40;
            
            let paths = '';
            const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
            
            windRose.forEach((value, i) => {
                if (value > 5) { // Only show significant values
                    const angle = (i * 22.5 - 90) * Math.PI / 180;
                    const radius = (value / 100) * maxRadius;
                    const x1 = center + Math.cos(angle) * 5;
                    const y1 = center + Math.sin(angle) * 5;
                    const x2 = center + Math.cos(angle) * radius;
                    const y2 = center + Math.sin(angle) * radius;
                    
                    paths += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#60a5fa" stroke-width="3" opacity="0.8"/>`;
                }
            });
            
            // Add compass directions
            let labels = '';
            directions.forEach((dir, i) => {
                if (i % 4 === 0) { // N, E, S, W
                    const angle = (i * 22.5 - 90) * Math.PI / 180;
                    const x = center + Math.cos(angle) * (maxRadius + 15);
                    const y = center + Math.sin(angle) * (maxRadius + 15);
                    labels += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-size="10">${dir}</text>`;
                }
            });
            
            return `
                <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                    <circle cx="${center}" cy="${center}" r="${maxRadius}" fill="none" stroke="#374151" stroke-width="1" opacity="0.3"/>
                    <circle cx="${center}" cy="${center}" r="${maxRadius * 0.5}" fill="none" stroke="#374151" stroke-width="1" opacity="0.2"/>
                    ${paths}
                    ${labels}
                </svg>
            `;
        },

        getDominantWindDirection(directions) {
            if (!directions.length) return 0;
            // Simple approach - find most common direction bin
            const bins = Array(16).fill(0);
            directions.forEach(dir => {
                if (dir !== null) {
                    const binIndex = Math.round(dir / 22.5) % 16;
                    bins[binIndex]++;
                }
            });
            const maxBin = bins.indexOf(Math.max(...bins));
            return maxBin * 22.5;
        },

        getSailingConditions(windSpeed, gusts, waveHeight) {
            if (windSpeed < 5) return 'Light winds - motor sailing recommended';
            if (windSpeed < 15 && gusts < 20 && waveHeight < 1) return 'Perfect sailing conditions';
            if (windSpeed < 25 && gusts < 35 && waveHeight < 2) return 'Good sailing - moderate conditions';
            if (windSpeed < 35 && gusts < 45) return 'Challenging conditions - experienced sailors only';
            return 'Small craft warning - consider staying in harbour';
        },
        
        renderNow(contentEl) {
            if (!this.weatherData?.current) {
                contentEl.innerHTML = this.getErrorMessage('Current weather data unavailable');
                return;
            }
            
            const current = this.weatherData.current;
            const units = this.getUnits();
            const weatherInfo = this.deps.utils.weatherUtils.getWeatherInfo(current.weather_code);
            const windDir = this.deps.utils.weatherUtils.getWindDirection(current.wind_direction_10m);
            const tempUnit = units === 'metric' ? '°C' : '°F';
            const speedUnit = units === 'metric' ? ' km/h' : ' mph';
            const pressureUnit = units === 'metric' ? ' hPa' : ' inHg';
            
            contentEl.innerHTML = `
                <div class="space-y-6">
                    <div class="text-center">
                        <i class="ph ${weatherInfo.icon} text-5xl mb-3"></i>
                        <div class="text-4xl font-bold mb-2">${Math.round(current.temperature_2m)}${tempUnit}</div>
                        <div class="text-lg text-gray-300 mb-1">${weatherInfo.label}</div>
                        <div class="text-sm text-gray-400">Feels like ${Math.round(current.apparent_temperature)}${tempUnit}</div>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div class="text-center p-3 bg-white bg-opacity-5 rounded-lg">
                            <i class="ph ph-drop text-blue-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Humidity</div>
                            <div class="font-medium">${current.relative_humidity_2m}%</div>
                        </div>
                        <div class="text-center p-3 bg-white bg-opacity-5 rounded-lg">
                            <i class="ph ph-wind text-gray-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Wind</div>
                            <div class="font-medium">${Math.round(current.wind_speed_10m)}${speedUnit}</div>
                            <div class="text-xs text-gray-500">${windDir}</div>
                        </div>
                        <div class="text-center p-3 bg-white bg-opacity-5 rounded-lg">
                            <i class="ph ph-gauge text-yellow-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Pressure</div>
                            <div class="font-medium">${this.deps.utils.weatherUtils.convertPressure(current.pressure_msl, units)}${pressureUnit}</div>
                        </div>
                        <div class="text-center p-3 bg-white bg-opacity-5 rounded-lg">
                            <i class="ph ph-cloud text-gray-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Cloud Cover</div>
                            <div class="font-medium">${current.cloud_cover}%</div>
                        </div>
                    </div>
                    
                    ${current.precipitation > 0 ? `
                        <div class="p-3 bg-blue-500 bg-opacity-20 rounded-lg">
                            <div class="flex items-center gap-2 text-blue-300">
                                <i class="ph ph-cloud-rain text-lg"></i>
                                <span class="font-medium">Precipitation: ${current.precipitation.toFixed(1)} mm/h</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        },
        
        renderHourly(contentEl) {
            if (!this.weatherData?.hourly) {
                contentEl.innerHTML = this.renderNotAvailable('Hourly weather data unavailable');
                return;
            }
            
            const hourly = this.weatherData.hourly;
            const units = this.getUnits();
            const tempUnit = units === 'metric' ? '°C' : '°F';
            const next24Hours = Array.from({ length: 24 }, (_, i) => i);
            
            // Check if we have sufficient temperature data
            if (!hourly.temperature_2m || hourly.temperature_2m.length < 2) {
                contentEl.innerHTML = this.renderNotAvailable('Insufficient temperature data for hourly view');
                return;
            }
            
            // Generate temperature sparkline data with validation
            const temps = next24Hours.map(i => hourly.temperature_2m?.[i]).filter(temp => temp !== null && temp !== undefined);
            
            if (temps.length < 2) {
                contentEl.innerHTML = this.renderChart([], 2, hourly.temperature_2m?.[0], tempUnit);
                return;
            }
            
            const minTemp = Math.min(...temps);
            const maxTemp = Math.max(...temps);
            const tempRange = maxTemp - minTemp || 1;
            
            const sparklinePoints = next24Hours.map(i => {
                const temp = hourly.temperature_2m?.[i];
                if (temp === null || temp === undefined) return null;
                const x = (i / 23) * 200;
                const y = 40 - ((temp - minTemp) / tempRange) * 30;
                return `${x},${y}`;
            }).filter(point => point !== null).join(' ');
            
            contentEl.innerHTML = `
                <div class="space-y-4">
                    <div class="bg-white bg-opacity-5 rounded-lg p-4">
                        <h4 class="text-sm font-medium text-gray-300 mb-3">24-Hour Temperature Trend</h4>
                        <svg width="100%" height="50" viewBox="0 0 200 40" class="mb-2">
                            <polyline points="${sparklinePoints}" fill="none" stroke="#60a5fa" stroke-width="2"/>
                            <circle cx="0" cy="${40 - ((temps[0] - minTemp) / tempRange) * 30}" r="2" fill="#60a5fa"/>
                        </svg>
                        <div class="flex justify-between text-xs text-gray-400">
                            <span>Now: ${Math.round(temps[0])}${tempUnit}</span>
                            <span>24h: ${Math.round(temps[23])}${tempUnit}</span>
                        </div>
                    </div>
                    
                    <div class="space-y-2 max-h-64 overflow-y-auto">
                        ${next24Hours.map(i => {
                            if (!hourly.time?.[i]) return '';
                            
                            const time = new Date(hourly.time[i]);
                            const weatherCode = hourly.weather_code?.[i] || 0;
                            const weatherInfo = this.deps.utils.weatherUtils.getWeatherInfo(weatherCode);
                            
                            return `
                                <div class="flex items-center justify-between p-2 hover:bg-white hover:bg-opacity-5 rounded">
                                    <div class="flex items-center gap-3 min-w-0 flex-1">
                                        <div class="text-sm font-medium w-12 flex-shrink-0">
                                            ${time.getHours().toString().padStart(2, '0')}:00
                                        </div>
                                        <i class="ph ${weatherInfo.icon} text-lg flex-shrink-0"></i>
                                        <div class="min-w-0">
                                            <div class="text-sm truncate">${weatherInfo.label}</div>
                                            ${hourly.precipitation_probability?.[i] ? `
                                                <div class="text-xs text-blue-400">${Math.round(hourly.precipitation_probability[i])}% rain</div>
                                            ` : ''}
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-sm font-medium">
                                            ${this.renderStateTriad(hourly, 'temperature_2m', { index: i, unit: tempUnit })}
                                        </div>
                                        <div class="text-xs text-gray-400">
                                            ${this.renderStateTriad(hourly, 'wind_speed_10m', { index: i, unit: units === 'metric' ? ' km/h' : ' mph' })}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).filter(html => html !== '').join('')}
                    </div>
                </div>
            `;
        },
        
        renderDaily(contentEl) {
            if (!this.weatherData?.daily) {
                contentEl.innerHTML = this.renderNotAvailable('Daily weather data unavailable');
                return;
            }
            
            const daily = this.weatherData.daily;
            const units = this.getUnits();
            const tempUnit = units === 'metric' ? '°C' : '°F';
            
            contentEl.innerHTML = `
                <div class="space-y-3">
                    ${daily.time?.slice(0, 7).map((dateStr, i) => {
                        if (!dateStr) return '';
                        
                        const date = new Date(dateStr);
                        const weatherCode = daily.weather_code?.[i] || 0;
                        const weatherInfo = this.deps.utils.weatherUtils.getWeatherInfo(weatherCode);
                        
                        return `
                            <div class="flex items-center justify-between p-3 hover:bg-white hover:bg-opacity-5 rounded-lg">
                                <div class="flex items-center gap-4 min-w-0 flex-1">
                                    <div class="text-sm font-medium w-16 flex-shrink-0">
                                        ${i === 0 ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'short' })}
                                    </div>
                                    <i class="ph ${weatherInfo.icon} text-xl flex-shrink-0"></i>
                                    <div class="min-w-0">
                                        <div class="text-sm">${weatherInfo.label}</div>
                                        ${daily.precipitation_sum?.[i] > 0 ? `
                                            <div class="text-xs text-blue-400">${daily.precipitation_sum[i].toFixed(1)}mm rain</div>
                                        ` : daily.precipitation_probability_max?.[i] > 0 ? `
                                            <div class="text-xs text-gray-400">${Math.round(daily.precipitation_probability_max[i])}% chance</div>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm font-medium">
                                        <span class="text-gray-300">
                                            ${this.renderStateTriad(daily, 'temperature_2m_min', { index: i, unit: '°' })}
                                        </span>
                                        <span class="ml-1">
                                            ${this.renderStateTriad(daily, 'temperature_2m_max', { index: i, unit: tempUnit })}
                                        </span>
                                    </div>
                                    <div class="text-xs text-gray-400">
                                        UV ${this.renderStateTriad(daily, 'uv_index_max', { index: i, unit: '' })}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).filter(html => html !== '').join('') || this.renderNoDataInRange('No daily forecast data')}
                    
                    <div class="mt-4 p-3 bg-white bg-opacity-5 rounded-lg">
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div class="text-xs text-gray-400 mb-1">Sunrise Today</div>
                                <div class="font-medium">
                                    ${daily.sunrise?.[0] ? this.deps.utils.weatherUtils.formatTime(daily.sunrise[0]) : 
                                      '<span class="text-orange-300">Not available</span>'}
                                </div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-400 mb-1">Sunset Today</div>
                                <div class="font-medium">
                                    ${daily.sunset?.[0] ? this.deps.utils.weatherUtils.formatTime(daily.sunset[0]) : 
                                      '<span class="text-orange-300">Not available</span>'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        renderAirQuality(contentEl) {
            if (!this.airQualityData?.current) {
                contentEl.innerHTML = this.renderNotAvailable('Air quality data not available for this location', 'ph-leaf');
                return;
            }
            
            const current = this.airQualityData.current;
            const aqi = current.european_aqi || current.us_aqi || 0;
            const aqiInfo = this.deps.utils.weatherUtils.getAirQualityLevel(aqi);
            
            contentEl.innerHTML = `
                <div class="space-y-4">
                    <div class="text-center p-4 bg-white bg-opacity-5 rounded-lg">
                        <div class="text-3xl font-bold ${aqiInfo.color} mb-2">${Math.round(aqi)}</div>
                        <div class="text-lg mb-1">${aqiInfo.level}</div>
                        <div class="text-xs text-gray-400">European AQI</div>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex justify-between items-center p-2 bg-white bg-opacity-5 rounded">
                            <span class="text-sm">PM2.5</span>
                            <span class="text-sm font-medium">${(current.pm2_5 || 0).toFixed(1)} µg/m³</span>
                        </div>
                        <div class="flex justify-between items-center p-2 bg-white bg-opacity-5 rounded">
                            <span class="text-sm">PM10</span>
                            <span class="text-sm font-medium">${(current.pm10 || 0).toFixed(1)} µg/m³</span>
                        </div>
                        <div class="flex justify-between items-center p-2 bg-white bg-opacity-5 rounded">
                            <span class="text-sm">Ozone (O₃)</span>
                            <span class="text-sm font-medium">${(current.ozone || 0).toFixed(1)} µg/m³</span>
                        </div>
                        <div class="flex justify-between items-center p-2 bg-white bg-opacity-5 rounded">
                            <span class="text-sm">NO₂</span>
                            <span class="text-sm font-medium">${(current.nitrogen_dioxide || 0).toFixed(1)} µg/m³</span>
                        </div>
                    </div>
                    
                    <div class="text-xs text-gray-400 p-3 bg-blue-500 bg-opacity-10 rounded-lg">
                        <p class="mb-1"><strong>Health Note:</strong></p>
                        ${this.getHealthAdvice(aqiInfo.level)}
                    </div>
                </div>
            `;
        },
        
        renderMarine(contentEl) {
            if (!this.marineData?.current) {
                contentEl.innerHTML = this.renderNotAvailable('Marine weather data not available for this location', 'ph-waves');
                return;
            }
            
            const current = this.marineData.current;
            const waveHeight = current.wave_height || 0;
            const waveDir = this.deps.utils.weatherUtils.getWindDirection(current.wave_direction || 0);
            
            contentEl.innerHTML = `
                <div class="space-y-4">
                    <div class="text-center p-4 bg-white bg-opacity-5 rounded-lg">
                        <i class="ph ph-waves text-4xl text-blue-400 mb-3"></i>
                        <div class="text-2xl font-bold mb-1">${waveHeight.toFixed(1)}m</div>
                        <div class="text-sm text-gray-300">Significant Wave Height</div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <div class="text-xs text-gray-400 mb-1">Wave Direction</div>
                            <div class="font-medium">${waveDir}</div>
                            <div class="text-xs text-gray-500">${Math.round(current.wave_direction || 0)}°</div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <div class="text-xs text-gray-400 mb-1">Wave Period</div>
                            <div class="font-medium">${(current.wave_period || 0).toFixed(1)}s</div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <div class="text-xs text-gray-400 mb-1">Wind Wave Height</div>
                            <div class="font-medium">${(current.wind_wave_height || 0).toFixed(1)}m</div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <div class="text-xs text-gray-400 mb-1">Wind Wave Period</div>
                            <div class="font-medium">${(current.wind_wave_period || 0).toFixed(1)}s</div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        renderHistory(contentEl) {
            if (!this.historyData?.daily) {
                contentEl.innerHTML = this.renderNotAvailable('Historical weather data unavailable', 'ph-chart-bar');
                return;
            }
            
            const daily = this.historyData.daily;
            const units = this.getUnits();
            const tempUnit = units === 'metric' ? '°C' : '°F';
            
            // Calculate averages for comparison
            const avgMaxTemp = daily.temperature_2m_max.reduce((a, b) => a + b, 0) / daily.temperature_2m_max.length;
            const avgMinTemp = daily.temperature_2m_min.reduce((a, b) => a + b, 0) / daily.temperature_2m_min.length;
            const totalPrecip = daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0);
            
            // Get today's forecast for comparison
            const todayMax = this.weatherData?.daily?.temperature_2m_max?.[0] || avgMaxTemp;
            const todayMin = this.weatherData?.daily?.temperature_2m_min?.[0] || avgMinTemp;
            
            contentEl.innerHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <div class="text-xs text-gray-400 mb-1">7-Day Avg High</div>
                            <div class="font-medium">${Math.round(avgMaxTemp)}${tempUnit}</div>
                            <div class="text-xs ${todayMax > avgMaxTemp ? 'text-red-400' : 'text-blue-400'}">
                                Today: ${todayMax > avgMaxTemp ? '+' : ''}${Math.round(todayMax - avgMaxTemp)}°
                            </div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <div class="text-xs text-gray-400 mb-1">7-Day Avg Low</div>
                            <div class="font-medium">${Math.round(avgMinTemp)}${tempUnit}</div>
                            <div class="text-xs ${todayMin > avgMinTemp ? 'text-red-400' : 'text-blue-400'}">
                                Today: ${todayMin > avgMinTemp ? '+' : ''}${Math.round(todayMin - avgMinTemp)}°
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-3 bg-white bg-opacity-5 rounded-lg">
                        <div class="text-xs text-gray-400 mb-2">Past 7 Days Temperature Range</div>
                        <div class="space-y-1">
                            ${daily.time.map((dateStr, i) => {
                                const date = new Date(dateStr);
                                const dayLabel = i === daily.time.length - 1 ? 'Yesterday' : 
                                               date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
                                
                                return `
                                    <div class="flex items-center justify-between py-1">
                                        <span class="text-xs w-16">${dayLabel}</span>
                                        <div class="flex-1 mx-2 h-1 bg-gray-600 rounded relative">
                                            <div class="absolute h-full bg-blue-400 rounded" style="width: 50%; left: 25%"></div>
                                        </div>
                                        <span class="text-xs text-gray-300 w-16 text-right">
                                            ${Math.round(daily.temperature_2m_min[i])}° / ${Math.round(daily.temperature_2m_max[i])}°
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <div class="p-3 bg-white bg-opacity-5 rounded-lg">
                        <div class="text-center">
                            <div class="text-lg font-medium text-blue-400 mb-1">${totalPrecip.toFixed(1)}mm</div>
                            <div class="text-xs text-gray-400">Total precipitation last 7 days</div>
                        </div>
                    </div>
                </div>
            `;
        },
        
        getErrorMessage(message) {
            return `
                <div class="text-center text-red-300 py-8">
                    <i class="ph ph-warning text-2xl mb-2"></i>
                    <p>${message}</p>
                </div>
            `;
        },
        
        getHealthAdvice(level) {
            const advice = {
                'Good': 'Air quality is satisfactory. Enjoy outdoor activities.',
                'Fair': 'Air quality is acceptable for most people.',
                'Moderate': 'Sensitive individuals should consider limiting prolonged outdoor activities.',
                'Poor': 'Everyone should limit prolonged outdoor activities.',
                'Very Poor': 'Avoid outdoor activities. Close windows.',
                'Extremely Poor': 'Stay indoors. Avoid all outdoor activities.'
            };
            return advice[level] || 'Monitor air quality conditions.';
        },

        renderLegacy(contentEl) {
            // Show legacy tab selector
            contentEl.innerHTML = `
                <div class="space-y-4">
                    <div class="p-4 bg-white bg-opacity-10 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-300 mb-3">Classic Weather Views</h4>
                        <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            <button class="legacy-tab-btn p-3 bg-white bg-opacity-5 rounded-lg hover:bg-opacity-10 transition-colors" data-legacy-tab="now">
                                <i class="ph ph-clock text-xl mb-2"></i>
                                <div class="text-sm font-medium">Now</div>
                            </button>
                            <button class="legacy-tab-btn p-3 bg-white bg-opacity-5 rounded-lg hover:bg-opacity-10 transition-colors" data-legacy-tab="hourly">
                                <i class="ph ph-chart-line text-xl mb-2"></i>
                                <div class="text-sm font-medium">Hourly</div>
                            </button>
                            <button class="legacy-tab-btn p-3 bg-white bg-opacity-5 rounded-lg hover:bg-opacity-10 transition-colors" data-legacy-tab="daily">
                                <i class="ph ph-calendar text-xl mb-2"></i>
                                <div class="text-sm font-medium">Daily</div>
                            </button>
                            <button class="legacy-tab-btn p-3 bg-white bg-opacity-5 rounded-lg hover:bg-opacity-10 transition-colors" data-legacy-tab="airquality">
                                <i class="ph ph-leaf text-xl mb-2"></i>
                                <div class="text-sm font-medium">Air Quality</div>
                            </button>
                            <button class="legacy-tab-btn p-3 bg-white bg-opacity-5 rounded-lg hover:bg-opacity-10 transition-colors" data-legacy-tab="marine">
                                <i class="ph ph-waves text-xl mb-2"></i>
                                <div class="text-sm font-medium">Marine</div>
                            </button>
                            <button class="legacy-tab-btn p-3 bg-white bg-opacity-5 rounded-lg hover:bg-opacity-10 transition-colors" data-legacy-tab="history">
                                <i class="ph ph-chart-bar text-xl mb-2"></i>
                                <div class="text-sm font-medium">History</div>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add event listeners for legacy tabs
            this.container?.querySelectorAll('.legacy-tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const legacyTab = e.currentTarget.dataset.legacyTab;
                    this.currentTab = legacyTab;
                    this.updateTabButtons();
                    this.renderCurrentTab();
                });
            });
        },

        renderSun(contentEl) {
            if (!this.weatherData?.daily || !this.weatherData?.hourly) {
                contentEl.innerHTML = this.getErrorMessage('Weather data unavailable');
                return;
            }

            const daily = this.weatherData.daily;
            const hourly = this.weatherData.hourly;
            const current = this.weatherData.current;
            const utils = this.deps.utils.weatherUtils;

            contentEl.innerHTML = `
                <div class="space-y-4">
                    <!-- Current Solar Conditions -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                            <i class="ph ph-sun text-3xl text-yellow-400 mb-2"></i>
                            <div class="text-2xl font-bold">${Math.round(hourly.uv_index?.[0] || 0)}</div>
                            <div class="text-sm text-gray-300">UV Index</div>
                        </div>
                        <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                            <i class="ph ph-lightning text-3xl text-orange-400 mb-2"></i>
                            <div class="text-2xl font-bold">${Math.round(hourly.shortwave_radiation?.[0] || 0)}</div>
                            <div class="text-sm text-gray-300">W/m² Solar</div>
                        </div>
                    </div>

                    <!-- Sun Position -->
                    <div class="grid grid-cols-3 gap-3 text-sm">
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <i class="ph ph-arrow-up text-yellow-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Sunrise</div>
                            <div class="font-medium">${utils.formatTime(daily.sunrise?.[0] || '')}</div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <i class="ph ph-arrow-down text-orange-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Sunset</div>
                            <div class="font-medium">${utils.formatTime(daily.sunset?.[0] || '')}</div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <i class="ph ph-clock text-blue-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">Daylight</div>
                            <div class="font-medium">${Math.round((daily.daylight_duration?.[0] || 0) / 3600)}h</div>
                        </div>
                    </div>

                    <!-- Solar Radiation Breakdown -->
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <i class="ph ph-sun-dim"></i> Solar Radiation Analysis
                        </h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span>Global Horizontal (GHI)</span>
                                <span class="font-medium">${Math.round(hourly.shortwave_radiation?.[0] || 0)} W/m²</span>
                            </div>
                            ${hourly.direct_normal_irradiance?.[0] ? `
                                <div class="flex justify-between">
                                    <span>Direct Normal (DNI)</span>
                                    <span class="font-medium">${Math.round(hourly.direct_normal_irradiance[0])} W/m²</span>
                                </div>
                            ` : ''}
                        </div>
                        ${this.deps.state.settings?.widgets?.weather?.educationalTips ? `
                            <div class="mt-3 text-xs text-gray-400 p-2 bg-yellow-500 bg-opacity-10 rounded">
                                💡 Solar panels are most efficient with direct sunlight (DNI)
                            </div>
                        ` : ''}
                    </div>

                    <!-- Next 3 Days Daylight -->
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <i class="ph ph-calendar"></i> Upcoming Daylight
                        </h4>
                        <div class="space-y-2">
                            ${daily.daylight_duration?.slice(0, 3).map((duration, i) => {
                                const date = new Date(daily.time[i]);
                                const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : utils.formatDate(daily.time[i]);
                                const hours = Math.round(duration / 3600);
                                const uvMax = Math.round(daily.uv_index_max?.[i] || 0);
                                
                                return `
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-3">
                                            <span class="text-sm font-medium w-20">${dayLabel}</span>
                                            <span class="text-xs text-gray-400">${hours}h daylight</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs ${uvMax > 7 ? 'text-red-400' : uvMax > 3 ? 'text-yellow-400' : 'text-green-400'}">
                                                UV ${uvMax}
                                            </span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- UV Safety -->
                    ${(hourly.uv_index?.[0] || 0) > 6 ? `
                        <div class="p-3 bg-yellow-500 bg-opacity-20 rounded-lg">
                            <div class="flex items-center gap-2 text-yellow-300 mb-1">
                                <i class="ph ph-warning-circle"></i>
                                <span class="font-medium">High UV Alert</span>
                            </div>
                            <div class="text-sm text-gray-300">
                                UV Index ${Math.round(hourly.uv_index[0])} - Seek shade, wear sunscreen and protective clothing
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        },

        renderEnvironment(contentEl) {
            if (!this.weatherData?.hourly) {
                contentEl.innerHTML = this.getErrorMessage('Weather data unavailable');
                return;
            }

            const hourly = this.weatherData.hourly;
            const airQuality = this.airQualityData;
            const units = this.getUnits();
            const tempUnit = units === 'metric' ? '°C' : '°F';

            contentEl.innerHTML = `
                <div class="space-y-4">
                    <!-- Soil Temperature Profile -->
                    <div class="p-4 bg-white bg-opacity-10 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <i class="ph ph-thermometer"></i> Soil Temperature Profile
                        </h4>
                        <div class="space-y-2">
                            ${[
                                { depth: '0cm', temp: hourly.soil_temperature_0cm?.[0], label: 'Surface' },
                                { depth: '6cm', temp: hourly.soil_temperature_6cm?.[0], label: 'Shallow' },
                                { depth: '18cm', temp: hourly.soil_temperature_18cm?.[0], label: 'Root zone' },
                                { depth: '54cm', temp: hourly.soil_temperature_54cm?.[0], label: 'Deep' }
                            ].map(soil => soil.temp ? `
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <span class="text-sm w-16">${soil.depth}</span>
                                        <span class="text-xs text-gray-400">${soil.label}</span>
                                    </div>
                                    <span class="font-medium">${Math.round(soil.temp)}${tempUnit}</span>
                                </div>
                            ` : '').join('')}
                        </div>
                        ${this.deps.state.settings?.widgets?.weather?.educationalTips ? `
                            <div class="mt-3 text-xs text-gray-400 p-2 bg-green-500 bg-opacity-10 rounded">
                                💡 Soil temperature affects plant growth and root development
                            </div>
                        ` : ''}
                    </div>

                    <!-- Soil Moisture Levels -->
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <i class="ph ph-drop"></i> Soil Moisture Profile
                        </h4>
                        <div class="space-y-2">
                            ${[
                                { depth: '0-1cm', moisture: hourly.soil_moisture_0_to_1cm?.[0] },
                                { depth: '1-3cm', moisture: hourly.soil_moisture_1_to_3cm?.[0] },
                                { depth: '3-9cm', moisture: hourly.soil_moisture_3_to_9cm?.[0] },
                                { depth: '9-27cm', moisture: hourly.soil_moisture_9_to_27cm?.[0] }
                            ].map(soil => soil.moisture !== undefined ? `
                                <div class="flex items-center justify-between">
                                    <span class="text-sm">${soil.depth}</span>
                                    <div class="flex items-center gap-2">
                                        <div class="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
                                            <div class="h-full bg-blue-400 rounded-full" style="width: ${Math.min(soil.moisture * 100, 100)}%"></div>
                                        </div>
                                        <span class="text-xs font-medium w-12">${(soil.moisture * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            ` : '').join('')}
                        </div>
                    </div>

                    <!-- Evapotranspiration -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <i class="ph ph-plant text-green-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">ET₀ (1h)</div>
                            <div class="font-medium">${(hourly.et0_fao_evapotranspiration?.[0] || 0).toFixed(2)}mm</div>
                        </div>
                        <div class="p-3 bg-white bg-opacity-5 rounded-lg text-center">
                            <i class="ph ph-droplet text-blue-400 text-lg mb-1"></i>
                            <div class="text-xs text-gray-400 mb-1">VPD</div>
                            <div class="font-medium">${((hourly.vapour_pressure_deficit?.[0] || 0) / 1000).toFixed(1)}kPa</div>
                        </div>
                    </div>

                    <!-- Air Quality Integration -->
                    ${airQuality?.current ? `
                        <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                            <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                                <i class="ph ph-lungs"></i> Air Quality for Outdoor Activities
                            </h4>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm">Current AQI</span>
                                <span class="font-medium ${this.deps.utils.weatherUtils.getAirQualityLevel(airQuality.current.european_aqi || 0).color}">
                                    ${Math.round(airQuality.current.european_aqi || 0)} - ${this.deps.utils.weatherUtils.getAirQualityLevel(airQuality.current.european_aqi || 0).level}
                                </span>
                            </div>
                            <div class="text-xs text-gray-400">
                                ${(airQuality.current.pm2_5 || 0) > 25 ? '⚠️ High PM2.5 - limit intense outdoor exercise' : '✅ Air quality suitable for outdoor activities'}
                            </div>
                        </div>
                    ` : ''}

                    ${this.deps.state.settings?.widgets?.weather?.educationalTips ? `
                        <div class="p-3 bg-blue-500 bg-opacity-10 rounded-lg">
                            <div class="text-xs text-gray-400">
                                💡 <strong>ET₀</strong> measures water evaporation demand. <strong>VPD</strong> indicates atmospheric dryness affecting plant stress.
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        },

        renderAdvanced(contentEl) {
            if (!this.weatherData?.hourly) {
                contentEl.innerHTML = this.getErrorMessage('Weather data unavailable');
                return;
            }

            const hourly = this.weatherData.hourly;
            const utils = this.deps.utils.weatherUtils;

            const cape = hourly.cape?.[0] || 0;
            const liftedIndex = hourly.lifted_index?.[0] || 0;
            const boundaryLayerHeight = hourly.boundary_layer_height?.[0] || 0;
            const visibility = hourly.visibility?.[0] || 0;

            const capeInfo = utils.getCapeLevel(cape);
            const liInfo = utils.getLiftedIndexLevel(liftedIndex);
            const visInfo = utils.getVisibilityLevel(visibility);

            contentEl.innerHTML = `
                <div class="space-y-4">
                    <!-- Convective Parameters -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                            <i class="ph ph-lightning text-3xl text-yellow-400 mb-2"></i>
                            <div class="text-2xl font-bold ${capeInfo.color}">${Math.round(cape)}</div>
                            <div class="text-sm text-gray-300">CAPE (J/kg)</div>
                            <div class="text-xs text-gray-400 mt-1">${capeInfo.level}</div>
                        </div>
                        <div class="p-4 bg-white bg-opacity-10 rounded-lg text-center">
                            <i class="ph ph-arrow-up text-3xl text-blue-400 mb-2"></i>
                            <div class="text-2xl font-bold ${liInfo.color}">${liftedIndex.toFixed(1)}</div>
                            <div class="text-sm text-gray-300">Lifted Index (°C)</div>
                            <div class="text-xs text-gray-400 mt-1">${liInfo.level}</div>
                        </div>
                    </div>

                    <!-- Atmospheric Analysis -->
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <i class="ph ph-cloud"></i> Atmospheric Structure
                        </h4>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <span class="text-sm">Boundary Layer Height</span>
                                    ${this.deps.state.settings?.widgets?.weather?.educationalTips ? `
                                        <i class="ph ph-info text-gray-400" title="Height of turbulent mixing layer"></i>
                                    ` : ''}
                                </div>
                                <span class="font-medium">${Math.round(boundaryLayerHeight)}m</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <span class="text-sm">Visibility</span>
                                </div>
                                <span class="font-medium ${visInfo.color}">${visInfo.level}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Thunderstorm Potential -->
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <i class="ph ph-cloud-lightning"></i> Thunderstorm Analysis
                        </h4>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div class="text-xs text-gray-400 mb-1">CAPE Assessment</div>
                                <div class="${capeInfo.color} font-medium">${capeInfo.description}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-400 mb-1">Lifted Index Assessment</div>
                                <div class="${liInfo.color} font-medium">${liInfo.description}</div>
                            </div>
                        </div>
                        ${this.deps.state.settings?.widgets?.weather?.educationalTips ? `
                            <div class="mt-3 text-xs text-gray-400 p-2 bg-purple-500 bg-opacity-10 rounded">
                                💡 <strong>CAPE</strong> measures atmospheric instability. <strong>Lifted Index</strong> indicates thunderstorm potential (negative = unstable).
                            </div>
                        ` : ''}
                    </div>

                    <!-- Professional Weather Summary -->
                    <div class="p-4 bg-white bg-opacity-5 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <i class="ph ph-graduation-cap"></i> Meteorology 101
                        </h4>
                        <div class="space-y-2 text-xs text-gray-400">
                            <div><strong>Boundary Layer:</strong> The turbulent layer where weather affects us. Higher = more mixing, better air quality dispersion.</div>
                            <div><strong>CAPE:</strong> Energy available for thunderstorms. Higher values indicate greater potential for severe weather.</div>
                            <div><strong>Lifted Index:</strong> Temperature difference when air is lifted. Negative values favor storm development.</div>
                        </div>
                    </div>

                    <!-- Advanced Alerts -->
                    ${cape > 2500 && liftedIndex < -3 ? `
                        <div class="p-3 bg-red-500 bg-opacity-20 rounded-lg">
                            <div class="flex items-center gap-2 text-red-300 mb-1">
                                <i class="ph ph-warning-circle"></i>
                                <span class="font-medium">Severe Weather Potential</span>
                            </div>
                            <div class="text-sm text-gray-300">
                                High CAPE and negative LI suggest potential for severe thunderstorms
                            </div>
                        </div>
                    ` : cape > 1000 && liftedIndex < 0 ? `
                        <div class="p-3 bg-yellow-500 bg-opacity-20 rounded-lg">
                            <div class="flex items-center gap-2 text-yellow-300 mb-1">
                                <i class="ph ph-cloud-lightning"></i>
                                <span class="font-medium">Thunderstorm Potential</span>
                            </div>
                            <div class="text-sm text-gray-300">
                                Atmospheric conditions favor thunderstorm development
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        },
        
        destroy() {
            if (this.refreshTimeout) {
                clearInterval(this.refreshTimeout);
                this.refreshTimeout = null;
            }
            this.container = null;
            this.deps = null;
            this.weatherData = null;
            this.airQualityData = null;
            this.marineData = null;
            this.historyData = null;
            this.nowcastData = null;
        }
    },
    
    calendar: {
        id: 'calendar',
        title: 'Upcoming',
        icon: 'ph-calendar',
        size: 'col-span-1',
        order: 4,
        container: null,
        deps: null,
        
        async mount(container, deps) {
            this.container = container;
            this.deps = deps;
            
            container.innerHTML = `
                <div class="calendar-widget">
                    <div class="flex items-center gap-3 mb-4">
                        <i class="ph ph-calendar text-2xl"></i>
                        <h3 class="text-lg font-semibold">Upcoming</h3>
                    </div>
                    
                    <div id="calendar-content" class="calendar-content">
                        <div class="text-center text-gray-300 py-8">
                            <i class="ph ph-spinner text-2xl animate-spin mb-2"></i>
                            <p>Loading events...</p>
                        </div>
                    </div>
                </div>
            `;
        },
        
        async load(state, services) {
            try {
                this.calendarData = await services.calendar.getUpcoming();
            } catch (error) {
                console.error('Failed to load calendar:', error);
                this.calendarData = null;
            }
        },
        
        render(state) {
            const contentEl = this.container?.querySelector('#calendar-content');
            if (!contentEl) return;
            
            if (!this.calendarData || this.calendarData.length === 0) {
                contentEl.innerHTML = `
                    <div class="text-center text-gray-300 py-4">
                        <i class="ph ph-calendar-x text-xl mb-2"></i>
                        <p class="text-sm">No upcoming events</p>
                    </div>
                `;
                return;
            }
            
            const events = this.calendarData.slice(0, 3); // Show only first 3 events
            
            contentEl.innerHTML = `
                <div class="space-y-3">
                    ${events.map(event => {
                        const timeStr = this.formatEventTime(event.time);
                        const typeIcon = this.getEventIcon(event.type);
                        
                        return `
                            <div class="flex items-start gap-3 p-2 hover:bg-white hover:bg-opacity-5 rounded-lg transition-colors">
                                <i class="ph ${typeIcon} text-lg mt-0.5 flex-shrink-0"></i>
                                <div class="flex-1 min-w-0">
                                    <div class="font-medium text-sm truncate">${event.title}</div>
                                    <div class="text-xs text-gray-400">${timeStr}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        },
        
        formatEventTime(date) {
            const now = new Date();
            const diff = date.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const days = Math.floor(hours / 24);
            
            if (days > 1) {
                return `${days} days`;
            } else if (days === 1) {
                return 'Tomorrow';
            } else if (hours > 1) {
                return `${hours} hours`;
            } else if (hours === 1) {
                return '1 hour';
            } else {
                return 'Soon';
            }
        },
        
        getEventIcon(type) {
            const icons = {
                meeting: 'ph-users',
                appointment: 'ph-clock',
                deadline: 'ph-flag',
                reminder: 'ph-bell'
            };
            return icons[type] || 'ph-calendar-check';
        },
        
        destroy() {
            this.container = null;
            this.deps = null;
            this.calendarData = null;
        }
    }
};
