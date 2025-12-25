export class FeatureValidator {
    public isEndpointMatch = ({ requestUrl, apiUrl }: { requestUrl: string; apiUrl: string }): boolean => {
        const cleanApiUrl = apiUrl.replace(/^\/+|\/+$/g, '');

        const pattern = new RegExp(`^\\/?(api\\/)?${cleanApiUrl}\\/?$`, 'i');

        return pattern.test(requestUrl);
    };
}

export const featureValidator = new FeatureValidator();
