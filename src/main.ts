import './Widgets/CesiumWidget.css';
import Widgets from './Widgets/Widgets';

console.log('aaa');
const widget = new Widgets('app', {});

const { scene, camera } = widget;

camera.position.set(10, 10, 10);
