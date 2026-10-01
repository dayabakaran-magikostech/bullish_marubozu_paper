"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = void 0;
exports.buildKiteQuoteUrls = buildKiteQuoteUrls;
exports.buildKiteAuthHeaders = buildKiteAuthHeaders;
exports.getDaysRem = getDaysRem;
exports.getCalculatedDTE = getCalculatedDTE;
exports.normalizeIndexName = normalizeIndexName;
exports.normalizeDate = normalizeDate;
exports.normalizeOptionType = normalizeOptionType;
exports.getNearestStrike = getNearestStrike;
exports.isOlderThanMinutes = isOlderThanMinutes;
exports.calculateStrikeSynthFut = calculateStrikeSynthFut;
exports.getOptionPrice = getOptionPrice;
exports.getNearestPutDeltaOption = getNearestPutDeltaOption;
exports.getCurrTimeStamp = getCurrTimeStamp;
exports.getOrderTagDateSuffix = getOrderTagDateSuffix;
exports.calcCharges = calcCharges;
const config_1 = require("../config");
const charges_1 = require("./charges");
function buildKiteQuoteUrls(instruments, batchSize = 490) {
    if (!instruments.length) {
        throw new Error("[buildKiteQuoteUrls] Instrument list is empty.");
    }
    const baseUrl = "https://api.kite.trade/quote";
    const urls = [];
    for (let i = 0; i < instruments.length; i += batchSize) {
        const batch = instruments.slice(i, i + batchSize);
        const params = new URLSearchParams();
        batch.forEach(token => params.append("i", token.toString()));
        urls.push(`${baseUrl}?${params.toString()}`);
    }
    return urls;
}
function buildKiteAuthHeaders() {
    const tokens = [];
    for (const account in config_1.globalStates.kiteAccounts) {
        tokens.push(`token ${config_1.globalStates.kiteAccounts[account]?.apiKey}:${config_1.globalStates.kiteAccounts[account]?.accessToken}`);
    }
    return tokens;
}
function getDaysRem(OPTION_END_DATE) {
    const expiry = new Date(new Date(OPTION_END_DATE).setHours(0, 0, 0, 0));
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const diffTime = Math.abs(expiry.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}
function getCalculatedDTE() {
    const tradingStart = new Date();
    tradingStart.setHours(9, 15, 0, 0);
    const tradingEnd = new Date(tradingStart.getTime() + 6.25 * 60 * 60 * 1000);
    const now = new Date();
    if (now < tradingStart) {
        return 1; // Before trading starts, DTE is 1
    }
    else if (now > tradingEnd) {
        return 0; // After trading ends, DTE is 0
    }
    else {
        const totalTradingTime = tradingEnd.getTime() - tradingStart.getTime();
        const elapsedTradingTime = now.getTime() - tradingStart.getTime();
        const dte = 1 - elapsedTradingTime / totalTradingTime;
        return dte;
    }
}
function normalizeIndexName(value) {
    return value.trim().toUpperCase();
}
function normalizeDate(value) {
    const date = value.trim();
    if (!date) {
        throw new Error("Date cannot be empty");
    }
    return date;
}
function normalizeOptionType(value) {
    const type = value.trim().toUpperCase();
    if (type !== "CE" && type !== "PE" && type !== "FUT") {
        throw new Error(`Invalid option type: ${value}`);
    }
    return type;
}
function getNearestStrike(index, target) {
    if (!Number.isFinite(target)) {
        return null;
    }
    const arr = config_1.marketStore.indexes[index]?.strikesArr;
    if (!arr || arr.length === 0) {
        return null;
    }
    let left = 0;
    let right = arr.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const current = arr[mid];
        if (current === target) {
            return current;
        }
        if (current < target) {
            left = mid + 1;
        }
        else {
            right = mid - 1;
        }
    }
    const lower = right >= 0 ? arr[right] : undefined;
    const upper = left < arr.length ? arr[left] : undefined;
    if (lower === undefined)
        return upper ?? null;
    if (upper === undefined)
        return lower;
    return Math.abs(target - lower) <= Math.abs(target - upper) ? lower : upper;
}
function isOlderThanMinutes(datetime, minutes) {
    const date = new Date(datetime.replace(' ', 'T'));
    return Date.now() - date.getTime() > minutes * 60 * 1000;
}
function calculateStrikeSynthFut(strike) {
    const cePrice = getOptionPrice(strike.PE);
    const pePrice = getOptionPrice(strike.PE);
    if (cePrice == null || pePrice == null) {
        return null;
    }
    return (strike.strikePrice + cePrice - pePrice);
}
function getOptionPrice(option) {
    if (!option)
        return null;
    const bid = option.quote.bid;
    const offer = option.quote.offer;
    const ltp = option.quote.ltp;
    return (bid + offer) / 2;
}
function getNearestPutDeltaOption(index, targetDelta, synthAtmStrike) {
    const indexData = config_1.marketStore.indexes[index.trim().toUpperCase()];
    if (!indexData)
        return null;
    let nearest = null;
    let nearestDistance = Infinity;
    for (const strike of Object.values(indexData.optionChain)) {
        const pe = strike.PE;
        if (!pe || pe.delta == null) {
            continue;
        }
        const distance = Math.abs(Math.abs(pe.delta) - Math.abs(targetDelta));
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = pe;
        }
        if (strike.strikePrice > synthAtmStrike) {
            break;
        }
    }
    return nearest;
}
function getCurrTimeStamp(currentDate) {
    if (!currentDate)
        return '';
    const year = currentDate.getFullYear();
    const month = padZero(currentDate.getMonth() + 1);
    const day = padZero(currentDate.getDate());
    const hours = padZero(currentDate.getHours());
    const minutes = padZero(currentDate.getMinutes());
    const seconds = padZero(currentDate.getSeconds());
    const milliseconds = padZero3(currentDate.getMilliseconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}
function padZero(number) {
    return number.toString().padStart(2, '0');
}
function padZero3(number) {
    return number.toString().padStart(3, '0');
}
function getOrderTagDateSuffix(datetime) {
    // Indexes based on: "YYYY-MM-DD HH:mm:ss.SSS"
    //                    01234567890123456789012
    const yy = datetime.slice(2, 4);
    const month = datetime.slice(5, 7);
    const dd = datetime.slice(8, 10);
    const hh = datetime.slice(11, 13);
    const mm = datetime.slice(14, 16);
    return `${dd}${month}${yy}${hh}${mm}`;
}
function calcCharges(entryPrice, exitPrice, qty, numOrdersEnetred, numOrdersExited, type, entryTransaction) {
    const exitTransaction = entryTransaction.toLowerCase() == "sell" ? 'buy' : 'sell';
    return ((0, charges_1.getCharges)('equity', type, 'ZERODHA', entryTransaction, entryPrice, qty, numOrdersEnetred) +
        (0, charges_1.getCharges)('equity', type, 'ZERODHA', exitTransaction, exitPrice, qty, numOrdersExited));
}
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.delay = delay;
//# sourceMappingURL=helper.js.map