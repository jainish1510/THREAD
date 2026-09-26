export interface PassportData {
  product: string;
  sku: string;
  colorName: string;
  size: string | null;
  batch: string;
  material: string;
  composition: string;
  factory: string;
  factoryLocation: string;
  manufactured: string;
  certifications: string[];
  care: string;
  checks: string[];
  traceability: number;
}
