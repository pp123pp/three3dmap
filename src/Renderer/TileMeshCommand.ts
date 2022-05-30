import BoundingSphere from '@/Core/BoundingSphere';
import defined from '@/Core/defined';
import OrientedBoundingBox from '@/Core/OrientedBoundingBox';
import TerrainQuantization from '@/Core/TerrainQuantization';
import { TileMaterial, tileMaterialFS } from '@/Material/TileMaterial';
import FrameState from '@/Scene/FrameState';
import { BufferGeometry, DoubleSide, Material, Mesh, ShaderMaterial } from 'three';

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

    constructor(geometry?: BufferGeometry, material?: TileMaterial) {
        super(geometry, material);

        this.derivedCommands = {
            colorMaterial: this.material,
            bits12TileMaterial: undefined as any,
            tileMaterial: undefined as any,
        };
        // this.pass = CommandRenderPass.OPAQUE;
    }

    updateMaterial(uniformMapProperties: any, surfaceShaderSetOptions: any): void {
        const isBITS12 = defined(this.geometry.attributes['compressed0']) ? true : false;

        const material = this.material as TileMaterial;

        if (!material.isTileMaterial) {
            (this.material as Material).dispose();
            this.material = new TileMaterial({
                uniformMapProperties,
                surfaceShaderSetOptions,
                isBITS12,
                materialOptions: {
                    side: DoubleSide,
                },
            });

            return;
        }

        if ((isBITS12 && !defined(material.defines['QUANTIZATION_BITS12'])) || uniformMapProperties.dayTextures.length !== material.defines['TEXTURE_UNITS']) {
            // material.defines['QUANTIZATION_BITS12'] = '';

            // material.fragmentShader = tileMaterialFS;

            // material.fragmentShader = material.fragmentShader.replace(/TEXTURE_UNITS/g, material.dayTextures.length as any);

            // material.defines['TEXTURE_UNITS'] = material.dayTextures.length;
            // material.needsUpdate = true;

            material.dispose();

            this.material = new TileMaterial({
                uniformMapProperties,
                surfaceShaderSetOptions,
                isBITS12,
                materialOptions: {
                    side: DoubleSide,
                },
            });

            return;
        }

        if ((!isBITS12 && defined(material.defines['QUANTIZATION_BITS12'])) || material.dayTextures.length !== material.defines['TEXTURE_UNITS']) {
            // (this.material as any).defines['QUANTIZATION_BITS12'] = '';

            // delete material.defines['QUANTIZATION_BITS12'];
            // material.defines['TEXTURE_UNITS'] = material.dayTextures.length;

            // material.fragmentShader = tileMaterialFS;

            // material.fragmentShader = material.fragmentShader.replace(/TEXTURE_UNITS/g, material.dayTextures.length.toString());

            // material.needsUpdate = true;

            material.dispose();

            this.material = new TileMaterial({
                uniformMapProperties,
                surfaceShaderSetOptions,
                isBITS12,
                materialOptions: {
                    side: DoubleSide,
                },
            });
            return;
        }
    }

    // preUpdate(): void {

    // }
}
