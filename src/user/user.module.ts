import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {User} from "@/user/entities/user.entity";
import {Role} from "@/user/entities/role.entity";
import {Permission} from "@/user/entities/permission.entity";

@Module({
  imports: [
      TypeOrmModule.forFeature([User, Role, Permission])
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
