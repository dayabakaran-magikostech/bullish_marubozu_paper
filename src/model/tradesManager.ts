import { boolean, string, symbol } from "zod";
import { ENV, globalStates, instrumentStates, marketStore, orderTracker } from "../config";
import { logEntryOrderToDB, updateEntryDetailsOnSheet, updateExitDetailsOnSheet } from "../logger";
import { TransactionType, Type } from "../types/charges";
import { pnlOrderData } from "../types/logger";
import { Exchange, ExchangeXTS, OrderHandlerResponseData, OrderLeg, OrderRequest } from "../types/orderHandler";
import { ActiveTradeData, OrderObj, PositionAction, TradeData, TradeDirection } from "../types/trade"
import { calcCharges, getCurrTimeStamp, getCalculatedDTE, getNearestStrike, getOptionPrice } from "../utils/helper";
import { crudOperation } from "../utils/crud";
import { orderHandler } from "./orderHandler";
import { notificationHandler } from "../utils/notificationsHandler";
import { processMarketQuotes, updateInstrumentPrices } from "../services/instrumentPricesUpdator";
import { calculateTheoreticalValues, getImpliedVolatility } from "../services/optionGreeksCalculator";

export class TradeManager {
	trade: ActiveTradeData | null = null;

	async initializeNewTrade(
		orderTag: string, primaryTransaction: TradeDirection, primaryInstrumentToken: number, coverTransaction: TradeDirection, coverInstrumentToken: number,
		candleHighToCloseRatio: number, candleLowToOpenRatio: number, candleHighLowRatio: number
	): Promise<boolean> {

		const primaryInstrumentDetails = instrumentStates[primaryInstrumentToken];
		const coverInstrumentDetails = instrumentStates[coverInstrumentToken];

		if (!primaryInstrumentDetails || !coverInstrumentDetails) {
			console.log("Instrument details not found");
			return false;
		}

		const { delta: primaryDelta, expiryDate, index, quote: primary_quote, lotSize } = primaryInstrumentDetails;
		const { delta: coverDelta, quote: cover_quote } = coverInstrumentDetails;

		const { bid: primary_bid, offer: primary_offer } = primary_quote;
		const { bid: cover_bid, offer: cover_offer } = cover_quote;

		if (!lotSize) {
			console.log("Lot size not found");
			return false;
		}

		if (!primary_bid || !primary_offer || !cover_bid || !cover_offer) {
			console.log("Prices are 0 for: ", primaryInstrumentDetails.tradingSymbol, coverInstrumentDetails.tradingSymbol);
			return false;
		}

		const lotsToTrade = globalStates.lotsToTrade;
		const totalQtyToTrade = lotsToTrade * lotSize;


		const primaryCashReq = primaryTransaction === "BUY" ? (primary_offer * lotSize * lotsToTrade) : 0;
		const coverCashReq = coverTransaction === "BUY" ? (cover_offer * lotSize * lotsToTrade) : 0;

		const primaryTradeData: TradeData = {
			sentEntryPrice: primaryTransaction === "BUY" ? primary_offer : primary_bid,
			executedEntryPrice: primaryTransaction === "BUY" ? primary_offer : primary_bid,
			sentExitPrice: undefined,
			executedExitPrice: undefined,
			entryOrdersCount: undefined,
			exitOrdersCount: undefined,
			instrumentData: primaryInstrumentDetails,
			entryDelta: Number(primaryDelta),
			entryTransaction: primaryTransaction,
			reqMargin: primaryCashReq,
			qty: totalQtyToTrade,
			charges: undefined,
			npfPoints: undefined,
			postChargesNpf: undefined,
		}

		const coverTradeData: TradeData = {
			sentEntryPrice: coverTransaction === "BUY" ? cover_offer : cover_bid,
			executedEntryPrice: coverTransaction === "BUY" ? cover_offer : cover_bid,
			sentExitPrice: undefined,
			executedExitPrice: undefined,
			entryOrdersCount: undefined,
			exitOrdersCount: undefined,
			instrumentData: coverInstrumentDetails,
			entryDelta: Number(coverDelta),
			entryTransaction: coverTransaction,
			reqMargin: coverCashReq,
			qty: totalQtyToTrade,
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
			active: false,
			orderStatus: "entrySent",
			primaryOrderData: primaryTradeData,
			coverOrderData: coverTradeData,
			totalCharges: 0,
			postChargesPnl: 0,
			candleHighToCloseRatio: candleHighToCloseRatio,
			candleLowToOpenRatio: candleLowToOpenRatio,
			candleHighLowRatio: candleHighLowRatio,
			entrySynthFut: 0,
			entryPrimaryIv: 0,
			entryCoverIv: 0,
			theoreticalThetaPerQty: 0,
			theroreticalPrimaryTheta: 0,
			theoreticalCoverTheta: 0,
			theoreticalThetaPnl: 0,
			theoreticalTheta: 0,
			gap: 0,
			hwm: -Infinity,
			marginRequired: 0,
		};

		this.trade = tradeTrackerObj;
		console.log("Trade initialized for orderTag: ", orderTag);

		const orderRequestObj = this.createOrderReqObj('ENTRY');
		if (!orderRequestObj || orderRequestObj == undefined) { throw new Error("Error while creating order request obj at entry for order tag: " + orderTag); }

		this.initiateTrade(orderRequestObj, 'ENTRY');
		return true;
	}

