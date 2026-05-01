import type { PrismaTx } from "@/types";

export const TokenService = {
    // Store hashed or raw refresh token on the user row
    async saveRefreshToken(tx: PrismaTx, userId: string, refreshToken: string) {
        await tx.user.update({
            where: { id: userId },
            data: { refresh_token: refreshToken },
        });
    },

    async revokeRefreshToken(tx: PrismaTx, userId: string) {
        await tx.user.update({
            where: { id: userId },
            data: { refresh_token: null },
        });
    },
};