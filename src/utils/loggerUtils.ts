import { placeOrderData } from "../types/logger";
import { ActiveTradeData } from "../types/trade";


export function fromattedTradeData(trade: ActiveTradeData): placeOrderData[] {
	const formattedData = [];

	const tradeObj: placeOrderData = {
		orderTag: trade.orderTag,
		entryTime: trade.entryTime,
		exitTime: '',
		index: trade.index,
		account: trade.account,
		expiry: trade.expiry,
		active: trade.active,
		orderStatus: trade.orderStatus,
		primarySentEntryPrice: trade.primaryOrderData.sentEntryPrice ? trade.primaryOrderData.sentEntryPrice : 0,
		primaryExecutedEntryPrice: trade.primaryOrderData.executedEntryPrice ? trade.primaryOrderData.executedEntryPrice : 0,
		primarySentExitPrice: trade.primaryOrderData.sentExitPrice ? trade.primaryOrderData.sentExitPrice : 0,
		primaryExecutedExitPrice: trade.primaryOrderData.executedExitPrice ? trade.primaryOrderData.executedExitPrice : 0,
		primaryEntryOrdersCount: trade.primaryOrderData.entryOrdersCount,
		primaryExitOrdersCount: trade.primaryOrderData.exitOrdersCount,
		primaryInstrumentToken: trade.primaryOrderData.instrumentData?.instrumentToken!,
		primaryExchangeToken: trade.primaryOrderData.instrumentData?.exchangeToken!,
		primaryTradingSymbol: trade.primaryOrderData.instrumentData?.tradingSymbol!,
		primaryEntryDelta: trade.primaryOrderData.entryDelta ? trade.primaryOrderData.entryDelta : 0,
		primaryEntryTransaction: trade.primaryOrderData.entryTransaction!,
		primaryReqMargin: trade.primaryOrderData.reqMargin ? trade.primaryOrderData.reqMargin : 0,
		coverSentEntryPrice: trade.coverOrderData.sentEntryPrice ? trade.coverOrderData.sentEntryPrice : 0,
		coverExecutedEntryPrice: trade.coverOrderData.executedEntryPrice ? trade.coverOrderData.executedEntryPrice : 0,
		coverSentExitPrice: trade.coverOrderData.sentExitPrice ? trade.coverOrderData.sentExitPrice : 0,
		coverExecutedExitPrice: trade.coverOrderData.executedExitPrice ? trade.coverOrderData.executedExitPrice : 0,
		coverEntryOrdersCount: trade.coverOrderData.entryOrdersCount,
		coverExitOrdersCount: trade.coverOrderData.exitOrdersCount,
		coverInstrumentToken: trade.coverOrderData.instrumentData?.instrumentToken!,
		coverExchangeToken: trade.coverOrderData.instrumentData?.exchangeToken!,
		coverTradingSymbol: trade.coverOrderData.instrumentData?.tradingSymbol!,
		coverEntryDelta: trade.coverOrderData.entryDelta ? trade.coverOrderData.entryDelta : 0,
		coverEntryTransaction: trade.coverOrderData.entryTransaction!,
		coverReqMargin: trade.coverOrderData.reqMargin ? trade.coverOrderData.reqMargin : 0,
		lotSize: trade.primaryOrderData.instrumentData?.lotSize!,
		qty: trade.primaryOrderData.qty!,
		totalCharges: trade.totalCharges,
		postChargesPnl: trade.postChargesPnl,
		candleHighToCloseRatio: trade.candleHighLowRatio,
		candleLowToOpenRatio: trade.candleLowToOpenRatio,
		candleHighLowRatio: trade.candleHighLowRatio,
	};

	formattedData.push(tradeObj);

	return formattedData;
}