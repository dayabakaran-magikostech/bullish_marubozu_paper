import { AssetType, Type, Broker, TransactionType } from '../types/charges';
/**
 * Calculates the total charges for a given trade.
 */
export declare function getCharges(assetType: AssetType, type: Type, broker: Broker, transactionType: TransactionType, premiumPrice: number, quantity: number, ordersCount?: number, stockExchange?: string): number;
//# sourceMappingURL=charges.d.ts.map