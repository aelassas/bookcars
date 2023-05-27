import {availableLanguages, Lang} from "../interfaces/Lang";

export const joinURL = (part1: string, part2: string) => {
    if (part1.charAt(part1.length - 1) === '/') {
        part1 = part1.substr(0, part1.length - 1)
    }
    if (part2.charAt(0) === '/') {
        part2 = part2.substr(1)
    }
    return part1 + '/' + part2
}

export const clone = (obj: object) => {
    return JSON.parse(JSON.stringify(obj))
}

export function getUserLang(user: unknown): Lang {
    if(user && typeof user === 'object' && 'language' in user && typeof user.language === 'string') {
        if(availableLanguages.includes(user.language as Lang)) {
            return user.language as Lang
        }
    }
    return 'en';
}
