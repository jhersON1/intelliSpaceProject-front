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


export interface Product {
  id: string;
  title: string;
  description: string;
  dimensions: object;
  weight: number;
  material: string;
  price: number;
  stock: number;
  state: string;
  datePublication: string;
  keywords: string[];
}

export interface Model3DResponse {
  id: string;
  url: string;
  product: Product;
  type: "Model3D";
  format: ".glb" | ".fbx" | ".obj" | ".dae" | ".usd" | ".gltf" | ".usdz";
  texture: string;
  scale: object;
  urlIOS3D: string;
}

export interface ExperienceARResponse {
  id: string;
  url: string;
  product: Product;
  type: "ExperienceAR";
  instructions: string;
  devicerequirements: string[];
  urlIOSAR: string;
}
