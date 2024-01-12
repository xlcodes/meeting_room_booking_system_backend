import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";
import { BaseEntity } from "@/common/entities/base.entity";

@Entity({
    name: 'permission'
})
export class Permission extends BaseEntity{
    @PrimaryGeneratedColumn({
        comment: '权限唯一标识'
    })
    id: number

    @Column({
        length: 20,
        comment: '权限代码'
    })
    code: string

    @Column({
        length: 100,
        comment: '权限描述'
    })
    description: string
}