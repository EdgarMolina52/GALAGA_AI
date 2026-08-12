import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import { CONFIG } from '../utils/config.js';

export class Boss extends Enemy {
    constructor(game, x, y, level) {
        super(game, x, y, level);
        
        // Características del Jefe
        this.width = 80;
        this.height = 80;
        this.color = '#ffaa00'; // Color dorado/naranja
        this.hp = 10 * level; // Vida escala con el nivel
        this.maxHp = this.hp;
        this.scoreValue = 1000 * level;
        
        // Movimiento diferente (se queda en la parte superior y se mueve a los lados)
        this.speedY = 1;
        this.speedX = 2 + (level * 0.5);
        this.targetY = 100; // Posición Y donde se detiene
        
        this.phase = 'enter'; // enter, attack
    }

    update() {
        if (this.phase === 'enter') {
            this.y += this.speedY;
            if (this.y >= this.targetY) {
                this.phase = 'attack';
            }
        } else if (this.phase === 'attack') {
            // Moverse de lado a lado
            this.x += this.speedX;
            if (this.x <= 0 || this.x + this.width >= CONFIG.GAME_WIDTH) {
                this.speedX *= -1; // Rebotar en las paredes
            }
            
            // Patrón de disparo del jefe
            this.shootTimer--;
            if (this.shootTimer <= 0) {
                this.bossShoot();
                this.shootTimer = 60 - (this.levelMultiplier * 5); // Dispara bastante rápido
            }
        }
    }

    bossShoot() {
        // Disparo triple
        const centerX = this.x + this.width / 2 - CONFIG.PROJECTILE_WIDTH / 2;
        const bottomY = this.y + this.height;
        
        // Centro
        this.game.enemyProjectiles.push(new Projectile(centerX, bottomY, true));
        
        // Lados
        const leftProj = new Projectile(this.x, bottomY, true);
        leftProj.speedX = -2; // TODO: Projectile doesn't handle speedX in update natively unless modified. 
                              // For simplicity we will stick to straight lasers but spawn them at edges.
        this.game.enemyProjectiles.push(leftProj);
        
        const rightProj = new Projectile(this.x + this.width, bottomY, true);
        rightProj.speedX = 2;
        this.game.enemyProjectiles.push(rightProj);
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        
        // Dibujar un hexágono o forma compleja para el jefe
        ctx.beginPath();
        ctx.moveTo(this.x + this.width * 0.25, this.y);
        ctx.lineTo(this.x + this.width * 0.75, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height * 0.5);
        ctx.lineTo(this.x + this.width * 0.75, this.y + this.height);
        ctx.lineTo(this.x + this.width * 0.25, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height * 0.5);
        ctx.closePath();
        ctx.fill();
        
        // Barra de vida (encima del jefe)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 15, this.width, 5);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x, this.y - 15, this.width * (this.hp / this.maxHp), 5);
    }
}
