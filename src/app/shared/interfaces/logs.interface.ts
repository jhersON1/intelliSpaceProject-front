export interface SystemLog {
  id: string;
  traceId: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  context?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
  userRole?: string;
  businessContext?: string;
  entityIds?: Record<string, any>;
  stackTrace?: string;
  errorContext?: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface LogsResponse {
  logs: SystemLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LogStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  unresolvedCount: number;
  unresolvedErrors: number;
  resolvedCount: number;
  logsToday: number;
  logsThisWeek: number;
}

export interface LogFilters {
  level?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  startDate?: string;
  endDate?: string;
  resolved?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}
