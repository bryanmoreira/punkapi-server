const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const dataPath = path.join(__dirname, 'data');

app.get('/v2/beers', (req, res) => {
  fs.readdir(dataPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to load data' });
    }
    const beers = files.map(file => {
      const filePath = path.join(dataPath, file);
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    });
    res.json(beers);
  });
});

app.get('/v2/beers/:id', (req, res) => {
  const id = req.params.id;
  const filePath = path.join(dataPath, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Beer not found' });
  }
  const beer = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  res.json(beer);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
