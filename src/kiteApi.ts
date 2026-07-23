import axios from "axios"

import { KiteApiResponse, GetQuotesResult } from "./types/kite";


// export async function getQuotes(authToken: string, quote_url: string): Promise<{ status: boolean, data?: [any] }> {
// 	try {
// 		const { data: response } = await axios.get(
// 			`${quote_url}`,
// 			{
// 				headers: {
// 					"X-Kite-Version": "3",
// 					Authorization: authToken,
// 				},
// 			}
// 		);
// 		const data = await response["data"];
// 		return { status: true, data };
// 	} catch (error) {
// 		return { status: false };
// 	}
// }

const quotes = {
	"13145346": {
		"instrument_token": 13145346,
		"timestamp": "2021-06-08 15:45:56",
		"last_trade_time": "2021-06-08 15:45:52",
		"last_price": 1412.95,
		"last_quantity": 5,
		"buy_quantity": 0,
		"sell_quantity": 5191,
		"volume": 7360198,
		"average_price": 1412.47,
		"oi": 0,
		"oi_day_high": 0,
		"oi_day_low": 0,
		"net_change": 0,
		"lower_circuit_limit": 1250.7,
		"upper_circuit_limit": 1528.6,
		"ohlc": {
			"open": 1396,
			"high": 1421.75,
			"low": 1395.55,
			"close": 1389.65
		},
		"depth": {
			"buy": [
				{
					"price": 1412,
					"quantity": 12,
					"orders": 0
				},
				{
					"price": 0,
					"quantity": 0,
					"orders": 0
				},
				{
					"price": 0,
					"quantity": 0,
					"orders": 0
				},
				{
					"price": 0,
					"quantity": 0,
					"orders": 0
				},
				{
					"price": 0,
					"quantity": 0,
					"orders": 0
				}
			],
			"sell": [
				{
					"price": 1412.95,
					"quantity": 5191,
					"orders": 13
				},
				{
					"price": 0,
					"quantity": 0,
					"orders": 0
				},
				{
					"price": 0,
					"quantity": 0,
					"orders": 0
				},
				{
					"price": 0,
					"quantity": 0,
					"orders": 0
				},
				{
					"price": 0,
					"quantity": 0,
					"orders": 0
				}
			]
		}
	}
}

export async function getQuotes(authToken: string, quoteUrl: string): Promise<GetQuotesResult> {
	try {
		const { data: response } = await axios.get<KiteApiResponse>(
			quoteUrl, {
			headers: {
				"X-Kite-Version": "3",
				Authorization: authToken
			}
		});


		if (response.status !== "success") {
			return {
				status: false,
				message: response.message ?? response.error_type ?? "Kite quote API returned error"
			};
		}

		return { status: true, data: response.data };
	} catch (error) {
		return {
			status: false,
			error,
			message: axios.isAxiosError(error) ? error.message : "Unknown quote API error"
		};
	}
}