import {createParamDecorator, ExecutionContext, SetMetadata} from "@nestjs/common";
import { Request } from 'express'
import {REQUIRE_LOGIN_GUARD, REQUIRE_PERMISSIONS_GUARD} from "@/common/constant";


export const RequireLogin = () => SetMetadata(REQUIRE_LOGIN_GUARD, true)

export const RequirePermission = (...permission: string[]) => SetMetadata(REQUIRE_PERMISSIONS_GUARD, permission)

export const UserInfo = createParamDecorator((data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>()
    if(!request.user) {
        return null
    }

    return data ? request.user[data] : request.user
})