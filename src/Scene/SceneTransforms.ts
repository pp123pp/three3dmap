import BoundingRectangle from '@/Core/BoundingRectangle';
import Cartesian2 from '@/Core/Cartesian2';
import Cartesian3 from '@/Core/Cartesian3';
import Cartesian4 from '@/Core/Cartesian4';
import Cartographic from '@/Core/Cartographic';
import CesiumMatrix4 from '@/Core/CesiumMatrix4';
import defined from '@/Core/defined';
import { SceneMode } from '@/Core/SceneMode';
import FrameState from '@/Scene/FrameState';
import { OrthographicCamera } from 'three';
import MapCamera from './MapCamera';
import MapScene from './MapScene';

const SceneTransforms: any = {};

const actualPositionScratch = new Cartesian4(0, 0, 0, 1);
let positionCC = new Cartesian4();
const scratchViewport = new BoundingRectangle();

const scratchCartesian4 = new Cartesian4();
const scratchEyeOffset = new Cartesian3();

function worldToClip(position: Cartesian4, eyeOffset: Cartesian3, camera: MapCamera, result: Cartesian4) {
    const viewMatrix = camera.viewMatrix;

    const positionEC = CesiumMatrix4.multiplyByVector(viewMatrix, Cartesian4.fromElements(position.x, position.y, position.z, 1, scratchCartesian4), scratchCartesian4);

    const zEyeOffset = Cartesian3.multiplyComponents(eyeOffset, Cartesian3.normalize(positionEC as any, scratchEyeOffset), scratchEyeOffset);
    positionEC.x += eyeOffset.x + zEyeOffset.x;
    positionEC.y += eyeOffset.y + zEyeOffset.y;
    positionEC.z += zEyeOffset.z;

    return CesiumMatrix4.multiplyByVector(camera.frustum.projectionMatrix, positionEC, result);
}

/**
 * @private
 */
SceneTransforms.wgs84WithEyeOffsetToWindowCoordinates = function (scene: MapScene, position: Cartesian3, eyeOffset: Cartesian3, result?: Cartesian2) {
    // Transform for 3D, 2D, or Columbus view
    const frameState = scene.frameState;
    const actualPosition = SceneTransforms.computeActualWgs84Position(frameState, position, actualPositionScratch);

    if (!defined(actualPosition)) {
        return undefined;
    }

    // Assuming viewport takes up the entire canvas...
    const canvas = scene.canvas;
    const viewport = scratchViewport;
    viewport.x = 0;
    viewport.y = 0;
    viewport.width = canvas.clientWidth;
    viewport.height = canvas.clientHeight;

    const camera = scene.camera;
    const cameraCentered = false;

    if (frameState.mode !== SceneMode.SCENE2D || cameraCentered) {
        // View-projection matrix to transform from world coordinates to clip coordinates
        positionCC = worldToClip(actualPosition, eyeOffset, camera, positionCC);
        if (positionCC.z < 0 && !(camera.frustum instanceof OrthographicCamera)) {
            return undefined;
        }

        result = SceneTransforms.clipToGLWindowCoordinates(viewport, positionCC, result);
    }

    (result as Cartesian2).y = canvas.clientHeight - (result as Cartesian2).y;
    return result;
};

/**
 * Transforms a position in WGS84 coordinates to window coordinates.  This is commonly used to place an
 * HTML element at the same screen position as an object in the scene.
 *
 * @param {Scene} scene The scene.
 * @param {Cartesian3} position The position in WGS84 (world) coordinates.
 * @param {Cartesian2} [result] An optional object to return the input position transformed to window coordinates.
 * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.  This may be <code>undefined</code> if the input position is near the center of the ellipsoid.
 *
 * @example
 * // Output the window position of longitude/latitude (0, 0) every time the mouse moves.
 * var scene = widget.scene;
 * var ellipsoid = scene.globe.ellipsoid;
 * var position = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
 * handler.setInputAction(function(movement) {
 *     console.log(Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, position));
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 */
SceneTransforms.wgs84ToWindowCoordinates = function (scene: MapScene, position: Cartesian3, result?: Cartesian2): Cartesian2 {
    return SceneTransforms.wgs84WithEyeOffsetToWindowCoordinates(scene, position, Cartesian3.ZERO, result);
};

const projectedPosition = new Cartesian3();
const positionInCartographic = new Cartographic();

/**
 * @private
 */
SceneTransforms.computeActualWgs84Position = function (frameState: FrameState, position: Cartesian3, result: Cartesian3) {
    const mode = frameState.mode;

    if (mode === SceneMode.SCENE3D) {
        return Cartesian3.clone(position, result);
    }

    const projection = frameState.mapProjection;
    const cartographic = projection.ellipsoid.cartesianToCartographic(position, positionInCartographic);
    if (!defined(cartographic)) {
        return undefined;
    }

    projection.project(cartographic, projectedPosition);

    if (mode === SceneMode.COLUMBUS_VIEW) {
        return Cartesian3.fromElements(projectedPosition.z, projectedPosition.x, projectedPosition.y, result);
    }

    if (mode === SceneMode.SCENE2D) {
        return Cartesian3.fromElements(0.0, projectedPosition.x, projectedPosition.y, result);
    }

    // mode === SceneMode.MORPHING
    // const morphTime = frameState.morphTime;
    // return Cartesian3.fromElements(
    //     CesiumMath.lerp(projectedPosition.z, position.x, morphTime),
    //     CesiumMath.lerp(projectedPosition.x, position.y, morphTime),
    //     CesiumMath.lerp(projectedPosition.y, position.z, morphTime),
    //     result
    // );
};

const positionNDC = new Cartesian3();
const positionWC = new Cartesian3();
const viewportTransform = new CesiumMatrix4();

/**
 * @private
 */
SceneTransforms.clipToGLWindowCoordinates = function (viewport: BoundingRectangle, position: any, result: Cartesian2) {
    // Perspective divide to transform from clip coordinates to normalized device coordinates
    Cartesian3.divideByScalar(position, position.w, positionNDC);

    // Viewport transform to transform from clip coordinates to window coordinates
    CesiumMatrix4.computeViewportTransformation(viewport, 0.0, 1.0, viewportTransform);
    CesiumMatrix4.multiplyByPoint(viewportTransform, positionNDC, positionWC);

    return Cartesian2.fromCartesian3(positionWC as any, result);
};

export { SceneTransforms };
