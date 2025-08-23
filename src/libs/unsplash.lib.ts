import { createApi } from 'unsplash-js';
import { Nullable } from 'unsplash-js/dist/helpers/typescript';
import { Photos } from 'unsplash-js/dist/methods/search/types/response';
import { Basic } from 'unsplash-js/dist/methods/users/types';

const unsplash = createApi({
    accessKey: process.env.UNSPLASH_ACCESS_KEY!,
    headers: {
        'Accept-Version': 'v1',
    },
});

export interface IUnspashImage {
    id: string;
    description: Nullable<string>;
    url: {
        thumb: string;
        small: string;
    };
    user: Basic;
    links: {
        self: string;
        html: string;
        download: string;
        download_location: string;
    };
    width?: number;
    height?: number;
}

class UnsplashLib {
    public async searchImages(keyword: string): Promise<Photos> {
        const result = (await new Promise((resolve, reject) => {
            unsplash.search
                .getPhotos({ query: keyword, page: 1, perPage: 20, orientation: 'landscape' })
                .then(result => {
                    if (result.errors) {
                        reject(result.errors);
                    } else {
                        resolve(result.response);
                    }
                });
        })) as Photos;
        return result;
    }

    public async downloadImage(downloadLocation: string) {
        const result = (await new Promise((resolve, reject) => {
            unsplash.photos.trackDownload({ downloadLocation }).then(result => {
                if (result.errors) {
                    reject(result.errors);
                } else {
                    resolve(result.response);
                }
            });
        })) as { url: string };
        return result;
    }
}

export default new UnsplashLib();
