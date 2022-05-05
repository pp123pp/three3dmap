import Cartesian3 from '@/Core/Cartesian3';
import Cartographic from '@/Core/Cartographic';
import { CesiumMath } from '@/Core/CesiumMath';
import CesiumMatrix3 from '@/Core/CesiumMatrix3';
import CesiumMatrix4 from '@/Core/CesiumMatrix4';
import CesiumQuaternion from '@/Core/CesiumQuaternion';
import CullingVolume from '@/Core/CullingVolume';
import { defaultValue } from '@/Core/defaultValue';
import defined from '@/Core/defined';
import DeveloperError from '@/Core/DeveloperError';
import EllipsoidGeodesic from '@/Core/EllipsoidGeodesic';
import Emit from '@/Core/Emit';
import { GeographicProjection } from '@/Core/GeographicProjection';
import { HeadingPitchRoll } from '@/Core/HeadingPitchRoll';
import Rectangle from '@/Core/Rectangle';
import { SceneMode } from '@/Core/SceneMode';
import Transforms from '@/Core/Transforms';
import { Frustum, OrthographicCamera, Vector3 } from 'three';
import MapScene from './MapScene';
import PerspectiveFrustumCamera from './PerspectiveFrustumCamera';

export interface IMapCamera {
    fov?: 60.0;
    aspect: number;
    near?: 0.1;
    far?: number;
}

interface IOrientation {
    heading?: number;
    pitch?: number;
    roll?: number;
    direction?: Cartesian3;
    up?: Cartesian3;
}

interface ISetViewOptions {
    destination?: Cartesian3;
    orientation?: IOrientation;
    endTransform?: CesiumMatrix4;
    convert?: number;
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

const scratchSetViewOptions = {
    destination: undefined,
    orientation: {
        direction: undefined,
        up: undefined,
        heading: undefined,
        pitch: undefined,
        roll: undefined,
    },
    convert: undefined,
    endTransform: undefined,
};

const scratchHpr = new HeadingPitchRoll();

const scratchSetViewCartesian = new Cartesian3();
const scratchSetViewTransform1 = new CesiumMatrix4();
const scratchSetViewTransform2 = new CesiumMatrix4();
const scratchSetViewQuaternion = new CesiumQuaternion();
const scratchSetViewMatrix3 = new CesiumMatrix3();
const scratchSetViewCartographic = new Cartographic();

export default class MapCamera {
    readonly scene: MapScene;
    mode = SceneMode.COLUMBUS_VIEW;
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

    /**
     * The position of the camera.
     *
     * @type {Cartesian3}
     */
    position = new Cartesian3();
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

        rectangleCameraPosition3D(this, MapCamera.DEFAULT_VIEW_RECTANGLE, this.position, true);

        let mag = Cartesian3.magnitude(this.position);
        mag += mag * MapCamera.DEFAULT_VIEW_FACTOR;
        Cartesian3.normalize(this.position, this.position);
        Cartesian3.multiplyByScalar(this.position, mag, this.position);
    }

    static TRANSFORM_2D = new CesiumMatrix4().set(0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0);

    /**
     * The default rectangle the camera will view on creation.
     * @type Rectangle
     */
    static DEFAULT_VIEW_RECTANGLE = Rectangle.fromDegrees(-95.0, -20.0, -70.0, 90.0);

    /**
     * A scalar to multiply to the camera position and add it back after setting the camera to view the rectangle.
     * A value of zero means the camera will view the entire {@link Camera#DEFAULT_VIEW_RECTANGLE}, a value greater than zero
     * will move it further away from the extent, and a value less than zero will move it close to the extent.
     * @type Number
     */
    static DEFAULT_VIEW_FACTOR = 0.5;

    /**
     * Gets the camera's reference frame. The inverse of this transformation is appended to the view matrix.
     * @memberof Camera.prototype
     *
     * @type {Matrix4}
     * @readonly
     *
     * @default {@link Matrix4.IDENTITY}
     */
    get transform(): CesiumMatrix4 {
        return this._transform;
    }

    get inverseTransform(): CesiumMatrix4 {
        updateMembers(this);
        return this._invTransform;
    }

    get viewMatrix(): CesiumMatrix4 {
        updateMembers(this);
        return this._viewMatrix;
    }

    get inverseViewMatrix(): CesiumMatrix4 {
        updateMembers(this);
        return this.inverseViewMatrix;
    }

    get positionCartographic(): Cartographic {
        updateMembers(this);
        return this._positionCartographic;
    }

