import { TradeDirection, PositionAction } from "./trade";
export type Exchange = 'NSE' | 'BSE' | 'NFO';
export type ExchangeXTS = 'NSECM' | 'BSECM' | 'NSEFO';

/** A single child order’s execution info */
type ChildExecution = {
	status: string;
	tag: string;
	tradingsymbol: string;
	basketType: string;
	timestamp: string;
	quantity: number;
	price: number;
	trade_spread_pct: number;
	modification_count: number;
	last_modification_price: number;
	[key: string | number | symbol]: any;
};


export type ChildOrdersMap = Record<string, ChildExecution>;

export type OrderLeg = {
	instrument_token: number;
	exchange_token: number;
	tradingsymbol: string;
	transaction_type: TradeDirection;
	exchange: Exchange;
	exchange_xts: ExchangeXTS;
	price: number;
	quantity: number;
	validity: 'DAY' | 'IOC';
	product: 'NRML' | 'CNC';
	order_type: 'LIMIT' | 'MARKET';
	tick_size: number;
	trade_spread_pct: number;
	lot_size: number;
	placed_qty?: number;
	completed_qty?: number;
	child_orders?: ChildOrdersMap;
	[key: string | number | symbol]: any;
};

export type MarginDetails = {
	cash: number;
	total: number;
};


export type OrderRequest = {
	type: 'placeOrder';
	tag: string;
	margins_required: MarginDetails;
	entryExitType: PositionAction;
	price_efficiency: boolean;
	volume_efficiency: boolean;
	accounts: string[];
	cover_orders: OrderLeg | {};
	primary_orders: OrderLeg | {};
	[key: string | number | symbol]: any;
};

export type BasketOrders = {
	basket_status?: string;
} & Record<Exclude<string, 'basket_status'>, OrderLeg>;

export type OrderHandlerResponseData = {
	type: string;
	status: boolean;
	message: string;
	tag?: string;
	orders_placed_counter?: number;
	rejectedOrders?: string[];
	margins_required?: MarginDetails;
	accounts?: string[];
	entryExitType?: PositionAction;
	price_efficiency?: boolean;
	volume_efficiency?: boolean;
	filtered_accounts?: string[];
	order_status?: string;
	traded_account?: string;
	bot_tag?: string;
	completed_timestamp?: string;
	timestamp?: string;
	rejectedAfterPlacing?: string[];
	cover_orders?: BasketOrders;
	primary_orders?: BasketOrders;
	[key: string | number | symbol]: any;
};