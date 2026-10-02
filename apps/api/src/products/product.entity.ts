import { Column, Entity, PrimaryColumn } from 'typeorm';

export interface ProductColor { name: string; hex: string }
export interface Dimensions { w: number; h: number; d: number }

@Entity('products')
export class ProductEntity {
  @PrimaryColumn() id: string;
  @Column() sku: string;
  @Column() name: string;
  @Column() category: string;
  @Column('float') price: number;
  /** null = per piece, otherwise e.g. "m²" */
  @Column({ type: 'varchar', nullable: true }) unit: string | null;
  /** "object" = 3D model placed on the ground, "surface" = ground material (tiles, lawn …) */
  @Column() kind: 'object' | 'surface';
  @Column('simple-json') colors: ProductColor[];
  @Column({ type: 'varchar', nullable: true }) modelUrl: string | null;
  @Column({ type: 'varchar', nullable: true }) material: 'tiles' | 'lawn' | 'gravel' | 'deck' | null;
  /** Real-world size in meters; for surfaces the default patch size. */
  @Column('simple-json') dimensions: Dimensions;
  @Column('simple-json') keywords: string[];
  @Column({ default: true }) inStock: boolean;
}
