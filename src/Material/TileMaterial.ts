import Cartesian2 from '@/Core/Cartesian2';
import Cartesian3 from '@/Core/Cartesian3';
import Cartesian4 from '@/Core/Cartesian4';
import CesiumMatrix4 from '@/Core/CesiumMatrix4';
import defined from '@/Core/defined';
import { destroyObject } from '@/Core/destroyObject';
import { CanvasTexture, Matrix4, ShaderMaterial, ShaderMaterialParameters, Vector3, Vector4 } from 'three';

interface ITileMaterialOptions {
    materialOptions?: ShaderMaterialParameters;
    uniformMapProperties?: any;
    surfaceShaderSetOptions?: any;
    isBITS12?: boolean;
}

const vertexShader = `

#define INCLUDE_WEB_MERCATOR_Y

#include <common>
#include <logdepthbuf_pars_vertex>

#ifdef QUANTIZATION_BITS12
    attribute vec4 compressed0;
    attribute float compressed1;
#else
    attribute vec4 position3DAndHeight;
    attribute vec4 textureCoordAndEncodedNormals;
#endif

#ifdef QUANTIZATION_BITS12
    uniform vec2 u_minMaxHeight;
    uniform mat4 u_scaleAndBias;
#endif


uniform vec4 u_tileRectangle;
uniform vec3 rtc;
varying vec3 v_textureCoordinates;



float get2DGeographicYPositionFraction(vec2 textureCoordinates)
{
    return textureCoordinates.y;
}

float get2DYPositionFraction(vec2 textureCoordinates) { return get2DGeographicYPositionFraction(textureCoordinates); }

vec4 getPositionPlanarEarth(vec3 position, float height, vec2 textureCoordinates)
{
    float yPositionFraction = get2DGeographicYPositionFraction(textureCoordinates);
    vec4 rtcPosition2D = vec4( mix(u_tileRectangle.st, u_tileRectangle.pq, vec2(textureCoordinates.x, yPositionFraction)), height, 1.0);

    return projectionMatrix * modelViewMatrix * rtcPosition2D;
}

vec4 getPositionColumbusViewMode(vec3 position, float height, vec2 textureCoordinates)
{
    return getPositionPlanarEarth(position, height, textureCoordinates);
}

vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) {
    return getPositionColumbusViewMode(position, height, textureCoordinates);
}

vec2 czm_decompressTextureCoordinates(float encoded)
{
   float temp = encoded / 4096.0;
   float xZeroTo4095 = floor(temp);
   float stx = xZeroTo4095 / 4095.0;
   float sty = (encoded - xZeroTo4095 * 4096.0) / 4095.0;
   return vec2(stx, sty);
}


void main(){

#ifdef QUANTIZATION_BITS12
    vec2 xy = czm_decompressTextureCoordinates(compressed0.x);
    vec2 zh = czm_decompressTextureCoordinates(compressed0.y);
    vec3 position = vec3(xy, zh.x);
    float height = zh.y;
    vec2 textureCoordinates = czm_decompressTextureCoordinates(compressed0.z);

    height = height * (u_minMaxHeight.y - u_minMaxHeight.x) + u_minMaxHeight.x;
    position = (u_scaleAndBias * vec4(position, 1.0)).xyz;

    #if (defined(ENABLE_VERTEX_LIGHTING) || defined(GENERATE_POSITION_AND_NORMAL)) && defined(INCLUDE_WEB_MERCATOR_Y)
        float webMercatorT = czm_decompressTextureCoordinates(compressed0.w).x;
        float encodedNormal = compressed1;
    #elif defined(INCLUDE_WEB_MERCATOR_Y)
        float webMercatorT = czm_decompressTextureCoordinates(compressed0.w).x;
        float encodedNormal = 0.0;
    #elif defined(ENABLE_VERTEX_LIGHTING) || defined(GENERATE_POSITION_AND_NORMAL)
        float webMercatorT = textureCoordinates.y;
        float encodedNormal = compressed0.w;
    #else
        float webMercatorT = textureCoordinates.y;
        float encodedNormal = 0.0;
    #endif

#else

    vec3 position = position3DAndHeight.xyz;
    float height = position3DAndHeight.w;
    vec2 textureCoordinates = textureCoordAndEncodedNormals.xy;

    #if (defined(ENABLE_VERTEX_LIGHTING) || defined(GENERATE_POSITION_AND_NORMAL) || defined(APPLY_MATERIAL)) && defined(INCLUDE_WEB_MERCATOR_Y)
        float webMercatorT = textureCoordAndEncodedNormals.z;
        float encodedNormal = textureCoordAndEncodedNormals.w;
    #elif defined(ENABLE_VERTEX_LIGHTING) || defined(GENERATE_POSITION_AND_NORMAL) || defined(APPLY_MATERIAL)
        float webMercatorT = textureCoordinates.y;
        float encodedNormal = textureCoordAndEncodedNormals.z;
    #elif defined(INCLUDE_WEB_MERCATOR_Y)
        float webMercatorT = textureCoordAndEncodedNormals.z;
        float encodedNormal = 0.0;
    #else
        float webMercatorT = textureCoordinates.y;
        float encodedNormal = 0.0;
    #endif

#endif

    vec3 transformed = vec3(position);
    vec4 mvPosition = vec4( transformed, 1.0 );

    gl_Position = getPosition(transformed, height, textureCoordinates);

    // gl_Position = projectionMatrix * modelViewMatrix *  vec4( transformed, 1.0 );

    v_textureCoordinates = vec3(textureCoordinates, webMercatorT);

    #include <logdepthbuf_vertex>
}

`;

