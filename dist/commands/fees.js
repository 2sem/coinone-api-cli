import { Command } from 'commander';
import { marketPair, renderKeyValueTable, renderTable, toCode } from '../lib/formatters.js';
export function createFeesCommand(client, emitResult) {
    const command = new Command('fees')
        .description('Query authenticated trade fee data')
        .addHelpText('after', `\nExamples:\n  coinone fees list\n  coinone fees get --quote krw --target btc\n  coinone fees list --json\n`);
    command
        .command('list')
        .description('List trade fees for the authenticated account')
        .addHelpText('after', `\nExample:\n  coinone fees list --json\n`)
        .action(async function () {
        const response = await client.listTradeFees();
        emitResult(this, buildFeeListResult(normalizeFeeEntries(response), response));
    });
    command
        .command('get')
        .requiredOption('--quote <quoteCurrency>', 'Quote currency, for example KRW')
        .requiredOption('--target <targetCurrency>', 'Target currency, for example BTC')
        .description('Get trade fee for one market pair')
        .addHelpText('after', `\nExamples:\n  coinone fees get --quote krw --target btc\n  coinone fees get --quote usdt --target eth --json\n`)
        .action(async function (options) {
        const response = await client.getTradeFee(options.quote.toLowerCase(), options.target.toLowerCase());
        const fee = normalizeTradeFee(response, options.quote, options.target);
        emitResult(this, buildFeeGetResult(fee, response));
    });
    return command;
}
function buildFeeListResult(fees, raw) {
    return {
        data: fees,
        raw,
        renderTable: () => renderTable(fees, [
            { key: 'currency', label: 'CURRENCY' },
            { key: 'feeRate', label: 'FEE RATE' },
            { key: 'makerFeeRate', label: 'MAKER' },
            { key: 'takerFeeRate', label: 'TAKER' }
        ])
    };
}
function buildFeeGetResult(fee, raw) {
    return {
        data: fee,
        raw,
        renderTable: () => renderKeyValueTable([
            { field: 'Pair', value: fee.pair },
            { field: 'Quote currency', value: fee.quoteCurrency },
            { field: 'Target currency', value: fee.targetCurrency },
            { field: 'Fee rate', value: fee.feeRate },
            { field: 'Maker fee rate', value: fee.makerFeeRate },
            { field: 'Taker fee rate', value: fee.takerFeeRate }
        ])
    };
}
function normalizeFeeEntries(response) {
    const fees = response.fees ?? response.fee_rates;
    if (Array.isArray(fees)) {
        return fees.map((entry) => normalizeFeeEntry(entry)).filter(isDefined);
    }
    if (isRecord(fees)) {
        return Object.entries(fees)
            .map(([currency, entry]) => {
            if (isRecord(entry)) {
                return normalizeFeeEntry({ currency, ...entry });
            }
            if (typeof entry === 'string' || typeof entry === 'number') {
                return normalizeFeeEntry({ currency, fee_rate: String(entry) });
            }
            return undefined;
        })
            .filter(isDefined);
    }
    return [];
}
function normalizeFeeEntry(entry) {
    const currency = readString(entry.currency);
    if (!currency) {
        return undefined;
    }
    return {
        currency: toCode(currency),
        feeRate: readString(entry.fee_rate) ?? readString(entry.feeRate),
        makerFeeRate: readString(entry.maker_fee_rate) ?? readString(entry.makerFeeRate),
        takerFeeRate: readString(entry.taker_fee_rate) ?? readString(entry.takerFeeRate)
    };
}
function normalizeTradeFee(response, defaultQuoteCurrency, defaultTargetCurrency) {
    const nested = readTradeFeeRecord(response.fee) ?? readTradeFeeRecord(response.trade_fee) ?? {};
    const quoteCurrency = readString(response.quote_currency) ??
        readString(nested.quote_currency) ??
        defaultQuoteCurrency;
    const targetCurrency = readString(response.target_currency) ??
        readString(nested.target_currency) ??
        defaultTargetCurrency;
    return {
        pair: marketPair(targetCurrency, quoteCurrency),
        quoteCurrency: toCode(quoteCurrency),
        targetCurrency: toCode(targetCurrency),
        feeRate: readString(response.fee_rate) ?? readString(nested.fee_rate),
        makerFeeRate: readString(response.maker_fee_rate) ?? readString(nested.maker_fee_rate),
        takerFeeRate: readString(response.taker_fee_rate) ?? readString(nested.taker_fee_rate)
    };
}
function readTradeFeeRecord(value) {
    return isRecord(value) ? value : undefined;
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function isDefined(value) {
    return value !== undefined;
}
function readString(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return undefined;
}
//# sourceMappingURL=fees.js.map