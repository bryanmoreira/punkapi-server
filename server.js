const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'banco.sqlite');
const dataPath = path.join(__dirname, 'data');

// Função para migrar os dados da pasta 'data' para o banco de dados SQLite
function migrateDataToSQLite() {
  const db = new sqlite3.Database(dbPath);

  db.run('DROP TABLE IF EXISTS beers');

  // Crie a tabela 'beers' se ela não existir
  db.run(`CREATE TABLE IF NOT EXISTS beers (
    id INTEGER PRIMARY KEY,
    name TEXT,
    tagline TEXT,
    first_brewed TEXT,
    description TEXT,
    image_url TEXT,
    abv REAL,
    ibu INTEGER,
    target_fg INTEGER,
    target_og INTEGER,
    ebc INTEGER,
    srm REAL,
    ph REAL,
    attenuation_level INTEGER,
    volume_value REAL,
    volume_unit TEXT,
    boil_volume_value REAL,
    boil_volume_unit TEXT,
    mash_temp_temp_value REAL,
    mash_temp_temp_unit TEXT,
    mash_temp_duration INTEGER,
    fermentation_temp_value REAL,
    fermentation_temp_unit TEXT,
    malt TEXT,
    food_pairing TEXT,
    brewers_tips TEXT,
    contributed_by TEXT
  )`, (err) => {
    if (err) {
      console.error('Failed to create table beers:', err);
      db.close();
      return;
    }

    fs.readdir(dataPath, (err, files) => {
      if (err) {
        console.error('Failed to read directory:', err);
        db.close();
        return;
      }

      let remainingFiles = files.length;

      files.forEach(file => {
        const filePath = path.join(dataPath, file);
        const beerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Insira os dados da cerveja no banco de dados SQLite
        db.run(`INSERT INTO beers 
                (id, name, tagline, first_brewed, description, image_url, abv, ibu, target_fg, target_og, 
                 ebc, srm, ph, attenuation_level, volume_value, volume_unit, boil_volume_value, boil_volume_unit, 
                 mash_temp_temp_value, mash_temp_temp_unit, mash_temp_duration, fermentation_temp_value, 
                 fermentation_temp_unit, malt, food_pairing, brewers_tips, contributed_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [beerData.id, beerData.name, beerData.tagline, beerData.first_brewed, beerData.description, beerData.image_url, 
           beerData.abv, beerData.ibu, beerData.target_fg, beerData.target_og, beerData.ebc, beerData.srm, beerData.ph, 
           beerData.attenuation_level, beerData.volume.value, beerData.volume.unit, beerData.boil_volume.value, 
           beerData.boil_volume.unit, beerData.method.mash_temp[0].temp.value, beerData.method.mash_temp[0].temp.unit, 
           beerData.method.mash_temp[0].duration, beerData.method.fermentation.temp.value, beerData.method.fermentation.temp.unit, 
           beerData.ingredients.malt[0]?.name, beerData.food_pairing[0], beerData.brewers_tips, beerData.contributed_by], 
          (err) => {
            if (err) {
              console.error('Failed to insert beer into database:', err);
            } else {
              console.log('Beer inserted into database:', beerData.name);
            }
            remainingFiles--;

            if (remainingFiles === 0) {
              db.close();
            }
          }
        );
      });
    });
  });
}

// Inicie a migração dos dados quando o script for executado
migrateDataToSQLite();

// Configuração das rotas do servidor Express para buscar dados do banco de dados SQLite
app.get('/v2/beers', (req, res) => {
  const db = new sqlite3.Database(dbPath);

  const { malt, food, name, ibu } = req.query;

  let baseSQL = 'SELECT * FROM beers';
  const conditions = [];
  const params = [];

  if (malt) {
    conditions.push('malt LIKE ?');
    params.push(`%${malt}%`);
  }
  if (food) {
    conditions.push('food_pairing LIKE ?');
    params.push(`%${food}%`);
  }
  if (name) {
    conditions.push('name LIKE ?');
    params.push(`%${name}%`);
  }
  if (ibu) {
    conditions.push('ibu = ?');
    params.push(ibu);
  }

  if (conditions.length > 0) {
    baseSQL += ' WHERE ' + conditions.join(' AND ');
  }

  console.log('SQL Query:', baseSQL);  // Log the SQL query
  console.log('Parameters:', params);  // Log the parameters

  db.all(baseSQL, params, (err, rows) => {
    if (err) {
      console.error('Erro ao buscar cervejas no banco de dados:', err.message);
      res.status(500).json({ error: 'Erro ao buscar cervejas' });
    } else {
      res.json(rows);
    }

    db.close();
  });
});

app.get('/v2/beers/:id', (req, res) => {
  const beerId = req.params.id;

  const db = new sqlite3.Database(dbPath);

  const selectBeerSQL = `SELECT * FROM beers WHERE id = ?`;

  db.get(selectBeerSQL, [beerId], (err, row) => {
    if (err) {
      console.error('Erro ao buscar cerveja no banco de dados:', err.message);
      res.status(500).json({ error: 'Erro ao buscar cerveja' });
    } else if (!row) {
      console.error('Cerveja não encontrada');
      res.status(404).json({ error: 'Cerveja não encontrada' });
    } else {
      res.json(row);
    }

    db.close();
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
