import OpenAI from 'openai';
import {
  ChatCompletion,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat';
import { BaseLLMProvider } from '../../../core/baseLLM.abstract';
import logger from '@/utils/logger';
import { GenerationOptions } from '@/services/generative/v3/base/base.abstract';
import { APIPromise } from 'openai/core';
import { MindmapData } from '@/models/mindmap/mindmap.model';
import { ProcessingProgress, LargeFileProcessingConfig } from '@/types/generate/large-file.type';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';

/**
 * Implements AbstractBaseLLMService for OpenAI API
 * Handles connection to OpenAI, streaming, and client management
 */
export class OpenAIService extends BaseLLMProvider {
  private openai: OpenAI | undefined;
  private isClientInitialized = false;
  private processingProgress = new Map<string, ProcessingProgress>();

  // Default configuration for large file processing
  private defaultConfig: LargeFileProcessingConfig = {
    maxChunkSize: 100000, // 100KB
    batchSize: 3, // Process 3 chunks concurrently
    batchDelay: 2000, // 2 second delay between batches
    maxFileSizeMB: 500, // 500MB max file size
    enableProgress: true,
  };

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initializes the OpenAI client if API key and base URL are available
   * @returns true if initialization was successful, false otherwise
   */
  protected override async initialize(): Promise<boolean> {
    try {
      // Initialize base service first to load provider configuration
      await this.initialBase();

      // Check for required configuration
      if (!this.validateConfig()) {
        return false;
      }

      // Create OpenAI client with configuration
      this.openai = new OpenAI({
        apiKey: this.apiKey!,
        baseURL: this.baseURL!,
      });

      this.isClientInitialized = true;
      logger.info('OpenAI client initialized successfully');
      return true;
    } catch (error) {
      this.handleInitError(error);
      return false;
    }
  }

  /**
   * Validates that configuration is complete for client initialization
   */
  private validateConfig(): boolean {
    if (!this.apiKey) {
      logger.warn('Missing API key for OpenAI initialization');
      return false;
    }

    if (!this.baseURL) {
      logger.warn('Missing base URL for OpenAI initialization');
      return false;
    }

    return true;
  }

  /**
   * Handles and logs initialization errors
   */
  private handleInitError(error: unknown): void {
    logger.error(
      `Failed to initialize OpenAI client: ${error instanceof Error ? error.message : String(error)}`
    );
    this.isClientInitialized = false;
  }

  /**
   * Check if the service is ready to handle requests
   */
  public isAvailable(): boolean {
    return this.isClientInitialized && this.openai instanceof OpenAI;
  }

  /**
   * Gets the current model configured for requests
   */
  public getModel(): string | null {
    return this.model;
  }

  /**
   * Gets the API key used for authentication
   */
  public getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Gets the provider base URL
   */
  public getProviderBaseUrl(): string | null {
    return this.baseURL;
  }

  /**
   * Gets the OpenAI client instance
   */
  public getOpenAI(): OpenAI | undefined {
    return this.openai;
  }

  public override async generate(
    prompt: string,
    options?: GenerationOptions
  ): Promise<APIPromise<ChatCompletion> | undefined> {
    return await this.createCompletion(prompt, options);
  }

  /**
   * Creates a streaming chat completion
   * @param messages The messages to send to the API
   * @param config Additional configuration options
   * @returns A streaming response or undefined if service is unavailable
   */
  private async createStream(
    messages: Array<ChatCompletionMessageParam>,
    config?: Omit<ChatCompletionCreateParamsStreaming, 'model'>
  ) {
    // Check if service is available
    if (!this.isAvailable()) {
      logger.warn('OpenAI service unavailable for streaming request');
      return undefined;
    }

    // Check rate limits
    const canProcess = await this.canLLMProcess();
    if (!canProcess) {
      logger.warn('Rate limits exceeded for OpenAI streaming request');
      return undefined;
    }

    try {
      // Create streaming chat completion
      return await this.openai!.chat.completions.create({
        model: this.model!,
        messages,
        max_tokens: config?.max_tokens ?? 8000,
        temperature: config?.temperature ?? 0.1,
        stream: true,
        stream_options: {
          include_usage: true,
        },
        ...config,
      });
    } catch (error) {
      logger.error(
        `Error creating OpenAI stream: ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  }
  /**
   * Creates a non-streaming chat completion
   * @param messages The messages to send to the API
   * @param config Additional configuration options
   * @returns A non-streaming response or undefined if service is unavailable
   */
  private async createCompletion(
    prompt: string,
    config?: GenerationOptions,
    messages?: Array<ChatCompletionMessageParam>
  ) {
    // Check if service is available
    if (!this.isAvailable()) {
      logger.warn('OpenAI service unavailable for completion request');
      return undefined;
    }

    // Check rate limits
    const canProcess = await this.canLLMProcess();
    if (!canProcess) {
      logger.warn('Rate limits exceeded for OpenAI completion request');
      return undefined;
    }

    if (!messages) {
      messages = [
        {
          role: 'system',
          content: 'You are an expert at creating educational content from academic content.',
        },
        { role: 'user', content: prompt },
      ];
    }

    try {
      // Create non-streaming chat completion
      return await this.openai!.chat.completions.create({
        model: this.model!,
        messages,
        max_tokens: config?.maxTokens ?? 8000,
        temperature: config?.temperature ?? 0.1,
        top_p: config?.topP,
      });
    } catch (error) {
      logger.error(
        `Error creating OpenAI completion: ${error instanceof Error ? error.message : String(error)}`
      );
      return undefined;
    }
  }

  /**
   * Create a generator for streaming content from Google Studio through OpenAI
   * This provides a standardized way to handle streaming generation
   *
   * @param prompt The prompt to generate from
   * @yields Chunks of generated content
   */ public async *handleProcessStreamContent(
    prompt: string
  ): AsyncGenerator<string, void, unknown> {
    // Configure generation context
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an expert at creating educational content from academic content.',
      },
      { role: 'user', content: prompt },
    ];

    // Create streaming response
    const stream = await this.createStream(messages);

    if (!stream) return;

    // Yield content chunks as they arrive
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
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
    if (!this.isAvailable()) {
      logger.warn('OpenAI service unavailable for mindmap generation');
      return null;
    }

    try {
      logger.info(`Starting mindmap generation for large file: ${fileName}`);

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
  private async getFileMetadata(
    filePath: string
  ): Promise<{ sizeInMB: number; sizeInBytes: number } | null> {
    try {
      const stats = fs.statSync(filePath);
      const sizeInBytes = stats.size;
      const sizeInMB = sizeInBytes / (1024 * 1024);

      logger.info(`File metadata - Size: ${sizeInMB.toFixed(2)}MB (${sizeInBytes} bytes)`);
      return { sizeInMB, sizeInBytes };
    } catch (error) {
      logger.error(
        `Error getting file metadata: ${error instanceof Error ? error.message : String(error)}`
      );
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

        this.updateProgress(
          jobId,
          `Processing batch ${batchNumber}/${totalBatches}`,
          processedCount
        );

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

            const chunkPrompt = customPrompt
              ? customPrompt
              : this.createLargeFileMindmapPrompt(chunk, fileName, pageInfo);

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
   */ private async processFileInChunks(
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

      const prompt = customPrompt || this.createMindmapPrompt(combinedSummary, fileName);
      return await this.generateMindmapContent(prompt);
    } catch (error) {
      logger.error(
        `Error in chunked processing: ${error instanceof Error ? error.message : String(error)}`
      );
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

      const fileContent = await this.readFileContent(filePath);
      if (!fileContent) {
        return null;
      }

      const prompt = customPrompt || this.createMindmapPrompt(fileContent, fileName);
      return await this.generateMindmapContent(prompt);
    } catch (error) {
      logger.error(
        `Error in standard processing: ${error instanceof Error ? error.message : String(error)}`
      );
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
      logger.error(
        `Error reading file in chunks: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Create a specialized prompt for mindmap generation
   */
  private createMindmapPrompt(content: string, fileName: string): string {
    return `
                You are an expert at creating educational mindmaps from documents. Analyze the following content from "${fileName}" and create a comprehensive mindmap structure.

                IMPORTANT: Return your response as valid JSON that matches this exact structure:
                {
                  "nodes": [
                    {
                      "id": "unique_id",
                      "position": {"x": number, "y": number},
                      "data": {
                        "label": "Main Topic or Subtopic",
                        "pageStartIndex": number (optional),
                        "pageEndIndex": number (optional),
                        "pageCount": number (optional)
                      }
                    }
                  ],
                  "edges": [
                    {
                      "id": "unique_edge_id",
                      "source": "source_node_id",
                      "target": "target_node_id"
                    }
                  ]
                }

                Guidelines:
                1. Create a central main topic node
                2. Add 3-7 main category nodes connected to the central topic
                3. Add 2-4 subtopic nodes for each main category
                4. Use clear, concise labels (max 3-4 words per node)
                5. Position nodes in a hierarchical layout
                6. Ensure all node IDs are unique
                7. Connect related concepts with edges

                Content to analyze:
                ${content.substring(0, 8000)} ${content.length > 8000 ? '...(content truncated)' : ''}

                Return only the JSON structure, no additional text or formatting.`;
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

    logger.info(
      `Merged mindmap created with ${mergedNodes.length} nodes and ${mergedEdges.length} edges`
    );

    return {
      nodes: mergedNodes,
      edges: mergedEdges,
    };
  }

  /**
   * Enhanced file content reader with support for different file types
   * Supports text files, PDFs, and basic document formats
   */
  private async readFileContent(filePath: string): Promise<string | null> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        logger.error(`File not found: ${filePath}`);
        return null;
      }

      const fileExtension = path.extname(filePath).toLowerCase();
      logger.info(`Reading file with extension: ${fileExtension}`);

      switch (fileExtension) {
        case '.txt':
        case '.md':
        case '.log':
          return this.readTextFile(filePath);

        case '.pdf':
          return this.readPDFFile(filePath);

        case '.json':
          return this.readJSONFile(filePath);

        default:
          // Try to read as text file
          logger.warn(`Unsupported file type ${fileExtension}, attempting to read as text`);
          return this.readTextFile(filePath);
      }
    } catch (error) {
      logger.error(
        `Error reading file content: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Read plain text files with encoding detection
   */
  private readTextFile(filePath: string): string | null {
    try {
      // Try UTF-8 first
      let content = fs.readFileSync(filePath, 'utf-8');

      // Basic validation for UTF-8
      if (content.includes('\uFFFD')) {
        // Try with latin1 encoding if UTF-8 fails
        content = fs.readFileSync(filePath, 'latin1');
      }

      return content;
    } catch (error) {
      logger.error(
        `Error reading text file: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }
  /**
   * Read PDF files using pdf-parse for professional text extraction
   */
  private async readPDFFile(filePath: string): Promise<string | null> {
    try {
      logger.info(`Reading PDF file: ${path.basename(filePath)}`);

      // Read the PDF buffer
      const pdfBuffer = fs.readFileSync(filePath); // Parse PDF using pdf-parse with simplified options
      const pdfData = await pdfParse(pdfBuffer, {
        // Maximum number of pages to process (0 = all pages)
        max: 0,
      }); // Validate extracted content
      if (!pdfData.text || pdfData.text.trim().length === 0) {
        logger.warn('PDF text extraction resulted in empty content');
        return 'PDF appears to contain only images, graphics, or scanned content that cannot be extracted as text. Please ensure the PDF contains selectable text.';
      }

      return this.cleanPDFText(pdfData.text, pdfData.numpages || 0);
    } catch (error) {
      logger.error(
        `Error reading PDF file with pdf-parse: ${error instanceof Error ? error.message : String(error)}`
      );

      // Fallback to basic extraction if pdf-parse fails completely
      logger.info('PDF-parse failed, attempting fallback extraction method...');
      return this.readPDFFileFallback(filePath);
    }
  }

  /**
   * Clean and normalize PDF text content
   */
  private cleanPDFText(text: string, pageCount: number): string {
    const textLength = text.length;
    logger.info(`PDF extraction successful - Pages: ${pageCount}, Characters: ${textLength}`);

    // Clean and normalize the extracted text
    const cleanedText = text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove page numbers and headers/footers (basic patterns)
      .replace(/^\d+\s*$/gm, '')
      // Remove isolated single characters that might be artifacts
      .replace(/\n\s*[a-zA-Z]\s*\n/g, '\n')
      // Fix hyphenated words split across lines
      .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2')
      // Normalize line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Remove common PDF artifacts
      .replace(/\f/g, '\n') // Form feed to line break
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      // Fix common PDF text extraction issues
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase and uppercase
      .replace(/(\d)([A-Za-z])/g, '$1 $2') // Add space between numbers and letters
      .replace(/([A-Za-z])(\d)/g, '$1 $2') // Add space between letters and numbers
      .trim();

    // Add metadata about the PDF for better context in mindmap generation
    const metadata = `[PDF Document: ${pageCount} pages, ${Math.round(textLength / 1000)}K characters extracted]\n\n`;

    return metadata + cleanedText;
  }

  /**
   * Fallback PDF reading method (basic extraction)
   */
  private readPDFFileFallback(filePath: string): string | null {
    try {
      logger.warn('Using fallback PDF extraction method (limited functionality)');

      const buffer = fs.readFileSync(filePath);
      const text = buffer.toString('binary');

      // Extract readable text patterns (very basic)
      const textMatches = text.match(/\(([^)]+)\)/g);
      if (textMatches) {
        const extractedText = textMatches
          .map(match => match.slice(1, -1))
          .filter(text => text.length > 3 && /[a-zA-Z]/.test(text))
          .join(' ');

        if (extractedText.length > 50) {
          return `[Fallback PDF extraction - limited quality]\n\n${extractedText}`;
        }
      }

      return 'PDF content could not be extracted. Please ensure the PDF contains selectable text and is not password protected.';
    } catch (error) {
      logger.error(
        `Fallback PDF reading failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
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
      logger.error(
        `Error reading JSON file: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
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
   * Memory-efficient streaming file reader for very large files
   */
  private async readFileStream(
    filePath: string,
    maxSize: number = 100 * 1024 * 1024
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      let content = '';
      let totalBytes = 0;
      stream.on('data', (chunk: string | Buffer) => {
        const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
        totalBytes += Buffer.byteLength(chunkStr, 'utf-8');

        if (totalBytes > maxSize) {
          stream.destroy();
          logger.warn(`File too large, truncating at ${maxSize} bytes`);
          resolve(content);
          return;
        }

        content += chunkStr;
      });

      stream.on('end', () => {
        resolve(content);
      });

      stream.on('error', error => {
        reject(error);
      });
    });
  }

  /**
   * Enhanced mindmap prompt for large files with page information
   */
  private createLargeFileMindmapPrompt(
    content: string,
    fileName: string,
    pageInfo?: { start: number; end: number; total: number }
  ): string {
    const pageText = pageInfo
      ? ` (Pages ${pageInfo.start}-${pageInfo.end} of ${pageInfo.total})`
      : '';

    return `
You are an expert at creating comprehensive educational mindmaps from large documents. Analyze the following content from "${fileName}${pageText}" and create a detailed mindmap structure that captures the main themes and relationships.

IMPORTANT: Return your response as valid JSON that matches this exact structure:
{
  "nodes": [
    {
      "id": "unique_id",
      "position": {"x": number, "y": number},
      "data": {
        "label": "Main Topic or Subtopic",
        "pageStartIndex": ${pageInfo?.start || 1},
        "pageEndIndex": ${pageInfo?.end || 1},
        "pageCount": ${pageInfo?.total || 1}
      }
    }
  ],
  "edges": [
    {
      "id": "unique_edge_id",
      "source": "source_node_id",
      "target": "target_node_id"
    }
  ]
}

Guidelines for large document mindmaps:
1. Create 1 central main topic node
2. Add 5-8 main category nodes connected to the central topic
3. Add 3-5 subtopic nodes for each main category
4. Use hierarchical positioning (central -> categories -> subtopics)
5. Include cross-references between related concepts
6. Use clear, descriptive labels (3-6 words per node)
7. Ensure comprehensive coverage of the document section
8. Position nodes to avoid overlapping

Content to analyze (truncated for processing):
${content.substring(0, 12000)} ${content.length > 12000 ? '...(content continues - this is a section of a larger document)' : ''}

Return only the JSON structure, no additional text or formatting.`;
  }

  /**
   * Generate mindmap content using OpenAI API
   */
  private async generateMindmapContent(prompt: string): Promise<MindmapData | null> {
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

      const response = await this.openai!.chat.completions.create({
        model: this.model!,
        messages,
        max_tokens: 4000,
        temperature: 0.3,
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
      logger.error(
        `Error generating mindmap content: ${error instanceof Error ? error.message : String(error)}`
      );
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
  private updateProgress(
    jobId: string,
    step: string,
    chunksProcessed: number,
    error?: string
  ): void {
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
}