	async storeEntryDetails() {
		const logRes = await logEntryOrderToDB(this.trade!);
		console.log("Log entry response: ", logRes);
	}

	public calcPnl() {

		if (!this.trade) return;
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
		const primaryCharges = calcCharges(primaryExecutedEntry, primaryExitPrice, qty, 1, 1, primaryInstrumentData.type?.toLowerCase() as Type, primaryTransaction?.toLowerCase() as TransactionType);
		const coverPnl = coverTransaction === "BUY" ? (coverExitPrice - coverExecutedEntry) * qty : (coverExecutedEntry - coverExitPrice) * qty;
		// fix hardcoded 1, 1 in charges function
		const coverCharges = calcCharges(coverExecutedEntry, coverExitPrice, qty, 1, 1, coverInstrumentData.type?.toLowerCase() as Type, coverTransaction?.toLowerCase() as TransactionType);
		const totalPnl = ((primaryPnl + coverPnl) - (primaryCharges + coverCharges));
		this.trade.postChargesPnl = totalPnl;
		this.trade.totalCharges = (primaryCharges + coverCharges);

		const pnlObj = {
			orderTag: this.trade.orderTag,
			dateime: getCurrTimeStamp(new Date()),
			entryTime: this.trade.entryTime,
			qty,
			primaryTradingSymbol: this.trade.primaryOrderData.instrumentData!.tradingSymbol,
			primaryEntryPrice: primaryExecutedEntry,
			primaryCurrentPrice: primaryExitPrice,
			coverTradingSymbol: this.trade.coverOrderData.instrumentData!.tradingSymbol,
			coverEntryPrice: coverExecutedEntry,
			coverCurrentPrice: coverExitPrice,
			primaryPreChargesPnl: primaryPnl,
			coverPreChargesPnl: coverPnl,
			primaryCharges: primaryCharges,
			coverCharges: coverCharges,
			totalPnl
		}

		return pnlObj;
	}

