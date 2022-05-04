import Cartesian3 from '@/Core/Cartesian3';
import Cartographic from '@/Core/Cartographic';
import { CesiumMath } from '@/Core/CesiumMath';
import CesiumMatrix3 from '@/Core/CesiumMatrix3';
import CesiumMatrix4 from '@/Core/CesiumMatrix4';
import CesiumQuaternion from '@/Core/CesiumQuaternion';
import CullingVolume from '@/Core/CullingVolume';
import defined from '@/Core/defined';
import DeveloperError from '@/Core/DeveloperError';
import Emit from '@/Core/Emit';
import { GeographicProjection } from '@/Core/GeographicProjection';
import { SceneMode } from '@/Core/SceneMode';
import Transforms from '@/Core/Transforms';
import { Frustum, Vector3 } from 'three';
import MapScene from './MapScene';
import PerspectiveFrustumCamera from './PerspectiveFrustumCamera';

export interface IMapCamera {
    fov?: 60.0;
    aspect: number;
    near?: 0.1;
    far?: 10000000000;
}

const lookScratchQuaternion = new CesiumQuaternion();
const lookScratchMatrix = new CesiumMatrix3();
const moveScratch = new Cartesian3();

const setTransformPosition = new Cartesian3();
const setTransformUp = new Cartesian3();
const setTransformDirection = new Cartesian3();

const rotateScratchQuaternion = new CesiumQuaternion();
const rotateScratchMatrix = new CesiumMatrix3();

const scratchHPRMatrix1 = new CesiumMatrix4();
const scratchHPRMatrix2 = new CesiumMatrix4();

const scratchCartesian = new Cartesian3();
export default class MapCamera {
    readonly scene: MapScene;
    private mode = SceneMode.COLUMBUS_VIEW;
    private modeChanged = true;

    readonly moveStart = new Emit();
    readonly moveEnd = new Emit();

    readonly changed = new Emit();

    /**
     * The amount the camera has to change before the <code>changed</code> event is raised. The value is a percentage in the [0, 1] range.
     * @type {number}
     * @default 0.5
     */
    percentageChanged = 0.5;

    frustum: PerspectiveFrustumCamera;

    /**
     * How long in seconds since the camera has stopped moving
     *
     * @private
     */
    timeSinceMoved = 0.0;
    _lastMovedTimestamp = 0.0;

    _changedPosition?: Vector3 = undefined;
    _changedDirection?: Vector3 = undefined;
    _changedFrustum = undefined;

    _position = new Cartesian3();
    _positionWC = new Cartesian3();
    _positionCartographic = new Cartographic();
    _oldPositionWC?: Cartesian3;
    _sseDenominator?: number;

    _transform = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
    _invTransform = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
    _actualTransform = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
    _actualInvTransform = CesiumMatrix4.clone(CesiumMatrix4.IDENTITY);
    _transformChanged = false;
    _mode: SceneMode;

    /**
     * The view direction of the camera.
     *
     * @type {Cartesian3}
     */
    direction = new Cartesian3();
    _direction = new Cartesian3();
    _directionWC = new Cartesian3();

    /**
     * The up direction of the camera.
     *
     * @type {Cartesian3}
     */
    up = new Cartesian3();
    _up = new Cartesian3();
    _upWC = new Cartesian3();

    /**
     * The right direction of the camera.
     *
     * @type {Cartesian3}
     */
    right = new Cartesian3();
    _right = new Cartesian3();
    _rightWC = new Cartesian3();
    _projection: GeographicProjection;

    _modeChanged = true;
    _viewMatrix = new CesiumMatrix4();
    _invViewMatrix = new CesiumMatrix4();

    constructor(scene: MapScene, options: IMapCamera) {
        this.frustum = new PerspectiveFrustumCamera(options);
        this.frustum.scene = scene;
        this.scene = scene;

        this._mode = scene.mode;

        const projection = scene.mapProjection;
        this._projection = projection;

        updateViewMatrix(this);
    }

    get position(): Cartesian3 {
        return this.frustum.position;
    }

    set position(value: Cartesian3) {
        this.position.copy(value);
    }

    get positionWC(): Cartesian3 {
        return this.position;
    }

    get positionCartographic(): Cartographic {
        return this.scene.mapProjection.unproject(this.position, this._positionCartographic);
    }

    get sseDenominator(): number {
        return this.frustum.sseDenominator;
    }

    get cullingVolume(): CullingVolume {
        return this.frustum.cullingVolume;
    }

    get directionWC(): Cartesian3 {
        return this.frustum.directionWC;
    }

    get upWC(): Cartesian3 {
        return this.frustum.up;
    }

