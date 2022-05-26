import { Matrix4 } from 'three';
import Cartesian3 from './Cartesian3';
import Cartesian4 from './Cartesian4';
import CesiumMatrix3 from './CesiumMatrix3';
import defaultValue from './defaultValue';
import defined from './defined';

export default class CesiumMatrix4 extends Matrix4 {
    /**
     * An immutable Matrix4 instance initialized to the identity matrix.
     *
     * @type {Matrix4}
     * @constant
     */
    static IDENTITY = Object.freeze(new CesiumMatrix4());

    /**
     * Retrieves a copy of the matrix column at the provided index as a Cartesian4 instance.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to retrieve.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     *
     * @exception {DeveloperError} index must be 0, 1, 2, or 3.
     *
     * @example
     * //returns a Cartesian4 instance with values from the specified column
     * // m = [10.0, 11.0, 12.0, 13.0]
     * //     [14.0, 15.0, 16.0, 17.0]
     * //     [18.0, 19.0, 20.0, 21.0]
     * //     [22.0, 23.0, 24.0, 25.0]
     *
     * //Example 1: Creates an instance of Cartesian
     * var a = Cesium.Matrix4.getColumn(m, 2, new Cesium.Cartesian4());
     *
     * @example
     * //Example 2: Sets values for Cartesian instance
     * var a = new Cesium.Cartesian4();
     * Cesium.Matrix4.getColumn(m, 2, a);
     *
     * // a.x = 12.0; a.y = 16.0; a.z = 20.0; a.w = 24.0;
     */
    static getColumn(matrix: CesiumMatrix4, index: number, result: Cartesian4): Cartesian4 {
        const elements = matrix.elements;
        const startIndex = index * 4;
        const x = elements[startIndex];
        const y = elements[startIndex + 1];
        const z = elements[startIndex + 2];
        const w = elements[startIndex + 3];

        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    }

    /**
     * Computes the inverse of the provided matrix assuming it is
     * an affine transformation matrix, where the upper left 3x3 elements
     * are a rotation matrix, and the upper three elements in the fourth
     * column are the translation.  The bottom row is assumed to be [0, 0, 0, 1].
     * The matrix is not verified to be in the proper form.
     * This method is faster than computing the inverse for a general 4x4
     * matrix using {@link Matrix4.inverse}.
     *
     * @param {Matrix4} matrix The matrix to invert.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     */
    static inverseTransformation = function (matrix: CesiumMatrix4, result: CesiumMatrix4): CesiumMatrix4 {
        //This function is an optimized version of the below 4 lines.
        //var rT = Matrix3.transpose(Matrix4.getRotation(matrix));
        //var rTN = Matrix3.negate(rT);
        //var rTT = Matrix3.multiplyByVector(rTN, Matrix4.getTranslation(matrix));
        //return Matrix4.fromRotationTranslation(rT, rTT, result);

        const matrix0 = matrix.elements[0];
        const matrix1 = matrix.elements[1];
        const matrix2 = matrix.elements[2];
        const matrix4 = matrix.elements[4];
        const matrix5 = matrix.elements[5];
        const matrix6 = matrix.elements[6];
        const matrix8 = matrix.elements[8];
        const matrix9 = matrix.elements[9];
        const matrix10 = matrix.elements[10];

        const vX = matrix.elements[12];
        const vY = matrix.elements[13];
        const vZ = matrix.elements[14];

        const x = -matrix0 * vX - matrix1 * vY - matrix2 * vZ;
        const y = -matrix4 * vX - matrix5 * vY - matrix6 * vZ;
        const z = -matrix8 * vX - matrix9 * vY - matrix10 * vZ;

        result.elements[0] = matrix0;
        result.elements[1] = matrix4;
        result.elements[2] = matrix8;
        result.elements[3] = 0.0;
        result.elements[4] = matrix1;
        result.elements[5] = matrix5;
        result.elements[6] = matrix9;
        result.elements[7] = 0.0;
        result.elements[8] = matrix2;
        result.elements[9] = matrix6;
        result.elements[10] = matrix10;
        result.elements[11] = 0.0;
        result.elements[12] = x;
        result.elements[13] = y;
        result.elements[14] = z;
        result.elements[15] = 1.0;
        return result;
    };

