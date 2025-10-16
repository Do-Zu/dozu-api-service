/**
 * @description Compares two strings for equality without considering capitalization.
 * This function is useful for case-insensitive comparisons, such as when checking user input or comparing
 * @param str1
 * @param str2
 * @returns boolean - Returns true if both strings are equal ignoring case, false otherwise.
 */
export function compareIgnoreCapitalization(str1: string, str2: string): boolean {
    if (str1 === str2) return true;
    return lowercase(str1) === lowercase(str2);
}

/**
 * Safely normalizes a string to lowercase and trims surrounding whitespace.
 * Returns empty string for nullish input.
 */
export function lowercase(str: string): string {
    return str ? str.trim().toLowerCase() : '';
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

/**
 * Returns true if the value is undefined, null, or an empty string.
 *
 * @param val - Value to test.
 */
export const isNilOrEmpty = (val: unknown): boolean => val === undefined || val === null || val === '';

/**
 * Check and convert to string
 * @param val
 * @returns string
 */
export const checkAndConvertToString = (val: string | number | undefined | null): string => {
    if (isNilOrEmpty(val)) return '';

    return val!?.toString();
};
