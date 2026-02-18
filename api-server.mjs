/**
 * Standalone API server for development.
 * Run this alongside `ng serve` to have API routes available.
 *
 * Usage: node api-server.mjs
 */
import 'dotenv/config';
import express from 'express';

const PROKERALA_CLIENT_ID = process.env['PROKERALA_CLIENT_ID'] || '';
const PROKERALA_CLIENT_SECRET = process.env['PROKERALA_CLIENT_SECRET'] || '';
const OPENROUTER_API_KEY = process.env['OPENROUTER_API_KEY'] || '';

let tokenCache = null;

async function getAccessToken() {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.accessToken;
  }
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', PROKERALA_CLIENT_ID);
  params.append('client_secret', PROKERALA_CLIENT_SECRET);

  const res = await fetch('https://api.prokerala.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`Token fetch failed: ${res.status}`);
  }

  const data = await res.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.accessToken;
}

const app = express();
app.use(express.json());

// Helper function for timestamp logging
function logWithTimestamp(category, message, ...args) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${category}]`, message, ...args);
}

// Horoscope proxy
app.get('/api/horoscope', async (req, res) => {
  const userName = req.query.userName || 'Unknown User';
  logWithTimestamp('Horoscope', `Request for sign: ${req.query.sign}, User: ${userName}`);

  if (!PROKERALA_CLIENT_ID || !PROKERALA_CLIENT_SECRET) {
    logWithTimestamp('Horoscope', 'ERROR: Credentials not set');
    return res.status(500).json({ error: 'Prokerala credentials not set.' });
  }

  const sign = String(req.query.sign || '').toLowerCase();
  if (!sign) {
    return res.status(400).json({ error: 'Missing "sign" parameter.' });
  }

  try {
    logWithTimestamp('Horoscope', 'Fetching access token...');
    const token = await getAccessToken();
    logWithTimestamp('Horoscope', 'Token obtained, calling Prokerala API...');
    const datetime = new Date().toISOString();
    const apiRes = await fetch(
      `https://api.prokerala.com/v2/horoscope/daily?sign=${encodeURIComponent(
        sign
      )}&datetime=${encodeURIComponent(datetime)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    logWithTimestamp('Horoscope', 'Prokerala response status:', apiRes.status);

    if (!apiRes.ok) {
      const text = await apiRes.text();
      logWithTimestamp('Horoscope', 'ERROR:', text);
      return res.status(apiRes.status).json({ error: 'Prokerala API error', detail: text });
    }

    const data = await apiRes.json();
    logWithTimestamp(
      'Horoscope',
      `Success! Sign: ${data?.data?.daily_prediction?.sign_name}, User: ${userName}`
    );
    res.json(data);
  } catch (err) {
    logWithTimestamp('Horoscope', 'Proxy error:', err);
    res.status(500).json({ error: 'Failed to fetch horoscope.' });
  }
});

// Traits insight proxy
app.post('/api/traits-insight', async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OpenRouter API key not set.' });
  }

  const { name, sign, traits, horoscopeText, dateString } = req.body || {};
  if (!name || !sign || !traits || !Array.isArray(traits)) {
    return res.status(400).json({ error: 'Missing name/sign/traits.' });
  }

  const today = new Date().toISOString().split('T')[0];
  const prompt = `Kreiraj personaliziranu, toplu poruku za studenta. Piši na bosanskom jeziku, maksimalno 3-4 rečenice.

**Podaci:**
- Ime: ${name}
- Horoskopski znak: ${sign}
- Odabrana osobina: ${traits.join(', ')}
- Datum: ${today}
- Rođendan: ${dateString || 'nepoznato'}
- Dnevni horoskop: ${horoscopeText || 'nije dostupan'}

**Upute:**
1. Započni direktno, bez "Naravno", "Evo", "Dragi" i sličnih uvoda.
2. Poveži odabranu osobinu sa nečim konkretnim iz života studenta (ispit, projekat, prijateljstvo, kreativnost).
3. Uključi jednu zanimljivost: poznatu ličnost istog znaka, historijski događaj na današnji datum, ili pop-kulturnu referencu.
4. Završi motivaciono ili sa blagim humorom.
5. Ton: prijateljski, duhovit, konkretan. Izbjegavaj ezoteričan žargon.`;

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:4000',
        'X-Title': 'wp-2',
      },
      body: JSON.stringify({
        model: 'xiaomi/mimo-v2-flash:free',
        messages: [
          {
            role: 'system',
            content:
              'Ti si prijateljski astrološki asistent koji piše kratke, duhovite i personalizirane poruke za studente.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: 'OpenRouter API error', detail: text });
    }

    const data = await resp.json();
    const insight = data?.choices?.[0]?.message?.content || 'Nema uvida.';
    res.json({ insight });
  } catch (err) {
    console.error('Traits insight error:', err);
    res.status(500).json({ error: 'Failed to generate insight.' });
  }
});

