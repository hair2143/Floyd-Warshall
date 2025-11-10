const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Simple request logging middleware so requests show up in the terminal
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.url}`);
  next();
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Example API route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from localhost' });
});

// Fallback for unknown routes (optional)
app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