    /**
     * Computes the product of a matrix and a {@link Cartesian3}. This is equivalent to calling {@link Matrix4.multiplyByVector}
     * with a {@link Cartesian4} with a <code>w</code> component of 1, but returns a {@link Cartesian3} instead of a {@link Cartesian4}.
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian3} cartesian The point.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     *
     * @example
     * var p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
     * var result = Cesium.Matrix4.multiplyByPoint(matrix, p, new Cesium.Cartesian3());
     */
    static multiplyByPoint(matrix: CesiumMatrix4, cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
        const vX = cartesian.x;
        const vY = cartesian.y;
        const vZ = cartesian.z;

        const x = matrix.elements[0] * vX + matrix.elements[4] * vY + matrix.elements[8] * vZ + matrix.elements[12];
        const y = matrix.elements[1] * vX + matrix.elements[5] * vY + matrix.elements[9] * vZ + matrix.elements[13];
        const z = matrix.elements[2] * vX + matrix.elements[6] * vY + matrix.elements[10] * vZ + matrix.elements[14];

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    }

    /**
     * Creates a Matrix4 instance from a Cartesian3 representing the translation.
     *
     * @param {Cartesian3} translation The upper right portion of the matrix representing the translation.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @see Matrix4.multiplyByTranslation
     */
    static fromTranslation(translation: Cartesian3, result?: CesiumMatrix4): CesiumMatrix4 {
        return CesiumMatrix4.fromRotationTranslation(CesiumMatrix3.IDENTITY, translation, result);
    }

    /**
     * Computes a Matrix4 instance from a Matrix3 representing the rotation
     * and a Cartesian3 representing the translation.
     *
     * @param {Matrix3} rotation The upper left portion of the matrix representing the rotation.
     * @param {Cartesian3} [translation=Cartesian3.ZERO] The upper right portion of the matrix representing the translation.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
     */
    static fromRotationTranslation = function (rotation: CesiumMatrix3, translation = Cartesian3.ZERO, result = new CesiumMatrix4()): CesiumMatrix4 {
        result.elements[0] = rotation.elements[0];
        result.elements[1] = rotation.elements[1];
        result.elements[2] = rotation.elements[2];
        result.elements[3] = 0.0;
        result.elements[4] = rotation.elements[3];
        result.elements[5] = rotation.elements[4];
        result.elements[6] = rotation.elements[5];
        result.elements[7] = 0.0;
        result.elements[8] = rotation.elements[6];
        result.elements[9] = rotation.elements[7];
        result.elements[10] = rotation.elements[8];
        result.elements[11] = 0.0;
        result.elements[12] = translation.x;
        result.elements[13] = translation.y;
        result.elements[14] = translation.z;
        result.elements[15] = 1.0;
        return result;
    };

