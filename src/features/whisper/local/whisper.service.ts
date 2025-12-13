import logger from '@/utils/logger';
import { UPLOADS_DIR_PATH, WHISPER_CLI_PATH, WHISPER_MODEL_PATH, WHISPER_OUTPUT_FILE_FORMAT } from './whisper.constant';
import { access, mkdir } from 'fs/promises';
import { constants } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class WhisperService {
    private isReady = false;

    public async runWhisperLocal(inputPath: string): Promise<string> {
        await this.ensureWhisperReady();
        try {
            const cmd = this.getWhisperCommand(inputPath);
            await this.executeWhisperCommand(cmd);
            const outputPath = `${inputPath}.${WHISPER_OUTPUT_FILE_FORMAT}`;
            return outputPath;
        } catch (err) {
            logger.error('Run whisper failed', err);
            throw new Error('Run whisper failed.');
        }
    }

    private async ensureWhisperReady() {
        if (this.isReady) return;

        const ok = await this.verifyWhisperPaths({
            cliPath: WHISPER_CLI_PATH,
            modelPath: WHISPER_MODEL_PATH,
        });

        if (!ok) {
            logger.error('Lacks whisper CLI or model to execute whisper command.');
            throw new Error('Whisper CLI or model not found.');
        }

        await mkdir(UPLOADS_DIR_PATH, { recursive: true });
        this.isReady = true;
    }

    private async verifyWhisperPaths({ cliPath, modelPath }: { cliPath: string; modelPath: string }) {
        let ok: boolean = true;
        ok = (await this.checkFileExist(cliPath)) && (await this.checkFileExist(modelPath));

        return ok;
    }

    private getWhisperCommand(inputPath: string) {
        return [
            `"${WHISPER_CLI_PATH}"`,
            `-m "${WHISPER_MODEL_PATH}"`,
            `-f "${inputPath}"`,
            `-o${WHISPER_OUTPUT_FILE_FORMAT}`,
            `-ng`,
        ].join(' ');
    }

    private async executeWhisperCommand(command: string) {
        await execAsync(command);
    }

    private async checkFileExist(path: string): Promise<boolean> {
        try {
            await access(path, constants.R_OK);
            return true;
        } catch {
            return false;
        }
    }
}

export default new WhisperService();
