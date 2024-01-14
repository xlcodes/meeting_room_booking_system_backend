import * as crypto from "crypto";
import {BadRequestException, ParseIntPipe} from "@nestjs/common";

export const md5 = (str: string) => {
    const hash = crypto.createHash("md5");
    hash.update(str);
    return hash.digest("hex");
}

export const s4 = () => {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

export const s8 = () => {
    return (((1 + Math.random()) * 0x100000000) | 0).toString(16).substring(1);
}

export const generateParseIntPipe = (name: string) => {
    return new ParseIntPipe({
        exceptionFactory() {
            throw new BadRequestException(`${name} 应当传数字`)
        }
    })
}