    /**
     * Computes the product of two matrices.
     *
     * @param {Matrix4} left The first matrix.
     * @param {Matrix4} right The second matrix.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     */
    static multiply(left: CesiumMatrix4, right: CesiumMatrix4, result: CesiumMatrix4): CesiumMatrix4 {
        const left0 = left.elements[0];
        const left1 = left.elements[1];
        const left2 = left.elements[2];
        const left3 = left.elements[3];
        const left4 = left.elements[4];
        const left5 = left.elements[5];
        const left6 = left.elements[6];
        const left7 = left.elements[7];
        const left8 = left.elements[8];
        const left9 = left.elements[9];
        const left10 = left.elements[10];
        const left11 = left.elements[11];
        const left12 = left.elements[12];
        const left13 = left.elements[13];
        const left14 = left.elements[14];
        const left15 = left.elements[15];

        const right0 = right.elements[0];
        const right1 = right.elements[1];
        const right2 = right.elements[2];
        const right3 = right.elements[3];
        const right4 = right.elements[4];
        const right5 = right.elements[5];
        const right6 = right.elements[6];
        const right7 = right.elements[7];
        const right8 = right.elements[8];
        const right9 = right.elements[9];
        const right10 = right.elements[10];
        const right11 = right.elements[11];
        const right12 = right.elements[12];
        const right13 = right.elements[13];
        const right14 = right.elements[14];
        const right15 = right.elements[15];

        const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2 + left12 * right3;
        const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2 + left13 * right3;
        const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2 + left14 * right3;
        const column0Row3 = left3 * right0 + left7 * right1 + left11 * right2 + left15 * right3;

        const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6 + left12 * right7;
        const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6 + left13 * right7;
        const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6 + left14 * right7;
        const column1Row3 = left3 * right4 + left7 * right5 + left11 * right6 + left15 * right7;

        const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10 + left12 * right11;
        const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10 + left13 * right11;
        const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10 + left14 * right11;
        const column2Row3 = left3 * right8 + left7 * right9 + left11 * right10 + left15 * right11;

        const column3Row0 = left0 * right12 + left4 * right13 + left8 * right14 + left12 * right15;
        const column3Row1 = left1 * right12 + left5 * right13 + left9 * right14 + left13 * right15;
        const column3Row2 = left2 * right12 + left6 * right13 + left10 * right14 + left14 * right15;
        const column3Row3 = left3 * right12 + left7 * right13 + left11 * right14 + left15 * right15;

        result.elements[0] = column0Row0;
        result.elements[1] = column0Row1;
        result.elements[2] = column0Row2;
        result.elements[3] = column0Row3;
        result.elements[4] = column1Row0;
        result.elements[5] = column1Row1;
        result.elements[6] = column1Row2;
        result.elements[7] = column1Row3;
        result.elements[8] = column2Row0;
        result.elements[9] = column2Row1;
        result.elements[10] = column2Row2;
        result.elements[11] = column2Row3;
        result.elements[12] = column3Row0;
        result.elements[13] = column3Row1;
        result.elements[14] = column3Row2;
        result.elements[15] = column3Row3;
        return result;
    }

    /**
     * Computes a Matrix4 instance representing a non-uniform scale.
     *
     * @param {Cartesian3} scale The x, y, and z scale factors.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @example
     * // Creates
     * //   [7.0, 0.0, 0.0, 0.0]
     * //   [0.0, 8.0, 0.0, 0.0]
     * //   [0.0, 0.0, 9.0, 0.0]
     * //   [0.0, 0.0, 0.0, 1.0]
     * var m = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
     */
    static fromScale(scale: Cartesian3, result = new CesiumMatrix4()): CesiumMatrix4 {
        result.elements[0] = scale.x;
        result.elements[1] = 0.0;
        result.elements[2] = 0.0;
        result.elements[3] = 0.0;
        result.elements[4] = 0.0;
        result.elements[5] = scale.y;
        result.elements[6] = 0.0;
        result.elements[7] = 0.0;
        result.elements[8] = 0.0;
        result.elements[9] = 0.0;
        result.elements[10] = scale.z;
        result.elements[11] = 0.0;
        result.elements[12] = 0.0;
        result.elements[13] = 0.0;
        result.elements[14] = 0.0;
        result.elements[15] = 1.0;
        return result;
    }

    /**
     * Duplicates a Matrix4 instance.
     *
     * @param {Matrix4} matrix The matrix to duplicate.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided. (Returns undefined if matrix is undefined)
     */
    static clone(matrix: CesiumMatrix4, result = new CesiumMatrix4()): CesiumMatrix4 {
        result.elements[0] = matrix.elements[0];
        result.elements[1] = matrix.elements[1];
        result.elements[2] = matrix.elements[2];
        result.elements[3] = matrix.elements[3];
        result.elements[4] = matrix.elements[4];
        result.elements[5] = matrix.elements[5];
        result.elements[6] = matrix.elements[6];
        result.elements[7] = matrix.elements[7];
        result.elements[8] = matrix.elements[8];
        result.elements[9] = matrix.elements[9];
        result.elements[10] = matrix.elements[10];
        result.elements[11] = matrix.elements[11];
        result.elements[12] = matrix.elements[12];
        result.elements[13] = matrix.elements[13];
        result.elements[14] = matrix.elements[14];
        result.elements[15] = matrix.elements[15];
        return result;
    }

