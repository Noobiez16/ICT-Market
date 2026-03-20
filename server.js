const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Serve all static files from the project directory
app.use(express.static(__dirname));

// Start the server
app.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`Server is running!`);
    console.log(`Access the app at: http://localhost:${PORT}`);
    console.log(`VS Code should now allow you to forward port ${PORT}`);
    console.log(`======================================\n`);
});
