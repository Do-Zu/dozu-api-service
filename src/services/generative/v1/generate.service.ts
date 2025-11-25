import { ServiceUnavailable } from '@/core/error';
import { GenerateContentRequestInterface, GenerateContentResponseInterface } from '@/dtos/generate';
import { MindmapData } from '@/models/mindmap/mindmap.model';
import { FileProcessingStatus, ProcessingResult } from '@/types/generate/generate.type';
import { ProcessingProgress } from '@/types/generate/large-file.type';
import logger from '@/utils/logger';
import { generatePromptText, TYPE_PROMPT } from '@/utils/prompt';
import { v4 as uuidv4 } from 'uuid';
import { BaseGenerativeService } from '../base/base.abstract';

class GenerateService extends BaseGenerativeService {
    private processingResults = new Map<string, ProcessingResult>();

    constructor() {
        super();
    }

    /**
     * Register a content generation request from uploaded file
     */
    public async registerGenerateContentByLLM(
        requestData: GenerateContentRequestInterface
    ): Promise<GenerateContentResponseInterface> {
        const jobId = uuidv4();

        try {
            // Create initial processing result
            const processingResult: ProcessingResult = {
                id: jobId,
                status: FileProcessingStatus.PROCESSING,
                metadata: {
                    originalName: 'content.txt',
                    size: Buffer.byteLength(requestData.content, 'utf-8'),
                    mimeType: 'text/plain',
                    path: '',
                    uploadedAt: new Date(),
                },
                startTime: Date.now(),
            };

            this.processingResults.set(jobId, processingResult);

            //TODO: Start background processing (don't await)
            this.generateContentByLLMBackGround(requestData.content)
                .then(result => {
                    const existingResult = this.processingResults.get(jobId);
                    if (existingResult) {
                        existingResult.status = FileProcessingStatus.COMPLETED;
                        existingResult.endTime = Date.now();
                        existingResult.resultPath = JSON.stringify(result);
                    }
                })
                .catch(error => {
                    const existingResult = this.processingResults.get(jobId);
                    if (existingResult) {
                        existingResult.status = FileProcessingStatus.FAILED;
                        existingResult.endTime = Date.now();
                        existingResult.error = error instanceof Error ? error.message : String(error);
                    }
                });

            return {
                jobId,
                status: FileProcessingStatus.PROCESSING,
            };
        } catch (error) {
            logger.error(
                `Error registering content generation: ${error instanceof Error ? error.message : String(error)}`
            );
            return {
                jobId,
                status: FileProcessingStatus.FAILED,
            };
        }
    }

    /**
     * Process content generation in the background
     */
    protected async generateContentByLLMBackGround(content: string): Promise<MindmapData | null> {
        return await this.generateMindmapFromText(content);
    }

    /**
     * Generate mindmap from text content directly
     */
    private async generateMindmapFromText(content: string): Promise<any | null> {
        const typeSending: TYPE_PROMPT = 'MIND_MAP';
        // const jobId = uuidv4();

        const prompt = generatePromptText(content, typeSending);

        const result = await this.getLLMProvider().generate(prompt);

        if (!result) {
            throw new ServiceUnavailable('Failed to generate mindmap from text');
        }

        let mindmap: MindmapData | null = null;

        try {
            mindmap = JSON.parse(result) as MindmapData;
        } catch {
            logger.error('Failed to parse mindmap data from generated text');
        }

        return {
            mindmap,
            rawText: result,
        };
    }

    /**
     * Get processing result by job ID
     */
    public getProcessingResult(jobId: string): ProcessingResult | undefined {
        return this.processingResults.get(jobId);
    }

    /**
     * Get all processing results
     */
    public getAllProcessingResults(): ProcessingResult[] {
        return Array.from(this.processingResults.values());
    }

    /**
     * Clear completed processing results
     */
    public clearCompletedResults(): void {
        for (const [jobId, result] of this.processingResults.entries()) {
            if (result.status === FileProcessingStatus.COMPLETED || result.status === FileProcessingStatus.FAILED) {
                this.processingResults.delete(jobId);
            }
        }
    }

    /**
     * Get file processing progress (for large files)
     */
    public getFileProcessingProgress(jobId: string): ProcessingProgress | undefined {
        // Try to get progress from the base LLM provider
        try {
            logger.info(`Checking progress for job: ${jobId}`);
            // const baseService = this as BaseGenerativeService;
            // const llmProvider = (baseService as Record<string, unknown>)?.llmProvider as {
            //   getProgress?: (id: string) => ProcessingProgress | undefined;
            // };
            // return llmProvider?.getProgress?.(jobId);
        } catch {
            return undefined;
        }
    }
}

export const generateService = new GenerateService();
