import {
    instrumentsMaster, RawInstrumentsMasterRow, RawAccountRow,
    ApiAccessToken, KiteApiToken, AccountDataSheet,
    IndexConfig, RawIndexConfigRow
} from "../types/sheets";
import { crudOperation } from "../utils/crud";
import { placeOrderData } from "../types/logger";

export class Database {
    private readonly url: string;
    private readonly sheetName: string;

    constructor(url: string, sheetName: string) {
        this.url = url;
        this.sheetName = sheetName;
    }

    private async read<T, R extends object>(sheetName: string, transformer: (data: R[]) => T[]): Promise<T[]> {
        try {
            const sheetData = await crudOperation(
                this.url,
                sheetName,
                {
                    actionType: "read",
                    extraParams: {
                        filters: [{ filterType: "simple" }]
                    }
                }
            );
            const sheetDataTyped = sheetData as R[];
            return transformer(sheetDataTyped);
        } catch (e) {
            throw new Error(`Error reading the sheets: ${String(e)}`);
        }
    }

    public readInstrumentsMasterSheet = (): Promise<instrumentsMaster[]> => {
        return this.read<instrumentsMaster, RawInstrumentsMasterRow>(this.sheetName, this.transformToInstrumentsMaster);
    };


    private transformToInstrumentsMaster(data: RawInstrumentsMasterRow[]): instrumentsMaster[] {
        if (!Array.isArray(data)) return [];
        return data.map(item => ({
            id: Number(item.id),
            tradingsymbol: item.tradingsymbol,
            type: item.type,
            strike_price: Number(item.strike_price),
            expiry_date: item.expiry_date,
            instrument_token: Number(item.instrument_token),
            exchange_token: Number(item.exchange_token),
            lot_size: Number(item.lot_size),
            security: item.security,
            tick_size: Number(item.tick_size),
            created_at: item.created_at,
        }));
    }

    public readAccountPrioritySheet = (): Promise<AccountDataSheet[]> => {
        return this.read<AccountDataSheet, RawAccountRow>(this.sheetName, this.transformAccountPriority);
    }

    public readApiAccessTokens = async (): Promise<ApiAccessToken[]> => {
        try {
            const sheetData = await crudOperation(
                this.url,
                this.sheetName,
                {
                    actionType: "read",
                    extraParams: {
                        filters: [{ filterType: "none" }]
                    }
                }
            );
            return sheetData as ApiAccessToken[];
        } catch (error) {
            console.error(`[Dhan Access Token] Failed to fetch sheet "${this.sheetName}"`, error);
            throw new Error(`Dhan Access Token read failed for "${this.sheetName}": ${(error as Error).message}`);
        }
    }

    public readKiteToken = async (): Promise<KiteApiToken[]> => {
        try {
            const sheetData = await crudOperation(
                this.url,
                this.sheetName,
                {
                    actionType: "read",
                    extraParams: {
                        filters: [{ filterType: "none" }]
                    }
                }
            );
            return sheetData as KiteApiToken[];
        } catch (error) {
            console.error(`[KITE Access Token] Failed to fetch sheet "${this.sheetName}"`, error);
            throw new Error(`KITE Access Token read failed for "${this.sheetName}": ${(error as Error).message}`);
        }
    }

    public readIndexConfig = async (): Promise<IndexConfig[]> => {
        try {
            const sheetData = await crudOperation(
                this.url,
                this.sheetName,
                {
                    actionType: "read",
                    extraParams: {
                        filters: [{ filterType: "none" }]
                    }
                }
            );
            return sheetData as IndexConfig[];
        } catch (error) {
            console.error(`[Master spreadsheet config] Failed to fetch sheet "${this.sheetName}"`, error);
            throw new Error(`Master spreadsheet config read failed for "${this.sheetName}": ${(error as Error).message}`);
        }
    }

    private transformAccountPriority(data: RawAccountRow[]): AccountDataSheet[] {
        if (!Array.isArray(data)) return [];

        return data
            .filter(item => item !== null && item !== undefined)
            .map(item => {
                return {
                    id: Number(item.id),
                    account: String(item.account).trim(),
                    broker: String(item.broker).toUpperCase().trim(),
                    createdAt: String(item.createdAt).trim()
                };
            })
            .filter(accountObj => accountObj.account !== "");
    }

    public readOrderLogs = async (): Promise<placeOrderData[]> => {
        try {
            const sheetData = await crudOperation(
                this.url,
                this.sheetName,
                {
                    actionType: "read",
                    extraParams: {
                        filters: [{ filterType: "none" }]
                    }
                }
            );
            return sheetData as placeOrderData[];
        } catch (error) {
            console.error(`[Order Logs] Failed to fetch sheet "${this.sheetName}"`, error);
            throw new Error(`Order Logs read failed for "${this.sheetName}": ${(error as Error).message}`);
        }
    }

}