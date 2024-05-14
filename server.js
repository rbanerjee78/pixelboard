const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to SQLite database
const db = new sqlite3.Database('pixel_board.db');

// Create pixel board table if not exists
db.run(`CREATE TABLE IF NOT EXISTS PixelBoard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x INTEGER,
    y INTEGER,
    color TEXT
)`);

// Function to get current pixel board state from the database
function getPixelBoardState(callback) {
    db.all('SELECT * FROM PixelBoard', (err, rows) => {
        if (err) {
            console.error('Error getting pixel board state:', err);
            return;
        }
        callback(rows);
    });
}

// Function to update pixel board state in the database
function updatePixel(x, y, color) {
    db.run('INSERT OR REPLACE INTO PixelBoard (x, y, color) VALUES (?, ?, ?)', [x, y, color], (err) => {
        if (err) {
            console.error('Error updating pixel:', err);
            return;
        }
        // Notify clients about the updated pixel
        io.emit('updatePixel', { x, y, color });
    });
}

// Serve static files from public directory
app.use(express.static('public'));

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Send current pixel board state to the newly connected client
    getPixelBoardState((state) => {
        socket.emit('initialState', state);
    });

    // Handle pixel update from client
    socket.on('updatePixel', ({ x, y, color }) => {
        updatePixel(x, y, color);
    });

    // Disconnect handling
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
