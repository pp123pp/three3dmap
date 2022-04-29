import Cartesian3 from '@/Core/Cartesian3';
import Cartographic from '@/Core/Cartographic';
import { CesiumMath } from '@/Core/CesiumMath';
import { defined } from '@/Core/defined';
import Emit from '@/Core/Emit';
import { getTimestamp } from '@/Core/getTimestamp';
import { SceneMode } from '@/Core/SceneMode';
import { Vector3 } from 'three';
import MapScene from './MapScene';
import PerspectiveFrustumCamera from './PerspectiveFrustumCamera';

export interface IMapCamera {
    fov?: 60.0;
    aspect: number;
    near?: 0.1;
    far?: 10000000000;
}

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

    public position = new Cartesian3();
    private _position = new Cartesian3();
    private _positionWC = new Cartesian3();
    private _positionCartographic = new Cartographic();
    _oldPositionWC?: Cartesian3;

    constructor(scene: MapScene, options: IMapCamera) {
        this.frustum = new PerspectiveFrustumCamera(options);

        this.scene = scene;
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
