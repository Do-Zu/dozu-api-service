import { Request } from 'express';

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
            throw new Error(`Missing id param: ${field}`);
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
            throw new Error(`Missing resource: ${field}`);
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
