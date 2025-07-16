import { IItemType } from "@/models";

export interface ICreateTrackingRecord {
    userId: number,
    topicId: number,
    itemId: number,
    type: IItemType,
}