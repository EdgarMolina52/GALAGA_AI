const { io } = require('socket.io-client');
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('startGame');
    
    // Simulate enemy escape
    setTimeout(() => {
        socket.emit('enemyEscaped', 'test-id-1');
    }, 100);

    // Simulate game over (die)
    setTimeout(() => {
        socket.emit('playerHit');
        socket.emit('playerHit');
        socket.emit('playerHit'); // 3 lives
    }, 200);

    // Simulate restart before 1.5s timeout
    setTimeout(() => {
        socket.emit('startGame');
    }, 300);

    setTimeout(() => {
        console.log('Test complete, no crash!');
        process.exit(0);
    }, 2000);
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});
