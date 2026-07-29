import { ENV, globalStates, orderTracker } from "./config";
import { LoggerVMData } from "./types/logger";
import { ActiveTradeData } from "./types/trade";
import { crudOperation } from "./utils/crud";
import { fromattedTradeData } from "./utils/loggerUtils";
import { pnlLogsHeader } from "./utils/schema";

export function createLogFilesOnLoggerVM(): boolean {
	const placeOrderData: LoggerVMData = {
		bot: ENV.botTag,
		filename: 'placeOrderLogs',
		data: pnlLogsHeader,
		type: 'create_file',
	};

	globalStates.socket.emit('data', placeOrderData);
	return true;
}


export async function logEntryOrderToDB(trade: ActiveTradeData): Promise<any> {
	try {
		const tradeData = fromattedTradeData(trade);
		const crudRes = await crudOperation(ENV.liveBotDbUrl, ENV.orderLogsSheet, { actionType: "create", data: tradeData as any });
		return crudRes;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
	}
}



export async function logActiveOrdersPnl() {
	try {
		const pnlOrdersData = [];
		for (const orderTag in orderTracker) {
			const order = orderTracker[orderTag];
			if (!order) continue;
			if (order.trade?.active == true) {
				const pnlData = orderTracker[orderTag]?.calcPnl();
				if (!pnlData) { continue; }
				const dataObj: LoggerVMData = {
					bot: process.env.BOT_TAG,
					filename: 'placeOrderLogs',
					type: 'add_log',
					data: Object.values(pnlData),
				};
				globalStates.socket.emit('data', dataObj);
			}
		}
	}
	catch (error) {
		console.log("Error occurred while generating pnl logs: ", error);
	}
}