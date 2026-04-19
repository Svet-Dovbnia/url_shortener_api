import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Click } from './click.entity';

@Entity('urls')
export class Url {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Short unique code used for URL redirection
  @Index({ unique: true })
  @Column({ name: 'short_code', length: 8 })
  shortCode!: string;

  @Column({ name: 'original_url', type: 'text' })
  originalUrl!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  readonly userId!: string;

  @ManyToOne(() => User, (user) => user.urls, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Click, (click) => click.url)
  clicks!: Click[];
}
