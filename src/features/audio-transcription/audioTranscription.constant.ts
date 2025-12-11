import path from 'path';

// These whisper paths would change depending on computer OS, these constants below are suitable for Windows system only. 
export const WHISPER_CLI_PATH = path.join(process.cwd(), 'vendor/whisper/whisper-cli.exe');
export const WHISPER_MODEL_PATH = path.join(process.cwd(), 'vendor/whisper/ggml-tiny.bin');
export const UPLOADS_DIR_PATH = path.join(process.cwd(), 'uploads');
export const WHISPER_OUTPUT_FILE_FORMAT = 'srt';
