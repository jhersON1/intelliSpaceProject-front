import { VisualRepresentation } from "../../../interfaces/indes";

export interface ImagePreview {
  id?: string;
  name: string;
  url: string | ArrayBuffer;
  isExisting: boolean;
}

export interface ImageState {
  existing: VisualRepresentation[];
  pendingDelete: string[];
  newImages: File[];
  previews: ImagePreview[];
}

export interface ImageOperationResult {
  success: boolean;
  message: string;
  deletedCount?: number;
  uploadedCount?: number;
}
