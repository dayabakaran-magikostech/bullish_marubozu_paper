export type AssetType = 'equity' | 'currency' | 'equity-intraday';
export type Type = 'ce' | 'pe' | 'fut' | 'cash';
export type Broker = 'zerodha' | 'ZERODHA';
export type TransactionType = 'buy' | 'sell';
export interface ChargesData {
    brokerage: number;
    stt: number;
    transactionCharges: number;
    gst: number;
    sebiCharges: number;
    stampCharges: number;
    totalCharges: number;
}
//# sourceMappingURL=charges.d.ts.map