	public createOrderReqObj(position: PositionAction): OrderObj | undefined {
		try {
			// optimize and try loop and fill
			const orderData: OrderObj = { cover: {}, primary: {}, margin: { cash: 0, total: 0 } };

			const data = this.trade;
			if (!data) return;
			const { index, primaryOrderData: primary, coverOrderData: cover, active } = data;
			if (!marketStore.indexes[index]) throw new Error('Index data is missing');
			const { lotSize, exch, exchSegment, xtsExchSegment, marginPerLot } = marketStore.indexes[index].config;

			const isEntry = position === 'ENTRY';
			if (isEntry) {
				// const { index, qty, primary, cover, hasCover, exited } = data;
				const { qty, instrumentData: primaryInstrumentData } = primary;
				const { instrumentData: coverInstrumentData } = cover;
				if (!index || !primary || !qty) throw new Error('Data is missing can not create order leg');

				if (!primaryInstrumentData) throw new Error('Primary instrument data is missing');
				if (!coverInstrumentData) throw new Error('Cover instrument data is missing');
				const {
					instrumentToken: primaryInstrumentToken, exchangeToken: primaryExchangeToken,
					tradingSymbol: primaryTradingSymbol, quote: primaryQuote, tickSize: primaryTickSize,
					type: primaryType
				} = primaryInstrumentData;

				const {
					instrumentToken: coverInstrumentToken, exchangeToken: coverExchangeToken,
					tradingSymbol: coverTradingSymbol, quote: coverQuote, tickSize: coverTickSize,
					type: coverType
				} = coverInstrumentData;

				if (!primaryInstrumentToken || !primaryExchangeToken || !primaryTradingSymbol || !primaryTickSize) {
					throw new Error("Instrument data not found for Primary");
				}

				if (!coverInstrumentToken || !coverExchangeToken || !coverTradingSymbol) {
					throw new Error("Instrument data not found for Cover");
				}

				if (!primaryQuote || !coverQuote) throw new Error('Quote data is missing');

				const { bid: primary_bid, offer: primary_offer } = primaryQuote;
				const { bid: cover_bid, offer: cover_offer } = coverQuote;
				if (!primary_bid || !cover_offer) throw new Error('Prices are zero');
				const buyMarginReq = cover_offer * qty; // check transaction and fill
				const lotsToBuy = qty / lotSize;

				orderData.primary[primaryTradingSymbol] = {
					instrument_token: primaryInstrumentToken,
					exchange_token: primaryExchangeToken,
					tradingsymbol: primaryTradingSymbol,
					transaction_type: "SELL", //use transaction from params
					exchange: exchSegment as Exchange,
					exchange_xts: xtsExchSegment as ExchangeXTS,
					price: primary_bid,
					quantity: qty,
					lot_size: lotSize,
					validity: 'DAY',
					product: 'NRML',
					order_type: 'LIMIT',
					tick_size: primaryTickSize,
					trade_spread_pct: 1,
					orderTrackerKey: primaryType
				}

				orderData.cover[coverTradingSymbol] = {
					instrument_token: coverInstrumentToken,
					exchange_token: coverExchangeToken,
					tradingsymbol: coverTradingSymbol,
					transaction_type: "BUY",
					exchange: exchSegment as Exchange,
					exchange_xts: xtsExchSegment as ExchangeXTS,
					price: cover_offer,
					quantity: qty,
					lot_size: lotSize,
					validity: 'DAY',
					product: 'NRML',
					order_type: 'LIMIT',
					tick_size: primaryTickSize,
					trade_spread_pct: 1,
					orderTrackerKey: coverType
				}

				orderData.margin.cash = buyMarginReq;
				orderData.margin.total = (marginPerLot * lotsToBuy);
				data.marginRequired = orderData.margin.total;
			}
			else {

				const { instrumentData: primaryInstrumentData, entryTransaction: primaryTransaction, qty } = data.primaryOrderData;
				const { instrumentData: coverInstrumentData, entryTransaction: coverTransaction } = data.coverOrderData;

				const {
					tradingSymbol: primaryTradingSymbol,
					instrumentToken: primaryInstrumentToken,
					exchangeToken: primaryExchangeToken,
					quote: primaryQuote,
					tickSize: primaryTickSize,
					type: primaryType,
				} = primaryInstrumentData!;

				const {
					tradingSymbol: coverTradingSymbol,
					instrumentToken: coverInstrumentToken,
					exchangeToken: coverExchangeToken,
					quote: coverQuote,
					tickSize: coverTickSize,
					type: coverType,
				} = coverInstrumentData!;

				orderData.primary[primaryTradingSymbol] = {
					instrument_token: primaryInstrumentToken,
					exchange_token: primaryExchangeToken!,
					tradingsymbol: primaryTradingSymbol,
					transaction_type: primaryTransaction == "BUY" ? "SELL" : "BUY",
					exchange: exchSegment as Exchange,
					exchange_xts: xtsExchSegment as ExchangeXTS,
					price: primaryTransaction == "BUY" ? primaryQuote.bid! : primaryQuote.offer!,
					quantity: qty,
					lot_size: lotSize,
					validity: 'DAY',
					product: 'NRML',
					order_type: 'LIMIT',
					tick_size: primaryTickSize!,
					trade_spread_pct: 1,
					orderTrackerKey: primaryType
				}

				orderData.cover[coverTradingSymbol] = {
					instrument_token: coverInstrumentToken,
					exchange_token: coverExchangeToken!,
					tradingsymbol: coverTradingSymbol,
					transaction_type: coverTransaction == "BUY" ? "SELL" : "BUY",
					exchange: exchSegment as Exchange,
					exchange_xts: xtsExchSegment as ExchangeXTS,
					price: coverTransaction == "BUY" ? coverQuote.bid! : coverQuote.offer!,
					quantity: qty,
					lot_size: lotSize,
					validity: 'DAY',
					product: 'NRML',
					order_type: 'LIMIT',
					tick_size: coverTickSize!,
					trade_spread_pct: 1,
					orderTrackerKey: coverType
				}

				orderData.margin.cash = 0;
				orderData.margin.total = 0;
			}

			return orderData;
		}
		catch (error) {
			console.log("Error occurred while creating the orders obj: ", error);
			notificationHandler('Error occurred while creating the orders obj', { module: 'createOrderReqObj', severity: 'High' }, true);
			return undefined;
		}
	}

