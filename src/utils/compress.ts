import pako from 'pako';

// Maximum allowed content size in KB
export const MAX_CONTENT_SIZE_KB_FOR_LAMBDA = 256;

/**
 * Decompresses content that was compressed using pako deflate
 * This matches the client-side compression implemented with pako
 *
 * @param compressedString The compressed binary string to decompress
 * @returns Original decompressed text
 */
export const decompressContent = (compressedString: string): string => {
  if (!compressedString || compressedString.length === 0) {
    return '';
  }

  try {
    // Convert binary string back to Uint8Array
    const compressedBytes = new Uint8Array(
      compressedString.split('').map(char => char.charCodeAt(0))
    );

    // Inflate (decompress) the data
    const decompressedBytes = pako.inflate(compressedBytes);

    // Convert back to string using TextDecoder
    const decompressedText = new TextDecoder().decode(decompressedBytes);

    // const compressedSize = compressedString.length;
    // const decompressedSize = decompressedText.length;
    // const compressedSizeKB = compressedSize / 1024;
    // const decompressedKB = decompressedSize / 1024;
    // const expansionRatio = (decompressedSize / compressedSize).toFixed(2);

    // console.log(
    //   `Decompression: Compressed: ${compressedSize} bytes (${compressedSizeKB.toFixed(2)} KB), Decompressed: ${decompressedSize} bytes (${decompressedKB} KB), Expansion ratio: ${expansionRatio}x`
    // );

    return decompressedText;
  } catch (error) {
    console.error('Error decompressing content:', error);
    // If decompression fails, return the original string
    // This handles the case where uncompressed content was sent
    return compressedString;
  }
};
