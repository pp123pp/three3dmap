import GUI from 'lil-gui';

import { AxesHelper } from 'three';
import Cartesian2 from './Core/Cartesian2';
import Cartesian3 from './Core/Cartesian3';
import CesiumMatrix4 from './Core/CesiumMatrix4';
import { SceneMode } from './Core/SceneMode';
// import TileCoordinatesImageryProvider from './Scene/TileCoordinatesImageryProvider';
import './Widgets/CesiumWidget.css';
import Widgets from './Widgets/Widgets';

const gui = new GUI();

const widget = new Widgets('app', {
    sceneMode: SceneMode.COLUMBUS_VIEW,
});

const { scene, camera } = widget;

const axesHelper = new AxesHelper(500000000);
scene.addObject(axesHelper);

// scene.imageryLayers.addImageryProvider(new TileCoordinatesImageryProvider());
// const ps = new Cartesian3(63916973.15163071, 3088494.933613418, 9994134.16404095);
// camera.setView({
//     destination: ps,
// });

console.log(CesiumMatrix4.IDENTITY);

const cameraCV = {
    // position: new Cartesian3(-9183857.990445074, 3914472.0508939545, 25972529.261725195),
    // direction: new Cartesian3(3.72216724667275e-14, -0.0003113250666032521, -0.9999999515383503),
    // up: new Cartesian3(-4.609724166087824e-15, 0.9999999515383503, -0.0003113250666404997),

    position: new Cartesian3(0, 0, 55972529.261725195),
    direction: new Cartesian3(0, 0, -1),
    up: new Cartesian3(-4.609724166087824e-15, 0.9999999515383503, -0.0003113250666404997),
};

// document.getElementById('btn').onclick = () => {
//     // console.log(camera.getPickRay(new Cartesian2(500, 500)));
//     // camera.moveRight(10000000);
// };

const params = {
    setView: true,
    moveUp: true,
    moveRight: true,
};

gui.add(params, 'setView').onChange(() => {
    camera.setView({
        destination: cameraCV.position,
        orientation: {
            direction: cameraCV.direction,
            up: cameraCV.up,
        },
    });

    console.log(camera);
});

gui.add(params, 'moveUp').onChange(() => {
    // camera.moveUp(100000);

    // camera.position.set(0, 0, 55972529.261725195);
    // console.log(camera);
    // camera.setView({
    //     destination: new Cartesian3(0, 0, 4972529.261725195),
    //     orientation: {
    //         direction: new Cartesian3(0, 0, -1),
    //         up: new Cartesian3(0, 1, 0),
    //     },
    // });

    camera.setView({
        destination: new Cartesian3(-3156628.5243760087, 2382657.264821483, 6.45336975203827),
        orientation: {
            direction: new Cartesian3(0.528925477468187, 0.8401841477579277, -0.11970145003856583),
            up: new Cartesian3(0.06377166919610217, 0.10129961179242912, 0.992809932896849),
        },
    });
    console.log(camera);
});

gui.add(params, 'moveRight').onChange(() => {
    // camera.position.set(0, 0, 55972529.261725195);
    console.log(camera);
});

camera.changed.addEventListener(() => {
    console.log('aaa');
});