// Quiz generation endpoint for Fun Zone
app.post('/api/quiz/generate', async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OpenRouter API key not set.' });
  }

  const { topics, difficulty, numberOfQuestions, language } = req.body || {};

  if (!topics || !Array.isArray(topics) || topics.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid topics.' });
  }

  const difficultyDescription = {
    easy: 'jednostavna, osnovna razina znanja',
    medium: 'srednje teška, zahtijeva razumijevanje koncepata',
    hard: 'teška, zahtijeva duboko razumijevanje i primjenu znanja',
  };

  const topicsList = topics.join(', ');
  const langInstruction =
    language === 'bs' ? 'Koristi bosanski/hrvatski/srpski jezik.' : 'Use English language.';

  const prompt = `Kreiraj kviz sa ${numberOfQuestions || 5} pitanja na temu: ${topicsList}.
    
Težina: ${difficultyDescription[difficulty] || difficultyDescription.medium}
${langInstruction}

Pravila:
1. Svako pitanje mora imati 3-4 ponuđena odgovora
2. Pitanja mogu biti tipa "radio" (jedan tačan odgovor) ili "checkbox" (više tačnih odgovora)
3. Checkbox pitanja trebaju imati 2-3 tačna odgovora od 4 ponuđena
4. Pitanja trebaju biti raznovrsna i edukativna

Odgovori ISKLJUČIVO u JSON formatu (bez markdown oznaka, bez objašnjenja):
{
  "questions": [
    {
      "id": "q1",
      "text": "Tekst pitanja?",
      "type": "radio",
      "answers": [
        {"label": "Odgovor A", "value": "a"},
        {"label": "Odgovor B", "value": "b"},
        {"label": "Odgovor C", "value": "c"}
      ],
      "correct": ["a"]
    }
  ]
}`;

  try {
    logWithTimestamp('Quiz', `Generating ${numberOfQuestions} questions for: ${topicsList}`);

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:4000',
        'X-Title': 'IPI Akademija Student Fun Zone',
      },
      body: JSON.stringify({
        model: 'xiaomi/mimo-v2-flash:free', // Free model on OpenRouter
        messages: [
          {
            role: 'system',
            content:
              'Ti si asistent za kreiranje edukativnih kvizova. Uvijek odgovaraš isključivo u JSON formatu bez dodatnog teksta.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      logWithTimestamp('Quiz', 'OpenRouter API error:', text);
      return res.status(resp.status).json({ error: 'OpenRouter API error', detail: text });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    logWithTimestamp('Quiz', 'Successfully generated quiz');
    res.json({ content });
  } catch (err) {
    logWithTimestamp('Quiz', 'Error:', err);
    res.status(500).json({ error: 'Failed to generate quiz.' });
  }
});

// Translate endpoint (MyMemory - FREE, no API key needed)
app.post('/api/translate', async (req, res) => {
  const { text, targetLang } = req.body || {};
  if (!text || !targetLang) {
    return res.status(400).json({ error: 'Missing text or targetLang.' });
  }

  // MyMemory API has 500 character limit per request
  const maxChars = 500;
  let textToTranslate = text;
  if (textToTranslate.length > maxChars) {
    logWithTimestamp(
      'Translate',
      `Text exceeds ${maxChars} chars (${textToTranslate.length}), truncating...`
    );
    textToTranslate = textToTranslate.substring(0, maxChars - 3) + '...';
  }

  try {
    logWithTimestamp('Translate', `Translating to ${targetLang}...`);
    const langPair = `en|${targetLang === 'bs' ? 'bs' : targetLang}`;
    const resp = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        textToTranslate
      )}&langpair=${langPair}`
    );

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const translatedText = data?.responseData?.translatedText || textToTranslate;
    logWithTimestamp('Translate', `Success! Length: ${translatedText.length}`);
    res.json({ translatedText });
  } catch (err) {
    logWithTimestamp('Translate', 'Error:', err);
    res.status(500).json({ error: 'Failed to translate.' });
  }
});

// AI Health Insight endpoint
app.post('/api/ai-insight', async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OpenRouter API key not set.' });
  }

  const {
    userName,
    userGender,
    dateOfBirth,
    city,
    trackerSummaries,
    healthMetrics,
    weather,
    airQuality,
    currentDate,
    dayOfWeek,
  } = req.body || {};

  if (!userName) {
    return res.status(400).json({ error: 'Missing user data.' });
  }

  // Build comprehensive prompt for AI
  const trackerInfo = trackerSummaries?.length
    ? trackerSummaries
        .map(
          (t) =>
            `- ${t.trackerIcon} ${t.trackerName}: ${t.entriesLast7Days}/7 dana ispunjeno (${
              t.completionRate
            }%), trend: ${
              t.trend === 'up' ? '📈 raste' : t.trend === 'down' ? '📉 pada' : '➡️ stabilan'
            }`
        )
        .join('\n')
    : 'Korisnik još nije aktivirao praćenje.';

  const metricsInfo = healthMetrics
    ? `
- Prosječan san: ${
        healthMetrics.sleepAverage > 0
          ? healthMetrics.sleepAverage.toFixed(1) + ' sati'
          : 'nema podataka'
      }
- Kvaliteta sna: ${
        healthMetrics.sleepQualityAverage > 0
          ? healthMetrics.sleepQualityAverage.toFixed(1) + '/5'
          : 'nema podataka'
      }
- Prosječno raspoloženje: ${
        healthMetrics.moodAverage > 0
          ? healthMetrics.moodAverage.toFixed(1) + '/5'
          : 'nema podataka'
      }
- Prosječan stres: ${
        healthMetrics.stressAverage > 0
          ? healthMetrics.stressAverage.toFixed(1) + '/5'
          : 'nema podataka'
      }
- Prosječna energija: ${
        healthMetrics.energyAverage > 0
          ? healthMetrics.energyAverage.toFixed(1) + '/5'
          : 'nema podataka'
      }
- Prosječan unos vode: ${
        healthMetrics.waterIntakeAverage > 0
          ? healthMetrics.waterIntakeAverage.toFixed(1) + ' čaša'
          : 'nema podataka'
      }
- Fitness sesija (7 dana): ${healthMetrics.fitnessSessionsCount}, ukupno ${
        healthMetrics.fitnessMinutesTotal
      } minuta
- Vrijeme učenja (7 dana): ${healthMetrics.studyMinutesTotal} minuta
- Prosječno vrijeme ekrana: ${
        healthMetrics.screenTimeAverage > 0
          ? Math.round(healthMetrics.screenTimeAverage) + ' minuta'
          : 'nema podataka'
      }`
    : 'Nema dostupnih metrika.';

  const weatherInfo = weather
    ? `Vrijeme u ${city}: ${weather.description}, ${weather.temperature}°C (osjeća se kao ${weather.feelsLike}°C), vlažnost ${weather.humidity}%, vjetar ${weather.windSpeed} km/h, UV indeks ${weather.uvIndex}`
    : 'Podaci o vremenu nisu dostupni.';

  const airQualityInfo = airQuality
    ? `Kvaliteta zraka: ${airQuality.level} (US AQI: ${airQuality.usAqi}), PM2.5: ${airQuality.pm25} μg/m³, PM10: ${airQuality.pm10} μg/m³`
    : 'Podaci o kvaliteti zraka nisu dostupni.';

  const prompt = `Kreiraj personaliziranu AI analizu zdravlja i wellness-a za studenta. Piši na bosanskom jeziku.
VAŽNO: Korisnik je ${
    userGender === 'zensko' ? 'ženskog' : 'muškog'
  } spola - koristi odgovarajuće gramatičke oblike (npr. "uradila si" umjesto "uradio si" za žene).

**Podaci o korisniku:**
- Ime: ${userName}
- Spol: ${userGender === 'zensko' ? 'Žensko' : 'Muško'}
- Datum rođenja: ${dateOfBirth || 'nepoznato'}
- Grad: ${city}
- Datum: ${currentDate}
- Dan u tjednu: ${dayOfWeek}

**Aktivni trackeri (posljednjih 7 dana):**
${trackerInfo}

**Metrike:**
${metricsInfo}

**Vremenski uvjeti:**
${weatherInfo}

**Kvaliteta zraka:**
${airQualityInfo}

**Zadatak:**
Napiši personaliziranu, opširnu ali preglednu analizu koja uključuje:

1. **Kratak sažetak** (2-3 rečenice) - općeniti uvid u trenutno stanje i napredak studenta
2. **Analiza sna** - ako postoje podaci, komentiraj kvalitetu i trajanje sna
3. **Raspoloženje i energija** - ako postoje podaci, komentiraj trend i daj savjete
4. **Fizička aktivnost** - preporuka za danas (uzmi u obzir vrijeme i kvalitetu zraka!)
5. **Hidratacija** - komentar o unosu vode
6. **Produktivnost** - ako postoje podaci o učenju/zadacima
7. **Top 3 preporuke** - konkretne, akcione preporuke za danas

Ton: prijateljski, motivirajući, konkretan. Koristi emoji za vizualnu privlačnost.
Fokusiraj se na ono što korisnik MOŽE poboljšati, ne kritiziraj previše.

Odgovori u formatu čistog teksta (ne JSON), sa jasnim sekcijama označenim emoji ikonama.
VAŽNO: Nemoj koristiti horizontalne linije (---) između sekcija.`;

  try {
    logWithTimestamp('AI Insight', `Generating insight for ${userName} in ${city}`);
    logWithTimestamp('AI Insight', '=== PROMPT START ===');
    console.log(prompt);
    logWithTimestamp('AI Insight', '=== PROMPT END ===');

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:4000',
        'X-Title': 'IPI Akademija Health Insight',
      },
      body: JSON.stringify({
        model: 'xiaomi/mimo-v2-flash:free',
        messages: [
          {
            role: 'system',
            content:
              'Ti si AI personalni savjetnik koji daje personalizirane savjete studentima na bosanskom jeziku. Tvoji savjeti su praktični, motivirajući i zasnovani na podacima.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      logWithTimestamp('AI Insight', 'OpenRouter API error:', text);
      return res.status(resp.status).json({ error: 'OpenRouter API error', detail: text });
    }

    const data = await resp.json();
    const insight = data?.choices?.[0]?.message?.content || 'AI analiza nije dostupna.';

    logWithTimestamp(
      'AI Insight',
      `Successfully generated insight for ${userName} (${insight.length} chars)`
    );
    res.json({ insight });
  } catch (err) {
    logWithTimestamp('AI Insight', 'Error:', err);
    res.status(500).json({ error: 'Failed to generate AI insight.' });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  logWithTimestamp('Server', `API server running on http://localhost:${PORT}`);
});
