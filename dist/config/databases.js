"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.masterSpreadsheetConfigSheet = exports.apiAccessTokenSheet = exports.kiteSheet = exports.instrumentsSheet = void 0;
const database_1 = require("../model/database");
const env_1 = require("./env");
const { liveBotDbUrl, instrumentsSheetName, configMasterUrl, kiteAccountsSheetName, accountSheetName, masterSpreadSheetConfigSheetName } = env_1.ENV;
exports.instrumentsSheet = new database_1.Database(liveBotDbUrl, instrumentsSheetName);
exports.kiteSheet = new database_1.Database(configMasterUrl, kiteAccountsSheetName);
exports.apiAccessTokenSheet = new database_1.Database(configMasterUrl, accountSheetName);
exports.masterSpreadsheetConfigSheet = new database_1.Database(liveBotDbUrl, masterSpreadSheetConfigSheetName);
//# sourceMappingURL=databases.js.map