import { buildKiteAuthHeaders, buildKiteQuoteUrls, calculateStrikeSynthFut, getCalculatedDTE, getCurrTimeStamp, getNearestPutDeltaOption, getNearestStrike, getOptionPrice, getOrderTagDateSuffix, isOlderThanMinutes } from "./utils/helper";
import { KiteQuote, KiteQuoteResponse, UpdateInstrumentPricesResult } from "./types/kite";
import { getQuotes } from "./kiteApi"
import { marketStore, globalStates, generalConfig, orderTracker } from "./config";
import { IndexHourlyQuote, OptionStrike, OptionInstrument, updateOptionsPricesAndCalculateGreeksResult } from "./types/market";
import { getDelta, getImpliedVolatility } from "./services/optionGreeksCalculator";
import { processMarketQuotes, updateInstrumentPrices } from "./services/instrumentPricesUpdator";
import { TradeManager } from "./model/tradesManager";
import { logEntryOrderToDB } from "./logger";
import { notificationHandler } from "./utils/notificationsHandler";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


export async function runDecisionEngine(): Promise<any> {
	try {

		const niftyInstrumentToken = marketStore.indexes.NIFTY?.config.instrumentToken;
		if (!niftyInstrumentToken) { throw new Error("Nifty instrument token not found"); }
		const updateInstrumentRes = await updateInstrumentPrices([niftyInstrumentToken]);
		if (updateInstrumentRes.failedBatches > 0) {
			notificationHandler('Failed to fetch index price, will use stored price', { module: 'runDecisionEngine', severity: 'Low' }, true);
		}

		const latestQuote = getLatestHourlyIndexQuote("NIFTY");
		if (latestQuote && isOlderThanMinutes(latestQuote.datetime, 5)) {
			notificationHandler('Index ltp not available', { module: 'runDecisionEngine', severity: 'High' }, true);
			return;
		}

		const currentHigh = latestQuote?.high;
		const currentLow = latestQuote?.low;
		const currentOpen = latestQuote?.open;
		const currentClose = latestQuote?.close;

		if (!currentHigh || !currentLow) {
			notificationHandler('OHLC contains 0 prices', { module: 'runDecisionEngine', severity: 'High' }, true);
			return;
		}

		const { opportunityExists, targetDelta, closeFromHighRatio, openFromLowRatio, highToLowRatio } = evaluateEntrySignals(currentOpen!, currentHigh, currentLow, currentClose!);


		if (opportunityExists) {
			const ivCalcStatus = await updateOptionsPricesAndCalculateGreeks();
			if (!ivCalcStatus || !ivCalcStatus.synthAtmStrike) {
				notificationHandler('IV calc failed', { module: 'runDecisionEngine', severity: 'High' }, true);
				return; // or throw error, IV calc failed for the option chain
			}
			const primaryPutData = getNearestPutDeltaOption("NIFTY", targetDelta, ivCalcStatus.synthAtmStrike);
			const coverPutData = getNearestPutDeltaOption("NIFTY", globalStates.coverDeltaTarget, ivCalcStatus.synthAtmStrike);

			console.log("Put deltas: ", targetDelta, globalStates.coverDeltaTarget);

			//check if null and throw error

			const currentTimestamp = getCurrTimeStamp(new Date());
			const orderTag = generalConfig.orderTagInitials + "-" + getOrderTagDateSuffix(currentTimestamp);
			const newOrder = new TradeManager();

			//TODO: send put instrument data obj instead of tokens
			const initiateTradeRes = newOrder.initializeNewTrade(orderTag, "SELL", primaryPutData?.instrumentToken!, "BUY", coverPutData?.instrumentToken!, closeFromHighRatio, openFromLowRatio, highToLowRatio);

			if (!initiateTradeRes) {
				throw new Error(`quote error occurred while updating instrument prices`);
			}
			orderTracker[orderTag] = newOrder;
			orderTracker[orderTag].storeEntryDetails(); // do this at the time of initialization -> add this in que and send all at once
		}
		else {
			console.log("No opportunity exists");
		}
	}
	catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		notificationHandler("Error occurred in the main function: " + errorMessage, { module: 'runDecisionEngine', severity: 'High' }, true);
		return false;
	}
}

export function getLatestHourlyIndexQuote(index: string): IndexHourlyQuote | null {
	const indexData = marketStore.indexes[index.trim().toUpperCase()];
	if (!indexData) { return null; }
	const hourlyQuotes = indexData.hourlyQuotes;
	const keys = Object.keys(hourlyQuotes);
	if (keys.length === 0) { return null; }
	const sortedKeys = keys.sort();
	const latestKey = sortedKeys[sortedKeys.length - 1];
	if (!latestKey) { return null; }
	return hourlyQuotes[latestKey] ?? null;
}

