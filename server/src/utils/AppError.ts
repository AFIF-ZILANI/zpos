export class AppError extends Error {
    constructor(
        public override message: string,
        public code: string,
        public status: 400 | 401 | 403 | 404 | 409 | 422 | 500 = 400,
        public details?: unknown
    ) {
        super(message)
        this.name = 'AppError'
    }
}