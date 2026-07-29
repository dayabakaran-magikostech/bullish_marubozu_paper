import { symbol } from "zod";
import { ENV, globalStates, instrumentStates, marketStore } from "../config";
import { logEntryOrderToDB } from "../logger";
import { TransactionType, Type } from "../types/charges";
import { pnlOrderData } from "../types/logger";
import { Exchange, ExchangeXTS, OrderHandlerResponseData, OrderLeg, OrderRequest } from "../types/orderHandler";
import { ActiveTradeData, OrderObj, PositionAction, TradeData, TradeDirection } from "../types/trade"
import { calcCharges, getCurrTimeStamp } from "../utils/helper";
import { crudOperation } from "../utils/crud";
import { orderHandler } from "./orderHandler";

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
		console.log("Trade initialized for orderTag: ", orderTag);
		// console.dir(tradeTrackerObj, { depth: null });

		const orderRequestObj = this.createOrderLeg('ENTRY');
		if (!orderRequestObj) { throw new Error("Error while creating order request obj at entry for order tag: " + orderTag); }

		this.initiateTrade(orderRequestObj, 'ENTRY');
		// placeEntryOrder: orderRequestObj
		return true;
	}

	async storeEntryDetails() {
		const logRes = await logEntryOrderToDB(this.trade!);
		console.log("Log entry response: ", logRes);
	}

	async calcPnl() {
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
		const primaryCharges = calcCharges(primaryExecutedEntry, primaryExitPrice, qty, 1, 1, primaryInstrumentData.type?.toLowerCase() as Type, primaryTransaction?.toLowerCase() as TransactionType);
		const coverPnl = coverTransaction === "BUY" ? (coverExitPrice - coverExecutedEntry) * qty : (coverExecutedEntry - coverExitPrice) * qty;
		const coverCharges = calcCharges(coverExecutedEntry, coverExitPrice, qty, 1, 1, coverInstrumentData.type?.toLowerCase() as Type, coverTransaction?.toLowerCase() as TransactionType);
		const totalPnl = ((primaryPnl + coverPnl) - (primaryCharges + coverCharges)) * qty;

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

	public createOrderLeg(position: PositionAction): OrderObj | any {
		const orderData: OrderObj = { cover: {}, primary: {}, margin: { cash: 0, total: 0 } };

		const data = this.trade;
		if (!data) return false;

		const isEntry = position === 'ENTRY';
		// const { index, qty, primary, cover, hasCover, exited } = data;
		const { index, primaryOrderData: primary, coverOrderData: cover, active } = data;
		const { qty, instrumentData: primaryInstrumentData } = primary;
		const { instrumentData: coverInstrumentData } = cover;
		if (!index || !primary || !qty) throw new Error('Data is missing can not create order leg');

		if (!active) return false;
		if (!primaryInstrumentData) throw new Error('Primary instrument data is missing');
		if (!coverInstrumentData) throw new Error('Cover instrument data is missing');

		if (!marketStore.indexes[index]) throw new Error('Index data is missing');

		const { lotSize, exch, exchSegment, xtsExchSegment, marginPerLot } = marketStore.indexes[index].config;
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

		if (!primaryQuote || !coverQuote) throw new Error('Quote data is missing');
		if (!primaryQuote.bid || !coverQuote.offer || primaryQuote.bid == 0 || coverQuote.offer == 0) throw new Error('Prices are zero');
		const buyMarginReq = coverQuote.offer * qty;
		const lotsToBuy = qty / lotSize;


		orderData.primary[primaryTradingSymbol] = this.generateOrderData(
			primaryInstrumentToken,
			primaryExchangeToken!,
			primaryTradingSymbol,
			primaryQuote.bid,
			"SELL",
			lotSize,
			exchSegment,
			xtsExchSegment,
			qty,
			primaryTickSize!,
			primaryType!
		);

		orderData.cover[coverTradingSymbol] = this.generateOrderData(
			coverInstrumentToken,
			coverExchangeToken!,
			coverTradingSymbol,
			coverQuote.offer,
			"BUY",
			lotSize,
			exchSegment,
			xtsExchSegment,
			qty,
			coverTickSize!,
			coverType!
		);

		orderData.margin.cash = buyMarginReq;
		orderData.margin.total = (marginPerLot * lotsToBuy);

		return orderData;

	}

	public generateOrderData(
		instrumentToken: number, exchangeToken: number, tradingsymbol: string,
		price: number, transactionType: TradeDirection,
		lotSize: number, exchSegment: string, xtsExchSegment: string,
		qty: number, tickSize: number, optType: string
	): Partial<OrderLeg> {
		return {
			instrument_token: instrumentToken,
			exchange_token: exchangeToken,
			tradingsymbol,
			transaction_type: transactionType,
			exchange: exchSegment as Exchange,
			exchange_xts: xtsExchSegment as ExchangeXTS,
			price,
			quantity: qty,
			lot_size: lotSize,
			validity: 'DAY',
			product: 'NRML',
			order_type: 'LIMIT',
			tick_size: tickSize,
			trade_spread_pct: 1,
			orderTrackerKey: optType
		}
	}

	public onOrderCompletion(resoponseData: OrderHandlerResponseData): boolean {
		try {
			const { tag, entryExitType: positionAction, traded_account: tradedAccount } = resoponseData;
			const activeTrade = this.trade;
			const isEntry = positionAction === 'ENTRY';
			if (!activeTrade || !activeTrade.primaryOrderData || !activeTrade.coverOrderData) throw new Error(`Trade not found for tag ${tag}`);
			if (!tradedAccount) throw new Error(`Account not found for tag ${tag} in the order postback`);

			if (
				(positionAction === 'EXIT' && activeTrade.active && activeTrade.orderStatus !== 'exitSent') ||
				(positionAction === 'ENTRY' && activeTrade.active && activeTrade.orderStatus !== 'entrySent')
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

			const primaryTradingSymbol = activeTrade.primaryOrderData.instrumentData?.tradingSymbol;
			const coverTradingSymbol = activeTrade.coverOrderData.instrumentData?.tradingSymbol;
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

				console.log("Order successfully entered: ", tag);
				this.updateEntryDetails(tradedAccount, primaryAvgPrice, primaryNumOrders, coverAvgPrice, coverNumOrders, tag!);
			}
			else {
				activeTrade.primaryOrderData.executedExitPrice = primaryAvgPrice;
				activeTrade.primaryOrderData.exitOrdersCount = primaryNumOrders;
				activeTrade.coverOrderData.executedExitPrice = coverAvgPrice;
				activeTrade.coverOrderData.exitOrdersCount = coverNumOrders;
				activeTrade.orderStatus = "exited";

				console.log("Order successfully exited: ", tag);
			}

			return true;
		}
		catch (error) {
			console.log('Error while handling Post back', (error as Error).message);
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

	public async updateEntryDetails(
		tradedAccount: string, primaryExecutedEntryPrice: number, primaryEntryOrdersCount: number,
		coverExecutedEntryPrice: number, coverEntryOrdersCount: number, tag: string
	) {
		const dataUpdationObj = {
			orderStatus: "entered",
			account: tradedAccount,
			primaryExecutedEntryPrice: primaryExecutedEntryPrice,
			primaryEntryOrdersCount: primaryEntryOrdersCount,
			coverExecutedEntryPrice: coverExecutedEntryPrice,
			coverEntryOrdersCount: coverEntryOrdersCount,
		}


		const crudRes = await crudOperation(
			ENV.liveBotDbUrl, ENV.orderLogsSheet,
			{
				actionType: "update",
				data: dataUpdationObj as any,
				extraParams: {
					id: tag,
					col_name: "orderTag"
				}
			}
		);
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

			if (!cash || !total) throw new Error("Margin is not provided");

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
			// console.log('order obj: ', JSON.stringify(orderPlacementObj));
			orderHandler.placeOrder(orderPlacementObj);
			return true;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.log(errorMessage);
			// notificationHandler(errorMessage, { module: 'Initiate Trade', severity: 'High', type: 'Error' }, true);
			return false;
		}
	}
}