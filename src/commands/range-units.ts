import { Command } from 'commander';

import type { CoinoneClient } from '../lib/client.js';
import { marketPair, renderKeyValueTable, renderTable } from '../lib/formatters.js';
import type { CommandResult, EmitResult, RangeUnitsResponse } from '../lib/types.js';

export function createRangeUnitsCommand(client: CoinoneClient, emitResult: EmitResult): Command {
  const command = new Command('range-units')
    .description('Query price range units')
    .addHelpText(
      'after',
      `\nExamples:\n  coinone range-units get btc --quote krw\n`
    );

  command
    .command('get')
    .argument('<targetCurrency>', 'Target currency symbol, for example BTC')
    .requiredOption('--quote <quoteCurrency>', 'Quote currency, for example KRW')
    .description('Get range units for one trading pair')
    .action(async function (targetCurrency: string, options: { quote: string }) {
      const response = await client.getRangeUnits(
        options.quote.toLowerCase(),
        targetCurrency.toLowerCase()
      );
      emitResult(this, buildRangeUnitsResult(options.quote, targetCurrency, response, response));
    });

  return command;
}

function buildRangeUnitsResult(
  quoteCurrency: string,
  targetCurrency: string,
  response: RangeUnitsResponse,
  raw: unknown
): CommandResult<unknown> {
  const pair = marketPair(targetCurrency, quoteCurrency);
  const units = response.range_price_units.map((item) => ({
    rangeMin: item.range_min,
    nextRangeMin: item.next_range_min,
    priceUnit: item.price_unit
  }));

  return {
    data: {
      pair,
      units
    },
    raw,
    renderTable: () => {
      const summary = renderKeyValueTable([{ field: 'Pair', value: pair }]);
      return `${summary}\n${renderTable(units, [
        { key: 'rangeMin', label: 'RANGE MIN' },
        { key: 'nextRangeMin', label: 'NEXT RANGE MIN' },
        { key: 'priceUnit', label: 'PRICE UNIT' }
      ])}`;
    }
  };
}
