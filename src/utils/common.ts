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

    return val!.toString();
};

/**
 *
 * @param value
 * @returns True if list is empty, false otherwise.
 */
const isListEmpty = (value: unknown[]): boolean => {
    return value.length === 0;
};

/**
 *
 * @param obj
 * @returns True if the object is empty, false otherwise.
 */
const isObjectEmpty = (obj: object): boolean => {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
};

/**
 * Checks if an object is empty (has no own properties).
 *
 * @param obj - The object to be checked.
 * @returns return empty for unknown type
 */
export const isEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;

    if (typeof value === 'string') return value.length === 0;

    if (Array.isArray(value)) return isListEmpty(value);

    if (typeof value === 'object') {
        return isObjectEmpty(value);
    }

    return false;
};

/**
 * Checks if a value is null/undefined or empty.
 *
 * @param value - The value to be checked.
 * @returns True if the value is null, undefined, or empty; false otherwise.
 */
export const isNullOrEmpty = (value: unknown): boolean => {
    if (isNilOrEmpty(value)) return true;

    return isEmpty(value);
};
