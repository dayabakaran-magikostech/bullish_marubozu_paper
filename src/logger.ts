import { ENV } from "./config";
import { ActiveTradeData } from "./types/trade";
import { crudOperation } from "./utils/crud";
import { fromattedTradeData } from "./utils/loggerUtils";


export async function logEntryOrderToDB(trade: ActiveTradeData): Promise<any> {
	try {
		const tradeData = fromattedTradeData(trade);
		const crudRes = await crudOperation(ENV.liveBotDbUrl, ENV.orderLogsSheet, { actionType: "create", data: tradeData as any });
		return crudRes;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
	}
}

