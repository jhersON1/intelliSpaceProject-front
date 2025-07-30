import { Component, inject, signal, computed, Output, EventEmitter, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SemanticSearchService } from '../../services/semantic-search.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-ai-search',
  standalone: true,
  imports: [CommonModule, FormsModule],  template: `
    <div class="relative">
      <div class="flex items-center bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-[25px] shadow-sm border border-indigo-100/50 transition-all duration-300 hover:shadow-md">
        
        <div class="flex items-center pl-4 pr-2">
          <div class="relative">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
        </div>

        <input 
          type="text" 
          [(ngModel)]="searchQuery"
          (input)="onSearchInput()"
          (focus)="onFocus()"
          (blur)="onBlur()"
          (keyup.enter)="onEnterPressed()"
          [placeholder]="placeholder"
          [disabled]="isSearching()"
          class="flex-1 py-2.5 lg:py-3 bg-transparent text-gray-700 placeholder-gray-500 text-sm lg:text-base font-medium focus:outline-none min-w-0"
        />        <button 
          type="button"
          (click)="performSearch()"
          [disabled]="!canSearch() || isSearching()"
          class="p-2 mr-2 hover:bg-white/50 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:cursor-pointer">
          <svg class="w-4 h-4 text-indigo-600 hover:text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    input::placeholder {
      transition: opacity 0.3s ease;
    }
    
    input:focus::placeholder {
      opacity: 0.7;
    }

    .hover\\:shadow-md:hover {
      box-shadow: 0 4px 12px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
  `]
})
export class AiSearchComponent implements OnDestroy {
  @Input() placeholder: string = '🤖 Describe qué buscas y presiona Enter... ej: "sofá cómodo para sala"';
  @Input() isMobile: boolean = false;
  @Output() searchPerformed = new EventEmitter<void>();
  @Output() searchCleared = new EventEmitter<void>();
  private readonly semanticSearchService = inject(SemanticSearchService);
  private readonly logger = inject(LoggerService);
  private readonly destroy$ = new Subject<void>();

  private readonly _isFocused = signal(false);
  private readonly _searchQuery = signal('');

  public readonly isFocused = computed(() => this._isFocused());
  public readonly isSearching = computed(() => this.semanticSearchService.isSearching());
  public readonly hasActiveSearch = computed(() => this.semanticSearchService.hasActiveSearch());
  public readonly truncatedQuery = computed(() => {
    const query = this.semanticSearchService.lastSearchQuery();
    return query.length > 30 ? query.substring(0, 30) + '...' : query;
  });
  public readonly canSearch = computed(() => this._searchQuery().trim().length >= 3);

  get searchQuery(): string {
    return this._searchQuery();
  }

  set searchQuery(value: string) {
    this._searchQuery.set(value);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFocus() {
    this._isFocused.set(true);
  }

  onBlur() {
    this._isFocused.set(false);
  }  
  
  onSearchInput() {
    this.logger.debug('🖊️ Usuario escribiendo en búsqueda', { 
      length: this._searchQuery().length,
      canSearch: this.canSearch()
    });
  }

  onEnterPressed() {
    if (this.canSearch()) {
      this.performSearch();
    }
  }

  performSearch() {
    if (!this.canSearch()) {
      return;
    }

    const queryToSearch = this._searchQuery().trim();
    this.logger.info('🎯 Búsqueda manual iniciada', { query: queryToSearch });
    
    this.semanticSearchService.semanticSearch(queryToSearch).subscribe({
      next: (response) => {
        this.searchPerformed.emit();
      },
      error: (error) => {
        this.logger.error('Error en búsqueda manual', error);
      }
    });
  }
  
  clearSearch() {
    this._searchQuery.set('');
    this.semanticSearchService.clearSearch();
    this.searchCleared.emit();
    this.logger.debug('🧹 Búsqueda limpiada desde componente');
  }
}
