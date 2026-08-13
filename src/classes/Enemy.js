import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';
import { CONFIG } from '../utils/config.js';
import { audioManager } from '../utils/audio.js';

export class Enemy extends Entity {
    constructor(game, x, y, type = 'fighter', levelMultiplier = 1, id) {
        super(x, y, 30, 30, '#ff0000');
        this.game = game;
        this.type = type;
        this.levelMultiplier = levelMultiplier;
        this.id = id || Math.random().toString(36).substr(2, 9);
        
        this.startX = x;
        this.hp = 1;
        this.scoreValue = 100 * levelMultiplier;
        this.shootTimer = Math.random() * 60 + 60;
        this.image = new Image();
        
        // Comportamientos por tipo
        if (this.type === 'scout') {
            this.color = '#00ff00'; // Verde
            this.image.src = 'assets/scout.svg';
            this.speedY = 3 + (levelMultiplier * 0.2);
            this.speedX = 0;
            this.hp = 1;
        } else if (this.type === 'fighter') {
            this.color = '#ff0000'; // Rojo
            this.image.src = 'assets/fighter.svg';
            this.speedY = 1.5 + (levelMultiplier * 0.2);
            this.angle = Math.random() * Math.PI * 2;
            this.angleSpeed = 0.05;
            this.amplitude = 60;
            this.hp = 1;
        } else if (this.type === 'tank') {
            this.color = '#800080'; // Púrpura
            this.image.src = 'assets/tank.svg';
            this.speedY = 0.5 + (levelMultiplier * 0.1);
            this.hp = 3 + levelMultiplier;
            this.scoreValue = 300 * levelMultiplier;
            this.shootTimer = 40; // Dispara más rápido
        }
        
        this.maxHp = this.hp;
    }

    update() {
        this.y += this.speedY;
        
        if (this.type === 'fighter') {
            this.angle += this.angleSpeed;
            this.x = this.startX + Math.sin(this.angle) * this.amplitude;
        } else if (this.type === 'scout') {
            // Kamikaze suave hacia el jugador más cercano
            const target = this.getClosestPlayer();
            if (target && target.y > this.y) {
                if (target.x > this.x) this.x += 1;
                else if (target.x < this.x) this.x -= 1;
            }
        }
        
        // Limitar a pantalla
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CONFIG.GAME_WIDTH) this.x = CONFIG.GAME_WIDTH - this.width;

        this.shootTimer--;
        if (this.shootTimer <= 0) {
            this.shoot();
            if (this.type === 'tank') {
                this.shootTimer = (Math.random() * 60 + 30) / Math.max(1, this.levelMultiplier * 0.8); 
            } else {
                this.shootTimer = (Math.random() * 120 + 80) / Math.max(1, this.levelMultiplier * 0.8);
            }
        }

        // Si el enemigo sale de la pantalla, simplemente desaparece sin causar Game Over
        if (this.y + this.height > CONFIG.GAME_HEIGHT) {
            this.markedForDeletion = true;
            // Quitamos el Game Over automático para evitar problemas de desincronización
        }
    }
    
    getClosestPlayer() {
        let closest = null;
        let minDist = Infinity;
        for (let id in this.game.players) {
            let p = this.game.players[id];
            if (!p.markedForDeletion) {
                let dist = Math.hypot(p.x - this.x, p.y - this.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = p;
                }
            }
        }
        return closest;
    }

    shoot() {
        if (this.type === 'scout') return; // Los scouts no disparan, se abalanzan
        
        audioManager.playEnemyShoot();
        const xPos = this.x + this.width / 2 - CONFIG.PROJECTILE_WIDTH / 2;
        let pSpeedX = 0;
        let pSpeedY = CONFIG.ENEMY_PROJECTILE_SPEED;
        
        if (this.type === 'tank') {
            // Disparo dirigido al jugador
            const target = this.getClosestPlayer();
            if (target) {
                const dx = (target.x + target.width/2) - (xPos);
                const dy = (target.y + target.height/2) - (this.y + this.height);
                const mag = Math.hypot(dx, dy);
                pSpeedX = (dx / mag) * CONFIG.ENEMY_PROJECTILE_SPEED;
                pSpeedY = (dy / mag) * CONFIG.ENEMY_PROJECTILE_SPEED;
            }
        }
        
        this.game.enemyProjectiles.push(new Projectile(xPos, this.y + this.height, true, pSpeedX, pSpeedY));
    }
    
    takeDamage(amount, isLocal = true) {
        if (!isLocal && this.hp - amount <= 0) {
            // Evitamos que una bala remota dé el golpe de gracia por culpa del lag.
            // Siempre debe confirmarlo el jugador dueño de la bala a través del servidor.
            this.hp = 1; 
            return;
        }

        this.hp -= amount;
        if (this.hp <= 0 && !this.markedForDeletion) {
            this.markedForDeletion = true;
            if (isLocal) {
                this.game.addScore(this.scoreValue);
                if (this.type === 'boss') {
                    if (this.game.socket) this.game.socket.emit('bossKilled', { x: this.x, y: this.y });
                } else {
                    if (this.game.socket) this.game.socket.emit('enemyKilled', { id: this.id, x: this.x, y: this.y });
                }
            }
            this.game.createExplosion(this.x + this.width/2, this.y + this.height/2, this.color, 15);
        }
    }

    draw(ctx) {
        if (this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // Fallback while loading
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Barra de vida para tanques
        if (this.type === 'tank' && this.hp < this.maxHp) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y - 6, this.width, 4);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x, this.y - 6, this.width * (this.hp / this.maxHp), 4);
        }
    }
}
