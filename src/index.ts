import { buildKiteAuthHeaders, buildKiteQuoteUrls, calculateStrikeSynthFut, getCalculatedDTE, getCurrTimeStamp, getNearestPutDeltaOption, getNearestStrike, getOptionPrice, getOrderTagDateSuffix, isOlderThanMinutes } from "./utils/helper";
import { KiteQuote, KiteQuoteResponse, UpdateInstrumentPricesResult } from "./types/kite";
import { getQuotes } from "./kiteApi"
import { marketStore, globalStates, generalConfig, orderTracker } from "./config";
import { IndexHourlyQuote, OptionStrike, OptionInstrument } from "./types/market";
import { getDelta, getImpliedVolatility } from "./services/optionGreeksCalculator";
import { processMarketQuotes, updateInstrumentPrices } from "./services/instrumentPricesUpdator";
import { TradeManager } from "./model/tradesManager";
import { logEntryOrderToDB } from "./logger";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


export async function runDecisionEngine(): Promise<any> {
	try {

		const niftyInstrumentToken = marketStore.indexes.NIFTY?.config.instrumentToken;
		if (!niftyInstrumentToken) { throw new Error("Nifty instrument token not found"); }
		const updateInstrumentRes = await updateInstrumentPrices([niftyInstrumentToken]);
		if (updateInstrumentRes.failedBatches > 0) {
			console.log("Failed to update instrument prices");
			return;
		}

		const latestQuote = getLatestHourlyIndexQuote("NIFTY");
		if (latestQuote && isOlderThanMinutes(latestQuote.datetime, 5)) {
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
		const { opportunityExists, targetDelta, closeFromHighRatio, openFromLowRatio, highToLowRatio } = evaluateEntrySignals(currentOpen!, currentHigh, currentLow, currentClose!);


		if (opportunityExists) {
			const ivCalcStatus = await updateOptionsPricesAndCalculateGreeks();
			if (!ivCalcStatus) {
				console.log("IV calc failed");
				return; // or throw error, IV calc failed for the option chain
			}
			const primaryPutData = getNearestPutDeltaOption("NIFTY", targetDelta); //TODO: getTradableOptions -> calc iv, and get primary and cover delta options
			const coverPutData = getNearestPutDeltaOption("NIFTY", globalStates.coverDeltaTarget);


			const currentTimestamp = getCurrTimeStamp(new Date());
			const orderTag = generalConfig.orderTagInitials + "-" + getOrderTagDateSuffix(currentTimestamp);
			const newOrder = new TradeManager();
			const initiateTradeRes = newOrder.initialiizeNewTrade(orderTag, "SELL", primaryPutData?.instrumentToken!, "BUY", coverPutData?.instrumentToken!, closeFromHighRatio, openFromLowRatio, highToLowRatio);
			// orderTracker[orderTag] = new TradeManager();
			// const initiateTradeRes = orderTracker[orderTag].initialiizeNewTrade(orderTag, "BUY", primaryPutData?.instrumentToken!, "SELL", coverPutData?.instrumentToken!, closeFromHighRatio, openFromLowRatio, highToLowRatio);
			if (!initiateTradeRes) {
				return false;
				// throw error and ping
			}
			orderTracker[orderTag] = newOrder;
			console.log("Initiate trade response: ", initiateTradeRes);
			console.dir(orderTracker[orderTag], { depth: null });

			orderTracker[orderTag].storeEntryDetails(); // do this at the time of initialization -> add this in que and send all at once

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

	const baseDelta = globalStates.baseDelta; // TODO: set as constant in ENV
	const deltaDeviationThreshold = globalStates.deltaDeviationThreshold; // TODO: set as constant in ENV
	const DELTA_ADJUSTMENT = globalStates.deltaAdjustment; // TODO: set as constant in ENV
	const k = globalStates.deltaChangeFactorK; // TODO: set as constant in ENV
	let targetDelta = baseDelta;

	const deltaDeviation = high / low - k;
	const candleRange = high - low;
	const openFromLowRatio = Math.abs(open! - low) / candleRange;
	const closeFromHighRatio = Math.abs(open! - high) / candleRange;
	const highToLowRatio = high / low;

	let opportunityExists = false;
	if (closeFromHighRatio < 0.30 && openFromLowRatio < 0.30) {
		opportunityExists = true;
		console.log("Checking delta threshold");
		if (deltaDeviation > deltaDeviationThreshold) {
			targetDelta += DELTA_ADJUSTMENT;
		} else if (deltaDeviation < -deltaDeviationThreshold) {
			targetDelta -= DELTA_ADJUSTMENT;
		}
	}

	//TODO: check early return

	// console.log("Current high: ", high, "\nCurrent low: ", low, "\nCurrent open: ", open, "\nCurrent close: ", close)
	console.log("Delta deviation threshold:", deltaDeviationThreshold, "\nDelta deviation: ", deltaDeviation, "\nOpen from low ratio: ", openFromLowRatio, "\nClose from low ratio: ", closeFromHighRatio);
	console.log("Opportunity exists: ", opportunityExists);
	return { opportunityExists, targetDelta, closeFromHighRatio, openFromLowRatio, highToLowRatio };
}

async function updateOptionsPricesAndCalculateGreeks(): Promise<boolean> { // gwt current option data: fetch, calc atm synth fut return num(atm data) or NaN
	//TODO: every return false should ping the errors
	const optionsInstruments = marketStore.allOptionTokens;
	if (!optionsInstruments) { throw new Error("Nifty option instrument tokens not found"); }
	const res = await updateInstrumentPrices(optionsInstruments);
	//TODO: check res
	// console.log("Option instruments updated: ", res);

	const indexData = marketStore.indexes.NIFTY;
	if (!indexData) return false;
	const expiryDate = indexData.config.currentWeekly;
	const indexLtp = indexData.currentIndexQuote?.ltp;
	const currentWeeklyDte = indexData.config.dte;
	const actualDte = currentWeeklyDte + getCalculatedDTE();
	if (!indexLtp || indexLtp <= 0) return false; //TODO: throw error and send notification - add try catch block
	const atmStrike = getNearestStrike("NIFTY", indexLtp);
	if (!atmStrike) return false;
	const atmCePrice = getOptionPrice(indexData.optionChain[atmStrike]?.CE);
	const atmPePrice = getOptionPrice(indexData.optionChain[atmStrike]?.PE);
	if (!atmCePrice || !atmPePrice) return false;
	const atmSynthFut = atmStrike + atmCePrice - atmPePrice;

	for (const strike of Object.values(indexData.optionChain)) {
		const synthFut = calculateStrikeSynthFut(strike); //TODO: delete synthFut, and calc iv only for otm put options
		strike.synthFut = synthFut;

		if (synthFut == null || !strike.PE) { continue; }
		const putPrice = getOptionPrice(strike.PE);
		if (putPrice == null) { continue; }

		const iv = getImpliedVolatility(putPrice, atmSynthFut, strike.strikePrice, actualDte / 249, "put", 0);
		const delta = getDelta(atmSynthFut, strike.strikePrice, actualDte / 249, iv, 0, "put");
		strike.PE.iv = iv;
		strike.PE.delta = delta;
	}

	return true;
}