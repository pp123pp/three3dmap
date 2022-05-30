import BoundingSphere from '@/Core/BoundingSphere';
import defined from '@/Core/defined';
import FrameState from '@/Scene/FrameState';
import { Mesh } from 'three';

export default class DrawMeshCommand extends Mesh {
    derivedCommands: any;

    isCommand = true;
    allowPicking = true;

    isDrawMeshCommand = true;

    frustumCulled = false;

    owner: any;
    boundingVolume: BoundingSphere = undefined as any;
    orientedBoundingBox: any;
    constructor(geometry?: any, material?: any) {
        super(geometry, material);

        this.derivedCommands = {
            originalMaterial: this.material,
            oit: undefined,
            //用于颜色拾取的材质
            picking: undefined,
            oitMaterial: undefined,
            depth: undefined,
            basicMaterial: undefined,
        };
        // this.pass = CommandRenderPass.OPAQUE;
    }

    update(frameState: FrameState): void {
        (this.material as any).picking = false;

        if (defined((this.material as any).update)) {
            (this.material as any).update(frameState);
        }

        if (frameState.passes.pick) {
            (this.material as any).picking = true;
        }
    }
}
