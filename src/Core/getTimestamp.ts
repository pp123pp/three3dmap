/**
 * Gets a timestamp that can be used in measuring the time between events.  Timestamps
 * are expressed in milliseconds, but it is not specified what the milliseconds are
 * measured from.  This function uses performance.now() if it is available, or Date.now()
 * otherwise.
 *
 * @function getTimestamp
 *
 * @returns {Number} The timestamp in milliseconds since some unspecified reference time.
 */
let getTimestamp: () => number;

if (typeof performance !== 'undefined' && typeof performance.now === 'function' && isFinite(performance.now())) {
    getTimestamp = function (): number {
        return performance.now();
    };
} else {
    getTimestamp = function (): number {
        return Date.now();
    };
}
export { getTimestamp };
