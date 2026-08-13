import { Boss } from './Boss.js';
import { Projectile } from './Projectile.js';
import { CONFIG } from '../utils/config.js';
import { audioManager } from '../utils/audio.js';

export class SplitBoss extends Boss {
    constructor(game, x, y, level) {
        super(game, x, y, level);
        this.image.src = 'assets/boss_split.svg';
        this.shootTimer = 60 - (level * 5); 
        this.hasSplit = false;
    }

    takeDamage(amount) {
        super.takeDamage(amount);
        
        // Se divide si llega a menos de la mitad de vida y no se ha dividido
        if (this.hp <= this.maxHp / 2 && !this.hasSplit) {
            this.split();
        }
    }

    split() {
        this.hasSplit = true;
        // Enviar evento de división si somos el jugador local. En multijugador es mejor que lo controle el master/servidor.
        // Pero como Galaga_AI no tiene servidor centralizado para daño de jefes, cada cliente instanciará las mitades.
        // Las mitades son subclases especiales o simplemente Enemy normal
        
        // Mitad Izquierda
        let leftBoss = new Boss(this.game, this.x, this.y, this.levelMultiplier);
        leftBoss.width = this.width / 2;
        leftBoss.height = this.height / 2;
        leftBoss.image.src = 'assets/boss_split.svg';
        leftBoss.hp = this.hp; // Comparten la vida actual
        leftBoss.speedX = -3;
        leftBoss.speedY = 2;
        leftBoss.phase = 'attack';
        leftBoss.bossShoot = function() {
            this.game.enemyProjectiles.push(new Projectile(this.x + this.width/2, this.y + this.height, true));
            this.shootTimer = 60;
        };
        
        // Mitad Derecha
        let rightBoss = new Boss(this.game, this.x + this.width/2, this.y, this.levelMultiplier);
        rightBoss.width = this.width / 2;
        rightBoss.height = this.height / 2;
        rightBoss.image.src = 'assets/boss_split.svg';
        rightBoss.hp = this.hp;
        rightBoss.speedX = 3;
        rightBoss.speedY = 2;
        rightBoss.phase = 'attack';
        rightBoss.bossShoot = function() {
            this.game.enemyProjectiles.push(new Projectile(this.x + this.width/2, this.y + this.height, true));
            this.shootTimer = 60;
        };
        
        this.game.enemies.push(leftBoss);
        this.game.enemies.push(rightBoss);
        
        this.markedForDeletion = true; // El boss original muere
    }

    bossShoot() {
        audioManager.playEnemyShoot();
        // Disparo en V
        const centerX = this.x + this.width / 2 - CONFIG.PROJECTILE_WIDTH / 2;
        const bottomY = this.y + this.height;
        
        const leftProj = new Projectile(centerX - 20, bottomY, true);
        leftProj.speedX = -1;
        this.game.enemyProjectiles.push(leftProj);
        
        const rightProj = new Projectile(centerX + 20, bottomY, true);
        rightProj.speedX = 1;
        this.game.enemyProjectiles.push(rightProj);
    }
}
