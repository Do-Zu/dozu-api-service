import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BaseGenerativeService, IFileGenerationService } from '../base/base.abstract';
import {
    GenerateContentRequestInterface,
    GenerateContentResponseInterface,
    FileUploadRequestInterface,
} from '@/dtos/generate';
import { FileMetadata, FileProcessingStatus, ProcessingResult } from '@/types/generate/generate.type';
import { ProcessingProgress } from '@/types/generate/large-file.type';
import { MindmapData } from '@/models/mindmap/mindmap.model';
import logger from '@/utils/logger';
import { generatePromptText, TYPE_PROMPT } from '@/utils/prompt';
import { ServiceUnavailable } from '@/core/error';

class GenerateService extends BaseGenerativeService implements IFileGenerationService {
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
     * Generate mindmap from uploaded file
     */
    public async generateMindmapFromFile(
        filePath: string,
        metadata: FileMetadata,
        customPrompt?: string
    ): Promise<MindmapData | null> {
        return await super.generateMindmapFromFile(filePath, metadata, customPrompt);
    }

    /**
     * Process uploaded file and extract content
     */
    public async processUploadedFile(filePath: string): Promise<string | null> {
        return await super.processUploadedFile(filePath);
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
     * Process file upload request and generate mindmap
     */
    public async processFileUploadForMindmap(request: FileUploadRequestInterface): Promise<MindmapData | null> {
        try {
            if (request.filePath) {
                // Process file upload
                const metadata: FileMetadata = {
                    originalName: request.fileName || path.basename(request.filePath),
                    size: fs.existsSync(request.filePath) ? fs.statSync(request.filePath).size : 0,
                    mimeType: request.mimeType || 'text/plain',
                    path: request.filePath,
                    uploadedAt: new Date(),
                };

                return await this.generateMindmapFromFile(request.filePath, metadata, request.customPrompt);
            } else if (request.content) {
                // Process direct content
                return await this.generateMindmapFromText(request.content);
            }

            return null;
        } catch (error) {
            logger.error(`Error processing file upload: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
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

    /**
     * Start large file processing in background
     */
    public async startLargeFileProcessing(request: FileUploadRequestInterface): Promise<string> {
        const jobId = uuidv4();

        try {
            // Start processing in background (don't await)
            this.processLargeFileInBackground(request, jobId).catch(error => {
                logger.error(
                    `Background processing failed for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`
                );
            });

            return jobId;
        } catch (error) {
            logger.error(
                `Error starting large file processing: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
        }
    }

    /**
     * Process large file in background
     */
    private async processLargeFileInBackground(request: FileUploadRequestInterface, jobId: string): Promise<void> {
        try {
            if (!request.filePath) {
                throw new Error('File path is required for large file processing');
            }

            const metadata: FileMetadata = {
                originalName: request.fileName || path.basename(request.filePath),
                size: fs.existsSync(request.filePath) ? fs.statSync(request.filePath).size : 0,
                mimeType: request.mimeType || 'text/plain',
                path: request.filePath,
                uploadedAt: new Date(),
            };

            logger.info(`Starting background processing for large file: ${metadata.originalName}`);

            const result = await this.generateMindmapFromFile(request.filePath, metadata, request.customPrompt);

            if (result) {
                // Store result temporarily (in a real app, you'd use a database)
                const processingResult: ProcessingResult = {
                    id: jobId,
                    status: FileProcessingStatus.COMPLETED,
                    metadata,
                    startTime: Date.now(),
                    endTime: Date.now(),
                    resultPath: JSON.stringify(result),
                };

                this.processingResults.set(jobId, processingResult);
                logger.info(`Large file processing completed for job: ${jobId}`);
            } else {
                throw new Error('Failed to generate mindmap from large file');
            }

            // Clean up file after processing
            try {
                if (fs.existsSync(request.filePath)) {
                    fs.unlinkSync(request.filePath);
                    logger.info(`Cleaned up uploaded file: ${request.filePath}`);
                }
            } catch (error) {
                logger.warn(`Failed to clean up file: ${error instanceof Error ? error.message : String(error)}`);
            }
        } catch (error) {
            logger.error(`Error in background processing: ${error instanceof Error ? error.message : String(error)}`);

            const errorResult: ProcessingResult = {
                id: jobId,
                status: FileProcessingStatus.FAILED,
                metadata: {
                    originalName: request.fileName || 'unknown',
                    size: 0,
                    mimeType: request.mimeType || 'text/plain',
                    path: request.filePath || '',
                    uploadedAt: new Date(),
                },
                startTime: Date.now(),
                endTime: Date.now(),
                error: error instanceof Error ? error.message : String(error),
            };

            this.processingResults.set(jobId, errorResult);
        }
    }
}

export const generateService = new GenerateService();
