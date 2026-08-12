// Seleccionamos el lienzo y su "contexto" 2D (la herramienta para dibujar)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Dimensiones de resolución del juego
canvas.width = 800;
canvas.height = 600;

// Variables para controlar el tiempo
let lastTime = 0;

// Objeto jugador (la nave)
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 70,
    width: 50,
    height: 50,
    speed: 5,
    dx: 0
};

// Controles del teclado
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Right') {
        player.dx = player.speed;
    } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        player.dx = -player.speed;
    }
});

document.addEventListener('keyup', (e) => {
    if (
        e.key === 'ArrowRight' || 
        e.key === 'Right' || 
        e.key === 'ArrowLeft' || 
        e.key === 'Left'
    ) {
        player.dx = 0;
    }
});

// El Bucle Principal del Juego
function gameLoop(timestamp) {
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // 1. Limpiar el lienzo
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Actualizar lógica (movimiento)
    player.x += player.dx;

    // Evitar que la nave salga de los bordes
    if (player.x < 0) {
        player.x = 0;
    } else if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
    
    // 3. Dibujar elementos
    // Dibujar la nave (un simple triángulo por ahora)
    ctx.fillStyle = "#00FF00";
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y); // Punta
    ctx.lineTo(player.x, player.y + player.height);    // Esquina inferior izquierda
    ctx.lineTo(player.x + player.width, player.y + player.height); // Esquina inferior derecha
    ctx.closePath();
    ctx.fill();

    // 4. Solicitar el siguiente frame
    requestAnimationFrame(gameLoop);
}

// Iniciar el ciclo
requestAnimationFrame(gameLoop);
