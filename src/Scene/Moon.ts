import { Color, DirectionalLight, Object3D, Spherical, Sprite, SpriteMaterial, TextureLoader } from 'three';
import Sky from './Sky';

export default class Moon extends Object3D {
    textureLoader = new TextureLoader();

    material = new SpriteMaterial({ map: this.textureLoader.load('./assets/textures/sky/lensflare2.png'), opacity: 0.3 });

    light = new DirectionalLight(0xffffff, 0.8);

    spherical = new Spherical();

    sprite = new Sprite(this.material);

    constructor(size: number) {
        super();

        this.sprite.scale.set(700, 700, 1);

        this.addObject(this.sprite);

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
        const ma = 1 - sky.r;
        const mg = 1 - sky.g;
        const mb = 1 - sky.b;
        this.intensity = ma * 0.35;
        this.color.setRGB(ma, mg, mb);
        this.material.color.copy(this.color);
    }

    update(inclination: number, torad: number, azimuth: number): void {
        const spherical = this.spherical;
        spherical.phi = (inclination + 90) * torad;
        spherical.theta = (azimuth - 90) * torad;
        this.position.setFromSpherical(spherical);
    }
}
