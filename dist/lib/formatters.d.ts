export declare function toCode(value: string): string;
export declare function marketPair(targetCurrency: string, quoteCurrency: string): string;
export declare function tradeStatusLabel(status: number): string;
export declare function maintenanceStatusLabel(status: number): string;
export declare function sideLabel(isSellerMaker: boolean): string;
export declare function formatTimestamp(timestamp: number): string;
export declare function renderTable<TRow extends object>(rows: TRow[], columns: Array<{
    key: string;
    label: string;
}>): string;
export declare function renderKeyValueTable(entries: Array<{
    field: string;
    value: unknown;
}>): string;
