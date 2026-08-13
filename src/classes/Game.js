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
        this.input.initTouch(this.canvas);
        
        // Networking
        this.socket = io();
        this.players = {}; 
        
        this.state = 'START'; 
        this.score = 0;
        this.level = 1;
        this.maxLevels = 6;
        this.mode = 'coop';
        this.bossActive = false;
        
        this.enemiesToKill = 0;
        this.enemiesKilled = 0;
        
        this.background = new Background();
        this.enemyProjectiles = [];
        this.enemies = [];
        this.particles = [];
        this.playerProjectiles = [];
        
        this.scoreEl = document.getElementById('scoreVal');
        this.levelEl = document.getElementById('levelVal');
        this.livesEl = document.getElementById('livesVal');
        
        this.screens = {
            start: document.getElementById('start-screen'),
            gameOver: document.getElementById('game-over-screen'),
            victory: document.getElementById('victory-screen')
        };
        
        this.sendColors = () => {
            const primary = document.getElementById('color-primary') ? document.getElementById('color-primary').value : '#ffffff';
            const secondary = document.getElementById('color-secondary') ? document.getElementById('color-secondary').value : '#ff0000';
            if (this.socket) this.socket.emit('updateColors', { primary, secondary });
        };
        
        document.getElementById('btn-coop').addEventListener('click', () => {
            this.sendColors();
            this.socket.emit('setMode', 'coop');
            this.socket.emit('startGame');
        });
        
        document.getElementById('btn-comp').addEventListener('click', () => {
            this.sendColors();
            this.socket.emit('setMode', 'comp');
            this.socket.emit('startGame');
        });
        
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
        
        this.setupSocketListeners();
        
        this.lastTime = 0;
        requestAnimationFrame((timeStamp) => this.gameLoop(timeStamp));
    }
    
    setupSocketListeners() {
        this.socket.on('init', (state) => {
            this.mode = state.mode;
            this.level = state.level;
            
            for (let id in state.players) {
                this.players[id] = new Player(this, state.players[id].x, state.players[id].y, id === this.socket.id, state.players[id].colors);
            }
        });

        this.socket.on('playerJoined', (data) => {
            this.players[data.id] = new Player(this, data.player.x, data.player.y, false, data.player.colors);
        });
        
        this.socket.on('playerColorsUpdated', (data) => {
            if (this.players[data.id]) {
                this.players[data.id].colors = data.colors;
            }
        });
        
        this.socket.on('playerLeft', (id) => {
            delete this.players[id];
        });
        
        this.socket.on('playerMoved', (data) => {
            if (this.players[data.id]) {
                this.players[data.id].x = data.x;
                this.players[data.id].y = data.y;
            }
        });
        
        this.socket.on('playerShot', (data) => {
            if (this.players[data.id]) {
                this.players[data.id].remoteShoot(data.x, data.y);
            }
        });
        
        this.socket.on('modeChanged', (mode) => {
            this.mode = mode;
        });

        this.socket.on('gameStarted', () => {
            this.sendColors();
            this.startGame();
        });

        this.socket.on('levelChanged', (lvl) => {
            this.level = lvl;
            this.startLevel();
        });

        this.socket.on('spawnEnemy', (data) => {
            if (this.state === 'PLAYING' && !this.bossActive) {
                this.enemies.push(new Enemy(this, data.x, data.y, data.type, data.level, data.id));
            }
        });
        
        this.socket.on('spawnBoss', () => {
            if (this.state === 'PLAYING' && !this.bossActive) {
                this.spawnBoss();
            }
        });
        
        this.socket.on('playerHit', (id) => {
            let p = this.players[id];
            if (p) {
                this.createExplosion(p.x + p.width/2, p.y + p.height/2, p.color, 30);
                p.lives--;
                this.updateUI();
                
                if (p.lives <= 0) {
                    p.markedForDeletion = true;
                } else {
                    p.x = CONFIG.GAME_WIDTH / 2 - CONFIG.PLAYER_WIDTH / 2;
                    p.y = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_HEIGHT - 20;
                }
            }
        });

        this.socket.on('gameOver', () => {
            this.changeState('GAMEOVER');
        });
    }

    startGame() {
        this.changeState('PLAYING');
        this.score = 0;
        this.level = 1;
        this.bossActive = false;
        this.enemies = [];
        this.enemyProjectiles = [];
        this.playerProjectiles = [];
        
        this.enemiesToKill = 10 + (this.level * 5);
        this.enemiesKilled = 0;
        
        // Reset players and spread them out
        let index = 0;
        const totalPlayers = Object.keys(this.players).length;
        const startX = (CONFIG.GAME_WIDTH / 2) - ((totalPlayers - 1) * 40);
        
        for (let id in this.players) {
            this.players[id].lives = 3;
            this.players[id].x = startX + (index * 80);
            index++;
        }
        
        this.updateUI();
    }
    
    startLevel() {
        this.playerProjectiles = [];
        this.enemyProjectiles = [];
        this.enemies = [];
        this.bossActive = false;
        
        this.enemiesToKill = 10 + (this.level * 5);
        this.enemiesKilled = 0;
        
        this.updateUI();
    }

    spawnBoss() {
        this.bossActive = true;
        this.enemies.push(new Boss(this, CONFIG.GAME_WIDTH / 2 - 40, -100, this.level));
    }
    
    enemyKilled() {
        this.enemiesKilled++;
        // Check if we reached the required kills to spawn boss
        if (!this.bossActive && this.enemiesKilled >= this.enemiesToKill) {
            // We tell server to stop spawning, but server also has count.
            // Client side triggers boss when ready and no other enemies.
        }
    }

    updateUI() {
        this.scoreEl.innerText = this.score;
        this.levelEl.innerText = this.level;
        const localPlayer = this.players[this.socket.id];
        if (localPlayer) {
            this.livesEl.innerText = localPlayer.lives;
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
                    e.takeDamage(1);
                    break;
                }
            }
        }
        
        const localPlayer = this.players[this.socket.id];
        if (!localPlayer || localPlayer.markedForDeletion) return;
        
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            let p = this.enemyProjectiles[i];
            if (p.collidesWith(localPlayer)) {
                p.markedForDeletion = true;
                this.playerHit(localPlayer);
            }
        }
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            if (e.collidesWith(localPlayer)) {
                e.takeDamage(100);
                this.playerHit(localPlayer);
            }
        }
    }
    
    playerHit(player) {
        // Solo enviamos el evento si el que choca es nuestro jugador local
        // El servidor lo validará y nos devolverá un evento 'playerHit' para actualizar la UI
        if (player === this.players[this.socket.id]) {
            this.socket.emit('playerHit');
        }
    }

    update() {
        this.background.update();
        
        if (this.state !== 'PLAYING') return;

        const localPlayer = this.players[this.socket.id];
        if (localPlayer) {
            const oldX = localPlayer.x;
            const oldY = localPlayer.y;
            
            localPlayer.update(this.input);
            
            if (oldX !== localPlayer.x || oldY !== localPlayer.y) {
                this.socket.emit('playerMove', { x: localPlayer.x, y: localPlayer.y });
            }
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
        
        for (let id in this.players) {
            if (this.players[id].lives > 0) {
                this.players[id].draw(this.ctx);
            }
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
        } else if (newState === 'VICTORY') {
            document.getElementById('victoryScoreVal').innerText = this.score;
            this.screens.victory.classList.add('active');
        }
    }

    gameLoop(timeStamp) {
        const deltaTime = timeStamp - this.lastTime;
        this.lastTime = timeStamp;

        // Quitamos la lógica local de volver al inicio con ENTER para evitar desync.
        // El anfitrión o la recarga del navegador maneja el reinicio en juegos multijugador simples.
        
        this.update();
        this.draw();

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
}
