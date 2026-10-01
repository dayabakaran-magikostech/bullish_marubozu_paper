"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogFilesOnLoggerVM = createLogFilesOnLoggerVM;
exports.updateEntryDetailsOnSheet = updateEntryDetailsOnSheet;
exports.updateExitDetailsOnSheet = updateExitDetailsOnSheet;
exports.logEntryOrderToDB = logEntryOrderToDB;
exports.logPnlToDB = logPnlToDB;
exports.logActiveOrdersPnl = logActiveOrdersPnl;
const config_1 = require("./config");
const crud_1 = require("./utils/crud");
const loggerUtils_1 = require("./utils/loggerUtils");
const schema_1 = require("./utils/schema");
const helper_1 = require("./utils/helper");
const tradesManager_1 = require("./model/tradesManager");
const instrumentPricesUpdator_1 = require("./services/instrumentPricesUpdator");
function createLogFilesOnLoggerVM() {
    const pnlData = {
        bot: config_1.ENV.botTag,
        filename: 'pnlLogs',
        data: schema_1.pnlLogsHeader,
        type: 'create_file',
    };
    config_1.globalStates.socket.emit('data', pnlData);
    return true;
}
async function updateEntryDetailsOnSheet(tradedAccount, primaryExecutedEntryPrice, primaryEntryOrdersCount, coverExecutedEntryPrice, coverEntryOrdersCount, tag, entrySynthFut, entryPrimaryIv, entryCoverIv) {
    const dataUpdationObj = {
        orderStatus: "entered",
        account: tradedAccount,
        primaryExecutedEntryPrice: primaryExecutedEntryPrice,
        primaryEntryOrdersCount: primaryEntryOrdersCount,
        coverExecutedEntryPrice: coverExecutedEntryPrice,
        coverEntryOrdersCount: coverEntryOrdersCount,
        entrySynthFut,
        entryPrimaryIv,
        entryCoverIv
    };
    const crudRes = await (0, crud_1.crudOperation)(config_1.ENV.liveBotDbUrl, config_1.ENV.orderLogsSheet, {
        actionType: "update",
        data: dataUpdationObj,
        extraParams: {
            id: tag,
            col_name: "orderTag"
        }
    });
    return true;
}
async function updateExitDetailsOnSheet(tag, exitTime, primarySentExitPrice, primaryExecutedExitPrice, primaryExitOrdersCount, coverSentExitPrice, coverExecutedExitPrice, coverExitOrdersCount, postChargesPnl, totalCharges) {
    const dataUpdationObj = {
        orderStatus: "exited",
        exitTime: exitTime,
        primarySentExitPrice,
        primaryExecutedExitPrice,
        primaryExitOrdersCount,
        coverSentExitPrice,
        coverExecutedExitPrice,
        coverExitOrdersCount,
        postChargesPnl,
        totalCharges,
    };
    const crudRes = await (0, crud_1.crudOperation)(config_1.ENV.liveBotDbUrl, config_1.ENV.orderLogsSheet, {
        actionType: "update",
        data: dataUpdationObj,
        extraParams: {
            id: tag,
            col_name: "orderTag"
        }
    });
    return true;
}
async function logEntryOrderToDB(trade) {
    try {
        const tradeData = (0, loggerUtils_1.fromattedTradeData)(trade);
        const crudRes = await (0, crud_1.crudOperation)(config_1.ENV.liveBotDbUrl, config_1.ENV.orderLogsSheet, { actionType: "create", data: tradeData });
        return crudRes;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
}
async function logPnlToDB(tradeData) {
    try {
        const crudRes = await (0, crud_1.crudOperation)(config_1.ENV.liveBotDbUrl, config_1.ENV.pnlLogsSheetName, { actionType: "create", data: tradeData });
        return crudRes;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
}
async function logActiveOrdersPnl() {
    try {
        const optionsInstruments = config_1.marketStore.allOptionTokens;
        if (!optionsInstruments) {
            throw new Error("Nifty option instrument tokens not found");
        }
        const res = await (0, instrumentPricesUpdator_1.updateInstrumentPrices)(optionsInstruments);
        if (res.failedBatches > 0) {
            console.log("Failed to fetch prices of all instruments: ", res);
            for (const orderTag in config_1.orderTracker) {
                (0, tradesManager_1.calculateTheoreticalTheta)(orderTag);
            }
            return;
        }
        const ordersPnlDataArr = [];
        for (const orderTag in config_1.orderTracker) {
            const order = config_1.orderTracker[orderTag];
            // console.dir(order, { depth: null });
            if (!order)
                continue;
            if (order.trade?.active == true) {
                console.log("Logging data for:", orderTag);
                const pnlData = config_1.orderTracker[orderTag]?.calcPnl();
                if (!pnlData) {
                    continue;
                }
                const dataObj = {
                    bot: process.env.BOT_TAG,
                    filename: 'pnlLogs',
                    type: 'add_log',
                    data: Object.values(pnlData),
                };
                config_1.globalStates.socket.emit('data', dataObj);
                console.log("PnL Data for order: ", orderTag, pnlData);
                const posPnl = pnlData.totalPnl;
                // if quote fails for theta pnl, let it add previous available values - but dont calc gap just store the values
                // const theoreticalThetaPnl = calculateTheoreticalTheta(orderTag);
                const theoreticalThetaPnl = order.trade.theoreticalThetaPnl;
                console.log("Theoretical theta pnl: ", theoreticalThetaPnl, " order pnl: ", posPnl);
                const gap = posPnl - theoreticalThetaPnl;
                order.trade.gap = gap;
                let hwm = order.trade.hwm;
                const entryTime = order.trade.entryTime;
                const qty = order.trade.primaryOrderData.qty;
                // store max gap as hwm
                if (gap > hwm) {
                    order.trade.hwm = gap;
                    hwm = gap;
                }
                if ((0, helper_1.isOlderThanMinutes)(entryTime, config_1.tradeConfig.graceMinutes)) {
                    // check hard stop condition -> and exit
                    const hardStop = config_1.tradeConfig.hardStop * qty * -1;
                    const trailStop = config_1.tradeConfig.trailStop * qty;
                    if (gap < hardStop) {
                        // if (gap < 0) {
                        console.log("Gap < hardstop");
                        order.trade.orderStatus = "exitSent";
                        order.trade.active = false;
                        order.exitTrade();
                        // add exit reason
                    }
                    else if (hwm > (config_1.tradeConfig.minHwmToTrail) && gap < (hwm - trailStop)) {
                        console.log("Trail stop");
                        order.trade.orderStatus = "exitSent";
                        order.trade.active = false;
                        order.exitTrade();
                        // add exit reason
                    }
                }
                const nextTheoreticalTheta = (0, tradesManager_1.calculateTheoreticalTheta)(orderTag);
                const pnlObj = {
                    orderTag,
                    theoreticalThetaPnl: nextTheoreticalTheta,
                    postChargesPnl: posPnl,
                    gap,
                    hwm
                };
                ordersPnlDataArr.push([pnlObj]);
            }
        }
        if (ordersPnlDataArr.length > 0) {
            logPnlToDB(ordersPnlDataArr);
        }
    }
    catch (error) {
        console.log("Error occurred while generating pnl logs: ", error);
    }
}
//# sourceMappingURL=logger.js.map