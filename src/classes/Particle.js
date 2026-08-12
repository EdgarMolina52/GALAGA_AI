import { Entity } from './Entity.js';
import { CONFIG } from '../utils/config.js';

export class Particle extends Entity {
    constructor(x, y, color) {
        // Partícula pequeña aleatoria
        const size = Math.random() * 4 + 1;
        super(x, y, size, size, color);
        
        // Velocidad aleatoria en cualquier dirección
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * CONFIG.PARTICLE_SPEED;
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
        
        this.life = CONFIG.PARTICLE_LIFETIME;
        this.maxLife = this.life;
        this.alpha = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        
        this.alpha = Math.max(0, this.life / this.maxLife);
        
        if (this.life <= 0) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
