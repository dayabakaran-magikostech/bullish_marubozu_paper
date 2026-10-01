import { OrderRequest } from '../types/orderHandler';
export declare class OrderHandlerClient {
    private botTag;
    private wsUrl;
    private reconnectInterval;
    private ws;
    private isAlive;
    private aliveTimeout;
    constructor(wsUrl: string | undefined, reconnectInterval?: number);
    connect(): Promise<boolean>;
    private onOpen;
    private onClose;
    private onError;
    private onMessage;
    private handleOrderCompletion;
    placeOrder(order: OrderRequest): void;
}
export declare const orderHandler: OrderHandlerClient;
//# sourceMappingURL=orderHandler.d.ts.map