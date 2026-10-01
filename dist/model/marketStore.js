"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketStore = void 0;
const config_1 = require("../config");
const helper_1 = require("../utils/helper");
class MarketStore {
    constructor() {
        this.indexes = {};
        this.allOptionTokens = [];
    }
    initializeMarketStore(indexRows, instrumentRows) {
        this.resetMarketStore();
        this.loadIndexConfig(indexRows);
        this.loadOptionInstruments(instrumentRows);
        this.sortStrikesArr();
    }
    resetMarketStore() {
        this.indexes = {};
        this.allOptionTokens = [];
    }
    loadIndexConfig(indexRows) {
        for (const row of indexRows) {
            if (!row.active) {
                continue;
            }
            const indexName = (0, helper_1.normalizeIndexName)(row.index);
            if (this.indexes[indexName]) {
                throw new Error(`Duplicate active index found: ${indexName}`);
            }
            const indexData = {
                config: {
                    id: Number(row.id),
                    index: indexName,
                    lotSize: Number(row.lotSize),
                    tradingSymbol: row.tradingSymbol,
                    stock_code: row.stock_code,
                    instrumentToken: Number(row.instrumentToken),
                    hasWeekly: row.hasWeekly,
                    currentWeekly: (0, helper_1.normalizeDate)(row.currentWeekly),
                    active: row.active,
                    exch: row.exch,
                    exchSegment: row.exchSegment,
                    xtsExchSegment: row.xtsExchSegment,
                    marginPerLot: Number(row.marginPerLot),
                    dte: Number(row.dte)
                },
                currentIndexQuote: {
                    bid: null,
                    offer: null,
                    ltp: null,
                    updatedAt: null
                },
                hourlyQuotes: {},
                optionChain: {},
                optionTokens: [],
                strikesArr: [],
            };
            this.indexes[indexName] = indexData;
            config_1.instrumentStates[Number(row.instrumentToken)] = {
                id: Number(row.id),
                tradingSymbol: row.tradingSymbol,
                index: row.index,
                type: "INDEX",
                strikePrice: null,
                expiryDate: null,
                instrumentToken: Number(row.instrumentToken),
                exchangeToken: null,
                lotSize: Number(row.lotSize),
                tickSize: null,
                quote: indexData.currentIndexQuote,
                iv: null,
                delta: null,
            };
        }
    }
    loadOptionInstruments(instrumentRows) {
        for (const row of instrumentRows) {
            const indexName = (0, helper_1.normalizeIndexName)(row.security);
            const indexData = this.indexes[indexName];
            if (!indexData) {
                continue;
            }
            const expiryDate = (0, helper_1.normalizeDate)(row.expiry_date);
            if (expiryDate !== indexData.config.currentWeekly) {
                continue;
            }
            const optionType = (0, helper_1.normalizeOptionType)(row.type);
            const strikePrice = Number(row.strike_price);
            const instrumentToken = Number(row.instrument_token);
            if (optionType == "FUT") {
                continue;
            }
            if (Number(row.lot_size) !== indexData.config.lotSize) {
                throw new Error(`Lot size mismatch for ${row.tradingsymbol} & ${indexName}`);
            }
            const tokenKey = String(instrumentToken);
            if (config_1.instrumentStates[tokenKey]) {
                throw new Error(`Duplicate instrument token: ${instrumentToken}`);
            }
            const instrument = {
                id: Number(row.id),
                tradingSymbol: row.tradingsymbol,
                index: row.security,
                type: optionType,
                strikePrice,
                expiryDate,
                instrumentToken,
                exchangeToken: Number(row.exchange_token),
                lotSize: Number(row.lot_size),
                tickSize: Number(row.tick_size),
                quote: {
                    bid: null,
                    offer: null,
                    ltp: null,
                    updatedAt: null
                },
                iv: null,
                delta: null,
            };
            const strikeKey = String(strikePrice);
            let strike = indexData.optionChain[strikeKey];
            if (!strike) {
                strike = { strikePrice, synthFut: null };
                indexData.optionChain[strikeKey] = strike;
            }
            if (optionType === "CE") {
                if (strike.CE) {
                    throw new Error(`Duplicate CE found for ${indexName} ${strikePrice}`);
                }
                strike.CE = instrument;
            }
            else {
                if (strike.PE) {
                    throw new Error(`Duplicate PE found for ${indexName} ${strikePrice}`);
                }
                strike.PE = instrument;
            }
            indexData.optionTokens.push(instrumentToken);
            config_1.instrumentStates[Number(instrumentToken)] = instrument;
            this.allOptionTokens.push(instrumentToken);
            if (!indexData.strikesArr.includes(strikePrice)) {
                indexData.strikesArr.push(strikePrice);
            }
        }
    }
    sortStrikesArr() {
        for (const indexData of Object.values(this.indexes)) {
            indexData.strikesArr = [...new Set(indexData.strikesArr)].sort((a, b) => a - b);
            indexData.optionChain = Object.fromEntries(Object.entries(indexData.optionChain).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)));
        }
    }
}
exports.MarketStore = MarketStore;
//# sourceMappingURL=marketStore.js.map