import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, fromEvent, takeUntil, debounceTime } from 'rxjs';

export interface VirtualScrollItem {
  id: string | number;
  data: any;
}

export interface VirtualScrollConfig {
  itemHeight: number;
  bufferSize?: number;
  tolerance?: number;
}

@Component({
  selector: 'app-virtual-scroll',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      #scrollContainer
      class="virtual-scroll-container"
      [style.height.px]="containerHeight"
      [style.overflow-y]="'auto'"
      [style.position]="'relative'">
      
      <div [style.height.px]="topSpacerHeight()"></div>
      
      <div class="virtual-scroll-content">
        @for (item of visibleItems(); track item.id) {
          <div 
            class="virtual-scroll-item"
            [style.height.px]="config.itemHeight">
            <ng-container *ngTemplateOutlet="itemTemplate; context: { $implicit: item.data, index: getItemIndex(item.id) }"></ng-container>
          </div>
        }
      </div>
      
      <div [style.height.px]="bottomSpacerHeight()"></div>
    </div>
  `,
  styles: [`
    .virtual-scroll-container {
      width: 100%;
    }
    
    .virtual-scroll-content {
      position: relative;
    }
    
    .virtual-scroll-item {
      position: relative;
      overflow: hidden;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VirtualScrollComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer', { static: true }) scrollContainer!: ElementRef<HTMLDivElement>;
  
  @Input() items: VirtualScrollItem[] = [];
  @Input() config: VirtualScrollConfig = { itemHeight: 50, bufferSize: 5, tolerance: 3 };
  @Input() containerHeight = 400;
  @Input() itemTemplate: any; // TemplateRef
  
  @Output() scrollToEnd = new EventEmitter<void>();
  @Output() scrollToTop = new EventEmitter<void>();

  private readonly destroy$ = new Subject<void>();
  
  private readonly _scrollTop = signal(0);
  private readonly _startIndex = signal(0);
  private readonly _endIndex = signal(0);

  public readonly visibleItems = computed(() => {
    const start = this._startIndex();
    const end = Math.min(this._endIndex(), this.items.length);
    return this.items.slice(start, end);
  });

  public readonly topSpacerHeight = computed(() => 
    this._startIndex() * this.config.itemHeight
  );

  public readonly bottomSpacerHeight = computed(() => 
    Math.max(0, (this.items.length - this._endIndex()) * this.config.itemHeight)
  );

  ngAfterViewInit(): void {
    this.setupScrollListener();
    this.calculateVisibleRange();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Configura el listener de scroll
   */
  private setupScrollListener(): void {
    fromEvent(this.scrollContainer.nativeElement, 'scroll')
      .pipe(
        debounceTime(16), // ~60fps
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.handleScroll();
      });
  }

  /**
   * Maneja el evento de scroll
   */
  private handleScroll(): void {
    const scrollTop = this.scrollContainer.nativeElement.scrollTop;
    this._scrollTop.set(scrollTop);
    
    this.calculateVisibleRange();
    this.checkScrollPosition();
  }

  /**
   * Calcula el rango de items visibles
   */
  private calculateVisibleRange(): void {
    const scrollTop = this._scrollTop();
    const { itemHeight, bufferSize = 5, tolerance = 3 } = this.config;
    
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.ceil((scrollTop + this.containerHeight) / itemHeight);
    
    const startIndex = Math.max(0, visibleStart - bufferSize);
    const endIndex = Math.min(this.items.length, visibleEnd + bufferSize);
    
    this._startIndex.set(startIndex);
    this._endIndex.set(endIndex);
  }

  /**
   * Verifica la posición del scroll para emitir eventos
   */
  private checkScrollPosition(): void {
    const element = this.scrollContainer.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      this.scrollToEnd.emit();
    }
    
    if (scrollTop <= 50) {
      this.scrollToTop.emit();
    }
  }

  /**
   * Obtiene el índice de un item por su ID
   */
  getItemIndex(itemId: string | number): number {
    return this.items.findIndex(item => item.id === itemId);
  }

  /**
   * Hace scroll a un item específico
   */
  scrollToItem(itemId: string | number): void {
    const index = this.getItemIndex(itemId);
    if (index !== -1) {
      const scrollTop = index * this.config.itemHeight;
      this.scrollContainer.nativeElement.scrollTop = scrollTop;
    }
  }

  /**
   * Hace scroll al inicio
   */
  scrollToTopPosition(): void {
    this.scrollContainer.nativeElement.scrollTop = 0;
  }

  /**
   * Hace scroll al final
   */
  scrollToBottom(): void {
    const element = this.scrollContainer.nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(newConfig: Partial<VirtualScrollConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.calculateVisibleRange();
  }
}
