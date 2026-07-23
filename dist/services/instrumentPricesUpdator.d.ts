import { KiteQuoteResponse, UpdateInstrumentPricesResult } from "../types/kite";
export declare function updateInstrumentPrices(instruments: number[]): Promise<UpdateInstrumentPricesResult>;
export declare function buildKiteQuoteUrls(instruments: number[], batchSize?: number): string[];
export declare function buildKiteAuthHeaders(): string[];
export interface MarketQuoteUpdateResult {
    indexesUpdated: number;
    optionsUpdated: number;
    unknownTokens: number[];
}
export declare function processMarketQuotes(quotes: KiteQuoteResponse): MarketQuoteUpdateResult;
//# sourceMappingURL=instrumentPricesUpdator.d.ts.map