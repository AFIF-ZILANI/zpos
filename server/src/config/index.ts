export const GS1_COMPANY_PREFIX = "2001"

const REQUIRED_ENV_VARS = [
    "DATABASE_URL",
    "CLERK_SECRET_KEY",
    "RESEND_API_KEY",
    "CLIENT_URL",
    "EMAIL_DOMAIN",
] as const;

export function validateEnv(): void {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.error(`[startup] Missing required environment variables: ${missing.join(", ")}`);
        process.exit(1);
    }
}