/**
 * Availability Helper Functions
 * Contains utility functions for time slot generation and time conversions
 */

export class AvailabilityHelper {
    /**
     * Generate time slots automatically based on opening/closing times and duration
     */
    static generateTimeSlots(openingTime: string, closingTime: string, durationMinutes: number, availabilityId: string) {
        const timeSlots = [];

        try {
            // Convert time strings to minutes since midnight
            const openingMinutes = AvailabilityHelper.timeStringToMinutes(openingTime);
            const closingMinutes = AvailabilityHelper.timeStringToMinutes(closingTime);

            if (openingMinutes >= closingMinutes) {
                return timeSlots; // Invalid time range
            }

            // Generate slots
            for (let start = openingMinutes; start < closingMinutes; start += durationMinutes) {
                const end = Math.min(start + durationMinutes, closingMinutes);

                timeSlots.push({
                    start_time: AvailabilityHelper.minutesToTimeString(start),
                    end_time: AvailabilityHelper.minutesToTimeString(end),
                    availability_id: availabilityId,
                    capacity: 1, // Default capacity
                    is_blocked: false,
                });
            }
        } catch (error) {
            console.error('Error generating time slots:', error);
        }

        return timeSlots;
    }

    /**
     * Convert time string to minutes since midnight
     * @param timeString - Time string in format "HH:MM AM/PM" (e.g., "08:00 AM")
     * @returns Minutes since midnight
     */
    static timeStringToMinutes(timeString: string): number {
        const time = new Date(`2000-01-01 ${timeString}`);
        return time.getHours() * 60 + time.getMinutes();
    }

    /**
     * Convert minutes to time string
     * @param minutes - Minutes since midnight
     * @returns Time string in format "HH:MM AM/PM"
     */
    static minutesToTimeString(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
    }

    /**
     * Convert day name to DayOfWeek enum format
     * @param dayName - Full day name (e.g., "MONDAY")
     * @returns DayOfWeek enum value (e.g., DayOfWeek.MONDAY)
     */
    static convertDayNameToEnum(dayName: string): any {
        switch (dayName.toUpperCase()) {
            case 'SUNDAY': return 'SUNDAY';
            case 'MONDAY': return 'MONDAY';
            case 'TUESDAY': return 'TUESDAY';
            case 'WEDNESDAY': return 'WEDNESDAY';
            case 'THURSDAY': return 'THURSDAY';
            case 'FRIDAY': return 'FRIDAY';
            case 'SATURDAY': return 'SATURDAY';
            default: throw new Error(`Invalid day name: ${dayName}`);
        }
    }

    /**
     * Convert DayOfWeek enum value to day name
     * @param dayEnum - DayOfWeek enum value (e.g., 2)
     * @returns Full day name (e.g., "MONDAY")
     */
    static convertEnumToDayName(dayEnum: number): string {
        switch (dayEnum) {
            case 1: return 'SUNDAY';
            case 2: return 'MONDAY';
            case 3: return 'TUESDAY';
            case 4: return 'WEDNESDAY';
            case 5: return 'THURSDAY';
            case 6: return 'FRIDAY';
            case 7: return 'SATURDAY';
            default: throw new Error(`Invalid day enum: ${dayEnum}`);
        }
    }

    /**
     * Format date for Prisma with proper timezone handling
     * @param dateInput - Date input (string or Date)
     * @returns Formatted date string
     */
    static formatDateForPrisma(dateInput: string | Date): string {
        try {
            if (typeof dateInput === 'string') {
                // If it's already a valid ISO string, return as is
                if (dateInput.includes('T') || dateInput.includes('Z')) {
                    return dateInput;
                }
                // If it's just a date string (e.g., '2024-01-01'), convert to full ISO string
                return new Date(dateInput).toISOString();
            }
            return dateInput.toISOString();
        } catch (error) {
            throw new Error(`Invalid date format: ${dateInput}`);
        }
    }

    /**
     * Get day name from date
     * @param date - Date object or string
     * @returns Day name (e.g., "Monday")
     */
    static getDayNameFromDate(date: Date | string): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    }

    /**
     * Validate time range
     * @param openingTime - Opening time string
     * @param closingTime - Closing time string
     * @returns True if valid time range
     */
    static validateTimeRange(openingTime: string, closingTime: string): boolean {
        try {
            const openingMinutes = AvailabilityHelper.timeStringToMinutes(openingTime);
            const closingMinutes = AvailabilityHelper.timeStringToMinutes(closingTime);
            return openingMinutes < closingMinutes;
        } catch (error) {
            return false;
        }
    }

    /**
     * Calculate total slots for a time range
     * @param openingTime - Opening time string
     * @param closingTime - Closing time string
     * @param durationMinutes - Duration of each slot
     * @returns Number of slots that can fit in the time range
     */
    static calculateTotalSlots(openingTime: string, closingTime: string, durationMinutes: number): number {
        try {
            const openingMinutes = AvailabilityHelper.timeStringToMinutes(openingTime);
            const closingMinutes = AvailabilityHelper.timeStringToMinutes(closingTime);

            if (openingMinutes >= closingMinutes) {
                return 0;
            }

            const totalMinutes = closingMinutes - openingMinutes;
            return Math.floor(totalMinutes / durationMinutes);
        } catch (error) {
            return 0;
        }
    }
}