function evaluateEntrySignals(open: number, high: number, low: number, close: number): { opportunityExists: boolean; targetDelta: number, closeFromHighRatio: number, openFromLowRatio: number, highToLowRatio: number } {

	const baseDelta = globalStates.baseDelta;
	const deltaDeviationThreshold = globalStates.deltaDeviationThreshold;
	const DELTA_ADJUSTMENT = globalStates.deltaAdjustment;
	const k = globalStates.deltaChangeFactorK;
	let targetDelta = baseDelta;

	const deltaDeviation = high / low - k;
	const candleRange = high - low;
	const openFromLowRatio = Math.abs(open! - low) / candleRange;
	const closeFromHighRatio = Math.abs(close! - high) / candleRange;
	const highToLowRatio = high / low;

	let opportunityExists = false;
	if (closeFromHighRatio < globalStates.candleWickThreshold && openFromLowRatio < globalStates.candleWickThreshold) {
		opportunityExists = true;
		console.log("Checking delta threshold");
		if (deltaDeviation > deltaDeviationThreshold) {
			targetDelta += DELTA_ADJUSTMENT;
		} else if (deltaDeviation < -deltaDeviationThreshold) {
			targetDelta -= DELTA_ADJUSTMENT;
		}
	}

	// console.log("Current high: ", high, "\nCurrent low: ", low, "\nCurrent open: ", open, "\nCurrent close: ", close)
	console.log("Delta deviation threshold:", deltaDeviationThreshold, "\nDelta deviation: ", deltaDeviation, "\nOpen from low ratio: ", openFromLowRatio, "\nClose from high ratio: ", closeFromHighRatio);
	console.log("Opportunity exists: ", opportunityExists);
	const message = "Delta deviation threshold: " + deltaDeviationThreshold + "\nDelta deviation: " + deltaDeviation + "\nOpen from low ratio: " + openFromLowRatio + "\nClose from high ratio: " + closeFromHighRatio;
	notificationHandler(message, { module: 'evaluateEntrySignals', severity: 'Low' }, true);
	notificationHandler("Opportunity exists" + opportunityExists, { module: 'evaluateEntrySignals', severity: 'Low' }, true);
	return { opportunityExists, targetDelta, closeFromHighRatio, openFromLowRatio, highToLowRatio };
}

async function updateOptionsPricesAndCalculateGreeks(): Promise<updateOptionsPricesAndCalculateGreeksResult> {
	const result = {
		status: false,
		indexLtp: 0,
		atmStrike: 0,
		synthFut: 0,
		synthAtmStrike: 0,
		actualDte: 0,
	}

	try {
		const optionsInstruments = marketStore.allOptionTokens;
		if (!optionsInstruments) { throw new Error("Nifty option instrument tokens not found"); }
		const res = await updateInstrumentPrices(optionsInstruments);
		console.log("Option instruments updated: ", res);
		if (res.failedBatches > 0) {
			notificationHandler('quote error occurred while updating instrument prices', { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
			throw new Error(`quote error occurred while updating instrument prices`);
		}

		const indexData = marketStore.indexes.NIFTY; //Modify incase we add another index
		if (!indexData) {
			notificationHandler('IndexData is missing', { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
			throw new Error(`IndexData is missing`);
		};
		const expiryDate = indexData.config.currentWeekly;
		const indexLtp = indexData.currentIndexQuote?.ltp;
		const currentWeeklyDte = indexData.config.dte;
		const actualDte = currentWeeklyDte + getCalculatedDTE();

		if (!indexLtp || indexLtp <= 0) {
			notificationHandler('Index ltp is missing', { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
			throw new Error(`Index ltp is missing`);
		}
		result.indexLtp = indexLtp;

		const atmStrike = getNearestStrike("NIFTY", indexLtp);
		if (!atmStrike) {
			notificationHandler('ATM strike not found', { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
			throw new Error(`ATM strike not found`);
		}
		result.atmStrike = atmStrike;

		const atmCePrice = getOptionPrice(indexData.optionChain[atmStrike]?.CE);
		const atmPePrice = getOptionPrice(indexData.optionChain[atmStrike]?.PE);
		if (!atmCePrice || !atmPePrice) {
			notificationHandler('ATM CE / PE prices are missing', { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
			throw new Error(`ATM CE / PE prices are missing`);
		};
		const atmSynthFut = atmStrike + atmCePrice - atmPePrice;
		const synthAtmStrike = getNearestStrike("NIFTY", atmSynthFut);
		result.synthFut = atmSynthFut;
		result.synthAtmStrike = synthAtmStrike && synthAtmStrike > 0 ? synthAtmStrike : 0;

		for (const strike of Object.values(indexData.optionChain)) {

			if (!strike.PE) { continue; }
			const putPrice = getOptionPrice(strike.PE);
			if (putPrice == null) { continue; }

			const iv = getImpliedVolatility(putPrice, atmSynthFut, strike.strikePrice, actualDte / globalStates.daysPerYear, "put", 0);
			const delta = getDelta(atmSynthFut, strike.strikePrice, actualDte / globalStates.daysPerYear, iv, 0, "put");
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
		notificationHandler(errorMessage, { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
		return result;
	}
}