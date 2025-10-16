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
        if (!req.validated || !req.validated.body) throw new Error('Missing validated body');
        return req.validated.body;
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
