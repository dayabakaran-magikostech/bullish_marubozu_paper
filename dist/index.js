"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDecisionEngine = runDecisionEngine;
exports.getLatestHourlyIndexQuote = getLatestHourlyIndexQuote;
const helper_1 = require("./utils/helper");
const config_1 = require("./config");
const optionGreeksCalculator_1 = require("./services/optionGreeksCalculator");
const instrumentPricesUpdator_1 = require("./services/instrumentPricesUpdator");
const tradesManager_1 = require("./model/tradesManager");
const notificationsHandler_1 = require("./utils/notificationsHandler");
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
            (0, notificationsHandler_1.notificationHandler)('Failed to fetch index price, will use stored price', { module: 'runDecisionEngine', severity: 'Low' }, true);
        }
        const latestQuote = getLatestHourlyIndexQuote("NIFTY");
        if (latestQuote && (0, helper_1.isOlderThanMinutes)(latestQuote.datetime, 5)) {
            (0, notificationsHandler_1.notificationHandler)('Index ltp not available', { module: 'runDecisionEngine', severity: 'High' }, true);
            return;
        }
        const currentHigh = latestQuote?.high;
        const currentLow = latestQuote?.low;
        const currentOpen = latestQuote?.open;
        const currentClose = latestQuote?.close;
        if (!currentHigh || !currentLow) {
            (0, notificationsHandler_1.notificationHandler)('OHLC contains 0 prices', { module: 'runDecisionEngine', severity: 'High' }, true);
            return;
        }
        const { opportunityExists, targetDelta, closeFromHighRatio, openFromLowRatio, highToLowRatio } = evaluateEntrySignals(currentOpen, currentHigh, currentLow, currentClose);
        if (opportunityExists) {
            const ivCalcStatus = await updateOptionsPricesAndCalculateGreeks();
            if (!ivCalcStatus || !ivCalcStatus.synthAtmStrike) {
                (0, notificationsHandler_1.notificationHandler)('IV calc failed', { module: 'runDecisionEngine', severity: 'High' }, true);
                return; // or throw error, IV calc failed for the option chain
            }
            const primaryPutData = (0, helper_1.getNearestPutDeltaOption)("NIFTY", targetDelta, ivCalcStatus.synthAtmStrike);
            const coverPutData = (0, helper_1.getNearestPutDeltaOption)("NIFTY", config_1.globalStates.coverDeltaTarget, ivCalcStatus.synthAtmStrike);
            console.log("Put deltas: ", targetDelta, config_1.globalStates.coverDeltaTarget);
            //check if null and throw error
            const currentTimestamp = (0, helper_1.getCurrTimeStamp)(new Date());
            const orderTag = config_1.generalConfig.orderTagInitials + "-" + (0, helper_1.getOrderTagDateSuffix)(currentTimestamp);
            const newOrder = new tradesManager_1.TradeManager();
            //TODO: send put instrument data obj instead of tokens
            const initiateTradeRes = newOrder.initializeNewTrade(orderTag, "SELL", primaryPutData?.instrumentToken, "BUY", coverPutData?.instrumentToken, closeFromHighRatio, openFromLowRatio, highToLowRatio);
            if (!initiateTradeRes) {
                throw new Error(`quote error occurred while updating instrument prices`);
            }
            config_1.orderTracker[orderTag] = newOrder;
            config_1.orderTracker[orderTag].storeEntryDetails(); // do this at the time of initialization -> add this in que and send all at once
        }
        else {
            console.log("No opportunity exists");
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        (0, notificationsHandler_1.notificationHandler)("Error occurred in the main function: " + errorMessage, { module: 'runDecisionEngine', severity: 'High' }, true);
        return false;
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
    const baseDelta = config_1.globalStates.baseDelta;
    const deltaDeviationThreshold = config_1.globalStates.deltaDeviationThreshold;
    const DELTA_ADJUSTMENT = config_1.globalStates.deltaAdjustment;
    const k = config_1.globalStates.deltaChangeFactorK;
    let targetDelta = baseDelta;
    const deltaDeviation = high / low - k;
    const candleRange = high - low;
    const openFromLowRatio = Math.abs(open - low) / candleRange;
    const closeFromHighRatio = Math.abs(close - high) / candleRange;
    const highToLowRatio = high / low;
    let opportunityExists = false;
    if (closeFromHighRatio < config_1.globalStates.candleWickThreshold && openFromLowRatio < config_1.globalStates.candleWickThreshold) {
        opportunityExists = true;
        console.log("Checking delta threshold");
        if (deltaDeviation > deltaDeviationThreshold) {
            targetDelta += DELTA_ADJUSTMENT;
        }
        else if (deltaDeviation < -deltaDeviationThreshold) {
            targetDelta -= DELTA_ADJUSTMENT;
        }
    }
    // console.log("Current high: ", high, "\nCurrent low: ", low, "\nCurrent open: ", open, "\nCurrent close: ", close)
    console.log("Delta deviation threshold:", deltaDeviationThreshold, "\nDelta deviation: ", deltaDeviation, "\nOpen from low ratio: ", openFromLowRatio, "\nClose from high ratio: ", closeFromHighRatio);
    console.log("Opportunity exists: ", opportunityExists);
    const message = "Delta deviation threshold: " + deltaDeviationThreshold + "\nDelta deviation: " + deltaDeviation + "\nOpen from low ratio: " + openFromLowRatio + "\nClose from high ratio: " + closeFromHighRatio;
    (0, notificationsHandler_1.notificationHandler)(message, { module: 'evaluateEntrySignals', severity: 'Low' }, true);
    (0, notificationsHandler_1.notificationHandler)("Opportunity exists" + opportunityExists, { module: 'evaluateEntrySignals', severity: 'Low' }, true);
    return { opportunityExists, targetDelta, closeFromHighRatio, openFromLowRatio, highToLowRatio };
}
async function updateOptionsPricesAndCalculateGreeks() {
    const result = {
        status: false,
        indexLtp: 0,
        atmStrike: 0,
        synthFut: 0,
        synthAtmStrike: 0,
        actualDte: 0,
    };
    try {
        const optionsInstruments = config_1.marketStore.allOptionTokens;
        if (!optionsInstruments) {
            throw new Error("Nifty option instrument tokens not found");
        }
        const res = await (0, instrumentPricesUpdator_1.updateInstrumentPrices)(optionsInstruments);
        console.log("Option instruments updated: ", res);
        if (res.failedBatches > 0) {
            (0, notificationsHandler_1.notificationHandler)('quote error occurred while updating instrument prices', { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
            throw new Error(`quote error occurred while updating instrument prices`);
        }
        const indexData = config_1.marketStore.indexes.NIFTY; //Modify incase we add another index
        if (!indexData) {
            (0, notificationsHandler_1.notificationHandler)('IndexData is missing', { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
            throw new Error(`IndexData is missing`);
        }
        ;
        const expiryDate = indexData.config.currentWeekly;
        const indexLtp = indexData.currentIndexQuote?.ltp;
        const currentWeeklyDte = indexData.config.dte;
        const actualDte = currentWeeklyDte + (0, helper_1.getCalculatedDTE)();
        if (!indexLtp || indexLtp <= 0) {
            (0, notificationsHandler_1.notificationHandler)('Index ltp is missing', { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
            throw new Error(`Index ltp is missing`);
        }
        result.indexLtp = indexLtp;
        const atmStrike = (0, helper_1.getNearestStrike)("NIFTY", indexLtp);
        if (!atmStrike) {
            (0, notificationsHandler_1.notificationHandler)('ATM strike not found', { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
            throw new Error(`ATM strike not found`);
        }
        result.atmStrike = atmStrike;
        const atmCePrice = (0, helper_1.getOptionPrice)(indexData.optionChain[atmStrike]?.CE);
        const atmPePrice = (0, helper_1.getOptionPrice)(indexData.optionChain[atmStrike]?.PE);
        if (!atmCePrice || !atmPePrice) {
            (0, notificationsHandler_1.notificationHandler)('ATM CE / PE prices are missing', { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
            throw new Error(`ATM CE / PE prices are missing`);
        }
        ;
        const atmSynthFut = atmStrike + atmCePrice - atmPePrice;
        const synthAtmStrike = (0, helper_1.getNearestStrike)("NIFTY", atmSynthFut);
        result.synthFut = atmSynthFut;
        result.synthAtmStrike = synthAtmStrike && synthAtmStrike > 0 ? synthAtmStrike : 0;
        for (const strike of Object.values(indexData.optionChain)) {
            if (!strike.PE) {
                continue;
            }
            const putPrice = (0, helper_1.getOptionPrice)(strike.PE);
            if (putPrice == null) {
                continue;
            }
            const iv = (0, optionGreeksCalculator_1.getImpliedVolatility)(putPrice, atmSynthFut, strike.strikePrice, actualDte / config_1.globalStates.daysPerYear, "put", 0);
            const delta = (0, optionGreeksCalculator_1.getDelta)(atmSynthFut, strike.strikePrice, actualDte / config_1.globalStates.daysPerYear, iv, 0, "put");
            strike.PE.iv = iv;
            strike.PE.delta = delta;
            if (strike.strikePrice > atmSynthFut) {
                break;
            }
        }
        result.status = true;
        return result;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        (0, notificationsHandler_1.notificationHandler)(errorMessage, { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
        return result;
    }
}
//# sourceMappingURL=index.js.map