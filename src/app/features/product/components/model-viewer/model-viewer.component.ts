import { 
  Component, 
  ElementRef, 
  ViewChild, 
  Input, 
  OnInit, 
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  signal,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Model3D, ModelAnnotation } from '../../interfaces/model-3d.interface';

import '@google/model-viewer';
import { Model3DService } from '../../services/model-3d.service';

@Component({
  selector: 'app-model-viewer',
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './model-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModelViewerComponent implements OnInit, AfterViewInit {

  private model3DService = inject(Model3DService);
  @ViewChild('modelViewer', { static: false }) modelViewerRef!: ElementRef;
  
  @Input() set model(value: Model3D | null) {
    this.model3D.set(value);
  }
  
  @Input() set productId(value: string) {
    this.currentProductId.set(value);
  }

  model3D = signal<Model3D | null>(null);
  currentProductId = signal<string>('');
  showHelp = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);
  loadingMessage = signal<string>('Cargando modelo 3D...');
  iosModelUrl = signal<string>('');
  
  // Datos mock de anotaciones
  annotations = signal<ModelAnnotation[]>([]);

  ngOnInit(): void {
    const model = this.model3D();
    const productId = this.currentProductId();
    
    if (model && productId) {
      // ✅ Usar el servicio para obtener la URL correcta de iOS
      const iosUrl = this.model3DService.getIOSModelUrl(productId);
      this.iosModelUrl.set(iosUrl);
      console.log('iOS model URL configurada:', iosUrl);
    }
  }

  ngAfterViewInit(): void {
    if (this.modelViewerRef?.nativeElement) {
      const modelViewer = this.modelViewerRef.nativeElement;
      
      modelViewer.addEventListener('load', () => {
        console.log('Modelo 3D cargado exitosamente');
        this.loadingMessage.set('Modelo cargado');
      });

      modelViewer.addEventListener('error', (event: any) => {
        console.error('Error cargando modelo 3D:', event);
        this.loadingMessage.set('Error al cargar el modelo 3D');
      });
    }
  }

  toggleHelp(): void {
    this.showHelp.update(show => !show);
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.modelViewerRef.nativeElement.requestFullscreen();
      this.isFullscreen.set(true);
    } else {
      document.exitFullscreen();
      this.isFullscreen.set(false);
    }
  }

  getHotspotPosition(annotation: ModelAnnotation): string {
    return `${annotation.position.x} ${annotation.position.y} ${annotation.position.z}`;
  }

  getHotspotNormal(annotation: ModelAnnotation): string {
    return "0 1 0";
  }
}