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
        return this.isDown('Space') || this.isDown('Enter') || this.isShooting;
    }

    initTouch(canvas) {
        this.touchX = null;
        this.touchY = null;
        this.isTouching = false;
        this.isShooting = false;

        if (!canvas) return;

        const updateTouch = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            this.touchX = (e.touches[0].clientX - rect.left) * scaleX;
            this.touchY = (e.touches[0].clientY - rect.top) * scaleY;
        };

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Evita scroll o zoom
            updateTouch(e);
            this.isTouching = true;
            this.isShooting = true;
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            updateTouch(e);
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isTouching = false;
            this.isShooting = false;
        }, { passive: false });
    }
}
