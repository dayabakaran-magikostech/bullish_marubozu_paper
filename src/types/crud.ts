export type actionType =
  | "eraseSheetData"
  | "create"
  | "read"
  | "update"
  | "batchUpdate";

interface baseRequest {
  s_name: string;
}

export type crudPayload =
  | { actionType: "eraseSheetData"; data?: null; extraParams?: null }
  | { actionType: "create"; data: Record<string, unknown>[]; extraParams?: null }
  | { actionType: "read"; data?: null; extraParams: { filters: Record<string, unknown>[] } }
  | { actionType: "update"; data: Record<string, unknown>; extraParams: { id: string; colName: string } }
  | { actionType: "batchUpdate"; data: Record<string, Record<string, unknown>>; extraParams: { id: string; cols: string[] } }; 

export type apiRequestBody =
  | (baseRequest & { type: "eraseSheetData" })
  | (baseRequest & { type: "create"; data: Record<string, unknown>[] })
  | (baseRequest & { type: "read"; filters: Record<string, unknown>[] })
  | (baseRequest & { type: "update"; data: Record<string, unknown>; id: string; colName: string })
  | (baseRequest & { type: "batchUpdate"; data: Record<string, Record<string, unknown>>; id: string; cols: string[] });

export interface apiResponse<T = unknown> {
  response_data: T;
}