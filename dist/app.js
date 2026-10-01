"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const initialization_1 = require("./initialization");
const config_1 = require("./config");
const index_1 = require("./index");
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("./logger");
const helper_1 = require("./utils/helper");
const app = (0, express_1.default)();
const PORT = env_1.ENV.port;
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Bullish Marubozu Bot is running");
});
app.get("/getMarketStore", async (req, res) => {
    res.status(200).json(config_1.marketStore);
});
app.get("/getOrderTracker", async (req, res) => {
    res.status(200).json(config_1.orderTracker);
});
app.get("/getInstrumentsState", async (req, res) => {
    res.status(200).json(config_1.instrumentStates);
});
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // await orderHandler.connect();
    // notificationHandler('instrumentes sheet data is empty', { module: 'initializeTheBot', severity: 'High' }, true);
    await (0, initialization_1.initializeTheBot)();
    // await runDecisionEngine();
    // await delay(15000);
    // globalStates.pnlLoggingInterval = setInterval(logActiveOrdersPnl, generalConfig.pnlLoggingFreq);
});
node_cron_1.default.schedule('02 9 * * 1-5', function () {
    (0, initialization_1.initializeTheBot)();
}, {
    timezone: 'Asia/Kolkata',
});
node_cron_1.default.schedule('00 15 10 * * 1-5', async function () {
    console.log('Bot started: ' + (0, helper_1.getCurrTimeStamp)(new Date));
    config_1.globalStates.marketOpen = true;
    await (0, index_1.runDecisionEngine)();
    config_1.globalStates.mainProcessInterval = setInterval(index_1.runDecisionEngine, config_1.generalConfig.mainProcessFreq);
    // pnl -> 1 min
    // opp check -> 1 hour
}, {
    timezone: 'Asia/Kolkata',
});
node_cron_1.default.schedule('00 16 09 * * 1-5', async function () {
    console.log('PNL logging started: ' + (0, helper_1.getCurrTimeStamp)(new Date));
    (0, logger_1.logActiveOrdersPnl)();
    config_1.globalStates.pnlLoggingInterval = setInterval(logger_1.logActiveOrdersPnl, config_1.generalConfig.pnlLoggingFreq);
});
node_cron_1.default.schedule('00 20 15 * * 1-5', async function () {
    console.log('Stopping the bot: ' + (0, helper_1.getCurrTimeStamp)(new Date));
    config_1.globalStates.pnlLoggingInterval = null;
    config_1.globalStates.mainProcessInterval = null;
});
// stop bot after 3:35 - for exits
// pnl and theoretical pnl till 3:40
// last entry - 3:15
//# sourceMappingURL=app.js.map