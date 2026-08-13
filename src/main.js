import { Game } from './classes/Game.js';
import { audioManager } from './utils/audio.js';

window.addEventListener('load', () => {
    // Iniciar el juego usando el canvas ID
    const game = new Game('gameCanvas');
    
    // Capturar nombre cuando inician partida
    document.getElementById('btn-coop').addEventListener('click', () => {
        const nameInput = document.getElementById('player-name').value.trim();
        if (!nameInput) {
            alert('¡Debes ingresar tu nombre antes de jugar!');
            return;
        }
        audioManager.init(); // Inicializar audio al interactuar
        game.playerName = nameInput;
        if (game.socket) game.socket.emit('setName', game.playerName);
    });
    
    document.getElementById('btn-comp').addEventListener('click', () => {
        const nameInput = document.getElementById('player-name').value.trim();
        if (!nameInput) {
            alert('¡Debes ingresar tu nombre antes de jugar!');
            return;
        }
        audioManager.init();
        game.playerName = nameInput;
        if (game.socket) game.socket.emit('setName', game.playerName);
    });
    
    window.usePowerUp = (type) => {
        const localPlayer = game.players[game.socket?.id];
        if (localPlayer && localPlayer.powerUpInventory[type] > 0) {
            audioManager.playPowerUpUse();
            localPlayer.usePowerUp(type);
            game.updateUI(); // Refrescar la UI para actualizar el contador
        }
    };
});
