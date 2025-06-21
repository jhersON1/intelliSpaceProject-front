// Interfaces para Analytics - Sistema de Teoría de Colas M/M/1

export interface ClickTrackingDto {
  productId: string;
  userIp?: string;
  userAgent?: string;
  interactionType?: 'CLICK' | 'VIEW' | 'SEARCH';
  referrer?: string;
  duration?: number;
}

export interface StockUpdateDto {
  productId: string;
  previousStock: number;
  newStock: number;
  changeType: 'REPOSITION' | 'SALE' | 'ADJUSTMENT' | 'DEPLETION';
  notes?: string;
}

export interface QueueMetrics {
  lambda: number; // Tasa de llegadas (clicks/día)
  mu: number; // Tasa de servicio (reposiciones/día)
  rho: number; // Factor de utilización
  status: 'ESTABLE' | 'ADVERTENCIA' | 'CRITICO';
  message: string;
}

export interface ProductAnalytics {
  id: string;
  totalClicks: number;
  totalViews: number;
  totalSearches: number;
  arrivalRate: number; // λ (lambda)
  serviceRate: number; // μ (mu)
  utilizationFactor: number; // ρ (rho)
  congestionStatus: 'ESTABLE' | 'ADVERTENCIA' | 'CRITICO';
  lastCalculation: Date;
  analysisPerioD: number;
}

export interface ClickTracking {
  id: string;
  productId: string;
  userIp?: string;
  userAgent?: string;
  interactionType: 'CLICK' | 'VIEW' | 'SEARCH';
  referrer?: string;
  duration: number;
  createdAt: Date;
}

export interface StockHistory {
  id: string;
  productId: string;
  previousStock: number;
  newStock: number;
  stockChange: number;
  changeType: 'REPOSITION' | 'SALE' | 'ADJUSTMENT' | 'DEPLETION';
  notes?: string;
  daysSinceLastReposition?: number;
  createdAt: Date;
}

export interface ProductStats {
  analytics: ProductAnalytics;
  recentClicks: ClickTracking[];
  stockHistory: StockHistory[];
  queueMetrics: QueueMetrics;
}

export interface VendorDashboard {
  vendorId: string;
  totalProducts: number;
  criticalProducts: number;
  averageUtilization: number;
  totalInteractions: number;
  queueMetrics: QueueMetrics;
  products: ProductDashboardInfo[];
  alerts: ProductAlert[];
}

export interface ProductDashboardInfo {
  id: string;
  name: string;
  currentStock: number;
  queueMetrics: QueueMetrics;
  analytics: ProductAnalytics;
  priority: number;
}

export interface ProductAlert {
  productId: string;
  productName: string;
  alertType: 'CRITICAL_STOCK' | 'HIGH_DEMAND' | 'REPOSITION_NEEDED';
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: Date;
}

export interface PriorityProduct {
  id: string;
  name: string;
  utilizationFactor: number;
  congestionStatus: 'ESTABLE' | 'ADVERTENCIA' | 'CRITICO';
  priority: number;
  lastReposition: Date;
  estimatedDaysUntilDepletion: number;
}

export interface QueueTheoryDemo {
  productId: string;
  teoriaM_M_1: {
    definicion: string;
    parametros: {
      lambda: {
        valor: number;
        descripcion: string;
        formula: string;
      };
      mu: {
        valor: number;
        descripcion: string;
        formula: string;
      };
      rho: {
        valor: number;
        descripcion: string;
        formula: string;
      };
    };
    interpretacion: {
      estado: string;
      mensaje: string;
      algoritmo: AlgorithmExplanation;
    };
  };
}

export interface AlgorithmExplanation {
  criterio: string;
  reglas: {
    condicion: string;
    estado: string;
    accion: string;
  }[];
  valorActual: number;
  estadoActual: string;
}

// Tipos de utilidad para Analytics
export type CongestionStatus = 'ESTABLE' | 'ADVERTENCIA' | 'CRITICO';
export type InteractionType = 'CLICK' | 'VIEW' | 'SEARCH';
export type StockChangeType = 'REPOSITION' | 'SALE' | 'ADJUSTMENT' | 'DEPLETION';
export type AlertType = 'CRITICAL_STOCK' | 'HIGH_DEMAND' | 'REPOSITION_NEEDED';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
