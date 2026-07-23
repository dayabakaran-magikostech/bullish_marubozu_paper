"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTheBot = initializeTheBot;
const config_1 = require("./config");
async function initializeTheBot(midCrash = false) {
    try {
        const [instrumentesSheetData, kiteSheetData, apiAccessTokenSheetData, masterSpreadsheetConfigSheetData] = await Promise.all([
            config_1.instrumentsSheet.readInstrumentsMasterSheet(),
            config_1.kiteSheet.readKiteToken(),
            config_1.apiAccessTokenSheet.readApiAccessTokens(),
            config_1.masterSpreadsheetConfigSheet.readIndexConfig()
        ]);
        //TODO: ping error if any sheet is empty
        kiteSheetData.forEach((row) => {
            if (!row.ACTIVE)
                return;
            config_1.globalStates.kiteAccounts[row.ACCOUNT] = {
                apiKey: row["API KEY"],
                accessToken: row["ACCESS TOKEN"],
                active: row.ACTIVE,
            };
            if (row.ACCOUNT === config_1.ENV.kiteWsAcc) {
                config_1.globalStates.kiteApiKey = row["API KEY"];
                config_1.globalStates.kiteAccessToken = row["ACCESS TOKEN"];
            }
        });
        config_1.marketStore.initializeMarketStore(masterSpreadsheetConfigSheetData, instrumentesSheetData);
        console.log("Bot initialized successfully");
        //TODO: remove all auto entries
        // runDecisionEngine();
    }
    catch (error) {
        console.error("[ERROR] Failed to initialize the bot", error);
        throw error;
    }
}
//# sourceMappingURL=initialization.js.map