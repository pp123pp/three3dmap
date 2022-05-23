import BoundingSphere from '@/Core/BoundingSphere';
import defined from '@/Core/defined';
import OrientedBoundingBox from '@/Core/OrientedBoundingBox';
import TerrainQuantization from '@/Core/TerrainQuantization';
import { FrameState } from '@/Scene/FrameState';
import { BufferGeometry, Material, Mesh, ShaderMaterial } from 'three';

interface ITileMeshDerivedCommands {
    colorMaterial: Material | Material[];
    bits12TileMaterial: Material;
    tileMaterial: Material;
}

export default class TileMeshCommand extends Mesh {
    derivedCommands: ITileMeshDerivedCommands;

    isCommand = true;
    frustumCulled = false;

    owner: any;
    boundingVolume: BoundingSphere = undefined as any;
    orientedBoundingBox?: OrientedBoundingBox;
    constructor(geometry?: BufferGeometry, material?: ShaderMaterial) {
        super(geometry, material);

        this.derivedCommands = {
            colorMaterial: this.material,
            bits12TileMaterial: undefined as any,
            tileMaterial: undefined as any,
        };
        // this.pass = CommandRenderPass.OPAQUE;
    }

    updateMaterial(): void {
        const isBITS12 = defined(this.geometry.attributes['compressed0']) ? true : false;
        if (isBITS12 && !defined((this.material as any).defines['QUANTIZATION_BITS12'])) {
            (this.material as any).defines['QUANTIZATION_BITS12'] = '';
            (this.material as any).needsUpdate = true;

            return;
        }

        if (!isBITS12 && defined((this.material as any).defines['QUANTIZATION_BITS12'])) {
            // (this.material as any).defines['QUANTIZATION_BITS12'] = '';

            delete (this.material as any).defines['QUANTIZATION_BITS12'];
            (this.material as any).needsUpdate = true;

            return;
        }
    }

    // preUpdate(): void {

    // }
}
