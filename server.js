const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const gameState = {
    players: {},
    mode: 'coop',
    level: 1,
    score: 0,
    isPlaying: false,
    enemiesSpawned: 0,
    enemiesToSpawn: 20,
    killedEnemiesSet: new Set(),
    escapedEnemyVotes: {},
    bossSpawned: false,
    finalScores: []
};

let spawnInterval = null;

function startSpawning(reset = true) {
    if (spawnInterval) clearInterval(spawnInterval);
    
    if (reset) {
        gameState.enemiesSpawned = 0;
        gameState.killedEnemiesSet.clear();
        gameState.escapedEnemyVotes = {};
        gameState.bossSpawned = false;
    }
    
    // Spawn cada 1.5 a 3 segundos dependiendo del nivel
    const spawnRate = Math.max(1000, 3000 - (gameState.level * 200));
    
    spawnInterval = setInterval(() => {
        if (!gameState.isPlaying) {
            clearInterval(spawnInterval);
            return;
        }

        if (gameState.enemiesSpawned < gameState.enemiesToSpawn) {
            const types = ['scout', 'fighter', 'tank'];
            // A mayor nivel, más probabilidad de tanques y fighters
            const type = types[Math.floor(Math.random() * Math.min(3, 1 + gameState.level * 0.5))];
            
            const enemyData = {
                id: Math.random().toString(36).substr(2, 9),
                type: type,
                x: Math.random() * (600 - 40), // CONFIG.GAME_WIDTH - enemy width
                y: -50,
                level: gameState.level
            };
            
            io.emit('spawnEnemy', enemyData);
            gameState.enemiesSpawned++;
        }
    }, spawnRate);
}

