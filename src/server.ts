import 'dotenv/config';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import type { Request, Response } from 'express';

// Prokerala OAuth client credentials (server-side only). Loaded from env to avoid leaking secrets.
const PROKERALA_CLIENT_ID = process.env['PROKERALA_CLIENT_ID'] || '';
const PROKERALA_CLIENT_SECRET = process.env['PROKERALA_CLIENT_SECRET'] || '';
const OPENROUTER_API_KEY = process.env['OPENROUTER_API_KEY'] || '';

// Simple in-memory token cache
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

/**
 * API: Dnevni horoskop proxy (client_credentials OAuth)
 */
app.get('/api/horoscope', async (req: Request, res: Response) => {
  if (!PROKERALA_CLIENT_ID || !PROKERALA_CLIENT_SECRET) {
    res.status(500).json({ error: 'Prokerala kredencijali nisu postavljeni na serveru.' });
    return;
  }

  const sign = String(req.query['sign'] || '').toLowerCase();
  if (!sign) {
    res.status(400).json({ error: 'Parametar "sign" je obavezan (npr. aries, taurus...)' });
    return;
  }

  try {
    const token = await getAccessToken();
    const datetime = new Date().toISOString();
    const apiRes = await fetch(
      `https://api.prokerala.com/v2/horoscope/daily?sign=${encodeURIComponent(
        sign
      )}&datetime=${encodeURIComponent(datetime)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!apiRes.ok) {
      const text = await apiRes.text();
      res.status(apiRes.status).json({ error: 'Prokerala API error', detail: text });
      return;
    }

    const data = await apiRes.json();
    res.json(data);
  } catch (err: any) {
    console.error('Horoscope proxy error:', err);
    res.status(500).json({ error: 'Greška pri dohvaćanju horoskopa' });
  }
});

/**
 * API: Trait insight via OpenRouter (xiaomi/mimo-v2-flash:free)
 */
app.post('/api/traits-insight', async (req: Request, res: Response) => {
  if (!OPENROUTER_API_KEY) {
    res.status(500).json({ error: 'OpenRouter API ključ nije postavljen.' });
    return;
  }

  const { name, sign, traits, horoscopeText, dateString } = req.body || {};
  if (!name || !sign || !traits || !Array.isArray(traits)) {
    res.status(400).json({ error: 'Nedostaju parametri name/sign/traits.' });
    return;
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
5. Ton: prijateljski, duhovit, konkretan. Izbjegavaj ezoteričan žargon.

Primjer formata:
"Tvoja [osobina] danas može biti ključ za [konkretna situacija]. Zanimljivo, [poznata osoba] dijeli tvoj znak i upravo je ta osobina njoj/njemu donijela [uspjeh]. Iskoristi dan!"`;

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:4000',
        'X-Title': 'wp-2',
        // Optional attribution headers omitted
      },
      body: JSON.stringify({
        model: 'xiaomi/mimo-v2-flash:free',
        messages: [
          {
            role: 'system',
            content:
              'Budi topao, sažet, piši na bosanskom. Odgovor treba biti samo jedan pasus bez uvoda poput "naravno" ili "evo".',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 220,
        temperature: 0.9,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('OpenRouter API error:', resp.status, text);
      res.status(resp.status).json({ error: 'OpenRouter API error', detail: text });
      return;
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || '';
    res.json({ content });
  } catch (err: any) {
    console.error('Traits insight error:', err);
    res.status(500).json({ error: 'Greška pri pozivu OpenRouter API-ja.', detail: String(err) });
  }
});

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 15_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: PROKERALA_CLIENT_ID,
    client_secret: PROKERALA_CLIENT_SECRET,
  });

  const resp = await fetch('https://api.prokerala.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token fetch failed: ${resp.status} ${text}`);
  }

  const json = (await resp.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 30) * 1000,
  };
  return tokenCache.accessToken;
}

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
