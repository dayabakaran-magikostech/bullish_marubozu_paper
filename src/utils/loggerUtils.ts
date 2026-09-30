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
		primarySentExitPrice: '',
		primaryExecutedExitPrice: '',
		primaryEntryOrdersCount: trade.primaryOrderData.entryOrdersCount,
		primaryExitOrdersCount: '',
		primaryInstrumentToken: trade.primaryOrderData.instrumentData?.instrumentToken!,
		primaryExchangeToken: trade.primaryOrderData.instrumentData?.exchangeToken!,
		primaryOptionType: trade.primaryOrderData.instrumentData?.type!,
		primaryStrike: trade.primaryOrderData.instrumentData?.strikePrice!,
		primaryTradingSymbol: trade.primaryOrderData.instrumentData?.tradingSymbol!,
		primaryEntryDelta: trade.primaryOrderData.entryDelta ? trade.primaryOrderData.entryDelta : 0,
		primaryEntryTransaction: trade.primaryOrderData.entryTransaction!,
		primaryReqMargin: trade.primaryOrderData.reqMargin ? trade.primaryOrderData.reqMargin : 0,
		coverSentEntryPrice: trade.coverOrderData.sentEntryPrice ? trade.coverOrderData.sentEntryPrice : 0,
		coverExecutedEntryPrice: trade.coverOrderData.executedEntryPrice ? trade.coverOrderData.executedEntryPrice : 0,
		coverSentExitPrice: '',
		coverExecutedExitPrice: '',
		coverEntryOrdersCount: trade.coverOrderData.entryOrdersCount,
		coverExitOrdersCount: '',
		coverInstrumentToken: trade.coverOrderData.instrumentData?.instrumentToken!,
		coverExchangeToken: trade.coverOrderData.instrumentData?.exchangeToken!,
		coverOptionType: trade.coverOrderData.instrumentData?.type!,
		coverStrike: trade.coverOrderData.instrumentData?.strikePrice!,
		coverTradingSymbol: trade.coverOrderData.instrumentData?.tradingSymbol!,
		coverEntryDelta: trade.coverOrderData.entryDelta ? trade.coverOrderData.entryDelta : 0,
		coverEntryTransaction: trade.coverOrderData.entryTransaction!,
		coverReqMargin: trade.coverOrderData.reqMargin ? trade.coverOrderData.reqMargin : 0,
		lotSize: trade.primaryOrderData.instrumentData?.lotSize!,
		qty: trade.primaryOrderData.qty!,
		totalCharges: trade.totalCharges,
		postChargesPnl: trade.postChargesPnl,
		candleHighToCloseRatio: trade.candleHighToCloseRatio,
		candleLowToOpenRatio: trade.candleLowToOpenRatio,
		candleHighLowRatio: trade.candleHighLowRatio,
	};

	formattedData.push(tradeObj);

	return formattedData;
}