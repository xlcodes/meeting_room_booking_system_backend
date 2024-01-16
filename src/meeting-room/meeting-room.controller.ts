import {Controller, Get, Post, Body, Param, Delete, Query, DefaultValuePipe, Put} from '@nestjs/common';
import {MeetingRoomService} from './meeting-room.service';
import {CreateMeetingRoomDto} from './dto/create-meeting-room.dto';
import {UpdateMeetingRoomDto} from './dto/update-meeting-room.dto';
import {generateParseIntPipe} from "@/utils";

@Controller('meeting-room')
export class MeetingRoomController {
    constructor(private readonly meetingRoomService: MeetingRoomService) {
    }

    @Get('list')
    async list(
        @Query('pageNo', new DefaultValuePipe(1), generateParseIntPipe('pageNo')) pageNo: number,
        @Query('pageSize', new DefaultValuePipe(2), generateParseIntPipe('pageSize')) pageSize: number,
        @Query('name') name: string,
        @Query('capacity') capacity: number,
        @Query('equipment') equipment: string
    ) {
        return await this.meetingRoomService.find(pageNo, pageSize, name, capacity, equipment)
    }

    @Post('create')
    create(@Body() meetingRoomDto: CreateMeetingRoomDto) {
        return this.meetingRoomService.create(meetingRoomDto);
    }

    @Put('update')
    update(@Body() meetingRoomDto: UpdateMeetingRoomDto) {
        return this.meetingRoomService.update(meetingRoomDto);
    }

    @Get(':id')
    find(@Param('id') id: number) {
        return this.meetingRoomService.findById(id);
    }

    @Delete(':id')
    async delete(@Param('id') id: number) {
        return this.meetingRoomService.remove(id);
    }
}
