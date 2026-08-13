import { Boss } from './Boss.js';
import { Enemy } from './Enemy.js';
import { audioManager } from '../utils/audio.js';

export class SpawnerBoss extends Boss {
    constructor(game, x, y, level) {
        super(game, x, y, level);
        this.image.src = 'assets/boss_spawner.svg';
        this.shootTimer = 100 - (level * 5); 
    }

    bossShoot() {
        audioManager.playShoot(); // Un sonido diferente para spawner
        // En lugar de disparar, crea mini-enemigos (Scouts)
        const centerX = this.x + this.width / 2 - 15; // 15 = half enemy width
        const bottomY = this.y + this.height;
        
        let minion = new Enemy(this.game, centerX, bottomY, 'scout', this.levelMultiplier);
        // Los minions saltan hacia los lados antes de bajar
        minion.speedX = Math.random() > 0.5 ? 2 : -2;
        setTimeout(() => {
            if (!minion.markedForDeletion) minion.speedX = 0;
        }, 500);
        
        this.game.enemies.push(minion);
    }
}
