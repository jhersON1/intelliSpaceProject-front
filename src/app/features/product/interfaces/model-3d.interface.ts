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

export enum FormatModel3D {
    GLB = '.glb',
    FBX = '.fbx',
    OBJ = '.obj',
    DAE = '.dae',
    USD = '.usd',
    GLTF = '.gltf',
    USDZ = '.usdz',
}

export interface Model3DFile {
    file: File;
    url: string | ArrayBuffer;
    name: string;
    format: FormatModel3D;
    isIOS: boolean;
}

export interface ARFile {
    file: File;
    url: string | ArrayBuffer;
    name: string;
    isIOS: boolean;
}