    /**
     * Computes a new matrix that replaces the translation in the rightmost column of the provided
     * matrix with the provided translation.  This assumes the matrix is an affine transformation
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Cartesian3} translation The translation that replaces the translation of the provided matrix.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     */
    static setTranslation(matrix: CesiumMatrix4, translation: Cartesian3, result: CesiumMatrix4): CesiumMatrix4 {
        result.elements[0] = matrix.elements[0];
        result.elements[1] = matrix.elements[1];
        result.elements[2] = matrix.elements[2];
        result.elements[3] = matrix.elements[3];

        result.elements[4] = matrix.elements[4];
        result.elements[5] = matrix.elements[5];
        result.elements[6] = matrix.elements[6];
        result.elements[7] = matrix.elements[7];

        result.elements[8] = matrix.elements[8];
        result.elements[9] = matrix.elements[9];
        result.elements[10] = matrix.elements[10];
        result.elements[11] = matrix.elements[11];

        result.elements[12] = translation.x;
        result.elements[13] = translation.y;
        result.elements[14] = translation.z;
        result.elements[15] = matrix.elements[15];

        return result;
    }

    /**
     * Gets the translation portion of the provided matrix, assuming the matrix is an affine transformation matrix.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     */
    static getTranslation(matrix: CesiumMatrix4, result: Cartesian3): Cartesian3 {
        result.x = matrix.elements[12];
        result.y = matrix.elements[13];
        result.z = matrix.elements[14];
        return result;
    }

    /**
     * Computes the product of a matrix and a {@link Cartesian3}.  This is equivalent to calling {@link Matrix4.multiplyByVector}
     * with a {@link Cartesian4} with a <code>w</code> component of zero.
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian3} cartesian The point.
     * @param {Cartesian3} result The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter.
     *
     * @example
     * var p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
     * var result = Cesium.Matrix4.multiplyByPointAsVector(matrix, p, new Cesium.Cartesian3());
     * // A shortcut for
     * //   Cartesian3 p = ...
     * //   Cesium.Matrix4.multiplyByVector(matrix, new Cesium.Cartesian4(p.x, p.y, p.z, 0.0), result);
     */
    static multiplyByPointAsVector(matrix: CesiumMatrix4, cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
        const vX = cartesian.x;
        const vY = cartesian.y;
        const vZ = cartesian.z;

        const x = matrix.elements[0] * vX + matrix.elements[4] * vY + matrix.elements[8] * vZ;
        const y = matrix.elements[1] * vX + matrix.elements[5] * vY + matrix.elements[9] * vZ;
        const z = matrix.elements[2] * vX + matrix.elements[6] * vY + matrix.elements[10] * vZ;

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    }

    /**
     * Computes a Matrix4 instance that transforms from world space to view space.
     *
     * @param {Cartesian3} position The position of the camera.
     * @param {Cartesian3} direction The forward direction.
     * @param {Cartesian3} up The up direction.
     * @param {Cartesian3} right The right direction.
     * @param {Matrix4} result The object in which the result will be stored.
     * @returns {Matrix4} The modified result parameter.
     */
    static computeView(position: Cartesian3, direction: Cartesian3, up: Cartesian3, right: Cartesian3, result: CesiumMatrix4): CesiumMatrix4 {
        result.elements[0] = right.x;
        result.elements[1] = up.x;
        result.elements[2] = -direction.x;
        result.elements[3] = 0.0;
        result.elements[4] = right.y;
        result.elements[5] = up.y;
        result.elements[6] = -direction.y;
        result.elements[7] = 0.0;
        result.elements[8] = right.z;
        result.elements[9] = up.z;
        result.elements[10] = -direction.z;
        result.elements[11] = 0.0;
        result.elements[12] = -Cartesian3.dot(right, position);
        result.elements[13] = -Cartesian3.dot(up, position);
        result.elements[14] = Cartesian3.dot(direction, position);
        result.elements[15] = 1.0;
        return result;
    }

