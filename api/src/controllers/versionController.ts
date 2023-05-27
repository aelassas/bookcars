import pJson from '../../package.json';
import {Request, Response} from "express";

export async function versionController(req: Request, res: Response) {
    return res.status(200).send({
        name: pJson.name,
        version: pJson.version,
        description: pJson.description,
    })
}
