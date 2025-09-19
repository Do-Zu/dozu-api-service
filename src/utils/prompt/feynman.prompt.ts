type PageInfo = { start: number; end: number; total: number };

type FeynmanPromptOptions = {
    maxQuestions?: number; // cap count of questions
    maxHints?: number; // cap count of hints
    maxGaps?: number; // cap count of detected gaps
    contentTruncateLength?: number; // max content length to embed
    language?: string; // force response language; default: match source language
    educationLevel?: 'child' | 'beginner' | 'intermediate' | 'advanced';
    forbidTerms?: string[]; // terms to avoid in questions/hints
    pageInfo?: PageInfo; // optional page range context
    customInstructions?: string; // extra caller-supplied instructions
};

function createFeynmanPromptGenerateQuestion(content: string, topic?: string): string {
    return buildFeynmanPromptTemplate(content, topic, {
        maxQuestions: 10,
        maxHints: 7,
        maxGaps: 6,
        contentTruncateLength: 5000,
        educationLevel: 'beginner',
    });
}

function createCustomFeynmanPromptGenerateQuestion(
    content: string,
    topic?: string,
    options: FeynmanPromptOptions = {}
): string {
    return buildFeynmanPromptTemplate(content, topic, options);
}

function buildFeynmanPromptTemplate(content: string, topic?: string, options: FeynmanPromptOptions = {}): string {
    const {
        maxQuestions = 8,
        maxHints = 6,
        maxGaps = 5,
        contentTruncateLength = 6000,
        language,
        educationLevel = 'beginner',
        forbidTerms = [],
        pageInfo,
        customInstructions,
    } = options;

    const truncated = content.slice(0, Math.max(0, contentTruncateLength));
    const wasTruncated = content.length > contentTruncateLength;

    const levelLabel =
        educationLevel === 'child'
            ? 'Explain as if teaching a curious 10-year-old.'
            : educationLevel === 'beginner'
              ? 'Use beginner-friendly language.'
              : educationLevel === 'intermediate'
                ? 'Use clear, intermediate-level language.'
                : 'Assume an advanced but non-expert audience; prefer clarity over jargon.';

    const languageDirective = language
        ? `Respond in: ${language}.`
        : 'Respond in the same language as the input content.';

    const forbidDirective =
        forbidTerms.length > 0
            ? `Avoid using these terms in your output (questions and hints). If a concept requires them, replace with simpler alternatives: ${forbidTerms.join(', ')}.`
            : '';

    const pageText = pageInfo ? ` (Pages ${pageInfo.start}-${pageInfo.end} of ${pageInfo.total})` : '';

    // Prompt with strict schema + enhancement-focused guidance, but unchanged output shape
    return `
You are a Socratic educator using the Feynman Technique. Given the topic and content below${pageText}, produce a JSON-only response that helps a learner explain the topic simply and identify knowledge gaps.

${languageDirective}
${levelLabel}
${forbidDirective}

Output format (must match exactly; no extra fields, no comments, no markdown):
{
  "questions": [
    { "content": "Question text" }
  ],
  "hints": [
    "Hint text"
  ],
  "detectedGaps": [
    { "word": "jargon_or_ambiguous_term", "suggestion": "plain-language replacement or explanation" }
  ]
}

Strong guidelines to improve thinking and learning quality:
- Questions:
  - Provide up to ${maxQuestions} open-ended questions; avoid yes/no and rhetorical forms.
  - Start simple and grow in depth (progressive difficulty). Examples of starts: "What", "How", "Why", "If", "Where", "When".
  - Include at least one that asks to explain it to a child and one that asks for a real-world example.
  - Encourage restatement in the learner’s own words and checking understanding by teaching someone else.
  - If the topic includes processes, include step-by-step explanation prompts.
- Hints:
  - Provide up to ${maxHints} concise hints that guide explanation without giving full answers.
  - Use real-world analogies, break processes into steps, replace jargon with everyday words, and sanity-check with edge cases or extremes.
  - Prefer concrete, actionable phrasing (e.g., "Start by...", "Compare it to...", "Test by...").
- Detected gaps:
  - Provide up to ${maxGaps} potential jargon terms, ambiguous words, or dense phrases from the content.
  - For each, suggest simpler wording or a clear substitute definition. Prefer everyday synonyms.
- Keep wording fresh; do not copy long phrases verbatim from the source.
- Keep each string short and clear; avoid unnecessary qualifiers.
- If the content is highly technical, still produce accessible output using simpler language.
- Ensure valid JSON: double quotes for strings, no trailing commas, no extra keys, and no additional text.

Topic: ${topic ?? 'N/A'}

Content${wasTruncated ? ' (truncated for processing)' : ''}:
${truncated}${wasTruncated ? '\n...(content continues)...' : ''}

${customInstructions ? `Additional instructions: ${customInstructions}` : ''}

Return only the JSON object described above, with exactly the three keys: "questions", "hints", "detectedGaps".`;
}

