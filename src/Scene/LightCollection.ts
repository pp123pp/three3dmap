import { Object3DCollection } from '@/Core/Object3DCollection';
import { AmbientLight } from 'three';

export default class LightCollection extends Object3DCollection {
    readonly ambitLight = new AmbientLight(0x3b4c5a, 0.5);

    constructor() {
        super();

        this.addObject(this.ambitLight);
    }
}
