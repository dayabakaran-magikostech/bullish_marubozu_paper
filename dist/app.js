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
const app = (0, express_1.default)();
const PORT = env_1.ENV.port;
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Bullish Marubozu Bot is running");
});
app.get("/getMarketStore", async (req, res) => {
    res.status(200).json(config_1.marketStore);
});
app.get("/getInstrumentsState", async (req, res) => {
    res.status(200).json(config_1.instrumentStates);
});
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // await initializeTheBot(true);
    (0, initialization_1.initializeTheBot)();
});
node_cron_1.default.schedule('02 9 * * 1-5', function () {
    (0, initialization_1.initializeTheBot)();
}, {
    timezone: 'Asia/Kolkata',
});
node_cron_1.default.schedule('00 15 10 * * 1-5', async function () {
    console.log('Bot started');
    config_1.globalStates.marketOpen = true;
    await (0, index_1.runDecisionEngine)();
    config_1.globalStates.mainProcessInterval = setInterval(index_1.runDecisionEngine, config_1.generalConfig.mainProcessFreq);
    // pnl -> 1 min
    // opp check -> 1 hour
}, {
    timezone: 'Asia/Kolkata',
});
//# sourceMappingURL=app.js.map