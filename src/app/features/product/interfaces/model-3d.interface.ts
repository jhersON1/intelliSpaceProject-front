export interface Model3D {
  productId: string;
  type: 'Model3D';
  url: string;
  format?: string;
  texture?: string;
  scale?: {
    x: number;
    y: number;
    z: number;
  };
  // Campos adicionales del proyecto React
  altText?: string;
  isPrincipal?: boolean;
}

export interface ModelAnnotation {
  id: string;
  title: string;
  content: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
}

export interface ARSession {
  id: string;
  productId: string;
  qrCode: string;
  sessionUrl: string;
  isActive: boolean;
  createdAt: Date;
}
