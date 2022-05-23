import Cartesian3 from '@/Core/Cartesian3';
import Cartographic from '@/Core/Cartographic';
import CesiumMatrix4 from '@/Core/CesiumMatrix4';
import CullingVolume from '@/Core/CullingVolume';
import { defaultValue } from '@/Core/defaultValue';
import { SceneMode } from '@/Core/SceneMode';
import { Frustum, MathUtils, PerspectiveCamera } from 'three';
import { IMapCamera } from './MapCamera';
import MapScene from './MapScene';
import { PerspectiveOffCenterFrustum } from './PerspectiveOffCenterFrustum';

const worldDirectionWC = new Cartesian3();

const directionWC = new Cartesian3();

const update = function (frustum: PerspectiveFrustumCamera) {
    // if (frustum.fovRadius !== frustum._fovRadius || frustum.aspect !== frustum._aspect || frustum.near !== frustum._near || frustum.far !== frustum._far) {
    //     frustum._aspect = frustum.aspect;
    //     frustum._fovRadius = frustum.fovRadius;
    //     frustum._fovy = frustum.aspect <= 1 ? frustum.fovRadius : Math.atan(Math.tan(frustum.fovRadius * 0.5) / frustum.aspect) * 2.0;
    //     frustum._near = frustum.near;
    //     frustum._far = frustum.far;
    //     frustum._sseDenominator = 2.0 * Math.tan(0.5 * frustum._fovy);
    //     // frustum._xOffset = frustum.xOffset;
    //     // frustum._yOffset = frustum.yOffset;
    // }

    const f = frustum._offCenterFrustum;

    if (frustum.fovRadius !== frustum._fovRadius || frustum.aspect !== frustum._aspect || frustum.near !== frustum._near || frustum.far !== frustum._far || frustum.xOffset !== frustum._xOffset || frustum.yOffset !== frustum._yOffset) {
        frustum._aspect = frustum.aspect;
        frustum._fovRadius = frustum.fovRadius;
        frustum._fovy = frustum.aspect <= 1 ? frustum.fovRadius : Math.atan(Math.tan(frustum.fovRadius * 0.5) / frustum.aspect) * 2.0;
        frustum._near = frustum.near;
        frustum._far = frustum.far;
        frustum._sseDenominator = 2.0 * Math.tan(0.5 * frustum._fovy);
        frustum._xOffset = frustum.xOffset;
        frustum._yOffset = frustum.yOffset;

        f.top = frustum.near * Math.tan(0.5 * frustum._fovy);
        f.bottom = -f.top;
        f.right = frustum.aspect * f.top;
        f.left = -f.right;
        f.near = frustum.near;
        f.far = frustum.far;

        f.right += frustum.xOffset;
        f.left += frustum.xOffset;
        f.top += frustum.yOffset;
        f.bottom += frustum.yOffset;
    }
};

export default class PerspectiveFrustumCamera extends PerspectiveCamera {
    containerWidth = 0;
    containerHeight = 0;
    _sseDenominator = 0.0;
    scene?: MapScene;
    _fovRadius?: number;
    _near?: number;
    _far?: number;
    _fovy?: number = 0;
    _aspect?: number;
    _aspectRatio?: number;
    _fov?: number;
    _xOffset?: number;
    xOffset: number;
    _yOffset: number;
    yOffset: number;
    _projScreenMatrix = new CesiumMatrix4();

    // 使用经纬度表示的坐标
    _positionCartographic = new Cartographic();
    _frustum = new CullingVolume();

    _cullingVolume = new CullingVolume();

    _offCenterFrustum = new PerspectiveOffCenterFrustum();

    constructor(options: IMapCamera) {
        super(options.fov, options.aspect, options.near, options.far);
        // this._fovRadius = this.fovRadius;
        // this._near = this.near;
        // this._far = this.far;
        // this._aspect = this.aspect;

        // this.up.set(0, 0, 1);

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

    setSize(container: Element): void {
        const { clientWidth, clientHeight } = container;

        this.aspect = clientWidth / clientHeight;

        if (this.aspect > 1) {
            this.fov = (Math.atan(Math.tan((60 * Math.PI) / 360) / this.aspect) * 360) / Math.PI;
        } else {
            // this.fov = 2 * Math.atan(Math.tan(CesiumMath.toRadians(60) / 2) * this.aspect) * 180 / Math.PI;
            this.fov = 60;
        }

        // this.fov = 60;

        this.updateProjectionMatrix();

        this.containerWidth = clientWidth;
        this.containerHeight = clientHeight;
    }

    get worldDirection(): Cartesian3 {
        return this.getWorldDirection(worldDirectionWC);
    }

    get directionWC(): Cartesian3 {
        this.getWorldDirection(directionWC);

        return directionWC;
    }

    get cullingVolume(): CullingVolume {
        this.updateProjectionMatrix();
        this._projScreenMatrix.multiplyMatrices(this.projectionMatrix, this.matrixWorldInverse);
        this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

        return this._frustum;
    }

    get positionWC(): Cartesian3 {
        return this.position;
    }

    get fovy(): number {
        update(this);
        return this._fovy as number;
    }

    get sseDenominator(): number {
        update(this);
        return this._sseDenominator;
        // this.updateProjectionMatrix();
        // return 2.0 * Math.tan(0.5 * this.fov * THREE.MathUtils.DEG2RAD) / this._scene.drawingBufferSize.height;
    }

    get fovRadius(): number {
        return MathUtils.degToRad(this.fov);
    }

    get aspectRatio(): number {
        return this.aspect;
    }

    set aspectRatio(value: number) {
        this.aspect = value;
    }

    /**
     * Creates a culling volume for this frustum.
     *
     * @param {Cartesian3} position The eye position.
     * @param {Cartesian3} direction The view direction.
     * @param {Cartesian3} up The up direction.
     * @returns {CullingVolume} A culling volume at the given position and orientation.
     *
     * @example
     * // Check if a bounding volume intersects the frustum.
     * const cullingVolume = frustum.computeCullingVolume(cameraPosition, cameraDirection, cameraUp);
     * const intersect = cullingVolume.computeVisibility(boundingVolume);
     */
    computeCullingVolume(position: Cartesian3, direction: Cartesian3, up: Cartesian3): CullingVolume {
        update(this);
        return this._offCenterFrustum.computeCullingVolume(position, direction, up);
    }
}
