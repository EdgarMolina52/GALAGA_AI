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
            
            // Calculamos el tamaño real del canvas renderizado debido al object-fit: contain
            const canvasRatio = canvas.width / canvas.height;
            const rectRatio = rect.width / rect.height;
            
            let renderedWidth = rect.width;
            let renderedHeight = rect.height;
            let offsetX = 0;
            let offsetY = 0;
            
            if (rectRatio > canvasRatio) {
                // Barras a los lados (Pillarbox)
                renderedWidth = rect.height * canvasRatio;
                offsetX = (rect.width - renderedWidth) / 2;
            } else {
                // Barras arriba/abajo (Letterbox)
                renderedHeight = rect.width / canvasRatio;
                offsetY = (rect.height - renderedHeight) / 2;
            }
            
            const scaleX = canvas.width / renderedWidth;
            const scaleY = canvas.height / renderedHeight;
            
            this.touchX = (e.touches[0].clientX - rect.left - offsetX) * scaleX;
            this.touchY = (e.touches[0].clientY - rect.top - offsetY) * scaleY;
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