type FeynmanEvaluationOptions = {
    contentTruncateLength?: number;
    language?: string;
    educationLevel?: 'child' | 'beginner' | 'intermediate' | 'advanced';
    forbidTerms?: string[];
    pageInfo?: { start: number; end: number; total: number };
    customInstructions?: string;
    maxQuestions?: number;
    maxHints?: number;
    maxGaps?: number;
};

/**
 * Create a Feynman-style evaluation prompt to score and improve a learner's explanation.
 * - Focus on simple words and short sentences
 * - Provide actionable hints and step-by-step structure
 * - Return JSON-only with scores and an improved explanation
 */
function createFeynmanEvaluationPrompt(
    userExplanation: string,
    topic?: string,
    referenceContent?: string,
    options: FeynmanEvaluationOptions = {}
): string {
    const {
        contentTruncateLength = 6000,
        language,
        educationLevel = 'beginner',
        forbidTerms = [],
        pageInfo,
        customInstructions,
        maxQuestions = 6,
        maxHints = 5,
        maxGaps = 5,
    } = options;

    const truncatedRef = (referenceContent ?? '').slice(0, Math.max(0, contentTruncateLength));
    const wasTruncated = (referenceContent ?? '').length > contentTruncateLength;

    const levelLabel =
        educationLevel === 'child'
            ? 'Explain like to a curious 10-year-old.'
            : educationLevel === 'beginner'
              ? 'Use beginner-friendly language.'
              : educationLevel === 'intermediate'
                ? 'Use clear, intermediate-level language.'
                : 'Assume an advanced but non-expert audience; prefer clarity over jargon.';

    const languageDirective = language
        ? `Respond in: ${language}.`
        : 'Respond in the same language as the learner explanation.';

    const forbidDirective =
        forbidTerms.length > 0
            ? `Avoid using these terms. If needed, replace with simpler alternatives: ${forbidTerms.join(', ')}.`
            : '';

    const pageText = pageInfo ? ` (Pages ${pageInfo.start}-${pageInfo.end} of ${pageInfo.total})` : '';

    return `
You are a supportive tutor using the Feynman Technique. Evaluate the learner's explanation of the topic below${pageText}, then provide clear, simple feedback and an improved explanation.

${languageDirective}
${levelLabel}
${forbidDirective}

Output format (must be valid JSON only; no extra fields, no comments, no markdown):
{
  "scores": {
    "overall": 0,
    "clarity": 0,
    "correctness": 0,
    "simplicity": 0,
    "structure": 0,
    "analogyUse": 0
  },
  "feedback": {
    "summary": "one-sentence overview",
    "strengths": ["short point"],
    "improvements": ["short, actionable point"]
  },
  "improvedExplanation": "rewrite using simple words and short sentences",
  "stepByStep": ["Step 1 ...", "Step 2 ..."],
  "hints": ["Hint 1", "Hint 2"],
  "questions": [{ "content": "Open-ended question" }],
  "detectedGaps": [{ "word": "jargon_or_ambiguous_term", "suggestion": "plain-language replacement or explanation" }],
  "glossary": [{ "term": "term", "simpleDefinition": "short, everyday definition" }],
  "actionPlan": ["Concrete next step 1", "Concrete next step 2"]
}

Scoring rubric:
- Provide integer scores 0-100 for clarity, correctness, simplicity, structure, analogyUse; overall is a weighted blend.
- Keep items brief and non-redundant.

Generation guidelines:
- Use simple words, short sentences, and active voice.
- Replace jargon with everyday words; if a term must stay, define it in the glossary.
- Hints should guide without giving full answers.
- StepByStep should be 4-8 clear steps.
- Provide up to ${maxQuestions} questions; avoid yes/no.
- Provide up to ${maxHints} hints and up to ${maxGaps} detectedGaps.
- Ensure valid JSON: double quotes, no trailing commas, no extra keys.

Topic: ${topic ?? 'N/A'}

Learner requirement and explanation:
${userExplanation}

Reference content (optional)${wasTruncated ? ' (truncated for processing)' : ''}:
${truncatedRef}${wasTruncated ? '\n...(content continues)...' : ''}

${customInstructions ? `Additional instructions: ${customInstructions}` : ''}

Return only the JSON object with exactly these keys: "scores", "feedback", "improvedExplanation", "stepByStep", "hints", "questions", "detectedGaps", "glossary", "actionPlan".`;
}

export {
    createFeynmanPromptGenerateQuestion,
    createCustomFeynmanPromptGenerateQuestion,
    createFeynmanEvaluationPrompt,
};
