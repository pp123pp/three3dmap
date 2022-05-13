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
    position: new Cartesian3(-9183857.990445074, 3914472.0508939545, 25972529.261725195),
    direction: new Cartesian3(3.72216724667275e-14, -0.0003113250666032521, -0.9999999515383503),
    up: new Cartesian3(-4.609724166087824e-15, 0.9999999515383503, -0.0003113250666404997),

    // position: new Cartesian3(307954.72494216013, 988789.7272943609, 58389654.904923),
    // direction: new Cartesian3(-5.254929945916226e-34, -4.3715031594620883e-16, -1),
    // up: new Cartesian3(2.2643562372348223e-16, 1, 8.812395257960106e-16),

    // position: new Cartesian3(687742.1364813696, 982783.6276304201, 76618441.23662725),
    // direction: new Cartesian3(-0.9999999515383509, -1.6653934375474782e-16, 0.00031132506472736354),
    // up: new Cartesian3(0.00031132506472741905, -4.185174884594464e-13, 0.9999999515383509),
};

document.getElementById('btn').onclick = () => {
    // console.log(camera.getPickRay(new Cartesian2(500, 500)));
    // camera.moveRight(10000000);

    camera.setView({
        destination: cameraCV.position,
        orientation: {
            direction: cameraCV.direction,
            up: cameraCV.up,
        },
    });

    console.log(camera);
};