    /**
     * Gets the upper left 3x3 matrix of the provided matrix.
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Matrix3} result The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter.
     *
     * @example
     * // returns a Matrix3 instance from a Matrix4 instance
     *
     * // m = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     *
     * const b = new Cesium.Matrix3();
     * Cesium.Matrix4.getMatrix3(m,b);
     *
     * // b = [10.0, 14.0, 18.0]
     * //     [11.0, 15.0, 19.0]
     * //     [12.0, 16.0, 20.0]
     */
    static getMatrix3(matrix: CesiumMatrix4, result: CesiumMatrix3): CesiumMatrix3 {
        // result[0] = matrix[0];
        // result[1] = matrix[1];
        // result[2] = matrix[2];
        // result[3] = matrix[4];
        // result[4] = matrix[5];
        // result[5] = matrix[6];
        // result[6] = matrix[8];
        // result[7] = matrix[9];
        // result[8] = matrix[10];
        // return result;
        return result.setFromMatrix4(matrix);
    }

    /**
     * Multiplies a transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
     * by a 3x3 rotation matrix.  This is an optimization
     * for <code>Matrix4.multiply(m, Matrix4.fromRotationTranslation(rotation), m);</code> with less allocations and arithmetic operations.
     *
     * @param {Matrix4} matrix The matrix on the left-hand side.
     * @param {Matrix3} rotation The 3x3 rotation matrix on the right-hand side.
     * @param {Matrix4} result The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter.
     *
     * @example
     * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromRotationTranslation(rotation), m);
     * Cesium.Matrix4.multiplyByMatrix3(m, rotation, m);
     */
    static multiplyByMatrix3(matrix: CesiumMatrix4, rotation: CesiumMatrix3, result: CesiumMatrix4): CesiumMatrix4 {
        const left0 = matrix.elements[0];
        const left1 = matrix.elements[1];
        const left2 = matrix.elements[2];
        const left4 = matrix.elements[4];
        const left5 = matrix.elements[5];
        const left6 = matrix.elements[6];
        const left8 = matrix.elements[8];
        const left9 = matrix.elements[9];
        const left10 = matrix.elements[10];

        const right0 = rotation.elements[0];
        const right1 = rotation.elements[1];
        const right2 = rotation.elements[2];
        const right4 = rotation.elements[3];
        const right5 = rotation.elements[4];
        const right6 = rotation.elements[5];
        const right8 = rotation.elements[6];
        const right9 = rotation.elements[7];
        const right10 = rotation.elements[8];

        const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
        const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
        const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;

        const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
        const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
        const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;

        const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
        const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
        const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;

        result.elements[0] = column0Row0;
        result.elements[1] = column0Row1;
        result.elements[2] = column0Row2;
        result.elements[3] = 0.0;
        result.elements[4] = column1Row0;
        result.elements[5] = column1Row1;
        result.elements[6] = column1Row2;
        result.elements[7] = 0.0;
        result.elements[8] = column2Row0;
        result.elements[9] = column2Row1;
        result.elements[10] = column2Row2;
        result.elements[11] = 0.0;
        result.elements[12] = matrix.elements[12];
        result.elements[13] = matrix.elements[13];
        result.elements[14] = matrix.elements[14];
        result.elements[15] = matrix.elements[15];
        return result;
    }

