import Cartesian3 from '@/Core/Cartesian3';
import { AdditiveBlending, BackSide, Color, CubeCamera, CubeTexture, DirectionalLight, IcosahedronGeometry, LinearMipmapLinearFilter, Mesh, PerspectiveCamera, RepeatWrapping, RGBFormat, Scene, ShaderMaterial, SphereBufferGeometry, Spherical, Sprite, SpriteMaterial, sRGBEncoding, Texture, TextureLoader, WebGLCubeRenderTarget } from 'three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare';
import base_vs from '../Shader/sky/base_vs.glsl';
import dome_fs from '../Shader/sky/dome_fs.glsl';
import sky_fs from '../Shader/sky/sky_fs.glsl';
import FrameState from './FrameState';
import MapCamera from './MapCamera';
import MapScene from './MapScene';
import Moon from './Moon';
import Sun from './Sun';

console.log(base_vs);

export default class Sky extends Mesh {
    readonly scene: MapScene;
    camera: PerspectiveCamera;
    sceneSky = new Scene();

    skyResolution = 512;
    size = 10000;
    setting = {
        t: 0,
        fog: 0,
        cloud_size: 0.45,
        cloud_covr: 0.3,
        cloud_dens: 40,

        inclination: 45,
        azimuth: 90,
        hour: 12,
    };
    textureLoader = new TextureLoader();

    noiseMap: Texture;

    moonMaterial = new SpriteMaterial({ map: this.textureLoader.load('./assets/textures/sky/lensflare2.png'), opacity: 0.3 });

    visible = false;
    castShadow = false;
    receiveShadow = false;
    needsUpdate = false;
    torad = 0.0174532925199432957;

    sun: Sun;
    moon: Moon;
    sunSph = new Spherical();
    moonSph = new Spherical();

    sunPosition = new Cartesian3();
    moonPosition = new Cartesian3();

    lensflare = new Lensflare();

    materialSky: ShaderMaterial;

    cubeCameraRender: WebGLCubeRenderTarget;

    cubeCamera: CubeCamera;

    envMap: CubeTexture;

    r = 0;
    g = 0;
    b = 0;

    material: ShaderMaterial;

    bgScene = new Scene();
    constructor(scene: MapScene) {
        super();

        this.sceneSky.rotateX(-Math.PI / 2);
        this.scene = scene;

        this.camera = new PerspectiveCamera();

        this.sun = new Sun(this.size);
        this.scene.addObject(this.sun);

        this.moon = new Moon(this.size);
        this.scene.addObject(this.moon);

        this.noiseMap = new TextureLoader().load('./assets/textures/sky/noise.png', (texture) => {
            texture.wrapS = texture.wrapT = RepeatWrapping;
            texture.flipY = false;
        });

        this.materialSky = new ShaderMaterial({
            uniforms: {
                lightdir: { value: this.sunPosition },
                noiseMap: { value: this.noiseMap },
                cloud_size: { value: this.setting.cloud_size },
                cloud_covr: { value: this.setting.cloud_covr },
                cloud_dens: { value: this.setting.cloud_dens },
                cloudColor: { value: new Color(0xffffff) },
                groundColor: { value: new Color(0x3b4c5a) },
                fogColor: { value: new Color(0xff0000) },
                fog: { value: this.setting.fog },
                t: { value: this.setting.t },
            },
            vertexShader: base_vs,
            fragmentShader: sky_fs,
            depthWrite: false,
            depthTest: false,
            side: BackSide,
        });

        const t = new IcosahedronGeometry(1, 1);

        const cmesh = new Mesh(t, this.materialSky);
        this.sceneSky.add(cmesh);

        this.cubeCameraRender = new WebGLCubeRenderTarget(this.skyResolution, {
            format: RGBFormat,
            generateMipmaps: true,
            minFilter: LinearMipmapLinearFilter,
            encoding: sRGBEncoding,
        });

        this.cubeCamera = new CubeCamera(0.5, 200, this.cubeCameraRender);

        this.sceneSky.add(this.cubeCamera);

        this.envMap = this.cubeCameraRender.texture;

        this.geometry = new SphereBufferGeometry(this.size, 30, 15);
        this.material = new ShaderMaterial({
            uniforms: {
                lightdir: { value: this.sunPosition },
                lunardir: { value: new Cartesian3(0, -0.2, 1) },
                tCube: { value: this.envMap },
                tDome: {
                    value: this.textureLoader.load('./assets/textures/sky/milkyway.png', function (t) {
                        t.encoding = sRGBEncoding;
                    }),
                },
            },
            vertexShader: base_vs,
            fragmentShader: dome_fs,
            side: BackSide,
        });

        this.material.needsUpdate = true;

        this.update();
    }

