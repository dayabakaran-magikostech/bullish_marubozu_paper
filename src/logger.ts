import { ENV, globalStates, orderTracker, tradeConfig, marketStore } from "./config";
import { LoggerVMData } from "./types/logger";
import { ActiveTradeData } from "./types/trade";
import { crudOperation } from "./utils/crud";
import { fromattedTradeData } from "./utils/loggerUtils";
import { pnlLogsHeader } from "./utils/schema";
import { isOlderThanMinutes } from "./utils/helper";
import { calculateTheoreticalTheta } from "./model/tradesManager";
import { updateInstrumentPrices } from "./services/instrumentPricesUpdator";

export function createLogFilesOnLoggerVM(): boolean {
	const pnlData: LoggerVMData = {
		bot: ENV.botTag,
		filename: 'pnlLogs',
		data: pnlLogsHeader,
		type: 'create_file',
	};

	globalStates.socket.emit('data', pnlData);
	return true;
}

export async function updateEntryDetailsOnSheet(
	tradedAccount: string, primaryExecutedEntryPrice: number,
	primaryEntryOrdersCount: number, coverExecutedEntryPrice: number,
	coverEntryOrdersCount: number, tag: string
): Promise<boolean> {

	const dataUpdationObj = {
		orderStatus: "entered",
		account: tradedAccount,
		primaryExecutedEntryPrice: primaryExecutedEntryPrice,
		primaryEntryOrdersCount: primaryEntryOrdersCount,
		coverExecutedEntryPrice: coverExecutedEntryPrice,
		coverEntryOrdersCount: coverEntryOrdersCount,
	}

	const crudRes = await crudOperation(
		ENV.liveBotDbUrl, ENV.orderLogsSheet,
		{
			actionType: "update",
			data: dataUpdationObj as any,
			extraParams: {
				id: tag,
				col_name: "orderTag"
			}
		}
	);

	return true;
}

export async function updateExitDetailsOnSheet(
	tag: string,
	exitTime: string,
	primarySentExitPrice: number,
	primaryExecutedExitPrice: number,
	primaryExitOrdersCount: number,
	coverSentExitPrice: number,
	coverExecutedExitPrice: number,
	coverExitOrdersCount: number,
	postChargesPnl: number,
	totalCharges: number,
): Promise<boolean> {

	const dataUpdationObj = {
		orderStatus: "exited",
		exitTime: exitTime,
		primarySentExitPrice,
		primaryExecutedExitPrice,
		primaryExitOrdersCount,
		coverSentExitPrice,
		coverExecutedExitPrice,
		coverExitOrdersCount,
		postChargesPnl,
		totalCharges,
	}

	const crudRes = await crudOperation(
		ENV.liveBotDbUrl, ENV.orderLogsSheet,
		{
			actionType: "update",
			data: dataUpdationObj as any,
			extraParams: {
				id: tag,
				col_name: "orderTag"
			}
		}
	);

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

		const optionsInstruments = marketStore.allOptionTokens;
		if (!optionsInstruments) { throw new Error("Nifty option instrument tokens not found"); }
		const res = await updateInstrumentPrices(optionsInstruments);
		if (res.failedBatches > 0) {
			console.log("Failed to fetch prices of all instruments: ", res);
			for (const orderTag in orderTracker) {
				calculateTheoreticalTheta(orderTag);
			}
			return;
		}

		for (const orderTag in orderTracker) {
			const order = orderTracker[orderTag];
			// console.dir(order, { depth: null });
			if (!order) continue;
			if (order.trade?.active == true) {
				console.log("Logging data for:", orderTag);
				const pnlData = orderTracker[orderTag]?.calcPnl();
				if (!pnlData) { continue; }
				const dataObj: LoggerVMData = {
					bot: process.env.BOT_TAG,
					filename: 'pnlLogs',
					type: 'add_log',
					data: Object.values(pnlData),
				};
				globalStates.socket.emit('data', dataObj);
				console.log("PnL Data for order: ", orderTag, pnlData);
				const posPnl = pnlData.totalPnl;

				// if quote fails for theta pnl, let it add previous available values - but dont calc gap just store the values

				// const theoreticalThetaPnl = calculateTheoreticalTheta(orderTag);
				const theoreticalThetaPnl = order.trade.theoreticalThetaPnl;

				console.log("Theoretical theta pnl: ", theoreticalThetaPnl, " order pnl: ", posPnl);
				const gap = posPnl - theoreticalThetaPnl;
				order.trade.gap = gap;
				let hwm = order.trade.hwm;
				const entryTime = order.trade.entryTime;
				const qty = order.trade.primaryOrderData.qty;

				// store max gap as hwm
				if (gap > hwm) {
					order.trade.hwm = gap;
					hwm = gap;
				}

				if (isOlderThanMinutes(entryTime, tradeConfig.graceMinutes)) {
					// check hard stop condition -> and exit
					const hardStop = tradeConfig.hardStop * qty! * -1;
					const trailStop = tradeConfig.trailStop * qty!;

					if (gap < hardStop) {
						// if (gap < 0) {
						console.log("Gap < hardstop");
						order.trade.orderStatus = "exitSent";
						order.trade.active = false;
						order.exitTrade();
						// add exit reason
					}
					else if (hwm > (tradeConfig.minHwmToTrail) && gap < (hwm - trailStop)) {
						console.log("Trail stop");
						order.trade.orderStatus = "exitSent";
						order.trade.active = false;
						order.exitTrade();
						// add exit reason
					}
				}

				calculateTheoreticalTheta(orderTag);
			}
		}
	}
	catch (error) {
		console.log("Error occurred while generating pnl logs: ", error);
	}
}