import { AdditiveBlending, Color, DirectionalLight, Object3D, Spherical, Sprite, SpriteMaterial, TextureLoader } from 'three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare';
import Sky from './Sky';

export default class Sun extends Object3D {
    textureLoader = new TextureLoader();

    lensflare = new Lensflare();

    material = new SpriteMaterial({ map: this.textureLoader.load('./assets/textures/sky/lensflare1.png'), blending: AdditiveBlending, opacity: 0.5 });

    sprite = new Sprite(this.material);

    light = new DirectionalLight(0xffffff, 4);

    spherical = new Spherical();

    constructor(size: number) {
        super();

        this.sprite.scale.set(40, 40, 1);
        this.addObject(this.sprite);

        const textureFlare3 = this.textureLoader.load('assets/textures/sky/lensflare3.png');

        this.lensflare.addElement(new LensflareElement(this.textureLoader.load('assets/textures/sky/lensflare0.png'), size * 0.1, 0, this.color));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6, this.color));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7, this.color));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9, this.color));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 70, 1, this.color));
        this.add(this.lensflare);

        this.spherical.radius = size - size * 0.1;
    }

    get color(): Color {
        return this.light.color;
    }

    set color(value: Color) {
        this.light.color = value;
    }

    get intensity(): number {
        return this.light.intensity;
    }

    set intensity(value: number) {
        this.light.intensity = value;
    }

    setColor(sky: Sky): void {
        this.color.setRGB(sky.r, sky.g, sky.b);
        this.material.color.copy(this.color);

        this.intensity = sky.r;
    }

    update(inclination: number, torad: number, azimuth: number): void {
        const spherical = this.spherical;
        spherical.phi = (inclination - 90) * torad;
        spherical.theta = (azimuth - 90) * torad;

        this.position.setFromSpherical(spherical);
    }
}
