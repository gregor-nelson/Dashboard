export function createWeatherCard(title, icon) {
    return `
    <div class="weather-widget-card p-6">
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
                <i class="ph ${icon} text-2xl"></i>
                <h3 class="text-xl font-semibold">${title}</h3>
            </div>
            <div class="flex items-center gap-2">
                <button class="widget-refresh p-2 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded-lg transition-colors">
                    <i class="ph ph-arrows-clockwise text-lg"></i>
                </button>
            </div>
        </div>
        <div class="widget-content"></div>
        <div class="text-xs text-neutral-500 dark:text-neutral-400 mt-4 text-center">
            <a href="https://open-meteo.com/" target="_blank">Weather data by Open-Meteo</a>
        </div>
    </div>`;
}
