import { PerspectiveCamera } from 'three';
import MapScene from './MapScene';

interface IMapPersCamera {
    scene: MapScene;
    fov?: 60.0;
    aspect: number;
    near?: 0.1;
    far?: 10000000000;
}

export default class MapPersCamera extends PerspectiveCamera {
    readonly scene: MapScene;
    constructor(scene: MapScene, options: IMapPersCamera) {
        super(options.fov, options.aspect, options.near, options.far);

        this.scene = scene;
    }
}
