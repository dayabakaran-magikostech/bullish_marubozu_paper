"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandleManager = void 0;
class CandleManager {
    constructor(symbol, priceData) {
        this.currentCandle = null;
        this.timeLost = 0;
        this.symbol = symbol;
        this.priceData = priceData;
    }
    getSymbol() {
        return this.symbol;
    }
    // public onTick(ltp: number, ltt: number, disconnected: number, dhanTime: string): void {
    //     const tickPayload = { symbol: this.symbol, timestamp: this.formatIST(ltt), close: ltp };
    //     globalStates.tickLogs.push(tickPayload);
    //     if (this.currentCandle === null) { 
    //         this.startNewCandle(ltp);
    //         return;
    //     }
    //     this.currentCandle.high = Math.max(this.currentCandle.high, ltp);
    //     this.currentCandle.low = Math.min(this.currentCandle.low, ltp);
    //     this.currentCandle.close = ltp;
    //     this.timeLost += disconnected;
    // }
    // public closeCandle(intervalStart?: number): boolean {
    //     if (this.currentCandle === null) return false;
    //     this.currentCandle.timestamp = intervalStart ?? this.currentCandle.timestamp;
    //     this.candleCalculation();
    //     this.timeLost = 0;
    //     this.currentCandle = null;
    //     return true;
    // }
    // private candleCalculation(): void {
    //     const { open, high, low, close, timestamp } = this.currentCandle!;
    //     const prevClose = this.priceData.prevClose;
    //     const tr = Number(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)).toFixed(2));
    //     // Candle Creation
    //     this.priceData.ohlc[this.formatIST(timestamp)] = { open, high, low, close };
    //     this.priceData.prevClose = close;
    //     this.priceData.tr.pop();
    //     this.priceData.tr.unshift(tr);
    //     this.priceData.atr = Number((this.priceData.tr.reduce((acc, v) => acc + v, 0) / 14).toFixed(2));
    //     globalStates.ohlcLogs.push({
    //         symbol: this.symbol,
    //         timestamp: this.formatIST(timestamp),
    //         open, high, low, close
    //     });
    // }
    startNewCandle(ltp) {
        this.currentCandle = { open: ltp, high: ltp, low: ltp, close: ltp, timestamp: 0 };
    }
    formatIST(epochMs) {
        const d = new Date(epochMs);
        const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
        return ist.toISOString().replace("Z", "+05:30").replace(/\.\d{3}/, "");
    }
}
exports.CandleManager = CandleManager;
//# sourceMappingURL=candle.js.map