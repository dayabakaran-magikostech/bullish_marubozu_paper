import { OptionInstrument, OptionStrike, OptionType } from "../types/market";
export declare function buildKiteQuoteUrls(instruments: number[], batchSize?: number): string[];
export declare function buildKiteAuthHeaders(): string[];
export declare function getDaysRem(OPTION_END_DATE: string): number;
export declare function getCalculatedDTE(): number;
export declare function normalizeIndexName(value: string): string;
export declare function normalizeDate(value: string): string;
export declare function normalizeOptionType(value: string): OptionType;
export declare function getNearestStrike(index: string, target: number): number | null;
export declare function isOlderThanMinutes(datetime: string, minutes: number): boolean;
export declare function calculateStrikeSynthFut(strike: OptionStrike): number | null;
export declare function getOptionPrice(option: OptionInstrument | undefined): number | null;
export declare function getNearestPutDeltaOption(index: string, targetDelta: number): OptionInstrument | null;
export declare function getCurrTimeStamp(currentDate: Date | null): string;
export declare function getOrderTagDateSuffix(datetime: string): string;
//# sourceMappingURL=helper.d.ts.map