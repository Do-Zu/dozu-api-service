export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface FreeTimeData {
  freeTimeSlots: TimeSlot[];
}

export interface FreeTimeSlotDays {
  [day: string]: TimeSlot[];
}
