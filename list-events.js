const { google } = require('googleapis');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
  return acc;
}, {});

async function listEvents() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    
    const calendars = [env.GOOGLE_CALENDAR_MILE, env.GOOGLE_CALENDAR_STAFF];
    
    for (const calId of calendars) {
      if (!calId) continue;
      console.log(`\nEventos para el calendario: ${calId}`);
      try {
        const res = await calendar.events.list({
          calendarId: calId,
          timeMin: '2026-05-14T00:00:00-05:00',
          timeMax: '2026-05-14T23:59:59-05:00',
          singleEvents: true,
          orderBy: 'startTime',
        });
        const events = res.data.items || [];
        if (events.length === 0) {
          console.log('No events found.');
        } else {
          events.forEach((event, i) => {
            const start = event.start.dateTime || event.start.date;
            const end = event.end.dateTime || event.end.date;
            // Verificar si es busy o free
            const transparency = event.transparency === 'transparent' ? 'Libre (Free)' : 'Ocupado (Busy)';
            console.log(`${i+1}. ${event.summary} (${start} - ${end}) [${transparency}]`);
          });
        }
      } catch (err) {
        console.error(`Error reading ${calId}:`, err.message);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

listEvents();
