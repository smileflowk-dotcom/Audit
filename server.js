const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── GOOGLE SHEETS AUTH ──
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = 'Réponses';

// ── INIT HEADERS ──
async function initSheet() {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const headers = [[
      'Date',
      'Prénom',
      'Nom',
      'Email',
      'Profil',
      'Ancienneté',
      'CA Mensuel',
      'Problème Principal',
      'Déjà Essayé',
      'Ressenti (multi)',
      'Émotion Dominante',
      'État en un mot',
      'Outils en place',
      'Trafic',
      'Résultat dans 6 mois',
      'Vraie Raison',
      'Qualification',
    ]];
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: headers },
    });
    console.log('✅ Headers initialisés');
  } catch (err) {
    console.log('Headers déjà en place ou erreur:', err.message);
  }
}

// ── SAVE RESPONSES ──
app.post('/api/submit', async (req, res) => {
  try {
    const data = req.body;
    const sheets = google.sheets({ version: 'v4', auth });

    const row = [[
      new Date().toLocaleString('fr-FR'),
      data.prenom || '',
      data.nom || '',
      data.email || '',
      data.profil || '',
      data.anciennete || '',
      data.ca || '',
      data.probleme || '',
      data['deja-essaye'] || '',
      Array.isArray(data.ressenti) ? data.ressenti.join(', ') : (data.ressenti || ''),
      data.emotion || '',
      data['mot-etat'] || '',
      Array.isArray(data.outils) ? data.outils.join(', ') : (data.outils || ''),
      data.trafic || '',
      data['resultat-6mois'] || '',
      data['vraie-raison'] || '',
      data.qualification || '',
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: row },
    });

    console.log(`✅ Nouvelle réponse enregistrée — ${data.prenom} ${data.nom} (${data.email})`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erreur enregistrement:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── START ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  await initSheet();
});
