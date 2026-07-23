import { ActiveTradeData, TradeDirection } from "../types/trade";
export declare class TradeManager {
    trade: ActiveTradeData | null;
    initialiizeNewTrade(orderTag: string, primaryTransaction: TradeDirection, primaryInstrumentToken: number, coverTransaction: TradeDirection, coverInstrumentToken: number, candleHighToCloseRatio: number, candleLowToOpenRatio: number, candleHighLowRatio: number): Promise<boolean>;
    storeEntryDetails(): Promise<void>;
    calcPnl(): Promise<any>;
}
//# sourceMappingURL=tradesManager.d.ts.map