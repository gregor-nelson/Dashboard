import { createWeatherCard } from './weatherShared.js';
import { advancedWeather } from './weatherCore.js';

export const historyWeather = {
    id: 'weather-history',
    title: 'Weather History — Aberdeen',
    icon: 'ph-clock-counter-clockwise',
    size: 'col-span-1',
    order: 9,
    container: null,
    deps: null,
    mount(container, deps) {
        this.container = container;
        this.deps = deps;
        container.innerHTML = createWeatherCard(this.title, this.icon);
        this.contentEl = container.querySelector('.widget-content');
        container.querySelector('.widget-refresh').addEventListener('click', () => this.refresh());
        this.render();
    },
    render() {
        if (!this.deps.state.historyData) {
            this.contentEl.innerHTML = '<div class="text-center text-gray-300 py-8"><i class="ph ph-spinner text-2xl animate-spin mb-2"></i><p>Loading...</p></div>';
            return;
        }
        advancedWeather.deps = this.deps;
        advancedWeather.historyData = this.deps.state.historyData;
        advancedWeather.renderHistory(this.contentEl);
    },
    refresh() {
        this.render();
    },
    handleSettingsChange() {
        this.render();
    }
};
