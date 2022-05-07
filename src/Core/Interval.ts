export default class Interval {
    start: number;
    stop: number;
    constructor(start = 0.0, stop = 0.0) {
        /**
         * The beginning of the interval.
         * @type {Number}
         * @default 0.0
         */
        this.start = start;
        /**
         * The end of the interval.
         * @type {Number}
         * @default 0.0
         */
        this.stop = stop;
    }
}