    update(mode: SceneMode): void {
        let updateFrustum = false;
        if (mode !== this.mode) {
            this.mode = mode;
            this.modeChanged = mode !== SceneMode.MORPHING;
            updateFrustum = this.mode === SceneMode.SCENE2D;
        }

        // if (updateFrustum) {
        //     const frustum = (this._max2Dfrustum = this.frustum.clone());
        // }
    }

    setSize(container: Element): void {
        this.frustum.setSize(container);
    }

    _updateCameraChanged(): void {
        // const camera = this;
        // updateCameraDeltas(camera);
        // if (camera.changed.numberOfListeners === 0) {
        //     return;
        // }
        // const percentageChanged = camera.percentageChanged;
        // if (!defined(camera._changedDirection)) {
        //     camera._changedPosition = Cartesian3.clone(camera.positionWC, camera._changedPosition);
        //     camera._changedDirection = Cartesian3.clone(camera.directionWC, camera._changedDirection);
        //     return;
        // }
        // const dirAngle = CesiumMath.acosClamped(Cartesian3.dot(camera.directionWC, camera._changedDirection));
        // let dirPercentage;
        // if (defined(camera.frustum.fovy)) {
        //     dirPercentage = dirAngle / (camera.frustum.fovy * 0.5);
        // } else {
        //     dirPercentage = dirAngle;
        // }
        // const distance = Cartesian3.distance(camera.positionWC, camera._changedPosition);
        // const heightPercentage = distance / camera.positionCartographic.height;
        // if (dirPercentage > percentageChanged || heightPercentage > percentageChanged) {
        //     camera.changed.raiseEvent(Math.max(dirPercentage, heightPercentage));
        //     camera._changedPosition = Cartesian3.clone(camera.positionWC, camera._changedPosition);
        //     camera._changedDirection = Cartesian3.clone(camera.directionWC, camera._changedDirection);
        // }
    }

    _setTransform(transform: CesiumMatrix4): void {
        const position = Cartesian3.clone(this.positionWC, setTransformPosition);
        const up = Cartesian3.clone(this.upWC, setTransformUp);
        const direction = Cartesian3.clone(this.directionWC, setTransformDirection);

        CesiumMatrix4.clone(transform, this._transform);
        this._transformChanged = true;
        updateMembers(this);
        const inverse = this._actualInvTransform;

        CesiumMatrix4.multiplyByPoint(inverse, position, this.position);
        CesiumMatrix4.multiplyByPointAsVector(inverse, direction, this.direction);
        CesiumMatrix4.multiplyByPointAsVector(inverse, up, this.up);
        Cartesian3.cross(this.direction, this.up, this.right);

        updateMembers(this);
    }
}

// function updateCameraDeltas(camera: MapCamera) {
//     if (!defined(camera._oldPositionWC)) {
//         camera._oldPositionWC = Cartesian3.clone(camera.positionWC, camera._oldPositionWC);
//     } else {
//         camera.positionWCDeltaMagnitudeLastFrame = camera.positionWCDeltaMagnitude;
//         const delta = Cartesian3.subtract(camera.positionWC, camera._oldPositionWC as Cartesian3, camera._oldPositionWC as Cartesian3);
//         camera.positionWCDeltaMagnitude = Cartesian3.magnitude(delta);
//         camera._oldPositionWC = Cartesian3.clone(camera.positionWC, camera._oldPositionWC);

//         // Update move timers
//         if (camera.positionWCDeltaMagnitude > 0.0) {
//             camera.timeSinceMoved = 0.0;
//             camera._lastMovedTimestamp = getTimestamp();
//         } else {
//             camera.timeSinceMoved = Math.max(getTimestamp() - camera._lastMovedTimestamp, 0.0) / 1000.0;
//         }
//     }
// }

