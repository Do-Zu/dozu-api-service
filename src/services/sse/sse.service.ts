import { Response } from 'express';
import logger from '@/utils/logger';
import { STATUS_GEN } from '../generative/utils/constant';

class SSEManager {
    private clients: Map<string, Response> = new Map();
    // eslint-disable-next-line no-undef
    private clientHeartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
    private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
    // Callback to notify when a client connects (for checking pending results)
    private onClientConnectCallback?: (jobId: string) => Promise<boolean>;

    constructor() {
        logger.info('SSE Manager initialized');
    }

    /**
     * Set callback to be executed when a client connects
     * This allows other services to check for pending results
     */
    public setOnClientConnectCallback(callback: (jobId: string) => Promise<boolean>): void {
        this.onClientConnectCallback = callback;
    }

    public addClient(jobId: string, res: Response): void {
        // Remove existing client if there is one (ensuring one client per job)
        this.removeClientByJobId(jobId);

        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });

        // Send initial connection established message
        res.write(`data: ${JSON.stringify({ status: STATUS_GEN.connected, jobId })}\n\n`);

        // Add client to the map (one client per jobId)
        this.clients.set(jobId, res);

        logger.info(`Client connected for job ${jobId}, total connections: ${this.getTotalConnections()}`);

        // Set up heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
            this.sendHeartbeat(jobId);
        }, this.HEARTBEAT_INTERVAL);

        this.clientHeartbeatIntervals.set(jobId, heartbeatInterval);

        // Handle client disconnect
        res.on('close', () => {
            this.removeClientByJobId(jobId);
            logger.info(`Client disconnected from job ${jobId}, remaining connections: ${this.getTotalConnections()}`);
        });

        // Check for pending results when client connects
        if (this.onClientConnectCallback) {
            this.onClientConnectCallback(jobId).catch(error => {
                logger.error(`Error checking pending results for job ${jobId}: ${error.message}`);
            });
        }
    }

    private removeClientByJobId(jobId: string): void {
        // Clear heartbeat interval
        if (this.clientHeartbeatIntervals.has(jobId)) {
            clearInterval(this.clientHeartbeatIntervals.get(jobId));
            this.clientHeartbeatIntervals.delete(jobId);
        }

        // Remove client
        if (this.clients.has(jobId)) {
            this.clients.delete(jobId);
        }
    }

    private sendHeartbeat(jobId: string): void {
        const client = this.clients.get(jobId);
        if (client) {
            client.write(`:heartbeat\n\n`); // SSE comment for heartbeat
        }
    }

    public sendEvent(jobId: string, data: unknown, isError = false): boolean {
        const client = this.clients.get(jobId);

        if (!client) {
            return false;
        }

        const status = isError ? STATUS_GEN.error : STATUS_GEN.completed;

        const eventData = JSON.stringify({
            jobId,
            timestamp: new Date().toISOString(),
            status,
            data,
        });

        // Send to the client waiting for this job
        client.write(`data: ${eventData}\n\n`);

        // Send an end event to let the client know it's complete
        client.write(`event: complete\ndata: ${JSON.stringify({ jobId })}\n\n`);

        // Close connection after sending data (optional - you can decide if you want this behavior)
        setTimeout(() => {
            this.closeConnection(jobId);
        }, 500); // Give a small delay to ensure data is sent

        logger.info(`Event sent to client for job ${jobId}`);
        return true;
    }

    private closeConnection(jobId: string): void {
        const client = this.clients.get(jobId);
        if (client) {
            client.end(); // Close the connection
            this.removeClientByJobId(jobId);
            logger.info(`Connection closed for job ${jobId}`);
        }
    }

    public getTotalConnections(): number {
        return this.clients.size;
    }

    public isClientConnected(jobId: string): boolean {
        return this.clients.has(jobId);
    }
}

export const sseManager = new SSEManager();
