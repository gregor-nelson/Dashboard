export class MarineAnalysis {
    constructor(weatherUtils) {
        this.weatherUtils = weatherUtils;
    }

    calculateSeaState(waveHeight) {
        if (waveHeight === null || waveHeight === undefined) return null;
        
        const wmoScale = [
            { min: 0, max: 0, code: 0, description: 'Calm', severity: 'low' },
            { min: 0, max: 0.1, code: 1, description: 'Calm', severity: 'low' },
            { min: 0.1, max: 0.5, code: 2, description: 'Smooth', severity: 'low' },
            { min: 0.5, max: 1.25, code: 3, description: 'Slight', severity: 'low' },
            { min: 1.25, max: 2.5, code: 4, description: 'Moderate', severity: 'moderate' },
            { min: 2.5, max: 4, code: 5, description: 'Rough', severity: 'moderate' },
            { min: 4, max: 6, code: 6, description: 'Very Rough', severity: 'high' },
            { min: 6, max: 9, code: 7, description: 'High', severity: 'high' },
            { min: 9, max: 14, code: 8, description: 'Very High', severity: 'extreme' },
            { min: 14, max: Infinity, code: 9, description: 'Phenomenal', severity: 'extreme' }
        ];

        // Handle exact 0 case first (WMO Code 0)
        if (waveHeight === 0) {
            return wmoScale[0];
        }

        // Find the appropriate range for non-zero values
        for (const state of wmoScale) {
            if (waveHeight > state.min && waveHeight <= state.max) {
                return state;
            }
        }
        return wmoScale[wmoScale.length - 1];
    }

    extractWaveComponents(current) {
        // Pure API data extraction with graceful degradation
        const waveHeight = current.wave_height;
        const windWaveHeight = current.wind_wave_height;
        const swellWaveHeight = current.swell_wave_height;
        
        // Validate that we have the minimum required data
        if (waveHeight === null || waveHeight === undefined) {
            return { error: 'NO_WAVE_DATA', message: 'Total wave height not available' };
        }
        
        if (windWaveHeight === null || windWaveHeight === undefined) {
            return { error: 'NO_WIND_WAVE_DATA', message: 'Wind wave height not available' };
        }
        
        // Use API swell data if available, otherwise show as unavailable
        let swellHeight = swellWaveHeight;
        let dataAvailable = true;
        
        if (swellWaveHeight === null || swellWaveHeight === undefined) {
            swellHeight = null;
            dataAvailable = false;
        }
        
        // Calculate simple percentages only if both components are available
        let swellPercentage = null;
        let windPercentage = null;
        let dominantSource = null;
        
        if (dataAvailable && waveHeight > 0) {
            // Simple height-based percentages (no energy calculations)
            const totalComponents = swellHeight + windWaveHeight;
            if (totalComponents > 0) {
                swellPercentage = Math.round((swellHeight / totalComponents) * 100);
                windPercentage = Math.round((windWaveHeight / totalComponents) * 100);
                
                // Ensure percentages add to 100% (handle rounding)
                if (swellPercentage + windPercentage !== 100) {
                    if (swellHeight >= windWaveHeight) {
                        swellPercentage = 100 - windPercentage;
                    } else {
                        windPercentage = 100 - swellPercentage;
                    }
                }
                
                dominantSource = swellHeight >= windWaveHeight ? 'swell' : 'wind';
            }
        }
        
        return {
            swellHeight,
            windWaveHeight,
            swellPercentage,
            windPercentage,
            dominantSource,
            dataAvailable
        };
    }

    detectCrossSeaConditions(waveDirection, windWaveDirection) {
        // Allow zero degrees - it's valid direction data
        if (waveDirection === null || waveDirection === undefined || windWaveDirection === null || windWaveDirection === undefined) return null;

        let angleDiff = Math.abs(waveDirection - windWaveDirection);
        if (angleDiff > 180) {
            angleDiff = 360 - angleDiff;
        }

        const isCrossSea = angleDiff > 45;
        
        return {
            angleDifference: Math.round(angleDiff),
            isCrossSea,
            severity: angleDiff > 90 ? 'high' : angleDiff > 60 ? 'moderate' : 'low'
        };
    }

    calculateWaveTrend(hourlyData) {
        try {
            // Enhanced input validation
            if (!hourlyData || !Array.isArray(hourlyData)) {
                return { error: 'INVALID_INPUT', message: 'Hourly data must be an array' };
            }
            
            if (hourlyData.length < 2) {
                return { error: 'INSUFFICIENT_DATA', message: 'At least 2 hours of data required' };
            }

            const validData = hourlyData
                .filter(hour => {
                    if (!hour || typeof hour !== 'object') return false;
                    const height = hour.wave_height;
                    return height !== null && height !== undefined && 
                           typeof height === 'number' && height >= 0 && height <= 30; // Max 30m reasonable wave height
                })
                .slice(0, 48);

            if (validData.length < 2) {
                return { error: 'NO_VALID_DATA', message: 'Insufficient valid wave height measurements' };
            }

            const current = validData[0].wave_height;
            // Use 12-hour lookback or available data length
            const lookbackHours = Math.min(12, validData.length - 1);
            const past = validData[lookbackHours].wave_height;
            
            // Prevent division by very small numbers
            if (past < 0.05) { // More strict threshold
                return { error: 'BASELINE_TOO_SMALL', message: 'Historical wave height too small for trend calculation' };
            }
        
            const change = current - past;
            const changePercent = Math.round((change / past) * 100);
            const absChangePercent = Math.abs(changePercent);

            let trend = 'stable';
            let intensity = 'normal';
            
            // More refined trend analysis based on marine standards
            if (absChangePercent > 30) {
                trend = changePercent > 0 ? 'rising' : 'falling';
                intensity = 'rapid';
            } else if (absChangePercent > 15) {
                trend = changePercent > 0 ? 'rising' : 'falling';
                intensity = 'moderate';
            } else if (absChangePercent > 5) {
                trend = changePercent > 0 ? 'rising-slowly' : 'falling-slowly';
                intensity = 'slight';
            }
            
            // Calculate statistical confidence based on data consistency
            const dataVariance = this.calculateVariance(validData.map(d => d.wave_height));
            const meanHeight = validData.reduce((sum, d) => sum + d.wave_height, 0) / validData.length;
            const coefficientOfVariation = Math.sqrt(dataVariance) / meanHeight;
            
            let statisticalConfidence = 'high';
            if (coefficientOfVariation > 0.5) {
                statisticalConfidence = 'low';
            } else if (coefficientOfVariation > 0.25) {
                statisticalConfidence = 'moderate';
            }

            return {
                change: Math.round(change * 100) / 100, // Higher precision
                changePercent,
                trend,
                intensity,
                period: `${lookbackHours}h`,
                reliability: validData.length > 12 ? 'high' : 'moderate',
                statisticalConfidence,
                dataPoints: validData.length,
                coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100
            };
            
        } catch (error) {
            return { 
                error: 'CALCULATION_ERROR', 
                message: `Wave trend calculation failed: ${error.message}` 
            };
        }
    }
    
    calculateVariance(values) {
        if (values.length < 2) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length - 1);
    }

    categorizeWavePeriod(period, latitude = null) {
        if (!period || period <= 0) return { error: 'INVALID_PERIOD', message: 'Wave period must be positive' };

        // Regional adjustments for wave period classification
        let regionAdjustment = 0;
        if (latitude !== null) {
            const absLat = Math.abs(latitude);
            if (absLat > 60) {
                // Arctic/Antarctic: Shorter fetch, different characteristics
                regionAdjustment = -1;
            } else if (absLat < 30) {
                // Tropical: Trade wind effects, longer fetch
                regionAdjustment = 1;
            }
            // Temperate zones (30-60°): No adjustment (baseline)
        }

        const adjustedPeriod = period + regionAdjustment;
        
        // Enhanced classification with regional considerations
        // Based on WMO guidelines and regional oceanographic studies
        if (adjustedPeriod < 4) {
            return { 
                category: 'very-short', 
                description: 'Wind Chop', 
                comfort: 'very-uncomfortable', 
                type: 'wind-waves',
                wmoCategory: 'Locally generated',
                surfConditions: 'Choppy, difficult navigation',
                energyLevel: 'low'
            };
        } else if (adjustedPeriod < 7) {
            return { 
                category: 'short', 
                description: 'Wind Swell', 
                comfort: 'uncomfortable', 
                type: 'wind-swell',
                wmoCategory: 'Regional wind waves',
                surfConditions: 'Moderate chop, caution advised',
                energyLevel: 'moderate'
            };
        } else if (adjustedPeriod < 10) {
            return { 
                category: 'medium-short', 
                description: 'Mixed Swell', 
                comfort: 'moderate', 
                type: 'mixed-swell',
                wmoCategory: 'Transition waves',
                surfConditions: 'Variable conditions',
                energyLevel: 'moderate-high'
            };
        } else if (adjustedPeriod < 14) {
            return { 
                category: 'medium', 
                description: 'Ground Swell', 
                comfort: 'comfortable', 
                type: 'ground-swell',
                wmoCategory: 'Distant weather systems',
                surfConditions: 'Good for most activities',
                energyLevel: 'high'
            };
        } else if (adjustedPeriod < 18) {
            return { 
                category: 'long', 
                description: 'Long Period Swell', 
                comfort: 'very-comfortable', 
                type: 'long-swell',
                wmoCategory: 'Storm-generated swells',
                surfConditions: 'Excellent, smooth rides',
                energyLevel: 'very-high'
            };
        } else if (adjustedPeriod < 25) {
            return { 
                category: 'very-long', 
                description: 'Powerful Swell', 
                comfort: 'smooth', 
                type: 'distant-swell',
                wmoCategory: 'Major storm systems',
                surfConditions: 'Premium conditions',
                energyLevel: 'extreme'
            };
        } else {
            return { 
                category: 'ultra-long', 
                description: 'Tsunami-like Period', 
                comfort: 'deceptively-calm', 
                type: 'extreme-period',
                wmoCategory: 'Exceptional events',
                surfConditions: 'Potentially dangerous undertows',
                energyLevel: 'extreme-high'
            };
        }
    }

    validateApiResponse(marineData) {
        const errors = [];
        
        // Validate required structure
        if (!marineData || typeof marineData !== 'object') {
            return { valid: false, errors: ['API response must be an object'] };
        }
        
        if (!marineData.current || typeof marineData.current !== 'object') {
            errors.push('Missing current weather data');
        } else {
            // Validate critical current data fields
            const requiredFields = ['wave_height', 'wind_wave_height', 'wave_direction', 'wave_period'];
            for (const field of requiredFields) {
                const value = marineData.current[field];
                if (value === null || value === undefined) {
                    errors.push(`Missing current.${field}`);
                } else if (typeof value !== 'number') {
                    errors.push(`Invalid type for current.${field}: expected number, got ${typeof value}`);
                } else if (field.includes('height') && (value < 0 || value > 30)) {
                    errors.push(`Invalid range for current.${field}: ${value}m (expected 0-30m)`);
                } else if (field.includes('direction') && (value < 0 || value >= 360)) {
                    errors.push(`Invalid range for current.${field}: ${value}° (expected 0-360°)`);
                } else if (field === 'wave_period' && (value < 0 || value > 30)) {
                    errors.push(`Invalid range for current.${field}: ${value}s (expected 0-30s)`);
                }
            }
        }
        
        // Validate hourly data structure if present
        if (marineData.hourly) {
            if (typeof marineData.hourly !== 'object') {
                errors.push('Hourly data must be an object');
            } else {
                const { wave_height, time } = marineData.hourly;
                if (wave_height && !Array.isArray(wave_height)) {
                    errors.push('Hourly wave_height must be an array');
                } else if (wave_height && wave_height.length === 0) {
                    errors.push('Hourly wave_height array is empty');
                } else if (wave_height && wave_height.some(h => typeof h !== 'number' || h < 0 || h > 30)) {
                    errors.push('Hourly wave_height contains invalid values');
                }
                
                if (time && !Array.isArray(time)) {
                    errors.push('Hourly time must be an array');
                } else if (time && wave_height && time.length !== wave_height.length) {
                    errors.push('Hourly time and wave_height arrays must have same length');
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings: this.generateDataWarnings(marineData)
        };
    }
    
    generateDataWarnings(marineData) {
        const warnings = [];
        const current = marineData.current;
        
        if (current) {
            // Check for potentially unusual but valid conditions
            if (current.wave_height > 10) warnings.push('Extreme wave height detected');
            if (current.wind_wave_height > current.wave_height * 0.8) warnings.push('Wind waves dominate total wave height');
            if (current.wave_period && current.wave_period > 20) warnings.push('Unusually long wave period');
            
            // Check for data consistency
            if (current.swell_wave_height && current.wind_wave_height) {
                const sumComponents = current.swell_wave_height + current.wind_wave_height;
                if (Math.abs(sumComponents - current.wave_height) > current.wave_height * 0.2) {
                    warnings.push('Wave components may not sum correctly - vector addition effects');
                }
            }
        }
        
        return warnings;
    }

    processHourlyForecastData(marineData) {
        if (!marineData.hourly) return null;
        
        const hourlyData = marineData.hourly;
        const times = hourlyData.time || [];
        const waveHeight = hourlyData.wave_height || [];
        const windWaveHeight = hourlyData.wind_wave_height || [];
        const swellWaveHeight = hourlyData.swell_wave_height || [];
        const waveDirection = hourlyData.wave_direction || [];
        const wavePeriod = hourlyData.wave_period || [];
        const windWaveDirection = hourlyData.wind_wave_direction || [];
        const windWavePeriod = hourlyData.wind_wave_period || [];
        const swellWaveDirection = hourlyData.swell_wave_direction || [];
        const swellWavePeriod = hourlyData.swell_wave_period || [];

        const processedData = [];
        const maxPoints = Math.min(48, waveHeight.length);

        for (let i = 0; i < maxPoints; i++) {
            const timestamp = new Date(times[i]);
            const dataPoint = {
                time: times[i],
                timestamp: timestamp.getTime(),
                hour: timestamp.getHours(),
                dateLabel: timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                timeLabel: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                wave_height: waveHeight[i] || 0,
                wind_wave_height: windWaveHeight[i] || 0,
                swell_wave_height: swellWaveHeight[i] || null,
                wave_direction: waveDirection[i] || null,
                wave_period: wavePeriod[i] || null,
                wind_wave_direction: windWaveDirection[i] || null,
                wind_wave_period: windWavePeriod[i] || null,
                swell_wave_direction: swellWaveDirection[i] || null,
                swell_wave_period: swellWavePeriod[i] || null
            };
            processedData.push(dataPoint);
        }

        return processedData;
    }

    prepareChartData(hourlyData, timeRange = 48) {
        if (!hourlyData || hourlyData.length === 0) return null;

        const dataToShow = hourlyData.slice(0, timeRange);
        const now = new Date().getTime();

        // Generate labels - show every 4 hours for readability
        const labels = dataToShow.map((item, index) => {
            if (index % 4 === 0 || index === 0 || index === dataToShow.length - 1) {
                return item.timeLabel;
            }
            return '';
        });

        // Prepare datasets for Chart.js
        const datasets = [
            {
                label: 'Swell Height',
                data: dataToShow.map(item => item.swell_wave_height || 0),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 0.8)',
                borderWidth: 1,
                fill: 'origin',
                stack: 'waves',
                tension: 0.2
            },
            {
                label: 'Wind Waves',
                data: dataToShow.map(item => item.wind_wave_height || 0),
                backgroundColor: 'rgba(249, 115, 22, 0.6)',
                borderColor: 'rgba(249, 115, 22, 0.8)',
                borderWidth: 1,
                fill: 'stack', // Fill as stacked area
                stack: 'waves',
                tension: 0.2
            },
            {
                label: 'Total Wave Height',
                data: dataToShow.map(item => item.wave_height || 0),
                backgroundColor: 'transparent',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 3,
                fill: false,
                type: 'line',
                pointRadius: 0,
                pointHoverRadius: 6,
                tension: 0.2
            }
        ];

        // Find current time index for NOW marker
        const currentIndex = dataToShow.findIndex(item => item.timestamp > now);

        return {
            labels,
            datasets,
            currentIndex,
            rawData: dataToShow
        };
    }

    createWaveChart(canvasId, chartData, isDarkMode = false) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        // Define colors based on theme
        const colors = isDarkMode ? {
            grid: 'rgba(115, 115, 115, 0.3)',
            text: 'rgba(245, 245, 245, 0.8)',
            nowLine: 'rgba(239, 68, 68, 0.8)'
        } : {
            grid: 'rgba(163, 163, 163, 0.3)',
            text: 'rgba(64, 64, 64, 0.8)',
            nowLine: 'rgba(239, 68, 68, 0.8)'
        };

        const config = {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 0,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: colors.text,
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        enabled: false, // Disable default tooltip
                        external: function(context) {
                            // Create custom HTML tooltip
                            const {chart, tooltip} = context;
                            
                            // Get or create tooltip element
                            let tooltipEl = chart.canvas.parentNode.querySelector('#wave-chart-tooltip');
                            if (!tooltipEl) {
                                tooltipEl = document.createElement('div');
                                tooltipEl.id = 'wave-chart-tooltip';
                                tooltipEl.style.cssText = `
                                    position: absolute;
                                    pointer-events: none;
                                    opacity: 0;
                                    transition: opacity 0.2s ease;
                                    z-index: 1000;
                                `;
                                chart.canvas.parentNode.appendChild(tooltipEl);
                            }

                            // Hide if no tooltip
                            if (tooltip.opacity === 0) {
                                tooltipEl.style.opacity = 0;
                                return;
                            }

                            // Get data for tooltip
                            if (tooltip.dataPoints && tooltip.dataPoints.length > 0) {
                                const dataIndex = tooltip.dataPoints[0].dataIndex;
                                const data = chartData.rawData[dataIndex];
                                
                                // Create structured tooltip content
                                const tooltipContent = `
                                    <div class="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-xl p-4 min-w-48 max-w-64">
                                        <!-- Time Header -->
                                        <div class="text-center mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-600">
                                            <div class="font-semibold text-neutral-800 dark:text-neutral-100">${data.dateLabel}</div>
                                            <div class="text-sm text-neutral-600 dark:text-neutral-400">${data.timeLabel}</div>
                                        </div>
                                        
                                        <!-- Wave Heights Section -->
                                        <div class="space-y-2 mb-3">
                                            <div class="text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">Wave Heights</div>
                                            
                                            <!-- Total Wave -->
                                            <div class="flex items-center justify-between py-1">
                                                <div class="flex items-center gap-2">
                                                    <div class="w-3 h-0.5 bg-blue-600 rounded"></div>
                                                    <span class="text-sm text-neutral-700 dark:text-neutral-300">Total</span>
                                                </div>
                                                <span class="font-semibold text-neutral-800 dark:text-neutral-100">
                                                    ${(data.wave_height !== null && data.wave_height !== undefined) ? data.wave_height.toFixed(1) + 'm' : 'N/A'}
                                                </span>
                                            </div>
                                            
                                            <!-- Swell -->
                                            <div class="flex items-center justify-between py-1">
                                                <div class="flex items-center gap-2">
                                                    <div class="w-3 h-3 bg-blue-500 rounded opacity-60"></div>
                                                    <span class="text-sm text-neutral-700 dark:text-neutral-300">Swell</span>
                                                </div>
                                                <span class="font-medium text-neutral-700 dark:text-neutral-200">
                                                    ${(data.swell_wave_height !== null && data.swell_wave_height !== undefined) ? data.swell_wave_height.toFixed(1) + 'm' : 'N/A'}
                                                </span>
                                            </div>
                                            
                                            <!-- Wind Waves -->
                                            <div class="flex items-center justify-between py-1">
                                                <div class="flex items-center gap-2">
                                                    <div class="w-3 h-3 bg-orange-500 rounded opacity-60"></div>
                                                    <span class="text-sm text-neutral-700 dark:text-neutral-300">Wind</span>
                                                </div>
                                                <span class="font-medium text-neutral-700 dark:text-neutral-200">
                                                    ${(data.wind_wave_height !== null && data.wind_wave_height !== undefined) ? data.wind_wave_height.toFixed(1) + 'm' : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <!-- Wave Properties Section -->
                                        <div class="pt-2 border-t border-neutral-200 dark:border-neutral-600">
                                            <div class="grid grid-cols-2 gap-3 text-sm">
                                                <div class="text-center">
                                                    <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Direction</div>
                                                    <div class="font-medium text-neutral-700 dark:text-neutral-200">
                                                        ${data.wave_direction ? Math.round(data.wave_direction) + '°' : 'N/A'}
                                                    </div>
                                                </div>
                                                <div class="text-center">
                                                    <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Period</div>
                                                    <div class="font-medium text-neutral-700 dark:text-neutral-200">
                                                        ${data.wave_period ? data.wave_period.toFixed(1) + 's' : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                
                                tooltipEl.innerHTML = tooltipContent;
                            }

                            // Position tooltip
                            const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;
                            tooltipEl.style.left = positionX + tooltip.caretX + 'px';
                            tooltipEl.style.top = positionY + tooltip.caretY - tooltipEl.offsetHeight - 10 + 'px';
                            tooltipEl.style.opacity = 1;
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: colors.grid,
                            drawBorder: false,
                        },
                        ticks: {
                            color: colors.text,
                            font: {
                                size: 11
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time',
                            color: colors.text,
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: colors.grid,
                            drawBorder: false,
                        },
                        ticks: {
                            color: colors.text,
                            font: {
                                size: 11
                            },
                            callback: function(value) {
                                return value.toFixed(1) + 'm';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Wave Height (meters)',
                            color: colors.text,
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 4
                    }
                }
            },
            plugins: [{
                id: 'nowLine',
                afterDraw: (chart) => {
                    if (chartData.currentIndex >= 0 && chartData.currentIndex < chartData.labels.length) {
                        const ctx = chart.ctx;
                        const xAxis = chart.scales.x;
                        const yAxis = chart.scales.y;
                        
                        const x = xAxis.getPixelForValue(chartData.currentIndex);
                        
                        ctx.save();
                        ctx.strokeStyle = colors.nowLine;
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 5]);
                        
                        ctx.beginPath();
                        ctx.moveTo(x, yAxis.top);
                        ctx.lineTo(x, yAxis.bottom);
                        ctx.stroke();
                        
                        // Add "NOW" label
                        ctx.fillStyle = colors.nowLine;
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('NOW', x, yAxis.top - 5);
                        
                        ctx.restore();
                    }
                }
            }]
        };

        return new Chart(ctx, config);
    }

    renderDirectionEvolution(hourlyData, timeRange = 48, isDarkMode = false) {
        if (!hourlyData || hourlyData.length === 0) {
            return '<div class="text-center text-neutral-500 dark:text-neutral-400 py-4 text-sm">No direction data available</div>';
        }

        const dataToShow = hourlyData.slice(0, timeRange);
        const containerWidth = 100; // Percentage
        const arrowSpacing = containerWidth / dataToShow.length;

        let directionIndicators = '';
        
        for (let i = 0; i < dataToShow.length; i += 3) { // Show every 3rd indicator to avoid crowding
            const data = dataToShow[i];
            const leftPosition = (i * arrowSpacing);
            
            const waveDir = data.wave_direction;
            const windWaveDir = data.wind_wave_direction;
            const swellDir = data.swell_wave_direction;
            
            // Main wave direction (most important)
            if (waveDir !== null && waveDir !== undefined) {
                const rotation = waveDir + 180; // Point in direction waves are traveling TO
                directionIndicators += `
                    <div class="absolute flex flex-col items-center" style="left: ${leftPosition}%;">
                        <div class="w-4 h-4 rounded-full bg-blue-500 dark:bg-blue-400 opacity-30 flex items-center justify-center mb-1">
                            <div class="transform" style="transform: rotate(${rotation}deg);">
                                <i class="ph-fill ph-caret-up text-xs text-blue-700 dark:text-blue-300"></i>
                            </div>
                        </div>
                        <div class="text-xs text-neutral-600 dark:text-neutral-400">
                            ${Math.round(waveDir)}°
                        </div>
                    </div>
                `;
            }
            
            // Wind wave direction (if significantly different)
            if (windWaveDir !== null && windWaveDir !== undefined && 
                waveDir !== null && Math.abs(windWaveDir - waveDir) > 20) {
                const rotation = windWaveDir + 180;
                directionIndicators += `
                    <div class="absolute flex flex-col items-center" style="left: ${leftPosition + 1}%;">
                        <div class="w-3 h-3 rounded-full bg-orange-500 dark:bg-orange-400 opacity-40 flex items-center justify-center mb-1">
                            <div class="transform" style="transform: rotate(${rotation}deg);">
                                <i class="ph-fill ph-caret-up text-xs text-orange-700 dark:text-orange-300"></i>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        return `
            <div class="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-4 mt-4">
                <h4 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Wave Direction Evolution</h4>
                <div class="relative h-16 bg-neutral-50 dark:bg-neutral-800 rounded border">
                    ${directionIndicators}
                </div>
                <div class="flex items-center justify-center gap-4 mt-3 text-xs">
                    <div class="flex items-center gap-1">
                        <div class="w-4 h-4 bg-blue-500 rounded-full opacity-30"></div>
                        <span class="text-neutral-600 dark:text-neutral-300">Total Wave</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <div class="w-3 h-3 bg-orange-500 rounded-full opacity-40"></div>
                        <span class="text-neutral-600 dark:text-neutral-300">Wind Wave</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderMarineWeather(contentEl, marineData, weatherUtils) {
        // Validate API response integrity
        const validation = this.validateApiResponse(marineData);
        if (!validation.valid) {
            contentEl.innerHTML = this.renderError('Data Validation Failed', validation.errors);
            return;
        }
        
        // Show warnings if present
        if (validation.warnings.length > 0) {
            console.warn('Marine data warnings:', validation.warnings);
        }

        const current = marineData.current;
        const latitude = marineData.latitude || null;
        
        // Process hourly data for charts
        const hourlyData = this.processHourlyForecastData(marineData);
        
        // Legacy format for existing trend analysis
        let hourly = [];
        if (marineData.hourly?.wave_height && Array.isArray(marineData.hourly.wave_height)) {
            const waveHeights = marineData.hourly.wave_height;
            const times = marineData.hourly.time || [];
            
            const chunkSize = 24;
            for (let i = 0; i < Math.min(waveHeights.length, 48); i += chunkSize) {
                const chunk = waveHeights.slice(i, i + chunkSize).map((height, index) => ({
                    wave_height: height,
                    time: times[i + index]
                }));
                hourly.push(...chunk);
            }
        }

        const waveHeight = current.wave_height;
        const windWaveHeight = current.wind_wave_height;
        const swellWaveHeight = current.swell_wave_height;
        const waveDirection = current.wave_direction;
        const windWaveDirection = current.wind_wave_direction;
        const wavePeriod = current.wave_period;

        const seaState = this.calculateSeaState(waveHeight);
        const waveComponents = this.extractWaveComponents(current);
        const crossSea = this.detectCrossSeaConditions(waveDirection, windWaveDirection);
        const waveTrend = this.calculateWaveTrend(hourly);
        const periodInfo = this.categorizeWavePeriod(wavePeriod, latitude);

        // Generate unique IDs for chart elements
        const chartId = `wave-chart-${Date.now()}`;
        const currentTimeRange = 48; // Default to 48 hours

        // Detect dark mode
        const isDarkMode = document.documentElement.classList.contains('dark');

        contentEl.innerHTML = `
            <div class="space-y-4">
                <!-- Primary Wave Display -->
                <div class="text-center p-6 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg">
                    <i class="ph ph-waves text-4xl text-neutral-600 dark:text-neutral-300 mb-3"></i>
                    <div class="text-4xl font-bold mb-2 text-neutral-800 dark:text-neutral-100">${waveHeight !== null && waveHeight !== undefined ? waveHeight.toFixed(1) + 'm' : 'N/A'}</div>
                    <div class="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-3">Significant Wave Height</div>
                    
                    ${seaState ? `
                        <div class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${this.getSeaStateColorNeutral(seaState.severity)}">
                            ${seaState.description} Sea
                        </div>
                    ` : ''}
                    
                    ${waveTrend && !waveTrend.error ? `
                        <div class="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-600">
                            <div class="flex items-center justify-center gap-2 text-sm">
                                <i class="ph ${this.getTrendIcon(waveTrend.trend)} text-lg ${this.getTrendColorNeutral(waveTrend.trend)}"></i>
                                <span class="font-medium text-neutral-700 dark:text-neutral-200">
                                    ${waveTrend.changePercent > 0 ? '+' : ''}${waveTrend.changePercent}%
                                </span>
                                <span class="text-neutral-500 dark:text-neutral-400">
                                    over ${waveTrend.period}
                                </span>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Cross-Sea Warning (only for high severity) -->
                ${crossSea && crossSea.isCrossSea && crossSea.severity === 'high' ? `
                    <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <div class="flex items-center gap-2 text-red-700 dark:text-red-300">
                            <i class="ph ph-warning text-lg"></i>
                            <span class="font-semibold">Cross-Sea Warning</span>
                        </div>
                        <p class="text-sm text-red-600 dark:text-red-400 mt-1">
                            Dangerous wave patterns detected - exercise extreme caution
                        </p>
                    </div>
                ` : ''}

                <!-- Wave Component Breakdown -->
                ${waveComponents && !waveComponents.error ? `
                    <div class="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-4">
                        <h4 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Wave Components</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="text-center">
                                <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Swell</div>
                                <div class="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                                    ${waveComponents.swellHeight !== null && waveComponents.swellHeight !== undefined ? waveComponents.swellHeight.toFixed(1) + 'm' : 'N/A'}
                                </div>
                                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                                    ${waveComponents.swellPercentage !== null ? waveComponents.swellPercentage + '%' : 'N/A'}
                                </div>
                            </div>
                            <div class="text-center">
                                <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Wind Waves</div>
                                <div class="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                                    ${(waveComponents.windWaveHeight !== null && waveComponents.windWaveHeight !== undefined) ? waveComponents.windWaveHeight.toFixed(1) + 'm' : 'N/A'}
                                </div>
                                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                                    ${waveComponents.windPercentage !== null ? waveComponents.windPercentage + '%' : 'N/A'}
                                </div>
                            </div>
                        </div>
                        ${waveComponents.dominantSource ? `
                            <div class="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600 text-center">
                                <span class="text-xs text-neutral-600 dark:text-neutral-300">
                                    Dominated by ${waveComponents.dominantSource === 'swell' ? 'long-period swells' : 'local wind waves'}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                ` : waveComponents && waveComponents.error ? `
                    <div class="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-4">
                        <div class="text-center text-neutral-500 dark:text-neutral-400">
                            <i class="ph ph-warning text-lg mb-2"></i>
                            <p class="text-sm">Wave component data unavailable</p>
                        </div>
                    </div>
                ` : ''}

                <!-- Wave Forecast Charts -->
                ${hourlyData ? `
                    <div class="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">48-Hour Wave Forecast</h4>
                            <div class="flex gap-2">
                                <button class="time-range-btn px-2 py-1 text-xs rounded border bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600" data-range="12">12h</button>
                                <button class="time-range-btn px-2 py-1 text-xs rounded border bg-neutral-50 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600" data-range="24">24h</button>
                                <button class="time-range-btn px-2 py-1 text-xs rounded border bg-neutral-50 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600" data-range="48">48h</button>
                            </div>
                        </div>
                        <div class="relative" style="height: 300px; width: 100%;">
                            <canvas id="${chartId}" style="width: 100%; height: 100%;"></canvas>
                        </div>
                    </div>
                    
                    <!-- Direction Evolution Panel -->
                    ${this.renderDirectionEvolution(hourlyData, currentTimeRange, isDarkMode)}
                ` : ''}

                <!-- Wave Details Grid -->
                <div class="bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg p-4">
                    <h4 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Wave Details</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div class="text-center">
                            <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Direction</div>
                            <div class="font-semibold text-neutral-800 dark:text-neutral-100">
                                ${waveDirection !== null && waveDirection !== undefined ? weatherUtils.getWindDirection(waveDirection) : 'N/A'}
                            </div>
                            <div class="text-xs text-neutral-500 dark:text-neutral-400">
                                ${waveDirection !== null && waveDirection !== undefined ? Math.round(waveDirection) + '°' : 'N/A'}
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Period</div>
                            <div class="font-semibold text-neutral-800 dark:text-neutral-100">
                                ${wavePeriod !== null && wavePeriod !== undefined ? wavePeriod.toFixed(1) + 's' : 'N/A'}
                            </div>
                            ${periodInfo && !periodInfo.error && wavePeriod !== null && wavePeriod !== undefined ? `
                                <div class="text-xs text-neutral-500 dark:text-neutral-400">${periodInfo.description}</div>
                            ` : ''}
                        </div>
                        ${crossSea && !crossSea.isCrossSea ? `
                            <div class="text-center">
                                <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Wind Wave Dir</div>
                                <div class="font-semibold text-neutral-800 dark:text-neutral-100">
                                    ${windWaveDirection !== null && windWaveDirection !== undefined ? weatherUtils.getWindDirection(windWaveDirection) : 'N/A'}
                                </div>
                                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                                    ${windWaveDirection !== null && windWaveDirection !== undefined ? Math.round(windWaveDirection) + '°' : 'N/A'}
                                </div>
                            </div>
                            <div class="text-center">
                                <div class="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Wind Wave Period</div>
                                <div class="font-semibold text-neutral-800 dark:text-neutral-100">
                                    ${current.wind_wave_period !== null && current.wind_wave_period !== undefined ? current.wind_wave_period.toFixed(1) + 's' : 'N/A'}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${periodInfo && !periodInfo.error || (crossSea && crossSea.isCrossSea && crossSea.severity !== 'high') ? `
                        <div class="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600 text-center">
                            <div class="flex items-center justify-center gap-2 text-xs flex-wrap">
                                ${periodInfo && !periodInfo.error ? `
                                    <span class="text-neutral-600 dark:text-neutral-300">Wave Type:</span>
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs border bg-neutral-50 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600">
                                        ${periodInfo.description}
                                    </span>
                                    ${periodInfo.comfort ? `
                                        <span class="text-neutral-500 dark:text-neutral-400">•</span>
                                        <span class="text-neutral-600 dark:text-neutral-300">${periodInfo.comfort.replace('-', ' ')}</span>
                                    ` : ''}
                                ` : ''}
                                ${crossSea && crossSea.isCrossSea && crossSea.severity !== 'high' ? `
                                    ${periodInfo && !periodInfo.error ? `<span class="text-neutral-500 dark:text-neutral-400">•</span>` : ''}
                                    <span class="text-neutral-600 dark:text-neutral-300">Cross-Sea:</span>
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs border ${crossSea.severity === 'moderate' ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700' : 'bg-neutral-50 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600'}">
                                        ${crossSea.angleDifference}° ${crossSea.severity}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Advanced Data (Progressive Disclosure) -->
                <div class="mt-4">
                    <details class="group">
                        <summary class="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">Technical Analysis</span>
                            <i class="ph ph-caret-down text-neutral-500 dark:text-neutral-400 group-open:rotate-180 transition-transform"></i>
                        </summary>
                        <div class="mt-2 p-4 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg space-y-3">
                            ${waveComponents && waveComponents.dataAvailable ? `
                                <div class="text-xs">
                                    <span class="font-medium text-neutral-700 dark:text-neutral-200">Data Source:</span>
                                    <span class="ml-1 text-neutral-600 dark:text-neutral-300">Direct API measurements</span>
                                </div>
                            ` : ''}
                            
                            ${waveTrend && waveTrend.dataPoints ? `
                                <div class="text-xs">
                                    <span class="font-medium text-neutral-700 dark:text-neutral-200">Trend Analysis:</span>
                                    <span class="ml-1 text-neutral-600 dark:text-neutral-300">${waveTrend.dataPoints} data points over ${waveTrend.period}</span>
                                </div>
                            ` : ''}
                            
                            ${periodInfo && !periodInfo.error && periodInfo.wmoCategory ? `
                                <div class="text-xs">
                                    <span class="font-medium text-neutral-700 dark:text-neutral-200">Wave Classification:</span>
                                    <span class="ml-1 text-neutral-600 dark:text-neutral-300">${periodInfo.wmoCategory}</span>
                                </div>
                            ` : ''}
                            
                            ${current.swell_wave_direction !== null && current.swell_wave_direction !== undefined ? `
                                <div class="text-xs">
                                    <span class="font-medium text-neutral-700 dark:text-neutral-200">Swell Direction:</span>
                                    <span class="ml-1 text-neutral-600 dark:text-neutral-300">${weatherUtils.getWindDirection(current.swell_wave_direction)} (${Math.round(current.swell_wave_direction)}°)</span>
                                </div>
                            ` : ''}
                            
                            ${current.swell_wave_period !== null && current.swell_wave_period !== undefined ? `
                                <div class="text-xs">
                                    <span class="font-medium text-neutral-700 dark:text-neutral-200">Swell Period:</span>
                                    <span class="ml-1 text-neutral-600 dark:text-neutral-300">${current.swell_wave_period.toFixed(1)}s</span>
                                </div>
                            ` : ''}
                        </div>
                    </details>
                </div>
            </div>
        `;

        // Initialize charts after DOM insertion
        if (hourlyData && hourlyData.length > 0) {
            // Use requestAnimationFrame for proper DOM layout timing
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const canvas = document.getElementById(chartId);
                    const container = canvas?.parentElement;
                    
                    if (!canvas || !container) {
                        console.warn('Canvas or container not found');
                        return;
                    }
                    
                    // Wait for container to have proper dimensions
                    const checkDimensions = () => {
                        const containerRect = container.getBoundingClientRect();
                        if (containerRect.width > 0 && containerRect.height > 0) {
                            // Force explicit canvas sizing
                            canvas.style.width = containerRect.width + 'px';
                            canvas.style.height = containerRect.height + 'px';
                            canvas.width = containerRect.width;
                            canvas.height = containerRect.height;
                            
                            const chartData = this.prepareChartData(hourlyData, currentTimeRange);
                            if (chartData) {
                                const chart = this.createWaveChart(chartId, chartData, isDarkMode);
                                
                                // Single resize after creation
                                if (chart) {
                                    requestAnimationFrame(() => chart.resize());
                                }
                                
                                // Add time range button functionality
                                const timeRangeButtons = contentEl.querySelectorAll('.time-range-btn');
                                let currentChart = chart;
                                
                                timeRangeButtons.forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            const newRange = parseInt(e.target.dataset.range);
                            
                            // Update button states
                            timeRangeButtons.forEach(b => {
                                b.className = 'time-range-btn px-2 py-1 text-xs rounded border bg-neutral-50 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600';
                            });
                            e.target.className = 'time-range-btn px-2 py-1 text-xs rounded border bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600';
                            
                            // Update chart data
                            const newChartData = this.prepareChartData(hourlyData, newRange);
                            if (newChartData && currentChart) {
                                currentChart.data.labels = newChartData.labels;
                                currentChart.data.datasets = newChartData.datasets;
                                currentChart.update('active');
                                
                                // Force resize after update to ensure proper stacking render
                                setTimeout(() => {
                                    if (currentChart) {
                                        currentChart.resize();
                                    }
                                }, 10);
                            }
                            
                            // Update direction panel
                            const directionContainer = contentEl.querySelector('[class*="bg-neutral-50"]');
                            if (directionContainer) {
                                const newDirectionHtml = this.renderDirectionEvolution(hourlyData, newRange, isDarkMode);
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = newDirectionHtml;
                                const parentContainer = directionContainer.closest('.bg-white, .dark\\:bg-neutral-700');
                                if (parentContainer) {
                                    parentContainer.replaceWith(tempDiv.firstElementChild);
                                }
                            }
                        });
                    });
                            }
                        } else {
                            // Retry if dimensions not ready
                            setTimeout(checkDimensions, 50);
                        }
                    };
                    
                    checkDimensions();
                });
            });
        }
    }

    renderError(title, errors) {
        const errorList = Array.isArray(errors) ? errors : [errors];
        return `
            <div class="text-center p-6 border-2 border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <i class="ph ph-warning-circle text-4xl text-red-500 dark:text-red-400 mb-4"></i>
                <h3 class="font-semibold text-red-800 dark:text-red-200 mb-3">${title}</h3>
                <div class="text-sm text-red-700 dark:text-red-300 space-y-1">
                    ${errorList.map(error => `<div>• ${error}</div>`).join('')}
                </div>
                <p class="text-xs text-red-600 dark:text-red-400 mt-3">Please check API response or contact support</p>
            </div>
        `;
    }

    renderNotAvailable(message = 'Not available', icon = 'ph-warning') {
        return `
            <div class="text-center text-neutral-500 dark:text-neutral-400 py-12">
                <i class="ph ${icon} text-4xl mb-4"></i>
                <p class="text-sm">${message}</p>
            </div>
        `;
    }

    getSeaStateColor(severity) {
        const colors = {
            low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
            extreme: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
        return colors[severity] || colors.moderate;
    }

    getSeaStateColorNeutral(severity) {
        const colors = {
            low: 'bg-neutral-50 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600',
            moderate: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700',
            high: 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-700',
            extreme: 'bg-red-50 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-700'
        };
        return colors[severity] || colors.moderate;
    }

    getTrendColorNeutral(trend) {
        if (trend.includes('rising')) return 'text-red-600 dark:text-red-400';
        if (trend.includes('falling')) return 'text-emerald-600 dark:text-emerald-400';
        return 'text-neutral-500 dark:text-neutral-400';
    }

    getTrendIcon(trend) {
        const icons = {
            'rising': 'ph-trend-up',
            'rising-slowly': 'ph-caret-up',
            'falling': 'ph-trend-down',
            'falling-slowly': 'ph-caret-down',
            'stable': 'ph-minus'
        };
        return icons[trend] || 'ph-minus';
    }

    getTrendColor(trend) {
        if (trend.includes('rising')) return 'text-red-500 dark:text-red-400';
        if (trend.includes('falling')) return 'text-green-500 dark:text-green-400';
        return 'text-neutral-500 dark:text-neutral-400';
    }

    getTrendIntensityColor(intensity) {
        const colors = {
            'rapid': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            'moderate': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            'slight': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'normal': 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-300'
        };
        return colors[intensity] || colors.normal;
    }

    getCrossSeaColors(severity) {
        const colorSchemes = {
            'high': {
                background: 'bg-red-50 dark:bg-red-900/20',
                border: 'border-red-200 dark:border-red-700',
                text: 'text-red-700 dark:text-red-300',
                textSecondary: 'text-red-600 dark:text-red-400'
            },
            'moderate': {
                background: 'bg-orange-50 dark:bg-orange-900/20',
                border: 'border-orange-200 dark:border-orange-700',
                text: 'text-orange-700 dark:text-orange-300',
                textSecondary: 'text-orange-600 dark:text-orange-400'
            },
            'low': {
                background: 'bg-yellow-50 dark:bg-yellow-900/20',
                border: 'border-yellow-200 dark:border-yellow-700',
                text: 'text-yellow-700 dark:text-yellow-300',
                textSecondary: 'text-yellow-600 dark:text-yellow-400'
            }
        };
        return colorSchemes[severity] || colorSchemes.moderate;
    }

    getCrossSeaSeverityColor(severity) {
        const colors = {
            'high': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            'moderate': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
            'low': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
        };
        return colors[severity] || colors.moderate;
    }

    getWaveTypeColor(type) {
        const colors = {
            'wind-waves': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            'wind-swell': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
            'ground-swell': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            'long-swell': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
            'distant-swell': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
        };
        return colors[type] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-300';
    }

    getComfortColor(comfort) {
        const colors = {
            'very-uncomfortable': 'text-red-600 dark:text-red-400',
            'uncomfortable': 'text-red-500 dark:text-red-400',
            'moderate': 'text-yellow-500 dark:text-yellow-400',
            'comfortable': 'text-green-500 dark:text-green-400',
            'very-comfortable': 'text-blue-500 dark:text-blue-400',
            'smooth': 'text-indigo-500 dark:text-indigo-400',
            'deceptively-calm': 'text-purple-500 dark:text-purple-400'
        };
        return colors[comfort] || 'text-neutral-500 dark:text-neutral-400';
    }
    
    getEnergyLevelColor(energyLevel) {
        const colors = {
            'low': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            'moderate': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
            'moderate-high': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
            'high': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            'very-high': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            'extreme': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            'extreme-high': 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200'
        };
        return colors[energyLevel] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-300';
    }
}