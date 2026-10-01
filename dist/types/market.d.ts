import { IndexConfig } from "../types/sheets";
export interface Candle {
    open: number;
    high: number;
    low: number;
    close: number;
    timestamp: number;
}
export interface InstrumentData {
    tradingSymbol: string;
    instrumentToken: number;
    exchToken: number;
    tickSize: number;
    rank: number;
    qualify: boolean;
    gapUp: number;
}
export interface PriceData {
    prevClose: number;
    atr: number;
    tr: number[];
    openPrice: number;
    ohlc: {
        [timestamp: string]: {
            open: number;
            high: number;
            low: number;
            close: number;
        };
    };
}
export type OptionType = "CE" | "PE" | "INDEX" | "FUT";
export interface CurrentIndexQuote {
    ltp: number;
    updatedAt: string;
}
export interface IndexHourlyQuote {
    datetime: string;
    open: number;
    high: number;
    low: number;
    close: number;
}
export interface OptionQuote {
    bid: number | null;
    offer: number | null;
    ltp: number | null;
    updatedAt: string | null;
}
export interface OptionInstrument {
    id: number;
    tradingSymbol: string;
    index: string;
    type: OptionType | null;
    strikePrice: number | null;
    expiryDate: string | null;
    instrumentToken: number;
    exchangeToken: number | null;
    lotSize: number | null;
    tickSize: number | null;
    quote: OptionQuote;
    iv: number | null;
    delta: number | null;
}
export interface OptionStrike {
    strikePrice: number;
    synthFut: number | null;
    CE?: OptionInstrument;
    PE?: OptionInstrument;
}
export interface IndexMarketData {
    config: IndexConfig;
    currentIndexQuote: OptionQuote;
    hourlyQuotes: Record<string, IndexHourlyQuote>;
    optionChain: Record<string, OptionStrike>;
    optionTokens: number[];
    strikesArr: number[];
}
export interface MarketStore {
    indexes: Record<string, IndexMarketData>;
    indexByToken: Record<string, IndexMarketData>;
    instrumentByToken: Record<string, OptionInstrument>;
    allOptionTokens: number[];
}
export interface StoreIndexHourlyQuoteInput {
    index: string;
    datetime: string;
    ltp: number;
    open: number;
    high: number;
    low: number;
    close: number;
}
export interface OptionQuoteUpdate {
    instrumentToken: number;
    bid: number | null;
    offer: number | null;
    ltp: number | null;
    updatedAt: string;
}
export type updateOptionsPricesAndCalculateGreeksResult = {
    status: true | false;
    indexLtp: number | null;
    atmStrike: number | null;
    synthFut: number | null;
    synthAtmStrike: number | null;
    actualDte: number | null;
};
//# sourceMappingURL=market.d.ts.map