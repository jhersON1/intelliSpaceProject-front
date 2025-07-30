import { Component, OnInit, OnDestroy, inject, signal, input, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format, subDays, parseISO } from 'date-fns';

import { AnalyticsService } from '../../../../core/services/analytics.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { ClickTracking, StockHistory } from '../../../../core/types/analytics.interface';

Chart.register(...registerables);

interface ChartData {
  date: string;
  clicks: number;
  views: number;
  stockLevel: number;
  utilizationFactor: number;
}

@Component({
  selector: 'app-historical-charts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Análisis Histórico</h3>
          <p class="text-sm text-gray-600 mt-1">
            Tendencias de demanda y utilización en los últimos {{ periodDays() }} días
          </p>
        </div>
        
        <!-- Period Selector -->
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-700">Período:</label>
          <select 
            (change)="onPeriodChange($event)"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
            <option value="7">Últimos 7 días</option>
            <option value="30" selected>Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">Cargando datos históricos...</span>
        </div>
      } @else if (error()) {
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">
                Error al cargar datos históricos
              </h3>
              <div class="mt-2 text-sm text-red-700">
                {{ error() }}
              </div>
              <div class="mt-4">
                <button 
                  (click)="loadHistoricalData()"
                  class="bg-red-100 px-2 py-1 rounded text-sm text-red-800 hover:bg-red-200">
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <!-- Chart Tabs -->
        <div class="border-b border-gray-200 mb-6">
          <nav class="-mb-px flex space-x-8">
            <button
              (click)="setActiveChart('demand')"
              [class]="activeChart() === 'demand' ? 
                'border-blue-500 text-blue-600' : 
                'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
              📈 Análisis de Demanda
            </button>
            <button
              (click)="setActiveChart('utilization')"
              [class]="activeChart() === 'utilization' ? 
                'border-blue-500 text-blue-600' : 
                'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
              ⚡ Factor de Utilización
            </button>
            <button
              (click)="setActiveChart('stock')"
              [class]="activeChart() === 'stock' ? 
                'border-blue-500 text-blue-600' : 
                'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
              📦 Niveles de Stock
            </button>
          </nav>
        </div>

        <!-- Chart Container -->
        <div class="relative h-80">
          <canvas #chartCanvas></canvas>
        </div>

        <!-- Chart Insights -->
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="bg-blue-50 p-4 rounded-lg">
            <div class="flex items-center">
              <div class="text-blue-600">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-blue-900">Promedio de Clicks/Día</p>
                <p class="text-2xl font-bold text-blue-600">{{ insights().avgClicksPerDay.toFixed(1) }}</p>
              </div>
            </div>
          </div>

          <div class="bg-yellow-50 p-4 rounded-lg">
            <div class="flex items-center">
              <div class="text-yellow-600">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-yellow-900">Factor ρ Promedio</p>
                <p class="text-2xl font-bold text-yellow-600">{{ insights().avgUtilization.toFixed(2) }}</p>
              </div>
            </div>
          </div>

          <div class="bg-green-50 p-4 rounded-lg">
            <div class="flex items-center">
              <div class="text-green-600">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-green-900">Tendencia</p>
                <p class="text-lg font-bold text-green-600">{{ insights().trend }}</p>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class HistoricalChartsComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  private analyticsService = inject(AnalyticsService);
  private logger = inject(LoggerService);

  productId = input.required<string>();

  private destroy$ = new Subject<void>();
  isLoading = signal(false);
  error = signal<string | null>(null);
  periodDays = signal(30);
  activeChart = signal<'demand' | 'utilization' | 'stock'>('demand');
  private chartData = signal<ChartData[]>([]);
  insights = signal({
    avgClicksPerDay: 0,
    avgUtilization: 0,
    trend: 'Estable'
  });

  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const productId = this.productId();
      const period = this.periodDays();
      if (productId) {
        this.loadHistoricalData();
      }
    });

    effect(() => {
      const data = this.chartData();
      const activeChart = this.activeChart();
      if (data.length > 0) {
        this.updateChart();
      }
    });
  }

  ngOnInit() {
    this.loadHistoricalData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.chart) {
      this.chart.destroy();
    }
  }

  onPeriodChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.periodDays.set(parseInt(target.value));
  }

  setActiveChart(chart: 'demand' | 'utilization' | 'stock') {
    this.activeChart.set(chart);
  }

  loadHistoricalData() {
    const productId = this.productId();
    if (!productId) return;

    this.isLoading.set(true);
    this.error.set(null);

    const period = this.periodDays();
    
    // Cargar histórico de clicks y stock
    forkJoin({
      clicks: this.analyticsService.getClickHistory(productId, period * 10),
      stock: this.analyticsService.getStockHistory(productId, period * 5),
      stats: this.analyticsService.getProductStats(productId)
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ clicks, stock, stats }) => {
        this.processHistoricalData(clicks, stock, stats);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.logger.error('Error loading historical data', error);
        this.error.set('No se pudieron cargar los datos históricos');
        this.isLoading.set(false);
      }
    });
  }

  private processHistoricalData(clicks: ClickTracking[], stock: StockHistory[], stats: any) {
    const period = this.periodDays();
    const endDate = new Date();
    const startDate = subDays(endDate, period);

    const dailyData: { [date: string]: ChartData } = {};

    for (let i = 0; i < period; i++) {
      const date = subDays(endDate, period - i - 1);
      const dateStr = format(date, 'yyyy-MM-dd');
      dailyData[dateStr] = {
        date: dateStr,
        clicks: 0,
        views: 0,
        stockLevel: 0,
        utilizationFactor: 0
      };
    }

    // Procesar clicks por día
    clicks.forEach(click => {
      const dateStr = format(parseISO(click.createdAt.toString()), 'yyyy-MM-dd');
      if (dailyData[dateStr]) {
        if (click.interactionType === 'CLICK') {
          dailyData[dateStr].clicks++;
        } else if (click.interactionType === 'VIEW') {
          dailyData[dateStr].views++;
        }
      }
    });

    // Procesar niveles de stock
    let currentStock = stats.analytics?.currentStock || 0;
    stock.reverse().forEach(stockEntry => {
      const dateStr = format(parseISO(stockEntry.createdAt.toString()), 'yyyy-MM-dd');
      if (dailyData[dateStr]) {
        dailyData[dateStr].stockLevel = stockEntry.newStock;
        currentStock = stockEntry.newStock;
      }
    });

    // Calcular factor de utilización simulado (basado en clicks vs stock)
    Object.values(dailyData).forEach(day => {
      if (day.clicks > 0 && day.stockLevel > 0) {
        day.utilizationFactor = Math.min((day.clicks / Math.max(day.stockLevel, 1)) * 0.1, 1);
      }
    });

    const processedData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
    this.chartData.set(processedData);

    this.calculateInsights(processedData);
  }

  private calculateInsights(data: ChartData[]) {
    if (data.length === 0) return;

    const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
    const avgClicksPerDay = totalClicks / data.length;
    
    const totalUtilization = data.reduce((sum, d) => sum + d.utilizationFactor, 0);
    const avgUtilization = totalUtilization / data.length;

    // Calcular tendencia simple
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.clicks, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.clicks, 0) / secondHalf.length;
    
    let trend = 'Estable';
    if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'Creciente ↗️';
    else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'Decreciente ↘️';

    this.insights.set({
      avgClicksPerDay,
      avgUtilization,
      trend
    });
  }

  private updateChart() {
    if (!this.chartCanvas) return;

    const data = this.chartData();
    if (data.length === 0) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config = this.getChartConfig(data);
    this.chart = new Chart(ctx, config);
  }

  private getChartConfig(data: ChartData[]): ChartConfiguration {
    const activeChart = this.activeChart();
    
    switch (activeChart) {
      case 'demand':
        return {
          type: 'line',
          data: {
            labels: data.map(d => format(parseISO(d.date), 'dd/MM')),
            datasets: [
              {
                label: 'Clicks',
                data: data.map(d => d.clicks),
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
              },
              {
                label: 'Views',
                data: data.map(d => d.views),
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Análisis de Demanda - Clicks y Views por Día'
              },
              legend: {
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Número de Interacciones'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Fecha'
                }
              }
            }
          }
        };

      case 'utilization':
        return {
          type: 'line',
          data: {
            labels: data.map(d => format(parseISO(d.date), 'dd/MM')),
            datasets: [
              {
                label: 'Factor de Utilización (ρ)',
                data: data.map(d => d.utilizationFactor),
                borderColor: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.4,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Factor de Utilización (ρ) - Teoría de Colas M/M/1'
              },
              legend: {
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 1,
                title: {
                  display: true,
                  text: 'Factor ρ (0 = Estable, 1 = Crítico)'
                },
                ticks: {
                  callback: function(value) {
                    if (typeof value === 'number') {
                      if (value >= 0.8) return value.toFixed(2) + ' (CRÍTICO)';
                      if (value >= 0.5) return value.toFixed(2) + ' (ADVERTENCIA)';
                      return value.toFixed(2) + ' (ESTABLE)';
                    }
                    return value;
                  }
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Fecha'
                }
              }
            }
          }
        };

      case 'stock':
        return {
          type: 'bar',
          data: {
            labels: data.map(d => format(parseISO(d.date), 'dd/MM')),
            datasets: [
              {
                label: 'Nivel de Stock',
                data: data.map(d => d.stockLevel),
                backgroundColor: data.map(d => {
                  if (d.stockLevel <= 5) return 'rgba(239, 68, 68, 0.8)'; // Rojo - Crítico
                  if (d.stockLevel <= 15) return 'rgba(245, 158, 11, 0.8)'; // Amarillo - Advertencia
                  return 'rgba(16, 185, 129, 0.8)'; // Verde - Bueno
                }),
                borderColor: data.map(d => {
                  if (d.stockLevel <= 5) return '#EF4444';
                  if (d.stockLevel <= 15) return '#F59E0B';
                  return '#10B981';
                }),
                borderWidth: 2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Niveles de Stock - Histórico'
              },
              legend: {
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Unidades en Stock'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Fecha'
                }
              }
            }
          }
        };

      default:
        return {} as ChartConfiguration;
    }
  }
}
