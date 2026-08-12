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
    bossSpawned: false
};

let spawnInterval = null;

function startSpawning() {
    if (spawnInterval) clearInterval(spawnInterval);
    gameState.enemiesSpawned = 0;
    gameState.killedEnemiesSet.clear();
    gameState.bossSpawned = false;
    
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
                io.emit('gameOver');
            }
        }
    });

    socket.on('setMode', (mode) => {
        gameState.mode = mode;
        io.emit('modeChanged', mode);
    });
    
    socket.on('enemyKilled', (enemyId) => {
        if (gameState.isPlaying && !gameState.killedEnemiesSet.has(enemyId)) {
            gameState.killedEnemiesSet.add(enemyId);
            // Si ya mataron a todos, spawn boss
            if (gameState.killedEnemiesSet.size >= gameState.enemiesToSpawn && !gameState.bossSpawned) {
                gameState.bossSpawned = true;
                if (spawnInterval) clearInterval(spawnInterval);
                io.emit('spawnBoss');
            }
        }
    });
    
    socket.on('bossKilled', () => {
        if (gameState.isPlaying && gameState.bossSpawned) {
            gameState.level++;
            gameState.enemiesToSpawn = 10 + (gameState.level * 5);
            
            // Damos un respiro antes de empezar el siguiente nivel
            setTimeout(() => {
                io.emit('levelChanged', gameState.level);
                startSpawning();
            }, 3000);
            gameState.bossSpawned = false; // Reset temporary to prevent double trigger
        }
    });

    socket.on('startGame', () => {
        if (!gameState.isPlaying) {
            gameState.isPlaying = true;
            gameState.level = 1;
            gameState.score = 0;
            gameState.enemiesToSpawn = 10 + (gameState.level * 5);
            gameState.killedEnemiesSet.clear();
            gameState.bossSpawned = false;
            
            // Reset lives for all connected players
            for (let id in gameState.players) {
                gameState.players[id].lives = 3;
            }
            
            io.emit('gameStarted');
            startSpawning();
        }
    });
    
    socket.on('nextLevel', () => {
        gameState.level++;
        gameState.enemiesToSpawn = 10 + (gameState.level * 5);
        startSpawning();
        io.emit('levelChanged', gameState.level);
    });

    socket.on('gameOver', () => {
        gameState.isPlaying = false;
        if (spawnInterval) clearInterval(spawnInterval);
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        io.emit('playerLeft', socket.id);
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
