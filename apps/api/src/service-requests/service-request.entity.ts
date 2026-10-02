import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('service_requests')
export class ServiceRequestEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column() phone: string;
  @Column() preferredTime: string;
  @Column({ type: 'text', default: '' }) note: string;
  @Column({ type: 'varchar', nullable: true }) projectId: string | null;
  @CreateDateColumn() createdAt: Date;
}
