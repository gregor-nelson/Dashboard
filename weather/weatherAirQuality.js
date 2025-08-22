import { createWeatherCard } from './weatherShared.js';
import { advancedWeather } from './weatherCore.js';

export const airQualityWeather = {
    id: 'air-quality-weather',
    title: 'Air Quality',
    icon: 'ph-waves',
    size: 'md:col-span-2',
    order: 7,
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
        if (!this.deps.state.airQualityData) {
            this.contentEl.innerHTML = '<div class="text-center text-neutral-500 dark:text-neutral-400 py-8"><i class="ph ph-spinner text-2xl animate-spin mb-2"></i><p>Loading...</p></div>';
            return;
        }
        advancedWeather.deps = this.deps;
        advancedWeather.airQualityData = this.deps.state.airQualityData;
        advancedWeather.renderAirQuality(this.contentEl);
    },
    refresh() {
        this.render();
    },
    handleSettingsChange() {
        this.render();
    }
};
