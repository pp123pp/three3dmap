import defined from '@/Core/defined';
import { FrameState } from '@/Scene/FrameState';
import { Mesh } from 'three';

export default class DrawMeshCommand extends Mesh {
    derivedCommands: any;

    isCommand = true;
    allowPicking = true;

    isDrawMeshCommand = true;

    frustumCulled = false;

    owner?: any = undefined;

    enabledClick = false;

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
        this.isCommand = true;
        this.allowPicking = true;

        this.isDrawMeshCommand = true;

        this.frustumCulled = false;
    }

    get levelId() {
        return this.owner.levelId;
    }

    compressVertices() {
        const geometry = this.geometry;
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