    /**
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Matrix4} [left] The first matrix.
     * @param {Matrix4} [right] The second matrix.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     *
     * @example
     * //compares two Matrix4 instances
     *
     * // a = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     *
     * // b = [10.0, 14.0, 18.0, 22.0]
     * //     [11.0, 15.0, 19.0, 23.0]
     * //     [12.0, 16.0, 20.0, 24.0]
     * //     [13.0, 17.0, 21.0, 25.0]
     *
     * if(Cesium.Matrix4.equals(a,b)) {
     *      console.log("Both matrices are equal");
     * } else {
     *      console.log("They are not equal");
     * }
     *
     * //Prints "Both matrices are equal" on the console
     */
    static equals(left: CesiumMatrix4, right: CesiumMatrix4): boolean {
        // Given that most matrices will be transformation matrices, the elements
        // are tested in order such that the test is likely to fail as early
        // as possible.  I _think_ this is just as friendly to the L1 cache
        // as testing in index order.  It is certainty faster in practice.
        return (
            left === right ||
            (defined(left) &&
                defined(right) &&
                // Translation
                left.elements[12] === right.elements[12] &&
                left.elements[13] === right.elements[13] &&
                left.elements[14] === right.elements[14] &&
                // Rotation/scale
                left.elements[0] === right.elements[0] &&
                left.elements[1] === right.elements[1] &&
                left.elements[2] === right.elements[2] &&
                left.elements[4] === right.elements[4] &&
                left.elements[5] === right.elements[5] &&
                left.elements[6] === right.elements[6] &&
                left.elements[8] === right.elements[8] &&
                left.elements[9] === right.elements[9] &&
                left.elements[10] === right.elements[10] &&
                // Bottom row
                left.elements[3] === right.elements[3] &&
                left.elements[7] === right.elements[7] &&
                left.elements[11] === right.elements[11] &&
                left.elements[15] === right.elements[15])
        );
    }

    /**
     * Computes a Matrix4 instance that transforms from normalized device coordinates to window coordinates.
     *
     * @param {Object} [viewport = { x : 0.0, y : 0.0, width : 0.0, height : 0.0 }] The viewport's corners as shown in Example 1.
     * @param {Number} [nearDepthRange=0.0] The near plane distance in window coordinates.
     * @param {Number} [farDepthRange=1.0] The far plane distance in window coordinates.
     * @param {Matrix4} [result] The object in which the result will be stored.
     * @returns {Matrix4} The modified result parameter.
     *
     * @example
     * // Create viewport transformation using an explicit viewport and depth range.
     * const m = Cesium.Matrix4.computeViewportTransformation({
     *     x : 0.0,
     *     y : 0.0,
     *     width : 1024.0,
     *     height : 768.0
     * }, 0.0, 1.0, new Cesium.Matrix4());
     */
    static computeViewportTransformation(viewport: any, nearDepthRange = 0.0, farDepthRange = 1.0, result = new CesiumMatrix4()): CesiumMatrix4 {
        viewport = defaultValue(viewport, defaultValue.EMPTY_OBJECT);
        const x = defaultValue(viewport.x, 0.0);
        const y = defaultValue(viewport.y, 0.0);
        const width = defaultValue(viewport.width, 0.0);
        const height = defaultValue(viewport.height, 0.0);
        nearDepthRange = defaultValue(nearDepthRange, 0.0);
        farDepthRange = defaultValue(farDepthRange, 1.0);

        const halfWidth = width * 0.5;
        const halfHeight = height * 0.5;
        const halfDepth = (farDepthRange - nearDepthRange) * 0.5;

        const column0Row0 = halfWidth;
        const column1Row1 = halfHeight;
        const column2Row2 = halfDepth;
        const column3Row0 = x + halfWidth;
        const column3Row1 = y + halfHeight;
        const column3Row2 = nearDepthRange + halfDepth;
        const column3Row3 = 1.0;

        const elements = result.elements;
        elements[0] = column0Row0;
        elements[1] = 0.0;
        elements[2] = 0.0;
        elements[3] = 0.0;
        elements[4] = 0.0;
        elements[5] = column1Row1;
        elements[6] = 0.0;
        elements[7] = 0.0;
        elements[8] = 0.0;
        elements[9] = 0.0;
        elements[10] = column2Row2;
        elements[11] = 0.0;
        elements[12] = column3Row0;
        elements[13] = column3Row1;
        elements[14] = column3Row2;
        elements[15] = column3Row3;

        return result;
    }

