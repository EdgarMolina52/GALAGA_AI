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
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}
