import { AxesHelper } from 'three';
import Cartesian3 from './Core/Cartesian3';
// import TileCoordinatesImageryProvider from './Scene/TileCoordinatesImageryProvider';
import './Widgets/CesiumWidget.css';
import Widgets from './Widgets/Widgets';

console.log('aaa');
const widget = new Widgets('app', {});

const { scene, camera } = widget;

// camera.position.set(63916973.15163071, 63916973.933613418, 9994134.16404095);
// camera.position.set(10, 10, 10);
// camera.lookAt(63916973.15163071, 63916973.933613418, 0);
// camera.rotation.set(0, 0, 0);

const axesHelper = new AxesHelper(500000000);
scene.addObject(axesHelper);

// scene.imageryLayers.addImageryProvider(new TileCoordinatesImageryProvider());
const ps = new Cartesian3(63916973.15163071, 3088494.933613418, 9994134.16404095);
camera.setView({
    destination: ps,
});
