import Cartesian3 from '@/Core/Cartesian3';
import Cartographic from '@/Core/Cartographic';
import { CesiumMath } from '@/Core/CesiumMath';
import CesiumMatrix4 from '@/Core/CesiumMatrix4';
import defined from '@/Core/defined';
import Ellipsoid from '@/Core/Ellipsoid';
import { SceneMode } from '@/Core/SceneMode';
import Transforms from '@/Core/Transforms';
import { OrthographicCamera } from 'three';
import MapCamera from './MapCamera';
import MapScene from './MapScene';

const scratchToCVPosition = new Cartesian3();
const scratchToCVDirection = new Cartesian3();
const scratchToCVUp = new Cartesian3();
const scratchToCVPosition2D = new Cartesian3();
const scratchToCVDirection2D = new Cartesian3();
const scratchToCVUp2D = new Cartesian3();
const scratchToCVSurfacePosition = new Cartesian3();
const scratchToCVCartographic = new Cartographic();
const scratchToCVToENU = new CesiumMatrix4();
// const scratchToCVFrustumPerspective = new PerspectiveFrustum();
// const scratchToCVFrustumOrthographic = new OrthographicFrustum();
const scratchToCVCamera: any = {
    position: undefined,
    direction: undefined,
    up: undefined,
    position2D: undefined,
    direction2D: undefined,
    up2D: undefined,
    frustum: undefined,
};

export default class SceneTransitioner {
    _scene: MapScene;
    _currentTweens: any[] = [];
    _morphHandler?: any;
    _morphCancelled = false;
    _completeMorph?: any;
    _morphToOrthographic = false;
    _previousMode?: SceneMode;
    constructor(scene: MapScene) {
        this._scene = scene;
    }

    completeMorph(): void {
        if (defined(this._completeMorph)) {
            this._completeMorph();
        }
    }

    // morphTo2D(duration: number, ellipsoid: Ellipsoid) {
    //     if (defined(this._completeMorph)) {
    //         this._completeMorph();
    //     }

    //     const scene = this._scene;
    //     this._previousMode = scene.mode;
    //     this._morphToOrthographic = scene.camera.frustum instanceof OrthographicCamera;

    //     if (this._previousMode === SceneMode.SCENE2D || this._previousMode === SceneMode.MORPHING) {
    //         return;
    //     }
    //     this._scene.morphStart.raiseEvent(this, this._previousMode, SceneMode.SCENE2D, true);

    //     scene._mode = SceneMode.MORPHING;
    //     scene.camera._setTransform(CesiumMatrix4.IDENTITY);

    //     if (this._previousMode === SceneMode.COLUMBUS_VIEW) {
    //         morphFromColumbusViewTo2D(this, duration);
    //     } else {
    //         morphFrom3DTo2D(this, duration, ellipsoid);
    //     }

    //     if (duration === 0.0 && defined(this._completeMorph)) {
    //         this._completeMorph();
    //     }
    // }

    morphToColumbusView(duration: number, ellipsoid: Ellipsoid) {
        if (defined(this._completeMorph)) {
            this._completeMorph();
        }

        const scene = this._scene;
        this._previousMode = scene.mode;

        if (this._previousMode === SceneMode.COLUMBUS_VIEW || this._previousMode === SceneMode.MORPHING) {
            return;
        }
        this._scene.morphStart.raiseEvent(this, this._previousMode, SceneMode.COLUMBUS_VIEW, true);

        scene.camera._setTransform(CesiumMatrix4.IDENTITY);

        let position = scratchToCVPosition;
        const direction = scratchToCVDirection;
        const up = scratchToCVUp;

        if (duration > 0.0) {
            position.x = 0.0;
            position.y = -1.0;
            position.z = 1.0;
            position = Cartesian3.multiplyByScalar(Cartesian3.normalize(position, position), 5.0 * ellipsoid.maximumRadius, position);

            Cartesian3.negate(Cartesian3.normalize(position, direction), direction);
            Cartesian3.cross(Cartesian3.UNIT_X, direction, up);
        } else {
            const camera = scene.camera;
            if (this._previousMode === SceneMode.SCENE2D) {
                Cartesian3.clone(camera.position, position);
                position.z = camera.frustum.right - camera.frustum.left;
                Cartesian3.negate(Cartesian3.UNIT_Z, direction);
                Cartesian3.clone(Cartesian3.UNIT_Y, up);
            } else {
                Cartesian3.clone(camera.positionWC, position);
                Cartesian3.clone(camera.directionWC, direction);
                Cartesian3.clone(camera.upWC, up);

                const surfacePoint = ellipsoid.scaleToGeodeticSurface(position, scratchToCVSurfacePosition);
                const toENU = (Transforms as any).eastNorthUpToFixedFrame(surfacePoint, ellipsoid, scratchToCVToENU);
                CesiumMatrix4.inverseTransformation(toENU, toENU);

                scene.mapProjection.project(ellipsoid.cartesianToCartographic(position, scratchToCVCartographic) as Cartographic, position);
                CesiumMatrix4.multiplyByPointAsVector(toENU, direction, direction);
                CesiumMatrix4.multiplyByPointAsVector(toENU, up, up);
            }
        }

        let frustum;
        if (this._morphToOrthographic) {
            // frustum = scratchToCVFrustumOrthographic;
            // frustum.width = scene.camera.frustum.right - scene.camera.frustum.left;
            // frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        } else {
            frustum = scratchToCVFrustumPerspective;
            frustum.aspectRatio = scene.drawingBufferSize.width / scene.drawingBufferSize.height;
            frustum.fov = CesiumMath.toRadians(60.0);
        }

        const cameraCV = scratchToCVCamera;
        cameraCV.position = position;
        cameraCV.direction = direction;
        cameraCV.up = up;
        cameraCV.frustum = frustum;

        const complete = completeColumbusViewCallback(cameraCV);
        createMorphHandler(this, complete);

        if (this._previousMode === SceneMode.SCENE2D) {
            morphFrom2DToColumbusView(this, duration, cameraCV, complete);
        } else {
            cameraCV.position2D = CesiumMatrix4.multiplyByPoint(MapCamera.TRANSFORM_2D, position, scratchToCVPosition2D);
            cameraCV.direction2D = CesiumMatrix4.multiplyByPointAsVector(MapCamera.TRANSFORM_2D, direction, scratchToCVDirection2D);
            cameraCV.up2D = CesiumMatrix4.multiplyByPointAsVector(MapCamera.TRANSFORM_2D, up, scratchToCVUp2D);

            scene._mode = SceneMode.MORPHING;
            morphFrom3DToColumbusView(this, duration, cameraCV, complete);
        }

        if (duration === 0.0 && defined(this._completeMorph)) {
            this._completeMorph();
        }
    }
}
