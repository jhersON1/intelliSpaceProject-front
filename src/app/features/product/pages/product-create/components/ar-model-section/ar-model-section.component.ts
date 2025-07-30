import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { ARFileManagerService, ARFileType, ARPlatform } from '../../services/ar-file-manager.service';

@Component({
  selector: 'app-ar-model-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ar-model-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArModelSectionComponent {
  private arFileManager = inject(ARFileManagerService);

  @Input() productForm!: FormGroup;

  readonly currentARFiles = this.arFileManager.currentARFiles;
  readonly isUploadingAR = this.arFileManager.isUploadingAR;

  onARFileSelected(params: { event: Event, type: 'model3D' | 'experienceAR', platform: 'android' | 'ios' }) {
    const arFileType = params.type === 'model3D' ? ARFileType.MODEL_3D : ARFileType.EXPERIENCE_AR;
    this.arFileManager.onARFileSelected({
      event: params.event,
      type: arFileType,
      platform: params.platform as ARPlatform
    });
  }
}
