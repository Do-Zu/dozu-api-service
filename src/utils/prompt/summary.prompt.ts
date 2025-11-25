class SummaryPrompts {
    public createShortSummaryPrompt(content: string) {
        return `Create a concise summary from the following content.
            - Use the same language as the input content.
            - Focus only on essential concepts (as bold headings) and list their key points as bullet points.
            - Format strictly in markdown with the following rules:
                + Each essential concept is bold, using <p><strong>{essential_concept}</strong></p>
                + For the following key points, use <ul class="list-disc ml-4">{key_points}</ul> to wrap the key points
                + For each key point, use <li><p>{key_point}</p></li>
                + Each essential concept is separated by a line, use <p></p>
            - Keep the summary short and avoid unnecessary explanations. 
            - Output must be in only one string, do not use any other forms such as array or object. 
            - Content: ${content}
        `;
    }
}

export default new SummaryPrompts();
