"use strict";
// iv cacls
// delta finder
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImpliedVolatility = getImpliedVolatility;
exports.getDelta = getDelta;
exports.calculateTheoreticalValues = calculateTheoreticalValues;
const config_1 = require("../config");
/**
 * Calculate a close estimate of implied volatility given an option price.  A
 * binary search type approach is used to determine the implied volatility.
 *
 * @param {Number} expectedCost The market price of the option
 * @param {Number} s Current price of the underlying
 * @param {Number} k Strike price
 * @param {Number} t Time to experiation in years
 * @param {Number} r Anual risk-free interest rate as a decimal
 * @param {String} callPut The type of option priced - "call" or "put"
 * @param {Number} [estimate=.1] An initial estimate of implied volatility
 * @returns {Number} The implied volatility estimate
 **/
function getImpliedVolatility(expectedCost, s, k, t, callPut, r = 0, estimate = null) {
    estimate = estimate || 0.1;
    let low = 0;
    let high = Infinity;
    for (let i = 0; i < 100; i++) {
        let actualCost = blackScholes(s, k, t, estimate, r, callPut);
        // compare the price down to the cent
        if (expectedCost * 100 == Math.floor(actualCost * 100)) {
            break;
        }
        else if (actualCost > expectedCost) {
            high = estimate;
            estimate = (estimate - low) / 2 + low;
        }
        else {
            low = estimate;
            estimate = (high - estimate) / 2 + estimate;
            if (!isFinite(estimate))
                estimate = low * 2;
        }
    }
    return estimate;
}
/**
 * Black-Scholes option pricing formula.
 * See {@link http://en.wikipedia.org/wiki/Black%E2%80%93Scholes_model#Black-Scholes_formula|Wikipedia page}
 * for pricing puts in addition to calls.
 *
 * @param   {Number} s       Current price of the underlying
 * @param   {Number} k       Strike price
 * @param   {Number} t       Time to experiation in years
 * @param   {Number} v       Volatility as a decimal
 * @param   {Number} r       Anual risk-free interest rate as a decimal
 * @param   {String} callPut The type of option to be priced - "call" or "put"
 * @returns {Number}         Price of the option
 **/
function blackScholes(s, k, t, v, r, callPut) {
    var price = null;
    var w = (r * t + (Math.pow(v, 2) * t) / 2 - Math.log(k / s)) / (v * Math.sqrt(t));
    if (callPut === 'call') {
        price = s * stdNormCDF(w) - k * Math.pow(Math.E, -1 * r * t) * stdNormCDF(w - v * Math.sqrt(t));
    } // put
    else {
        price = k * Math.pow(Math.E, -1 * r * t) * stdNormCDF(v * Math.sqrt(t) - w) - s * stdNormCDF(-w);
    }
    return price;
}
function stdNormCDF(x) {
    var probability = 0;
    // avoid divergence in the series which happens around +/-8 when summing the
    // first 100 terms
    if (x >= 8) {
        probability = 1;
    }
    else if (x <= -8) {
        probability = 0;
    }
    else {
        for (var i = 0; i < 100; i++) {
            probability += Math.pow(x, 2 * i + 1) / _doubleFactorial(2 * i + 1);
        }
        probability *= Math.pow(Math.E, -0.5 * Math.pow(x, 2));
        probability /= Math.sqrt(2 * Math.PI);
        probability += 0.5;
    }
    return probability;
}
function _doubleFactorial(n) {
    var val = 1;
    for (var i = n; i > 1; i -= 2) {
        val *= i;
    }
    return val;
}
function getW(s, k, t, v, r) {
    var w = (r * t + (Math.pow(v, 2) * t) / 2 - Math.log(k / s)) / (v * Math.sqrt(t));
    return w;
}
/**
 * Calculates the delta of an option.
 *
 * @param s - Current price of the underlying
 * @param k - Strike price
 * @param t - Time to expiration in years
 * @param v - Volatility as a decimal
 * @param r - Annual risk-free interest rate as a decimal
 * @param callPut - The type of option - "call" or "put"
 * @returns The delta of the option
 */
