"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCharges = getCharges;
/**
 * Calculates the total charges for a given trade.
 */
function getCharges(assetType, type, broker, transactionType, premiumPrice, quantity, ordersCount = 1, stockExchange = 'NSE') {
    if (quantity === 0)
        return 0;
    switch (assetType) {
        case 'equity':
            return equityCharges(type, broker, transactionType, premiumPrice, quantity, stockExchange, ordersCount);
        case 'currency':
            return currencyCharges(type, broker, transactionType, premiumPrice, quantity, stockExchange, ordersCount);
        case 'equity-intraday':
            return equityIntradayCharges(type, broker, transactionType, premiumPrice, quantity, stockExchange);
        default:
            return NaN;
    }
}
/**
 * Calculates the total charges for an equity trade based on the type of derivative.
 */
function equityCharges(type, broker, transactionType, premiumPrice, quantity, stockExchange, ordersCount) {
    if (type === 'ce' || type === 'pe') {
        return calcOptionsCharges(broker, transactionType, premiumPrice, quantity, ordersCount).totalCharges;
    }
    else if (type === 'fut') {
        return calcFutureCharges(broker, transactionType, premiumPrice, quantity, ordersCount).totalCharges;
    }
    else if (type === 'cash') {
        return calcCashCharges(broker, transactionType, premiumPrice, quantity, stockExchange).totalCharges;
    }
    return NaN;
}
/**
 * Calculates the total charges for a currency trade based on the type of derivative.
 */
function currencyCharges(type, broker, transactionType, premiumPrice, quantity, stockExchange, ordersCount) {
    if (type === 'ce' || type === 'pe') {
        return calcOptionsCharges(broker, transactionType, premiumPrice, quantity, ordersCount).totalCharges;
    }
    else {
        return calcFutureCharges(broker, transactionType, premiumPrice, quantity, ordersCount).totalCharges;
    }
}
/**
 * Calculates the total charges for an equity intraday trade based on the type of derivative.
 */
function equityIntradayCharges(type, broker, transactionType, premiumPrice, quantity, stockExchange) {
    if (type === 'cash') {
        return calcCashCharges(broker, transactionType, premiumPrice, quantity, stockExchange).totalCharges;
    }
    return NaN;
}
/**
 * Calculates the total charges for a cash trade based on the type of transaction.
 */
function calcCashCharges(broker, transactionType, premiumPrice, quantity, stockExchange) {
    const brokerageAmount = getBrokerageAmt(broker, premiumPrice, quantity);
    let stt = transactionType === 'buy' ? 0 : premiumPrice * quantity * 0.00025;
    stt = roundToTwoDecimals(stt);
    const transactionCharges = returnTransactionCharges(stockExchange, premiumPrice, quantity);
    const sebiCharges = roundToTwoDecimals(0.000001 * premiumPrice * quantity);
    const gst = roundToTwoDecimals((brokerageAmount + transactionCharges + sebiCharges) * 0.18);
    const stampCharges = transactionType === 'buy' ? roundToTwoDecimals(0.00003 * premiumPrice * quantity) : 0;
    const totalCharges = brokerageAmount + stt + transactionCharges + gst + sebiCharges + stampCharges;
    return {
        brokerage: brokerageAmount,
        stt,
        transactionCharges,
        gst,
        sebiCharges,
        stampCharges,
        totalCharges: roundToTwoDecimals(totalCharges),
    };
}
/**
 * Calculates the total charges for an options trade based on the type of transaction.
 */
function calcOptionsCharges(broker, transactionType, premiumPrice, quantity, ordersCount) {
    const brokerageAmount = 20 * ordersCount;
    let stt = 0;
    if (transactionType === 'sell') {
        stt = premiumPrice * quantity * 0.0015;
        stt = roundToTwoDecimals(stt);
    }
    const transactionCharges = roundToTwoDecimals(0.00035 * premiumPrice * quantity);
    const sebiCharges = roundToTwoDecimals(0.000001 * premiumPrice * quantity);
    const gst = roundToTwoDecimals((brokerageAmount + transactionCharges + sebiCharges) * 0.18);
    const stampCharges = transactionType === 'buy' ? roundToTwoDecimals(0.00003 * premiumPrice * quantity) : 0;
    const totalCharges = brokerageAmount + stt + transactionCharges + gst + sebiCharges + stampCharges;
    return {
        brokerage: brokerageAmount,
        stt,
        transactionCharges,
        gst,
        sebiCharges,
        stampCharges,
        totalCharges: roundToTwoDecimals(totalCharges),
    };
}
/**
 * Calculates the total charges for a future trade based on the type of transaction.
 */
function calcFutureCharges(broker, transactionType, premiumPrice, quantity, ordersCount) {
    const brokerageAmount = getBrokerageAmt(broker, premiumPrice, quantity);
    let stt = 0;
    if (transactionType === 'sell') {
        stt = premiumPrice * quantity * 0.0005;
        stt = roundToTwoDecimals(stt);
    }
    const transactionCharges = roundToTwoDecimals(0.0000173 * premiumPrice * quantity);
    const sebiCharges = roundToTwoDecimals(0.000001 * premiumPrice * quantity);
    const gst = roundToTwoDecimals((brokerageAmount + transactionCharges + sebiCharges) * 0.18);
    const stampCharges = transactionType === 'buy' ? roundToTwoDecimals(0.00002 * premiumPrice * quantity) : 0;
    const totalCharges = brokerageAmount + stt + transactionCharges + gst + sebiCharges + stampCharges;
    return {
        brokerage: brokerageAmount,
        stt,
        transactionCharges,
        gst,
        sebiCharges,
        stampCharges,
        totalCharges: roundToTwoDecimals(totalCharges),
    };
}
/**
 * Returns the brokerage amount for a given broker, premium price, and quantity.
 */
function getBrokerageAmt(broker, premiumPrice, quantity) {
    switch (broker.toUpperCase()) {
        case 'ZERODHA':
            return Math.min(20, premiumPrice * quantity * 0.0003);
        case '5PAISA':
            return 0;
        default:
            return 0;
    }
}
/**
 * Rounds a number to two decimal places.
 */
function roundToTwoDecimals(num) {
    return Math.round(num * 100) / 100;
}
/**
 * Calculates the transaction charges based on the stock exchange for a given trade.
 */
function returnTransactionCharges(stockExchange, premiumPrice, quantity) {
    if (stockExchange.toUpperCase() === 'NSE') {
        let transactionFees = 0.0000325 * (premiumPrice * quantity);
        return roundToTwoDecimals(transactionFees);
    }
    else if (stockExchange.toUpperCase() === 'BSE') {
        let transactionFees = 0.0000375 * (premiumPrice * quantity);
        return roundToTwoDecimals(transactionFees);
    }
    return NaN;
}
//# sourceMappingURL=charges.js.map