	public async onOrderCompletion(resoponseData: OrderHandlerResponseData): Promise<boolean> {
		try {
			const { tag, entryExitType: positionAction, traded_account: tradedAccount } = resoponseData;
			const activeTrade = this.trade;
			const isEntry = positionAction === 'ENTRY';
			if (!activeTrade || !activeTrade.primaryOrderData || !activeTrade.coverOrderData) throw new Error(`Trade not found for tag ${tag}`);
			if (!tradedAccount) throw new Error(`Account not found for tag ${tag} in the order postback`);

			console.dir(resoponseData, { depth: null });

			const primaryInstrumentData = activeTrade.primaryOrderData.instrumentData;
			const coverInstrumentData = activeTrade.coverOrderData.instrumentData;

			if (!primaryInstrumentData || !coverInstrumentData) {
				console.log("Instrument data not found for primary/cover");
				return false;
			}

			const { tradingSymbol: primaryTradingSymbol } = primaryInstrumentData;
			const { tradingSymbol: coverTradingSymbol } = coverInstrumentData;

			if (
				(positionAction === 'EXIT' && activeTrade.orderStatus !== 'exitSent') ||
				(positionAction === 'ENTRY' && activeTrade.orderStatus !== 'entrySent')
			) {
				console.error(`Trade already processed for ${tag}.`);
				return false;
			}

			const primaryBasket = resoponseData.primary_orders;
			const coverBasket = resoponseData.cover_orders;
			if (!primaryBasket || !coverBasket) {
				console.log("Primary or Cover basket not found");
				return false;
			}

			const primaryOrderLeg = primaryBasket[primaryTradingSymbol!];
			if (!primaryOrderLeg) {
				console.log("Primary order leg not found in order postback response");
				return false;
			}
			const coverOrderLeg = coverBasket[coverTradingSymbol!];
			if (!coverOrderLeg) {
				console.log("Cover order leg not found in order postback response");
				return false;
			}

			const { avgPrice: primaryAvgPrice, numOrders: primaryNumOrders } = this.getPlacedOrderDetails(primaryOrderLeg);
			if (isNaN(primaryAvgPrice) || primaryNumOrders === 0) {
				console.log("Primary order details not found in the orderTracker");
				return false;
			}
			const { avgPrice: coverAvgPrice, numOrders: coverNumOrders } = this.getPlacedOrderDetails(coverOrderLeg);
			if (isNaN(coverAvgPrice) || coverNumOrders === 0) {
				console.log("Cover order details not found in the orderTracker");
				return false;
			}

			if (isEntry) {
				activeTrade.primaryOrderData.executedEntryPrice = primaryAvgPrice;
				activeTrade.primaryOrderData.entryOrdersCount = primaryNumOrders;
				activeTrade.coverOrderData.executedEntryPrice = coverAvgPrice;
				activeTrade.coverOrderData.entryOrdersCount = coverNumOrders;
				activeTrade.account = tradedAccount;
				activeTrade.orderStatus = "entered";
				activeTrade.active = true;
				console.log("Order successfully entered: ", tag);
				const message = "\nEntered Order: " + tag + "\nPrimary: " + activeTrade.primaryOrderData.instrumentData?.tradingSymbol + "\nCover: " + activeTrade.coverOrderData.instrumentData?.tradingSymbol + "\nMargin Used: " + activeTrade.marginRequired + "\nQty: " + activeTrade.primaryOrderData.qty + "\nTrading Acc: " + activeTrade.account;
				notificationHandler(message, { module: 'Entry Order', severity: 'High' }, true);
				const isGreeksStored = await calculateAndStoreEntryGreeks(tag!);
				if (!isGreeksStored) {
					notificationHandler('Failed to calculated entry level greeks', { module: 'onOrderCompletion', severity: 'High' }, true);
				}
				const { entrySynthFut, entryPrimaryIv, entryCoverIv, marginRequired } = activeTrade;
				const res = await updateEntryDetailsOnSheet(
					tradedAccount, primaryAvgPrice, primaryNumOrders,
					coverAvgPrice, coverNumOrders, tag!,
					entrySynthFut, entryPrimaryIv, entryCoverIv, marginRequired
				);
				if (res == true) {
					console.log("Order completion data updated on the sheet");
				}
				else {
					console.log("Failed to update order completion data on the sheet");
				}
			}
			else {
				activeTrade.primaryOrderData.executedExitPrice = primaryAvgPrice;
				activeTrade.primaryOrderData.exitOrdersCount = primaryNumOrders;
				activeTrade.coverOrderData.executedExitPrice = coverAvgPrice;
				activeTrade.coverOrderData.exitOrdersCount = coverNumOrders;
				activeTrade.orderStatus = "exited";
				const pnlObj = this.calcPnl();
				// fix pnl obj - use exited price
				if (!pnlObj) {
					console.log("Error occurred while calculation pnl")
					return false;
				}

				console.log("Order successfully exited: ", tag);
				const message = "\nExited Order: " + tag + "\nPrimary: " + activeTrade.primaryOrderData.instrumentData?.tradingSymbol + "\nCover: " + activeTrade.coverOrderData.instrumentData?.tradingSymbol + "\nQty: " + activeTrade.primaryOrderData.qty + "\nPnl: " + (pnlObj.totalPnl.toFixed(2));
				notificationHandler(message, { module: 'Exit Order', severity: 'High' }, true);
				const res = await updateExitDetailsOnSheet(
					tag!,
					getCurrTimeStamp(new Date()),
					primaryAvgPrice,
					primaryAvgPrice,
					primaryNumOrders,
					coverAvgPrice,
					coverAvgPrice,
					coverNumOrders,
					pnlObj.totalPnl,
					(pnlObj.primaryCharges + pnlObj.coverCharges)
				);
				if (res == true) {
					console.log("Order completion data updated on the sheet");
				}
				else {
					console.log("Failed to update order completion data on the sheet");
				}
			}

			return true;
		}
		catch (error) {
			console.log('Error while handeling Post back', (error as Error).message);
			return false;
		}
	}

