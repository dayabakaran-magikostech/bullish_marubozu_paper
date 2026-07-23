"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crudOperation = crudOperation;
async function crudOperation(url, sName, payload) {
    let requestData;
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
                colName: payload.extraParams.colName,
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
            const _exhaustiveCheck = payload;
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
        const json = await response.json();
        return json.response_data;
    }
    else {
        return await response.text();
    }
}
//# sourceMappingURL=crud.js.map