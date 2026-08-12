export class InputHandler {
    constructor() {
        this.keys = {};
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    isDown(keyCode) {
        return this.keys[keyCode] === true;
    }

    // Comprueba si el jugador se está moviendo a la izquierda
    get left() {
        return this.isDown('ArrowLeft') || this.isDown('KeyA');
    }

    // Comprueba si el jugador se está moviendo a la derecha
    get right() {
        return this.isDown('ArrowRight') || this.isDown('KeyD');
    }
    
    // Comprueba si el jugador se está moviendo arriba
    get up() {
        return this.isDown('ArrowUp') || this.isDown('KeyW');
    }

    // Comprueba si el jugador se está moviendo abajo
    get down() {
        return this.isDown('ArrowDown') || this.isDown('KeyS');
    }

    // Acción principal (Disparar / Iniciar juego)
    get action() {
        return this.isDown('Space') || this.isDown('Enter');
    }
}
