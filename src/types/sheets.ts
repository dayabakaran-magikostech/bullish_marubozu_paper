export interface instrumentsMaster {
    id: number;
    tradingsymbol: string;
    type: string;
    strike_price: number;
    expiry_date: string;
    instrument_token: number;
    exchange_token: number;
    lot_size: number;
    security: string;
    tick_size: number;
    created_at: string;
}

export interface RawInstrumentsMasterRow {
    id: number;
    tradingsymbol: string;
    type: string;
    strike_price: number;
    expiry_date: string;
    instrument_token: number;
    exchange_token: number;
    lot_size: number;
    security: string;
    tick_size: number;
    created_at: string;
}

export interface IndexConfig {
    id: number;
    index: string;
    active: boolean;
    lotSize: number;
    tradingSymbol: string;
    stock_code: string;
    instrumentToken: number;
    hasWeekly: boolean;
    currentWeekly: string;
    exch: string;
    exchSegment: string;
    xtsExchSegment: string;
    marginPerLot: number;
    dte: number;
}

export interface RawIndexConfigRow {
    id: number;
    index: string;
    active: boolean;
    lotSize: number;
    tradingSymbol: string;
    stock_code: string;
    instrumentToken: number;
    hasWeekly: boolean;
    currentWeekly: string;
    exch: string;
    exchSegment: string;
    xtsExchSegment: string;
    marginPerLot: number;
    dte: number;
}

export interface RawAccountRow {
    id: string;
    account: string;
    broker: string;
    createdAt: string;
}

export interface ApiAccessToken {
    id: number;
    API: string;
    ACCOUNT: string;
    'ACCOUNT TYPE': string;
    Broker: string;
    'APP KEY': string;
    'APP SECRET': string;
    PASSWORD: string;
    'ACCESS TOKEN': string;
    cash: string;
    created_at: string;
}

export interface KiteApiToken {
    id: number;
    ACCOUNT: string;
    "API KEY": string;
    "ACCESS TOKEN": string;
    ACTIVE: boolean;
    created_at: string;
}

export interface AccountDataSheet {
    id: number;
    account: string;
    broker: string;
    createdAt: string;
}

export type AccountData = {
    accountsList: string[];
    accountBrokerMap: Record<string, string>;
};

export interface KiteAccount {
    apiKey: string;
    accessToken: string;
    active: boolean;
}

export interface KiteAccounts {
    [account: string]: KiteAccount;
}