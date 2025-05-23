export interface Category {
  id: string;
  name: string;
  description: string;
  representativeImage: string | null;
  level: number;
  parent: Category | null;
  children?: Category[];
}
