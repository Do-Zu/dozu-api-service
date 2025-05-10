export function getDateFormatted(date: Date): string {
    return date.toISOString().substring(0, 10);
}

export function getDateAdded(date: Date | string, days: number): Date {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}