function updateMembers(camera: MapCamera) {
    const mode = camera._mode;

    const heightChanged = false;
    const height = 0.0;
    if (mode === SceneMode.SCENE2D) {
        // height = camera.frustum.right - camera.frustum.left;
        // heightChanged = height !== camera._positionCartographic.height;
    }

    let position = camera._position;
    const positionChanged = !Cartesian3.equals(position, camera.position) || heightChanged;
    if (positionChanged) {
        position = Cartesian3.clone(camera.position, camera._position);
    }

    let up = camera._up;
    const upChanged = !Cartesian3.equals(up, camera.up);
    if (upChanged) {
        Cartesian3.normalize(camera.up, camera.up);
        up = Cartesian3.clone(camera.up, camera._up);
    }

    let direction = camera._direction;
    const directionChanged = !Cartesian3.equals(direction, camera.direction);
    if (directionChanged) {
        Cartesian3.normalize(camera.direction, camera.direction);
        direction = Cartesian3.clone(camera.direction, camera._direction);
    }

    let right = camera._right;
    const rightChanged = !Cartesian3.equals(right, camera.right);
    if (rightChanged) {
        Cartesian3.normalize(camera.right, camera.right);
        right = Cartesian3.clone(camera.right, camera._right);
    }

    const transformChanged = camera._transformChanged || camera._modeChanged;
    camera._transformChanged = false;

    if (transformChanged) {
        CesiumMatrix4.inverseTransformation(camera._transform, camera._invTransform);

        if (camera._mode === SceneMode.COLUMBUS_VIEW || camera._mode === SceneMode.SCENE2D) {
            convertTransformForColumbusView(camera);
        } else {
            CesiumMatrix4.clone(camera._transform, camera._actualTransform);
        }

        CesiumMatrix4.inverseTransformation(camera._actualTransform, camera._actualInvTransform);

        camera._modeChanged = false;
    }

    const transform = camera._actualTransform;

    if (positionChanged || transformChanged) {
        camera._positionWC = CesiumMatrix4.multiplyByPoint(transform, position, camera._positionWC);

        // Compute the Cartographic position of the camera.
        if (mode === SceneMode.SCENE3D || mode === SceneMode.MORPHING) {
            camera._positionCartographic = camera._projection.ellipsoid.cartesianToCartographic(camera._positionWC, camera._positionCartographic) as Cartographic;
        } else {
            // The camera position is expressed in the 2D coordinate system where the Y axis is to the East,
            // the Z axis is to the North, and the X axis is out of the map.  Express them instead in the ENU axes where
            // X is to the East, Y is to the North, and Z is out of the local horizontal plane.
            const positionENU = scratchCartesian;
            positionENU.x = camera._positionWC.y;
            positionENU.y = camera._positionWC.z;
            positionENU.z = camera._positionWC.x;

            // In 2D, the camera height is always 12.7 million meters.
            // The apparent height is equal to half the frustum width.
            if (mode === SceneMode.SCENE2D) {
                positionENU.z = height;
            }

            camera._projection.unproject(positionENU, camera._positionCartographic);
        }
    }

    if (directionChanged || upChanged || rightChanged) {
        const det = Cartesian3.dot(direction, Cartesian3.cross(up, right, scratchCartesian));
        if (Math.abs(1.0 - det) > CesiumMath.EPSILON2) {
            // orthonormalize axes
            const invUpMag = 1.0 / Cartesian3.magnitudeSquared(up);
            const scalar = Cartesian3.dot(up, direction) * invUpMag;
            const w0 = Cartesian3.multiplyByScalar(direction, scalar, scratchCartesian);
            up = Cartesian3.normalize(Cartesian3.subtract(up, w0, camera._up), camera._up);
            Cartesian3.clone(up, camera.up);

            right = Cartesian3.cross(direction, up, camera._right);
            Cartesian3.clone(right, camera.right);
        }
    }

    if (directionChanged || transformChanged) {
        camera._directionWC = CesiumMatrix4.multiplyByPointAsVector(transform, direction, camera._directionWC);
        Cartesian3.normalize(camera._directionWC, camera._directionWC);
    }

    if (upChanged || transformChanged) {
        camera._upWC = CesiumMatrix4.multiplyByPointAsVector(transform, up, camera._upWC);
        Cartesian3.normalize(camera._upWC, camera._upWC);
    }

    if (rightChanged || transformChanged) {
        camera._rightWC = CesiumMatrix4.multiplyByPointAsVector(transform, right, camera._rightWC);
        Cartesian3.normalize(camera._rightWC, camera._rightWC);
    }

    if (positionChanged || directionChanged || upChanged || rightChanged || transformChanged) {
        updateViewMatrix(camera);
    }
}

function convertTransformForColumbusView(camera: MapCamera) {
    Transforms.basisTo2D(camera._projection, camera._transform, camera._actualTransform);
}

function updateViewMatrix(camera: MapCamera) {
    CesiumMatrix4.computeView(camera._position, camera._direction, camera._up, camera._right, camera._viewMatrix);
    CesiumMatrix4.multiply(camera._viewMatrix, camera._actualInvTransform, camera._viewMatrix);
    CesiumMatrix4.inverseTransformation(camera._viewMatrix, camera._invViewMatrix);

    // CesiumMatrix4.transformToThreeMatrix4(camera._invViewMatrix, camera.frustum.matrixWorld);

    camera.frustum.matrixWorld.copy(camera._invViewMatrix);

    camera.frustum.matrixWorld.decompose(camera.frustum.position, camera.frustum.quaternion, camera.frustum.scale);
}
