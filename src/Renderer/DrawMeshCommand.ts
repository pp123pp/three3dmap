import BoundingSphere from '@/Core/BoundingSphere';
import { BufferGeometry, Material, Mesh } from 'three';

export default class DrawMeshCommand extends Mesh {
    derivedCommands: any;

    frustumCulled = false;

    owner: any;
    boundingVolume: BoundingSphere = undefined as any;
    orientedBoundingBox: any;
    constructor(geometry?: BufferGeometry, material?: Material) {
        super(geometry, material);

        this.up.set(0, 0, 1);

        this.derivedCommands = {
            originalMaterial: this.material,
        };
    }
}
