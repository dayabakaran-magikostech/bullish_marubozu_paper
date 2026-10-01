import { ActiveTradeData } from "./types/trade";
export declare function createLogFilesOnLoggerVM(): boolean;
export declare function updateEntryDetailsOnSheet(tradedAccount: string, primaryExecutedEntryPrice: number, primaryEntryOrdersCount: number, coverExecutedEntryPrice: number, coverEntryOrdersCount: number, tag: string, entrySynthFut: number, entryPrimaryIv: number, entryCoverIv: number): Promise<boolean>;
export declare function updateExitDetailsOnSheet(tag: string, exitTime: string, primarySentExitPrice: number, primaryExecutedExitPrice: number, primaryExitOrdersCount: number, coverSentExitPrice: number, coverExecutedExitPrice: number, coverExitOrdersCount: number, postChargesPnl: number, totalCharges: number): Promise<boolean>;
export declare function logEntryOrderToDB(trade: ActiveTradeData): Promise<any>;
export declare function logPnlToDB(tradeData: any): Promise<any>;
export declare function logActiveOrdersPnl(): Promise<void>;
//# sourceMappingURL=logger.d.ts.map