import type { PrismaClient } from "generated/prisma";
export type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">

export * from "@myapp/shared"
