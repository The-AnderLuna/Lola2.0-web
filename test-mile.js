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
    
    // Solo probar el de Milé para esta semana
    const calId = env.GOOGLE_CALENDAR_MILE;
    
    console.log(`\n📅 Probando acceso al calendario de MILÉ: ${calId}`);
    try {
      const res = await calendar.events.list({
        calendarId: calId,
        timeMin: '2026-05-11T00:00:00-05:00', // Lunes 11 de Mayo
        timeMax: '2026-05-17T23:59:59-05:00', // Domingo 17 de Mayo
        singleEvents: true,
        orderBy: 'startTime',
      });
      const events = res.data.items || [];
      if (events.length === 0) {
        console.log('✅ Acceso concedido, pero no hay eventos esta semana.');
      } else {
        console.log(`✅ ¡Acceso concedido! Se encontraron ${events.length} eventos esta semana:\n`);
        events.forEach((event, i) => {
          const start = new Date(event.start.dateTime || event.start.date);
          const end = new Date(event.end.dateTime || event.end.date);
          
          const opcionesDia = { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/Bogota' };
          const opcionesHora = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' };
          
          const diaStr = start.toLocaleDateString('es-CO', opcionesDia);
          const horaInicio = start.toLocaleTimeString('es-CO', opcionesHora);
          const horaFin = end.toLocaleTimeString('es-CO', opcionesHora);
          
          const transparency = event.transparency === 'transparent' ? 'Libre' : 'Ocupado';
          
          console.log(`${i+1}. [${diaStr}] de ${horaInicio} a ${horaFin} | ${event.summary} (${transparency})`);
        });
      }
    } catch (err) {
      console.error(`❌ ERROR: No se pudo leer el calendario. Google dice: "${err.message}"`);
      console.log('💡 Consejo: Revisa que el ID sea correcto y que hayas compartido el calendario con el bot con permisos de "Ver todos los detalles".');
    }
    
  } catch (e) {
    console.error('Error de autenticación inicial:', e);
  }
}

listEvents();
