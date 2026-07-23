import { crudPayload } from "../types/crud";
export declare function crudOperation<T = unknown>(url: string, sName: string, payload: Extract<crudPayload, {
    actionType: "read";
}>): Promise<T>;
export declare function crudOperation(url: string, sName: string, payload: Exclude<crudPayload, {
    actionType: "read";
}>): Promise<string>;
//# sourceMappingURL=crud.d.ts.map