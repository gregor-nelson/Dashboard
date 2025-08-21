// Widget Registry
import { renderUtils } from './testing.js';
import { weatherWidgets } from "./weather/weatherWidgets.js";
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
    ...weatherWidgets,
    
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
