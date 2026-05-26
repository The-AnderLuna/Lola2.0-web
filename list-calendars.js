const { google } = require('googleapis');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  return acc;
}, {});

async function listCalendars() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.calendarList.list();
    console.log("Calendarios accesibles por la Service Account:");
    res.data.items?.forEach(cal => {
      console.log(`- Nombre: ${cal.summary}`);
      console.log(`  ID: ${cal.id}`);
    });
  } catch (e) {
    console.error(e);
  }
}

listCalendars();
