import { createWeatherCard } from './weatherShared.js';
import { MarineAnalysis } from './marineAnalysis.js';

export const marineWeather = {
    id: 'marine-weather',
    title: 'Marine Weather',
    icon: 'ph-anchor',
    size: 'md:col-span-2',
    order: 8,
    container: null,
    deps: null,
    marineAnalysis: null,
    
    mount(container, deps) {
        this.container = container;
        this.deps = deps;
        this.marineAnalysis = new MarineAnalysis(deps.utils.weatherUtils);
        container.innerHTML = createWeatherCard(this.title, this.icon);
        this.contentEl = container.querySelector('.widget-content');
        container.querySelector('.widget-refresh').addEventListener('click', () => this.refresh());
        this.render();
    },
    
    render() {
        if (!this.deps.state.marineData) {
            this.contentEl.innerHTML = '<div class="text-center text-neutral-500 dark:text-neutral-400 py-8"><i class="ph ph-spinner text-2xl animate-spin mb-2"></i><p>Loading...</p></div>';
            return;
        }
        this.marineAnalysis.renderMarineWeather(this.contentEl, this.deps.state.marineData, this.deps.utils.weatherUtils);
    },
    
    refresh() {
        this.render();
    },
    
    handleSettingsChange() {
        this.render();
    },
    
    destroy() {
        this.container = null;
        this.deps = null;
        this.marineAnalysis = null;
    }
};
