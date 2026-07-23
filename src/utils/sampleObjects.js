const marketStore = {
	indexes: {
		NIFTY: {
			config: {
				id: 1,
				index: "NIFTY",
				lotSize: 65,
				tradingSymbol: "NIFTY 50",
				stockCode: "NIFTY",
				instrumentToken: 256265,
				hasWeekly: true,
				currentWeekly: "2026-07-14"
			},
			currentIndexQuote: {
				ltp: 24360.50,
				updatedAt: "2026-07-08T11:14:00+05:30"
			},
			hourlyQuotes: {
				"10:14": {
					datetime: "2026-07-08T10:14:00+05:30",
					open: 24310.25,
					high: 24355.80,
					low: 24295.10,
					close: 24335.25
				},
				"11:14": {
					datetime: "2026-07-08T11:14:00+05:30",
					open: 24310.25,
					high: 24382.40,
					low: 24295.10,
					close: 24360.50
				}
			},
			optionChain: {
				"24400": {
					strikePrice: 24400,
					CE: {
						id: 1,
						tradingSymbol: "NIFTY2671424400CE",
						type: "CE",
						strikePrice: 24400,
						expiryDate: "2026-07-14",
						instrumentToken: 13155586,
						exchangeToken: 51389,
						lotSize: 65,
						tickSize: 0.05,
						quote: {
							bid: 152.25,
							offer: 152.40,
							ltp: 152.35,
							updatedAt: "2026-07-08T11:14:01+05:30"
						}
					},
					PE: {
						id: 2,
						tradingSymbol: "NIFTY2671424400PE",
						type: "PE",
						strikePrice: 24400,
						expiryDate: "2026-07-14",
						instrumentToken: 13155842,
						exchangeToken: 51390,
						lotSize: 65,
						tickSize: 0.05,
						quote: {
							bid: 187.10,
							offer: 187.30,
							ltp: 187.20,
							updatedAt: "2026-07-08T11:14:01+05:30"
						}
					}
				}
			},
			optionTokens: [
				13155586,
				13155842,
				13155074,
				13155330
			]
		}
	},
	instrumentByToken: {
		"13155586": {
			/*
			SAME CE OBJECT AS:
		    
			indexes
				.NIFTY
				.optionChain["24400"]
				.CE
			*/
		},
		"13155842": {
			/*
			SAME PE OBJECT
			*/
		}
	},
	allOptionTokens: [
		13155586,
		13155842,
		13155074,
		13155330
	]
}

const newMarketStore = {
	"indexes": {
		"NIFTY": {
			"config": {
				"id": 1,
				"index": "NIFTY",
				"lotSize": 65,
				"tradingSymbol": "NIFTY 50",
				"stock_code": "NIFTY",
				"instrumentToken": 256265,
				"hasWeekly": "TRUE",
				"currentWeekly": "2026-07-21",
				"active": "TRUE",
				"dte": 1
			},
			"currentIndexQuote": { "bid": null, "offer": null, "ltp": null, "updatedAt": null },
			"hourlyQuotes": {},
			"optionChain": {
				"21600": {
					"strikePrice": 21600,
					"synthFut": null,
					"CE": {
						"id": 185,
						"tradingSymbol": "NIFTY2672121600CE",
						"index": "NIFTY",
						"type": "CE",
						"strikePrice": 21600,
						"expiryDate": "2026-07-21",
						"instrumentToken": 14653442,
						"exchangeToken": 57240,
						"lotSize": 65,
						"tickSize": 0.05,
						"quote": {
							"bid": null,
							"offer": null,
							"ltp": null,
							"updatedAt": null
						},
						"iv": null,
						"delta": null
					},
					"PE": {
						"id": 186,
						"tradingSymbol": "NIFTY2672121600PE",
						"index": "NIFTY",
						"type": "PE",
						"strikePrice": 21600,
						"expiryDate": "2026-07-21",
						"instrumentToken": 14653698,
						"exchangeToken": 57241,
						"lotSize": 65,
						"tickSize": 0.05,
						"quote": {
							"bid": null,
							"offer": null,
							"ltp": null,
							"updatedAt": null
						},
						"iv": null,
						"delta": null
					}
				},
			},
			"optionTokens": [
				13155586,
				13155842,
				13155074,
				13155330
			],
			"strikesArr": [
				21600,
				21650,
				21700,
				21750,
				21800
			]
		}
	},
	"allOptionTokens": [
		14682626,
		14682882,
		14682114,
		14682370,
		14683138
	]
}

const instrumentsState = {
	"256265": {
		"id": 1,
		"tradingSymbol": "NIFTY 50",
		"index": "NIFTY",
		"type": "INDEX",
		"strikePrice": null,
		"expiryDate": null,
		"instrumentToken": 256265,
		"exchangeToken": null,
		"lotSize": 65,
		"tickSize": null,
		"quote": {
			"bid": null,
			"offer": null,
			"ltp": null,
			"updatedAt": null
		},
		"iv": null,
		"delta": null
	}
}

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