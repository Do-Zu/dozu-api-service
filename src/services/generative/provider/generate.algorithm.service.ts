/**
 * Enhanced Flashcard Generator Service
 * Processes text content and generates diverse, concise flashcards
 */

interface FlashcardOptions {
  maxCards?: number;
  format?: 'basic' | 'cloze' | 'true-false' | 'fill-blank';
  difficulty?: 'easy' | 'medium' | 'hard';
  topicFocus?: string | null;
  minSectionLength?: number;
  wordLimit?: number;
  contentType?: 'transcript' | 'webpage' | 'document' | 'auto';
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  questionType: string;
  choices?: string[];
  metadata?: {
    sourceSection: string;
    difficulty?: string;
    topics?: string[];
  };
}

/**
 * Generates a list of flashcards from provided content
 * @param content Text content to convert into flashcards
 * @param options Configuration options for flashcard generation
 * @returns Array of generated flashcards
 */
export function generateFlashcards(content: string, options: FlashcardOptions = {}): Flashcard[] {
  try {
    const {
      maxCards = 20,
      format = 'basic',
      difficulty = 'medium',
      topicFocus = null,
      minSectionLength = 50,
      wordLimit = 90,
      contentType = 'auto',
    } = options;

    if (!content || typeof content !== 'string') {
      throw new Error('Content must be a non-empty string');
    }

    // Process content with size limits
    const maxContentLength = 100000;
    const processedContent =
      content.length > maxContentLength ? content.substring(0, maxContentLength) : content;

    // Detect content type if set to auto
    const detectedContentType =
      contentType === 'auto' ? detectContentType(processedContent) : contentType;

    // Preprocess content based on its detected type
    const normalizedContent = preprocessContent(processedContent, detectedContentType);

    // Extract meaningful content chunks with improved analysis
    const chunks = extractMeaningfulChunks(
      normalizedContent,
      minSectionLength,
      detectedContentType
    );
    if (chunks.length === 0) {
      return [];
    }

    // Process and score chunks to find best candidates with improved analysis
    const processedChunks = processChunks(chunks, topicFocus);

    // Generate theme summary flashcards
    const themeSummaries = generateThemeSummaries(processedChunks);

    // Generate diverse flashcards from the best chunks
    const contentFlashcards: Flashcard[] = [];
    let remainingCards = maxCards - Math.min(3, themeSummaries.length); // Reserve space for theme cards

    // Create a distribution of question types - we'll use a subset for each chunk
    // to avoid repetition across question types
    const allQuestionTypes = [
      'open-ended',
      'closed-ended',
      'investigation',
      'directional',
      'reverse',
      'fill-blank',
      'true-false',
    ];

    // Process chunks until we reach maxCards
    for (const chunk of processedChunks) {
      // For each chunk, select a subset of question types to avoid repetition
      // Shuffle the question types to randomize which ones we use for each chunk
      const shuffledQuestionTypes = [...allQuestionTypes]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(3, remainingCards)); // Select up to 3 question types per chunk

      // Create questions of the selected types only
      for (const questionType of shuffledQuestionTypes) {
        if (remainingCards <= 0) break;

        // Create flashcard with current type
        const flashcard = createFlashcard(
          `card_${Date.now()}_${contentFlashcards.length}`,
          chunk.text,
          questionType,
          difficulty,
          wordLimit,
          chunk.keywords
        );

        if (flashcard) {
          contentFlashcards.push(flashcard);
          remainingCards--;
        }
      }

      if (remainingCards <= 0) break;
    }

    // Combine theme summary cards with content cards
    return [...themeSummaries, ...contentFlashcards];
  } catch (error) {
    console.error('Error generating flashcards:', error);
    return [];
  }
}

/**
 * Detects the type of content based on its structure and characteristics
 */
function detectContentType(content: string): 'transcript' | 'webpage' | 'document' {
  // Check for transcript patterns (timestamps, speaker indicators)
  const hasTimestamps = /\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2}|\[\d{1,2}:\d{2}\]/.test(content);
  const hasSpeakerIndicators = /^[A-Z][a-z]+:|\[[A-Za-z\s]+\]:/.test(content);

  if (hasTimestamps || hasSpeakerIndicators) {
    return 'transcript';
  }

  // Check for HTML-like content
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);

  if (hasHtmlTags) {
    return 'webpage';
  }

  // Default to document
  return 'document';
}

