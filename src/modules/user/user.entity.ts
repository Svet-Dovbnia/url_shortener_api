import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { nanoid } from 'nanoid';
import { Url } from '../url/url.entity';

export enum UserPlan {
  FREE = 'FREE',
  PRO = 'PRO',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column()
  email!: string;

  @Column({ name: 'api_key', unique: true, length: 40 })
  apiKey!: string;

  @Column({
    type: 'enum',
    enum: UserPlan,
    default: UserPlan.FREE,
  })
  plan!: UserPlan;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Url, (url) => url.user)
  urls!: Url[];

  @BeforeInsert()
  generateApiKey(): void {
    if (!this.apiKey) {
      this.apiKey = `usr_${nanoid(24)}`;
    }
  }
}
