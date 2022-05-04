import { AxesHelper } from 'three';
// import TileCoordinatesImageryProvider from './Scene/TileCoordinatesImageryProvider';
import './Widgets/CesiumWidget.css';
import Widgets from './Widgets/Widgets';

console.log('aaa');
const widget = new Widgets('app', {});

const { scene, camera } = widget;

camera.position.set(63916973.15163071, 3088494.933613418, 9994134.16404095);
camera.lookAt(0, 0, 0);
const axesHelper = new AxesHelper(5);
scene.addObject(axesHelper);

// scene.imageryLayers.addImageryProvider(new TileCoordinatesImageryProvider());
