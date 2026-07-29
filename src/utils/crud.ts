import { crudPayload, apiRequestBody, apiResponse } from "../types/crud";

export async function crudOperation<T = unknown>(
  url: string,
  sName: string,
  payload: Extract<crudPayload, { actionType: "read" }>
): Promise<T>;

export async function crudOperation(
  url: string,
  sName: string,
  payload: Exclude<crudPayload, { actionType: "read" }>
): Promise<string>;

export async function crudOperation(
  url: string,
  sName: string,
  payload: crudPayload
): Promise<unknown> {
  let requestData: apiRequestBody;

  switch (payload.actionType) {
    case 'eraseSheetData':
      requestData = { type: payload.actionType, s_name: sName };
      break;

    case 'create':
      requestData = { type: payload.actionType, s_name: sName, data: payload.data };
      break;

    case 'read':
      requestData = { type: payload.actionType, s_name: sName, filters: payload.extraParams.filters };
      break;

    case 'update':
      requestData = {
        type: payload.actionType,
        s_name: sName,
        data: payload.data,
        id: payload.extraParams.id,
        col_name: payload.extraParams.col_name,
      };
      break;

    case 'batchUpdate':
      requestData = {
        type: payload.actionType,
        s_name: sName,
        data: payload.data,
        id: payload.extraParams.id,
        cols: payload.extraParams.cols,
      };
      break;

    default:
      const _exhaustiveCheck: never = payload;
      throw new Error(`Invalid actionType: ${_exhaustiveCheck}`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    throw new Error(`Request Failed: ${response.status} ${response.statusText}`);
  }

  if (payload.actionType === 'read') {
    const json: apiResponse = await response.json();
    return json.response_data;
  } else {
    return await response.text();
  }
}