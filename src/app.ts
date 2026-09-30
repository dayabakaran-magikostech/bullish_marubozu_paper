import express, { Request, Response } from "express";
import { ENV } from "./config/env";
import { initializeTheBot } from "./initialization";
import { marketStore, globalStates, generalConfig, instrumentStates, orderTracker } from "./config";
import { runDecisionEngine } from "./index";
import cron from 'node-cron';
import { orderHandler } from "./model/orderHandler";
import { logActiveOrdersPnl } from "./logger";
import { delay, getCurrTimeStamp } from "./utils/helper";
import { notificationHandler } from "./utils/notificationsHandler";

const app = express();
const PORT = ENV.port;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
	res.send("Bullish Marubozu Bot is running");
});

app.get("/getMarketStore", async (req: Request, res: Response) => {
	res.status(200).json(marketStore);
});

app.get("/getOrderTracker", async (req: Request, res: Response) => {
	res.status(200).json(orderTracker);
});

app.get("/getInstrumentsState", async (req: Request, res: Response) => {
	res.status(200).json(instrumentStates);
});

app.listen(PORT, async () => {
	console.log(`Server running on port ${PORT}`);
	await orderHandler.connect();


	// notificationHandler('instrumentes sheet data is empty', { module: 'initializeTheBot', severity: 'High' }, true);

	// await initializeTheBot();
	// await runDecisionEngine();

	// await delay(15000);
	// globalStates.pnlLoggingInterval = setInterval(logActiveOrdersPnl, generalConfig.pnlLoggingFreq);
});


cron.schedule('02 9 * * 1-5',
	function () {
		initializeTheBot();
	},
	{
		timezone: 'Asia/Kolkata',
	}
);

cron.schedule(
	'00 15 10 * * 1-5',
	async function () {
		console.log('Bot started: ' + getCurrTimeStamp(new Date));
		globalStates.marketOpen = true;
		await runDecisionEngine();
		globalStates.mainProcessInterval = setInterval(runDecisionEngine, generalConfig.mainProcessFreq);
		// pnl -> 1 min
		// opp check -> 1 hour
	},
	{
		timezone: 'Asia/Kolkata',
	}
);

cron.schedule(
	'00 16 09 * * 1-5',
	async function () {
		console.log('PNL logging started: ' + getCurrTimeStamp(new Date));
		logActiveOrdersPnl();
		globalStates.pnlLoggingInterval = setInterval(logActiveOrdersPnl, generalConfig.pnlLoggingFreq);
	}
)

cron.schedule(
	'00 20 15 * * 1-5',
	async function () {
		console.log('Stopping the bot: ' + getCurrTimeStamp(new Date));
		globalStates.pnlLoggingInterval = null;
		globalStates.mainProcessInterval = null;
	}
)

//stop bot after 3:35
//