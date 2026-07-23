"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logEntryOrderToDB = logEntryOrderToDB;
const config_1 = require("./config");
const crud_1 = require("./utils/crud");
const loggerUtils_1 = require("./utils/loggerUtils");
async function logEntryOrderToDB(trade) {
    try {
        const tradeData = (0, loggerUtils_1.fromattedTradeData)(trade);
        const crudRes = await (0, crud_1.crudOperation)(config_1.ENV.liveBotDbUrl, config_1.ENV.orderLogsSheet, { actionType: "create", data: tradeData });
        return crudRes;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
}
//# sourceMappingURL=logger.js.map