	private getPlacedOrderDetails(orderLeg: OrderLeg): { avgPrice: number; numOrders: number } {
		const childOrders = orderLeg?.child_orders;
		if (!childOrders || Object.keys(childOrders).length === 0) {
			return { avgPrice: NaN, numOrders: 0 };
		}
		let totalValue = 0;
		let totalQty = 0;
		let numOrders = 0;
		for (const orderId in childOrders) {
			let { price, quantity } = childOrders[orderId]!;
			price = Number(price);
			quantity = Number(quantity);
			totalValue += price * quantity;
			totalQty += quantity;
			numOrders++;
		}

		const avgPrice = totalValue / totalQty;
		return { avgPrice, numOrders };
	}

	private initiateTrade(orderReq: OrderObj, position: PositionAction): boolean {
		try {
			const trade = this.trade;
			if (!trade) return false;

			if (trade.orderStatus == "entered" && position === 'ENTRY')
				throw new Error(`Trade is already active for order tag ${trade.orderTag}`);

			if (trade.orderStatus == "exited" && position === 'EXIT')
				throw new Error(`Trade is already EXITED for order tag ${trade.orderTag}`);

			const isEntry = position === 'ENTRY';

			const cash = orderReq.margin.cash;
			const total = orderReq.margin.total;

			if (isEntry && (!cash || !total)) throw new Error("Margin is not provided");

			const orderPlacementObj: OrderRequest = {
				type: 'placeOrder',
				tag: trade.orderTag,
				margins_required: { cash, total },
				entryExitType: position,
				price_efficiency: globalStates.priceEfficiency,
				volume_efficiency: globalStates.volumeEfficiency,
				accounts: isEntry ? globalStates.accountPriority : [trade.account],
				cover_orders: orderReq.cover,
				primary_orders: orderReq.primary,
			};
			console.log('order obj: ', JSON.stringify(orderPlacementObj));
			orderHandler.placeOrder(orderPlacementObj);
			return true;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.log(errorMessage);
			// notificationHandler(errorMessage, { module: 'Initiate Trade', severity: 'High', type: 'Error' }, true);
			return false;
		}
	}