function getDelta(s, k, t, v, r, callPut) {
    return callPut === 'call' ? callDelta(s, k, t, v, r) : putDelta(s, k, t, v, r);
}
/**
 * Calculates the delta of a call option.
 *
 * @param {number} s - Current price of the underlying
 * @param {number} k - Strike price
 * @param {number} t - Time to expiration in years
 * @param {number} v - Volatility as a decimal
 * @param {number} r - Annual risk-free interest rate as a decimal
 * @returns {number} The delta of the call option
 */
function callDelta(s, k, t, v, r) {
    const w = getW(s, k, t, v, r);
    if (!isFinite(w))
        return s > k ? 1 : 0;
    return stdNormCDF(w);
}
/**
 * Calculates the delta of a put option.
 *
 * @param {number} s - Current price of the underlying
 * @param {number} k - Strike price
 * @param {number} t - Time to expiration in years
 * @param {number} v - Volatility as a decimal
 * @param {number} r - Annual risk-free interest rate as a decimal
 * @returns {number} The delta of the put option
 */
function putDelta(s, k, t, v, r) {
    const delta = callDelta(s, k, t, v, r) - 1;
    return delta === -1 && k === s ? 0 : delta;
}
function stdNormPDF(x) {
    /**
     * Standard normal probability density function.
     */
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}
function callTheta(s, k, t, v, r) {
    const w = getW(s, k, t, v, r);
    if (!Number.isFinite(w)) {
        return 0.0;
    }
    const sqrtT = Math.sqrt(t);
    const d2 = w - v * sqrtT;
    return ((-v * s * stdNormPDF(w)) / (2 * sqrtT) -
        r * k * Math.exp(-r * t) * stdNormCDF(d2));
}
function putTheta(s, k, t, v, r) {
    const w = getW(s, k, t, v, r);
    if (!Number.isFinite(w)) {
        return 0.0;
    }
    const sqrtT = Math.sqrt(t);
    const d2 = w - v * sqrtT;
    return ((-v * s * stdNormPDF(w)) / (2 * sqrtT) +
        r * k * Math.exp(-r * t) * stdNormCDF(-d2));
}
function getTheta(s, k, t, v, r, callPut, days) {
    /**
     * Theta: sensitivity of option price to time.
     * Returns per-day theta (scaled by days).
     */
    if (callPut.toLowerCase() === "call") {
        return callTheta(s, k, t, v, r) / days;
    }
    else if (callPut.toLowerCase() === "put") {
        return putTheta(s, k, t, v, r) / days;
    }
    else {
        throw new Error("Invalid option type. Use 'call' or 'put'.");
    }
}
function calculateTheoreticalValues(synthFut, strike, iv, dte) {
    try {
        if (!synthFut || synthFut == 0 || !strike || strike == 0 || !iv || !dte) {
            return [NaN, NaN];
        }
        const intrinsic = Math.max(strike - synthFut, 0.0);
        synthFut = Number(synthFut);
        strike = Number(strike);
        iv = Number(iv);
        dte = Number(dte);
        const t = dte / config_1.globalStates.daysPerYear;
        let price, theta;
        if (t <= 0) {
            price = intrinsic;
        }
        else {
            price = blackScholes(synthFut, strike, t, iv, config_1.globalStates.riskFreeRate, "put");
        }
        theta = getTheta(synthFut, strike, t, iv, config_1.globalStates.riskFreeRate, "put", config_1.globalStates.daysPerYear);
        return [roundToTick(price), theta];
    }
    catch (error) {
        console.log("Error occurred while calculating theoretical greek values: ", error);
        return [NaN, NaN];
    }
}
function roundToTick(price, tickSize = 0.05) {
    if (price <= 0) {
        return 0.0;
    }
    return Math.round(price / tickSize) * tickSize;
}
//# sourceMappingURL=optionGreeksCalculator.js.map