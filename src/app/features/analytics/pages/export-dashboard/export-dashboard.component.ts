import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExportService, ExportOptions } from '../../../../core/services/export.service';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { LoggerService } from '../../../../core/services/logger.service';

@Component({
  selector: 'app-export-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Header -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Exportar Reportes y Analytics</h1>
              <p class="text-gray-600 mt-2">Genere reportes personalizados en PDF, Excel o CSV</p>
            </div>
            <div class="flex items-center space-x-2">
              <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <!-- Export Options Panel -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-6">Opciones de Exportación</h2>
            
            <!-- Report Type Selection -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-3">Tipo de Reporte</label>
              <div class="space-y-3">
                <label class="flex items-center">
                  <input 
                    type="radio" 
                    [(ngModel)]="selectedReportType" 
                    value="vendor" 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                  <span class="ml-3">
                    <span class="block text-sm font-medium text-gray-700">Dashboard de Vendor</span>
                    <span class="block text-xs text-gray-500">Resumen completo de todos los productos</span>
                  </span>
                </label>
                
                <label class="flex items-center">
                  <input 
                    type="radio" 
                    [(ngModel)]="selectedReportType" 
                    value="product" 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                  <span class="ml-3">
                    <span class="block text-sm font-medium text-gray-700">Producto Específico</span>
                    <span class="block text-xs text-gray-500">Analytics detallado de un producto</span>
                  </span>
                </label>
                
                <label class="flex items-center">
                  <input 
                    type="radio" 
                    [(ngModel)]="selectedReportType" 
                    value="performance" 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                  <span class="ml-3">
                    <span class="block text-sm font-medium text-gray-700">Métricas de Rendimiento</span>
                    <span class="block text-xs text-gray-500">Análisis de rendimiento general</span>
                  </span>
                </label>
              </div>
            </div>

            <!-- Product Selection (if product report type) -->
            @if (selectedReportType === 'product') {
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Seleccionar Producto</label>
                <select 
                  [(ngModel)]="selectedProductId" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccione un producto...</option>
                  @for (product of availableProducts(); track product.id) {
                    <option [value]="product.id">{{ product.name }}</option>
                  }
                </select>
              </div>
            }

            <!-- Format Selection -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-3">Formato de Archivo</label>
              <div class="grid grid-cols-3 gap-3">
                @for (format of availableFormats; track format.value) {
                  <label class="flex flex-col items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                         [class.border-blue-500]="selectedFormat === format.value"
                         [class.bg-blue-50]="selectedFormat === format.value">
                    <input 
                      type="radio" 
                      [(ngModel)]="selectedFormat" 
                      [value]="format.value" 
                      class="sr-only">
                    <div class="text-2xl mb-1">{{ format.icon }}</div>
                    <span class="text-sm font-medium">{{ format.label }}</span>
                  </label>
                }
              </div>
            </div>

            <!-- Date Range -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Rango de Fechas (Opcional)</label>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <input 
                    type="date" 
                    [(ngModel)]="startDate"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                  <input 
                    type="date" 
                    [(ngModel)]="endDate"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
              </div>
            </div>

            <!-- Additional Options -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-3">Opciones Adicionales</label>
              <div class="space-y-3">
                <label class="flex items-center">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="includeCharts" 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                  <span class="ml-2 text-sm text-gray-700">Incluir gráficos</span>
                </label>
                <label class="flex items-center">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="includeRawData" 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                  <span class="ml-2 text-sm text-gray-700">Incluir datos sin procesar</span>
                </label>
              </div>
            </div>

            <!-- Custom Title -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Título Personalizado (Opcional)</label>
              <input 
                type="text" 
                [(ngModel)]="customTitle" 
                placeholder="Reporte de Analytics..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <!-- Generate Button -->
            <button 
              (click)="generateReport()"
              [disabled]="isGenerating() || !canGenerate()"
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200">
              
              @if (isGenerating()) {
                <div class="flex items-center justify-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando Reporte...
                </div>
              } @else {
                <div class="flex items-center justify-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Generar Reporte
                </div>
              }
            </button>
          </div>

          <!-- Preview/Status Panel -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-6">Vista Previa del Reporte</h2>
            
            @if (previewData()) {
              <div class="space-y-4">
                <div class="bg-gray-50 rounded-lg p-4">
                  <h3 class="font-medium text-gray-900 mb-2">{{ previewData()!.title }}</h3>
                  <p class="text-sm text-gray-600">{{ previewData()!.description }}</p>
                </div>

                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 class="text-sm font-medium text-gray-700">Contenido del Reporte</h4>
                  </div>
                  <div class="p-4 space-y-2">
                    @for (item of previewData()!.items; track $index) {
                      <div class="flex items-center text-sm text-gray-600">
                        <svg class="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        {{ item }}
                      </div>
                    }
                  </div>
                </div>

                @if (previewData()!.estimatedSize) {
                  <div class="text-sm text-gray-500">
                    Tamaño estimado: {{ previewData()!.estimatedSize }}
                  </div>
                }
              </div>
            } @else {
              <div class="text-center py-8">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p class="text-gray-500">Seleccione las opciones para ver la vista previa</p>
              </div>
            }

            <!-- Recent Reports -->
            @if (recentReports().length > 0) {
              <div class="mt-8 pt-6 border-t border-gray-200">
                <h3 class="text-sm font-medium text-gray-700 mb-3">Reportes Recientes</h3>
                <div class="space-y-2">
                  @for (report of recentReports(); track report.id) {
                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div class="flex-1">
                        <p class="text-sm font-medium text-gray-700">{{ report.title }}</p>
                        <p class="text-xs text-gray-500">{{ report.generatedAt.toLocaleString() }}</p>
                      </div>
                      <button 
                        (click)="downloadReport(report)"
                        class="text-blue-600 hover:text-blue-800 text-sm">
                        Descargar
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ExportDashboardComponent {
  private exportService = inject(ExportService);
  private logger = inject(LoggerService);

  selectedReportType = 'vendor';
  selectedProductId = '';
  selectedFormat: 'PDF' | 'EXCEL' | 'CSV' = 'PDF';
  startDate = '';
  endDate = '';
  includeCharts = true;
  includeRawData = false;
  customTitle = '';

  isGenerating = signal(false);
  availableProducts = signal<{id: string, name: string}[]>([]);
  recentReports = signal<any[]>([]);

  availableFormats = [
    { value: 'PDF' as const, label: 'PDF', icon: '📄' },
    { value: 'EXCEL' as const, label: 'Excel', icon: '📊' },
    { value: 'CSV' as const, label: 'CSV', icon: '📝' }
  ];

  previewData = computed(() => {
    if (!this.selectedReportType) return null;

    const baseTitle = this.customTitle || this.getDefaultTitle();
    
    return {
      title: baseTitle,
      description: this.getReportDescription(),
      items: this.getReportItems(),
      estimatedSize: this.getEstimatedSize()
    };
  });

  ngOnInit() {
    this.loadAvailableProducts();
    this.loadRecentReports();
  }

  /**
   * Check if report can be generated
   */
  canGenerate(): boolean {
    if (this.selectedReportType === 'product' && !this.selectedProductId) {
      return false;
    }
    return !!this.selectedReportType && !!this.selectedFormat;
  }

  /**
   * Generate report
   */
  async generateReport() {
    if (!this.canGenerate() || this.isGenerating()) return;

    try {
      this.isGenerating.set(true);
      this.logger.info('Starting report generation', { 
        type: this.selectedReportType, 
        format: this.selectedFormat 
      }, 'ExportDashboard');

      const options: ExportOptions = {
        format: this.selectedFormat,
        includeCharts: this.includeCharts,
        includeRawData: this.includeRawData,
        customTitle: this.customTitle || undefined
      };

      // Add date range if specified
      if (this.startDate && this.endDate) {
        options.dateRange = {
          startDate: new Date(this.startDate),
          endDate: new Date(this.endDate)
        };
      }

      let blob: Blob;
      let filename: string;

      switch (this.selectedReportType) {
        case 'vendor':
          blob = await this.exportService.exportVendorDashboard('current', options).toPromise() || new Blob();
          filename = `vendor-dashboard-${new Date().toISOString().split('T')[0]}.${this.selectedFormat.toLowerCase()}`;
          break;
        
        case 'product':
          if (!this.selectedProductId) throw new Error('Product ID is required');
          blob = await this.exportService.exportProductAnalytics(this.selectedProductId, options).toPromise() || new Blob();
          filename = `product-analytics-${this.selectedProductId}-${new Date().toISOString().split('T')[0]}.${this.selectedFormat.toLowerCase()}`;
          break;
        
        case 'performance':
          blob = await this.exportService.exportPerformanceMetrics(options).toPromise() || new Blob();
          filename = `performance-metrics-${new Date().toISOString().split('T')[0]}.${this.selectedFormat.toLowerCase()}`;
          break;
        
        default:
          throw new Error('Invalid report type');
      }

      this.exportService.downloadFile(blob, filename);

      this.addToRecentReports({
        id: Date.now().toString(),
        title: options.customTitle || this.getDefaultTitle(),
        type: this.selectedReportType,
        format: this.selectedFormat,
        generatedAt: new Date(),
        blob: blob,
        filename: filename
      });

      this.logger.info('Report generated successfully', { filename }, 'ExportDashboard');

    } catch (error) {
      this.logger.error('Error generating report', { error }, 'ExportDashboard');
      alert('Error al generar el reporte. Por favor, inténtelo de nuevo.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  /**
   * Load available products for selection
   */
  private async loadAvailableProducts() {
    try {
      const products = [
        { id: '1', name: 'Producto Demo 1' },
        { id: '2', name: 'Producto Demo 2' },
        { id: '3', name: 'Producto Demo 3' }
      ];
      
      this.availableProducts.set(products);
    } catch (error) {
      this.logger.error('Error loading products', { error }, 'ExportDashboard');
    }
  }

  /**
   * Load recent reports from localStorage
   */
  private loadRecentReports() {
    try {
      const stored = localStorage.getItem('recentReports');
      if (stored) {
        const reports = JSON.parse(stored);
        this.recentReports.set(reports.slice(0, 5)); // Keep only last 5 reports
      }
    } catch (error) {
      this.logger.warn('Could not load recent reports', { error }, 'ExportDashboard');
    }
  }

  /**
   * Add report to recent reports list
   */
  private addToRecentReports(report: any) {
    const current = this.recentReports();
    const updated = [report, ...current].slice(0, 5);
    this.recentReports.set(updated);
    
    const toStore = updated.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      format: r.format,
      generatedAt: r.generatedAt,
      filename: r.filename
    }));
    
    try {
      localStorage.setItem('recentReports', JSON.stringify(toStore));
    } catch (error) {
      this.logger.warn('Could not save recent reports', { error }, 'ExportDashboard');
    }
  }

  /**
   * Download a recent report
   */
  downloadReport(report: any) {
    if (report.blob) {
      this.exportService.downloadFile(report.blob, report.filename);
    } else {
      alert('El archivo no está disponible. Por favor, genere el reporte nuevamente.');
    }
  }

  /**
   * Get default title based on report type
   */
  private getDefaultTitle(): string {
    switch (this.selectedReportType) {
      case 'vendor':
        return 'Reporte de Dashboard Vendor';
      case 'product':
        return 'Reporte de Analytics de Producto';
      case 'performance':
        return 'Reporte de Métricas de Rendimiento';
      default:
        return 'Reporte de Analytics';
    }
  }

  /**
   * Get report description
   */
  private getReportDescription(): string {
    switch (this.selectedReportType) {
      case 'vendor':
        return 'Resumen completo de analytics para todos los productos del vendor';
      case 'product':
        return 'Análisis detallado de teoría de colas y métricas para un producto específico';
      case 'performance':
        return 'Métricas de rendimiento general y estadísticas del sistema';
      default:
        return 'Reporte de analytics personalizado';
    }
  }

  /**
   * Get report items list
   */
  private getReportItems(): string[] {
    const baseItems = [
      'Resumen ejecutivo',
      'Métricas de teoría de colas',
      'Análisis de utilización'
    ];

    if (this.includeCharts) {
      baseItems.push('Gráficos y visualizaciones');
    }

    if (this.includeRawData) {
      baseItems.push('Datos sin procesar');
    }

    switch (this.selectedReportType) {
      case 'vendor':
        return [
          ...baseItems,
          'Lista de productos con analytics',
          'Alertas y recomendaciones',
          'Distribución de estados'
        ];
      case 'product':
        return [
          ...baseItems,
          'Historial de clicks y vistas',
          'Análisis de stock',
          'Predicciones de demanda'
        ];
      case 'performance':
        return [
          ...baseItems,
          'Métricas de sistema',
          'Análisis de tendencias',
          'Benchmarks de rendimiento'
        ];
      default:
        return baseItems;
    }
  }

  /**
   * Get estimated file size
   */
  private getEstimatedSize(): string {
    let baseSize = 50; // KB

    if (this.includeCharts) baseSize += 200;
    if (this.includeRawData) baseSize += 500;

    if (this.selectedFormat === 'PDF') baseSize *= 1.5;
    else if (this.selectedFormat === 'EXCEL') baseSize *= 2;

    if (baseSize < 1000) return `~${Math.round(baseSize)} KB`;
    return `~${(baseSize / 1000).toFixed(1)} MB`;
  }
}
