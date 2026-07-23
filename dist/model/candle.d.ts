import { PriceData } from "../types/market";
export declare class CandleManager {
    private currentCandle;
    private priceData;
    private symbol;
    private timeLost;
    constructor(symbol: string, priceData: PriceData);
    getSymbol(): string;
    private startNewCandle;
    private formatIST;
}
//# sourceMappingURL=candle.d.ts.map