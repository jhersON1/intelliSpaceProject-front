import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { LoggerService } from './logger.service';
import { AnalyticsService } from './analytics.service';
import { ProductStats, VendorDashboard, ProductAnalytics } from '../types/analytics.interface';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
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

      // Handle the actual structure returned by backend (topProducts instead of products)
      const products = (dashboardData as any).topProducts || dashboardData.products || [];
      
      this.logger.debug('Dashboard data structure', { 
        hasProducts: !!dashboardData.products,
        hasTopProducts: !!(dashboardData as any).topProducts,
        productsCount: products.length
      }, 'ExportService');

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
          totalClicks: p.totalClicks || 0,
          totalViews: p.totalViews || 0,
          totalSearches: p.totalSearches || 0,
          arrivalRate: p.utilizationFactor || 0, // Approximation
          serviceRate: 1.0, // Default value
          utilizationFactor: p.utilizationFactor || 0,
          congestionStatus: p.congestionStatus || 'ESTABLE'
        })),
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
      
      if (!productStats || !productStats.analytics) {
        throw new Error(`No data available for product ${productId}`);
      }

      const exportData: ExportData = {
        title: options.customTitle || `Reporte de Analytics - Producto ${productId}`,
        generatedAt: new Date(),
        dateRange: options.dateRange,
        summary: {
          totalProducts: 1,
          totalInteractions: (productStats.analytics.totalClicks || 0) + (productStats.analytics.totalViews || 0),
          averageUtilization: productStats.analytics.utilizationFactor || 0,
          criticalProducts: productStats.analytics.congestionStatus === 'CRITICO' ? 1 : 0
        },        products: [{
          id: productStats.analytics.id,
          totalClicks: productStats.analytics.totalClicks || 0,
          totalViews: productStats.analytics.totalViews || 0,
          totalSearches: productStats.analytics.totalSearches || 0,
          arrivalRate: productStats.analytics.arrivalRate || 0,
          serviceRate: productStats.analytics.serviceRate || 1.0,
          utilizationFactor: productStats.analytics.utilizationFactor || 0,
          congestionStatus: productStats.analytics.congestionStatus || 'ESTABLE',
          lastCalculation: productStats.analytics.lastCalculation || new Date(),
          analysisPerioD: productStats.analytics.analysisPerioD || 30
        }],
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

    // Handle the actual structure returned by backend (topProducts instead of products)
    const products = (dashboardData as any).topProducts || dashboardData.products || [];
    
    if (products.length === 0) {
      this.logger.warn('No products available for chart generation', {}, 'ExportService');
      return charts;
    }

    // Utilization distribution chart
    charts.push({
      type: 'bar',
      title: 'Distribución de Factor de Utilización',
      data: {
        labels: products.map((p: any) => p.title || p.name || 'Sin nombre'),
        datasets: [{
          label: 'Factor de Utilización (ρ)',
          data: products.map((p: any) => p.utilizationFactor || 0),
          backgroundColor: products.map((p: any) => 
            p.congestionStatus === 'CRITICO' ? '#ef4444' :
            p.congestionStatus === 'ADVERTENCIA' ? '#f59e0b' : '#10b981'
          )
        }]
      }
    });

    // Status distribution pie chart
    const statusCounts = products.reduce((acc: Record<string, number>, p: any) => {
      const status = p.congestionStatus || 'ESTABLE';
      acc[status] = (acc[status] || 0) + 1;
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

    // Validate input
    if (!productStats || !productStats.analytics) {
      this.logger.warn('Invalid product stats for chart generation', { productStats }, 'ExportService');
      return charts;
    }

    // Get historical data if available
    try {
      const [clickHistory, stockHistory] = await Promise.allSettled([
        this.analyticsService.getClickHistory(productStats.analytics.id, 30).toPromise(),
        this.analyticsService.getStockHistory(productStats.analytics.id, 30).toPromise()
      ]);

      // Handle click history
      if (clickHistory.status === 'fulfilled' && clickHistory.value && clickHistory.value.length > 0) {
        charts.push({
          type: 'line',
          title: 'Historial de Interacciones (30 días)',
          data: {
            labels: clickHistory.value.map(h => new Date(h.createdAt).toLocaleDateString()),
            datasets: [{
              label: 'Clicks por día',
              data: this.aggregateClicksByDay(clickHistory.value),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
          }
        });
      }

      // Handle stock history
      if (stockHistory.status === 'fulfilled' && stockHistory.value && stockHistory.value.length > 0) {
        charts.push({
          type: 'line',
          title: 'Historial de Stock (30 días)',
          data: {
            labels: stockHistory.value.map(h => new Date(h.createdAt).toLocaleDateString()),
            datasets: [{
              label: 'Nivel de Stock',
              data: stockHistory.value.map(h => h.newStock),
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
  }  /**
   * Generate PDF using jsPDF with detailed analytics
   */  private generatePDF(data: ExportData): Blob {
    // Create PDF in LANDSCAPE orientation for better table visibility
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 25;

    // PROFESSIONAL HEADER DESIGN
    // Main header background with gradient effect
    doc.setFillColor(30, 64, 175); // Professional navy blue
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    // Accent strip
    doc.setFillColor(59, 130, 246); // Lighter blue accent
    doc.rect(0, 52, pageWidth, 8, 'F');

    // Company branding with professional typography
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('IntelliSpace', 25, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 230, 255); // Light blue for subtitle
    doc.text('Sistema Avanzado de Analytics', 25, 35);

    // Document title with elegant positioning
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const titleX = pageWidth - 25;
    doc.text(data.title, titleX, 20, { align: 'right' });    // Metadata with professional formatting
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 230, 255);
    doc.text(`Fecha: ${data.generatedAt.toLocaleString('es-ES')}`, titleX, 30, { align: 'right' });

    if (data.dateRange) {
      doc.text(`Período: ${data.dateRange.startDate.toLocaleDateString('es-ES')} - ${data.dateRange.endDate.toLocaleDateString('es-ES')}`, titleX, 38, { align: 'right' });
    }

    // Professional separator with subtle design
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(25, 48, pageWidth - 25, 48);

    // Set professional text color for body
    doc.setTextColor(55, 65, 81); // Professional dark gray
    yPosition = 75;    // EXECUTIVE SUMMARY SECTION - Modern professional design
    // Section background with subtle gradient effect
    doc.setFillColor(248, 250, 252); // Very light blue-gray
    doc.rect(15, yPosition - 8, pageWidth - 30, 35, 'F');
    
    // Add subtle border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(15, yPosition - 8, pageWidth - 30, 35);
      // Section title with professional styling
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175); // Navy blue
    doc.text('RESUMEN EJECUTIVO', 25, yPosition + 5);
    
    // Professional decorative accent
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(3);
    doc.line(25, yPosition + 8, 85, yPosition + 8);
    
    // Brief description with professional typography
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // Medium gray
    doc.text('Métricas clave del rendimiento del sistema y estado operacional', 25, yPosition + 16);
    
    doc.setTextColor(55, 65, 81); // Reset to professional dark gray
    yPosition += 40;    const summaryData = [
      ['Métrica', 'Valor', 'Estado', 'Evaluación'],
      [
        'Total de Productos', 
        data.summary.totalProducts.toString(), 
        data.summary.totalProducts > 0 ? 'ACTIVO' : 'SIN PRODUCTOS', 
        this.getSummaryEvaluation('products', data.summary.totalProducts)
      ],      [
        'Total de Interacciones', 
        data.summary.totalInteractions.toLocaleString('es-ES'), 
        this.getInteractionStatus(data.summary.totalInteractions), 
        this.getSummaryEvaluation('interactions', data.summary.totalInteractions)
      ],
      [
        'Utilización Promedio', 
        `${(data.summary.averageUtilization * 100).toFixed(2)}%`, 
        this.getUtilizationStatus(data.summary.averageUtilization), 
        this.getSummaryEvaluation('utilization', data.summary.averageUtilization)
      ],
      [
        'Productos Críticos', 
        data.summary.criticalProducts.toString(), 
        data.summary.criticalProducts > 0 ? 'REQUIERE ATENCION' : 'ESTABLE', 
        this.getSummaryEvaluation('critical', data.summary.criticalProducts)
      ]
    ];    autoTable(doc, {
      head: [summaryData[0]],
      body: summaryData.slice(1),
      startY: yPosition,
      theme: 'striped',
      margin: { left: 25, right: 25 },
      tableWidth: 'auto',      styles: { 
        fontSize: 10, // Reducir de 12 a 10
        cellPadding: 8, // Reducir de 10 a 8
        font: 'helvetica',
        textColor: [55, 65, 81],
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle'
      },headStyles: { 
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontSize: 10, // Reducir de 13 a 10
        fontStyle: 'bold',
        font: 'helvetica',
        halign: 'center',
        cellPadding: 8 // Reducir de 12 a 8
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      columnStyles: {
        0: { 
          fontStyle: 'bold', 
          cellWidth: 120, 
          fillColor: [248, 250, 252],
          textColor: [30, 64, 175],
          halign: 'left'
        },
        1: { 
          cellWidth: 80, 
          halign: 'center', 
          fontStyle: 'bold',
          textColor: [16, 185, 129]
        },
        2: { 
          cellWidth: 100, 
          halign: 'center',
          fontSize: 11,
          fontStyle: 'bold'
        },
        3: { 
          cellWidth: 200, 
          fontSize: 11,
          textColor: [107, 114, 128],
          halign: 'left'
        }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          const cellText = data.cell.text[0];
          if (cellText && (cellText.includes('CRITICO') || cellText.includes('REQUIERE'))) {
            data.cell.styles.fillColor = [252, 165, 165];
            data.cell.styles.textColor = [153, 27, 27];
          } else if (cellText && (cellText.includes('ADVERTENCIA') || cellText.includes('MEDIO'))) {
            data.cell.styles.fillColor = [253, 230, 138];
            data.cell.styles.textColor = [146, 64, 14];
          } else if (cellText && (cellText.includes('ACTIVO') || cellText.includes('ESTABLE') || cellText.includes('BAJO'))) {
            data.cell.styles.fillColor = [187, 247, 208];
            data.cell.styles.textColor = [21, 128, 61];
          }
        }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 25; // Aumentar espaciado de 15 a 25    // PRODUCTS ANALYSIS SECTION - Professional design
    if (data.products && data.products.length > 0) {
      // Check if we need a new page
      if (yPosition > pageHeight - 120) {
        doc.addPage();
        yPosition = 20;
          // Add professional header to new page
        doc.setFillColor(30, 64, 175);
        doc.rect(0, 0, pageWidth, 60, 'F');
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 52, pageWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('IntelliSpace', 25, 25);
        doc.setFontSize(10);
        doc.text('Sistema Avanzado de Analytics', 25, 35);
        doc.setTextColor(55, 65, 81);
        yPosition = 80;
      }

      // Professional section background
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPosition - 8, pageWidth - 30, 35, 'F');
      
      // Add subtle border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(15, yPosition - 8, pageWidth - 30, 35);
        doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('ANALISIS DETALLADO DE PRODUCTOS', 25, yPosition + 5);
        // Professional decorative accent
      doc.setDrawColor(30, 64, 175); // Usar el mismo color corporativo
      doc.setLineWidth(3);
      doc.line(25, yPosition + 8, 125, yPosition + 8);
      
      // Brief description
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Métricas individuales de productos con análisis de teoría de colas', 25, yPosition + 16);
      
      doc.setTextColor(55, 65, 81);yPosition += 40;      // PRODUCTS TABLE - Full details optimized for landscape orientation
      const productHeaders = [
        'ID Producto', 'Nombre', 'Clicks', 'Vistas', 'Búsquedas', 'Llegada', 'Servicio', 'Utilización', 'Estado', 'Diagnóstico'
      ];const productRows = data.products.map(product => [
        product.id, // ID completo sin puntos suspensivos
        this.generateProductName(product.id), // Nombre generado del producto
        product.totalClicks.toString(),
        product.totalViews.toString(),
        product.totalSearches?.toString() || '0',
        product.arrivalRate.toFixed(3),
        product.serviceRate.toFixed(3),
        (product.utilizationFactor * 100).toFixed(1) + '%',
        this.getSimpleProductStatus(product.congestionStatus),
        this.getDetailedDiagnosis(product)
      ]);autoTable(doc, {
        head: [productHeaders],
        body: productRows,
        startY: yPosition,
        theme: 'striped',
        margin: { left: 30, right: 30 },        styles: { 
          fontSize: 10, 
          cellPadding: 6,
          font: 'helvetica',
          textColor: [55, 65, 81],
          lineColor: [226, 232, 240],
          lineWidth: 0.5,
          overflow: 'linebreak',
          halign: 'center'
        },        headStyles: { 
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontSize: 9, // Reducir de 11 a 9
          fontStyle: 'bold',
          font: 'helvetica',
          halign: 'center',
          cellPadding: 6 // Reducir padding también
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]        },        columnStyles: {
          0: { 
            cellWidth: 80, // Incrementar ancho para IDs largos
            fontSize: 8,
            fontStyle: 'bold',
            textColor: [30, 64, 175],
            halign: 'left',
            overflow: 'linebreak' // Permitir salto de línea
          },          1: { 
            cellWidth: 60, 
            fontSize: 9,
            fontStyle: 'bold',
            textColor: [30, 64, 175],
            halign: 'center',
            overflow: 'linebreak'
          },
          2: { 
            cellWidth: 45, 
            fontSize: 10,
            fontStyle: 'bold',
            textColor: [30, 64, 175],
            halign: 'center'
          },
          3: { 
            cellWidth: 45, 
            fontSize: 10,
            fontStyle: 'bold',
            textColor: [30, 64, 175],
            halign: 'center'
          },
          4: { 
            cellWidth: 55, 
            fontSize: 9,
            textColor: [107, 114, 128],
            halign: 'center'
          },
          5: { 
            cellWidth: 60, 
            fontSize: 9,
            textColor: [107, 114, 128],
            halign: 'center'
          },
          6: { 
            cellWidth: 60, 
            fontSize: 9,
            textColor: [107, 114, 128],
            halign: 'center'
          },
          7: { 
            cellWidth: 70, 
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
          },
          8: { 
            cellWidth: 60, 
            fontSize: 9,
            halign: 'center'
          },
          9: { 
            cellWidth: 180, // Reducir ancho para diagnóstico
            fontSize: 8,
            textColor: [107, 114, 128],
            halign: 'left',
            overflow: 'linebreak'
          }
        },        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 8) {
            const status = productRows[data.row.index][8];
            if (status.includes('CRITICO')) {
              data.cell.styles.fillColor = [252, 165, 165];
              data.cell.styles.textColor = [153, 27, 27];
            } else if (status.includes('ADVERTENCIA')) {
              data.cell.styles.fillColor = [253, 230, 138];
              data.cell.styles.textColor = [146, 64, 14];
            } else if (status.includes('ESTABLE')) {
              data.cell.styles.fillColor = [187, 247, 208];
              data.cell.styles.textColor = [21, 128, 61];
            }
          }
          // Style utilization column with color coding
          if (data.section === 'body' && data.column.index === 7) {
            const utilization = parseFloat(productRows[data.row.index][7]);
            if (utilization >= 80) {
              data.cell.styles.textColor = [153, 27, 27];
              data.cell.styles.fontStyle = 'bold';
            } else if (utilization >= 60) {
              data.cell.styles.textColor = [146, 64, 14];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [21, 128, 61];
            }
          }
        }
      });      yPosition = (doc as any).lastAutoTable.finalY + 30; // Aumentar espaciado de 20 a 30

      // QUEUE THEORY ANALYSIS SECTION - Professional design
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 25;
      }

      // Professional section background
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPosition - 8, pageWidth - 30, 35, 'F');
      
      // Add subtle border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(15, yPosition - 8, pageWidth - 30, 35);      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('ANALISIS DE TEORIA DE COLAS', 25, yPosition + 5);
      
      // Professional decorative accent
      doc.setDrawColor(30, 64, 175); // Usar color corporativo consistente
      doc.setLineWidth(3);
      doc.line(25, yPosition + 8, 110, yPosition + 8);
      
      // Brief description
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Fundamentos matematicos y evaluacion de rendimiento del sistema', 25, yPosition + 16);
      
      doc.setTextColor(55, 65, 81);
      yPosition += 40;      // Create explanation boxes with professional styling
      const explanationItems = [
        { symbol: 'L', name: 'Lambda', desc: 'Tasa de llegada - Frecuencia de interacciones por unidad de tiempo' },
        { symbol: 'M', name: 'Mu', desc: 'Tasa de servicio - Capacidad de procesamiento del sistema' },
        { symbol: 'R', name: 'Rho', desc: 'Factor de utilizacion - L/M, indica la intensidad del trafico' }
      ];      explanationItems.forEach((item, index) => {
        const boxY = yPosition + (index * 25); // Aumentar espaciado de 20 a 25
        
        // Symbol box
        doc.setFillColor(30, 64, 175);
        doc.rect(25, boxY - 4, 16, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(item.symbol, 33, boxY + 4, { align: 'center' });
        
        // Description con mejor espaciado
        doc.setTextColor(55, 65, 81);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`(${item.name}):`, 46, boxY + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(item.desc, 85, boxY + 4);
      });

      yPosition += 85; // Aumentar espaciado final de 70 a 85// Status indicators with professional styling
      const statusItems = [
        { color: [153, 27, 27], bg: [252, 165, 165], icon: '●', label: 'CRITICO', desc: 'R >= 0.8 (Riesgo de saturacion del sistema)' },
        { color: [146, 64, 14], bg: [253, 230, 138], icon: '●', label: 'ADVERTENCIA', desc: '0.6 <= R < 0.8 (Monitoreo recomendado)' },
        { color: [21, 128, 61], bg: [187, 247, 208], icon: '●', label: 'ESTABLE', desc: 'R < 0.6 (Funcionamiento optimo)' }
      ];      statusItems.forEach((item, index) => {
        const statusY = yPosition + (index * 26); // Aumentar espaciado de 22 a 26
        
        // Status indicator box
        doc.setFillColor(item.bg[0], item.bg[1], item.bg[2]);
        doc.rect(25, statusY - 4, 12, 12, 'F');
        doc.setTextColor(item.color[0], item.color[1], item.color[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(item.icon, 31, statusY + 4, { align: 'center' });
          // Status label and description con mejor espaciado
        doc.setTextColor(item.color[0], item.color[1], item.color[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`Estado ${item.label}:`, 42, statusY + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        doc.text(item.desc, 160, statusY + 4); // Mover descripción más a la derecha (120 → 160)
      });

      yPosition += 90; // Aumentar espaciado final de 75 a 90// STRATEGIC RECOMMENDATIONS SECTION - Professional design
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 25;
      }

      // Professional section background
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPosition - 8, pageWidth - 30, 35, 'F');
      
      // Add subtle border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(15, yPosition - 8, pageWidth - 30, 35);      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('RECOMENDACIONES ESTRATEGICAS', 25, yPosition + 5);
      
      // Professional decorative accent
      doc.setDrawColor(30, 64, 175); // Usar color corporativo consistente
      doc.setLineWidth(3);
      doc.line(25, yPosition + 8, 130, yPosition + 8);
      
      // Brief description
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Acciones estrategicas basadas en el analisis de datos y tendencias', 25, yPosition + 16);
      
      doc.setTextColor(55, 65, 81);
      yPosition += 40;

      const recommendations = this.generateRecommendations(data);

      recommendations.forEach((rec, index) => {
        if (yPosition > pageHeight - 35) {
          doc.addPage();
          yPosition = 25;
        }
          // Recommendation card background
        const cardHeight = 35; // Aumentar altura de 25 a 35
        doc.setFillColor(255, 255, 255);
        doc.rect(25, yPosition - 5, pageWidth - 50, cardHeight, 'F');
        
        // Subtle border
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.rect(25, yPosition - 5, pageWidth - 50, cardHeight);
          // Priority indicator
        let priorityColor = [107, 114, 128]; // Default gray
        if (rec.priority.includes('ALTA') || rec.priority.includes('CRÍTICO')) priorityColor = [153, 27, 27]; // Red
        else if (rec.priority.includes('MEDIA') || rec.priority.includes('ADVERTENCIA')) priorityColor = [146, 64, 14]; // Amber
        else if (rec.priority.includes('BAJA') || rec.priority.includes('INFO')) priorityColor = [59, 130, 246]; // Blue
        
        doc.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2]);
        doc.rect(25, yPosition - 5, 4, cardHeight, 'F');
          // Title
        doc.setTextColor(30, 64, 175);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`${rec.priority} ${rec.title}`, 35, yPosition + 5); // Aumentar posición Y
        
        // Description con más espacio
        doc.setTextColor(55, 65, 81);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const splitText = doc.splitTextToSize(rec.description, pageWidth - 70);
        doc.text(splitText, 35, yPosition + 15); // Aumentar posición Y para más espacio
        
        yPosition += cardHeight + 12; // Aumentar espaciado entre tarjetas
      });
    }    // PROFESSIONAL FOOTER with enhanced design
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      
      // Footer line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
      
      // Professional footer content
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
        // Left side - Company info
      doc.text('IntelliSpace Analytics Platform', 25, pageHeight - 15);
      
      // Center - Page numbers with professional style
      doc.setFont('helvetica', 'bold');
      doc.text(`${i}`, pageWidth / 2 - 3, pageHeight - 15, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(`de ${pageCount}`, pageWidth / 2 + 3, pageHeight - 15);
      
      // Right side - Generation timestamp
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 25, pageHeight - 15, { align: 'right' });
      
      // Subtle decorative element
      doc.setFillColor(30, 64, 175);
      doc.rect(20, pageHeight - 5, pageWidth - 40, 2, 'F');
    }

    this.logger.info('PDF generated successfully', { title: data.title }, 'ExportService');
    return doc.output('blob');
  }
  /**
   * Generate Excel file with detailed analytics
   */
  private generateExcel(data: ExportData): Blob {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['RESUMEN EJECUTIVO'],
      [''],
      ['Métrica', 'Valor', 'Estado'],
      ['Total de Productos', data.summary.totalProducts, data.summary.totalProducts > 0 ? 'Activo' : 'Sin productos'],
      ['Total de Interacciones', data.summary.totalInteractions, this.getInteractionStatus(data.summary.totalInteractions)],
      ['Utilización Promedio', `${(data.summary.averageUtilization * 100).toFixed(2)}%`, this.getUtilizationStatus(data.summary.averageUtilization)],
      ['Productos Críticos', data.summary.criticalProducts, data.summary.criticalProducts > 0 ? 'Requiere Atención' : 'Estable'],
      [''],
      ['INFORMACIÓN DEL REPORTE'],
      ['Título', data.title],
      ['Fecha de Generación', data.generatedAt.toLocaleString('es-ES')],
      ['Período', data.dateRange ? `${data.dateRange.startDate.toLocaleDateString('es-ES')} - ${data.dateRange.endDate.toLocaleDateString('es-ES')}` : 'Todos los datos disponibles']
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Products Detail Sheet
    if (data.products && data.products.length > 0) {
      const productHeaders = [
        'ID Producto',
        'Total Clicks',
        'Total Vistas', 
        'Total Búsquedas',
        'Tasa de Llegada (λ)',
        'Tasa de Servicio (μ)',
        'Factor de Utilización (ρ)',
        'Estado de Congestión',
        'Diagnóstico Detallado',
        'Recomendación'
      ];

      const productData = [
        productHeaders,
        ...data.products.map(product => [
          product.id,
          product.totalClicks,
          product.totalViews,
          product.totalSearches || 0,
          product.arrivalRate.toFixed(4),
          product.serviceRate.toFixed(4),
          product.utilizationFactor.toFixed(4),
          product.congestionStatus,
          this.getDetailedDiagnosis(product),
          this.getProductRecommendation(product)
        ])
      ];

      const productSheet = XLSX.utils.aoa_to_sheet(productData);
      XLSX.utils.book_append_sheet(workbook, productSheet, 'Análisis Detallado');

      // Queue Theory Metrics Sheet
      const queueData = [
        ['ANÁLISIS DE TEORÍA DE COLAS'],
        [''],
        ['Concepto', 'Símbolo', 'Descripción', 'Rango Óptimo'],
        ['Tasa de Llegada', 'λ (Lambda)', 'Frecuencia de interacciones por unidad de tiempo', 'Variable según producto'],
        ['Tasa de Servicio', 'μ (Mu)', 'Capacidad de procesamiento del sistema', '> λ para estabilidad'],
        ['Factor de Utilización', 'ρ (Rho)', 'λ/μ - Intensidad del tráfico', '< 0.8 para evitar congestión'],
        [''],
        ['CLASIFICACIÓN DE ESTADOS'],
        ['Estado', 'Rango ρ', 'Descripción', 'Acción Requerida'],
        ['ESTABLE', '0.0 - 0.6', 'Funcionamiento óptimo', 'Monitoreo rutinario'],
        ['ADVERTENCIA', '0.6 - 0.8', 'Congestión moderada', 'Monitoreo intensivo'],
        ['CRÍTICO', '0.8 - 1.0', 'Alto riesgo de saturación', 'Acción inmediata requerida'],
        ['SATURADO', '> 1.0', 'Sistema inestable', 'Intervención urgente']
      ];

      const queueSheet = XLSX.utils.aoa_to_sheet(queueData);
      XLSX.utils.book_append_sheet(workbook, queueSheet, 'Teoría de Colas');
    }

    // Recommendations Sheet
    const recommendations = this.generateRecommendations(data);
    const recommendationData = [
      ['RECOMENDACIONES ESTRATÉGICAS'],
      [''],
      ['Prioridad', 'Título', 'Descripción'],
      ...recommendations.map(rec => [rec.priority, rec.title, rec.description])
    ];

    const recommendationSheet = XLSX.utils.aoa_to_sheet(recommendationData);
    XLSX.utils.book_append_sheet(workbook, recommendationSheet, 'Recomendaciones');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    this.logger.info('Excel generated successfully', { title: data.title }, 'ExportService');
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
   * Generate CSV content with detailed analytics
   */
  private generateCSVContent(data: ExportData): string {
    const sections = [];

    // Header information
    sections.push('REPORTE DE ANALYTICS DETALLADO');
    sections.push(`Título: ${data.title}`);
    sections.push(`Fecha de Generación: ${data.generatedAt.toLocaleString('es-ES')}`);
    if (data.dateRange) {
      sections.push(`Período: ${data.dateRange.startDate.toLocaleDateString('es-ES')} - ${data.dateRange.endDate.toLocaleDateString('es-ES')}`);
    }
    sections.push('');

    // Executive Summary
    sections.push('RESUMEN EJECUTIVO');
    sections.push('Métrica,Valor,Estado');
    sections.push(`Total de Productos,${data.summary.totalProducts},${data.summary.totalProducts > 0 ? 'Activo' : 'Sin productos'}`);
    sections.push(`Total de Interacciones,${data.summary.totalInteractions},${this.getInteractionStatus(data.summary.totalInteractions)}`);
    sections.push(`Utilización Promedio,${(data.summary.averageUtilization * 100).toFixed(2)}%,${this.getUtilizationStatus(data.summary.averageUtilization)}`);
    sections.push(`Productos Críticos,${data.summary.criticalProducts},${data.summary.criticalProducts > 0 ? 'Requiere Atención' : 'Estable'}`);
    sections.push('');

    // Products detailed analysis
    if (data.products && data.products.length > 0) {
      sections.push('ANÁLISIS DETALLADO DE PRODUCTOS');
      const headers = [
        'ID Producto',
        'Total Clicks',
        'Total Vistas',
        'Total Búsquedas',
        'Tasa de Llegada (λ)',
        'Tasa de Servicio (μ)',
        'Factor de Utilización (ρ)',
        'Estado',
        'Diagnóstico',
        'Recomendación'
      ];
      sections.push(headers.join(','));

      data.products.forEach(product => {
        const row = [
          `"${product.id}"`,
          product.totalClicks,
          product.totalViews,
          product.totalSearches || 0,
          product.arrivalRate.toFixed(4),
          product.serviceRate.toFixed(4),
          product.utilizationFactor.toFixed(4),
          `"${product.congestionStatus}"`,
          `"${this.getDetailedDiagnosis(product)}"`,
          `"${this.getProductRecommendation(product)}"`
        ];
        sections.push(row.join(','));
      });
      sections.push('');
    }

    // Queue Theory Explanation
    sections.push('EXPLICACIÓN DE TEORÍA DE COLAS');
    sections.push('Concepto,Símbolo,Descripción');
    sections.push('"Tasa de Llegada","λ (Lambda)","Frecuencia de interacciones por unidad de tiempo"');
    sections.push('"Tasa de Servicio","μ (Mu)","Capacidad de procesamiento del sistema"');
    sections.push('"Factor de Utilización","ρ (Rho)","λ/μ - Intensidad del tráfico del sistema"');
    sections.push('');

    // State Classification
    sections.push('CLASIFICACIÓN DE ESTADOS');
    sections.push('Estado,Rango ρ,Descripción,Acción Requerida');
    sections.push('"ESTABLE","0.0 - 0.6","Funcionamiento óptimo","Monitoreo rutinario"');
    sections.push('"ADVERTENCIA","0.6 - 0.8","Congestión moderada","Monitoreo intensivo"');
    sections.push('"CRÍTICO","0.8 - 1.0","Alto riesgo de saturación","Acción inmediata requerida"');
    sections.push('"SATURADO","> 1.0","Sistema inestable","Intervención urgente"');
    sections.push('');

    // Recommendations
    const recommendations = this.generateRecommendations(data);
    sections.push('RECOMENDACIONES ESTRATÉGICAS');
    sections.push('Prioridad,Título,Descripción');
    recommendations.forEach(rec => {
      sections.push(`"${rec.priority}","${rec.title}","${rec.description}"`);
    });

    return sections.join('\n');
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
  /**
   * Get interaction status based on total interactions
   */
  private getInteractionStatus(totalInteractions: number): string {
    if (totalInteractions > 1000) return 'Alto Trafico';
    if (totalInteractions > 500) return 'Trafico Moderado';
    if (totalInteractions > 100) return 'Trafico Bajo';
    return 'Muy Bajo';
  }

  /**
   * Get utilization status based on factor
   */
  private getUtilizationStatus(utilization: number): string {
    if (utilization >= 0.8) return 'Critico';
    if (utilization >= 0.6) return 'Advertencia';
    if (utilization >= 0.3) return 'Optimo';
    return 'Subutilizado';
  }
  /**
   * Get status icon for congestion status
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'CRITICO': return '🚨 CRÍTICO';
      case 'ADVERTENCIA': return '⚠️ ADVERTENCIA';
      case 'ESTABLE': return '✅ ESTABLE';
      default: return '❓ DESCONOCIDO';
    }
  }

  /**
   * Get simple product status without emojis for PDF
   */
  private getSimpleProductStatus(status: string): string {
    switch (status) {
      case 'CRITICO': return 'CRITICO';
      case 'ADVERTENCIA': return 'ADVERTENCIA';
      case 'ESTABLE': return 'ESTABLE';
      default: return 'DESCONOCIDO';
    }
  }

  /**
   * Get detailed diagnosis for a product
   */
  private getDetailedDiagnosis(product: ProductAnalytics): string {
    const rho = product.utilizationFactor;
    
    if (rho >= 0.9) {
      return 'Sistema saturado. Riesgo de colapso inminente.';
    } else if (rho >= 0.8) {
      return 'Alta congestión. Requiere optimización urgente.';
    } else if (rho >= 0.7) {
      return 'Congestión moderada. Monitorear de cerca.';
    } else if (rho >= 0.5) {
      return 'Funcionamiento normal. Sistema estable.';
    } else if (rho >= 0.3) {
      return 'Baja utilización. Considerar estrategias de marketing.';
    } else {
      return 'Muy baja actividad. Revisar visibilidad del producto.';
    }
  }

  /**
   * Generate strategic recommendations based on data
   */
  private generateRecommendations(data: ExportData): Array<{priority: string, title: string, description: string}> {
    const recommendations = [];
      // Critical products recommendation
    if (data.summary.criticalProducts > 0) {
      recommendations.push({
        priority: 'ALTA',
        title: 'Productos en Estado Crítico',
        description: `Se detectaron ${data.summary.criticalProducts} producto(s) en estado crítico. Es fundamental implementar medidas inmediatas para reducir la carga: aumentar capacidad de procesamiento, optimizar procesos de atención, o redistribuir la demanda.`
      });
    }

    // Low utilization recommendation
    const lowUtilizationProducts = data.products.filter(p => p.utilizationFactor < 0.3).length;
    if (lowUtilizationProducts > 0) {
      recommendations.push({
        priority: 'MEDIA',
        title: 'Productos Subutilizados',
        description: `${lowUtilizationProducts} producto(s) muestran baja utilización. Considerar estrategias de marketing digital, mejora de posicionamiento SEO, o revisión de precios para aumentar la visibilidad y demanda.`
      });
    }

    // Overall utilization recommendation
    if (data.summary.averageUtilization > 0.7) {
      recommendations.push({
        priority: 'MEDIA',
        title: 'Utilización General Alta',
        description: 'La utilización promedio del sistema es alta. Considerar escalamiento horizontal, implementación de cache, o distribución de carga para mantener la calidad del servicio.'
      });
    }

    // Interaction volume recommendation
    if (data.summary.totalInteractions > 5000) {
      recommendations.push({
        priority: 'BAJA',
        title: 'Alto Volumen de Interacciones',
        description: 'El sistema está procesando un alto volumen de interacciones. Implementar analytics avanzados para identificar patrones de comportamiento y oportunidades de conversión.'
      });
    }

    // Default recommendation if no issues
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'INFO',
        title: 'Sistema Funcionando Óptimamente',
        description: 'Todos los indicadores están dentro de rangos normales. Continuar monitoreando métricas clave y mantener las mejores prácticas implementadas.'
      });
    }

    return recommendations;
  }

  /**
   * Get specific recommendation for a product
   */
  private getProductRecommendation(product: ProductAnalytics): string {
    const rho = product.utilizationFactor;
    
    if (rho >= 0.9) {
      return 'URGENTE: Aumentar capacidad de servicio inmediatamente';
    } else if (rho >= 0.8) {
      return 'Optimizar procesos de atención al cliente';
    } else if (rho >= 0.7) {
      return 'Monitorear tendencias y preparar escalamiento';
    } else if (rho >= 0.5) {
      return 'Mantener niveles actuales de servicio';
    } else if (rho >= 0.3) {
      return 'Implementar estrategias de marketing digital';
    } else {
      return 'Revisar posicionamiento y visibilidad del producto';
    }
  }

  /**
   * Get summary evaluation text for metrics
   */
  private getSummaryEvaluation(type: string, value: number): string {
    switch (type) {
      case 'products':
        if (value > 50) return 'Catálogo amplio y diversificado';
        if (value > 20) return 'Buena variedad de productos';
        if (value > 10) return 'Catálogo en crecimiento';
        if (value > 0) return 'Catálogo inicial establecido';
        return 'Necesita agregar productos';
      
      case 'interactions':
        if (value > 5000) return 'Excelente engagement del usuario';
        if (value > 2000) return 'Buen nivel de interacción';
        if (value > 500) return 'Interacción moderada';
        if (value > 100) return 'Actividad inicial detectada';
        return 'Requiere estrategias de engagement';
      
      case 'utilization':
        if (value > 0.8) return 'Sistema altamente utilizado';
        if (value > 0.6) return 'Utilización balanceada';
        if (value > 0.4) return 'Uso moderado del sistema';
        if (value > 0.2) return 'Oportunidad de crecimiento';
        return 'Requiere optimización de tráfico';
      
      case 'critical':
        if (value > 5) return 'Múltiples productos requieren atención';
        if (value > 2) return 'Algunos productos en riesgo';
        if (value === 1) return 'Un producto requiere monitoreo';
        return 'Sistema funcionando establemente';
      
      default:
        return 'Métrica evaluada correctamente';
    }
  }

  /**
   * Generate a readable product name from product ID
   */
  private generateProductName(productId: string): string {
    // If ID is short, use it directly
    if (productId.length <= 12) {
      return `Producto ${productId}`;
    }
    
    // For longer IDs, take first 8 characters and add a readable suffix
    const shortId = productId.substring(0, 8);
    const lastChars = productId.substring(productId.length - 4);
    return `Producto ${shortId}...${lastChars}`;
  }
}
