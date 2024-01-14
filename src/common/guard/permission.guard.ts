import {CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException} from '@nestjs/common';
import {Reflector} from "@nestjs/core";
import {Request} from 'express';
import {REQUIRE_PERMISSIONS_GUARD} from "@/common/constant";

@Injectable()
export class PermissionGuard implements CanActivate {

    @Inject()
    private reflector: Reflector;

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {

        const request: Request = context.switchToHttp().getRequest()

        if (!request.user) {
            return true
        }

        const permissions = request.user.permissions

        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS_GUARD, [
            context.getClass(),
            context.getHandler()
        ]);

        if (!requiredPermissions) {
            return true
        }

        for (let i = 0; i < requiredPermissions.length; i++) {
            const curPermission = requiredPermissions[i];
            const found = permissions.find(permission => permission.code === curPermission);
            if (!found) {
                throw new UnauthorizedException('您暂无当前接口访问权限！')
            }
        }

        return true;
    }
}
