export interface TimeWindow {
    fromTs: number;
    toTs: number;
}
export declare function parseTimestampInput(value: string, flagName: string): number;
export declare function validateTimeWindow(fromValue: string, toValue: string): TimeWindow;
export declare function maxCompletedOrderWindowMs(): number;
