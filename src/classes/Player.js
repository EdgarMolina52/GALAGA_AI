import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';
import { CONFIG } from '../utils/config.js';

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
        
        const minY = CONFIG.GAME_HEIGHT * 0.6;
        if (this.y < minY) this.y = minY;
        if (this.y + this.height > CONFIG.GAME_HEIGHT) this.y = CONFIG.GAME_HEIGHT - this.height;

        if (this.fireTimer > 0) this.fireTimer--;
        
        if (input.action && this.fireTimer === 0) {
            this.shoot();
            this.fireTimer = CONFIG.FIRE_COOLDOWN;
        }
    }

    shoot() {
        const xPos = this.x + this.width / 2 - CONFIG.PROJECTILE_WIDTH / 2;
        this.game.playerProjectiles.push(new Projectile(xPos, this.y));
    }

    draw(ctx) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.colors.primary;
        ctx.drawImage(this.canvas, this.x, this.y);
        ctx.shadowBlur = 0;
    }
}
