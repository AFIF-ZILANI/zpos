import { AppError } from "@/utils/AppError";
import type { CreateUser } from "@myapp/shared/schemas/user.schema";
import type { PrismaTx } from "@/types";

export const UserService = {

    async createUser(tx: PrismaTx, data: CreateUser & { hashedPassword: string }) {
        const existing = await tx.user.findFirst({
            where: { email: data.email },
            select: { email: true },
        });

        if (existing) {
            throw new AppError("Email already in use", "DUPLICATE_ENTRY", 409);
        }

        const user = await tx.user.create({
            data: {
                name: data.fullName,
                email: data.email,
                phone: data.phone,
                password_hash: data.hashedPassword,
                role: data.role,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true,
            },
        });

        return user;
    },

    async findByEmail(tx: PrismaTx, email: string) {
        return tx.user.findFirst({
            where: { email },
            select: {
                id: true,
                email: true,
                password_hash: true,
                role: true,
                refresh_token: true,
            },
        });
    },
};