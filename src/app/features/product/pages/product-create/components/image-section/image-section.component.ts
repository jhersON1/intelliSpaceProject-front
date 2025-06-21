import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { ImageManagerService } from '../../services/image-manager.service';

@Component({
  selector: 'app-image-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './image-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageSectionComponent {
  private imageManager = inject(ImageManagerService);

  @Input() productForm!: FormGroup;

  // Propiedades de imagen desde ImageManagerService
  readonly images = this.imageManager.images;
  readonly selectedImageIndex = this.imageManager.selectedImageIndex;
  readonly selectedImage = this.imageManager.selectedImage;
  readonly isUploadingImages = this.imageManager.isUploadingImages;

  onFileSelected(event: Event) {
    this.imageManager.onFileSelected(event);
  }

  selectImage(index: number) {
    this.imageManager.selectImage(index);
  }

  removeImage(index: number) {
    this.imageManager.removeImage(index);
  }

  deselectImage() {
    this.imageManager.selectImage(-1);
  }
}
