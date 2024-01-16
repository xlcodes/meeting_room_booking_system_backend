import {BadRequestException, Injectable, Logger} from '@nestjs/common';
import {CreateMeetingRoomDto} from './dto/create-meeting-room.dto';
import {UpdateMeetingRoomDto} from './dto/update-meeting-room.dto';
import {InjectRepository} from "@nestjs/typeorm";
import {MeetingRoom} from "@/meeting-room/entities/meeting-room.entity";
import {Like, Repository} from "typeorm";
import {FindManyOptions} from "typeorm/find-options/FindManyOptions";

@Injectable()
export class MeetingRoomService {
    private logger = new Logger()

    @InjectRepository(MeetingRoom)
    private repository: Repository<MeetingRoom>;

    initData() {
        const room1 = new MeetingRoom();
        room1.name = '木星';
        room1.capacity = 10;
        room1.equipment = '白板';
        room1.location = '一层西';

        const room2 = new MeetingRoom();
        room2.name = '金星';
        room2.capacity = 5;
        room2.equipment = '';
        room2.location = '二层东';

        const room3 = new MeetingRoom();
        room3.name = '天王星';
        room3.capacity = 30;
        room3.equipment = '白板，电视';
        room3.location = '三层东';

        this.repository.insert([room1, room2, room3])
    }

    async find(pageNo: number, pageSize: number, name: string, capacity: number, equipment: string) {
        if (pageNo < 1) {
            throw new BadRequestException('页码必须大于0')
        }

        const skipCount = (pageNo - 1) * pageSize

        const condition: Record<string, any> = {}

        if(name) {
            condition.name = Like(`%${name}%`)
        }

        if(equipment) {
            condition.equipment = Like(`%${equipment}%`)
        }

        if(capacity) {
            condition.capacity = capacity
        }

        const [meetingRooms, totalCount] = await this.repository.findAndCount({
            skip: skipCount,
            take: pageSize,
            where: condition
        } as FindManyOptions)

        return {
            totalCount,
            meetingRooms,
        }
    }

    async create(meetingRoomDto: CreateMeetingRoomDto) {

        const room = await this.repository.findOneBy({
            name: meetingRoomDto.name
        })

        if (room) {
            throw new BadRequestException('会议室名字已经存在!')
        }

        return await this.repository.save(meetingRoomDto)
    }

    async update(meetingRoomDto: UpdateMeetingRoomDto) {
        const meetingRoom = await this.repository.findOneBy({
            id: meetingRoomDto.id
        })

        if (!meetingRoom) {
            throw new BadRequestException('当前会议室不存在')
        }

        meetingRoom.capacity = meetingRoomDto.capacity
        meetingRoom.location = meetingRoomDto.location
        meetingRoom.name = meetingRoomDto.name

        if (meetingRoomDto.description) {
            meetingRoom.description = meetingRoomDto.description
        }

        if (meetingRoomDto.equipment) {
            meetingRoom.equipment = meetingRoomDto.equipment
        }

        try {
            await this.repository.update({
                id: meetingRoomDto.id
            }, meetingRoom)
            return '会议室更新成功!'
        } catch (err) {
            this.logger.error(err, MeetingRoomService)
            throw new BadRequestException('会议室更新失败!')
        }
    }

    async findById(id: number) {
        return await this.repository.findOneBy({
            id
        })
    }

    async remove(id: number) {
        try {
            await this.repository.delete({id})
            return '会议室删除成功！'
        } catch (err) {
            this.logger.error(err, MeetingRoomService)
            throw new BadRequestException('会议室删除失败！')
        }
    }
}
