export enum ProductStatus {
  SOLD_OUT = "Agotado",
  AVAILABLE = "Disponible"
}

export interface Product {
  id: string;
  title: string;
  dimensions?: object;
  description?: string;
  price?: number;
  imageUrl?: string | string[];
  category?: string;
  weight: number;
  material?: string;
  stock?: number;
  state: ProductStatus;
  keywords?: string[];
  idCategory: string[];
}

export interface CreateProduct {
  title: string;
  dimensions?: object;
  description?: string;
  price?: number;
  imageUrl?: string | string[];
  category?: string;
  weight: number;
  material?: string;
  stock?: number;
  state: ProductStatus;
  keywords?: string[];
  idCategory: string[];
}

export interface UpdateProduct extends CreateProduct {}
