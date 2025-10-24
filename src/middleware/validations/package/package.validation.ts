import Validator from '@/core/validations/validator';
import {
    createPackageSchema,
    getPackagesQuerySchema,
    updatePackageSchema,
    packageIdBodySchema,
    getPackageTopicsSchema,
    updateTopicInPackageSchema,
    removeTopicInPackageSchema,
    getUnAssignedTopicQueryScheme,
} from '@/dtos/package/package.dto';

// Body validators
export const validateCreatePackageBody = Validator.validate({ selector: 'body', schema: createPackageSchema });
export const validateUpdatePackageBody = Validator.validate({ selector: 'body', schema: updatePackageSchema });
export const validatePackageIdBody = Validator.validate({ selector: 'body', schema: packageIdBodySchema });
export const validateGetPackageTopicsBody = Validator.validate({ selector: 'body', schema: getPackageTopicsSchema });
export const validateUpdateTopicInPackageBody = Validator.validate({
    selector: 'body',
    schema: updateTopicInPackageSchema,
});
export const validateRemoveTopicInPackageBody = Validator.validate({
    selector: 'body',
    schema: removeTopicInPackageSchema,
});

// Query validators
export const validateGetPackagesQuery = Validator.validate({ selector: 'query', schema: getPackagesQuerySchema });
export const validateGetTopicUnAssignedPackages = Validator.validate({
    selector: 'body',
    schema: getUnAssignedTopicQueryScheme,
});

export default {
    validateCreatePackageBody,
    validateUpdatePackageBody,
    validatePackageIdBody,
    validateGetPackageTopicsBody,
    validateUpdateTopicInPackageBody,
    validateRemoveTopicInPackageBody,
    validateGetPackagesQuery,
};
