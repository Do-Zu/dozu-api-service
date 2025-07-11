//TODO: Update the exchange rate regularly or fetch from an API
// Current exchange rate (you should update this regularly or fetch from an API)
const USD_TO_VND_RATE = 25000; // 1 USD = 25,000 VND (approximate)

/**
 * Converts USD amount to VND
 * @param usdAmount - Amount in USD
 * @param exchangeRate - Optional custom exchange rate (defaults to current rate)
 * @returns Amount in VND
 */
export function convertUsdToVnd(usdAmount: number, exchangeRate: number = USD_TO_VND_RATE): number {
    if (typeof usdAmount !== 'number' || usdAmount < 0) {
        throw new Error('USD amount must be a non-negative number');
    }

    if (typeof exchangeRate !== 'number' || exchangeRate <= 0) {
        throw new Error('Exchange rate must be a positive number');
    }

    return Math.round(usdAmount * exchangeRate);
}

/**
 * Converts VND amount to USD
 * @param vndAmount - Amount in VND
 * @param exchangeRate - Optional custom exchange rate (defaults to current rate)
 * @returns Amount in USD (rounded to 2 decimal places)
 */
export function convertVndToUsd(vndAmount: number, exchangeRate: number = USD_TO_VND_RATE): number {
    if (typeof vndAmount !== 'number' || vndAmount < 0) {
        throw new Error('VND amount must be a non-negative number');
    }

    if (typeof exchangeRate !== 'number' || exchangeRate <= 0) {
        throw new Error('Exchange rate must be a positive number');
    }

    const usdAmount = vndAmount / exchangeRate;
    return Math.round(usdAmount * 100) / 100; // Round to 2 decimal places
}

/**
 * Get current exchange rate (you can extend this to fetch from external API)
 * @returns Current USD to VND exchange rate
 */
export function getCurrentExchangeRate(): number {
    return USD_TO_VND_RATE;
}
