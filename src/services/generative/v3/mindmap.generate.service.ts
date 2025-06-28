import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import logger from '@/utils/logger';
import { MindmapData } from '@/models/mindmap/mindmap.model';
import { ProcessingProgress, LargeFileProcessingConfig } from '@/types/generate/large-file.type';
import * as fs from 'fs';
import { readFileContent } from '@/utils/file/file.util';
import { createLargeFileMindmapPrompt, createMindmapPrompt } from '@/utils/prompt/mindmap.prompt';
import { GenerationOptions } from '../base/base.abstract';

/**
 * Dedicated service for mindmap generation from files using OpenAI API
 * Handles large files with intelligent chunking and hierarchical processing
 */
export class MindmapGenerateService {
    private processingProgress = new Map<string, ProcessingProgress>();

    // Default configuration for large file processing
    private defaultConfig: LargeFileProcessingConfig = {
        maxChunkSize: 100000, // 100KB
        batchSize: 3, // Process 3 chunks concurrently
        batchDelay: 2000, // 2 second delay between batches
        maxFileSizeMB: 50, // 50MB max file size
        enableProgress: true,
    };

    constructor(
        private openai: OpenAI,
        private model: string,
        config?: Partial<LargeFileProcessingConfig>
    ) {
        if (config) {
            this.defaultConfig = { ...this.defaultConfig, ...config };
        }
    }

    /**
     * Generate mindmap from file content using OpenAI API
     * Supports large files with intelligent chunking and hierarchical processing
     * @param filePath Path to the uploaded file
     * @param fileName Original file name
     * @param customPrompt Optional custom prompt to override default
     * @returns Mindmap data structure
     */
    public async generateMindmapFromFile(
        filePath: string,
        fileName: string,
        customPrompt?: string
    ): Promise<MindmapData | null> {
        try {
            logger.info(`Starting mindmap generation for file: ${fileName}`);

            // Get file metadata first
            const fileStats = await this.getFileMetadata(filePath);
            if (!fileStats) {
                logger.error('Failed to get file metadata');
                return null;
            }

            // Choose processing strategy based on file size
            if (fileStats.sizeInMB > 50) {
                logger.info(`Large file detected (${fileStats.sizeInMB}MB), using hierarchical processing`);
                return await this.processLargeFileHierarchically(filePath, fileName, customPrompt);
            } else if (fileStats.sizeInMB > 10) {
                logger.info(`Medium file detected (${fileStats.sizeInMB}MB), using chunked processing`);
                return await this.processFileInChunks(filePath, fileName, customPrompt);
            } else {
                logger.info(`Small file detected (${fileStats.sizeInMB}MB), using standard processing`);
                return await this.processFileStandard(filePath, fileName, customPrompt);
            }
        } catch (error) {
            logger.error(
                `Error generating mindmap from file: ${error instanceof Error ? error.message : String(error)}`
            );
            return null;
        }
    }