	public exitTrade(): boolean {
		const exitOrderObj = this.createOrderReqObj("EXIT");
		if (!exitOrderObj) {
			console.log("Failed to create exit order obj");
			return false;
		}
		const exitOrderRes = this.initiateTrade(exitOrderObj, "EXIT");
		return exitOrderRes;
	}

	public loadTradeFromDb(stored: any): boolean {
		try {
			if (!stored) {
				throw new Error("Stored trade data is missing");
			}
			const orderTag = String(stored.orderTag ?? "");
			if (!orderTag) {
				throw new Error("orderTag is missing");
			}

			const orderStatus = String(stored.orderStatus) as ActiveTradeData["orderStatus"];
			const isActive = orderStatus === "entered";

			if (!isActive) {
				console.log(orderTag + " is not active skipping the trade");
				return false;
			}

			const primaryInstrumentToken = Number(stored.primaryInstrumentToken);
			const coverInstrumentToken = Number(stored.coverInstrumentToken);
			if (!primaryInstrumentToken || !coverInstrumentToken) {
				throw new Error(`Instrument tokens missing for trade ${orderTag}`);
			}
			const primaryInstrumentData = instrumentStates[primaryInstrumentToken];
			const coverInstrumentData = instrumentStates[coverInstrumentToken];
			if (!primaryInstrumentData) {
				throw new Error(`Primary instrument not found in instrumentStates: ${primaryInstrumentToken}`);
			}

			if (!coverInstrumentData) {
				throw new Error(`Cover instrument not found in instrumentStates: ${coverInstrumentToken}`);
			}
			const qty = Number(stored.qty);
			if (!Number.isFinite(qty) || qty <= 0) {
				throw new Error(`Invalid qty for trade ${orderTag}: ${stored.qty}`);
			}

			const primaryTradeData: TradeData = {
				sentEntryPrice: this.toOptionalNumber(stored.primarySentEntryPrice),
				executedEntryPrice: this.toOptionalNumber(stored.primaryExecutedEntryPrice),
				sentExitPrice: this.toOptionalNumber(stored.primarySentExitPrice),
				executedExitPrice: this.toOptionalNumber(stored.primaryExecutedExitPrice),
				entryOrdersCount: this.toOptionalNumber(stored.primaryEntryOrdersCount),
				exitOrdersCount: this.toOptionalNumber(stored.primaryExitOrdersCount),
				instrumentData: primaryInstrumentData,
				entryDelta: this.toOptionalNumber(stored.primaryEntryDelta) ?? 0,
				entryTransaction: String(stored.primaryEntryTransaction).toUpperCase() as TradeDirection,
				reqMargin: this.toOptionalNumber(stored.primaryReqMargin) ?? 0,
				qty,
				charges: undefined,
				npfPoints: undefined,
				postChargesNpf: undefined,
			};

			const coverTradeData: TradeData = {
				sentEntryPrice: this.toOptionalNumber(stored.coverSentEntryPrice),
				executedEntryPrice: this.toOptionalNumber(stored.coverExecutedEntryPrice),
				sentExitPrice: this.toOptionalNumber(stored.coverSentExitPrice),
				executedExitPrice: this.toOptionalNumber(stored.coverExecutedExitPrice),
				entryOrdersCount: this.toOptionalNumber(stored.coverEntryOrdersCount),
				exitOrdersCount: this.toOptionalNumber(stored.coverExitOrdersCount),
				instrumentData: coverInstrumentData,
				entryDelta: this.toOptionalNumber(stored.coverEntryDelta) ?? 0,
				entryTransaction: String(stored.coverEntryTransaction).toUpperCase() as TradeDirection,
				reqMargin: this.toOptionalNumber(stored.coverReqMargin) ?? 0,
				qty,
				charges: undefined,
				npfPoints: undefined,
				postChargesNpf: undefined,
			};

			const restoredTrade: ActiveTradeData = {
				orderTag,
				entryTime: String(stored.entryTime ?? ""),
				exitTime: String(stored.exitTime ?? ""),
				index: String(stored.index),
				account: String(stored.account ?? ""),
				expiry: String(stored.expiry),
				active: isActive,
				orderStatus,
				primaryOrderData: primaryTradeData,
				coverOrderData: coverTradeData,
				totalCharges: this.toOptionalNumber(stored.totalCharges) ?? 0,
				postChargesPnl: this.toOptionalNumber(stored.postChargesPnl) ?? 0,
				candleHighToCloseRatio: this.toOptionalNumber(stored.candleHighToCloseRatio) ?? 0,
				candleLowToOpenRatio: this.toOptionalNumber(stored.candleLowToOpenRatio) ?? 0,
				candleHighLowRatio: this.toOptionalNumber(stored.candleHighLowRatio) ?? 0,
				entrySynthFut: this.toOptionalNumber(stored.entrySynthFut) ?? 0,
				entryPrimaryIv: this.toOptionalNumber(stored.entryPrimaryIv) ?? 0,
				entryCoverIv: this.toOptionalNumber(stored.entryCoverIv) ?? 0,
				theoreticalThetaPerQty: 0,
				theroreticalPrimaryTheta: 0,
				theoreticalCoverTheta: 0,
				theoreticalThetaPnl: 0,
				theoreticalTheta: 0,
				gap: 0,
				hwm: -Infinity,
				marginRequired: 0,
			};

			this.trade = restoredTrade;

			console.log(`Trade restored successfully: ${orderTag}`);

			console.log({
				orderTag,
				orderStatus,
				active: isActive,
				account: restoredTrade.account,
				qty,
				primary: primaryInstrumentData.tradingSymbol,
				cover: coverInstrumentData.tradingSymbol,
				primaryEntryPrice: primaryTradeData.executedEntryPrice,
				coverEntryPrice: coverTradeData.executedEntryPrice,
			});

			return true;
		}
		catch (error) {
			console.error("Failed to restore trade:", error instanceof Error ? error.message : error);
			return false;
		}
	}

