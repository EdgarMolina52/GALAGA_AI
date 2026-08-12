import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { Boss } from './Boss.js';
import { Particle } from './Particle.js';
import { Background } from './Background.js';
import { InputHandler } from '../utils/input.js';
import { CONFIG } from '../utils/config.js';

export class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.GAME_WIDTH;
        this.canvas.height = CONFIG.GAME_HEIGHT;
        
        this.input = new InputHandler();
        
        this.state = 'START'; 
        this.score = 0;
        this.level = 1;
        this.maxLevels = 6;
        this.bossActive = false;
        
        this.enemiesToSpawn = 0;
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        
        this.spawnInterval = null;
        
        this.background = new Background();
        this.enemyProjectiles = [];
        this.enemies = [];
        this.particles = [];
        this.playerProjectiles = [];
        this.player = null; // Local player
        
        this.scoreEl = document.getElementById('scoreVal');
        this.levelEl = document.getElementById('levelVal');
        this.livesEl = document.getElementById('livesVal');
        
        this.screens = {
            start: document.getElementById('start-screen'),
            gameOver: document.getElementById('game-over-screen'),
            victory: document.getElementById('victory-screen')
        };
        
        const btnPlay = document.getElementById('btn-play');
        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && (this.state === 'GAMEOVER' || this.state === 'VICTORY')) {
                this.changeState('START');
            }
        });
        
        document.querySelectorAll('.btn-restart').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.state === 'GAMEOVER' || this.state === 'VICTORY') {
                    this.changeState('START');
                }
            });
        });
        
        this.lastTime = 0;
        requestAnimationFrame((timeStamp) => this.gameLoop(timeStamp));
    }
    
    startGame() {
        this.changeState('PLAYING');
        this.score = 0;
        this.level = 1;
        this.bossActive = false;
        this.enemies = [];
        this.enemyProjectiles = [];
        this.playerProjectiles = [];
        this.particles = [];
        
        const primary = document.getElementById('color-primary') ? document.getElementById('color-primary').value : '#ffffff';
        const secondary = document.getElementById('color-secondary') ? document.getElementById('color-secondary').value : '#ff0000';
        
        this.player = new Player(this, CONFIG.GAME_WIDTH / 2 - CONFIG.PLAYER_WIDTH / 2, CONFIG.GAME_HEIGHT - CONFIG.PLAYER_HEIGHT - 20, true, { primary, secondary });
        this.player.lives = 3;
        
        this.startLevel();
    }
    
    startLevel() {
        this.playerProjectiles = [];
        this.enemyProjectiles = [];
        this.enemies = [];
        this.bossActive = false;
        
        this.enemiesToSpawn = 10 + (this.level * 5);
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        
        this.updateUI();
        this.startSpawning();
    }

    startSpawning() {
        if (this.spawnInterval) clearInterval(this.spawnInterval);
        
        const spawnRate = Math.max(1000, 3000 - (this.level * 200));
        
        this.spawnInterval = setInterval(() => {
            if (this.state !== 'PLAYING') {
                clearInterval(this.spawnInterval);
                return;
            }

            if (this.enemiesSpawned < this.enemiesToSpawn) {
                const types = ['scout', 'fighter', 'tank'];
                const type = types[Math.floor(Math.random() * Math.min(3, 1 + this.level * 0.5))];
                
                const x = Math.random() * (CONFIG.GAME_WIDTH - 40);
                const y = -50;
                
                this.enemies.push(new Enemy(this, x, y, type, this.level, Math.random().toString()));
                this.enemiesSpawned++;
            } else {
                clearInterval(this.spawnInterval);
            }
        }, spawnRate);
    }

    spawnBoss() {
        this.bossActive = true;
        this.enemies.push(new Boss(this, CONFIG.GAME_WIDTH / 2 - 40, -100, this.level));
    }
    
    enemyKilled() {
        this.enemiesKilled++;
        if (!this.bossActive && this.enemiesKilled >= this.enemiesToSpawn) {
            this.spawnBoss();
        }
    }

    bossKilled() {
        if (this.state === 'PLAYING' && this.bossActive) {
            this.level++;
            this.bossActive = false;
            
            if (this.level > this.maxLevels) {
                this.changeState('VICTORY');
                return;
            }
            
            setTimeout(() => {
                if (this.state === 'PLAYING') {
                    this.startLevel();
                }
            }, 3000);
        }
    }

    updateUI() {
        this.scoreEl.innerText = this.score;
        this.levelEl.innerText = this.level;
        if (this.player) {
            this.livesEl.innerText = this.player.lives;
        }
    }

    addScore(points) {
        this.score += points;
        this.updateUI();
    }

    createExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    checkCollisions() {
        for (let i = this.playerProjectiles.length - 1; i >= 0; i--) {
            let p = this.playerProjectiles[i];
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                let e = this.enemies[j];
                if (p.collidesWith(e)) {
                    p.markedForDeletion = true;
                    e.takeDamage(1); // Enemigo se encarga de llamar enemyKilled / bossKilled si muere
                    break;
                }
            }
        }
        
        if (!this.player || this.player.markedForDeletion) return;
        
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            let p = this.enemyProjectiles[i];
            if (p.collidesWith(this.player)) {
                p.markedForDeletion = true;
                this.playerHit();
            }
        }
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            if (e.collidesWith(this.player)) {
                e.takeDamage(100);
                this.playerHit();
            }
        }
    }
    
    playerHit() {
        this.createExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2, this.player.colors.primary, 30);
        this.player.lives--;
        this.updateUI();
        
        if (this.player.lives <= 0) {
            this.player.markedForDeletion = true;
            this.changeState('GAMEOVER');
        } else {
            this.player.x = CONFIG.GAME_WIDTH / 2 - CONFIG.PLAYER_WIDTH / 2;
            this.player.y = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_HEIGHT - 20;
        }
    }

    update() {
        this.background.update();
        
        if (this.state !== 'PLAYING') return;

        if (this.player && !this.player.markedForDeletion) {
            this.player.update(this.input);
        }
        
        this.playerProjectiles.forEach(p => p.update());
        this.enemyProjectiles.forEach(p => p.update());
        this.enemies.forEach(e => e.update());
        this.particles.forEach(p => p.update());
        
        this.playerProjectiles = this.playerProjectiles.filter(p => !p.markedForDeletion);
        this.enemyProjectiles = this.enemyProjectiles.filter(p => !p.markedForDeletion);
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        this.particles = this.particles.filter(p => !p.markedForDeletion);
        
        this.checkCollisions();
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.background.draw(this.ctx);
        
        if (this.state !== 'PLAYING') return;

        this.particles.forEach(p => p.draw(this.ctx));
        this.playerProjectiles.forEach(p => p.draw(this.ctx));
        this.enemyProjectiles.forEach(p => p.draw(this.ctx));
        this.enemies.forEach(e => e.draw(this.ctx));
        
        if (this.player && !this.player.markedForDeletion) {
            this.player.draw(this.ctx);
        }
    }

    changeState(newState) {
        this.state = newState;
        Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
        
        if (newState === 'START') {
            this.screens.start.classList.add('active');
        } else if (newState === 'GAMEOVER') {
            document.getElementById('finalScoreVal').innerText = this.score;
            this.screens.gameOver.classList.add('active');
            if (this.spawnInterval) clearInterval(this.spawnInterval);
        } else if (newState === 'VICTORY') {
            document.getElementById('victoryScoreVal').innerText = this.score;
            this.screens.victory.classList.add('active');
            if (this.spawnInterval) clearInterval(this.spawnInterval);
        }
    }

    gameLoop(timeStamp) {
        const deltaTime = timeStamp - this.lastTime;
        this.lastTime = timeStamp;

        this.update();
        this.draw();

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
}
