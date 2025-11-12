import { TypeInsertNote, TypeSelectNote } from "@/models";

export type INote = TypeSelectNote;
export type InsertNote = TypeInsertNote;

export type IUpdateNote = Pick<InsertNote, 'content'>;
export type IUpdateNoteBody = IUpdateNote;
