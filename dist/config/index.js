"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentStates = exports.orderTracker = exports.generalConfig = exports.tradeConfig = exports.globalStates = exports.marketStore = exports.ENV = exports.orderLogsSheet = exports.masterSpreadsheetConfigSheet = exports.apiAccessTokenSheet = exports.kiteSheet = exports.instrumentsSheet = void 0;
var databases_1 = require("./databases");
Object.defineProperty(exports, "instrumentsSheet", { enumerable: true, get: function () { return databases_1.instrumentsSheet; } });
Object.defineProperty(exports, "kiteSheet", { enumerable: true, get: function () { return databases_1.kiteSheet; } });
Object.defineProperty(exports, "apiAccessTokenSheet", { enumerable: true, get: function () { return databases_1.apiAccessTokenSheet; } });
Object.defineProperty(exports, "masterSpreadsheetConfigSheet", { enumerable: true, get: function () { return databases_1.masterSpreadsheetConfigSheet; } });
Object.defineProperty(exports, "orderLogsSheet", { enumerable: true, get: function () { return databases_1.orderLogsSheet; } });
const marketStore_1 = require("../model/marketStore");
const socket_io_client_1 = require("socket.io-client");
const env_1 = require("./env");
var env_2 = require("./env");
Object.defineProperty(exports, "ENV", { enumerable: true, get: function () { return env_2.ENV; } });
const dd = new Date();
exports.marketStore = new marketStore_1.MarketStore();
exports.globalStates = {
    isEntryBlock: false,
    isExitBlock: false,
    todaysDate: `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`,
    marketOpen: false,
    accountsList: [],
    accountBroker: {},
    kiteAccounts: {},
    kiteApiKey: '',
    kiteAccessToken: '',
    baseDelta: 0.20,
    deltaDeviationThreshold: 0.0015,
    deltaAdjustment: 0.05,
    deltaChangeFactorK: 1.0065,
    coverDeltaTarget: 0.01,
    candleWickThreshold: 0.3, // 0.3
    mainProcessInterval: null,
    pnlLoggingInterval: null,
    lotsToTrade: 5,
    socket: (0, socket_io_client_1.io)(env_1.ENV.loggerVmUrl),
    priceEfficiency: true,
    volumeEfficiency: true,
    accountPriority: ["TB1700", "PH8020", "YG2337", "IZH364"],
    daysPerYear: 249,
    riskFreeRate: 0.0,
};
exports.tradeConfig = {
    graceMinutes: 60,
    hardStop: 30,
    trailStop: 40,
    minHwmToTrail: 0
};
exports.generalConfig = {
    mainProcessFreq: 60 * 60 * 1000, // 60 * 1000 => 1 minute // 60 * 60 * 1000 => 1 hour
    orderTagInitials: "mabu",
    pnlLoggingFreq: 60 * 1000, // 60 * 1000 => 1 minute
};
exports.orderTracker = {};
exports.instrumentStates = {};
//# sourceMappingURL=index.js.map