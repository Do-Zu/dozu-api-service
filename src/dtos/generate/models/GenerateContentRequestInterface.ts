/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GenerateContentRequestInterface = {
    /**
     * The content to generate flashcards or quizzes from.
     */
    content: string;
    /**
     * The type of content to generate (e.g., 'flashcard', 'quiz').
     */
    type: string;
    /**
     * Optional method parameter for specifying generation behavior.
     */
    method?: string;

    /**
     *
     */
    options?: IGenerateOptions;

    /**
     *
     */
    inputSetId?: number | string;
};

export interface IGenerateOptions {
    /**
     *
     */
    numberOfItem: number;
    /**
     *
     */
    difficulty: string;
    /**
     *
     */
    focus: string;
    /**
     *
     */
    listType: string[];
}
