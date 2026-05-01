import type { Context } from "hono"
// import { UserService } from "@/services/user.service"
// import { sendList, sendSuccess } from "@/utils/response"
// import { AppError } from "@/utils/AppError"

// user.controller.ts
export const UserController = {
    async getAll(c: Context) {
        // const page = Number(c.req.query('page') ?? 1)
        // const limit = Number(c.req.query('limit') ?? 20)


    },

    async getById(c: Context) {
        // const id = c.req.param('id')
        // const user = await UserService.findById(id)

        // if (!user) throw new AppError('User not found', 'NOT_FOUND', 404)
        // return sendSuccess(c, user)
    },
}