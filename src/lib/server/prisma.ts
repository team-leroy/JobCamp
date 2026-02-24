import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
	// Only warnings and errors; omit "query" and "info" to avoid flooding Cloud Run logs
	log: ["error", "warn"],
});

const luciaAuthDb = new PrismaAdapter(prisma.session, prisma.user);

export {
    prisma,
    luciaAuthDb,
}