export const tileMaterialFS = `


#define INCLUDE_WEB_MERCATOR_Y


#include <common>
#include <packing>
#include <logdepthbuf_pars_fragment>

varying vec3 v_textureCoordinates;
uniform vec4 u_initialColor;
uniform vec4 diffuse;


#if TEXTURE_UNITS > 0
    uniform sampler2D u_dayTextures[TEXTURE_UNITS];
    uniform vec4 u_dayTextureTranslationAndScale[TEXTURE_UNITS];
    uniform bool u_dayTextureUseWebMercatorT[TEXTURE_UNITS];
    uniform vec4 u_dayTextureTexCoordsRectangle[TEXTURE_UNITS];
#endif


vec4 sampleAndBlend(
    vec4 previousColor,
    sampler2D textureToSample,
    vec2 tileTextureCoordinates,
    vec4 textureCoordinateRectangle,
    vec4 textureCoordinateTranslationAndScale,
    float textureAlpha,
    float textureBrightness,
    float textureContrast,
    float textureHue,
    float textureSaturation,
    float textureOneOverGamma,
    float split)
{


    vec2 alphaMultiplier = step(textureCoordinateRectangle.st, tileTextureCoordinates);
    textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;

    alphaMultiplier = step(vec2(0.0), textureCoordinateRectangle.pq - tileTextureCoordinates);
    textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;

    vec2 translation = textureCoordinateTranslationAndScale.xy;
    vec2 scale = textureCoordinateTranslationAndScale.zw;
    vec2 textureCoordinates = tileTextureCoordinates * scale + translation;
    vec4 value = texture2D(textureToSample, textureCoordinates);
    vec3 color = value.rgb;
    float alpha = value.a;



    float sourceAlpha = alpha * textureAlpha;
    float outAlpha = mix(previousColor.a, 1.0, sourceAlpha);
    vec3 outColor = mix(previousColor.rgb * previousColor.a, color, sourceAlpha) / outAlpha;
    return vec4(outColor, outAlpha);




}


vec4 computeDayColor(vec4 initialColor, vec3 textureCoordinates)
{
    vec4 color = initialColor;

    #pragma unroll_loop_start
    for ( int i = 0; i < TEXTURE_UNITS; i ++ ) {

        color = sampleAndBlend(
            color,
            u_dayTextures[ i ],
            u_dayTextureUseWebMercatorT[ i ] ? textureCoordinates.xz : textureCoordinates.xy,
            u_dayTextureTexCoordsRectangle[ i ],
            u_dayTextureTranslationAndScale[ i ],
            1.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0
        );

    }
    #pragma unroll_loop_end



    return color;
}

void main(void){
    #include <logdepthbuf_fragment>


    gl_FragColor = computeDayColor(u_initialColor, clamp(v_textureCoordinates, 0.0, 1.0));

    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

class TileMaterial extends ShaderMaterial {
    isTileMaterial = true;
    constructor(options: ITileMaterialOptions) {
        super(options.materialOptions);

        const { uniformMapProperties: uniformProperties, surfaceShaderSetOptions, isBITS12 } = options;

        this.lights = false;
        this.fog = false;

        this.uniforms = {
            u_dayTextures: { value: uniformProperties.dayTextures },
            u_dayTextureTranslationAndScale: { value: uniformProperties.dayTextureTranslationAndScale },
            u_dayTextureTexCoordsRectangle: { value: uniformProperties.dayTextureTexCoordsRectangle },
            u_dayTextureUseWebMercatorT: { value: uniformProperties.dayTextureUseWebMercatorT },
            u_initialColor: { value: uniformProperties.initialColor },
            diffuse: { value: new Vector4(Math.random(), Math.random(), Math.random(), 1.0) },
            u_tileRectangle: { value: uniformProperties.tileRectangle },
            rtc: { value: new Vector3() },
            u_minMaxHeight: { value: uniformProperties.minMaxHeight },
            u_scaleAndBias: { value: uniformProperties.scaleAndBias },
            u_center3D: { value: new Vector3() },
            u_modifiedModelView: { value: new Matrix4() },
            u_modifiedModelViewProjection: { value: new Matrix4() },
        };
        this.vertexShader = vertexShader;
        this.fragmentShader = this.createFragmentShader(surfaceShaderSetOptions.numberOfDayTextures);

        this.defines['APPLY_GAMMA'] = '';
        this.defines['INCLUDE_WEB_MERCATOR_Y'] = '';
        this.defines.TEXTURE_UNITS = surfaceShaderSetOptions.numberOfDayTextures;

        if (isBITS12) {
            this.defines['QUANTIZATION_BITS12'] = '';
        }
    }

    get dayTextures(): CanvasTexture[] {
        return this.uniforms.u_dayTextures.value;
    }

    set dayTextures(value: CanvasTexture[]) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_dayTextures.value = value;
    }

    get dayTextureTranslationAndScale(): Cartesian4[] {
        return this.uniforms.u_dayTextureTranslationAndScale.value;
    }

    set dayTextureTranslationAndScale(value: Cartesian4[]) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_dayTextureTranslationAndScale.value = value;
    }

    get dayTextureUseWebMercatorT(): boolean[] {
        return this.uniforms.u_dayTextureUseWebMercatorT.value;
    }

    set dayTextureUseWebMercatorT(value: boolean[]) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_dayTextureUseWebMercatorT.value = value;
    }

    get dayTextureTexCoordsRectangle(): Cartesian4[] {
        return this.uniforms.u_dayTextureTexCoordsRectangle.value;
    }

    set dayTextureTexCoordsRectangle(value: Cartesian4[]) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_dayTextureTexCoordsRectangle.value = value;
    }

    get diffuse(): Cartesian4 {
        return this.uniforms.diffuse.value;
    }

    set diffuse(value: Cartesian4) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.diffuse.value.copy(value);
    }

    get initialColor(): Cartesian4 {
        return this.uniforms.u_initialColor.value;
    }

    set initialColor(value: Cartesian4) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_initialColor.value.copy(value);
    }

    get tileRectangle(): Cartesian4 {
        return this.uniforms.u_tileRectangle.value;
    }

    set tileRectangle(value: Cartesian4) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_tileRectangle.value.copy(value);
    }

    get minMaxHeight(): Cartesian2 {
        return this.uniforms.u_minMaxHeight.value;
    }

    set minMaxHeight(value: Cartesian2) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_minMaxHeight.value.copy(value);
    }

    get scaleAndBias(): CesiumMatrix4 {
        return this.uniforms.u_scaleAndBias.value;
    }

    set scaleAndBias(value: CesiumMatrix4) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_scaleAndBias.value.copy(value);
    }

    get center3D(): Cartesian3 {
        return this.uniforms.u_center3D.value;
    }

    set center3D(value: Cartesian3) {
        if (!defined(value)) {
            return;
        }
        this.uniforms.u_center3D.value.copy(value);
    }

    createFragmentShader(numberOfDayTextures: number): string {
        const fragmentShader = `

        precision mediump float;
        #define highp mediump

        
        #include <packing>
        #include <logdepthbuf_pars_fragment>

        varying vec3 v_textureCoordinates;
        varying vec2 vHighPrecisionZW;
        uniform vec4 u_initialColor;
        uniform vec4 diffuse;
        
        
        #if TEXTURE_UNITS > 0
            uniform sampler2D u_dayTextures[TEXTURE_UNITS];
            uniform vec4 u_dayTextureTranslationAndScale[TEXTURE_UNITS];
            uniform bool u_dayTextureUseWebMercatorT[TEXTURE_UNITS];
            uniform vec4 u_dayTextureTexCoordsRectangle[TEXTURE_UNITS];
        #endif
        
        
        vec4 sampleAndBlend(
            vec4 previousColor,
            sampler2D textureToSample,
            vec2 tileTextureCoordinates,
            vec4 textureCoordinateRectangle,
            vec4 textureCoordinateTranslationAndScale,
            float textureAlpha,
            float textureBrightness,
            float textureContrast,
            float textureHue,
            float textureSaturation,
            float textureOneOverGamma,
            float split)
        {
            
            
            vec2 alphaMultiplier = step(textureCoordinateRectangle.st, tileTextureCoordinates);
            textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;
        
            alphaMultiplier = step(vec2(0.0), textureCoordinateRectangle.pq - tileTextureCoordinates);
            textureAlpha = textureAlpha * alphaMultiplier.x * alphaMultiplier.y;
        
            vec2 translation = textureCoordinateTranslationAndScale.xy;
            vec2 scale = textureCoordinateTranslationAndScale.zw;
            vec2 textureCoordinates = tileTextureCoordinates * scale + translation;
            vec4 value = texture2D(textureToSample, textureCoordinates);
            vec3 color = value.rgb;
            float alpha = value.a;
        
        #ifdef APPLY_SPLIT
            float splitPosition = czm_imagerySplitPosition;
            
            if (split < 0.0 && gl_FragCoord.x > splitPosition) {
               alpha = 0.0;
            }
            
            else if (split > 0.0 && gl_FragCoord.x < splitPosition) {
               alpha = 0.0;
            }
        #endif
        
        #ifdef APPLY_BRIGHTNESS
            color = mix(vec3(0.0), color, textureBrightness);
        #endif
        
        #ifdef APPLY_CONTRAST
            color = mix(vec3(0.5), color, textureContrast);
        #endif
        
        #ifdef APPLY_HUE
            color = czm_hue(color, textureHue);
        #endif
        
        #ifdef APPLY_SATURATION
            color = czm_saturation(color, textureSaturation);
        #endif
        
        #ifdef APPLY_GAMMA
            color = pow(color, vec3(textureOneOverGamma));
        #endif
        
            float sourceAlpha = alpha * textureAlpha;
            float outAlpha = mix(previousColor.a, 1.0, sourceAlpha);
            vec3 outColor = mix(previousColor.rgb * previousColor.a, color, sourceAlpha) / outAlpha;
            return vec4(outColor, outAlpha);
        }
        
        
        vec4 computeDayColor(vec4 initialColor, vec3 textureCoordinates)
        {
            vec4 color = initialColor;
        
            #pragma unroll_loop_start
            for ( int i = 0; i < ${numberOfDayTextures}; i ++ ) {
        
                color = sampleAndBlend(
                    color,
                    u_dayTextures[ i ],
                    u_dayTextureUseWebMercatorT[ i ] ? textureCoordinates.xz : textureCoordinates.xy,
                    u_dayTextureTexCoordsRectangle[ i ],
                    u_dayTextureTranslationAndScale[ i ],
                    1.0,
                    0.0,
                    0.0,
                    0.0,
                    0.0,
                    2.2,
                    0.0
                );
        
            }
            #pragma unroll_loop_end
        
            return color;
        }

        // vec4 LinearTosRGB( in vec4 value ) {
        //     return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
        // }
        
        void main(void){
            
            #include <logdepthbuf_fragment>

            gl_FragColor = computeDayColor(u_initialColor, clamp(v_textureCoordinates, 0.0, 1.0));

            #include <tonemapping_fragment>
            
            gl_FragColor = LinearTosRGB( gl_FragColor );

        }
        `;

        return fragmentShader;
    }

    isDestroyed(): boolean {
        return false;
    }

    destroy(): void {
        for (const texture of this.dayTextures) {
            texture.dispose();
            texture.image = null;
        }

        this.dayTextures = [];

        return destroyObject(this);
    }
}

export { TileMaterial };
