import request from "supertest";
import {getExpres} from "../src/server";
import mongoose from "mongoose";

describe('Check Http Server', () => {
    afterAll(() => {
        mongoose.disconnect()
    })

    it('version', () => {
        request(getExpres())
            .get('/')
            .expect("Content-Type", /json/)
            .expect(200)
            .expect((res) => {
                res.body.data.name = "api"
            })
    })

})
