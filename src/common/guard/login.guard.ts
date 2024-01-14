import {CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException} from '@nestjs/common';
import {Observable} from 'rxjs';
import {Permission} from '@/user/entities/permission.entity'
import {Reflector} from "@nestjs/core";
import {JwtService} from "@nestjs/jwt";
import {REQUIRE_LOGIN_GUARD} from "@/common/constant";
import {UnLoginException, UnLoginFilter} from "@/common/filter/unlogin.filter";

interface JwtUserData {
    userId: number
    username: string
    roles: string[]
    permissions: Permission[]
}

declare module 'express' {
    interface Request {
        user: JwtUserData
    }
}

@Injectable()
export class LoginGuard implements CanActivate {

    @Inject()
    private reflector: Reflector;

    @Inject(JwtService)
    private jwtService: JwtService;

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {

        const request = context.switchToHttp().getRequest();

        const requireLogin = this.reflector.getAllAndOverride(REQUIRE_LOGIN_GUARD, [
            context.getClass(),
            context.getHandler(),
        ])

        if (!requireLogin) {
            return true;
        }

        const authorization = request.headers.authorization;

        if (!authorization) {
            // throw new UnauthorizedException('用户未登录')
            throw new UnLoginException()
        }

        try {
            const token = authorization.split(' ')[1];
            const data  = this.jwtService.verify<JwtUserData>(token)

            request.user = {
                userId: data.userId,
                username: data.username,
                roles: data.roles,
                permissions: data.permissions
            }

            return true
        } catch (err) {
            throw new UnauthorizedException('token已失效，请重新登录！')
        }
    }
}
