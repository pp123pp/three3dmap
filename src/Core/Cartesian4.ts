import { Vector4 } from 'three';
import { CesiumColor } from './CesiumColor';
import defined from './defined';

export default class Cartesian4 extends Vector4 {
    constructor(x = 0.0, y = 0.0, z = 0.0, w = 0.0) {
        super(x, y, z, w);
    }

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 0.0).
     *
     * @type {Cartesian4}
     * @constant
     */
    static ZERO = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 1.0).
     *
     * @type {Cartesian4}
     * @constant
     */
    static UNIT_W = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 1.0));

    /**
     * Creates a Cartesian4 instance from a {@link Color}. <code>red</code>, <code>green</code>, <code>blue</code>,
     * and <code>alpha</code> map to <code>x</code>, <code>y</code>, <code>z</code>, and <code>w</code>, respectively.
     *
     * @param {Color} color The source color.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     */
    static fromColor(color: CesiumColor, result?: Cartesian4): Cartesian4 {
        if (!defined(result)) {
            return new Cartesian4(color.red, color.green, color.blue, color.alpha);
        }

        (result as Cartesian4).x = color.red;
        (result as Cartesian4).y = color.green;
        (result as Cartesian4).z = color.blue;
        (result as Cartesian4).w = color.alpha;
        return result as Cartesian4;
    }

    /**
     * Duplicates a Cartesian4 instance.
     *
     * @param {Cartesian4} cartesian The Cartesian to duplicate.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided. (Returns undefined if cartesian is undefined)
     */
    static clone(cartesian: Cartesian4, result?: Cartesian4): Cartesian4 | undefined {
        if (!defined(cartesian)) {
            return undefined;
        }

        if (!defined(result)) {
            return new Cartesian4(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
        }

        (result as Cartesian4).x = cartesian.x;
        (result as Cartesian4).y = cartesian.y;
        (result as Cartesian4).z = cartesian.z;
        (result as Cartesian4).w = cartesian.w;
        return result as Cartesian4;
    }

    /**
     * Creates a Cartesian4 instance from x, y, z and w coordinates.
     *
     * @param {Number} x The x coordinate.
     * @param {Number} y The y coordinate.
     * @param {Number} z The z coordinate.
     * @param {Number} w The w coordinate.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     */
    static fromElements(x: number, y: number, z: number, w: number, result?: Cartesian4): Cartesian4 {
        if (!defined(result)) {
            return new Cartesian4(x, y, z, w);
        }

        (result as Cartesian4).x = x;
        (result as Cartesian4).y = y;
        (result as Cartesian4).z = z;
        (result as Cartesian4).w = w;
        return result as Cartesian4;
    }
}
