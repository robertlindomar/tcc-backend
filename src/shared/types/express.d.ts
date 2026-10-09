import { Role } from "../../modules/auth/enum/Role";

declare global {
    namespace Express {
        interface Request {
            usuario?: {
                id: number;
                role: Role;
            };
        }
    }
}

export {};
