# Programmazione Risorse Cantieri

App web per la gestione e allocazione delle risorse nei cantieri edilizi.  
Completamente client-side · Dati sincronizzati su **Supabase** · Deploy su **Vercel**

---

## Setup rapido (Supabase + Vercel)

### 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) → **New project**
2. Scegli nome, password e regione (es. `eu-central-1`)
3. Apri **SQL Editor** e incolla questo codice, poi clicca **Run**:

```sql
CREATE TABLE IF NOT EXISTS app_state (
  id         INTEGER PRIMARY KEY DEFAULT 1,
  data       JSONB   NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_state (id, data)
VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon"
  ON app_state FOR ALL
  USING (true)
  WITH CHECK (true);
```

4. Vai su **Settings → API** e copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

---

### 2. Deploy su Vercel

1. Vai su [vercel.com](https://vercel.com) → **Add New → Project**
2. Importa il repository GitHub `programmazionerisorse`
3. Nella sezione **Environment Variables** aggiungi:

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJ...` |

4. Clicca **Deploy** — Vercel farà automaticamente `npm run build`

Ogni push su `main` rideploya automaticamente.

---

## Sviluppo locale

```bash
git clone https://github.com/TUO_USERNAME/programmazionerisorse.git
cd programmazionerisorse
npm install

# Crea il file con le credenziali Supabase
cp .env.example .env.local
# Modifica .env.local con i tuoi valori

npm run dev
# → http://localhost:5173/
```

> **Senza Supabase**: l'app funziona comunque usando solo `localStorage`.  
> Basta non impostare le variabili d'ambiente e l'indicatore in sidebar mostrerà "Locale (no cloud)".

---

## Come funziona la sincronizzazione

```
Modifica utente
     │
     ▼
Aggiornamento immediato (localStorage)  ← UI istantanea
     │
     ▼
Debounce 800ms
     │
     ▼
Supabase upsert (JSONB blob) ──► Sync riuscito → indicatore verde
                               └► Errore → indicatore rosso
```

**Accesso multi-computer**: ogni device carica i dati da Supabase all'avvio e salva automaticamente ad ogni modifica. Non serve azione manuale.

---

## Utilizzo

### Flusso tipico

1. **Admin → Dipendenti** → aggiungi i lavoratori con colore e specializzazioni
2. **Non Cantierizzati** → `+ Nuovo Cantiere` → inserisci nome, cliente, importo
3. **Cantierizza** → clicca 🏗️ sul cantiere per spostarlo al Gantt
4. **Gantt** → trascina sulle righe per creare attività, assegna risorse
5. **Cantierizzati** → quando pronto, clicca ✅ Completa

### Gantt interattivo

| Azione | Come |
|--------|------|
| Creare attività | Trascina sull'area vuota della riga |
| Spostare attività | Trascina la barra colorata |
| Ridimensionare | Trascina il bordo destro della barra |
| Modificare/eliminare | Clicca sulla barra |
| Filtrare | Usa i dropdown in alto per cantiere o dipendente |

### Keyboard shortcuts

| Tasto | Azione |
|-------|--------|
| `Ctrl/⌘ + Z` | Annulla (50 livelli) |
| `Ctrl/⌘ + Y` | Ripristina |
| `Esc` | Chiudi modal |

---

## Struttura progetto

```
src/
├── context/AppContext.jsx      # State + undo/redo + sync orchestration
├── utils/
│   ├── supabase.js             # Client Supabase + load/save
│   ├── storage.js              # localStorage fallback
│   ├── conflicts.js            # Conflict detection
│   ├── export.js               # PDF/PNG
│   ├── dateUtils.js            # Utility date
│   └── demoData.js             # Dati demo iniziali
├── components/
│   ├── layout/                 # Sidebar (con sync indicator), Layout
│   ├── gantt/                  # GanttChart, ActivityModal, ExportPanel
│   ├── cantieri/               # Accettati, Cantierizzati, Completati, Form
│   ├── admin/                  # AdminPanel, Dipendenti, Cronologia, Stats
│   └── common/                 # Modal, Badge
└── App.jsx
```

---

## Stack

- **React 18** + Hooks
- **Vite** — build tool
- **Tailwind CSS** — styling
- **Supabase** — database cloud (JSONB blob sync)
- **date-fns** — date manipulation
- **jsPDF** + **html2canvas** — export PDF/PNG
- **react-hot-toast** — notifiche
- **uuid** — ID generation
- **Vercel** — hosting + CI/CD

---

## Roadmap futura

- [ ] Auth Supabase (login email/password per proteggere i dati)
- [ ] Realtime multi-device sync via Supabase Realtime
- [ ] Notifiche push per conflitti
- [ ] App mobile (PWA)
- [ ] Integrazione fatturazione
