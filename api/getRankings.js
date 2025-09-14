// Vercel Serverless Function
const { google } = require('googleapis');

const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for production
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Accept, Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        const sheetId = process.env.GOOGLE_SHEET_ID;

        if (!credentials || !sheetId) {
            return res.status(500).json({ success: false, error: 'Server configuration error.' });
        }
        
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Result2!B2:E', // PlayerID, PlayerName, Persona, MyTotalScore
        });
        
        const rows = response.data.values || [];
        const playerScores = new Map();

        rows.forEach(row => {
            const name = row[1]; // PlayerName
            const score = parseFloat(row[3]); // MyTotalScore
            if (name && !isNaN(score)) {
                if (!playerScores.has(name) || playerScores.get(name).score < score) {
                    playerScores.set(name, { name, score });
                }
            }
        });

        const sortedRanking = Array.from(playerScores.values())
            .sort((a, b) => b.score - a.score);
            
        res.status(200).json({ success: true, data: sortedRanking.slice(0, 5) });

    } catch (error) {
        console.error('Error fetching rankings:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}

module.exports = allowCors(handler);
