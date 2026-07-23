export interface KiteMarketDepthItem {
    price: number;
    quantity: number;
    orders: number;
}
export interface KiteMarketDepth {
    buy: KiteMarketDepthItem[];
    sell: KiteMarketDepthItem[];
}
export interface KiteQuoteOHLC {
    open: number;
    high: number;
    low: number;
    close: number;
}
export interface KiteQuote {
    instrument_token: number;
    timestamp: string | null;
    last_trade_time: string | null;
    last_price: number;
    last_quantity: number | null;
    buy_quantity: number | null;
    sell_quantity: number | null;
    volume: number | null;
    average_price: number | null;
    oi: number | null;
    oi_day_high: number | null;
    oi_day_low: number | null;
    net_change: number;
    lower_circuit_limit: number | null;
    upper_circuit_limit: number | null;
    ohlc: KiteQuoteOHLC;
    depth: KiteMarketDepth | null;
}
export type KiteQuoteResponse = Record<string, KiteQuote>;
export interface KiteApiSuccessResponse {
    status: "success";
    data: KiteQuoteResponse;
}
export interface KiteApiErrorResponse {
    status: "error";
    message?: string;
    error_type?: string;
}
export type KiteApiResponse = KiteApiSuccessResponse | KiteApiErrorResponse;
export type GetQuotesResult = {
    status: true;
    data: KiteQuoteResponse;
} | {
    status: false;
    error?: unknown;
    message?: string;
};
export interface UpdateInstrumentPricesResult {
    indexesUpdated: number;
    optionsUpdated: number;
    unknownTokens: number[];
    failedBatches: number;
}
//# sourceMappingURL=kite.d.ts.map