import dotenv from "dotenv";
dotenv.config();

function validateEnv(value: string | undefined, key: string): string {
    if (!value) throw new Error(`Missing environment variable: ${key}`);
    return value;
}


const port = validateEnv(process.env.PORT, "PORT");
const liveBotDbUrl = validateEnv(process.env.LIVE_BOT_DB_URL, "LIVE_BOT_DB_URL");
const instrumentsSheetName = validateEnv(process.env.INSTRUMENTS_SHEET_NAME, "INSTRUMENTS_SHEET_NAME");
const masterSpreadSheetConfigSheetName = validateEnv(process.env.MASTER_SPREADSHEET_CONFIG_SHEET_NAME, "MASTER_SPREADSHEET_CONFIG_SHEET_NAME");
const configMasterUrl = validateEnv(process.env.CONFIG_MASTER_URL, "CONFIG_MASTER_URL");
const kiteAccountsSheetName = validateEnv(process.env.KITE_ACCOUNTS_SHEET_NAME, "KITE_ACCOUNTS_SHEET_NAME");
const accountSheetName = validateEnv(process.env.ACCOUNTS_SHEET_NAME, "ACCOUNTS");
const kiteWsAcc = validateEnv(process.env.KITE_WS_ACC, "KITE_WS_ACC");
const orderLogsSheet = validateEnv(process.env.ORDER_LOGS_SHEET, "ORDER_LOGS_SHEET");



export const ENV = {
    port,
    liveBotDbUrl,
    instrumentsSheetName,
    configMasterUrl,
    kiteAccountsSheetName,
    accountSheetName,
    masterSpreadSheetConfigSheetName,
    kiteWsAcc,
    orderLogsSheet
} as const;