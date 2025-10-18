import { Request } from 'express';
import { InternalServerError } from '../error';
import { isNilOrEmpty } from '@/utils/common';

class RequestHelper {
    public getValidated(req: Request) {
        if (!req.validated) throw new Error('Missing validated data');
        return req.validated;
    }

    public getValidatedParams(req: Request) {
        if (!req.validated || !req.validated.params) throw new Error('Missing validated params');
        return req.validated.params;
    }

    public getValidatedBody(req: Request) {
        if (!req || !req.body) throw new Error('Missing body');
        return req.body;
    }

    public async getValidatedQuery(req: Request) {
        if (!req.validated || !req.validated.query) throw new Error('Missing validated query');
        return req.validated.query;
    }

    public getIdParam<K extends keyof NonNullable<NonNullable<Request['validated']>['params']>>(
        req: Request,
        field: K
    ): number {
        const params = this.getValidatedParams(req);
        const result = params[field];
        if (!result) {
            throw new InternalServerError(`Missing id param: ${field}`);
        }
        return result;
    }

    public getBodyParam<K extends keyof NonNullable<NonNullable<Request['validated']>['body']>>(
        req: Request,
        field: K
    ): NonNullable<NonNullable<Request['validated']>['body']>[K] {
        const body = this.getValidatedBody(req);
        const result = body[field];
        if (isNilOrEmpty(result)) {
            throw new InternalServerError(`Missing body param: ${String(field)}`);
        }
        return result;
    }

    public getIdParamOrBody(req: Request, field: string): number {
        const params = (this.getValidatedParams(req) ?? {}) as Record<string, unknown>;
        const body = (this.getValidatedBody(req) ?? {}) as Record<string, unknown>;

        const rawValue = params[field] ?? body[field];

        if (isNilOrEmpty(rawValue)) {
            throw new InternalServerError(`Missing id in params or body: ${field}`);
        }

        const id = typeof rawValue === 'number' ? rawValue : Number(rawValue);

        if (!Number.isFinite(id) || id <= 0) {
            throw new InternalServerError(`Invalid id value for ${field}`);
        }

        return id;
    }

    public getResource<K extends keyof NonNullable<Request['resources']>>(
        req: Request,
        field: K
    ): NonNullable<NonNullable<Request['resources']>[K]> {
        const resources = req.resources || {};
        const result = resources[field];
        if (!result) {
            throw new InternalServerError(`Missing resource: ${field}`);
        }
        return result;
    }

    public setResource<K extends keyof NonNullable<Request['resources']>>(
        req: Request,
        field: K,
        data: NonNullable<NonNullable<Request['resources']>[K]>
    ) {
        req.resources = req.resources || {};
        req.resources[field] = data;
    }
}

export default new RequestHelper();
