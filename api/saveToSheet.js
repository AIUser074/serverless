// Vercel Serverless Function
const { google } = require('googleapis');

// CORS 헤더를 설정하는 헬퍼 함수
const allowCors = fn => async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // 프로덕션에서는 특정 도메인으로 제한하세요.
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    return await fn(req, res);
};

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Vercel 환경 변수에서 서비스 계정 키 파싱
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        const sheetId = process.env.GOOGLE_SHEET_ID;

        if (!credentials || !sheetId) {
            return res.status(500).json({ error: 'Server configuration error.' });
        }
        
        // 2. Google Sheets API 클라이언트 인증
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // 3. 클라이언트로부터 받은 데이터
        const { gameData } = req.body;
        
        // 4. Result 시트에 저장할 상세 데이터 준비
        const sheetNameResult = 'Result';
        const resultRows = gameData.resultRows;
        const resultHeader = ['Timestamp', 'PlayerID', 'PlayerName', 'Persona', 'Round', 'MyInvestment', 'OpponentInvestment', 'MyRoundScore', 'OpponentRoundScore', 'MyTotalScore', 'OpponentTotalScore'];
        
        // 5. Result2 시트에 저장할 요약 데이터 준비
        const sheetNameResult2 = 'Result2';
        const summaryRow = gameData.summaryRow;
        const summaryHeader = ['Timestamp', 'PlayerID', 'PlayerName', 'Persona', 'MyTotalScore', 'OpponentTotalScore', 'MyRoundScores', 'OpponentRoundScores'];

        // 6. 각 시트에 데이터 추가 (헤더 존재 여부 확인 후)
        // Result 시트
        const existingDataResult = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetNameResult}!A1:A1`,
        });
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: sheetNameResult,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: existingDataResult.data.values ? resultRows : [resultHeader, ...resultRows]
            },
        });

        // Result2 시트
        const existingDataResult2 = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetNameResult2}!A1:A1`,
        });
        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: sheetNameResult2,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: existingDataResult2.data.values ? [summaryRow] : [summaryHeader, summaryRow]
            },
        });

        res.status(200).json({ success: true, message: 'Data saved successfully.' });

    } catch (error) {
        console.error('Error saving data to Google Sheets:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
    }
}

module.exports = allowCors(handler);
