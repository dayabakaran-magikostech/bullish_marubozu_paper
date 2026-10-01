import {
	instrumentsSheet, kiteSheet, apiAccessTokenSheet,
	globalStates, masterSpreadsheetConfigSheet,
	orderLogsSheet, orderTracker,
	marketStore, ENV
} from "./config";

import { runDecisionEngine } from "./index";
import { createLogFilesOnLoggerVM } from "./logger";
import { updateInstrumentPrices } from "./services/instrumentPricesUpdator"
import { notificationHandler } from "./utils/notificationsHandler";
import { TradeManager } from "./model/tradesManager";



export async function initializeTheBot(midCrash: boolean = false) {
	try {

		createLogFilesOnLoggerVM();

		const [instrumentesSheetData, kiteSheetData, apiAccessTokenSheetData, masterSpreadsheetConfigSheetData, orderLogsData] = await Promise.all([
			instrumentsSheet.readInstrumentsMasterSheet(),
			kiteSheet.readKiteToken(),
			apiAccessTokenSheet.readApiAccessTokens(),
			masterSpreadsheetConfigSheet.readIndexConfig(),
			orderLogsSheet.readOrderLogs()
		]);


		if (!instrumentesSheetData.length) {
			console.log("instrumentesSheetData is empty");
			notificationHandler('instrumentes sheet data is empty', { module: 'initializeTheBot', severity: 'High' }, true);
		}

		if (!masterSpreadsheetConfigSheetData.length) {
			console.log("masterSpreadsheetConfigSheetData is empty");
			notificationHandler('masterSpreadsheetConfigSheetData is empty', { module: 'initializeTheBot', severity: 'High' }, true);
		}

		kiteSheetData.forEach((row) => {
			if (!row.ACTIVE) return;
			globalStates.kiteAccounts[row.ACCOUNT] = {
				apiKey: row["API KEY"],
				accessToken: row["ACCESS TOKEN"],
				active: row.ACTIVE,
			};
			if (row.ACCOUNT === ENV.kiteWsAcc) {
				globalStates.kiteApiKey = row["API KEY"];
				globalStates.kiteAccessToken = row["ACCESS TOKEN"];
			}
		});

		marketStore.initializeMarketStore(
			masterSpreadsheetConfigSheetData,
			instrumentesSheetData
		);

		// if (!orderLogsData.length) {
		// 	console.log("orderLogsData is empty");
		// }
		// else if (orderLogsData.length > 0) {
		// 	orderLogsData.forEach(orderRow => {
		// 		const { orderTag, active } = orderRow;
		// 		const newOrder = new TradeManager();
		// 		newOrder.loadTradeFromDb(orderRow);
		// 		orderTracker[orderTag] = newOrder;
		// 	});
		// }

		console.log("Bot initialized successfully");
	}
	catch (error) {
		console.error("[ERROR] Failed to initialize the bot", error);
		throw error
	}
}