import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** One placed product. Positions are meters on the ground plane; the photo camera sits at (0, cameraHeight, 0) looking down -Z. */
export interface PlacedItem {
  id: string;
  productId: string;
  color: string;
  position: [number, number, number];
  rotationY: number;
  scale: [number, number, number];
}

/** How the photo camera is matched to the 3D scene. */
export interface Calibration {
  /** Horizon line position, 0 = top of the photo, 1 = bottom */
  horizon: number;
  /** Vertical field of view in degrees */
  fov: number;
  /** Camera height above ground in meters */
  cameraHeight: number;
}

@Entity('projects')
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  /** Current (possibly edited) background photo */
  @Column({ type: 'varchar', nullable: true }) photoUrl: string | null;
  /** Untouched upload, used for before/after */
  @Column({ type: 'varchar', nullable: true }) originalPhotoUrl: string | null;
  @Column({ type: 'varchar', nullable: true }) thumbnailUrl: string | null;
  @Column('simple-json') calibration: Calibration;
  @Column('simple-json') items: PlacedItem[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
