"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInstrumentPrices = updateInstrumentPrices;
exports.buildKiteQuoteUrls = buildKiteQuoteUrls;
exports.buildKiteAuthHeaders = buildKiteAuthHeaders;
exports.processMarketQuotes = processMarketQuotes;
const config_1 = require("../config");
const kiteApi_1 = require("../kiteApi");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function updateInstrumentPrices(instruments) {
    // console.log("Updating instrument prices: ", instruments);
    const urls = buildKiteQuoteUrls(instruments); //TODO: create quoteUrl only once
    const tokens = buildKiteAuthHeaders();
    const maxRetries = 3;
    const delayBetweenRetries = 1000;
    const result = {
        indexesUpdated: 0,
        optionsUpdated: 0,
        unknownTokens: [],
        failedBatches: 0
    };
    for (const url of urls) {
        let success = false;
        let retries = 0;
        while (!success && retries < maxRetries) {
            try {
                const token = tokens[retries];
                if (!token) {
                    throw new Error(`No auth token found for retry ${retries}`);
                }
                const quoteResult = await (0, kiteApi_1.getQuotes)(token, url);
                if (!quoteResult.status) {
                    throw new Error(quoteResult.message ?? "Failed to fetch quotes");
                }
                const updateResult = processMarketQuotes(quoteResult.data);
                result.indexesUpdated += updateResult.indexesUpdated;
                result.optionsUpdated += updateResult.optionsUpdated;
                result.unknownTokens.push(...updateResult.unknownTokens);
                success = true;
            }
            catch (error) {
                retries++;
                console.error(`Error fetching quotes from ${url}:`, error);
                if (retries < maxRetries) {
                    console.log(`Retrying (${retries}/${maxRetries})...`);
                    await delay(delayBetweenRetries);
                }
            }
        }
        if (!success) {
            result.failedBatches++;
        }
    }
    return result;
}
function buildKiteQuoteUrls(instruments, batchSize = 490) {
    if (!instruments.length) {
        throw new Error("[buildKiteQuoteUrls] Instrument list is empty.");
    }
    const baseUrl = "https://api.kite.trade/quote";
    const urls = [];
    for (let i = 0; i < instruments.length; i += batchSize) {
        const batch = instruments.slice(i, i + batchSize);
        const params = new URLSearchParams();
        batch.forEach(token => params.append("i", token.toString()));
        urls.push(`${baseUrl}?${params.toString()}`);
    }
    return urls;
}
function buildKiteAuthHeaders() {
    const tokens = [];
    for (const account in config_1.globalStates.kiteAccounts) {
        tokens.push(`token ${config_1.globalStates.kiteAccounts[account]?.apiKey}:${config_1.globalStates.kiteAccounts[account]?.accessToken}`);
    }
    return tokens;
}
function processMarketQuotes(quotes) {
    const result = {
        indexesUpdated: 0,
        optionsUpdated: 0,
        unknownTokens: []
    };
    for (const [responseToken, quote] of Object.entries(quotes)) {
        const instrumentToken = quote.instrument_token ?? Number(responseToken);
        const tokenKey = String(instrumentToken);
        const indexData = config_1.instrumentStates[tokenKey];
        if (indexData?.type == "INDEX") {
            updateIndexQuote(indexData, quote);
            result.indexesUpdated++;
            continue;
        }
        const optionInstrument = config_1.instrumentStates[tokenKey];
        if (optionInstrument) {
            updateOptionQuote(optionInstrument, quote);
            result.optionsUpdated++;
            continue;
        }
        result.unknownTokens.push(instrumentToken);
    }
    return result;
}
function updateIndexQuote(instrument, quote) {
    const updatedAt = quote.timestamp ?? new Date().toISOString();
    instrument.quote.ltp = quote.last_price > 0 ? quote.last_price : null;
    instrument.quote.updatedAt = updatedAt;
    if (!quote.timestamp) {
        return;
    }
    const hourlyKey = getHourlyQuoteKey(quote.timestamp);
    const index = instrument.index;
    if (!hourlyKey) {
        console.warn(`Invalid Kite timestamp: ${quote.timestamp} `);
        return;
    }
    config_1.marketStore.indexes[index].hourlyQuotes[hourlyKey] = {
        datetime: quote.timestamp,
        open: quote.ohlc.open,
        high: quote.ohlc.high,
        low: quote.ohlc.low,
        close: quote.last_price
    };
}
function getHourlyQuoteKey(timestamp) {
    const match = timestamp.match(/^\d{4}-\d{2}-\d{2} (\d{2}):(\d{2}):\d{2}$/);
    if (!match) {
        return null;
    }
    const hour = match[1];
    const minute = match[2];
    return `${hour}:${minute}`;
}
function updateOptionQuote(instrument, quote) {
    const bestBid = normalizeDepthPrice(quote.depth?.buy?.[0]?.price);
    const bestOffer = normalizeDepthPrice(quote.depth?.sell?.[0]?.price);
    instrument.quote.bid = bestBid;
    instrument.quote.offer = bestOffer;
    instrument.quote.ltp = quote.last_price > 0 ? quote.last_price : null;
    instrument.quote.updatedAt = quote.timestamp ?? new Date().toISOString();
}
function normalizeDepthPrice(price) {
    if (price === undefined || price <= 0) {
        return null;
    }
    return price;
}
//# sourceMappingURL=instrumentPricesUpdator.js.map