import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogsService } from '../../shared/services/logs.service';
import { SystemLog, LogStats, LogFilters } from '../../shared/interfaces/logs.interface';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-6">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p class="mt-2 text-gray-600">Monitoreo de errores y logs del sistema</p>
        </div>        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div class="bg-white rounded-lg shadow p-4">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm font-semibold">📋</span>
                </div>
              </div>
              <div class="ml-3">
                <p class="text-xs font-medium text-gray-500">Total Logs</p>
                <p class="text-xl font-semibold text-gray-900">{{ stats().totalLogs }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-4">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm font-semibold">❌</span>
                </div>
              </div>
              <div class="ml-3">
                <p class="text-xs font-medium text-gray-500">Total Errores</p>
                <p class="text-xl font-semibold text-gray-900">{{ stats().errorCount }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-4">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm font-semibold">🔥</span>
                </div>
              </div>
              <div class="ml-3">
                <p class="text-xs font-medium text-gray-500">Errores Pendientes</p>
                <p class="text-xl font-semibold text-gray-900">{{ stats().unresolvedErrors }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-4">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm font-semibold">⚠️</span>
                </div>
              </div>
              <div class="ml-3">
                <p class="text-xs font-medium text-gray-500">Advertencias</p>
                <p class="text-xl font-semibold text-gray-900">{{ stats().warningCount }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-4">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm font-semibold">🔴</span>
                </div>
              </div>
              <div class="ml-3">
                <p class="text-xs font-medium text-gray-500">Sin Resolver</p>
                <p class="text-xl font-semibold text-gray-900">{{ stats().unresolvedCount }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-4">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm font-semibold">✅</span>
                </div>
              </div>
              <div class="ml-3">
                <p class="text-xs font-medium text-gray-500">Resueltos</p>
                <p class="text-xl font-semibold text-gray-900">{{ stats().resolvedCount }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-lg shadow mb-6">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-medium text-gray-900">Filtros</h2>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <!-- Level Filter -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nivel</label>
                <select 
                  [(ngModel)]="filters.level" 
                  (ngModelChange)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="ERROR">Error</option>
                  <option value="WARN">Advertencia</option>
                  <option value="INFO">Info</option>
                  <option value="DEBUG">Debug</option>
                </select>
              </div>

              <!-- Date From -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Desde</label>
                <input 
                  type="date" 
                  [(ngModel)]="filters.startDate"
                  (ngModelChange)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>

              <!-- Date To -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
                <input 
                  type="date" 
                  [(ngModel)]="filters.endDate"
                  (ngModelChange)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>

              <!-- Resolved Filter -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <select 
                  [(ngModel)]="filters.resolved" 
                  (ngModelChange)="applyFilters()"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option [ngValue]="undefined">Todos</option>
                  <option [ngValue]="false">Sin resolver</option>
                  <option [ngValue]="true">Resueltos</option>
                </select>
              </div>

            </div>

            <!-- Search -->
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <input 
                type="text" 
                [(ngModel)]="filters.search"
                (ngModelChange)="applyFilters()"
                placeholder="Buscar en mensaje, contexto o detalles..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>

            <!-- Actions -->
            <div class="mt-4 flex gap-2">
              <button 
                (click)="clearFilters()"
                class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Limpiar Filtros
              </button>
              <button 
                (click)="refreshData()"
                class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>

        <!-- Logs Table -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-medium text-gray-900">
                Logs del Sistema ({{ logsResponse().total }} total)
              </h2>
              <div class="text-sm text-gray-500">
                Página {{ logsResponse().page }} de {{ logsResponse().totalPages }}
              </div>
            </div>
          </div>

          @if (loading()) {
            <div class="p-8 text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p class="mt-2 text-gray-500">Cargando logs...</p>
            </div>
          } @else if (logs().length === 0) {
            <div class="p-8 text-center">
              <p class="text-gray-500">No se encontraron logs con los filtros aplicados.</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nivel
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mensaje
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contexto
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  @for (log of logs(); track log.id) {
                    <tr [class.bg-red-50]="log.level === 'ERROR'" [class.bg-yellow-50]="log.level === 'WARN'">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span [class]="getLevelBadgeClass(log.level)" class="px-2 py-1 text-xs font-semibold rounded-full">
                          {{ getLevelText(log.level) }}
                        </span>
                      </td>
                      <td class="px-6 py-4">
                        <div class="text-sm text-gray-900 max-w-xs truncate" [title]="log.message">
                          {{ log.message }}
                        </div>
                        @if (log.details) {
                          <button 
                            (click)="toggleDetails(log.id)"
                            class="text-xs text-blue-600 hover:text-blue-800 mt-1"
                          >
                            {{ showDetails[log.id] ? 'Ocultar' : 'Ver' }} detalles
                          </button>
                        }
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {{ log.context || '-' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {{ formatDate(log.timestamp) }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        @if (log.resolved) {
                          <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Resuelto
                          </span>
                        } @else {
                          <span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Pendiente
                          </span>
                        }
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        @if (!log.resolved) {
                          <button 
                            (click)="resolveLog(log.id)"
                            class="text-green-600 hover:text-green-900"
                          >
                            Resolver
                          </button>
                        }
                      </td>
                    </tr>
                    @if (showDetails[log.id] && log.details) {
                      <tr>
                        <td colspan="6" class="px-6 py-4 bg-gray-50">
                          <div class="text-sm">
                            <h4 class="font-medium text-gray-900 mb-2">Detalles técnicos:</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                              @if (log.endpoint) {
                                <div>
                                  <span class="font-medium text-gray-700">Endpoint:</span>
                                  <span class="ml-2 text-gray-600">{{ log.method }} {{ log.endpoint }}</span>
                                </div>
                              }
                              @if (log.ipAddress) {
                                <div>
                                  <span class="font-medium text-gray-700">IP:</span>
                                  <span class="ml-2 text-gray-600">{{ log.ipAddress }}</span>
                                </div>
                              }
                              @if (log.userId) {
                                <div>
                                  <span class="font-medium text-gray-700">Usuario ID:</span>
                                  <span class="ml-2 text-gray-600">{{ log.userId }}</span>
                                </div>
                              }
                              @if (log.userAgent) {
                                <div class="md:col-span-2">
                                  <span class="font-medium text-gray-700">User Agent:</span>
                                  <span class="ml-2 text-gray-600 text-xs">{{ log.userAgent }}</span>
                                </div>
                              }
                            </div>
                            @if (log.details && typeof log.details === 'object') {
                              <div class="mt-4">
                                <span class="font-medium text-gray-700">Detalles adicionales:</span>
                                <pre class="mt-2 bg-gray-100 p-3 rounded text-xs overflow-x-auto">{{ formatDetails(log.details) }}</pre>
                              </div>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (logsResponse().totalPages > 1) {
              <div class="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div class="flex-1 flex justify-between sm:hidden">
                  <button 
                    (click)="goToPage(logsResponse().page - 1)"
                    [disabled]="logsResponse().page <= 1"
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button 
                    (click)="goToPage(logsResponse().page + 1)"
                    [disabled]="logsResponse().page >= logsResponse().totalPages"
                    class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
                <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>                    <p class="text-sm text-gray-700">
                      Mostrando {{ (logsResponse().page - 1) * logsResponse().limit + 1 }} a 
                      {{ getEndRange() }} 
                      de {{ logsResponse().total }} resultados
                    </p>
                  </div>
                  <div>
                    <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button 
                        (click)="goToPage(logsResponse().page - 1)"
                        [disabled]="logsResponse().page <= 1"
                        class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        ←
                      </button>
                      @for (page of getPageNumbers(); track page) {
                        <button 
                          (click)="goToPage(page)"
                          [class.bg-blue-50]="page === logsResponse().page"
                          [class.border-blue-500]="page === logsResponse().page"
                          [class.text-blue-600]="page === logsResponse().page"
                          class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {{ page }}
                        </button>
                      }
                      <button 
                        (click)="goToPage(logsResponse().page + 1)"
                        [disabled]="logsResponse().page >= logsResponse().totalPages"
                        class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        →
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            }
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private readonly logsService = inject(LogsService);
  // Signals
  loading = signal(false);
  stats = signal<LogStats>({
    totalLogs: 0,
    errorCount: 0,
    warningCount: 0,
    unresolvedCount: 0,
    unresolvedErrors: 0,
    resolvedCount: 0,
    logsToday: 0,
    logsThisWeek: 0
  });
  
  logsResponse = signal({
    logs: [] as SystemLog[],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });

  logs = computed(() => this.logsResponse().logs);
  
  // Filters
  filters: LogFilters = {
    page: 1,
    limit: 20
  };

  // UI State
  showDetails: Record<string, boolean> = {};

  ngOnInit() {
    this.loadStats();
    this.loadLogs();
  }

  private loadStats() {
    this.logsService.getLogStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  private loadLogs() {
    this.loading.set(true);
    this.logsService.getLogs(this.filters).subscribe({
      next: (response) => {
        this.logsResponse.set(response);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading logs:', error);
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
    this.filters.page = 1; // Reset to first page when filtering
    this.loadLogs();
  }

  clearFilters() {
    this.filters = {
      page: 1,
      limit: 20
    };
    this.loadLogs();
  }

  refreshData() {
    this.loadStats();
    this.loadLogs();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.logsResponse().totalPages) {
      this.filters.page = page;
      this.loadLogs();
    }
  }
  getPageNumbers(): number[] {
    const totalPages = this.logsResponse().totalPages;
    const currentPage = this.logsResponse().page;
    const pages: number[] = [];
    
    // Show max 5 pages around current page
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getEndRange(): number {
    return Math.min(this.logsResponse().page * this.logsResponse().limit, this.logsResponse().total);
  }

  toggleDetails(logId: string) {
    this.showDetails[logId] = !this.showDetails[logId];
  }

  resolveLog(logId: string) {
    this.logsService.resolveLog(logId).subscribe({
      next: () => {
        // Update the local state
        const currentResponse = this.logsResponse();
        const updatedLogs = currentResponse.logs.map(log => 
          log.id === logId ? { ...log, resolved: true, resolvedAt: new Date() } : log
        );
        
        this.logsResponse.set({
          ...currentResponse,
          logs: updatedLogs
        });
        
        // Refresh stats
        this.loadStats();
      },
      error: (error) => {
        console.error('Error resolving log:', error);
        alert('Error al resolver el log. Por favor, inténtalo de nuevo.');
      }
    });
  }

  getLevelBadgeClass(level: string): string {
    switch (level) {
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'WARN':
        return 'bg-yellow-100 text-yellow-800';
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      case 'DEBUG':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getLevelText(level: string): string {
    switch (level) {
      case 'ERROR':
        return 'Error';
      case 'WARN':
        return 'Advertencia';
      case 'INFO':
        return 'Info';
      case 'DEBUG':
        return 'Debug';
      default:
        return level;
    }
  }

  formatDate(timestamp: Date | string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatDetails(details: any): string {
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }
}
