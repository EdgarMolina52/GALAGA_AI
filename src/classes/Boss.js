import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import { CONFIG } from '../utils/config.js';

export class Boss extends Enemy {
    constructor(game, x, y, level) {
        super(game, x, y, 'boss', level);
        
        // Características del Jefe Base
        this.width = 180;
        this.height = 120;
        
        const playerCount = Math.max(1, Object.keys(this.game.players).length);
        this.hp = 8 * level * playerCount;
        this.maxHp = this.hp;
        this.scoreValue = 1000 * level;
        
        this.speedY = 1;
        this.speedX = 2 + (level * 0.5);
        this.targetY = 80;
        
        this.phase = 'enter'; 
        this.image = new Image();
    }

    takeDamage(amount) {
        if (this.phase === 'enter') return; // Inmune mientras entra
        super.takeDamage(amount);
    }

    update() {
        if (this.phase === 'enter') {
            this.y += this.speedY;
            if (this.y >= this.targetY) {
                this.phase = 'attack';
            }
        } else if (this.phase === 'attack') {
            this.x += this.speedX;
            if (this.x <= 0 || this.x + this.width >= CONFIG.GAME_WIDTH) {
                this.speedX *= -1; 
            }
            
            this.shootTimer--;
            if (this.shootTimer <= 0) {
                this.bossShoot();
            }
        }
    }

    bossShoot() {
        // Base behavior (override in subclasses)
    }

    draw(ctx) {
        if (this.image && this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
        
        // Barra de vida
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 15, this.width, 5);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x, this.y - 15, this.width * (this.hp / this.maxHp), 5);
    }
}
