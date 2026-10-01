"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderHandler = exports.OrderHandlerClient = void 0;
const ws_1 = __importDefault(require("ws"));
const config_1 = require("../config");
class OrderHandlerClient {
    constructor(wsUrl, reconnectInterval) {
        const tag = config_1.ENV.botTag;
        if (tag === undefined || tag === '') {
            throw new Error('Order Handler: ERROR Invalid bot tag. It must be a non-empty string.');
        }
        if (!wsUrl) {
            throw new Error('Order Handler: ERROR Invalid WebSocket URL. It must be a non-empty string.');
        }
        if (reconnectInterval !== undefined && reconnectInterval <= 0) {
            throw new Error('Order Handler: ERROR Invalid reconnect interval. It must be a positive number.');
        }
        this.botTag = tag;
        this.wsUrl = wsUrl;
        this.reconnectInterval = reconnectInterval ?? 10000;
        this.ws = null;
        this.isAlive = false;
        this.aliveTimeout = null;
    }
    async connect() {
        try {
            this.ws = new ws_1.default(this.wsUrl);
            this.ws.on('open', () => this.onOpen());
            this.ws.on('message', (message) => {
                const response = message.toString('utf8');
                // console.log('Order Handler: Received message:', response);
                const data = JSON.parse(response);
                if (data.message === 'Connection established') {
                    this.ws?.send(JSON.stringify({
                        type: 'init',
                        bot_tag: this.botTag,
                    }));
                }
                this.onMessage(data);
            });
            this.ws.on('close', () => this.onClose());
            this.ws.on('error', (error) => this.onError(error));
            this.ws.on('pong', () => (this.isAlive = true));
            return true;
        }
        catch (err) {
            // invalid URL, immediate constructor error
            console.error('Order Handler: WebSocket init failed:', err);
            this.onError(err);
            return false;
        }
    }
    onOpen() {
        console.log('Order Handler: NOTIF Connected to the WebSocket server');
        this.isAlive = true;
        this.aliveTimeout = setInterval(() => {
            if (!this.isAlive)
                return this.ws?.close();
            this.isAlive = false;
            this.ws?.ping();
        }, 5000);
    }
    onClose() {
        const errMsg = `Disconnected from the Order handler ws at ${new Date().toLocaleString()}`;
        // notificationHandler(
        // 	errMsg,
        // 	{
        // 		type: 'Error',
        // 		module: 'Order handler',
        // 		severity: 'High',
        // 	},
        // 	true
        // );
        if (this.aliveTimeout) {
            clearInterval(this.aliveTimeout);
        }
        setTimeout(() => {
            process.stdout.write(`Order Handler: NOTIF Attempting to reconnect onClose...\n`);
            this.connect();
        }, this.reconnectInterval);
    }
    onError(error) {
        console.error('Order Handler: NOTIF WebSocket error: ', error?.message);
        this.ws?.close();
    }
    onMessage(res) {
        // console.log('Order Handler: NOTIF ', res);
        const { type, status, message, tag: orderTag } = res;
        switch (type) {
            case 'init':
            case 'validate_orders':
            case 'placed_orders':
                if (!status) {
                    const errorMsg = orderTag ? `${orderTag}\t${message}` : message;
                    // notificationHandler(
                    // 	errorMsg,
                    // 	{
                    // 		type: 'Error',
                    // 		module: 'Order handler',
                    // 		severity: 'High',
                    // 	},
                    // 	true
                    // );
                }
                break;
            case 'completed_orders':
                if (status) {
                    this.handleOrderCompletion(res);
                }
                else {
                    // notificationHandler(
                    // 	`${orderTag}\t${message}`,
                    // 	{
                    // 		type: 'Error',
                    // 		module: 'Order handler',
                    // 		severity: 'High',
                    // 	},
                    // 	true
                    // );
                }
                break;
        }
    }
    handleOrderCompletion(res) {
        // console.log('handleOrderCompletion', res);
        const { tag, entryExitType, traded_account: tradedAccount, primary_orders: primaryBasket } = res;
        if (!entryExitType || !tradedAccount || !tag) {
            throw new Error(' tag or entryExitType or tradedAccount not found for order completion.');
        }
        const trade = config_1.orderTracker[tag];
        if (!trade) {
            throw new Error(`Trade not found for ${tag}.`);
        }
        const orderCompletetionSuccess = trade.onOrderCompletion(res);
        console.log('orderCompletetionSuccess', orderCompletetionSuccess);
    }
    placeOrder(order) {
        if (!this.ws) {
            console.error('Order Handler: NOTIF WebSocket is not initialized. Cannot send order.');
            return;
        }
        this.ws.send(JSON.stringify(order));
    }
}
exports.OrderHandlerClient = OrderHandlerClient;
exports.orderHandler = new OrderHandlerClient(config_1.ENV.orderHandlerWsUrl);
//# sourceMappingURL=orderHandler.js.map