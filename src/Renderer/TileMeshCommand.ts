import BoundingSphere from '@/Core/BoundingSphere';
import defined from '@/Core/defined';
import OrientedBoundingBox from '@/Core/OrientedBoundingBox';
import { TileMaterial } from '@/Material/TileMaterial';
import { BufferGeometry, DoubleSide, Material, Mesh } from 'three';

interface ITileMeshDerivedCommands {
    colorMaterial: Material | Material[];
    bits12TileMaterial: Material;
    tileMaterial: {
        [key: string]: TileMaterial;
    };
}

export default class TileMeshCommand extends Mesh {
    derivedCommands: ITileMeshDerivedCommands;

    isCommand = true;
    frustumCulled = false;

    owner: any;
    boundingVolume: BoundingSphere = undefined as any;
    orientedBoundingBox?: OrientedBoundingBox;

    constructor(geometry?: BufferGeometry, material?: TileMaterial) {
        super(geometry, material);

        this.derivedCommands = {
            colorMaterial: this.material,
            bits12TileMaterial: undefined as any,
            tileMaterial: {},
        };

        (this.material as any).defines = {};
        // this.pass = CommandRenderPass.OPAQUE;
    }

    updateMaterial(uniformMapProperties: any, surfaceShaderSetOptions: any): void {
        const isBITS12 = defined(this.geometry.attributes['compressed0']) ? true : false;

        const material = this.material as TileMaterial;

        const materialKey = isBITS12.toString() + defined(material.defines['QUANTIZATION_BITS12']).toString() + uniformMapProperties.dayTextures.length + surfaceShaderSetOptions.numberOfDayTextures;

        if (!defined(this.derivedCommands.tileMaterial[materialKey])) {
            const material = new TileMaterial({
                uniformMapProperties,
                surfaceShaderSetOptions,
                isBITS12,
                materialOptions: {
                    side: DoubleSide,
                },
            });

            this.derivedCommands.tileMaterial[materialKey] = material;
            this.material = material;
            return;
        } else {
            this.material = this.derivedCommands.tileMaterial[materialKey];

            return;
        }

        // if (!material.isTileMaterial) {
        //     (this.material as Material).dispose();
        //     this.material = new TileMaterial({
        //         uniformMapProperties,
        //         surfaceShaderSetOptions,
        //         isBITS12,
        //         materialOptions: {
        //             side: DoubleSide,
        //         },
        //     });

        //     return;
        // }

        // if ((isBITS12 && !defined(material.defines['QUANTIZATION_BITS12'])) || uniformMapProperties.dayTextures.length !== material.defines['TEXTURE_UNITS']) {
        //     material.dispose();

        //     this.material = new TileMaterial({
        //         uniformMapProperties,
        //         surfaceShaderSetOptions,
        //         isBITS12,
        //         materialOptions: {
        //             side: DoubleSide,
        //         },
        //     });

        //     return;
        // }

        // if ((!isBITS12 && defined(material.defines['QUANTIZATION_BITS12'])) || material.dayTextures.length !== material.defines['TEXTURE_UNITS']) {
        //     material.dispose();

        //     this.material = new TileMaterial({
        //         uniformMapProperties,
        //         surfaceShaderSetOptions,
        //         isBITS12,
        //         materialOptions: {
        //             side: DoubleSide,
        //         },
        //     });
        //     return;
        // }
    }

    // preUpdate(): void {

    // }
}