/**
 * Preprocesses content based on content type
 */
function preprocessContent(content: string, contentType: string): string {
  switch (contentType) {
    case 'transcript':
      // Remove timestamps and speaker indicators
      return content
        .replace(/\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2}|\[\d{1,2}:\d{2}\]/g, '')
        .replace(/^[A-Z][a-z]+:|\[[A-Za-z\s]+\]:/gm, '')
        .replace(/\n+/g, '\n')
        .trim();

    case 'webpage':
      // Remove HTML tags and decode entities
      return content
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

    case 'document':
    default:
      // Handle document-specific formatting
      return content
        .replace(/\f/g, '\n\n') // Form feeds (page breaks)
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
        .trim();
  }
}

/**
 * Extracts meaningful chunks of text from content
 */
function extractMeaningfulChunks(
  content: string,
  minLength: number,
  contentType: string
): string[] {
  // Adjust chunk extraction based on content type
  if (contentType === 'transcript') {
    // Group transcript content by topic changes or pauses
    return extractTranscriptChunks(content, minLength);
  } else if (contentType === 'webpage') {
    // Try to respect logical sections like paragraphs and headers
    return extractWebpageChunks(content, minLength);
  }

  // First split by paragraph breaks (default behavior for documents)
  const paragraphs = content.split(/\n\s*\n|\r\n\s*\r\n|\r\s*\r/);

  // Further split long paragraphs into sentences
  const chunks: string[] = [];

  paragraphs.forEach(paragraph => {
    paragraph = paragraph.trim();

    if (paragraph.length < minLength) {
      if (paragraph.length > 0) {
        chunks.push(paragraph);
      }
      return;
    }

    // For long paragraphs, consider splitting into sentence groups
    if (paragraph.length > 200) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [];

      if (sentences.length > 3) {
        // Group sentences into smaller chunks
        let currentChunk = '';
        sentences.forEach(sentence => {
          if (currentChunk.length + sentence.length < 200) {
            currentChunk += sentence;
          } else {
            if (currentChunk.length > minLength) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
          }
        });

        if (currentChunk.length > minLength) {
          chunks.push(currentChunk.trim());
        }
        return;
      }
    }

    chunks.push(paragraph);
  });

  return chunks;
}

/**
 * Extract chunks specifically from transcript-style content
 */
function extractTranscriptChunks(content: string, minLength: number): string[] {
  // Split by potential topic changes or speaker changes
  const lines = content.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const line of lines) {
    // Consider a pause or new topic if there's a very short line followed by a longer one
    if (line.trim().length < 10 && currentChunk.length > minLength) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
      continue;
    }

    currentChunk += line + ' ';

    // If chunk is getting long, close it
    if (currentChunk.length > 300) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
  }

  if (currentChunk.length > minLength) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Extract chunks specifically from webpage-style content
 */
