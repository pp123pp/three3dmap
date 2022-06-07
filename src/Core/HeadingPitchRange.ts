import defined from './defined';

/**
 * Defines a heading angle, pitch angle, and range in a local frame.
 * Heading is the rotation from the local north direction where a positive angle is increasing eastward.
 * Pitch is the rotation from the local xy-plane. Positive pitch angles are above the plane. Negative pitch
 * angles are below the plane. Range is the distance from the center of the frame.
 * @alias HeadingPitchRange
 * @constructor
 *
 * @param {Number} [heading=0.0] The heading angle in radians.
 * @param {Number} [pitch=0.0] The pitch angle in radians.
 * @param {Number} [range=0.0] The distance from the center in meters.
 */
export default class HeadingPitchRange {
    heading: number;
    pitch: number;
    range: number;
    constructor(heading = 0.0, pitch = 0.0, range = 0.0) {
        /**
         * Heading is the rotation from the local north direction where a positive angle is increasing eastward.
         * @type {Number}
         * @default 0.0
         */
        this.heading = heading;

        /**
         * Pitch is the rotation from the local xy-plane. Positive pitch angles
         * are above the plane. Negative pitch angles are below the plane.
         * @type {Number}
         * @default 0.0
         */
        this.pitch = pitch;

        /**
         * Range is the distance from the center of the local frame.
         * @type {Number}
         * @default 0.0
         */
        this.range = range;
    }

    /**
     * Duplicates a HeadingPitchRange instance.
     *
     * @param {HeadingPitchRange} hpr The HeadingPitchRange to duplicate.
     * @param {HeadingPitchRange} [result] The object onto which to store the result.
     * @returns {HeadingPitchRange} The modified result parameter or a new HeadingPitchRange instance if one was not provided. (Returns undefined if hpr is undefined)
     */
    static clone(hpr: HeadingPitchRange, result = new HeadingPitchRange()): HeadingPitchRange {
        if (!defined(hpr)) {
            return undefined as any;
        }
        if (!defined(result)) {
            result = new HeadingPitchRange();
        }

        result.heading = hpr.heading;
        result.pitch = hpr.pitch;
        result.range = hpr.range;
        return result;
    }
}
