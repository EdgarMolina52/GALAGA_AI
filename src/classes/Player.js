import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';
import { CONFIG } from '../utils/config.js';
import { audioManager } from '../utils/audio.js';

export class Player extends Entity {
    constructor(game, x = CONFIG.GAME_WIDTH / 2 - CONFIG.PLAYER_WIDTH / 2, y = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_HEIGHT - 20, isLocal = true, colors = { primary: '#ffffff', secondary: '#ff0000' }) {
        super(
            x,
            y,
            CONFIG.PLAYER_WIDTH,
            CONFIG.PLAYER_HEIGHT,
            colors.primary
        );
        this.game = game;
        this.isLocal = isLocal;
        this.lives = 3;
        this.colors = colors;
        
        this.speed = CONFIG.PLAYER_SPEED;
        
        this.fireTimer = 0;
        this.shootCooldown = 15;
        
        this.powerUpInventory = {
            shield: 0,
            triple_shot: 0,
            revive: 0
        };
        
        this.invulnerableTimer = 120; // 2 seconds of invulnerability on spawn
        
        this.prerender();
    }
    
    prerender() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        const ctx = this.canvas.getContext('2d');
        
        const grid = [
            "......BBB......",
            "......BWB......",
            "......BWB......",
            ".....BWWWB.....",
            ".....BWWWB.....",
            "...BBWWWWWBB...",
            "..BSBWWWWWBSB..",
            "BSBSBWWSWWBSBSB",
            "BSBPBWSSSWBPSB",
            "BWBPBWSWSWBPBWB",
            "BWWWWWWWWWWWWWB",
            "BWWWWWWWWWWWWWB",
            ".BWWWBWWWBWWWB.",
            "..BBB..B..BBB.."
        ];
        
        const colMap = {
            'W': this.colors.primary,
            'S': this.colors.secondary,
            'B': '#000000',
            'P': '#0000ff'
        };
        
        const pxW = this.width / 15;
        const pxH = this.height / 14;
        
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                let char = grid[r][c];
                if (colMap[char]) {
                    ctx.fillStyle = colMap[char];
                    ctx.fillRect(c * pxW, r * pxH, pxW, pxH);
                }
            }
        }
    }

    update(input) {
        if (this.lives <= 0) return; // Un jugador muerto no puede moverse ni disparar
        if (this.invulnerableTimer > 0) this.invulnerableTimer--;
        
        // Solo el jugador local actualiza su propia posición usando el input
        if (!this.isLocal) return;

        if (input.left) {
            this.speedX = -CONFIG.PLAYER_SPEED;
        } else if (input.right) {
            this.speedX = CONFIG.PLAYER_SPEED;
        } else {
            this.speedX = 0;
        }

        if (input.up) {
            this.speedY = -CONFIG.PLAYER_SPEED;
        } else if (input.down) {
            this.speedY = CONFIG.PLAYER_SPEED;
        } else {
            this.speedY = 0;
        }

        if (input.isTouching && input.touchX !== null && input.touchY !== null) {
            // El jugador sigue al dedo instantáneamente para mejor control táctil
            // Añadimos un offset de 80 píxeles arriba para que el dedo no tape la nave
            this.x = input.touchX - this.width / 2;
            this.y = input.touchY - this.height / 2 - 80;
            
            // Para el modo multijugador, necesitamos simular que hay speed para enviar los datos de forma fluida
            this.speedX = 0;
            this.speedY = 0;
        }

        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CONFIG.GAME_WIDTH) this.x = CONFIG.GAME_WIDTH - this.width;
        
        const minY = CONFIG.GAME_HEIGHT * 0.3; // Permite volar mucho más alto (hasta el 30% superior)
        if (this.y < minY) this.y = minY;
        if (this.y + this.height > CONFIG.GAME_HEIGHT) this.y = CONFIG.GAME_HEIGHT - this.height;

        if (this.fireTimer > 0) this.fireTimer--;
        
        if (input.action && this.fireTimer === 0) {
            this.shoot();
            this.fireTimer = CONFIG.FIRE_COOLDOWN;
        }
    }

    shoot() {
        audioManager.playShoot();
        const xPos = this.x + this.width / 2 - CONFIG.PROJECTILE_WIDTH / 2;
        
        if (this.tripleShotActive) {
            let p1 = new Projectile(xPos, this.y); p1.isLocal = true;
            this.game.playerProjectiles.push(p1);
            
            const leftProj = new Projectile(this.x, this.y);
            leftProj.speedX = -1; leftProj.isLocal = true;
            this.game.playerProjectiles.push(leftProj);
            
            const rightProj = new Projectile(this.x + this.width, this.y);
            rightProj.speedX = 1; rightProj.isLocal = true;
            this.game.playerProjectiles.push(rightProj);
            
            if (this.game.socket) {
                this.game.socket.emit('playerShoot', { x: xPos, y: this.y, triple: true });
            }
        } else {
            let p = new Projectile(xPos, this.y); p.isLocal = true;
            this.game.playerProjectiles.push(p);
            
            // Emitir al servidor
            if (this.game.socket) {
                this.game.socket.emit('playerShoot', { x: xPos, y: this.y });
            }
        }
    }
    
    remoteShoot(x, y, triple = false) {
        if (triple) {
            let p1 = new Projectile(x, y); p1.isLocal = false;
            this.game.playerProjectiles.push(p1);
            
            const leftProj = new Projectile(x - this.width/2, y);
            leftProj.speedX = -1; leftProj.isLocal = false;
            this.game.playerProjectiles.push(leftProj);
            
            const rightProj = new Projectile(x + this.width/2, y);
            rightProj.speedX = 1; rightProj.isLocal = false;
            this.game.playerProjectiles.push(rightProj);
        } else {
            let p = new Projectile(x, y); p.isLocal = false;
            this.game.playerProjectiles.push(p);
        }
    }

    holdPowerUp(type) {
        if (!this.isLocal) return; // Only local player holds it
        if (this.powerUpInventory[type] !== undefined) {
            this.powerUpInventory[type]++;
        }
        // Update UI is handled by Game.js in updateUI()
    }
    
    usePowerUp(type) {
        if (!this.isLocal || this.powerUpInventory[type] <= 0) return;
        
        this.powerUpInventory[type]--;
        
        if (this.game.socket) {
            this.game.socket.emit('usePowerUp', { type });
        }
        
        this.activatePowerUp(type);
    }
    
    activatePowerUp(type) {
        if (type === 'shield') {
            this.shieldActive = true;
            setTimeout(() => { this.shieldActive = false; }, 5000); // 5 seconds
        } else if (type === 'triple_shot') {
            this.tripleShotActive = true;
            setTimeout(() => { this.tripleShotActive = false; }, 5000); // 5 seconds
        }
    }

    draw(ctx) {
        if (!this.canvas) return;
        
        // Blink effect if invulnerable
        if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            return; // Skip drawing to create blink effect
        }
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.colors.primary;
        ctx.drawImage(this.canvas, this.x, this.y);
        ctx.shadowBlur = 0;
        
        if (this.shieldActive) {
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width * 0.8, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
}