function extractWebpageChunks(content: string, minLength: number): string[] {
  // Try to respect paragraph structure in webpages
  const chunks: string[] = [];

  // Look for paragraph-like structures
  const paragraphs = content.split(/\n+|(?<=[.!?])\s{2,}/);

  let currentChunk = '';
  for (const para of paragraphs) {
    if (para.trim().length < 5) continue;

    if (currentChunk.length + para.length > 300) {
      if (currentChunk.length > minLength) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = para;
    } else {
      currentChunk += ' ' + para;
    }
  }

  if (currentChunk.length > minLength) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Process and score text chunks, reordering by relevance
 */
function processChunks(
  chunks: string[],
  topicFocus: string | null
): { text: string; score: number; keywords: string[]; mainTopic: string }[] {
  const processedChunks = chunks.map(chunk => {
    const keywords = extractKeywords(chunk);
    let score = 0;

    // Calculate importance score with enhanced metrics
    score += Math.min(keywords.length * 2, 10); // Keywords boost
    score += containsNumbersOrStatistics(chunk) ? 5 : 0; // Statistics boost
    score += containsDefinition(chunk) ? 5 : 0; // Definition boost
    score += containsEducationalTerms(chunk) ? 8 : 0; // Educational content boost
    score += containsComparisonOrContrast(chunk) ? 7 : 0; // Comparison/contrast boost

    // Topic focus relevance boost
    if (topicFocus && chunk.toLowerCase().includes(topicFocus.toLowerCase())) {
      score += 10;
    }

    // Identify the main topic for this chunk
    const mainTopic = identifyMainTopic(chunk, keywords);

    return { text: chunk, score, keywords, mainTopic };
  });

  // Sort by score (highest first)
  return processedChunks.sort((a, b) => b.score - a.score);
}

/**
 * Identify the main topic of a chunk based on keywords and context
 */
function identifyMainTopic(text: string, keywords: string[]): string {
  // First check if we have a good keyword
  if (keywords.length > 0) {
    // Use the first keyword if it appears to be a noun or concept
    if (keywords[0].length > 3 && /^[A-Z][a-z]/.test(keywords[0])) {
      return keywords[0];
    }

    // Check for compound concepts (multiple words)
    for (const keyword of keywords) {
      if (keyword.includes(' ') && keyword.length > 6) {
        return keyword;
      }
    }

    // Default to first keyword
    return keywords[0];
  }

  // If no keywords, try to extract noun phrases
  const nounPhraseMatch = text.match(/\b([A-Z][a-z]{1,}(?:\s+[a-z]{1,}){0,3})\b/);
  if (nounPhraseMatch) {
    return nounPhraseMatch[0];
  }

  // Fall back to domain-specific topic extraction
  const domainTopics = extractDomainSpecificConcepts(text);
  if (domainTopics.length > 0) {
    return domainTopics[0];
  }

  // Last resort
  return 'this topic';
}

/**
 * Extract domain-specific concepts from text
 */
function extractDomainSpecificConcepts(text: string): string[] {
  const concepts: string[] = [];

  // Look for academic concepts
  const academicPatterns = [
    /\b([A-Za-z]+(?:\s+[A-Za-z]+){0,2})\s+(?:theory|concept|law|principle|effect|paradox|hypothesis)\b/gi,
    /\b(?:theory|concept|law|principle|effect|paradox|hypothesis)\s+of\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})\b/gi,
  ];

  academicPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1] && match[1].length > 3) {
        concepts.push(match[1].trim());
      }
    });
  });

  // Look for potential subjects
  const subjectMatch = text.match(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)\b/);
  if (subjectMatch && subjectMatch[0].length > 3) {
    concepts.push(subjectMatch[0]);
  }

  return concepts;
}

/**
 * Extract important keywords from text with improved academic term detection
 */
function extractKeywords(text: string): string[] {
  const patterns = [
    // Capitalized terms (likely important concepts)
    /\b([A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)*)\b/g,

    // Terms after definition markers
    /\b(?:is defined as|refers to|means|is characterized by|is known as|called|described as)\s+([^,.;:]+)/gi,

    // Terms in quotes
    /"([^"]{3,50})"/g,
    /'([^']{3,50})'/g,

    // Terms in parentheses
    /\(([^)]{3,50})\)/g,

    // Academic and technical terms
    /\b(algorithm|process|methodology|technique|mechanism|procedure|function|structure|system|theory|principle|concept|framework|paradigm|model)\s+([a-zA-Z]{3,}(?:\s[a-zA-Z]+)*)/gi,
  ];

  const keywords: string[] = [];
  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const keyword = (match[1] || match[0]).trim();
      if (keyword && keyword.length > 3 && keywords.indexOf(keyword) === -1) {
        keywords.push(keyword);
      }
    });
  });

  // Enhanced filtering of common words that shouldn't be keywords
  return keywords
    .filter(
      term =>
        // Filter out pronouns, articles, and common non-topical words
        !/^(a|an|the|of|in|on|at|by|for|with|to|and|or|but|this|that|these|those|you|your|my|mine|our|ours|we|they|them|their|its|it|he|she|his|her|him|I|me)$/i.test(
          term
        ) &&
        // Check the term isn't just a common word
        !/^(however|therefore|thus|hence|so|because|since|although|though|while|whether|also|too|very|just|only|even|like|such|into|onto|upon|about|through|behind|under|above|below)$/i.test(
          term
        ) &&
        // Ensure term is substantial
        term.length > 3
    )
    .slice(0, 5); // Limit to top 5 keywords
}

