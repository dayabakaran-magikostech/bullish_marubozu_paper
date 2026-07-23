import { IndexMarketData } from "../types/market";
import { RawIndexConfigRow, RawInstrumentsMasterRow } from "../types/sheets";
export declare class MarketStore {
    indexes: Record<string, IndexMarketData>;
    allOptionTokens: number[];
    initializeMarketStore(indexRows: RawIndexConfigRow[], instrumentRows: RawInstrumentsMasterRow[]): void;
    resetMarketStore(): void;
    loadIndexConfig(indexRows: RawIndexConfigRow[]): void;
    loadOptionInstruments(instrumentRows: RawInstrumentsMasterRow[]): void;
    sortStrikesArr(): void;
}
//# sourceMappingURL=marketStore.d.ts.map