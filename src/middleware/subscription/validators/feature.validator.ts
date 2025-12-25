export class FeatureValidator {
    public isEndpointMatch = ({ requestUrl, apiUrl }: { requestUrl: string; apiUrl: string }): boolean => {
        const cleanApiUrl = apiUrl.replace(/^\/+|\/+$/g, '');
        const escapedApiUrl = cleanApiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const pattern = new RegExp(`^\\/?(api\\/)?${escapedApiUrl}\\/?$`, 'i');

        return pattern.test(requestUrl);
    };
}

export const featureValidator = new FeatureValidator();
