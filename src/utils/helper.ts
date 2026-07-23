import { globalStates, marketStore } from "../config";
import { OptionInstrument, OptionStrike, OptionType } from "../types/market";

export function buildKiteQuoteUrls(instruments: number[], batchSize = 490): string[] {
	if (!instruments.length) {
		throw new Error("[buildKiteQuoteUrls] Instrument list is empty.");
	}

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

export function getDaysRem(OPTION_END_DATE: string): number {
	const expiry: Date = new Date(new Date(OPTION_END_DATE).setHours(0, 0, 0, 0));
	const today: Date = new Date(new Date().setHours(0, 0, 0, 0));
	const diffTime = Math.abs(expiry.getTime() - today.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return diffDays;
}

export function getCalculatedDTE(): number {
	const tradingStart: Date = new Date();
	tradingStart.setHours(9, 15, 0, 0);
	const tradingEnd: Date = new Date(tradingStart.getTime() + 6.25 * 60 * 60 * 1000);
	const now: Date = new Date();
	if (now < tradingStart) {
		return 1; // Before trading starts, DTE is 1
	} else if (now > tradingEnd) {
		return 0; // After trading ends, DTE is 0
	} else {
		const totalTradingTime = tradingEnd.getTime() - tradingStart.getTime();
		const elapsedTradingTime = now.getTime() - tradingStart.getTime();
		const dte = 1 - elapsedTradingTime / totalTradingTime;
		return dte;
	}
}

export function normalizeIndexName(value: string): string {
	return value.trim().toUpperCase();
}

export function normalizeDate(value: string): string {
	const date = value.trim();
	if (!date) { throw new Error("Date cannot be empty"); }
	return date;
}

export function normalizeOptionType(value: string): OptionType {
	const type = value.trim().toUpperCase();
	if (type !== "CE" && type !== "PE" && type !== "FUT") { throw new Error(`Invalid option type: ${value}`); }
	return type;
}

export function getNearestStrike(index: string, target: number): number | null {

	if (!Number.isFinite(target)) { return null; }

	const arr = marketStore.indexes[index]?.strikesArr;
	if (!arr || arr.length === 0) {
		return null;
	}
	let left = 0;
	let right = arr.length - 1;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		const current = arr[mid]!;

		if (current === target) {
			return current;
		}
		if (current < target) {
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	const lower = right >= 0 ? arr[right]! : undefined;
	const upper = left < arr.length ? arr[left]! : undefined;

	if (lower === undefined) return upper ?? null;
	if (upper === undefined) return lower;

	return Math.abs(target - lower) <= Math.abs(target - upper) ? lower : upper;
}

export function isOlderThanMinutes(datetime: string, minutes: number): boolean {
	const date = new Date(datetime.replace(' ', 'T'));
	return Date.now() - date.getTime() > minutes * 60 * 1000;
}

export function calculateStrikeSynthFut(strike: OptionStrike): number | null {
	const cePrice = getOptionPrice(strike.PE);
	const pePrice = getOptionPrice(strike.PE);
	if (cePrice == null || pePrice == null) {
		return null;
	}
	return (strike.strikePrice + cePrice - pePrice);
}

export function getOptionPrice(option: OptionInstrument | undefined): number | null {
	if (!option) return null;

	const bid = option.quote!.bid;
	const offer = option.quote!.offer;
	const ltp = option.quote!.ltp;

	return bid;
}

export function getNearestPutDeltaOption(index: string, targetDelta: number): OptionInstrument | null {
	const indexData = marketStore.indexes[index.trim().toUpperCase()];
	if (!indexData) return null;
	let nearest: OptionInstrument | null = null;
	let nearestDistance = Infinity;

	for (const strike of Object.values(indexData.optionChain)) {
		const pe = strike.PE;
		if (!pe || pe.delta == null) {
			continue;
		}
		const distance = Math.abs(Math.abs(pe.delta) - Math.abs(targetDelta));
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearest = pe;
		}
	}
	return nearest;
}

export function getCurrTimeStamp(currentDate: Date | null): string {
	if (!currentDate) return '';
	const year = currentDate.getFullYear();
	const month = padZero(currentDate.getMonth() + 1);
	const day = padZero(currentDate.getDate());
	const hours = padZero(currentDate.getHours());
	const minutes = padZero(currentDate.getMinutes());
	const seconds = padZero(currentDate.getSeconds());
	const milliseconds = padZero3(currentDate.getMilliseconds());

	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function padZero(number: number): string {
	return number.toString().padStart(2, '0');
}

function padZero3(number: number): string {
	return number.toString().padStart(3, '0');
}

export function getOrderTagDateSuffix(datetime: string): string {
	// Indexes based on: "YYYY-MM-DD HH:mm:ss.SSS"
	//                    01234567890123456789012
	const yy = datetime.slice(2, 4);
	const month = datetime.slice(5, 7);
	const dd = datetime.slice(8, 10);
	const hh = datetime.slice(11, 13);
	const mm = datetime.slice(14, 16);

	return `${dd}${month}${yy}${hh}${mm}`;
}