import db from '@/libs/drizzleClient.lib';
import { itemSpacedRepetitionTrackingTable } from '@/models';
import { ICreateTrackingRecord } from '@/types/tracking/itemSpacedRepetitionTracking.type';

class ItemSpacedRepetitionTrackingRepo {
    public async initializeTrackingRecords(data: ICreateTrackingRecord[]) : Promise<void> {
        if(data.length === 0) {
            return;
        }
        await db.insert(itemSpacedRepetitionTrackingTable).values(data);
    }
}

export default new ItemSpacedRepetitionTrackingRepo();