import Cartesian3 from '@/Core/Cartesian3';
import Cartographic from '@/Core/Cartographic';
import CesiumMatrix4 from '@/Core/CesiumMatrix4';
import CesiumPlane from '@/Core/CesiumPlane';
import CullingVolume from '@/Core/CullingVolume';
import { defaultValue } from '@/Core/defaultValue';
import defined from '@/Core/defined';
import { MathUtils, PerspectiveCamera } from 'three';
import { IMapCamera } from './MapCamera';
import MapScene from './MapScene';

const worldDirectionWC = new Cartesian3();

const directionWC = new Cartesian3();

const getPlanesRight = new Cartesian3();
const getPlanesNearCenter = new Cartesian3();
const getPlanesFarCenter = new Cartesian3();
const getPlanesNormal = new Cartesian3();

const update = function (frustum: PerspectiveFrustumCamera) {
    if (frustum.fovRadius !== frustum._fovRadius || frustum.aspect !== frustum._aspect || frustum.near !== frustum._near || frustum.far !== frustum._far || frustum.xOffset !== frustum._xOffset || frustum.yOffset !== frustum._yOffset) {
        frustum._aspect = frustum.aspect;
        frustum._fovRadius = frustum.fovRadius;
        frustum._fovy = frustum.aspect <= 1 ? frustum.fovRadius : Math.atan(Math.tan(frustum.fovRadius) / frustum.aspect) * 2.0;
        frustum._near = frustum.near;
        frustum._far = frustum.far;
        frustum._sseDenominator = 2.0 * Math.tan(0.5 * frustum._fovy);
        frustum._xOffset = frustum.xOffset;
        frustum._yOffset = frustum.yOffset;

        const top = (frustum.near * Math.tan(MathUtils.DEG2RAD * 0.5 * frustum.fov)) / frustum.zoom;
        const height = 2 * top;
        const width = frustum.aspect * height;
        const left = -0.5 * width;
        const right = left + width;
        const bottom = top - height;

        frustum.top = top;
        frustum.bottom = bottom;
        frustum.left = left;
        frustum.right = right;
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

    left = 0;
    right = 0;
    top = 0;
    bottom = 0;

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

        const planes = this._cullingVolume.planes;

        const t = this.top;
        const b = this.bottom;
        const r = this.right;
        const l = this.left;
        const n = this.near as number;
        const f = this.far;

        const right = Cartesian3.cross(direction, up, getPlanesRight);

        const nearCenter = getPlanesNearCenter;
        Cartesian3.multiplyByScalar(direction, n, nearCenter);
        Cartesian3.add(position, nearCenter, nearCenter);

        const farCenter = getPlanesFarCenter;
        Cartesian3.multiplyByScalar(direction, f, farCenter);
        Cartesian3.add(position, farCenter, farCenter);

        const normal = getPlanesNormal;

        // Left plane computation
        Cartesian3.multiplyByScalar(right, l, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.normalize(normal, normal);
        Cartesian3.cross(normal, up, normal);
        Cartesian3.normalize(normal, normal);

        let plane = planes[0];
        if (!defined(plane)) {
            plane = planes[0] = new CesiumPlane();
        }
        plane.normal.x = normal.x;
        plane.normal.y = normal.y;
        plane.normal.z = normal.z;
        plane.constant = -Cartesian3.dot(normal, position);

        // Right plane computation
        Cartesian3.multiplyByScalar(right, r, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.cross(up, normal, normal);
        Cartesian3.normalize(normal, normal);

        plane = planes[1];
        if (!defined(plane)) {
            plane = planes[1] = new CesiumPlane();
        }
        plane.normal.x = normal.x;
        plane.normal.y = normal.y;
        plane.normal.z = normal.z;
        plane.constant = -Cartesian3.dot(normal, position);

        // Bottom plane computation
        Cartesian3.multiplyByScalar(up, b, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.cross(right, normal, normal);
        Cartesian3.normalize(normal, normal);

        plane = planes[2];
        if (!defined(plane)) {
            plane = planes[2] = new CesiumPlane();
        }
        plane.normal.x = normal.x;
        plane.normal.y = normal.y;
        plane.normal.z = normal.z;
        plane.constant = -Cartesian3.dot(normal, position);

        // Top plane computation
        Cartesian3.multiplyByScalar(up, t, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.cross(normal, right, normal);
        Cartesian3.normalize(normal, normal);

        plane = planes[3];
        if (!defined(plane)) {
            plane = planes[3] = new CesiumPlane();
        }
        plane.normal.x = normal.x;
        plane.normal.y = normal.y;
        plane.normal.z = normal.z;
        plane.constant = -Cartesian3.dot(normal, position);

        // Near plane computation
        plane = planes[4];
        if (!defined(plane)) {
            plane = planes[4] = new CesiumPlane();
        }
        plane.normal.x = direction.x;
        plane.normal.y = direction.y;
        plane.normal.z = direction.z;
        plane.constant = -Cartesian3.dot(direction, nearCenter);

        // Far plane computation
        Cartesian3.negate(direction, normal);

        plane = planes[5];
        if (!defined(plane)) {
            plane = planes[5] = new CesiumPlane();
        }
        plane.normal.x = normal.x;
        plane.normal.y = normal.y;
        plane.normal.z = normal.z;
        plane.constant = -Cartesian3.dot(normal, farCenter);

        return this._cullingVolume;
    }
}
