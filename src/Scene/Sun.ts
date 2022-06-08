import { AdditiveBlending, Color, Object3D, Sprite, SpriteMaterial, TextureLoader } from 'three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare';

export default class Sun extends Object3D {
    color = new Color(0xffffff);

    textureLoader = new TextureLoader();

    lensflare = new Lensflare();

    sunMaterial = new SpriteMaterial({ map: this.textureLoader.load('./assets/textures/sky/lensflare1.png'), blending: AdditiveBlending, opacity: 0.5 });

    sprite = new Sprite(this.sunMaterial);
    constructor() {
        super();

        const textureFlare3 = this.textureLoader.load('assets/textures/sky/lensflare3.png');

        this.lensflare.addElement(new LensflareElement(this.textureLoader.load('assets/textures/sky/lensflare0.png'), this.size * 0.1, 0, this.sun.color));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6, this.color));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7, this.color));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9, this.color));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 70, 1, this.color));

        this.addObject(this.sprite);
    }
}
