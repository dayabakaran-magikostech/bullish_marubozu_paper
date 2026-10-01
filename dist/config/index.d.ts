import { KiteAccounts } from "../types/sheets";
import { OptionInstrument } from "../types/market";
export { instrumentsSheet, kiteSheet, apiAccessTokenSheet, masterSpreadsheetConfigSheet, orderLogsSheet } from "./databases";
import { MarketStore } from "../model/marketStore";
import { TradeManager } from "../model/tradesManager";
export { ENV } from "./env";
export declare const marketStore: MarketStore;
export declare const globalStates: {
    isEntryBlock: boolean;
    isExitBlock: boolean;
    todaysDate: string;
    marketOpen: boolean;
    accountsList: string[];
    accountBroker: Record<string, string>;
    kiteAccounts: KiteAccounts;
    kiteApiKey: string;
    kiteAccessToken: string;
    baseDelta: number;
    deltaDeviationThreshold: number;
    deltaAdjustment: number;
    deltaChangeFactorK: number;
    coverDeltaTarget: number;
    candleWickThreshold: number;
    mainProcessInterval: NodeJS.Timeout | null;
    pnlLoggingInterval: NodeJS.Timeout | null;
    lotsToTrade: number;
    socket: import("socket.io-client").Socket<import("@socket.io/component-emitter").DefaultEventsMap, import("@socket.io/component-emitter").DefaultEventsMap>;
    priceEfficiency: boolean;
    volumeEfficiency: boolean;
    accountPriority: string[];
    daysPerYear: number;
    riskFreeRate: number;
};
export declare const tradeConfig: {
    graceMinutes: number;
    hardStop: number;
    trailStop: number;
    minHwmToTrail: number;
};
export declare const generalConfig: {
    mainProcessFreq: number;
    orderTagInitials: string;
    pnlLoggingFreq: number;
};
export declare const orderTracker: Record<string, TradeManager>;
export declare const instrumentStates: Record<string, OptionInstrument>;
//# sourceMappingURL=index.d.ts.map