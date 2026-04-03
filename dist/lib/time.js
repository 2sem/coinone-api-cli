import { CoinoneCliError } from './errors.js';
const MAX_COMPLETED_ORDER_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
export function parseTimestampInput(value, flagName) {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
        const parsed = Number(trimmed);
        if (!Number.isSafeInteger(parsed)) {
            throw new CoinoneCliError(`Invalid ${flagName} timestamp.`, {
                causeHint: `Use a UTC millisecond timestamp or ISO-8601 value for ${flagName}.`
            });
        }
        return parsed;
    }
    const parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed)) {
        throw new CoinoneCliError(`Invalid ${flagName} timestamp.`, {
            causeHint: `Use a UTC millisecond timestamp or ISO-8601 value for ${flagName}.`
        });
    }
    return parsed;
}
export function validateTimeWindow(fromValue, toValue) {
    const fromTs = parseTimestampInput(fromValue, '--from');
    const toTs = parseTimestampInput(toValue, '--to');
    if (fromTs > toTs) {
        throw new CoinoneCliError('Invalid completed order time range.', {
            causeHint: '`--from` must be less than or equal to `--to`.'
        });
    }
    if (toTs - fromTs > MAX_COMPLETED_ORDER_WINDOW_MS) {
        throw new CoinoneCliError('Invalid completed order time range.', {
            causeHint: 'Coinone completed order history supports a maximum 90 day window.'
        });
    }
    return { fromTs, toTs };
}
export function maxCompletedOrderWindowMs() {
    return MAX_COMPLETED_ORDER_WINDOW_MS;
}
//# sourceMappingURL=time.js.map