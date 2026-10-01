import { instrumentsMaster, ApiAccessToken, KiteApiToken, AccountDataSheet, IndexConfig } from "../types/sheets";
import { placeOrderData } from "../types/logger";
export declare class Database {
    private readonly url;
    private readonly sheetName;
    constructor(url: string, sheetName: string);
    private read;
    readInstrumentsMasterSheet: () => Promise<instrumentsMaster[]>;
    private transformToInstrumentsMaster;
    readAccountPrioritySheet: () => Promise<AccountDataSheet[]>;
    readApiAccessTokens: () => Promise<ApiAccessToken[]>;
    readKiteToken: () => Promise<KiteApiToken[]>;
    readIndexConfig: () => Promise<IndexConfig[]>;
    private transformAccountPriority;
    readOrderLogs: () => Promise<placeOrderData[]>;
}
//# sourceMappingURL=database.d.ts.map