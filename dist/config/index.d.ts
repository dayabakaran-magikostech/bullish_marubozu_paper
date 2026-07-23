import { KiteAccounts } from "../types/sheets";
import { OptionInstrument } from "../types/market";
export { ENV } from "./env";
export { instrumentsSheet, kiteSheet, apiAccessTokenSheet, masterSpreadsheetConfigSheet } from "./databases";
import { MarketStore } from "../model/marketStore";
import { TradeManager } from "../model/tradesManager";
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
    mainProcessInterval: NodeJS.Timeout | null;
    lotsToTrade: number;
};
export declare const generalConfig: {
    mainProcessFreq: number;
    orderTagInitials: string;
};
export declare const orderTracker: Record<string, TradeManager>;
export declare const instrumentStates: Record<string, OptionInstrument>;
//# sourceMappingURL=index.d.ts.map