    get positionWC(): Cartesian3 {
        updateMembers(this);
        return this._positionWC;
    }

    get directionWC(): Cartesian3 {
        updateMembers(this);
        return this._directionWC;
    }

    get upWC(): Cartesian3 {
        updateMembers(this);
        return this._upWC;
    }

    get rightWC(): Cartesian3 {
        updateMembers(this);
        return this._rightWC;
    }

    /**
     * Gets the camera heading in radians.
     * @memberof Camera.prototype
     *
     * @type {Number}
     * @readonly
     */
    get heading(): number {
        const ellipsoid = this._projection.ellipsoid;

        const oldTransform = CesiumMatrix4.clone(this._transform, scratchHPRMatrix1);
        const transform = (Transforms as any).eastNorthUpToFixedFrame(this.positionWC, ellipsoid, scratchHPRMatrix2);
        this._setTransform(transform);

        const heading = getHeading(this.direction, this.up);

        this._setTransform(oldTransform);

        return heading;
    }

    get pitch(): number {
        const ellipsoid = this._projection.ellipsoid;

        const oldTransform = CesiumMatrix4.clone(this._transform, scratchHPRMatrix1);
        const transform = (Transforms as any).eastNorthUpToFixedFrame(this.positionWC, ellipsoid, scratchHPRMatrix2);
        this._setTransform(transform);

        const pitch = getPitch(this.direction);

        this._setTransform(oldTransform);

        return pitch;
    }

    get roll(): number {
        const ellipsoid = this._projection.ellipsoid;

        const oldTransform = CesiumMatrix4.clone(this._transform, scratchHPRMatrix1);
        const transform = (Transforms as any).eastNorthUpToFixedFrame(this.positionWC, ellipsoid, scratchHPRMatrix2);
        this._setTransform(transform);

        const roll = getRoll(this.direction, this.up, this.right);

        this._setTransform(oldTransform);

        return roll;
    }

    // get position(): Cartesian3 {
    //     return this.frustum.position;
    // }

    // set position(value: Cartesian3) {
    //     this.position.copy(value);
    // }

    // get positionCartographic(): Cartographic {
    //     return this.scene.mapProjection.unproject(this.position, this._positionCartographic);
    // }

    get sseDenominator(): number {
        return this.frustum.sseDenominator;
    }

    get cullingVolume(): CullingVolume {
        return this.frustum.cullingVolume;
    }

    // get directionWC(): Cartesian3 {
    //     return this.frustum.directionWC;
    // }

    // get upWC(): Cartesian3 {
    //     return this.frustum.up;
    // }

    /**
     * Sets the camera position, orientation and transform.
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3|Rectangle} [options.destination] The final position of the camera in WGS84 (world) coordinates or a rectangle that would be visible from a top-down view.
     * @param {Object} [options.orientation] An object that contains either direction and up properties or heading, pitch and roll properties. By default, the direction will point
     * towards the center of the frame in 3D and in the negative z direction in Columbus view. The up direction will point towards local north in 3D and in the positive
     * y direction in Columbus view. Orientation is not used in 2D when in infinite scrolling mode.
     * @param {Matrix4} [options.endTransform] Transform matrix representing the reference frame of the camera.
     * @param {Boolean} [options.convert] Whether to convert the destination from world coordinates to scene coordinates (only relevant when not using 3D). Defaults to <code>true</code>.
     *
     * @example
     * // 1. Set position with a top-down view
     * viewer.camera.setView({
     *     destination : Cesium.Cartesian3.fromDegrees(-117.16, 32.71, 15000.0)
     * });
     *
     * // 2 Set view with heading, pitch and roll
     * viewer.camera.setView({
     *     destination : cartesianPosition,
     *     orientation: {
     *         heading : Cesium.Math.toRadians(90.0), // east, default value is 0.0 (north)
     *         pitch : Cesium.Math.toRadians(-90),    // default value (looking down)
     *         roll : 0.0                             // default value
     *     }
     * });
     *
     * // 3. Change heading, pitch and roll with the camera position remaining the same.
     * viewer.camera.setView({
     *     orientation: {
     *         heading : Cesium.Math.toRadians(90.0), // east, default value is 0.0 (north)
     *         pitch : Cesium.Math.toRadians(-90),    // default value (looking down)
     *         roll : 0.0                             // default value
     *     }
     * });
     *
     *
     * // 4. View rectangle with a top-down view
     * viewer.camera.setView({
     *     destination : Cesium.Rectangle.fromDegrees(west, south, east, north)
     * });
     *
     * // 5. Set position with an orientation using unit vectors.
     * viewer.camera.setView({
     *     destination : Cesium.Cartesian3.fromDegrees(-122.19, 46.25, 5000.0),
     *     orientation : {
     *         direction : new Cesium.Cartesian3(-0.04231243104240401, -0.20123236049443421, -0.97862924300734),
     *         up : new Cesium.Cartesian3(-0.47934589305293746, -0.8553216253114552, 0.1966022179118339)
     *     }
     * });
     */
    setView(options?: ISetViewOptions): void {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT) as ISetViewOptions;
        let orientation = defaultValue(options.orientation, defaultValue.EMPTY_OBJECT);

