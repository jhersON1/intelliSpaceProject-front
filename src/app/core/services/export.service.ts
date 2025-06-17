import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { LoggerService } from './logger.service';
import { AnalyticsService } from './analytics.service';
import { ProductStats, VendorDashboard, ProductAnalytics } from '../types/analytics.interface';

export interface ExportOptions {
  format: 'PDF' | 'EXCEL' | 'CSV';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  includeCharts?: boolean;
  includeRawData?: boolean;
  customTitle?: string;
}

export interface ExportData {
  title: string;
  generatedAt: Date;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalProducts: number;
    totalInteractions: number;
    averageUtilization: number;
    criticalProducts: number;
  };
  products: ProductAnalytics[];
  charts?: ChartData[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie';
  title: string;
  data: any;
  imageData?: string; // Base64 image for PDF exports
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private logger = inject(LoggerService);
  private analyticsService = inject(AnalyticsService);

  /**
   * Export vendor dashboard to specified format
   */
  exportVendorDashboard(
    vendorId: string, 
    options: ExportOptions
  ): Observable<Blob> {
    this.logger.info('Exporting vendor dashboard', { vendorId, format: options.format }, 'ExportService');

    return from(this.generateVendorReport(vendorId, options));
  }

  /**
   * Export product analytics to specified format
   */
  exportProductAnalytics(
    productId: string, 
    options: ExportOptions
  ): Observable<Blob> {
    this.logger.info('Exporting product analytics', { productId, format: options.format }, 'ExportService');

    return from(this.generateProductReport(productId, options));
  }

  /**
   * Export performance metrics
   */
  exportPerformanceMetrics(
    options: ExportOptions
  ): Observable<Blob> {
    this.logger.info('Exporting performance metrics', { format: options.format }, 'ExportService');

    return from(this.generatePerformanceReport(options));
  }

  /**
   * Generate vendor report data
   */
  private async generateVendorReport(vendorId: string, options: ExportOptions): Promise<Blob> {
    try {      // Get vendor dashboard data (note: backend determines vendor from auth token)
      const dashboardData = await this.analyticsService.getVendorDashboard().toPromise();
      
      if (!dashboardData) {
        throw new Error('No data available for vendor');
      }

      const exportData: ExportData = {
        title: options.customTitle || 'Reporte de Analytics - Vendor Dashboard',
        generatedAt: new Date(),
        dateRange: options.dateRange,
        summary: {
          totalProducts: dashboardData.totalProducts,
          totalInteractions: dashboardData.totalInteractions,
          averageUtilization: dashboardData.averageUtilization,
          criticalProducts: dashboardData.criticalProducts
        },
        products: dashboardData.products.map(p => p.analytics),
        charts: options.includeCharts ? await this.generateChartData(dashboardData) : undefined
      };

      return this.generateFileFromData(exportData, options.format);
    } catch (error) {
      this.logger.error('Error generating vendor report', { error, vendorId }, 'ExportService');
      throw error;
    }
  }

  /**
   * Generate product report data
   */
  private async generateProductReport(productId: string, options: ExportOptions): Promise<Blob> {
    try {
      // Get product stats
      const productStats = await this.analyticsService.getProductStats(productId).toPromise();
      
      if (!productStats) {
        throw new Error('No data available for product');
      }

      const exportData: ExportData = {
        title: options.customTitle || `Reporte de Analytics - Producto ${productId}`,
        generatedAt: new Date(),
        dateRange: options.dateRange,
        summary: {
          totalProducts: 1,
          totalInteractions: productStats.analytics.totalClicks + productStats.analytics.totalViews,
          averageUtilization: productStats.analytics.utilizationFactor,
          criticalProducts: productStats.analytics.congestionStatus === 'CRITICO' ? 1 : 0
        },
        products: [productStats.analytics],
        charts: options.includeCharts ? await this.generateProductChartData(productStats) : undefined
      };

      return this.generateFileFromData(exportData, options.format);
    } catch (error) {
      this.logger.error('Error generating product report', { error, productId }, 'ExportService');
      throw error;
    }
  }

  /**
   * Generate performance report
   */
  private async generatePerformanceReport(options: ExportOptions): Promise<Blob> {
    try {
      // This would typically aggregate data from multiple sources
      const exportData: ExportData = {
        title: options.customTitle || 'Reporte de Métricas de Rendimiento',
        generatedAt: new Date(),
        dateRange: options.dateRange,
        summary: {
          totalProducts: 0,
          totalInteractions: 0,
          averageUtilization: 0,
          criticalProducts: 0
        },
        products: [],
        charts: options.includeCharts ? [] : undefined
      };

      return this.generateFileFromData(exportData, options.format);
    } catch (error) {
      this.logger.error('Error generating performance report', { error }, 'ExportService');
      throw error;
    }
  }

  /**
   * Generate chart data for dashboard
   */
  private async generateChartData(dashboardData: VendorDashboard): Promise<ChartData[]> {
    const charts: ChartData[] = [];

    // Utilization distribution chart
    charts.push({
      type: 'bar',
      title: 'Distribución de Factor de Utilización',
      data: {
        labels: dashboardData.products.map(p => p.name),
        datasets: [{
          label: 'Factor de Utilización (ρ)',
          data: dashboardData.products.map(p => p.analytics.utilizationFactor),
          backgroundColor: dashboardData.products.map(p => 
            p.analytics.congestionStatus === 'CRITICO' ? '#ef4444' :
            p.analytics.congestionStatus === 'ADVERTENCIA' ? '#f59e0b' : '#10b981'
          )
        }]
      }
    });

    // Status distribution pie chart
    const statusCounts = dashboardData.products.reduce((acc, p) => {
      acc[p.analytics.congestionStatus] = (acc[p.analytics.congestionStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    charts.push({
      type: 'pie',
      title: 'Distribución de Estados',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
        }]
      }
    });

    return charts;
  }

  /**
   * Generate chart data for single product
   */
  private async generateProductChartData(productStats: ProductStats): Promise<ChartData[]> {
    const charts: ChartData[] = [];

    // Get historical data if available
    try {
      const clickHistory = await this.analyticsService.getClickHistory(productStats.analytics.id, 30).toPromise();
      const stockHistory = await this.analyticsService.getStockHistory(productStats.analytics.id, 30).toPromise();

      if (clickHistory && clickHistory.length > 0) {
        charts.push({
          type: 'line',
          title: 'Historial de Interacciones (30 días)',
          data: {
            labels: clickHistory.map(h => new Date(h.createdAt).toLocaleDateString()),
            datasets: [{
              label: 'Clicks por día',
              data: this.aggregateClicksByDay(clickHistory),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
          }
        });
      }

      if (stockHistory && stockHistory.length > 0) {
        charts.push({
          type: 'line',
          title: 'Historial de Stock (30 días)',
          data: {
            labels: stockHistory.map(h => new Date(h.createdAt).toLocaleDateString()),
            datasets: [{
              label: 'Nivel de Stock',
              data: stockHistory.map(h => h.newStock),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)'
            }]
          }
        });
      }
    } catch (error) {
      this.logger.warn('Could not load historical data for charts', { error }, 'ExportService');
    }

    return charts;
  }

  /**
   * Generate file from data based on format
   */
  private generateFileFromData(data: ExportData, format: ExportOptions['format']): Blob {
    switch (format) {
      case 'PDF':
        return this.generatePDF(data);
      case 'EXCEL':
        return this.generateExcel(data);
      case 'CSV':
        return this.generateCSV(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate PDF using HTML and CSS
   */
  private generatePDF(data: ExportData): Blob {
    const htmlContent = this.generateHTMLReport(data);
    
    // In a real implementation, you would use a library like jsPDF or Puppeteer
    // For now, we'll create a simple HTML document
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    this.logger.info('PDF generated (HTML format)', { title: data.title }, 'ExportService');
    return blob;
  }

  /**
   * Generate Excel file
   */
  private generateExcel(data: ExportData): Blob {
    // In a real implementation, you would use a library like SheetJS/xlsx
    const csvContent = this.generateCSVContent(data);
    const blob = new Blob([csvContent], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    this.logger.info('Excel generated (CSV format)', { title: data.title }, 'ExportService');
    return blob;
  }

  /**
   * Generate CSV file
   */
  private generateCSV(data: ExportData): Blob {
    const csvContent = this.generateCSVContent(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    this.logger.info('CSV generated', { title: data.title }, 'ExportService');
    return blob;
  }

  /**
   * Generate HTML report content
   */
  private generateHTMLReport(data: ExportData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${data.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: bold; color: #1f2937; }
        .summary-label { color: #6b7280; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f9fafb; font-weight: 600; }
        .status-estable { color: #10b981; }
        .status-advertencia { color: #f59e0b; }
        .status-critico { color: #ef4444; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${data.title}</h1>
        <p>Generado el: ${data.generatedAt.toLocaleString()}</p>
        ${data.dateRange ? `<p>Período: ${data.dateRange.startDate.toLocaleDateString()} - ${data.dateRange.endDate.toLocaleDateString()}</p>` : ''}
    </div>

    <div class="summary">
        <h2>Resumen Ejecutivo</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${data.summary.totalProducts}</div>
                <div class="summary-label">Total Productos</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${data.summary.totalInteractions.toLocaleString()}</div>
                <div class="summary-label">Total Interacciones</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${(data.summary.averageUtilization * 100).toFixed(1)}%</div>
                <div class="summary-label">Utilización Promedio</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${data.summary.criticalProducts}</div>
                <div class="summary-label">Productos Críticos</div>
            </div>
        </div>
    </div>

    <h2>Detalle de Productos</h2>
    <table>
        <thead>
            <tr>
                <th>ID Producto</th>
                <th>Total Clicks</th>
                <th>Total Vistas</th>
                <th>Tasa Llegada (λ)</th>
                <th>Tasa Servicio (μ)</th>
                <th>Factor Utilización (ρ)</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            ${data.products.map(product => `
                <tr>
                    <td>${product.id}</td>
                    <td>${product.totalClicks}</td>
                    <td>${product.totalViews}</td>
                    <td>${product.arrivalRate.toFixed(4)}</td>
                    <td>${product.serviceRate.toFixed(4)}</td>
                    <td>${(product.utilizationFactor * 100).toFixed(2)}%</td>
                    <td class="status-${product.congestionStatus.toLowerCase()}">${product.congestionStatus}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }

  /**
   * Generate CSV content
   */
  private generateCSVContent(data: ExportData): string {
    const headers = [
      'ID Producto',
      'Total Clicks',
      'Total Vistas',
      'Tasa Llegada',
      'Tasa Servicio',
      'Factor Utilización',
      'Estado'
    ];

    const rows = data.products.map(product => [
      product.id,
      product.totalClicks,
      product.totalViews,
      product.arrivalRate.toFixed(4),
      product.serviceRate.toFixed(4),
      product.utilizationFactor.toFixed(4),
      product.congestionStatus
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Aggregate clicks by day
   */
  private aggregateClicksByDay(clickHistory: any[]): number[] {
    const dailyClicks: Record<string, number> = {};
    
    clickHistory.forEach(click => {
      const date = new Date(click.createdAt).toDateString();
      dailyClicks[date] = (dailyClicks[date] || 0) + 1;
    });

    return Object.values(dailyClicks);
  }

  /**
   * Download file helper
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    this.logger.info('File downloaded', { filename }, 'ExportService');
  }
}
