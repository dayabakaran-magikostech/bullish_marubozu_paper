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
export declare function getImpliedVolatility(expectedCost: number, s: number, k: number, t: number, callPut: string, r?: number, estimate?: number | null): number;
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
export declare function getDelta(s: number, k: number, t: number, v: number, r: number, callPut: string): number;
export declare function calculateTheoreticalValues(synthFut: number, strike: number, iv: number, dte: number): [number, number];
//# sourceMappingURL=optionGreeksCalculator.d.ts.map