        const mode = this._mode;
        if (mode === SceneMode.MORPHING) {
            return;
        }

        if (defined(options.endTransform)) {
            this._setTransform(options.endTransform as CesiumMatrix4);
        }

        let convert = defaultValue(options.convert, true);
        let destination = defaultValue(options.destination, Cartesian3.clone(this.positionWC, scratchSetViewCartesian));
        if (defined(destination) && defined(destination.west)) {
            destination = this.getRectangleCameraCoordinates(destination, scratchSetViewCartesian);
            convert = false;
        }

        if (defined(orientation.direction)) {
            orientation = directionUpToHeadingPitchRoll(this, destination, orientation, scratchSetViewOptions.orientation);
        }

        scratchHpr.heading = defaultValue(orientation.heading, 0.0);
        scratchHpr.pitch = defaultValue(orientation.pitch, -CesiumMath.PI_OVER_TWO);
        scratchHpr.roll = defaultValue(orientation.roll, 0.0);

        if (mode === SceneMode.SCENE3D) {
            // setView3D(this, destination, scratchHpr);
        } else if (mode === SceneMode.SCENE2D) {
            // setView2D(this, destination, scratchHpr, convert);
        } else {
            setViewCV(this, destination, scratchHpr, convert);
        }
    }

    /**
     * Get the camera position needed to view a rectangle on an ellipsoid or map
     *
     * @param {Rectangle} rectangle The rectangle to view.
     * @param {Cartesian3} [result] The camera position needed to view the rectangle
     * @returns {Cartesian3} The camera position needed to view the rectangle
     */
    getRectangleCameraCoordinates(rectangle: Rectangle, result = new Cartesian3()): Cartesian3 | undefined {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        //>>includeEnd('debug');
        const mode = this._mode;

        if (mode === SceneMode.SCENE3D) {
            // return rectangleCameraPosition3D(this, rectangle, result);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            return rectangleCameraPositionColumbusView(this, rectangle, result);
        } else if (mode === SceneMode.SCENE2D) {
            // return rectangleCameraPosition2D(this, rectangle, result);
        }

        return undefined;
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

    _adjustOrthographicFrustum(zooming?: any): void {
        // if (!(this.frustum instanceof OrthographicFrustum)) {

        // }
        return undefined;
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

    let direction = camera._direction;
    const directionChanged = !Cartesian3.equals(direction, camera.direction);
    if (directionChanged) {
        Cartesian3.normalize(camera.direction, camera.direction);
        direction = Cartesian3.clone(camera.direction, camera._direction);
    }

    let up = camera._up;
    const upChanged = !Cartesian3.equals(up, camera.up);
    if (upChanged) {
        Cartesian3.normalize(camera.up, camera.up);
        up = Cartesian3.clone(camera.up, camera._up);
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
        if (camera._mode === SceneMode.COLUMBUS_VIEW || camera._mode === SceneMode.SCENE2D) {
            if (CesiumMatrix4.equals(CesiumMatrix4.IDENTITY, camera._transform)) {
                CesiumMatrix4.clone(MapCamera.TRANSFORM_2D, camera._actualTransform);
            } else if (camera._mode === SceneMode.COLUMBUS_VIEW) {
                convertTransformForColumbusView(camera);
            } else {
                // convertTransformFor2D(camera);
            }
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

const viewRectangleCVCartographic = new Cartographic();
const viewRectangleCVNorthEast = new Cartesian3();
const viewRectangleCVSouthWest = new Cartesian3();
function rectangleCameraPositionColumbusView(camera: MapCamera, rectangle: Rectangle, result: Cartesian3): Cartesian3 {
    const projection = camera._projection;
    if (rectangle.west > rectangle.east) {
        rectangle = Rectangle.MAX_VALUE;
    }
    const transform = camera._actualTransform;
    const invTransform = camera._actualInvTransform;

    const cart = viewRectangleCVCartographic;
    cart.longitude = rectangle.east;
    cart.latitude = rectangle.north;
    const northEast = projection.project(cart, viewRectangleCVNorthEast);
    CesiumMatrix4.multiplyByPoint(transform, northEast, northEast);
    CesiumMatrix4.multiplyByPoint(invTransform, northEast, northEast);

    cart.longitude = rectangle.west;
    cart.latitude = rectangle.south;
    const southWest = projection.project(cart, viewRectangleCVSouthWest);
    CesiumMatrix4.multiplyByPoint(transform, southWest, southWest);
    CesiumMatrix4.multiplyByPoint(invTransform, southWest, southWest);

    result.x = (northEast.x - southWest.x) * 0.5 + southWest.x;
    result.y = (northEast.y - southWest.y) * 0.5 + southWest.y;

    if (defined(camera.frustum.fovy)) {
        const tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        const tanTheta = camera.frustum.aspectRatio * tanPhi;
        result.z = Math.max((northEast.x - southWest.x) / tanTheta, (northEast.y - southWest.y) / tanPhi) * 0.5;
    } else {
        const width = northEast.x - southWest.x;
        const height = northEast.y - southWest.y;
        result.z = Math.max(width, height);
    }

    return result;
}

const scratchToHPRDirection = new Cartesian3();
const scratchToHPRUp = new Cartesian3();
const scratchToHPRRight = new Cartesian3();

function directionUpToHeadingPitchRoll(camera: MapCamera, position: Cartesian3, orientation: IOrientation, result: IOrientation) {
    const direction = Cartesian3.clone(orientation.direction as Cartesian3, scratchToHPRDirection);
    const up = Cartesian3.clone(orientation.up as Cartesian3, scratchToHPRUp);

    if (camera.mode === SceneMode.SCENE3D) {
        const ellipsoid = camera._projection.ellipsoid;
        const transform = (Transforms as any).eastNorthUpToFixedFrame(position, ellipsoid, scratchHPRMatrix1);
        const invTransform = CesiumMatrix4.inverseTransformation(transform, scratchHPRMatrix2);

        CesiumMatrix4.multiplyByPointAsVector(invTransform, direction, direction);
        CesiumMatrix4.multiplyByPointAsVector(invTransform, up, up);
    }

    const right = Cartesian3.cross(direction, up, scratchToHPRRight);

    result.heading = getHeading(direction, up);
    result.pitch = getPitch(direction);
    result.roll = getRoll(direction, up, right);

    return result;
}

function setViewCV(camera: MapCamera, position: Cartesian3, hpr: HeadingPitchRoll, convert: boolean) {
    const currentTransform = CesiumMatrix4.clone(camera.transform, scratchSetViewTransform1);
    camera._setTransform(CesiumMatrix4.IDENTITY);

    if (!Cartesian3.equals(position, camera.positionWC)) {
        if (convert) {
            const projection = camera._projection;
            const cartographic = projection.ellipsoid.cartesianToCartographic(position, scratchSetViewCartographic) as Cartographic;
            position = projection.project(cartographic, scratchSetViewCartesian);
        }
        Cartesian3.clone(position, camera.position);
    }
    hpr.heading = hpr.heading - CesiumMath.PI_OVER_TWO;

    const rotQuat = CesiumQuaternion.fromHeadingPitchRoll(hpr, scratchSetViewQuaternion);
    const rotMat = CesiumMatrix3.fromQuaternion(rotQuat, scratchSetViewMatrix3);

    CesiumMatrix3.getColumn(rotMat, 0, camera.direction);
    CesiumMatrix3.getColumn(rotMat, 2, camera.up);
    Cartesian3.cross(camera.direction, camera.up, camera.right);

    camera._setTransform(currentTransform);

    camera._adjustOrthographicFrustum(true);
}

function getHeading(direction: Cartesian3, up: Cartesian3) {
    let heading;
    if (!CesiumMath.equalsEpsilon(Math.abs(direction.z), 1.0, CesiumMath.EPSILON3)) {
        heading = Math.atan2(direction.y, direction.x) - CesiumMath.PI_OVER_TWO;
    } else {
        heading = Math.atan2(up.y, up.x) - CesiumMath.PI_OVER_TWO;
    }

    return CesiumMath.TWO_PI - CesiumMath.zeroToTwoPi(heading);
}

function getPitch(direction: Cartesian3) {
    return CesiumMath.PI_OVER_TWO - CesiumMath.acosClamped(direction.z);
}

function getRoll(direction: Cartesian3, up: Cartesian3, right: Cartesian3) {
    let roll = 0.0;
    if (!CesiumMath.equalsEpsilon(Math.abs(direction.z), 1.0, CesiumMath.EPSILON3)) {
        roll = Math.atan2(-right.z, up.z);
        roll = CesiumMath.zeroToTwoPi(roll + CesiumMath.TWO_PI);
    }

    return roll;
}

const viewRectangle3DCartographic1 = new Cartographic();
const viewRectangle3DCartographic2 = new Cartographic();
const viewRectangle3DNorthEast = new Cartesian3();
const viewRectangle3DSouthWest = new Cartesian3();
const viewRectangle3DNorthWest = new Cartesian3();
const viewRectangle3DSouthEast = new Cartesian3();
const viewRectangle3DNorthCenter = new Cartesian3();
const viewRectangle3DSouthCenter = new Cartesian3();
const viewRectangle3DCenter = new Cartesian3();
const viewRectangle3DEquator = new Cartesian3();
const defaultRF = {
    direction: new Cartesian3(),
    right: new Cartesian3(),
    up: new Cartesian3(),
};
let viewRectangle3DEllipsoidGeodesic: EllipsoidGeodesic;

function computeD(direction: Cartesian3, upOrRight: Cartesian3, corner: Cartesian3, tanThetaOrPhi: number) {
    const opposite = Math.abs(Cartesian3.dot(upOrRight, corner));
    return opposite / tanThetaOrPhi - Cartesian3.dot(direction, corner);
}

function rectangleCameraPosition3D(camera: MapCamera, rectangle: Rectangle, result: Cartesian3, updateCamera: boolean) {
    const ellipsoid = camera._projection.ellipsoid;
    const cameraRF = updateCamera ? camera : defaultRF;

    const north = rectangle.north;
    const south = rectangle.south;
    let east = rectangle.east;
    const west = rectangle.west;

    // If we go across the International Date Line
    if (west > east) {
        east += CesiumMath.TWO_PI;
    }

    // Find the midpoint latitude.
    //
    // EllipsoidGeodesic will fail if the north and south edges are very close to being on opposite sides of the ellipsoid.
    // Ideally we'd just call EllipsoidGeodesic.setEndPoints and let it throw when it detects this case, but sadly it doesn't
    // even look for this case in optimized builds, so we have to test for it here instead.
    //
    // Fortunately, this case can only happen (here) when north is very close to the north pole and south is very close to the south pole,
    // so handle it just by using 0 latitude as the center.  It's certainliy possible to use a smaller tolerance
    // than one degree here, but one degree is safe and putting the center at 0 latitude should be good enough for any
    // rectangle that spans 178+ of the 180 degrees of latitude.
    const longitude = (west + east) * 0.5;
    let latitude;
    if (south < -CesiumMath.PI_OVER_TWO + CesiumMath.RADIANS_PER_DEGREE && north > CesiumMath.PI_OVER_TWO - CesiumMath.RADIANS_PER_DEGREE) {
        latitude = 0.0;
    } else {
        const northCartographic = viewRectangle3DCartographic1;
        northCartographic.longitude = longitude;
        northCartographic.latitude = north;
        northCartographic.height = 0.0;

        const southCartographic = viewRectangle3DCartographic2;
        southCartographic.longitude = longitude;
        southCartographic.latitude = south;
        southCartographic.height = 0.0;

        let ellipsoidGeodesic = viewRectangle3DEllipsoidGeodesic;
        if (!defined(ellipsoidGeodesic) || ellipsoidGeodesic.ellipsoid !== ellipsoid) {
            viewRectangle3DEllipsoidGeodesic = ellipsoidGeodesic = new EllipsoidGeodesic(undefined, undefined, ellipsoid);
        }

        ellipsoidGeodesic.setEndPoints(northCartographic, southCartographic);
        latitude = ellipsoidGeodesic.interpolateUsingFraction(0.5, viewRectangle3DCartographic1).latitude;
    }

    const centerCartographic = viewRectangle3DCartographic1;
    centerCartographic.longitude = longitude;
    centerCartographic.latitude = latitude;
    centerCartographic.height = 0.0;

    const center = ellipsoid.cartographicToCartesian(centerCartographic, viewRectangle3DCenter);

    const cart = viewRectangle3DCartographic1;
    cart.longitude = east;
    cart.latitude = north;
    const northEast = ellipsoid.cartographicToCartesian(cart, viewRectangle3DNorthEast);
    cart.longitude = west;
    const northWest = ellipsoid.cartographicToCartesian(cart, viewRectangle3DNorthWest);
    cart.longitude = longitude;
    const northCenter = ellipsoid.cartographicToCartesian(cart, viewRectangle3DNorthCenter);
    cart.latitude = south;
    const southCenter = ellipsoid.cartographicToCartesian(cart, viewRectangle3DSouthCenter);
    cart.longitude = east;
    const southEast = ellipsoid.cartographicToCartesian(cart, viewRectangle3DSouthEast);
    cart.longitude = west;
    const southWest = ellipsoid.cartographicToCartesian(cart, viewRectangle3DSouthWest);

    Cartesian3.subtract(northWest, center, northWest);
    Cartesian3.subtract(southEast, center, southEast);
    Cartesian3.subtract(northEast, center, northEast);
    Cartesian3.subtract(southWest, center, southWest);
    Cartesian3.subtract(northCenter, center, northCenter);
    Cartesian3.subtract(southCenter, center, southCenter);

    const direction = ellipsoid.geodeticSurfaceNormal(center, cameraRF.direction) as Cartesian3;
    Cartesian3.negate(direction, direction);
    const right = Cartesian3.cross(direction, Cartesian3.UNIT_Z, cameraRF.right);
    Cartesian3.normalize(right, right);
    const up = Cartesian3.cross(right, direction, cameraRF.up);

    let d = 1;
    if (camera.frustum instanceof OrthographicCamera) {
        // const width = Math.max(Cartesian3.distance(northEast, northWest), Cartesian3.distance(southEast, southWest));
        // const height = Math.max(Cartesian3.distance(northEast, southEast), Cartesian3.distance(northWest, southWest));
        // let rightScalar;
        // let topScalar;
        // const ratio = camera.frustum._offCenterFrustum.right / camera.frustum._offCenterFrustum.top;
        // const heightRatio = height * ratio;
        // if (width > heightRatio) {
        //     rightScalar = width;
        //     topScalar = rightScalar / ratio;
        // } else {
        //     topScalar = height;
        //     rightScalar = heightRatio;
        // }
        // d = Math.max(rightScalar, topScalar);
    } else {
        const tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        const tanTheta = camera.frustum.aspectRatio * tanPhi;

        d = Math.max(
            computeD(direction, up, northWest, tanPhi),
            computeD(direction, up, southEast, tanPhi),
            computeD(direction, up, northEast, tanPhi),
            computeD(direction, up, southWest, tanPhi),
            computeD(direction, up, northCenter, tanPhi),
            computeD(direction, up, southCenter, tanPhi),
            computeD(direction, right, northWest, tanTheta),
            computeD(direction, right, southEast, tanTheta),
            computeD(direction, right, northEast, tanTheta),
            computeD(direction, right, southWest, tanTheta),
            computeD(direction, right, northCenter, tanTheta),
            computeD(direction, right, southCenter, tanTheta)
        );

        // If the rectangle crosses the equator, compute D at the equator, too, because that's the
        // widest part of the rectangle when projected onto the globe.
        if (south < 0 && north > 0) {
            const equatorCartographic = viewRectangle3DCartographic1;
            equatorCartographic.longitude = west;
            equatorCartographic.latitude = 0.0;
            equatorCartographic.height = 0.0;
            let equatorPosition = ellipsoid.cartographicToCartesian(equatorCartographic, viewRectangle3DEquator);
            Cartesian3.subtract(equatorPosition, center, equatorPosition);
            d = Math.max(d, computeD(direction, up, equatorPosition, tanPhi), computeD(direction, right, equatorPosition, tanTheta));

            equatorCartographic.longitude = east;
            equatorPosition = ellipsoid.cartographicToCartesian(equatorCartographic, viewRectangle3DEquator);
            Cartesian3.subtract(equatorPosition, center, equatorPosition);
            d = Math.max(d, computeD(direction, up, equatorPosition, tanPhi), computeD(direction, right, equatorPosition, tanTheta));
        }
    }

    return Cartesian3.add(center, Cartesian3.multiplyByScalar(direction, -d, viewRectangle3DEquator), result);
}
