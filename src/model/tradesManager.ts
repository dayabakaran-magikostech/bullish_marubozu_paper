import { globalStates, instrumentStates } from "../config";
import { logEntryOrderToDB } from "../logger";
import { ActiveTradeData, TradeData, TradeDirection } from "../types/trade"
import { getCurrTimeStamp } from "../utils/helper";

export class TradeManager {
	trade: ActiveTradeData | null = null;

	async initialiizeNewTrade(
		orderTag: string, primaryTransaction: TradeDirection, primaryInstrumentToken: number, coverTransaction: TradeDirection, coverInstrumentToken: number,
		candleHighToCloseRatio: number, candleLowToOpenRatio: number, candleHighLowRatio: number
	): Promise<boolean> {

		const primaryInstrumentDetails = instrumentStates[primaryInstrumentToken];
		const coverInstrumentDetails = instrumentStates[coverInstrumentToken];
		if (!primaryInstrumentDetails || !coverInstrumentDetails) {
			console.log("Instrument details not found");
			return false;
		}
		const lotSize = primaryInstrumentDetails.lotSize;
		if (!lotSize) {
			console.log("Lot size not found");
			return false;
		}
		const primaryQuote = primaryInstrumentDetails.quote;
		const coverQuote = coverInstrumentDetails.quote;

		if (!primaryQuote || !coverQuote) {
			console.log("Primary/Cover quote data not found");
			return false;
		}

		if (!primaryQuote.bid || primaryQuote.bid == 0 || !primaryQuote.offer || primaryQuote.offer == 0 || !coverQuote.bid || coverQuote.bid == 0 || !coverQuote.offer || coverQuote.offer == 0) {
			console.log("Prices are 0 for: ", primaryInstrumentDetails.tradingSymbol, coverInstrumentDetails.tradingSymbol);
			return false;
		}

		const lotsToTrade = globalStates.lotsToTrade;
		const totalQtyToTrade = lotsToTrade * lotSize;
		const { delta: primaryDelta, expiryDate, index } = instrumentStates[primaryInstrumentToken]!;
		const { delta: coverDelta } = instrumentStates[coverInstrumentToken]!;
		const primaryCashReq = primaryTransaction === "BUY" ? (primaryInstrumentDetails.quote.offer! * lotSize * lotsToTrade) : (primaryInstrumentDetails.quote.bid! * lotSize * lotsToTrade);
		const coverCashReq = coverTransaction === "BUY" ? (coverInstrumentDetails.quote.offer! * lotSize * lotsToTrade) : (coverInstrumentDetails.quote.bid! * lotSize * lotsToTrade);

		const primaryTradeData: TradeData = {
			sentEntryPrice: primaryTransaction === "BUY" ? primaryQuote.offer : primaryQuote.bid,
			executedEntryPrice: primaryTransaction === "BUY" ? primaryQuote.offer : primaryQuote.bid,
			sentExitPrice: primaryTransaction == "BUY" ? primaryQuote.bid : primaryQuote.offer,
			executedExitPrice: primaryTransaction == "BUY" ? primaryQuote.offer : primaryQuote.bid,
			entryOrdersCount: undefined,
			exitOrdersCount: undefined,
			instrumentData: instrumentStates[primaryInstrumentDetails?.instrumentToken!]!,
			entryDelta: Number(primaryDelta),
			entryTransaction: primaryTransaction,
			reqMargin: primaryCashReq,
			qty: totalQtyToTrade,
			ordersCount: undefined,
			charges: undefined,
			npfPoints: undefined,
			postChargesNpf: undefined,
		}

		const coverTradeData: TradeData = {
			sentEntryPrice: coverTransaction === "BUY" ? coverQuote.offer : coverQuote.bid,
			executedEntryPrice: coverTransaction === "BUY" ? coverQuote.offer : coverQuote.bid,
			sentExitPrice: coverTransaction === "BUY" ? coverQuote.bid : coverQuote.offer,
			executedExitPrice: coverTransaction === "BUY" ? coverQuote.bid : coverQuote.offer,
			entryOrdersCount: undefined,
			exitOrdersCount: undefined,
			instrumentData: instrumentStates[coverInstrumentDetails?.instrumentToken!]!,
			entryDelta: Number(coverDelta),
			entryTransaction: coverTransaction,
			reqMargin: coverCashReq,
			qty: totalQtyToTrade,
			ordersCount: undefined,
			charges: undefined,
			npfPoints: undefined,
			postChargesNpf: undefined,
		}

		const tradeTrackerObj: ActiveTradeData = {
			orderTag,
			entryTime: getCurrTimeStamp(new Date()),
			exitTime: '',
			index,
			account: '',
			expiry: expiryDate!,
			active: true,
			orderStatus: "entrySent",
			primaryOrderData: primaryTradeData,
			coverOrderData: coverTradeData,
			totalCharges: 0,
			postChargesPnl: 0,
			candleHighToCloseRatio: candleHighToCloseRatio,
			candleLowToOpenRatio: candleLowToOpenRatio,
			candleHighLowRatio: candleHighLowRatio,
		};

		this.trade = tradeTrackerObj;

		return true;
	}

	async storeEntryDetails() {
		const logRes = await logEntryOrderToDB(this.trade!);
		console.log("Log entry response: ", logRes);
	}

	async calcPnl(): Promise<any> {
		if (!this.trade) { return; }
		const { executedEntryPrice: primaryExecutedEntry, instrumentData: primaryInstrumentData, entryTransaction: primaryTransaction, qty } = this.trade.primaryOrderData;
		const { executedEntryPrice: coverExecutedEntry, instrumentData: coverInstrumentData, entryTransaction: coverTransaction } = this.trade.coverOrderData;
		if (!primaryExecutedEntry || !coverExecutedEntry || !qty) {
			console.log("Invalid executed entry price");
			return false;
		}
		const primaryCurrentQuote = primaryInstrumentData?.quote;
		const coverCurrentQuote = coverInstrumentData?.quote;
		if (!primaryCurrentQuote || !coverCurrentQuote || primaryCurrentQuote.bid == 0 || primaryCurrentQuote.offer == 0 || coverCurrentQuote.bid == 0 || coverCurrentQuote.offer == 0) {
			console.log("Invalid quote data");
			return false;
		}
		const primaryExitPrice = primaryTransaction === "BUY" ? primaryCurrentQuote.bid : primaryCurrentQuote.offer;
		const coverExitPrice = coverTransaction === "BUY" ? coverCurrentQuote.bid : coverCurrentQuote.offer;
		if (!primaryExitPrice || !coverExitPrice) {
			console.log("Invalid exit price");
			return false;
		}
		const primaryPnl = primaryTransaction === "BUY" ? (primaryExitPrice - primaryExecutedEntry) * qty : (primaryExecutedEntry - primaryExitPrice) * qty;
		const coverPnl = coverTransaction === "BUY" ? (coverExitPrice - coverExecutedEntry) * qty : (coverExecutedEntry - coverExitPrice) * qty;
		const totalPnl = primaryPnl + coverPnl;
		return totalPnl;
	}
}