/**
 * Check if text contains educational terms or explanations
 */
function containsEducationalTerms(text: string): boolean {
  const educationalPatterns = [
    /\b(learn|understand|explain|concept|important|key|principle|theory|framework|method|approach)\b/i,
    /\b(for example|such as|including|consists of|comprises|refers to)\b/i,
    /\b(main|primary|essential|fundamental|critical|significant)\b/i,
  ];

  return educationalPatterns.some(pattern => pattern.test(text));
}

/**
 * Check if text contains comparisons or contrasts
 */
function containsComparisonOrContrast(text: string): boolean {
  return /\b(compared to|versus|vs\.|unlike|similar to|difference between|whereas|while|however|but|although|on the other hand)\b/i.test(
    text
  );
}

/**
 * Check if text contains numbers or statistics
 */
function containsNumbersOrStatistics(text: string): boolean {
  return /\d+%|\d+\.\d+|\d+ percent|increased by|\d+ times/.test(text);
}

/**
 * Check if text contains a definition
 */
function containsDefinition(text: string): boolean {
  return /\b(is defined as|refers to|means|is characterized by|is called|is known as)\b/.test(text);
}

/**
 * Generate theme summary flashcards from processed chunks
 */
function generateThemeSummaries(
  processedChunks: { text: string; score: number; keywords: string[]; mainTopic: string }[]
): Flashcard[] {
  if (processedChunks.length < 3) {
    return [];
  }

  // Extract all keywords and main topics across chunks
  const allKeywords = processedChunks.flatMap(chunk => chunk.keywords);
  const allTopics = processedChunks.map(chunk => chunk.mainTopic);

  // Combine and deduplicate
  const potentialThemes = [...new Set([...allTopics, ...allKeywords])];

  // Filter out common words and pronouns
  const filteredThemes = potentialThemes.filter(
    theme =>
      !/^(this|that|these|those|they|them|their|your|you|our|we)$/i.test(theme) && theme.length > 3
  );

  // Count theme frequencies
  const themeCount: { [key: string]: number } = {};
  filteredThemes.forEach(theme => {
    let count = 0;
    processedChunks.forEach(chunk => {
      if (chunk.text.toLowerCase().includes(theme.toLowerCase())) {
        count++;
      }
    });
    themeCount[theme] = count;
  });

  // Find top themes (most frequent across chunks)
  const themes = Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);

  // Create a summary flashcard for each main theme
  return themes.map((theme, index) => {
    // Find chunks that mention this theme
    const relevantChunks = processedChunks
      .filter(
        chunk =>
          chunk.keywords.includes(theme) ||
          chunk.text.toLowerCase().includes(theme.toLowerCase()) ||
          chunk.mainTopic === theme
      )
      .slice(0, 3);

    // Create a concise summary from these chunks
    const summary = relevantChunks
      .map(chunk => findMostRelevantSentence(chunk.text, theme))
      .join(' ');

    // Create a question that requires understanding, not just definition
    const questionTypes = [
      `What role does ${theme} play in this context?`,
      `How is ${theme} significant in this material?`,
      `Why is ${theme} considered important?`,
      `What are the implications of ${theme}?`,
      `How does ${theme} affect related concepts?`,
    ];

    const questionIndex = index % questionTypes.length;
    const question = questionTypes[questionIndex];

    return {
      id: `theme_${Date.now()}_${index}`,
      question: question,
      answer: summary.length > 200 ? summary.substring(0, 197) + '...' : summary,
      questionType: 'summary',
      metadata: {
        sourceSection: 'Theme summary',
        difficulty: 'medium',
        topics: [theme],
      },
    };
  });
}

