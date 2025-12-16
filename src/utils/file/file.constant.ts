const ALLOWED_AUDIO_EXT = ['.mp3', '.wav', '.aac', '.m4a', '.ogg'];
const ALLOWED_VIDEO_EXT = ['.mp4'];
const ALLOWED_MEDIA_EXT = ALLOWED_AUDIO_EXT.concat(ALLOWED_VIDEO_EXT);

const ALLOWED_AUDIO_MIME_TYPES = [
    'audio/mpeg',
    'audio/wav',
    'audio/aac',
    'audio/vnd.dlna.adts',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
];
const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4'];
const ALLOWED_MEDIA_MIME_TYPES = ALLOWED_AUDIO_MIME_TYPES.concat(ALLOWED_VIDEO_MIME_TYPES);
const MAX_MEDIA_SIZE_MB = 20;

export {
    ALLOWED_AUDIO_EXT,
    ALLOWED_VIDEO_EXT,
    ALLOWED_MEDIA_EXT,
    ALLOWED_AUDIO_MIME_TYPES,
    ALLOWED_VIDEO_MIME_TYPES,
    ALLOWED_MEDIA_MIME_TYPES,
    MAX_MEDIA_SIZE_MB,
};
