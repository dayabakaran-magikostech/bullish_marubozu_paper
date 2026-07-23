"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentStates = exports.orderTracker = exports.generalConfig = exports.globalStates = exports.marketStore = exports.masterSpreadsheetConfigSheet = exports.apiAccessTokenSheet = exports.kiteSheet = exports.instrumentsSheet = exports.ENV = void 0;
var env_1 = require("./env");
Object.defineProperty(exports, "ENV", { enumerable: true, get: function () { return env_1.ENV; } });
var databases_1 = require("./databases");
Object.defineProperty(exports, "instrumentsSheet", { enumerable: true, get: function () { return databases_1.instrumentsSheet; } });
Object.defineProperty(exports, "kiteSheet", { enumerable: true, get: function () { return databases_1.kiteSheet; } });
Object.defineProperty(exports, "apiAccessTokenSheet", { enumerable: true, get: function () { return databases_1.apiAccessTokenSheet; } });
Object.defineProperty(exports, "masterSpreadsheetConfigSheet", { enumerable: true, get: function () { return databases_1.masterSpreadsheetConfigSheet; } });
const marketStore_1 = require("../model/marketStore");
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
    mainProcessInterval: null,
    lotsToTrade: 1
};
exports.generalConfig = {
    mainProcessFreq: 60 * 60 * 1000, // 60 * 1000 => 1 minute // 60 * 60 * 1000 => 1 hour
    orderTagInitials: "maru"
};
exports.orderTracker = {};
exports.instrumentStates = {};
//# sourceMappingURL=index.js.map