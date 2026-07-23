"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const crud_1 = require("../utils/crud");
class Database {
    constructor(url, sheetName) {
        this.readInstrumentsMasterSheet = () => {
            return this.read(this.sheetName, this.transformToInstrumentsMaster);
        };
        this.readAccountPrioritySheet = () => {
            return this.read(this.sheetName, this.transformAccountPriority);
        };
        this.readApiAccessTokens = async () => {
            try {
                const sheetData = await (0, crud_1.crudOperation)(this.url, this.sheetName, {
                    actionType: "read",
                    extraParams: {
                        filters: [{ filterType: "none" }]
                    }
                });
                return sheetData;
            }
            catch (error) {
                console.error(`[Dhan Access Token] Failed to fetch sheet "${this.sheetName}"`, error);
                throw new Error(`Dhan Access Token read failed for "${this.sheetName}": ${error.message}`);
            }
        };
        this.readKiteToken = async () => {
            try {
                const sheetData = await (0, crud_1.crudOperation)(this.url, this.sheetName, {
                    actionType: "read",
                    extraParams: {
                        filters: [{ filterType: "none" }]
                    }
                });
                return sheetData;
            }
            catch (error) {
                console.error(`[KITE Access Token] Failed to fetch sheet "${this.sheetName}"`, error);
                throw new Error(`KITE Access Token read failed for "${this.sheetName}": ${error.message}`);
            }
        };
        this.readIndexConfig = async () => {
            try {
                const sheetData = await (0, crud_1.crudOperation)(this.url, this.sheetName, {
                    actionType: "read",
                    extraParams: {
                        filters: [{ filterType: "none" }]
                    }
                });
                return sheetData;
            }
            catch (error) {
                console.error(`[Master spreadsheet config] Failed to fetch sheet "${this.sheetName}"`, error);
                throw new Error(`Master spreadsheet config read failed for "${this.sheetName}": ${error.message}`);
            }
        };
        this.url = url;
        this.sheetName = sheetName;
    }
    async read(sheetName, transformer) {
        try {
            const sheetData = await (0, crud_1.crudOperation)(this.url, sheetName, {
                actionType: "read",
                extraParams: {
                    filters: [{ filterType: "simple" }]
                }
            });
            const sheetDataTyped = sheetData;
            return transformer(sheetDataTyped);
        }
        catch (e) {
            throw new Error(`Error reading the sheets: ${String(e)}`);
        }
    }
    transformToInstrumentsMaster(data) {
        if (!Array.isArray(data))
            return [];
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
    transformAccountPriority(data) {
        if (!Array.isArray(data))
            return [];
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
}
exports.Database = Database;
//# sourceMappingURL=database.js.map