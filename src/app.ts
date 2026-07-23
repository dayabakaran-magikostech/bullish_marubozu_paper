import express, { Request, Response } from "express";
import { ENV } from "./config/env";
import { initializeTheBot } from "./initialization";
import { marketStore, globalStates, generalConfig, instrumentStates } from "./config";
import { runDecisionEngine } from "./index";
import cron from 'node-cron';

const app = express();
const PORT = ENV.port;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
	res.send("Bullish Marubozu Bot is running");
});

app.get("/getMarketStore", async (req: Request, res: Response) => {
	res.status(200).json(marketStore);
});

app.get("/getInstrumentsState", async (req: Request, res: Response) => {
	res.status(200).json(instrumentStates);
});

app.listen(PORT, async () => {
	console.log(`Server running on port ${PORT}`);
	// await initializeTheBot(true);
	initializeTheBot();
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
		console.log('Bot started');
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