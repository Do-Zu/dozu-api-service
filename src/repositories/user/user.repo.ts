import { eq } from 'drizzle-orm';
import db from '../../libs/drizzleClient.lib';
import { usersTable } from '../../models/user.model';
import { FreeTimeSlotDays, TimeSlot } from './type';
import { getSystemDate } from '@/utils/date';
import { isNilOrEmpty } from '@/utils/common';

export class UserRepository {
    /**
     * Get free time slots for a specific user
     * @param userId - The ID of the user
     * @returns Promise<FreeTimeData | null>
     */
    public async getFreeTimeSlots(userId: number): Promise<FreeTimeSlotDays | null> {
        const user = await db
            .select({
                freeTime: usersTable.freeTime,
                isActive: usersTable.isActive,
            })
            .from(usersTable)
            .where(eq(usersTable.userId, userId));

        if (!user.length || !user[0].isActive) {
            return null;
        }

        const userData = user[0];

        const freeTimeSlots = userData?.freeTime as FreeTimeSlotDays;

        return freeTimeSlots;
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

    /**
     * Update user info (fullName, avatarUrl, email, preferences, hobbiesTopic, avgStudyDuration)
     */
    public async updateUserInfo(
        userId: number,
        updateData: Partial<{
            fullName: string;
            avatarUrl: string;
            email: string;
            preferences: any;
            hobbiesTopic: string;
            avgStudyDuration: string;
        }>
    ) {
        const [updatedUser] = await db
            .update(usersTable)
            .set({
                ...updateData,
                updatedAt: new Date(),
            })
            .where(eq(usersTable.userId, userId))
            .returning();
        return updatedUser;
    }

    /**
     * Update user password
     */
    public async updateUserPassword(userId: number, passwordHash: string) {
        const [updatedUser] = await db
            .update(usersTable)
            .set({ passwordHash, updatedAt: new Date() })
            .where(eq(usersTable.userId, userId))
            .returning();
        return updatedUser;
    }

    /**
     * Get user by ID (full info)
     */
    public async getUserById(userId: number) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.userId, userId));
        return user;
    }

    /**
     * Get all users (for admin/test)
     */
    public async getAllUsers() {
        const users = await db.select().from(usersTable);
        return users;
    }

    /**
     * Batch update user preferences for schedule
     * @param param - Object containing userId and preferences
     * @param userId - The ID of the user
     * @returns
     */
    public async batchUpdatePreferencesSchedule({
        userId,
        preferencesParam,
    }: {
        userId: number;
        preferencesParam: {
            studyPreferences: string[];
            preferences: {
                studyDuration: number | null;
                studyMethods: string[];
            };
            freeTime: FreeTimeSlotDays;
        };
    }) {
        const { studyPreferences, preferences, freeTime } = preferencesParam;

        const { studyDuration } = preferences;

        const [updatedUser] = await db
            .update(usersTable)
            .set({
                studyPreferences: isNilOrEmpty(studyPreferences) ? null : studyPreferences,
                preferences: preferences,
                avgStudyDuration: isNilOrEmpty(studyDuration) ? null : studyDuration!.toString(),
                freeTime: isNilOrEmpty(freeTime) ? null : freeTime,
                updatedAt: getSystemDate(),
            })
            .where(eq(usersTable.userId, userId))
            .returning();

        return updatedUser;
    }
}

export const userRepository = new UserRepository();
