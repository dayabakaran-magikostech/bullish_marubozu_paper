import { OrderHandlerResponseData } from "../types/orderHandler";
import { ActiveTradeData, OrderObj, PositionAction, TradeDirection } from "../types/trade";
export declare class TradeManager {
    trade: ActiveTradeData | null;
    initializeNewTrade(orderTag: string, primaryTransaction: TradeDirection, primaryInstrumentToken: number, coverTransaction: TradeDirection, coverInstrumentToken: number, candleHighToCloseRatio: number, candleLowToOpenRatio: number, candleHighLowRatio: number): Promise<boolean>;
    storeEntryDetails(): Promise<void>;
    calcPnl(): false | {
        orderTag: string;
        dateime: string;
        entryTime: string;
        qty: number;
        primaryTradingSymbol: string;
        primaryEntryPrice: number;
        primaryCurrentPrice: number;
        coverTradingSymbol: string;
        coverEntryPrice: number;
        coverCurrentPrice: number;
        primaryPreChargesPnl: number;
        coverPreChargesPnl: number;
        primaryCharges: number;
        coverCharges: number;
        totalPnl: number;
    } | undefined;
    createOrderReqObj(position: PositionAction): OrderObj | undefined;
    onOrderCompletion(resoponseData: OrderHandlerResponseData): Promise<boolean>;
    private getPlacedOrderDetails;
    private initiateTrade;
    exitTrade(): boolean;
    loadTradeFromDb(stored: any): boolean;
    private toOptionalNumber;
    private toBoolean;
}
export declare function calculateTheoreticalTheta(orderTag: string): number;
//# sourceMappingURL=tradesManager.d.ts.map