io.on('connection', (socket) => {
    gameState.players[socket.id] = { x: 300, y: 700, lives: 3, colors: { primary: '#ffffff', secondary: '#ff0000' } };
    
    // We filter out Set before emitting init
    const stateToSend = { ...gameState, killedEnemiesSet: Array.from(gameState.killedEnemiesSet) };
    socket.emit('init', stateToSend);
    socket.broadcast.emit('playerJoined', { id: socket.id, player: gameState.players[socket.id] });
    
    if (gameState.isPlaying) updateEnemiesToSpawn();
    
    socket.on('updateColors', (colors) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].colors = colors;
            socket.broadcast.emit('playerColorsUpdated', { id: socket.id, colors });
        }
    });

    socket.on('playerMove', (data) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].x = data.x;
            gameState.players[socket.id].y = data.y;
            socket.broadcast.emit('playerMoved', { id: socket.id, x: data.x, y: data.y });
        }
    });

    socket.on('playerShoot', (data) => {
        socket.broadcast.emit('playerShot', { id: socket.id, x: data.x, y: data.y });
    });
    
    socket.on('playerHit', () => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].lives--;
            io.emit('playerHit', socket.id);
            
            // Check if all players are dead
            let allDead = true;
            for (let id in gameState.players) {
                if (gameState.players[id].lives > 0) {
                    allDead = false;
                }
            }
            if (allDead && gameState.isPlaying) {
                gameState.isPlaying = false;
                if (spawnInterval) clearInterval(spawnInterval);
                gameState.finalScores = [];
                io.emit('gameOver');
            }
        }
    });

    socket.on('enemyEscaped', (enemyId) => {
        // Ignoramos si alguien ya reportó que lo mató (el lag a veces hace creer que escapó)
        if (gameState.killedEnemiesSet.has(enemyId)) return;

        if (!gameState.escapedEnemyVotes[enemyId]) {
            gameState.escapedEnemyVotes[enemyId] = new Set();
            
            // Damos 1.5 segundos de gracia por el lag. Si nadie lo mata en ese tiempo, se procesa la fuga.
            setTimeout(() => {
                if (gameState.isPlaying && !gameState.killedEnemiesSet.has(enemyId) && gameState.escapedEnemyVotes[enemyId] && !gameState.escapedEnemyVotes[enemyId].has('processed')) {
                    gameState.escapedEnemyVotes[enemyId].add('processed');
                    
                    // Deduct 1 life from all players
                    let allDead = true;
                    for (let id in gameState.players) {
                        if (gameState.players[id].lives > 0) {
                            gameState.players[id].lives--;
                            io.emit('playerHit', id);
                            if (gameState.players[id].lives > 0) {
                                allDead = false;
                            }
                        }
                    }
                    
                    if (allDead && gameState.isPlaying) {
                        gameState.isPlaying = false;
                        if (spawnInterval) clearInterval(spawnInterval);
                        gameState.finalScores = [];
                        io.emit('gameOver');
                    } else {
                        checkBossSpawn();
                    }
                }
            }, 1500);
        }
    });

    socket.on('setMode', (mode) => {
        gameState.mode = mode;
        io.emit('modeChanged', mode);
    });
    
    function updateEnemiesToSpawn() {
        const playerCount = Math.max(1, Object.keys(gameState.players).length);
        gameState.enemiesToSpawn = (10 + (gameState.level * 5)) * playerCount;
    }
    
    socket.on('setName', (name) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].name = name;
        }
    });

    function checkBossSpawn() {
        if (!gameState.isPlaying || gameState.bossSpawned) return;
        
        const escapedCount = Object.keys(gameState.escapedEnemyVotes).filter(id => gameState.escapedEnemyVotes[id].has('processed')).length;
        const totalResolved = gameState.killedEnemiesSet.size + escapedCount;
        
        if (totalResolved >= gameState.enemiesToSpawn) {
            gameState.bossSpawned = true;
            if (spawnInterval) clearInterval(spawnInterval);
            
            const bossTypes = ['laser', 'split', 'spawner'];
            const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
            
            io.emit('spawnBoss', { type: bossType });
        }
    }

    socket.on('enemyKilled', (data) => {
        const enemyId = data.id;
        if (gameState.isPlaying && !gameState.killedEnemiesSet.has(enemyId)) {
            gameState.killedEnemiesSet.add(enemyId);
            
            // Avisar a los demás clientes que el enemigo murió
            socket.broadcast.emit('enemyKilled', enemyId);
            
            // 15% chance to drop power-up
            if (Math.random() < 0.15) {
                const types = ['revive', 'triple_shot', 'shield'];
                const puType = types[Math.floor(Math.random() * types.length)];
                io.emit('spawnPowerUp', { id: Math.random().toString(36).substr(2, 9), type: puType, x: data.x, y: data.y });
            }

            // Si ya resolvieron a todos (muertos o fugados), spawn boss
            checkBossSpawn();
        }
    });

    socket.on('bossKilled', (data) => {
        if (gameState.isPlaying && gameState.bossSpawned) {
            io.emit('bossKilled');
            // Boss always drops a revive power up
            if (data && data.x !== undefined) {
                io.emit('spawnPowerUp', { id: Math.random().toString(36).substr(2, 9), type: 'revive', x: data.x, y: data.y });
            }
            gameState.level++;
            updateEnemiesToSpawn();
            
            // Damos un respiro antes de empezar el siguiente nivel
            setTimeout(() => {
                io.emit('levelChanged', gameState.level);
                startSpawning(true);
            }, 3000);
            gameState.bossSpawned = false; // Reset temporary to prevent double trigger
        }
    });

    socket.on('startGame', () => {
        if (!gameState.isPlaying) {
            gameState.isPlaying = true;
            gameState.level = 1;
            gameState.score = 0;
            updateEnemiesToSpawn();
            gameState.killedEnemiesSet.clear();
            gameState.escapedEnemyVotes = {};
            gameState.bossSpawned = false;
            
            // Reset lives for all connected players
            for (let id in gameState.players) {
                gameState.players[id].lives = 3;
            }
            
            io.emit('gameStarted');
            startSpawning(true);
        } else {
            // Late joiner logic
            if (gameState.players[socket.id]) {
                gameState.players[socket.id].lives = 3;
            }
            socket.emit('gameStarted');
        }
    });
    
    socket.on('usePowerUp', (data) => {
        // data.type
        if (data.type === 'revive') {
            io.emit('showReviveMenu', socket.id);
            if (spawnInterval) clearInterval(spawnInterval); // Pausa el spawn
        } else {
            // Shield or triple_shot is handled client-side mostly, but we could broadcast it
            socket.broadcast.emit('playerPowerUp', { id: socket.id, type: data.type });
        }
    });

    socket.on('revivePlayer', (playerIdToRevive) => {
        if (gameState.players[playerIdToRevive]) {
            gameState.players[playerIdToRevive].lives = 3;
            io.emit('playerRevived', playerIdToRevive);
        }
        io.emit('resumeGame');
        if (gameState.isPlaying) startSpawning(false);
    });

    socket.on('cancelRevive', () => {
        io.emit('resumeGame');
        if (gameState.isPlaying) startSpawning(false);
    });

    socket.on('nextLevel', () => {
        gameState.level++;
        updateEnemiesToSpawn();
        startSpawning(true);
        io.emit('levelChanged', gameState.level);
    });

    socket.on('submitScore', (data) => {
        gameState.finalScores.push(data);
        const playerCount = Object.keys(gameState.players).length;
        if (gameState.finalScores.length === playerCount) {
            gameState.finalScores.sort((a, b) => b.score - a.score);
            io.emit('showScoreboard', gameState.finalScores);
        }
    });

    socket.on('gameOver', () => {
        gameState.isPlaying = false;
        if (spawnInterval) clearInterval(spawnInterval);
        io.emit('gameOver');
    });

    socket.on('powerUpCollected', (puId) => {
        socket.broadcast.emit('powerUpCollected', puId);
    });
    
    socket.on('dropPowerUps', (data) => {
        if (data && data.types && Array.isArray(data.types)) {
            data.types.forEach((type, index) => {
                const offsetX = (Math.random() - 0.5) * 60;
                const offsetY = (Math.random() - 0.5) * 60;
                io.emit('spawnPowerUp', { 
                    id: Math.random().toString(36).substr(2, 9), 
                    type: type, 
                    x: data.x + offsetX, 
                    y: data.y + offsetY 
                });
            });
        }
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        io.emit('playerLeft', socket.id);
        if (gameState.isPlaying) updateEnemiesToSpawn();
        
        if (Object.keys(gameState.players).length === 0) {
            gameState.isPlaying = false;
            if (spawnInterval) clearInterval(spawnInterval);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor de Galaga escuchando en el puerto ${PORT}`);
});
