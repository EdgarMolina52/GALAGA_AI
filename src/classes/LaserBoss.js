import { Boss } from './Boss.js';
import { Projectile } from './Projectile.js';
import { CONFIG } from '../utils/config.js';
import { audioManager } from '../utils/audio.js';

export class LaserBoss extends Boss {
    constructor(game, x, y, level) {
        super(game, x, y, level);
        this.image.src = 'assets/boss_laser.svg';
        this.shootTimer = 40; 
        
        // El láser supersónico será simulado con muchos proyectiles rápidos
        this.laserDuration = 0;
    }

    bossShoot() {
        // En lugar de disparos normales, dispara un chorro de proyectiles muy rápidos
        if (this.laserDuration <= 0) {
            audioManager.playLaser();
            this.laserDuration = 20; // 20 frames de láser
            this.shootTimer = 100 - (this.levelMultiplier * 5); // Tiempo de recarga
        }
    }
    
    update() {
        super.update();
        
        if (this.laserDuration > 0) {
            this.laserDuration--;
            
            // Disparar proyectil súper rápido desde el centro
            const centerX = this.x + this.width / 2 - CONFIG.PROJECTILE_WIDTH / 2;
            const bottomY = this.y + this.height - 20;
            
            let p = new Projectile(centerX, bottomY, true);
            p.speedY = 15; // Rayo muy rápido
            p.color = '#00AAFF'; // Color del láser azul
            this.game.enemyProjectiles.push(p);
        }
    }
}
