import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "@/lib/token";
import type { CreateUser, Login } from "@myapp/shared/schemas/user.schema";
import { UserService } from "@/services/user.service";
import { TokenService } from "@/services/token.service";
import { AppError } from "@/utils/AppError";
import { sendSuccess } from "@/utils/response";
import type { Context } from "hono";

const isProduction = process.env.NODE_ENV === "production"

// ── Shared cookie helpers ────────────────────────────────────────────────────

function setAuthCookies(c: Context, accessToken: string, refreshToken: string) {
    // Access token — short-lived, readable by JS if you need it in Authorization headers
    // Use httpOnly: true if you prefer fully opaque tokens (more secure, less flexible)
    c.header("Set-Cookie", [
        `access_token=${accessToken}; HttpOnly; Path=/; Max-Age=900; SameSite=Strict${isProduction ? "; Secure" : ""}`,
        `refresh_token=${refreshToken}; HttpOnly; Path=/api/auth/refresh; Max-Age=604800; SameSite=Strict${isProduction ? "; Secure" : ""}`,
    ].join(", "))
}

function clearAuthCookies(c: Context) {
    c.header("Set-Cookie", [
        `access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${isProduction ? "; Secure" : ""}`,
        `refresh_token=; HttpOnly; Path=/api/auth/refresh; Max-Age=0; SameSite=Strict${isProduction ? "; Secure" : ""}`,
    ].join(", "))
}

// ── Controller ───────────────────────────────────────────────────────────────

export const AuthController = {
    async register(c: Context) {
        const data = c.get("validatedBody") as CreateUser

        const hashedPassword = await hashPassword(data.password)

        const result = await prisma.$transaction(async (tx) => {
            const newUser = await UserService.createUser(tx, {
                ...data,
                hashedPassword,
            })

            const tokenPayload = { sub: newUser.id, role: newUser.role }
            const accessToken = generateAccessToken(tokenPayload)
            const refreshToken = generateRefreshToken(tokenPayload)

            await TokenService.saveRefreshToken(tx, newUser.id, refreshToken)

            return { user: newUser, accessToken, refreshToken }
        })

        setAuthCookies(c, result.accessToken, result.refreshToken)

        // Only return non-sensitive user data in the body — no tokens
        return sendSuccess(
            c,
            { user: result.user },
            "Account created successfully",
            201
        )
    },

    async login(c: Context) {
        const data = c.get("validatedBody") as Login

        const result = await prisma.$transaction(async (tx) => {
            const existing = await UserService.findByEmail(tx, data.email)
            if (!existing) {
                throw new AppError("Invalid credentials", "INVALID_CREDENTIALS", 401)
            }

            const passwordMatch = await verifyPassword(data.password, existing.password_hash)
            if (!passwordMatch) {
                throw new AppError("Invalid credentials", "INVALID_CREDENTIALS", 401)
            }

            const tokenPayload = { sub: existing.id, role: existing.role }
            const accessToken = generateAccessToken(tokenPayload)
            const refreshToken = generateRefreshToken(tokenPayload)

            await TokenService.saveRefreshToken(tx, existing.id, refreshToken)

            return { accessToken, refreshToken }
        })

        setAuthCookies(c, result.accessToken, result.refreshToken)

        return sendSuccess(c, {}, "Login successful", 200)
    },

    async refresh(c: Context) {
        // Read refresh token from HttpOnly cookie (not Authorization header)
        const cookieHeader = c.req.header("cookie") ?? ""
        const incomingRefreshToken = parseCookie(cookieHeader, "refresh_token")

        if (!incomingRefreshToken) {
            throw new AppError("Refresh token missing", "MISSING_TOKEN", 401)
        }

        const payload = verifyRefreshToken(incomingRefreshToken) // throws if expired/invalid

        const dbUser = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, role: true, refresh_token: true },
        })

        if (!dbUser || dbUser.refresh_token !== incomingRefreshToken) {
            clearAuthCookies(c) // Possible token theft — clear cookies immediately
            throw new AppError("Refresh token is invalid or revoked", "INVALID_TOKEN", 401)
        }

        // Rotate: issue a new refresh token on every use
        const tokenPayload = { sub: dbUser.id, role: dbUser.role }
        const newAccessToken = generateAccessToken(tokenPayload)
        const newRefreshToken = generateRefreshToken(tokenPayload)

        await prisma.user.update({
            where: { id: dbUser.id },
            data: { refresh_token: newRefreshToken },
        })

        setAuthCookies(c, newAccessToken, newRefreshToken)

        return sendSuccess(c, {}, "Tokens refreshed", 200)
    },

    async logout(c: Context) {
        const cookieHeader = c.req.header("cookie") ?? ""
        const refreshToken = parseCookie(cookieHeader, "refresh_token")

        if (refreshToken) {
            try {
                const payload = verifyRefreshToken(refreshToken)
                await prisma.$transaction(async (tx) => {
                    await TokenService.revokeRefreshToken(tx, payload.sub)
                })
            } catch {
                // Token already expired — still clear cookies, don't throw
            }
        }

        clearAuthCookies(c)

        return sendSuccess(c, {}, "Logged out successfully", 200)
    },
}

// ── Utility ──────────────────────────────────────────────────────────────────

function parseCookie(cookieHeader: string, name: string): string | undefined {
    return cookieHeader
        .split(";")
        .map((c) => c.trim().split("="))
        .find(([key]) => key === name)?.[1]
}