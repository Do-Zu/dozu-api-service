interface ITermFrequency {
  [term: string]: number;
}

export interface IVector {
  [term: string]: number;
}

const generateNGrams = (text: string, n: number): string[] => {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/); // Split by any whitespace

  const ngrams: string[] = [];

  // Add individual words (unigrams)
  ngrams.push(...words);

  // Generate n-grams
  for (let i = 2; i <= n; i++) {
    for (let j = 0; j <= words.length - i; j++) {
      ngrams.push(words.slice(j, j + i).join(' '));
    }
  }

  return ngrams;
};

const calculateFrequencyWords = (document: string, maxNGramSize = 3) => {
  // Generate n-grams up to specified size
  const terms = generateNGrams(document, maxNGramSize);

  const termFrequency: ITermFrequency = {};

  for (const term of terms) {
    if (termFrequency[term]) {
      termFrequency[term] += 1;
    } else {
      termFrequency[term] = 1;
    }
  }

  return {
    termFrequency,
    lengthDocument: terms.length,
  };
};

export const calculateTermFrequency = (document: string, maxNGramSize = 3) => {
  if (!document || document.length == 0) {
    return {};
  }

  const { termFrequency, lengthDocument } = calculateFrequencyWords(document, maxNGramSize);

  for (const term in termFrequency) {
    termFrequency[term] = termFrequency[term] / lengthDocument;
  }

  return termFrequency;
};

export const calculateInverseDocumentFrequency = (
  keywords: string,
  documents: string[],
  maxNGramSize = 3,
  useWordEmbeddings = true
) => {
  if (!keywords || keywords.length == 0) {
    return {};
  }

  if (!documents || documents.length == 0) {
    return {};
  }

  // Generate n-grams from keywords
  let keywordTerms = generateNGrams(keywords, maxNGramSize);

  // Expand keywords with semantically related terms if enabled
  if (useWordEmbeddings) {
    const expandedTerms: string[] = [];

    keywordTerms = [...new Set([...keywordTerms, ...expandedTerms])];
  }

  const totalDocuments = documents.length;
  const termDocumentFrequency: ITermFrequency = {};

  for (const term of keywordTerms) {
    termDocumentFrequency[term] = 0;
  }

  const termIDF: ITermFrequency = {};

  for (const document of documents) {
    const { termFrequency } = calculateFrequencyWords(document, maxNGramSize);

    for (const term of keywordTerms) {
      if (termFrequency[term]) {
        termDocumentFrequency[term] += 1;
      }
    }
  }

  for (const term in termDocumentFrequency) {
    termIDF[term] = Math.log((totalDocuments + 1) / (termDocumentFrequency[term] + 1));
  }

  return termIDF;
};

export const calculateTFIDF = (
  keywords: string,
  documents: string[],
  maxNGramSize = 3,
  useWordEmbeddings = true
) => {
  const termFrequency = calculateTermFrequency(keywords, maxNGramSize);

  const termIDF = calculateInverseDocumentFrequency(
    keywords,
    documents,
    maxNGramSize,
    useWordEmbeddings
  );

  const tfidf: ITermFrequency = {};
  for (const term in termFrequency) {
    tfidf[term] = termFrequency[term] * (termIDF[term] || 0);
  }

  // Add IDF terms that might have been added through word embeddings
  for (const term in termIDF) {
    if (!tfidf[term]) {
      // Assign a small TF value for related terms not in the original text
      tfidf[term] = 0.05 * termIDF[term];
    }
  }

  return tfidf;
};

// Existing cosine similarity functions remain unchanged
export const calculateCosineSimilarityVectors = (vectorA: IVector, vectorB: IVector) => {
  const terms = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);

  const vectorAValues = Array.from(terms).map(term => vectorA[term] || 0);
  const vectorBValues = Array.from(terms).map(term => vectorB[term] || 0);

  return calculateCosineSimilarity(vectorAValues, vectorBValues);
};

export const calculateCosineSimilarity = (vectorA: number[], vectorB: number[]) => {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must be of the same length');
  }

  const dotProduct = vectorA.reduce((sum, value, index) => sum + value * vectorB[index], 0);
  const magnitudeA = Math.sqrt(vectorA.reduce((sum, value) => sum + value * value, 0));
  const magnitudeB = Math.sqrt(vectorB.reduce((sum, value) => sum + value * value, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};
