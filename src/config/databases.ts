import { Database } from "../model/database";
import { ENV } from "./env";

const { liveBotDbUrl, instrumentsSheetName, configMasterUrl, kiteAccountsSheetName, accountSheetName, masterSpreadSheetConfigSheetName, orderLogsSheet: orderLogsSheetName } = ENV;

export const instrumentsSheet = new Database(liveBotDbUrl, instrumentsSheetName);
export const kiteSheet = new Database(configMasterUrl, kiteAccountsSheetName);
export const apiAccessTokenSheet = new Database(configMasterUrl, accountSheetName);
export const masterSpreadsheetConfigSheet = new Database(liveBotDbUrl, masterSpreadSheetConfigSheetName);
export const orderLogsSheet = new Database(liveBotDbUrl, orderLogsSheetName);