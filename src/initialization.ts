import {
	instrumentsSheet, kiteSheet, apiAccessTokenSheet,
	globalStates, masterSpreadsheetConfigSheet,
	marketStore, ENV
} from "./config";

import { runDecisionEngine } from "./index";
import { updateInstrumentPrices } from "./services/instrumentPricesUpdator"



export async function initializeTheBot(midCrash: boolean = false) {
	try {
		const [instrumentesSheetData, kiteSheetData, apiAccessTokenSheetData, masterSpreadsheetConfigSheetData] = await Promise.all([
			instrumentsSheet.readInstrumentsMasterSheet(),
			kiteSheet.readKiteToken(),
			apiAccessTokenSheet.readApiAccessTokens(),
			masterSpreadsheetConfigSheet.readIndexConfig()
		]);

		//TODO: ping error if any sheet is empty

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

		console.log("Bot initialized successfully");

		//TODO: remove all auto entries
		// runDecisionEngine();
	}
	catch (error) {
		console.error("[ERROR] Failed to initialize the bot", error);
		throw error;
	}
}