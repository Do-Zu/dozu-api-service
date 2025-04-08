import { json, urlencoded } from 'express';
/**
 * Parser Middleware Configurations
 * Configure request body parsers
 */
export const parserMiddleware = {
  /**
   * JSON Parser Configuration
   * Parses JSON request bodies
   */
  json: () => {
    return json({
      limit: '10mb', // Limit body size
    });
  },

  /**
   * URL-encoded Parser Configuration
   * Parses URL-encoded request bodies
   */
  urlencoded: () => {
    return urlencoded({
      extended: true, // Allow for rich objects and arrays to be encoded
      limit: '10mb', // Limit body size
    });
  },
};