	private toOptionalNumber(value: any): number | undefined {
		if (
			value === null ||
			value === undefined ||
			value === ""
		) {
			return undefined;
		}
		const num = Number(value);
		return Number.isFinite(num)
			? num
			: undefined;
	}

	private toBoolean(value: any): boolean {
		if (typeof value === "boolean") {
			return value;
		}
		if (typeof value === "number") {
			return value === 1;
		}
		if (typeof value === "string") {
			const normalized = value
				.trim()
				.toLowerCase();
			return (
				normalized === "true" ||
				normalized === "1" ||
				normalized === "yes"
			);
		}
		return false;
	}
}

async function calculateAndStoreEntryGreeks(orderTag: string): Promise<boolean> {
	try {

		// use quote for index 
		// handle if quote fails - use old prices

		const optionsInstruments = marketStore.allOptionTokens;
		if (!optionsInstruments) { throw new Error("Nifty option instrument tokens not found"); }
		const res = await updateInstrumentPrices(optionsInstruments);
		console.log("Option instruments updated: ", res);
		if (res.failedBatches > 0) {
			notificationHandler('quote error occurred while updating instrument prices', { module: 'updateOptionsPricesAndCalculateGreeks', severity: 'High' }, true);
		}

		const indexData = marketStore.indexes.NIFTY;
		if (!indexData) {
			console.log("IndexData is missing");
			notificationHandler('IndexData is missing', { module: 'calculateAndStoreEntryGreeks', severity: 'High' }, true);
			throw new Error(`IndexData is missing`);
		};
		const indexLtp = indexData.currentIndexQuote?.ltp;
		const currentWeeklyDte = indexData.config.dte;
		const actualDte = currentWeeklyDte + getCalculatedDTE();
		if (!indexLtp || indexLtp <= 0) {
			console.log("Index ltp is missing");
			notificationHandler('Index ltp is missing', { module: 'calculateAndStoreEntryGreeks', severity: 'High' }, true);
			throw new Error(`Index ltp is missing`);
		}

		const atmStrike = getNearestStrike("NIFTY", indexLtp);
		if (!atmStrike) {
			console.log("ATM strike not found");
			notificationHandler('ATM strike not found', { module: 'calculateAndStoreEntryGreeks', severity: 'High' }, true);
			throw new Error(`ATM strike not found`);
		}

		const atmCePrice = getOptionPrice(indexData.optionChain[atmStrike]?.CE);
		const atmPePrice = getOptionPrice(indexData.optionChain[atmStrike]?.PE);
		if (!atmCePrice || !atmPePrice) {
			console.log("ATM CE / PE prices are missing");
			notificationHandler('ATM CE / PE prices are missing', { module: 'calculateAndStoreEntryGreeks', severity: 'High' }, true);
			throw new Error(`ATM CE / PE prices are missing`);
		};
		const synthFut = atmStrike + atmCePrice - atmPePrice;


		const order = orderTracker[orderTag]?.trade;
		const primaryEntryPrice = order?.primaryOrderData.executedEntryPrice;
		const coverEntryPrice = order?.coverOrderData.executedEntryPrice;
		const primaryInstrumentData = order?.primaryOrderData.instrumentData;
		const coverInstrumentData = order?.coverOrderData.instrumentData;

		const primaryIv = getImpliedVolatility(primaryEntryPrice!, synthFut, primaryInstrumentData?.strikePrice!, actualDte / globalStates.daysPerYear, "put", 0.0);
		const coverIv = getImpliedVolatility(coverEntryPrice!, synthFut, coverInstrumentData?.strikePrice!, actualDte / globalStates.daysPerYear, "put", 0.0);

		console.log(primaryEntryPrice!, synthFut, primaryInstrumentData?.strikePrice!, actualDte / globalStates.daysPerYear, "put", 0.0);
		console.log("Primary IV: ", primaryIv);

		order!.entrySynthFut = synthFut;
		order!.entryPrimaryIv = primaryIv;
		order!.entryCoverIv = coverIv;

		calculateTheoreticalTheta(orderTag);

		return true;
	}
	catch (error) {
		console.log("Error occurred while calculating the entry greeks: ", error);
		return false;
	}
}

