import { OptionInstrument } from "./market";
export type OrderStatus = "entrySent" | "entered" | "exitSent" | "exited";
export type TradeDirection = "BUY" | "SELL";
export type PositionAction = 'ENTRY' | 'EXIT';
export type OptType = 'CE' | 'PE';
export interface TradeData {
    sentEntryPrice?: number;
    executedEntryPrice?: number;
    sentExitPrice?: number;
    executedExitPrice?: number;
    entryOrdersCount?: number;
    exitOrdersCount?: number;
    instrumentData: OptionInstrument;
    entryDelta?: number;
    entryTransaction: TradeDirection;
    reqMargin?: number;
    qty?: number;
    ordersCount?: number;
    charges?: number;
    npfPoints?: number;
    postChargesNpf?: number;
}
export interface ActiveTradeData {
    orderTag: string;
    entryTime: string;
    exitTime: string;
    index: string;
    account: string;
    expiry: string;
    active: boolean;
    orderStatus: OrderStatus;
    primaryOrderData: Partial<TradeData>;
    coverOrderData: Partial<TradeData>;
    totalCharges?: number;
    postChargesPnl?: number;
    candleHighToCloseRatio: number;
    candleLowToOpenRatio: number;
    candleHighLowRatio: number;
}
//# sourceMappingURL=trade.d.ts.map