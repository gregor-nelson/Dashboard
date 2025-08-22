import { advancedWeather } from './weatherCore.js';
import { currentWeather } from './weatherCurrent.js';
import { hourlyWeather } from './weatherHourly.js';
import { dailyWeather } from './weatherDaily.js';
import { airQualityWeather } from './weatherAirQuality.js';
import { marineWeather } from './weatherMarine.js';
import { historyWeather } from './weatherHistory.js';

export const weatherWidgets = {
    advancedWeather,
    currentWeather,
    hourlyWeather,
    dailyWeather,
    airQualityWeather,
    marineWeather,
    historyWeather
};
