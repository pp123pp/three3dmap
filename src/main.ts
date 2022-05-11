import { AxesHelper } from 'three';
import Cartesian2 from './Core/Cartesian2';
import Cartesian3 from './Core/Cartesian3';
import CesiumMatrix4 from './Core/CesiumMatrix4';
import { SceneMode } from './Core/SceneMode';
// import TileCoordinatesImageryProvider from './Scene/TileCoordinatesImageryProvider';
import './Widgets/CesiumWidget.css';
import Widgets from './Widgets/Widgets';

console.log('aaa');
const widget = new Widgets('app', {
    sceneMode: SceneMode.COLUMBUS_VIEW,
});

const { scene, camera } = widget;

// camera.position.set(63916973.15163071, 63916973.933613418, 9994134.16404095);
// camera.position.set(10, 10, 10);
// camera.lookAt(63916973.15163071, 63916973.933613418, 0);
// camera.rotation.set(0, 0, 0);

const axesHelper = new AxesHelper(500000000);
scene.addObject(axesHelper);

// scene.imageryLayers.addImageryProvider(new TileCoordinatesImageryProvider());
// const ps = new Cartesian3(63916973.15163071, 3088494.933613418, 9994134.16404095);
// camera.setView({
//     destination: ps,
// });

console.log(CesiumMatrix4.IDENTITY);

const cameraCV = {
    // position: new Cartesian3(-9183857.99044507, 3913084.3898019027, 12673564.865952782),
    // direction: new Cartesian3(1.3877787807814457e-17, -0.0005288903159823, -0.9999998601375071),
    // up: new Cartesian3(1.3877787807814457e-17, 0.9999998601375071, -0.0005288903159823),

    position: new Cartesian3(307954.72494216013, 988789.7272943609, 58389654.904923),
    direction: new Cartesian3(-5.254929945916226e-34, -4.3715031594620883e-16, -1),
    up: new Cartesian3(2.2643562372348223e-16, 1, 8.812395257960106e-16),
};
Cartesian3.clone(cameraCV.position, camera.position);
Cartesian3.clone(cameraCV.direction, camera.direction);
Cartesian3.clone(cameraCV.up, camera.up);
Cartesian3.cross(camera.direction, camera.up, camera.right);
Cartesian3.normalize(camera.right, camera.right);

// document.getElementById('btn').onclick = () => {
//     console.log(camera.getPickRay(new Cartesian2(500, 500)));
// };
