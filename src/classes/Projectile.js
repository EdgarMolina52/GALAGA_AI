import { Entity } from './Entity.js';
import { CONFIG } from '../utils/config.js';

export class Projectile extends Entity {
    // Añadido targetX, targetY para disparos dirigidos (opcional)
    constructor(x, y, isEnemy = false, speedX = 0, speedY = null) {
        super(
            x, 
            y, 
            CONFIG.PROJECTILE_WIDTH, 
            CONFIG.PROJECTILE_HEIGHT, 
            isEnemy ? CONFIG.ENEMY_PROJECTILE_COLOR : CONFIG.PROJECTILE_COLOR
        );
        this.isEnemy = isEnemy;
        this.speedX = speedX;
        
        if (speedY !== null) {
            this.speedY = speedY;
        } else {
            this.speedY = isEnemy ? CONFIG.ENEMY_PROJECTILE_SPEED : CONFIG.PROJECTILE_SPEED;
        }
        
        this.prerender();
    }

    prerender() {
        if (!Projectile.cache) Projectile.cache = {};
        
        if (!Projectile.cache[this.color]) {
            const padding = 15;
            const canvas = document.createElement('canvas');
            canvas.width = this.width + padding * 2;
            canvas.height = this.height + padding * 2;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fillRect(padding, padding, this.width, this.height);
            
            Projectile.cache[this.color] = canvas;
        }
        
        this.canvas = Projectile.cache[this.color];
        this.padding = 15;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.y < -this.height || this.y > CONFIG.GAME_HEIGHT + this.height || 
            this.x < -this.width || this.x > CONFIG.GAME_WIDTH + this.width) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        if (this.canvas) {
            ctx.drawImage(this.canvas, this.x - this.padding, this.y - this.padding);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
