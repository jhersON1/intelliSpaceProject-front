import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { LoggerService } from './logger.service';
import { AnalyticsService } from './analytics.service';
import { ProductStats, VendorDashboard, ProductAnalytics } from '../types/analytics.interface';
import * as XLSX from 'xlsx';

// Extended interface for export
interface ExportProductAnalytics extends ProductAnalytics {
  name?: string;
}

// Import types for pdfmake
interface TDocumentDefinitions {
  content: any[];
  pageSize?: string;
  pageOrientation?: string;
  styles?: any;
  defaultStyle?: any;
}

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
  products: ExportProductAnalytics[];
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
   * Export vendor analytics data
   */
  exportVendorData(vendorId: string, options: ExportOptions): Observable<Blob> {
    this.logger.info('Exporting vendor data', { vendorId, format: options.format }, 'ExportService');

    return from(this.generateVendorReport(vendorId, options));
  }

  /**
   * Export product analytics data  
   */
  exportProductData(productId: string, options: ExportOptions): Observable<Blob> {
    this.logger.info('Exporting product data', { productId, format: options.format }, 'ExportService');

    return from(this.generateProductReport(productId, options));
  }

  /**
   * Export performance metrics
   */
  exportPerformanceMetrics(options: ExportOptions): Observable<Blob> {
    this.logger.info('Exporting performance metrics', { format: options.format }, 'ExportService');

    return from(this.generatePerformanceReport(options));
  }

  /**
   * Generate vendor report data
   */
  private async generateVendorReport(vendorId: string, options: ExportOptions): Promise<Blob> {
    try {
      // Get vendor dashboard data
      const dashboardData = await this.analyticsService.getVendorDashboard().toPromise();
      
      if (!dashboardData) {
        throw new Error('No data available for vendor');
      }

      // Handle the actual structure returned by backend
      const products = (dashboardData as any).topProducts || dashboardData.products || [];
      
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
        products: products.map((p: any) => ({
          id: p.id,
          name: p.name,
          totalClicks: p.totalClicks || 0,
          totalViews: p.totalViews || 0,
          totalSearches: p.totalSearches || 0,
          arrivalRate: p.arrivalRate || 0,
          serviceRate: 1.0,
          utilizationFactor: p.utilizationFactor || 0,
          congestionStatus: p.congestionStatus || 'ESTABLE'
        })),
        charts: options.includeCharts ? await this.generateChartData(dashboardData) : undefined
      };

      return await this.generateFileFromData(exportData, options.format);
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

      const analytics = productStats.analytics;
      
      const exportData: ExportData = {
        title: options.customTitle || `Reporte de Producto - ${productId}`,
        generatedAt: new Date(),
        dateRange: options.dateRange,
        summary: {
          totalProducts: 1,
          totalInteractions: (analytics.totalClicks || 0) + (analytics.totalViews || 0),
          averageUtilization: analytics.utilizationFactor || 0,
          criticalProducts: (analytics.congestionStatus === 'CRITICO') ? 1 : 0
        },
        products: [{
          id: analytics.id,
          name: productId, // Using productId as name since ProductAnalytics doesn't have name
          totalClicks: analytics.totalClicks,
          totalViews: analytics.totalViews,
          totalSearches: analytics.totalSearches,
          arrivalRate: analytics.arrivalRate,
          serviceRate: analytics.serviceRate,
          utilizationFactor: analytics.utilizationFactor,
          congestionStatus: analytics.congestionStatus,
          lastCalculation: analytics.lastCalculation,
          analysisPerioD: analytics.analysisPerioD
        }],
        charts: options.includeCharts ? await this.generateProductChartData(productStats) : undefined
      };

      return await this.generateFileFromData(exportData, options.format);
    } catch (error) {
      this.logger.error('Error generating product report', { error, productId }, 'ExportService');
      throw error;
    }
  }

  /**
   * Generate performance report data
   */
  private async generatePerformanceReport(options: ExportOptions): Promise<Blob> {
    try {
      const exportData: ExportData = {
        title: options.customTitle || 'Reporte de Rendimiento del Sistema',
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

      return await this.generateFileFromData(exportData, options.format);
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

    try {
      const products = (dashboardData as any).topProducts || dashboardData.products || [];
      
      if (!products || products.length === 0) {
        this.logger.warn('No products available for chart generation', {}, 'ExportService');
        return charts;
      }

      // Utilization distribution chart
      charts.push({
        type: 'bar',
        title: 'Distribución de Utilización por Producto',
        data: {
          labels: products.map((p: any) => p.name || p.id),
          datasets: [{
            label: 'Factor de Utilización',
            data: products.map((p: any) => (p.utilizationFactor || 0) * 100),
            backgroundColor: products.map((p: any) => {
              const util = p.utilizationFactor || 0;
              if (util >= 0.8) return '#ef4444';
              if (util >= 0.6) return '#f59e0b';
              return '#10b981';
            })
          }]
        }
      });

    } catch (error) {
      this.logger.warn('Could not generate charts', { error }, 'ExportService');
    }

    return charts;
  }
  /**
   * Generate chart data for product
   */
  private async generateProductChartData(productStats: ProductStats): Promise<ChartData[]> {
    const charts: ChartData[] = [];

    try {
      const analytics = productStats.analytics;
      
      // Simple interaction chart
      charts.push({
        type: 'pie',
        title: 'Distribución de Interacciones',
        data: {
          labels: ['Clicks', 'Vistas', 'Búsquedas'],
          datasets: [{
            data: [
              analytics.totalClicks || 0,
              analytics.totalViews || 0,
              analytics.totalSearches || 0
            ],
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
          }]
        }
      });

    } catch (error) {
      this.logger.warn('Could not generate product charts', { error }, 'ExportService');
    }

    return charts;
  }

  /**
   * Generate file from data based on format
   */
  private async generateFileFromData(data: ExportData, format: ExportOptions['format']): Promise<Blob> {
    switch (format) {
      case 'PDF':
        return await this.generatePDF(data);
      case 'EXCEL':
        return this.generateExcel(data);
      case 'CSV':
        return this.generateCSV(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
  /**
   * Generate PDF using modern approach
   */
  private async generatePDF(data: ExportData): Promise<Blob> {
    try {
      // For now, use simple text approach since pdfmake has complex setup
      // This provides a working solution without ESM issues
      return this.generateTextBasedPDF(data);
      
    } catch (error) {
      this.logger.error('Error generating PDF', { error }, 'ExportService');
      return this.generateTextBasedPDF(data);
    }
  }

  /**
   * Generate a simple text-based PDF alternative
   */
  private generateTextBasedPDF(data: ExportData): Blob {
    const textContent = `
=============================================
${data.title}
=============================================

Generado: ${data.generatedAt.toLocaleString('es-ES')}
${data.dateRange ? `Período: ${data.dateRange.startDate.toLocaleDateString('es-ES')} - ${data.dateRange.endDate.toLocaleDateString('es-ES')}` : ''}

RESUMEN EJECUTIVO
=============================================
- Total de Productos: ${data.summary.totalProducts}
- Total de Interacciones: ${data.summary.totalInteractions.toLocaleString('es-ES')}
- Utilización Promedio: ${(data.summary.averageUtilization * 100).toFixed(2)}%
- Productos Críticos: ${data.summary.criticalProducts}

EVALUACIÓN DEL SISTEMA
=============================================
Estado de Productos: ${this.getSummaryEvaluation('products', data.summary.totalProducts)}
Nivel de Actividad: ${this.getSummaryEvaluation('interactions', data.summary.totalInteractions)}
Estado de Utilización: ${this.getSummaryEvaluation('utilization', data.summary.averageUtilization)}
Estado Crítico: ${this.getSummaryEvaluation('critical', data.summary.criticalProducts)}

ANÁLISIS DETALLADO DE PRODUCTOS
=============================================
${data.products.map(product => `
Producto: ${product.name || product.id}
- Clicks: ${product.totalClicks}
- Vistas: ${product.totalViews}
- Búsquedas: ${product.totalSearches}
- Tasa de Llegadas (λ): ${product.arrivalRate.toFixed(4)}
- Tasa de Servicio (μ): ${product.serviceRate.toFixed(4)}
- Factor de Utilización (ρ): ${product.utilizationFactor.toFixed(3)}
- Estado: ${product.congestionStatus}
- Diagnóstico: ${this.getDetailedProductDiagnosis(product)}
`).join('\n')}

INTERPRETACIÓN DE MÉTRICAS
=============================================
λ (Lambda): Representa la tasa de llegadas (demanda) de los clientes
μ (Mu): Representa la tasa de servicio (capacidad de reposición)
ρ (Rho): Factor de utilización del sistema (λ/μ)

ESTADOS DEL SISTEMA:
- ESTABLE: ρ < 0.6 - Sistema funcionando de manera óptima
- ADVERTENCIA: 0.6 ≤ ρ < 0.8 - Monitorear tendencias
- CRÍTICO: ρ ≥ 0.8 - Requiere atención inmediata

RECOMENDACIONES
=============================================
${this.generateSystemRecommendations(data)}

=============================================
Reporte generado por IntelliSpace Analytics
Sistema de Análisis de Teoría de Colas M/M/1
=============================================
    `;
    
    return new Blob([textContent], { type: 'text/plain; charset=utf-8' });
  }

  /**
   * Generate Excel file
   */
  private generateExcel(data: ExportData): Blob {
    try {
      const workbook = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['IntelliSpace Analytics - ' + data.title],
        ['Generado:', data.generatedAt.toLocaleString('es-ES')],
        [''],
        ['RESUMEN EJECUTIVO'],
        ['Métrica', 'Valor', 'Estado'],
        ['Total de Productos', data.summary.totalProducts, data.summary.totalProducts > 0 ? 'ACTIVO' : 'SIN PRODUCTOS'],
        ['Total de Interacciones', data.summary.totalInteractions, this.getInteractionStatus(data.summary.totalInteractions)],
        ['Utilización Promedio', `${(data.summary.averageUtilization * 100).toFixed(2)}%`, this.getUtilizationStatus(data.summary.averageUtilization)],
        ['Productos Críticos', data.summary.criticalProducts, data.summary.criticalProducts > 0 ? 'REQUIERE ATENCION' : 'ESTABLE']
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

      // Products sheet
      if (data.products && data.products.length > 0) {
        const productsData = [
          ['Producto', 'Clicks', 'Vistas', 'Búsquedas', 'Tasa Llegada', 'Tasa Servicio', 'Utilización', 'Estado'],
          ...data.products.map(product => [
            product.name || 'N/A',
            product.totalClicks || 0,
            product.totalViews || 0,
            product.totalSearches || 0,
            product.arrivalRate || 0,
            product.serviceRate || 0,
            product.utilizationFactor || 0,
            product.congestionStatus || 'ESTABLE'
          ])
        ];

        const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
        XLSX.utils.book_append_sheet(workbook, productsSheet, 'Productos');
      }

      // Convert to blob
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    } catch (error) {
      this.logger.error('Error generating Excel file', { error }, 'ExportService');
      throw error;
    }
  }

  /**
   * Generate CSV file
   */
  private generateCSV(data: ExportData): Blob {
    try {
      let csvContent = '';

      // Header
      csvContent += `"${data.title}"\n`;
      csvContent += `"Generado: ${data.generatedAt.toLocaleString('es-ES')}"\n\n`;

      // Summary
      csvContent += '"RESUMEN EJECUTIVO"\n';
      csvContent += '"Métrica","Valor","Estado"\n';
      csvContent += `"Total de Productos","${data.summary.totalProducts}","${data.summary.totalProducts > 0 ? 'ACTIVO' : 'SIN PRODUCTOS'}"\n`;
      csvContent += `"Total de Interacciones","${data.summary.totalInteractions}","${this.getInteractionStatus(data.summary.totalInteractions)}"\n`;
      csvContent += `"Utilización Promedio","${(data.summary.averageUtilization * 100).toFixed(2)}%","${this.getUtilizationStatus(data.summary.averageUtilization)}"\n`;
      csvContent += `"Productos Críticos","${data.summary.criticalProducts}","${data.summary.criticalProducts > 0 ? 'REQUIERE ATENCION' : 'ESTABLE'}"\n\n`;

      // Products
      if (data.products && data.products.length > 0) {
        csvContent += '"ANÁLISIS DE PRODUCTOS"\n';
        csvContent += '"Producto","Clicks","Vistas","Búsquedas","Tasa Llegada","Tasa Servicio","Utilización","Estado"\n';
        
        data.products.forEach(product => {
          csvContent += `"${product.name || 'N/A'}","${product.totalClicks || 0}","${product.totalViews || 0}","${product.totalSearches || 0}","${product.arrivalRate || 0}","${product.serviceRate || 0}","${product.utilizationFactor || 0}","${product.congestionStatus || 'ESTABLE'}"\n`;
        });
      }

      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    } catch (error) {
      this.logger.error('Error generating CSV file', { error }, 'ExportService');
      throw error;
    }
  }

  // Helper methods
  private getSummaryEvaluation(type: string, value: number): string {
    switch (type) {
      case 'products':
        return value > 10 ? 'Excelente diversidad' : value > 5 ? 'Buena variedad' : 'Pocas opciones';
      case 'interactions':
        return value > 1000 ? 'Alta actividad' : value > 100 ? 'Actividad moderada' : 'Baja actividad';
      case 'utilization':
        return value > 0.8 ? 'Muy alta utilización' : value > 0.5 ? 'Utilización moderada' : 'Baja utilización';
      case 'critical':
        return value > 0 ? 'Requiere atención inmediata' : 'Sistema estable';
      default:
        return 'N/A';
    }
  }

  private getInteractionStatus(interactions: number): string {
    if (interactions > 1000) return 'ALTO';
    if (interactions > 100) return 'MEDIO';
    return 'BAJO';
  }
  private getUtilizationStatus(utilization: number): string {
    if (utilization >= 0.8) return 'CRITICO';
    if (utilization >= 0.6) return 'ADVERTENCIA';
    return 'ESTABLE';
  }

  private getDetailedProductDiagnosis(product: ExportProductAnalytics): string {
    const rho = product.utilizationFactor;
    if (rho >= 0.8) {
      return `Sistema sobrecargado (ρ=${rho.toFixed(3)}). Requiere atención inmediata.`;
    } else if (rho >= 0.6) {
      return `Utilización moderada-alta (ρ=${rho.toFixed(3)}). Monitorear tendencias.`;
    } else {
      return `Sistema estable (ρ=${rho.toFixed(3)}). Funcionamiento óptimo.`;
    }
  }

  private generateSystemRecommendations(data: ExportData): string {
    const recommendations = [];
    
    if (data.summary.criticalProducts > 0) {
      recommendations.push(`- ${data.summary.criticalProducts} producto(s) en estado crítico necesitan reposición urgente`);
    }
    
    if (data.summary.averageUtilization > 0.7) {
      recommendations.push('- Considerar aumentar la frecuencia de reposición general');
      recommendations.push('- Evaluar la posibilidad de ampliar el inventario de seguridad');
    }
    
    if (data.summary.totalInteractions < 100) {
      recommendations.push('- Baja actividad detectada, considerar estrategias de promoción');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- Sistema funcionando de manera óptima');
      recommendations.push('- Mantener la estrategia actual de gestión de inventario');
    }
    
    return recommendations.join('\n');
  }
}