export function calculateTheoreticalTheta(orderTag: string): number {
	const indexData = marketStore.indexes.NIFTY;
	if (!indexData) {
		console.log("IndexData is missing");
		notificationHandler('IndexData is missing', { module: 'calculateTheoreticalTheta', severity: 'High' }, true);
		throw new Error(`IndexData is missing`);
	};
	const currentWeeklyDte = indexData.config.dte;
	const order = orderTracker[orderTag]?.trade;
	const actualDte = currentWeeklyDte + getCalculatedDTE();

	const [primaryTheoreticalPrice, primaryTheoreticalTheta] = calculateTheoreticalValues(order!.entrySynthFut, order?.primaryOrderData.instrumentData?.strikePrice!, order!.entryPrimaryIv, actualDte);
	const [coverTheoreticalPrice, coverTheoreticalTheta] = calculateTheoreticalValues(order!.entrySynthFut, order?.coverOrderData.instrumentData?.strikePrice!, order!.entryCoverIv, actualDte);

	order!.theroreticalPrimaryTheta = primaryTheoreticalTheta;
	order!.theoreticalCoverTheta = coverTheoreticalTheta;
	order!.theoreticalThetaPerQty = (coverTheoreticalTheta - primaryTheoreticalTheta) * (1 / 385);
	const theoreticalTheta = (coverTheoreticalTheta - primaryTheoreticalTheta) * (1 / 385) * (order?.primaryOrderData.qty!)
	order!.theoreticalTheta = theoreticalTheta;
	order!.theoreticalThetaPnl += theoreticalTheta;

	return order!.theoreticalThetaPnl;
}