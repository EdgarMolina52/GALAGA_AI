import { Entity } from './Entity.js';
import { CONFIG } from '../utils/config.js';

export class PowerUp extends Entity {
    constructor(game, x, y, type, id) {
        super(x, y, 20, 20, '#ffffff');
        this.game = game;
        this.id = id;
        this.type = type; // 'revive', 'triple_shot', 'shield'
        this.speedY = 3;
        
        switch (type) {
            case 'revive':
                this.color = '#00ff00'; // Verde
                break;
            case 'triple_shot':
                this.color = '#00ffff'; // Cyan
                break;
            case 'shield':
                this.color = '#ffff00'; // Amarillo
                break;
        }
    }

    update() {
        this.y += this.speedY;
        
        if (this.y > CONFIG.GAME_HEIGHT) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        
        // Draw a simple diamond shape
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Draw letter inside
        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let letter = '';
        if (this.type === 'revive') letter = 'R';
        if (this.type === 'triple_shot') letter = 'T';
        if (this.type === 'shield') letter = 'S';
        
        ctx.fillText(letter, this.x + this.width / 2, this.y + this.height / 2 + 1);
    }
}