    /**
     * Computes the product of a matrix and a column vector.
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian4} cartesian The vector.
     * @param {Cartesian4} result The object onto which to store the result.
     * @returns {Cartesian4} The modified result parameter.
     */
    static multiplyByVector(matrix: CesiumMatrix4, cartesian: Cartesian4, result: Cartesian4): Cartesian4 {
        const vX = cartesian.x;
        const vY = cartesian.y;
        const vZ = cartesian.z;
        const vW = cartesian.w;

        const elements = matrix.elements;
        const x = elements[0] * vX + elements[4] * vY + elements[8] * vZ + elements[12] * vW;
        const y = elements[1] * vX + elements[5] * vY + elements[9] * vZ + elements[13] * vW;
        const z = elements[2] * vX + elements[6] * vY + elements[10] * vZ + elements[14] * vW;
        const w = elements[3] * vX + elements[7] * vY + elements[11] * vZ + elements[15] * vW;

        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    }

    /**
     * Computes a Matrix4 instance representing an off center perspective transformation.
     *
     * @param {Number} left The number of meters to the left of the camera that will be in view.
     * @param {Number} right The number of meters to the right of the camera that will be in view.
     * @param {Number} bottom The number of meters below of the camera that will be in view.
     * @param {Number} top The number of meters above of the camera that will be in view.
     * @param {Number} near The distance to the near plane in meters.
     * @param {Number} far The distance to the far plane in meters.
     * @param {Matrix4} result The object in which the result will be stored.
     * @returns {Matrix4} The modified result parameter.
     */
    static computePerspectiveOffCenter(left: number, right: number, bottom: number, top: number, near: number, far: number, result: CesiumMatrix4): CesiumMatrix4 {
        const column0Row0 = (2.0 * near) / (right - left);
        const column1Row1 = (2.0 * near) / (top - bottom);
        const column2Row0 = (right + left) / (right - left);
        const column2Row1 = (top + bottom) / (top - bottom);
        const column2Row2 = -(far + near) / (far - near);
        const column2Row3 = -1.0;
        const column3Row2 = (-2.0 * far * near) / (far - near);

        const elements = result.elements;

        elements[0] = column0Row0;
        elements[1] = 0.0;
        elements[2] = 0.0;
        elements[3] = 0.0;
        elements[4] = 0.0;
        elements[5] = column1Row1;
        elements[6] = 0.0;
        elements[7] = 0.0;
        elements[8] = column2Row0;
        elements[9] = column2Row1;
        elements[10] = column2Row2;
        elements[11] = column2Row3;
        elements[12] = 0.0;
        elements[13] = 0.0;
        elements[14] = column3Row2;
        elements[15] = 0.0;
        return result;
    }

    /**
     * Computes a Matrix4 instance representing an infinite off center perspective transformation.
     *
     * @param {Number} left The number of meters to the left of the camera that will be in view.
     * @param {Number} right The number of meters to the right of the camera that will be in view.
     * @param {Number} bottom The number of meters below of the camera that will be in view.
     * @param {Number} top The number of meters above of the camera that will be in view.
     * @param {Number} near The distance to the near plane in meters.
     * @param {Matrix4} result The object in which the result will be stored.
     * @returns {Matrix4} The modified result parameter.
     */
    static computeInfinitePerspectiveOffCenter(left: number, right: number, bottom: number, top: number, near: number, result: CesiumMatrix4): CesiumMatrix4 {
        const column0Row0 = (2.0 * near) / (right - left);
        const column1Row1 = (2.0 * near) / (top - bottom);
        const column2Row0 = (right + left) / (right - left);
        const column2Row1 = (top + bottom) / (top - bottom);
        const column2Row2 = -1.0;
        const column2Row3 = -1.0;
        const column3Row2 = -2.0 * near;

        const elements = result.elements;

        elements[0] = column0Row0;
        elements[1] = 0.0;
        elements[2] = 0.0;
        elements[3] = 0.0;
        elements[4] = 0.0;
        elements[5] = column1Row1;
        elements[6] = 0.0;
        elements[7] = 0.0;
        elements[8] = column2Row0;
        elements[9] = column2Row1;
        elements[10] = column2Row2;
        elements[11] = column2Row3;
        elements[12] = 0.0;
        elements[13] = 0.0;
        elements[14] = column3Row2;
        elements[15] = 0.0;
        return result;
    }
}