    updateRotation(mainCamera: MapCamera): void {
        // if (this.camera.aspect !== mainCamera.frustum.aspect) {
        //     this.camera.aspect = mainCamera.frustum.aspect;
        //     this.camera.updateProjectionMatrix();
        // }
        // this.camera.rotation.copy(mainCamera.frustum.rotation);
        // this.camera.rotateX(Math.PI / 2);
    }
    update(): void {
        const setting = this.setting;

        setting.inclination = setting.hour * 15 - 90;

        this.sun.update(setting.inclination, this.torad, setting.azimuth);
        this.moon.update(setting.inclination, this.torad, setting.azimuth);

        this.sunPosition = this.sun.position.clone().normalize();
        this.moonPosition = this.sun.position.clone().normalize();

        // sun color formule
        const n = this.k(new Cartesian3(0, 0.99, 0), this.sunPosition),
            a = this.z(n, new Cartesian3(1.8, 1.8, 1.8), 0.028, this.sunPosition);
        a.r = a.r > 1.0 ? 1.0 : a.r;
        a.g = a.g > 1.0 ? 1.0 : a.g;
        a.b = a.b > 1.0 ? 1.0 : a.b;

        this.sun.setColor(this);
        this.moon.setColor(this);

        this.materialSky.uniforms.t.value = setting.t;
        this.materialSky.uniforms.fog.value = setting.fog;
        this.materialSky.uniforms.cloud_size.value = setting.cloud_size;
        this.materialSky.uniforms.cloud_covr.value = setting.cloud_covr;
        this.materialSky.uniforms.cloud_dens.value = setting.cloud_dens;
        this.materialSky.uniforms.lightdir.value = this.sunPosition;
        this.material.uniforms.lightdir.value = this.sunPosition;

        this.needsUpdate = true;

        this.sun.position.applyAxisAngle(new Cartesian3(1, 0, 0), Math.PI / 2);
        this.moon.position.applyAxisAngle(new Cartesian3(1, 0, 0), Math.PI / 2);

        if (!this.visible) this.visible = true;
    }

    k(e: Cartesian3, t: Cartesian3): number {
        const n = t.dot(t),
            a = 2 * t.dot(e),
            o = e.dot(e) - 1,
            r = a * a - 4 * n * o,
            i = Math.sqrt(r),
            l = (-a - i) / 2,
            s = o / l;
        return s;
    }

    z(e: number, t: Cartesian3, n: number, a: Cartesian3): Sky {
        const o = new Cartesian3(0.188, 0.458, 0.682),
            r = a.y >= 0 ? 1 : 0;

        this.r = (t.x - t.x * Math.pow(o.x, n / e)) * r;
        this.g = (t.y - t.y * Math.pow(o.y, n / e)) * r;
        this.b = (t.z - t.z * Math.pow(o.z, n / e)) * r;

        return this;
    }

    setData(d: any): void {
        this.setting = d;
        this.update();
    }

    render(frameState: FrameState): void {
        // frameState.renderer.render(this.sceneSky, this.camera);

        if (this.needsUpdate) {
            this.cubeCamera.update(this.scene.renderer, this.sceneSky);
            this.needsUpdate = false;
        }
    }
}
