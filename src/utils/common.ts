/**
 * @description Compares two strings for equality without considering capitalization.
 * This function is useful for case-insensitive comparisons, such as when checking user input or comparing
 * @param str1
 * @param str2
 * @returns boolean - Returns true if both strings are equal ignoring case, false otherwise.
 */
export function compareIgnoreCapitalization(str1: string, str2: string): boolean {
    return str1?.toLowerCase() === str2?.toLowerCase();
}

/**
 *
 * @param uuid  A UUID string that may contain hyphens.
 * @description Removes hyphens from a UUID string.
 * @returns  A new string that is the same as the input UUID but without any hyphens.
 */
export function removeHyphensFromUUID(uuid: string): string {
    return uuid.replace(/-/g, '');
}