/**
 * Find the most relevant sentence about a topic in a text
 */
function findMostRelevantSentence(text: string, topic: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  // Score each sentence by relevance to the topic
  const scoredSentences = sentences.map(sentence => {
    let score = 0;
    if (sentence.toLowerCase().includes(topic.toLowerCase())) score += 10;
    if (containsDefinition(sentence)) score += 5;
    if (sentence.length > 20 && sentence.length < 150) score += 3; // Ideal length
    return { sentence, score };
  });

  // Return highest scoring sentence
  return scoredSentences.sort((a, b) => b.score - a.score)[0]?.sentence || text;
}

/**
 * Create a single flashcard using the specified question type and difficulty
 */
function createFlashcard(
  id: string,
  text: string,
  questionType: string,
  difficulty: string,
  wordLimit: number,
  keywords: string[]
): Flashcard | null {
  // Extract key sentences and concepts
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  // Ensure we have something to work with
  if (sentences.length === 0 || (keywords.length === 0 && questionType !== 'fill-blank')) {
    return null;
  }

  let question: string;
  let answer: string;
  let choices: string[] | undefined = undefined;

  // Create question based on type
  switch (questionType) {
    case 'open-ended':
      return createOpenEndedQuestion(id, text, sentences, keywords, difficulty, wordLimit);

    case 'closed-ended':
      return createClosedEndedQuestion(id, text, sentences, keywords, difficulty, wordLimit);

    case 'investigation':
      return createInvestigationQuestion(id, text, sentences, keywords, difficulty, wordLimit);

    case 'directional':
      return createDirectionalQuestion(id, text, sentences, keywords, difficulty, wordLimit);

    case 'reverse':
      return createReverseQuestion(id, text, sentences, keywords, difficulty, wordLimit);

    case 'fill-blank':
      return createFillBlankQuestion(id, text, sentences, keywords, difficulty, wordLimit);

    case 'true-false':
      return createTrueFalseQuestion(id, text, sentences, keywords, difficulty, wordLimit);

    default:
      return createOpenEndedQuestion(id, text, sentences, keywords, difficulty, wordLimit);
  }
}

/**
 * Create an open-ended question (requires explanation/elaboration)
 */
function createOpenEndedQuestion(
  id: string,
  text: string,
  sentences: string[],
  keywords: string[],
  difficulty: string,
  wordLimit: number
): Flashcard {
  const keyword = keywords[0] || extractMainConcept(text);

  // Define question templates that don't repeat answer content
  const easyTemplates = [
    `Why is ${keyword} significant?`,
    `How would you explain ${keyword} to someone new to this topic?`,
    `What are the implications of ${keyword}?`,
  ];

  const mediumTemplates = [
    `How does ${keyword} relate to other concepts in this field?`,
    `What factors influence ${keyword}?`,
    `What might be some applications of ${keyword}?`,
  ];

  const hardTemplates = [
    `Evaluate the strengths and limitations of ${keyword}.`,
    `How might ${keyword} evolve in the future?`,
    `What controversies or debates surround ${keyword}?`,
  ];

  // Select a template based on difficulty
  let templates: string[];
  if (difficulty === 'easy') templates = easyTemplates;
  else if (difficulty === 'medium') templates = mediumTemplates;
  else templates = hardTemplates;

  // Choose a random template
  const question = templates[Math.floor(Math.random() * templates.length)];

  // Create answer based on relevant sentences
  let answer = findRelevantSentences(text, keyword, 2).join(' ');

  // Trim answer if needed
  if (countWords(answer) > wordLimit) {
    answer = truncateToWordLimit(answer, wordLimit);
  }

  return {
    id,
    question,
    answer,
    questionType: 'open-ended',
    metadata: {
      sourceSection: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      difficulty,
      topics: keywords.slice(0, 3),
    },
  };
}

/**
 * Create a closed-ended question (has specific answers)
 */
