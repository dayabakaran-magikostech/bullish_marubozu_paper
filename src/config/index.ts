import { config } from "dotenv";
import { KiteApiToken, KiteAccounts, RawIndexConfigRow, RawInstrumentsMasterRow } from "../types/sheets";
import { KiteQuote, KiteQuoteResponse } from "../types/kite";
import {
    IndexMarketData, OptionInstrument,
    OptionQuoteUpdate, OptionType, StoreIndexHourlyQuoteInput
} from "../types/market"; //MarketStore

export { instrumentsSheet, kiteSheet, apiAccessTokenSheet, masterSpreadsheetConfigSheet, orderLogsSheet } from "./databases";
import { MarketStore } from "../model/marketStore";
import { TradeManager } from "../model/tradesManager";
import { io } from 'socket.io-client';
import { ENV } from "./env";
export { ENV } from "./env";

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
    candleWickThreshold: 0.3, // 0.3
    mainProcessInterval: null as NodeJS.Timeout | null,
    pnlLoggingInterval: null as NodeJS.Timeout | null,
    lotsToTrade: 5,
    socket: io(ENV.loggerVmUrl),
    priceEfficiency: true,
    volumeEfficiency: true,
    accountPriority: ["TB1700", "PH8020", "YG2337", "IZH364"],
    daysPerYear: 249,
    riskFreeRate: 0.0,
};

export const tradeConfig = {
    graceMinutes: 60,
    hardStop: 30,
    trailStop: 40,
    minHwmToTrail: 0
}

export const generalConfig = {
    mainProcessFreq: 60 * 60 * 1000, // 60 * 1000 => 1 minute // 60 * 60 * 1000 => 1 hour
    orderTagInitials: "mabu",
    pnlLoggingFreq: 60 * 1000, // 60 * 1000 => 1 minute
}

export const orderTracker: Record<string, TradeManager> = {};
export const instrumentStates: Record<string, OptionInstrument> = {};