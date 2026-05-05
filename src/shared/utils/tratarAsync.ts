import { NextFunction, Request, Response } from "express";

export type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => Promise<unknown>;

/**
 * Envolve handlers async do Express para repassar rejeições ao `next` (middleware de erro).
 */
export function tratarAsync(fn: AsyncRequestHandler) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
