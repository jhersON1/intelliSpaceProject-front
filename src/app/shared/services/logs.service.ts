import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { API_ROUTES } from '../../core/constants/api.constants';
import { SystemLog, LogsResponse, LogStats, LogFilters } from '../interfaces/logs.interface';

@Injectable({
  providedIn: 'root'
})
export class LogsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  /**
   * Obtiene los logs del sistema con filtros opcionales
   */
  getLogs(filters?: LogFilters): Observable<LogsResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.level) params = params.set('level', filters.level);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.resolved !== undefined) params = params.set('resolved', filters.resolved.toString());
      if (filters.search) params = params.set('search', filters.search);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<LogsResponse>(`${this.baseUrl}${API_ROUTES.ADMIN_LOGS}`, { params });
  }

  /**
   * Obtiene las estadísticas de los logs
   */
  getLogStats(): Observable<LogStats> {
    return this.http.get<LogStats>(`${this.baseUrl}${API_ROUTES.ADMIN_LOGS_STATS}`);
  }

  /**
   * Marca un log como resuelto
   */
  resolveLog(logId: string): Observable<SystemLog> {
    return this.http.patch<SystemLog>(
      `${this.baseUrl}${API_ROUTES.ADMIN_LOGS_RESOLVE}/${logId}/resolve`,
      {}
    );
  }

  /**
   * Marca múltiples logs como resueltos
   */
  resolveLogs(logIds: string[]): Observable<{ resolved: number }> {
    return this.http.patch<{ resolved: number }>(
      `${this.baseUrl}${API_ROUTES.ADMIN_LOGS_RESOLVE}/resolve-batch`,
      { logIds }
    );
  }
}
