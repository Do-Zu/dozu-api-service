export function fisherYatesShuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // số ngẫu nhiên từ 0 đến i
      [result[i], result[j]] = [result[j], result[i]]; // swap
    }
    return result;
  }
  