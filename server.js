const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Serve the HTML file when visiting the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'ICT_Checklist_Pro.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`Server is running!`);
    console.log(`Access the app at: http://localhost:${PORT}`);
    console.log(`VS Code should now allow you to forward port ${PORT}`);
    console.log(`======================================\n`);
});
