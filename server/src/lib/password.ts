export const hashPassword = async (plain: string) =>
    await Bun.password.hash(plain, {
        algorithm: "argon2id",
        memoryCost: 65536,  // 64MB — increase for more security, decrease for low-memory envs
        timeCost: 2,        // number of iterations
    });

export const verifyPassword = async (plain: string, hash: string) =>
    await Bun.password.verify(plain, hash);