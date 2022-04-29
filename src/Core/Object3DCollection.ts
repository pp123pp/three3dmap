import { Object3D } from 'three';

class Object3DCollection extends Object3D {
    destroyChildren = true;

    constructor(destroyChildren = true) {
        super();

        this.destroyChildren = destroyChildren;
    }
}

export { Object3DCollection };
