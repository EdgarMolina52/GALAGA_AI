import { CONFIG } from '../utils/config.js';

export class Background {
    constructor() {
        this.stars = [];
        this.numStars = 100;
        
        // Crear estrellas iniciales
        for (let i = 0; i < this.numStars; i++) {
            this.stars.push({
                x: Math.random() * CONFIG.GAME_WIDTH,
                y: Math.random() * CONFIG.GAME_HEIGHT,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 0.5,
                opacity: Math.random()
            });
        }
    }

    update() {
        this.stars.forEach(star => {
            star.y += star.speed;
            
            // Si la estrella sale por debajo, reaparece arriba
            if (star.y > CONFIG.GAME_HEIGHT) {
                star.y = 0;
                star.x = Math.random() * CONFIG.GAME_WIDTH;
                star.speed = Math.random() * 2 + 0.5; // nueva velocidad para más aleatoriedad
            }
            
            // Efecto de parpadeo
            star.opacity += (Math.random() - 0.5) * 0.1;
            if (star.opacity < 0.2) star.opacity = 0.2;
            if (star.opacity > 1) star.opacity = 1;
        });
    }

    draw(ctx) {
        ctx.save();
        this.stars.forEach(star => {
            ctx.globalAlpha = star.opacity;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}