function createClosedEndedQuestion(
  id: string,
  text: string,
  sentences: string[],
  keywords: string[],
  difficulty: string,
  wordLimit: number
): Flashcard {
  const keyword = keywords[0] || extractMainConcept(text);

  // Question templates that test actual understanding
  const questionTemplates = [
    `Which of the following accurately describes ${keyword}?`,
    `What is one key characteristic of ${keyword}?`,
    `What distinguishes ${keyword} from related concepts?`,
  ];

  // Choose a question that fits the content
  let questionIndex = 0;
  if (containsDefinition(text)) {
    questionIndex = 0;
  } else if (containsComparisonOrContrast(text)) {
    questionIndex = 2;
  } else {
    questionIndex = 1;
  }

  const question = questionTemplates[questionIndex];

  // Find the most relevant sentence as the answer
  const relevantSentence = findRelevantSentences(text, keyword, 1)[0] || sentences[0];
  let answer = relevantSentence;

  // Trim answer if needed
  if (countWords(answer) > wordLimit) {
    answer = truncateToWordLimit(answer, wordLimit);
  }

  return {
    id,
    question,
    answer,
    questionType: 'closed-ended',
    metadata: {
      sourceSection: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      difficulty,
      topics: keywords.slice(0, 3),
    },
  };
}

/**
 * Create an investigation question (explores causes/effects/relationships)
 */
function createInvestigationQuestion(
  id: string,
  text: string,
  sentences: string[],
  keywords: string[],
  difficulty: string,
  wordLimit: number
): Flashcard {
  const keyword = keywords[0] || extractMainConcept(text);
  const secondaryConcept = keywords[1] || (keywords.length > 0 ? 'related concepts' : 'this field');

  // Create investigation questions that probe deeper understanding
  const questionTemplates = [
    `How does ${keyword} impact or influence other aspects of this subject?`,
    `What evidence supports the importance of ${keyword}?`,
    `What relationship exists between ${keyword} and ${secondaryConcept}?`,
  ];

  // Select a template that fits the content
  let questionIndex = 0;
  if (containsComparisonOrContrast(text)) {
    questionIndex = 2;
  } else if (containsNumbersOrStatistics(text)) {
    questionIndex = 1;
  } else {
    questionIndex = 0;
  }

  const question = questionTemplates[questionIndex];

  // Create answer based on relevant sentences
  let answer = findRelevantSentences(text, keyword, 2).join(' ');

  // Trim answer if needed
  if (countWords(answer) > wordLimit) {
    answer = truncateToWordLimit(answer, wordLimit);
  }

  return {
    id,
    question,
    answer,
    questionType: 'investigation',
    metadata: {
      sourceSection: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      difficulty,
      topics: keywords.slice(0, 3),
    },
  };
}

/**
 * Create a directional question (focuses on process/steps)
 */
function createDirectionalQuestion(
  id: string,
  text: string,
  sentences: string[],
  keywords: string[],
  difficulty: string,
  wordLimit: number
): Flashcard {
  const keyword = keywords[0] || extractMainConcept(text);

  // Check if the keyword actually represents a process
  const isProcess =
    /\b(process|procedure|method|technique|approach|steps|stages|phases|cycle|workflow|mechanism)\b/i.test(
      text
    );

  // Different question templates based on whether it's a process
  const processTemplates = [
    `What are the key steps involved in ${keyword}?`,
    `How does the process of ${keyword} unfold?`,
    `What sequence of events occurs during ${keyword}?`,
  ];

  const nonProcessTemplates = [
    `How can ${keyword} be applied in practical situations?`,
    `How would you implement ${keyword} in a real-world scenario?`,
    `What considerations are important when working with ${keyword}?`,
  ];

  // Choose appropriate template type
  const templates = isProcess ? processTemplates : nonProcessTemplates;
  const question = templates[Math.floor(Math.random() * templates.length)];

  // Create answer based on relevant sentences
  let answer = findRelevantSentences(text, keyword, 2).join(' ');

  // Trim answer if needed
  if (countWords(answer) > wordLimit) {
    answer = truncateToWordLimit(answer, wordLimit);
  }

  return {
    id,
    question,
    answer,
    questionType: 'directional',
    metadata: {
      sourceSection: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      difficulty,
      topics: keywords.slice(0, 3),
    },
  };
}

