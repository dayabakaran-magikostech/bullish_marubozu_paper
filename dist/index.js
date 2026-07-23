"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDecisionEngine = runDecisionEngine;
exports.getLatestHourlyIndexQuote = getLatestHourlyIndexQuote;
const helper_1 = require("./utils/helper");
const config_1 = require("./config");
const optionGreeksCalculator_1 = require("./services/optionGreeksCalculator");
const instrumentPricesUpdator_1 = require("./services/instrumentPricesUpdator");
const tradesManager_1 = require("./model/tradesManager");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function runDecisionEngine() {
    try {
        const niftyInstrumentToken = config_1.marketStore.indexes.NIFTY?.config.instrumentToken;
        if (!niftyInstrumentToken) {
            throw new Error("Nifty instrument token not found");
        }
        const updateInstrumentRes = await (0, instrumentPricesUpdator_1.updateInstrumentPrices)([niftyInstrumentToken]);
        if (updateInstrumentRes.failedBatches > 0) {
            console.log("Failed to update instrument prices");
            return;
        }
        const latestQuote = getLatestHourlyIndexQuote("NIFTY");
        if (latestQuote && (0, helper_1.isOlderThanMinutes)(latestQuote.datetime, 5)) {
            console.log("Dont have latest index quote");
            return;
        }
        const currentHigh = latestQuote?.high;
        const currentLow = latestQuote?.low;
        const currentOpen = latestQuote?.open;
        const currentClose = latestQuote?.close;
        if (!currentHigh || !currentLow) {
            console.log("Dont have latest index quote"); // chanhge msg 0 OHLC
            return;
        }
        //TODO: send latestQuote to the evaluateEntrySignals function
        const { opportunityExists, targetDelta, closeFromHighRatio, openFromLowRatio, highToLowRatio } = evaluateEntrySignals(currentOpen, currentHigh, currentLow, currentClose);
        if (opportunityExists) {
            const ivCalcStatus = await updateOptionsPricesAndCalculateGreeks();
            if (!ivCalcStatus) {
                console.log("IV calc failed");
                return; // or throw error, IV calc failed for the option chain
            }
            const primaryPutData = (0, helper_1.getNearestPutDeltaOption)("NIFTY", targetDelta); //TODO: getTradableOptions -> calc iv, and get primary and cover delta options
            const coverPutData = (0, helper_1.getNearestPutDeltaOption)("NIFTY", config_1.globalStates.coverDeltaTarget);
            const currentTimestamp = (0, helper_1.getCurrTimeStamp)(new Date());
            const orderTag = config_1.generalConfig.orderTagInitials + "-" + (0, helper_1.getOrderTagDateSuffix)(currentTimestamp);
            const newOrder = new tradesManager_1.TradeManager();
            const initiateTradeRes = newOrder.initialiizeNewTrade(orderTag, "SELL", primaryPutData?.instrumentToken, "BUY", coverPutData?.instrumentToken, closeFromHighRatio, openFromLowRatio, highToLowRatio);
            // orderTracker[orderTag] = new TradeManager();
            // const initiateTradeRes = orderTracker[orderTag].initialiizeNewTrade(orderTag, "BUY", primaryPutData?.instrumentToken!, "SELL", coverPutData?.instrumentToken!, closeFromHighRatio, openFromLowRatio, highToLowRatio);
            if (!initiateTradeRes) {
                return false;
                // throw error and ping
            }
            config_1.orderTracker[orderTag] = newOrder;
            console.log("Initiate trade response: ", initiateTradeRes);
            console.dir(config_1.orderTracker[orderTag], { depth: null });
            config_1.orderTracker[orderTag].storeEntryDetails(); // do this at the time of initialization -> add this in que and send all at once
            //TODO: at entry if error send ping
        }
        else {
            console.log("No opportunity exists");
        }
    }
    catch (error) {
        console.log("Error occurred in the main function: ", error);
    }
}
function getLatestHourlyIndexQuote(index) {
    const indexData = config_1.marketStore.indexes[index.trim().toUpperCase()];
    if (!indexData) {
        return null;
    }
    const hourlyQuotes = indexData.hourlyQuotes;
    const keys = Object.keys(hourlyQuotes);
    if (keys.length === 0) {
        return null;
    }
    const sortedKeys = keys.sort();
    const latestKey = sortedKeys[sortedKeys.length - 1];
    if (!latestKey) {
        return null;
    }
    return hourlyQuotes[latestKey] ?? null;
}
function evaluateEntrySignals(open, high, low, close) {
    const baseDelta = config_1.globalStates.baseDelta; // TODO: set as constant in ENV
    const deltaDeviationThreshold = config_1.globalStates.deltaDeviationThreshold; // TODO: set as constant in ENV
    const DELTA_ADJUSTMENT = config_1.globalStates.deltaAdjustment; // TODO: set as constant in ENV
    const k = config_1.globalStates.deltaChangeFactorK; // TODO: set as constant in ENV
    let targetDelta = baseDelta;
    const deltaDeviation = high / low - k;
    const candleRange = high - low;
    const openFromLowRatio = Math.abs(open - low) / candleRange;
    const closeFromHighRatio = Math.abs(open - high) / candleRange;
    const highToLowRatio = high / low;
    let opportunityExists = false;
    if (closeFromHighRatio < 0.30 && openFromLowRatio < 0.30) {
        opportunityExists = true;
        console.log("Checking delta threshold");
        if (deltaDeviation > deltaDeviationThreshold) {
            targetDelta += DELTA_ADJUSTMENT;
        }
        else if (deltaDeviation < -deltaDeviationThreshold) {
            targetDelta -= DELTA_ADJUSTMENT;
        }
    }
    //TODO: check early return
    // console.log("Current high: ", high, "\nCurrent low: ", low, "\nCurrent open: ", open, "\nCurrent close: ", close)
    console.log("Delta deviation threshold:", deltaDeviationThreshold, "\nDelta deviation: ", deltaDeviation, "\nOpen from low ratio: ", openFromLowRatio, "\nClose from low ratio: ", closeFromHighRatio);
    console.log("Opportunity exists: ", opportunityExists);
    return { opportunityExists, targetDelta, closeFromHighRatio, openFromLowRatio, highToLowRatio };
}
async function updateOptionsPricesAndCalculateGreeks() {
    //TODO: every return false should ping the errors
    const optionsInstruments = config_1.marketStore.allOptionTokens;
    if (!optionsInstruments) {
        throw new Error("Nifty option instrument tokens not found");
    }
    const res = await (0, instrumentPricesUpdator_1.updateInstrumentPrices)(optionsInstruments);
    //TODO: check res
    // console.log("Option instruments updated: ", res);
    const indexData = config_1.marketStore.indexes.NIFTY;
    if (!indexData)
        return false;
    const expiryDate = indexData.config.currentWeekly;
    const indexLtp = indexData.currentIndexQuote?.ltp;
    const currentWeeklyDte = indexData.config.dte;
    const actualDte = currentWeeklyDte + (0, helper_1.getCalculatedDTE)();
    if (!indexLtp || indexLtp <= 0)
        return false; //TODO: throw error and send notification - add try catch block
    const atmStrike = (0, helper_1.getNearestStrike)("NIFTY", indexLtp);
    if (!atmStrike)
        return false;
    const atmCePrice = (0, helper_1.getOptionPrice)(indexData.optionChain[atmStrike]?.CE);
    const atmPePrice = (0, helper_1.getOptionPrice)(indexData.optionChain[atmStrike]?.PE);
    if (!atmCePrice || !atmPePrice)
        return false;
    const atmSynthFut = atmStrike + atmCePrice - atmPePrice;
    for (const strike of Object.values(indexData.optionChain)) {
        const synthFut = (0, helper_1.calculateStrikeSynthFut)(strike); //TODO: delete synthFut, and calc iv only for otm put options
        strike.synthFut = synthFut;
        if (synthFut == null || !strike.PE) {
            continue;
        }
        const putPrice = (0, helper_1.getOptionPrice)(strike.PE);
        if (putPrice == null) {
            continue;
        }
        const iv = (0, optionGreeksCalculator_1.getImpliedVolatility)(putPrice, atmSynthFut, strike.strikePrice, actualDte / 249, "put", 0);
        const delta = (0, optionGreeksCalculator_1.getDelta)(atmSynthFut, strike.strikePrice, actualDte / 249, iv, 0, "put");
        strike.PE.iv = iv;
        strike.PE.delta = delta;
    }
    return true;
}
//# sourceMappingURL=index.js.map