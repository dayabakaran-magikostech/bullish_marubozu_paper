import { config } from "dotenv";
import { KiteApiToken, KiteAccounts, RawIndexConfigRow, RawInstrumentsMasterRow } from "../types/sheets";
import { KiteQuote, KiteQuoteResponse } from "../types/kite";
import {
    IndexMarketData, OptionInstrument,
    OptionQuoteUpdate, OptionType, StoreIndexHourlyQuoteInput
} from "../types/market"; //MarketStore

export { ENV } from "./env";
export { instrumentsSheet, kiteSheet, apiAccessTokenSheet, masterSpreadsheetConfigSheet } from "./databases";
import { MarketStore } from "../model/marketStore";
import { TradeManager } from "../model/tradesManager";

const dd = new Date();

export const marketStore = new MarketStore();

export const globalStates = {
    isEntryBlock: false,
    isExitBlock: false,
    todaysDate: `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`,
    marketOpen: false,
    accountsList: [] as string[],
    accountBroker: {} as Record<string, string>,
    kiteAccounts: {} as KiteAccounts,
    kiteApiKey: '',
    kiteAccessToken: '',
    baseDelta: 0.20,
    deltaDeviationThreshold: 0.0015,
    deltaAdjustment: 0.05,
    deltaChangeFactorK: 1.0065,
    coverDeltaTarget: 0.01,
    mainProcessInterval: null as NodeJS.Timeout | null,
    lotsToTrade: 1
};

export const generalConfig = {
    mainProcessFreq: 60 * 60 * 1000, // 60 * 1000 => 1 minute // 60 * 60 * 1000 => 1 hour
    orderTagInitials: "maru"
}

export const orderTracker: Record<string, TradeManager> = {};
export const instrumentStates: Record<string, OptionInstrument> = {};