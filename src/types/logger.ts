import { OrderStatus, TradeDirection } from "./trade";

export interface LoggerVMData {
	bot: string | undefined;
	filename: string;
	data: any[];
	type: 'create_file' | 'add_log';
}

export interface placeOrderData {
	orderTag: string;
	entryTime: string;
	exitTime: string;
	index: string;
	account: string;
	expiry: string;
	active: boolean;
	orderStatus: OrderStatus;
	primarySentEntryPrice: number;
	primaryExecutedEntryPrice: number | undefined;
	primarySentExitPrice: number | undefined;
	primaryExecutedExitPrice: number | undefined;
	primaryEntryOrdersCount: number | undefined;
	primaryExitOrdersCount: number | undefined;
	primaryInstrumentToken: number;
	primaryExchangeToken: number;
	primaryTradingSymbol: string;
	primaryEntryDelta: number;
	primaryEntryTransaction: TradeDirection;
	primaryReqMargin: number;
	coverSentEntryPrice: number | undefined;
	coverExecutedEntryPrice: number | undefined;
	coverSentExitPrice: number | undefined;
	coverExecutedExitPrice: number | undefined;
	coverEntryOrdersCount: number | undefined;
	coverExitOrdersCount: number | undefined;
	coverInstrumentToken: number;
	coverExchangeToken: number;
	coverTradingSymbol: string;
	coverEntryDelta: number;
	coverEntryTransaction: TradeDirection;
	coverReqMargin: number;
	lotSize: number;
	qty: number;
	totalCharges: number | undefined;
	postChargesPnl: number | undefined;
	candleHighToCloseRatio: number;
	candleLowToOpenRatio: number;
	candleHighLowRatio: number;
}

export interface pnlOrderData {
	orderTag: string;
	dateime: string;
	entryTime: string;
	qty: number;
	primaryTradingSymbol: string;
	primaryEntryPrice: number;
	primaryCurrentPrice: number;
	coverTradingSymbol: string;
	coverEntryPrice: number;
	coverCurrentPrice: number;
	primaryPreChargesPnl: number;
	coverPreChargesPnl: number;
	primaryCharges: number;
	coverCharges: number;
	totalPnl: number;
}