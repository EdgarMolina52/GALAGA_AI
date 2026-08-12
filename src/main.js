// Seleccionamos el lienzo y su "contexto" 2D (la herramienta para dibujar)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Dimensiones de resolución del juego
canvas.width = 800;
canvas.height = 600;

// Variables para controlar el tiempo
let lastTime = 0;

// El Bucle Principal del Juego
function gameLoop(timestamp) {
    // Calculamos el tiempo entre frames (útil para animaciones fluidas luego)
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // 1. Limpiar el lienzo (fundamental para no dejar rastro del frame anterior)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Actualizar lógica (aquí moveremos a la nave y enemigos más adelante)
    
    // 3. Dibujar elementos
    // Por ahora, dibujamos un texto de prueba verde en el centro
    ctx.fillStyle = "#00FF00";
    ctx.font = "24px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("Sistemas en línea. ¡Lienzo listo!", canvas.width / 2, canvas.height / 2);

    // 4. Solicitar el siguiente frame
    requestAnimationFrame(gameLoop);
}

// Iniciar el ciclo
requestAnimationFrame(gameLoop);
