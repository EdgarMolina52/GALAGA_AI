import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { Boss } from './Boss.js';
import { Particle } from './Particle.js';
import { Background } from './Background.js';
import { InputHandler } from '../utils/input.js';
import { CONFIG } from '../utils/config.js';
import { audioManager } from '../utils/audio.js';

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
            const nameInput = document.getElementById('player-name').value.trim();
            if (!nameInput) return; // Validación manejada en main.js
            
            this.sendColors();
            this.socket.emit('setMode', 'coop');
            this.socket.emit('startGame');
        });
        
        document.getElementById('btn-comp').addEventListener('click', () => {
            const nameInput = document.getElementById('player-name').value.trim();
            if (!nameInput) return; // Validación manejada en main.js
            
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
                this.players[id].name = state.players[id].name;
            }

            if (state.isPlaying && this.playerName) {
                this.changeState('PLAYING');
            }
        });

        this.socket.on('playerJoined', (data) => {
            this.players[data.id] = new Player(this, data.player.x, data.player.y, false, data.player.colors);
            this.players[data.id].name = data.player.name;
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
        
        this.socket.on('enemyKilled', (enemyId) => {
            const enemy = this.enemies.find(e => e.id === enemyId);
            if (enemy && !enemy.markedForDeletion) {
                enemy.markedForDeletion = true;
                this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color, 30);
            }
        });
        
        this.socket.on('bossKilled', () => {
            this.enemies.forEach(e => {
                if (e.type === 'boss' && !e.markedForDeletion) {
                    e.markedForDeletion = true;
                    this.createExplosion(e.x + e.width/2, e.y + e.height/2, e.color, 50);
                }
            });
            this.bossActive = false;
        });
        
        this.socket.on('gameOver', () => {
            if (this.state !== 'GAMEOVER') {
                this.changeState('GAMEOVER');
                const localPlayer = this.players[this.socket.id];
                this.socket.emit('submitScore', { name: localPlayer ? localPlayer.name : 'Unknown', score: this.score });
            }
        });
        
        this.socket.on('showScoreboard', (scores) => {
            const container = document.getElementById('scoreboard-container');
            container.innerHTML = '';
            scores.forEach((s, index) => {
                const p = document.createElement('p');
                if (index === 0) {
                    p.innerHTML = `👑 <strong>Jefe Maestro:</strong> ${s.name} - ${s.score}`;
                    p.style.color = '#FFD700';
                } else {
                    p.innerHTML = `${s.name} - ${s.score}`;
                }
                container.appendChild(p);
            });
        });

        this.socket.on('gameStarted', () => {
            if (this.playerName) {
                this.sendColors();
                this.startGame();
                audioManager.playBackgroundMusic();
            }
        });

        this.socket.on('levelChanged', (lvl) => {
            this.level = lvl;
            audioManager.playLevelComplete();
            
            // Mostrar pantalla de nivel completado
            const lvlScreen = document.getElementById('level-complete-screen');
            if (lvlScreen) {
                lvlScreen.classList.add('active');
                setTimeout(() => {
                    lvlScreen.classList.remove('active');
                }, 3000);
            }
            
            this.startLevel();
        });

        this.socket.on('spawnEnemy', (data) => {
            if (this.state === 'PLAYING' && !this.bossActive) {
                this.enemies.push(new Enemy(this, data.x, data.y, data.type, data.level, data.id));
            }
        });
        
        this.socket.on('spawnBoss', (data) => {
            if (this.state === 'PLAYING' && !this.bossActive) {
                this.spawnBoss(data.type);
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
                    // Si el jugador local muere
                    if (id === this.socket.id) {
                        document.getElementById('dead-wait-screen').classList.add('active');
                        
                        // Soltar todos los powerups
                        let typesToDrop = [];
                        if (p.powerUpInventory) {
                            for (let type in p.powerUpInventory) {
                                let count = p.powerUpInventory[type];
                                for (let i = 0; i < count; i++) {
                                    typesToDrop.push(type);
                                }
                                p.powerUpInventory[type] = 0;
                            }
                        }
                        this.updateUI();
                        
                        if (typesToDrop.length > 0) {
                            this.socket.emit('dropPowerUps', { types: typesToDrop, x: p.x, y: p.y });
                        }
                    } else {
                        p.x = CONFIG.GAME_WIDTH / 2 - CONFIG.PLAYER_WIDTH / 2;
                        p.y = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_HEIGHT - 20;
                        p.invulnerableTimer = 120;
                    }
                }
            }
        });

        this.socket.on('gameOver', () => {
            audioManager.playGameOver();
            this.changeState('GAMEOVER');
            const localPlayer = this.players[this.socket.id];
            this.socket.emit('submitScore', { name: this.playerName || (localPlayer ? localPlayer.name : 'Unknown'), score: this.score });
        });

        this.socket.on('spawnPowerUp', (data) => {
            if (this.state === 'PLAYING') {
                import('./PowerUp.js').then(module => {
                    this.powerUps.push(new module.PowerUp(this, data.x, data.y, data.type, data.id));
                });
            }
        });

        this.socket.on('powerUpCollected', (puId) => {
            const pu = this.powerUps.find(p => p.id === puId);
            if (pu && !pu.markedForDeletion) {
                pu.markedForDeletion = true;
            }
        });

        this.socket.on('showReviveMenu', (byPlayerId) => {
            this.changeState('PAUSED');
            this.showReviveMenu(byPlayerId);
        });

        this.socket.on('resumeGame', () => {
            if (this.state === 'PAUSED') {
                this.changeState('PLAYING');
                document.getElementById('revive-screen').classList.remove('active');
            }
        });

        this.socket.on('playerRevived', (playerId) => {
            if (this.players[playerId]) {
                this.players[playerId].lives = 3;
                this.players[playerId].markedForDeletion = false;
                this.players[playerId].x = CONFIG.GAME_WIDTH / 2 - CONFIG.PLAYER_WIDTH / 2;
                this.players[playerId].y = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_HEIGHT - 20;
                this.players[playerId].invulnerableTimer = 120;
                
                if (playerId === this.socket.id) {
                    document.getElementById('dead-wait-screen').classList.remove('active');
                }
            }
        });
        
        this.socket.on('playerPowerUp', (data) => {
            if (this.players[data.id]) {
                this.players[data.id].activatePowerUp(data.type);
            }
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
        this.powerUps = [];
        
        document.getElementById('level-complete-screen')?.classList.remove('active');
        document.getElementById('dead-wait-screen')?.classList.remove('active');
        
        this.enemiesToKill = 10 + (this.level * 5);
        this.enemiesKilled = 0;
        
        // Reset players and spread them out
        let index = 0;
        const totalPlayers = Object.keys(this.players).length;
        const startX = (CONFIG.GAME_WIDTH / 2) - ((totalPlayers - 1) * 40);
        
        for (let id in this.players) {
            this.players[id].lives = 3;
            this.players[id].powerUpInventory = {
                shield: 0,
                triple_shot: 0,
                revive: 0
            };
            this.players[id].x = startX + (index * 80);
            this.players[id].invulnerableTimer = 120;
            index++;
        }
        
        this.updateUI();
    }
    
    startLevel() {
        this.playerProjectiles = [];
        this.enemyProjectiles = [];
        this.enemies = [];
        this.powerUps = [];
        this.bossActive = false;
        
        this.enemiesToKill = 10 + (this.level * 5);
        this.enemiesKilled = 0;
        
        this.updateUI();
    }

    showReviveMenu(byPlayerId) {
        const modal = document.getElementById('revive-screen');
        const list = document.getElementById('dead-players-list');
        const title = document.getElementById('revive-title');
        const desc = document.getElementById('revive-desc');
        list.innerHTML = ''; // Limpiar lista
        
        if (byPlayerId === this.socket.id) {
            if (title) {
                title.innerText = 'Revivir Aliado';
                title.style.color = '#00ff00';
                title.style.textShadow = '0 0 10px #00ff00';
            }
            if (desc) desc.innerText = 'Selecciona a un jugador caído para revivirlo:';
            
            for (let id in this.players) {
                if (this.players[id].lives <= 0) {
                    const btn = document.createElement('button');
                    btn.innerText = `Revivir a ${this.players[id].name || 'Jugador ' + id.substr(0,4)}`;
                    btn.onclick = () => {
                        this.socket.emit('revivePlayer', id);
                    };
                    list.appendChild(btn);
                }
            }
            
            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = 'Cancelar';
            cancelBtn.style.backgroundColor = '#ff0000';
            cancelBtn.onclick = () => {
                this.socket.emit('cancelRevive');
            };
            list.appendChild(cancelBtn);
        } else {
            if (title) {
                title.innerText = 'Refuerzos en camino...';
                title.style.color = '#00AAFF';
                title.style.textShadow = '0 0 10px #00AAFF';
            }
            if (desc) desc.innerText = 'Un compañero está decidiendo a quién revivir.';
        }
        
        modal.classList.add('active');
    }

    spawnBoss(type = 'laser') {
        this.bossActive = true;
        audioManager.playBossWarning();
        let boss;
        
        import('./LaserBoss.js').then(laser => {
            import('./SplitBoss.js').then(split => {
                import('./SpawnerBoss.js').then(spawner => {
                    const startX = CONFIG.GAME_WIDTH / 2 - 90; // width is 180, so -90
                    if (type === 'laser') boss = new laser.LaserBoss(this, startX, -150, this.level);
                    else if (type === 'split') boss = new split.SplitBoss(this, startX, -150, this.level);
                    else if (type === 'spawner') boss = new spawner.SpawnerBoss(this, startX, -150, this.level);
                    else boss = new laser.LaserBoss(this, startX, -150, this.level); // fallback
                    
                    this.enemies.push(boss);
                });
            });
        });
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
            
            // Actualizar inventario de power-ups
            const inv = localPlayer.powerUpInventory;
            if (inv) {
                const shieldCount = document.getElementById('count-shield');
                const tripleCount = document.getElementById('count-triple_shot');
                const reviveCount = document.getElementById('count-revive');
                
                if (shieldCount) shieldCount.innerText = inv.shield || 0;
                if (tripleCount) tripleCount.innerText = inv.triple_shot || 0;
                if (reviveCount) reviveCount.innerText = inv.revive || 0;
                
                // Efecto visual si no hay cargas
                document.getElementById('bubble-shield').style.opacity = inv.shield > 0 ? 1 : 0.5;
                document.getElementById('bubble-triple_shot').style.opacity = inv.triple_shot > 0 ? 1 : 0.5;
                document.getElementById('bubble-revive').style.opacity = inv.revive > 0 ? 1 : 0.5;
            }
        }
    }

    addScore(points) {
        this.score += points;
        this.updateUI();
    }

    createExplosion(x, y, color, count) {
        audioManager.playExplosion();
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
                    if (p.isLocal !== false) {
                        e.takeDamage(1, true);
                    } else {
                        e.takeDamage(1, false);
                    }
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
        
        if (this.powerUps) {
            for (let i = this.powerUps.length - 1; i >= 0; i--) {
                let pu = this.powerUps[i];
                if (pu.collidesWith(localPlayer)) {
                    audioManager.playPowerUpPickup();
                    pu.markedForDeletion = true;
                    localPlayer.holdPowerUp(pu.type);
                    this.updateUI();
                    
                    if (this.socket) {
                        this.socket.emit('powerUpCollected', pu.id);
                    }
                }
            }
        }
    }
    
    playerHit(player) {
        if (player.shieldActive || player.invulnerableTimer > 0) return; // Inmune con escudo o al reaparecer

        // Solo enviamos el evento si el que choca es nuestro jugador local
        // El servidor lo validará y nos devolverá un evento 'playerHit' para actualizar la UI
        if (player === this.players[this.socket.id]) {
            this.socket.emit('playerHit');
        }
    }

    update() {
        this.background.update();
        
        if (this.state !== 'PLAYING') return;

        for (let id in this.players) {
            const player = this.players[id];
            if (id === this.socket.id) {
                const oldX = player.x;
                const oldY = player.y;
                
                player.update(this.input);
                
                if (oldX !== player.x || oldY !== player.y) {
                    this.socket.emit('playerMove', { x: player.x, y: player.y });
                }
            } else {
                player.update({});
            }
        }
        
        
        this.playerProjectiles.forEach(p => p.update());
        this.enemyProjectiles.forEach(p => p.update());
        this.enemies.forEach(e => e.update());
        this.particles.forEach(p => p.update());
        if (this.powerUps) this.powerUps.forEach(p => p.update());
        
        this.playerProjectiles = this.playerProjectiles.filter(p => !p.markedForDeletion);
        this.enemyProjectiles = this.enemyProjectiles.filter(p => !p.markedForDeletion);
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        this.particles = this.particles.filter(p => !p.markedForDeletion);
        if (this.powerUps) this.powerUps = this.powerUps.filter(p => !p.markedForDeletion);
        
        this.checkCollisions();
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.background.draw(this.ctx);
        
        if (this.powerUps) this.powerUps.forEach(p => p.draw(this.ctx));
        
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
        document.getElementById('dead-wait-screen').classList.remove('active');
        document.getElementById('revive-screen').classList.remove('active');
        
        if (newState === 'START') {
            this.screens.start.classList.add('active');
        } else if (newState === 'GAMEOVER') {
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
