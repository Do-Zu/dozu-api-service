/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */

import { IColorTheme, IMindmapType } from "@/types/mindmap/mindmap.type";

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
    commonGenerateOptions?: ICommonGenerateOptions;
    nodesData?: NodesData;
    mindmapGenerateOptions?: IMindmapGenerateOptions;
}

export interface ICommonGenerateOptions {
    numberOfItem: number;
    difficulty: string;
    focus: string;
    listType: string[];
}

export type NodesData = {
    nodeId: string;
    label: string;
    description?: string;
    startSection: string;
    endSection: string;
}[];

export interface IMindmapGenerateOptions {
    type?: IMindmapType;
    colorTheme?: IColorTheme | null;
    instruction?: string;
}
