import fs from 'fs'

export const joinURL = (part1, part2) => {
    if (part1.charAt(part1.length - 1) === '/') {
        part1 = part1.substr(0, part1.length - 1)
    }
    if (part2.charAt(0) === '/') {
        part2 = part2.substr(1)
    }
    return part1 + '/' + part2
}

export const clone = (obj) => JSON.parse(JSON.stringify(obj))

export const fileExists = s => new Promise(resolve => fs.access(s, fs.constants.F_OK, e => resolve(!e)))