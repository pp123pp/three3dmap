import { defaultValue } from './defaultValue';

export default class PerspectiveFrustum {
    constructor(options: any) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._offCenterFrustum = new PerspectiveOffCenterFrustum();

        /**
         * The angle of the field of view (FOV), in radians.  This angle will be used
         * as the horizontal FOV if the width is greater than the height, otherwise
         * it will be the vertical FOV.
         * @type {Number}
         * @default undefined
         */
        this.fov = options.fov;
        this._fov = undefined;
        this._fovy = undefined;

        this._sseDenominator = undefined;

        /**
         * The aspect ratio of the frustum's width to it's height.
         * @type {Number}
         * @default undefined
         */
        this.aspectRatio = options.aspectRatio;
        this._aspectRatio = undefined;

        /**
         * The distance of the near plane.
         * @type {Number}
         * @default 1.0
         */
        this.near = defaultValue(options.near, 1.0);
        this._near = this.near;

        /**
         * The distance of the far plane.
         * @type {Number}
         * @default 500000000.0
         */
        this.far = defaultValue(options.far, 500000000.0);
        this._far = this.far;

        /**
         * Offsets the frustum in the x direction.
         * @type {Number}
         * @default 0.0
         */
        this.xOffset = defaultValue(options.xOffset, 0.0);
        this._xOffset = this.xOffset;

        /**
         * Offsets the frustum in the y direction.
         * @type {Number}
         * @default 0.0
         */
        this.yOffset = defaultValue(options.yOffset, 0.0);
        this._yOffset = this.yOffset;
    }
}
