import { KiteQuoteResponse, UpdateInstrumentPricesResult, KiteQuote } from "../types/kite";
import { globalStates, instrumentStates, marketStore } from "../config";
import { getQuotes } from "../kiteApi";
import { IndexMarketData, OptionInstrument } from "../types/market";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function updateInstrumentPrices(instruments: number[]): Promise<UpdateInstrumentPricesResult> {
	// console.log("Updating instrument prices: ", instruments);

	const urls = buildKiteQuoteUrls(instruments); //TODO: create quoteUrl only once
	const tokens = buildKiteAuthHeaders();
	const maxRetries = 3;
	const delayBetweenRetries = 1000;
	const result: UpdateInstrumentPricesResult = {
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

				const quoteResult = await getQuotes(token, url);
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

export function buildKiteQuoteUrls(instruments: number[], batchSize = 490): string[] {
	if (!instruments.length) { throw new Error("[buildKiteQuoteUrls] Instrument list is empty."); }

	const baseUrl = "https://api.kite.trade/quote";
	const urls: string[] = [];

	for (let i = 0; i < instruments.length; i += batchSize) {
		const batch = instruments.slice(i, i + batchSize);
		const params = new URLSearchParams();
		batch.forEach(token => params.append("i", token.toString()));
		urls.push(`${baseUrl}?${params.toString()}`);
	}

	return urls;
}

export function buildKiteAuthHeaders(): string[] {
	const tokens = [];
	for (const account in globalStates.kiteAccounts) {
		tokens.push(`token ${globalStates.kiteAccounts[account]?.apiKey}:${globalStates.kiteAccounts[account]?.accessToken}`);
	}
	return tokens
}

export interface MarketQuoteUpdateResult {
	indexesUpdated: number;
	optionsUpdated: number;
	unknownTokens: number[];
}

export function processMarketQuotes(quotes: KiteQuoteResponse): MarketQuoteUpdateResult {

	const result: MarketQuoteUpdateResult = {
		indexesUpdated: 0,
		optionsUpdated: 0,
		unknownTokens: []
	};

	for (const [responseToken, quote] of Object.entries(quotes)) {

		const instrumentToken = quote.instrument_token ?? Number(responseToken);
		const tokenKey = String(instrumentToken);
		const indexData = instrumentStates[tokenKey];

		if (indexData?.type == "INDEX") {
			updateIndexQuote(indexData, quote);
			result.indexesUpdated++;
			continue;
		}

		const optionInstrument = instrumentStates[tokenKey];

		if (optionInstrument) {
			updateOptionQuote(optionInstrument, quote);
			result.optionsUpdated++;
			continue;
		}

		result.unknownTokens.push(instrumentToken);
	}

	return result;
}

function updateIndexQuote(instrument: OptionInstrument, quote: KiteQuote): void {

	const updatedAt = quote.timestamp ?? new Date().toISOString();
	instrument.quote.ltp = quote.last_price > 0 ? quote.last_price : null;
	instrument.quote.updatedAt = updatedAt;

	if (!quote.timestamp) { return; }
	const hourlyKey = getHourlyQuoteKey(quote.timestamp);
	const index = instrument.index;

	if (!hourlyKey) {
		console.warn(`Invalid Kite timestamp: ${quote.timestamp} `);
		return;
	}

	marketStore.indexes[index]!.hourlyQuotes[hourlyKey] = {
		datetime: quote.timestamp,
		open: quote.ohlc.open,
		high: quote.ohlc.high,
		low: quote.ohlc.low,
		close: quote.last_price
	}
}

function getHourlyQuoteKey(timestamp: string): string | null {
	const match = timestamp.match(/^\d{4}-\d{2}-\d{2} (\d{2}):(\d{2}):\d{2}$/);
	if (!match) { return null; }
	const hour = match[1];
	const minute = match[2];
	return `${hour}:${minute}`;
}

function updateOptionQuote(instrument: OptionInstrument, quote: KiteQuote): void {
	const bestBid = normalizeDepthPrice(quote.depth?.buy?.[0]?.price);
	const bestOffer = normalizeDepthPrice(quote.depth?.sell?.[0]?.price);
	instrument.quote.bid = bestBid;
	instrument.quote.offer = bestOffer;
	instrument.quote.ltp = quote.last_price > 0 ? quote.last_price : null;
	instrument.quote.updatedAt = quote.timestamp ?? new Date().toISOString();
}

function normalizeDepthPrice(price: number | undefined): number | null {
	if (price === undefined || price <= 0) {
		return null;
	}
	return price;
}