    /**
     * Get file metadata including size information
     */
    private async getFileMetadata(filePath: string): Promise<{ sizeInMB: number; sizeInBytes: number } | null> {
        try {
            const stats = fs.statSync(filePath);
            const sizeInBytes = stats.size;
            const sizeInMB = sizeInBytes / (1024 * 1024);

            logger.info(`File metadata - Size: ${sizeInMB.toFixed(2)}MB (${sizeInBytes} bytes)`);
            return { sizeInMB, sizeInBytes };
        } catch (error) {
            logger.error(`Error getting file metadata: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Process large files (>50MB) using hierarchical approach with progress tracking
     * This breaks the file into sections and creates a hierarchical mindmap
     */
    private async processLargeFileHierarchically(
        filePath: string,
        fileName: string,
        customPrompt?: string
    ): Promise<MindmapData | null> {
        const jobId = `large_file_${Date.now()}`;

        try {
            logger.info('Starting hierarchical processing for large file');

            // Get file stats to validate size
            const fileStats = await this.getFileMetadata(filePath);
            if (!fileStats) {
                return null;
            }

            // Check if file is too large
            if (fileStats.sizeInMB > this.defaultConfig.maxFileSizeMB) {
                logger.error(
                    `File too large: ${fileStats.sizeInMB}MB exceeds maximum of ${this.defaultConfig.maxFileSizeMB}MB`
                );
                return null;
            }

            // Read file in optimized chunks for large files
            const chunkSize = Math.min(this.defaultConfig.maxChunkSize, 50000); // Smaller chunks for very large files
            const chunks = await this.readFileInChunks(filePath, chunkSize);

            if (!chunks || chunks.length === 0) {
                logger.error('Failed to read file chunks');
                return null;
            }

            // Initialize progress tracking
            this.initializeProgress(jobId, chunks.length);
            this.updateProgress(jobId, 'Processing chunks', 0);

            // Process chunks in batches with rate limiting
            const batchSize = Math.min(this.defaultConfig.batchSize, 3); // Conservative for large files
            const chunkMindmaps: MindmapData[] = [];
            let processedCount = 0;

            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const batchNumber = Math.floor(i / batchSize) + 1;
                const totalBatches = Math.ceil(chunks.length / batchSize);

                this.updateProgress(jobId, `Processing batch ${batchNumber}/${totalBatches}`, processedCount);

                // Process batch with controlled concurrency
                const batchPromises = batch.map(async (chunk, batchIndex) => {
                    const chunkIndex = i + batchIndex;

                    try {
                        // Add staggered delay to respect rate limits
                        await new Promise(resolve => setTimeout(resolve, batchIndex * 800));

                        // Create page information for better context
                        const pageInfo = {
                            start: chunkIndex + 1,
                            end: chunkIndex + 1,
                            total: chunks.length,
                        };

                        //TODO: check full content
                        const chunkPrompt = customPrompt
                            ? customPrompt
                            : createLargeFileMindmapPrompt(chunk, fileName, pageInfo);

                        const chunkMindmap = await this.generateMindmapContent(chunkPrompt);

                        if (chunkMindmap) {
                            chunkMindmap.nodes.forEach(node => {
                                if (!node.id.startsWith(`chunk_${chunkIndex}_`)) {
                                    node.id = `chunk_${chunkIndex}_${node.id}`;
                                }
                            });

                            chunkMindmap.edges.forEach(edge => {
                                if (!edge.source.startsWith(`chunk_${chunkIndex}_`)) {
                                    edge.source = `chunk_${chunkIndex}_${edge.source}`;
                                }
                                if (!edge.target.startsWith(`chunk_${chunkIndex}_`)) {
                                    edge.target = `chunk_${chunkIndex}_${edge.target}`;
                                }
                                if (!edge.id.startsWith(`chunk_${chunkIndex}_`)) {
                                    edge.id = `chunk_${chunkIndex}_${edge.id}`;
                                }
                            });
                        }

                        return chunkMindmap;
                    } catch (error) {
                        const errorMsg = `Error processing chunk ${chunkIndex}: ${error instanceof Error ? error.message : String(error)}`;
                        this.updateProgress(
                            jobId,
                            `Processing batch ${batchNumber}/${totalBatches}`,
                            processedCount,
                            errorMsg
                        );
                        logger.error(errorMsg);
                        return null;
                    }
                });

                // Wait for batch to complete
                const batchResults = await Promise.allSettled(batchPromises);

                // Collect successful results
                batchResults.forEach((result, batchIndex) => {
                    processedCount++;

                    if (result.status === 'fulfilled' && result.value) {
                        chunkMindmaps.push(result.value);
                    } else if (result.status === 'rejected') {
                        const errorMsg = `Batch item ${i + batchIndex} failed: ${result.reason}`;
                        this.updateProgress(
                            jobId,
                            `Processing batch ${batchNumber}/${totalBatches}`,
                            processedCount,
                            errorMsg
                        );
                    }
                });

                // Add delay between batches to respect rate limits
                if (i + batchSize < chunks.length) {
                    this.updateProgress(
                        jobId,
                        `Waiting between batches (${batchNumber}/${totalBatches})`,
                        processedCount
                    );
                    await new Promise(resolve => setTimeout(resolve, this.defaultConfig.batchDelay));
                }
            }

            this.updateProgress(jobId, 'Merging chunk mindmaps', processedCount);

            // Merge all chunk mindmaps into a hierarchical structure
            const mergedMindmap = this.mergeChunkMindmaps(chunkMindmaps, fileName);

            this.updateProgress(jobId, 'Completed', processedCount);

            // Clean up progress data after a delay
            setTimeout(() => this.clearProgress(jobId), 300000); // 5 minutes

            return mergedMindmap;
        } catch (error) {
            const errorMsg = `Error in hierarchical processing: ${error instanceof Error ? error.message : String(error)}`;
            this.updateProgress(jobId, 'Failed', 0, errorMsg);
            logger.error(errorMsg);
            return null;
        }
    }

    /**
     * Process medium files (10-50MB) using chunked approach
     */
    private async processFileInChunks(
        filePath: string,
        fileName: string,
        customPrompt?: string
    ): Promise<MindmapData | null> {
        try {
            logger.info('Starting chunked processing for medium file');

            const chunks = await this.readFileInChunks(filePath, 100000); // 100KB chunks
            if (!chunks || chunks.length === 0) {
                return null;
            }

            // For medium files, we can process more chunks at once
            const summaryChunks = chunks.map((chunk, index) => ({
                content: chunk.substring(0, 2000), // Take first 2KB as summary
                index: index + 1,
            }));

            // Create a summary-based mindmap
            const combinedSummary = summaryChunks
                .map(chunk => `[Section ${chunk.index}]: ${chunk.content}`)
                .join('\n\n');

            const prompt = customPrompt || createMindmapPrompt(combinedSummary, fileName);

            return await this.generateMindmapContent(prompt);
        } catch (error) {
            logger.error(`Error in chunked processing: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Process small files (<10MB) using standard approach
     */
    private async processFileStandard(
        filePath: string,
        fileName: string,
        customPrompt?: string
    ): Promise<MindmapData | null> {
        try {
            logger.info('Starting standard processing for small file');

            const fileContent = await readFileContent(filePath);
            if (!fileContent) {
                return null;
            }

            const prompt = customPrompt || createMindmapPrompt(fileContent, fileName);
            return await this.generateMindmapContent(prompt);
        } catch (error) {
            logger.error(`Error in standard processing: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Read file in chunks for memory-efficient processing
     */
    private async readFileInChunks(filePath: string, chunkSize: number): Promise<string[] | null> {
        try {
            const chunks: string[] = [];
            const buffer = Buffer.alloc(chunkSize);
            const fd = fs.openSync(filePath, 'r');

            let position = 0;
            let bytesRead: number;

            do {
                bytesRead = fs.readSync(fd, buffer, 0, chunkSize, position);
                if (bytesRead > 0) {
                    const chunk = buffer.subarray(0, bytesRead).toString('utf-8');
                    // Ensure we don't break in the middle of a word
                    const lastSpaceIndex = chunk.lastIndexOf(' ');
                    if (lastSpaceIndex > 0 && bytesRead === chunkSize) {
                        chunks.push(chunk.substring(0, lastSpaceIndex));
                        position += lastSpaceIndex;
                    } else {
                        chunks.push(chunk);
                        position += bytesRead;
                    }
                }
            } while (bytesRead > 0);

            fs.closeSync(fd);

            logger.info(`File divided into ${chunks.length} chunks`);
            return chunks;
        } catch (error) {
            logger.error(`Error reading file in chunks: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Merge multiple chunk mindmaps into a single hierarchical structure
     */
    private mergeChunkMindmaps(chunkMindmaps: MindmapData[], fileName: string): MindmapData {
        const mergedNodes: MindmapData['nodes'] = [];
        const mergedEdges: MindmapData['edges'] = [];

        // Create a central root node
        const rootNode = {
            id: 'root_main',
            position: { x: 0, y: 0 },
            data: {
                label: `${fileName} Overview`,
                pageStartIndex: 1,
                pageEndIndex: chunkMindmaps.length,
                pageCount: chunkMindmaps.length,
            },
        };

        mergedNodes.push(rootNode);

        // Process each chunk mindmap
        chunkMindmaps.forEach((chunkMindmap, chunkIndex) => {
            if (!chunkMindmap.nodes || chunkMindmap.nodes.length === 0) return;

            // Add all nodes from this chunk
            chunkMindmap.nodes.forEach((node, nodeIndex) => {
                // Adjust positions to create a hierarchical layout
                const adjustedNode = {
                    ...node,
                    position: {
                        x: (chunkIndex % 4) * 300 - 450, // Arrange in a grid
                        y: Math.floor(chunkIndex / 4) * 200 + 150 + nodeIndex * 80,
                    },
                };
                mergedNodes.push(adjustedNode);
            });

            // Add all edges from this chunk
            if (chunkMindmap.edges) {
                mergedEdges.push(...chunkMindmap.edges);
            }

            // Connect the first node of each chunk to the root
            if (chunkMindmap.nodes.length > 0) {
                const connectEdge = {
                    id: `root_to_section_${chunkIndex}`,
                    source: 'root_main',
                    target: chunkMindmap.nodes[0].id,
                };
                mergedEdges.push(connectEdge);
            }
        });

        logger.info(`Merged mindmap created with ${mergedNodes.length} nodes and ${mergedEdges.length} edges`);

        return {
            nodes: mergedNodes,
            edges: mergedEdges,
        };
    }

    /**
     * Generate mindmap content using OpenAI API
     */
    private async generateMindmapContent(prompt: string, config?: GenerationOptions): Promise<MindmapData | null> {
        try {
            const messages: ChatCompletionMessageParam[] = [
                {
                    role: 'system',
                    content:
                        'You are an expert at creating educational mindmaps. Always return valid JSON responses that match the requested structure exactly.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ];

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages,
                max_tokens: config?.maxTokens ?? 20000,
                temperature: config?.temperature ?? 1,
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                logger.error('No content received from OpenAI API');
                return null;
            }

            // Parse and validate the JSON response
            const mindmapData = JSON.parse(content) as MindmapData;

            // Validate the structure
            if (!this.validateMindmapData(mindmapData)) {
                logger.error('Invalid mindmap data structure received');
                return null;
            }

            return mindmapData;
        } catch (error) {
            logger.error(`Error generating mindmap content: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Validate mindmap data structure
     */
    private validateMindmapData(data: unknown): data is MindmapData {
        try {
            if (!data || typeof data !== 'object') return false;

            const mindmapData = data as Record<string, unknown>;

            if (!Array.isArray(mindmapData.nodes) || !Array.isArray(mindmapData.edges)) {
                return false;
            }

            // Validate nodes structure
            for (const node of mindmapData.nodes) {
                if (!node || typeof node !== 'object') return false;
                const nodeObj = node as Record<string, unknown>;
                if (!nodeObj.id || !nodeObj.position || !nodeObj.data) return false;

                const position = nodeObj.position as Record<string, unknown>;
                if (typeof position.x !== 'number' || typeof position.y !== 'number') return false;

                const data = nodeObj.data as Record<string, unknown>;
                if (!data.label) return false;
            }

            // Validate edges structure
            for (const edge of mindmapData.edges) {
                if (!edge || typeof edge !== 'object') return false;
                const edgeObj = edge as Record<string, unknown>;
                if (!edgeObj.id || !edgeObj.source || !edgeObj.target) return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Format JSON data for mindmap generation
     */
    private formatJSONForMindmap(data: unknown, prefix = ''): string {
        const lines: string[] = [];

        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                data.forEach((item, index) => {
                    lines.push(`${prefix}Item ${index + 1}:`);
                    lines.push(this.formatJSONForMindmap(item, prefix + '  '));
                });
            } else {
                Object.entries(data).forEach(([key, value]) => {
                    lines.push(`${prefix}${key}:`);
                    if (typeof value === 'object') {
                        lines.push(this.formatJSONForMindmap(value, prefix + '  '));
                    } else {
                        lines.push(`${prefix}  ${String(value)}`);
                    }
                });
            }
        } else {
            lines.push(`${prefix}${String(data)}`);
        }

        return lines.join('\n');
    }

    /**
     * Read and format JSON files
     */
    private readJSONFile(filePath: string): string | null {
        try {
            const jsonContent = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(jsonContent);

            // Convert JSON to readable format for mindmap generation
            return this.formatJSONForMindmap(parsed);
        } catch (error) {
            logger.error(`Error reading JSON file: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Initialize progress tracking for a processing job
     */
    private initializeProgress(jobId: string, totalChunks: number): void {
        if (!this.defaultConfig.enableProgress) return;

        this.processingProgress.set(jobId, {
            currentStep: 'Initializing',
            chunksProcessed: 0,
            totalChunks,
            percentComplete: 0,
            startTime: Date.now(),
            errors: [],
        });
    }

    /**
     * Update progress for a processing job
     */
    private updateProgress(jobId: string, step: string, chunksProcessed: number, error?: string): void {
        if (!this.defaultConfig.enableProgress) return;

        const progress = this.processingProgress.get(jobId);
        if (!progress) return;

        const percentComplete = Math.round((chunksProcessed / progress.totalChunks) * 100);
        const elapsedTime = Date.now() - progress.startTime;
        const estimatedTotalTime = elapsedTime / (chunksProcessed / progress.totalChunks);
        const estimatedTimeRemaining = Math.max(0, estimatedTotalTime - elapsedTime);

        progress.currentStep = step;
        progress.chunksProcessed = chunksProcessed;
        progress.percentComplete = percentComplete;
        progress.estimatedTimeRemaining = Math.round(estimatedTimeRemaining / 1000);

        if (error) {
            progress.errors.push(error);
        }

        logger.info(`Progress Update [${jobId}]: ${step} - ${percentComplete}% complete`);
    }

    /**
     * Get progress for a processing job
     */
    public getProgress(jobId: string): ProcessingProgress | undefined {
        return this.processingProgress.get(jobId);
    }

    /**
     * Clear progress data for a completed job
     */
    private clearProgress(jobId: string): void {
        this.processingProgress.delete(jobId);
    }

    /**
     * Update the default configuration
     */
    public updateConfig(config: Partial<LargeFileProcessingConfig>): void {
        this.defaultConfig = { ...this.defaultConfig, ...config };
        logger.info('Mindmap generation configuration updated', config);
    }

    /**
     * Get current configuration
     */
    public getConfig(): LargeFileProcessingConfig {
        return { ...this.defaultConfig };
    }
}
