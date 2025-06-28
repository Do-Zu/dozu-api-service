import { eq } from 'drizzle-orm';
import db from '../../libs/drizzleClient.lib';
import { usersTable } from '../../models/user.model';
import { FreeTimeData, TimeSlot } from './type';

export class UserRepository {
    /**
     * Get free time slots for a specific user
     * @param userId - The ID of the user
     * @returns Promise<FreeTimeData | null>
     */
    public async getFreeTimeSlots(userId: string): Promise<FreeTimeData | null> {
        const user = await db
            .select({
                freeTime: usersTable.freeTime,
                isActive: usersTable.isActive,
            })
            .from(usersTable)
            .where(eq(usersTable.userId, parseInt(userId)));

        if (!user.length || !user[0].isActive) {
            return null;
        }

        const userData = user[0];
        const freeTimeSlots = this.parseFreeTimeData(userData.freeTime);

        return {
            freeTimeSlots,
        };
    }

    /**
     * Parse free time JSON data into structured time slots
     * @param freeTimeData - Raw JSON data from database
     * @returns TimeSlot[]
     */
    private parseFreeTimeData(freeTimeData: any): TimeSlot[] {
        if (!freeTimeData || typeof freeTimeData !== 'object') {
            return [];
        }

        const timeSlots: TimeSlot[] = [];

        // Handle different possible JSON structures
        if (Array.isArray(freeTimeData)) {
            // Array of time slots
            return freeTimeData
                .filter(slot => this.isValidTimeSlot(slot))
                .map(slot => ({
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                }));
        } else if (freeTimeData.slots && Array.isArray(freeTimeData.slots)) {
            // Object with slots array
            return freeTimeData.slots
                .filter((slot: TimeSlot) => this.isValidTimeSlot(slot))
                .map((slot: TimeSlot) => ({
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                }));
        } else {
            // Object with day keys
            Object.keys(freeTimeData).forEach(day => {
                const daySlots = freeTimeData[day];
                if (Array.isArray(daySlots)) {
                    daySlots.forEach(slot => {
                        if (slot.startTime && slot.endTime) {
                            timeSlots.push({
                                startTime: slot.startTime,
                                endTime: slot.endTime,
                            });
                        }
                    });
                }
            });
        }

        return timeSlots;
    }

    /**
     * Validate if a time slot object has required fields
     * @param slot - Time slot object to validate
     * @returns boolean
     */
    private isValidTimeSlot(slot: any): boolean {
        return (
            slot &&
            typeof slot === 'object' &&
            typeof slot.startTime === 'string' &&
            typeof slot.endTime === 'string' &&
            slot.startTime.trim() !== '' &&
            slot.endTime.trim() !== ''
        );
    }
}

export const userRepository = new UserRepository();