/**
 * Create a reverse question (provides information and asks for concept)
 */
function createReverseQuestion(
  id: string,
  text: string,
  sentences: string[],
  keywords: string[],
  difficulty: string,
  wordLimit: number
): Flashcard {
  const keyword = keywords[0] || extractMainConcept(text);
  const relevantSentence = findRelevantSentences(text, keyword, 1)[0] || sentences[0];

  // Create question by masking the keyword in the sentence
  let question = relevantSentence.replace(new RegExp(keyword, 'i'), '________');
  question = `Which concept fits in the blank? "${question}"`;

  // Trim question if needed
  if (countWords(question) > wordLimit) {
    question = truncateToWordLimit(question, wordLimit);
  }

  let answer = keyword;

  return {
    id,
    question,
    answer,
    questionType: 'reverse',
    metadata: {
      sourceSection: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      difficulty,
      topics: keywords.slice(0, 3),
    },
  };
}

/**
 * Create a fill-in-the-blank question
 */
function createFillBlankQuestion(
  id: string,
  text: string,
  sentences: string[],
  keywords: string[],
  difficulty: string,
  wordLimit: number
): Flashcard | null {
  // Select a good sentence for fill-in-the-blank
  const goodSentences = sentences.filter(s => s.trim().length > 20 && s.trim().length < 150);

  if (goodSentences.length === 0) {
    return null;
  }

  // Select sentence based on difficulty
  const sentenceIndex =
    difficulty === 'easy'
      ? 0
      : (difficulty === 'medium'
          ? Math.floor(goodSentences.length / 2)
          : goodSentences.length - 1) % goodSentences.length;

  const sentence = goodSentences[sentenceIndex];

  // Find a significant word to blank out
  let wordToBlank = '';

  // Try to find a keyword in the sentence first
  for (const keyword of keywords) {
    if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
      wordToBlank = keyword;
      break;
    }
  }

  // If no keyword found, find another significant word
  if (!wordToBlank) {
    const words = sentence.split(/\s+/);
    const significantWords = words.filter(word => {
      const cleanWord = word.replace(/[,.!?;:"'()]/g, '');
      return (
        cleanWord.length >= 5 &&
        !/^(about|above|across|after|against|along|among|around|because|before|behind|below|beside|between|beyond|during|except|inside|outside|through|toward|under|within|without|would|could|should|their|there|these|those|since|until)$/i.test(
          cleanWord
        )
      );
    });

    if (significantWords.length > 0) {
      const wordIndex =
        difficulty === 'hard'
          ? significantWords.length - 1
          : Math.floor(Math.random() * significantWords.length);
      wordToBlank = significantWords[wordIndex].replace(/[,.!?;:"'()]/g, '');
    } else {
      return null;
    }
  }

  // Create the question by replacing the word with a blank
  const wordPattern = new RegExp(
    `\\b${wordToBlank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
    'i'
  );
  const question = `Fill in the blank: "${sentence.replace(wordPattern, '_______')}"`;

  // Trim question if needed
  const trimmedQuestion =
    countWords(question) > wordLimit ? truncateToWordLimit(question, wordLimit) : question;

  return {
    id,
    question: trimmedQuestion,
    answer: wordToBlank,
    questionType: 'fill-blank',
    metadata: {
      sourceSection: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      difficulty,
      topics: keywords.slice(0, 3),
    },
  };
}

/**
 * Create a true/false question
 */
function createTrueFalseQuestion(
  id: string,
  text: string,
  sentences: string[],
  keywords: string[],
  difficulty: string,
  wordLimit: number
): Flashcard | null {
  // Select a good sentence for a true/false question
  const goodSentences = sentences.filter(s => s.trim().length > 20 && s.trim().length < 120);

  if (goodSentences.length === 0) {
    return null;
  }

  // Pick a sentence to convert
  const sentence = goodSentences[Math.floor(Math.random() * goodSentences.length)];

  // Decide if we'll use a true statement or create a false one
  const isTrue = Math.random() > 0.5;

  let question: string;
  let answer: string;

  if (isTrue) {
    // Use the original sentence as a true statement
    question = `True or False: "${sentence}"`;
    answer = 'True';
  } else {
    // Create a false statement by modifying the original
    let falseStatement = createFalseStatement(sentence, keywords);
    question = `True or False: "${falseStatement}"`;
    answer = 'False';
  }

  // Trim question if needed
  if (countWords(question) > wordLimit) {
    question = truncateToWordLimit(question, wordLimit);
  }

  return {
    id,
    question,
    answer,
    questionType: 'true-false',
    metadata: {
      sourceSection: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      difficulty,
      topics: keywords.slice(0, 3),
    },
  };
}

/**
 * Create a false statement by modifying a true statement
 */
function createFalseStatement(trueSentence: string, keywords: string[]): string {
  // Several strategies to create false statements:

  // 1. Negate the statement if it doesn't already have negation
  if (!trueSentence.toLowerCase().includes('not') && !trueSentence.toLowerCase().includes("n't")) {
    if (/\bis\b|\bare\b|\bwas\b|\bwere\b/.test(trueSentence)) {
      return trueSentence.replace(/\b(is|are|was|were)\b/i, match => `${match} not`);
    }
  }

  // 2. Replace a keyword with another keyword if we have multiple
  if (keywords.length >= 2) {
    const keywordToReplace = keywords[0];
    const replacement = keywords[1];

    if (trueSentence.includes(keywordToReplace)) {
      return trueSentence.replace(keywordToReplace, replacement);
    }
  }

  // 3. Change numbers in the statement if it contains any
  const numberMatch = trueSentence.match(/\b\d+(\.\d+)?\b/);
  if (numberMatch) {
    const originalNumber = parseFloat(numberMatch[0]);
    const newNumber = originalNumber < 10 ? originalNumber * 10 : Math.floor(originalNumber / 2);
    return trueSentence.replace(numberMatch[0], newNumber.toString());
  }

  // 4. Default: add "not" to the sentence
  const words = trueSentence.split(/\s+/);
  const middleIndex = Math.floor(words.length / 2);

  if (words.length > 3) {
    if (/\b(is|are|was|were|has|have|had|do|does|did)\b/i.test(words[middleIndex - 1])) {
      words.splice(middleIndex, 0, 'not');
    } else {
      words.splice(middleIndex, 0, 'incorrectly');
    }
    return words.join(' ');
  }

  return `It is not true that ${trueSentence}`;
}

/**
 * Extract main concept from text if keywords aren't available
 */
function extractMainConcept(text: string): string {
  // Look for nouns, especially capitalized ones
  const nounMatch = text.match(/\b([A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)*)\b/);
  if (nounMatch) {
    return nounMatch[0];
  }

  // Look for repeated terms
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const wordCount: { [key: string]: number } = {};

  words.forEach(word => {
    if (!wordCount[word]) wordCount[word] = 0;
    wordCount[word]++;
  });

  let mostCommon = '';
  let highestCount = 0;

  Object.entries(wordCount).forEach(([word, count]) => {
    if (count > highestCount && !/^(that|this|with|from|have|more|about)$/i.test(word)) {
      mostCommon = word;
      highestCount = count;
    }
  });

  return mostCommon || 'this concept';
}

/**
 * Find sentences most relevant to a keyword
 */
function findRelevantSentences(text: string, keyword: string, limit: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  // Score sentences by relevance to keyword
  const scoredSentences = sentences.map(sentence => {
    let score = 0;

    // Direct keyword match
    if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
      score += 10;
    }

    // Contains definition markers
    if (containsDefinition(sentence)) {
      score += 5;
    }

    // Contains statistics
    if (containsNumbersOrStatistics(sentence)) {
      score += 3;
    }

    return { sentence, score };
  });

  // Sort by score and return top N
  return scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.sentence);
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Truncate text to word limit
 */
function truncateToWordLimit(text: string, limit: number): string {
  const words = text.split(/\s+/);
  if (words.length <= limit) return text;

  const truncated = words.slice(0, limit).join(' ');
  return truncated + '...';
}
