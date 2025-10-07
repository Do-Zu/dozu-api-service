import validator from '@/core/validations/validator';
import {
    backlogAddSchema,
    backlogReserveSchema,
    backlogCommitSchema,
    backlogReleaseSchema,
    backlogCountQuerySchema,
    backlogClearQuerySchema,
} from '@/dtos/backlog/backlog.dto';

export const validateBacklogAdd = () => validator.validate({ selector: 'body', schema: backlogAddSchema });
export const validateBacklogReserve = () => validator.validate({ selector: 'body', schema: backlogReserveSchema });
export const validateBacklogCommit = () => validator.validate({ selector: 'body', schema: backlogCommitSchema });
export const validateBacklogRelease = () => validator.validate({ selector: 'body', schema: backlogReleaseSchema });
export const validateBacklogCount = () => validator.validate({ selector: 'query', schema: backlogCountQuerySchema });
export const validateBacklogClear = () => validator.validate({ selector: 'query', schema: backlogClearQuerySchema });
