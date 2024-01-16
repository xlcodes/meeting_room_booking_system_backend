import {BaseEntity} from '@/common/entities/base.entity'
import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class MeetingRoom extends BaseEntity {

    @PrimaryGeneratedColumn({
        comment: '会议室ID'
    })
    id: number;

    @Column({
        length: 50,
        comment: '会议室名字'
    })
    name: string;

    @Column({
        comment: '会议室容量'
    })
    capacity: number;

    @Column({
        length: 50,
        comment: '会议室位置'
    })
    location: string;

    @Column({
        length: 50,
        comment: '设备',
        default: ''
    })
    equipment: string;

    @Column({
        length: 100,
        comment: '描述',
        default: ''
    })
    description: string;

    @Column({
        comment: '是否被预订',
        default: false
    })
    isBooked: boolean;
}
