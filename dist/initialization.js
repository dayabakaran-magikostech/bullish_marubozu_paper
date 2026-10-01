"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTheBot = initializeTheBot;
const config_1 = require("./config");
const logger_1 = require("./logger");
const notificationsHandler_1 = require("./utils/notificationsHandler");
async function initializeTheBot(midCrash = false) {
    try {
        (0, logger_1.createLogFilesOnLoggerVM)();
        const [instrumentesSheetData, kiteSheetData, apiAccessTokenSheetData, masterSpreadsheetConfigSheetData, orderLogsData] = await Promise.all([
            config_1.instrumentsSheet.readInstrumentsMasterSheet(),
            config_1.kiteSheet.readKiteToken(),
            config_1.apiAccessTokenSheet.readApiAccessTokens(),
            config_1.masterSpreadsheetConfigSheet.readIndexConfig(),
            config_1.orderLogsSheet.readOrderLogs()
        ]);
        if (!instrumentesSheetData.length) {
            console.log("instrumentesSheetData is empty");
            (0, notificationsHandler_1.notificationHandler)('instrumentes sheet data is empty', { module: 'initializeTheBot', severity: 'High' }, true);
        }
        if (!masterSpreadsheetConfigSheetData.length) {
            console.log("masterSpreadsheetConfigSheetData is empty");
            (0, notificationsHandler_1.notificationHandler)('masterSpreadsheetConfigSheetData is empty', { module: 'initializeTheBot', severity: 'High' }, true);
        }
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
        throw error;
    }
}
//# sourceMappingURL=initialization.js.map