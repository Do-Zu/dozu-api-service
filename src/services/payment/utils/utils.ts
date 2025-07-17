/**
 * This function extracts the order code, job ID, and user ID from the description.
 * @param description - A string containing the description in the format "ORDER:orderCode;JOB:jobId;USER:userId".
 * @returns  An object containing the order code, job ID, and user ID if the format is correct; otherwise, null.
 * @throws  If the description does not match the expected format, it returns null.
 */
export function parseDescription(description: string): { orderCode: string; jobId: string; userId: string } | null {
    const regex = /ORDER:([A-Z0-9]+);JOB:([a-f0-9]+);USER:(\d+)/i;
    const match = description.match(regex);
    if (match) {
        return {
            orderCode: match[1],
            jobId: match[2],
            userId: match[3],
        };
    }
    return null;
}
