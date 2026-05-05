import { v4 as uuidv4 } from 'uuid'

export function seedDemoData() {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()

  const d = (offsetDays) => {
    const dt = new Date(y, m, today.getDate() + offsetDays)
    return dt.toISOString().split('T')[0]
  }

  // Dipendenti
  const mario   = { id: uuidv4(), nome: 'Mario',    cognome: 'Rossi',     specializzazioni: ['Muratore', 'Caposquadra'], colore: '#3b82f6', dataAssunzione: '2020-01-15' }
  const luigi   = { id: uuidv4(), nome: 'Luigi',    cognome: 'Verdi',     specializzazioni: ['Elettricista'],             colore: '#10b981', dataAssunzione: '2019-06-01' }
  const sara    = { id: uuidv4(), nome: 'Sara',     cognome: 'Bianchi',   specializzazioni: ['Idraulico'],                colore: '#f59e0b', dataAssunzione: '2021-03-10' }
  const marco   = { id: uuidv4(), nome: 'Marco',    cognome: 'Neri',      specializzazioni: ['Carpentiere', 'Ferraiolo'], colore: '#ef4444', dataAssunzione: '2018-09-05' }
  const giulia  = { id: uuidv4(), nome: 'Giulia',   cognome: 'Esposito',  specializzazioni: ['Pavimentista', 'Piastrellista'], colore: '#8b5cf6', dataAssunzione: '2022-02-20' }

  // Macrocategorie per cantiere 1
  const macro1 = [
    { id: uuidv4(), nome: 'Fondazioni',         obbligatoria: true },
    { id: uuidv4(), nome: 'Strutture',          obbligatoria: true },
    { id: uuidv4(), nome: 'Muratura',           obbligatoria: true },
    { id: uuidv4(), nome: 'Impianti Elettrici', obbligatoria: true },
    { id: uuidv4(), nome: 'Impianti Idraulici', obbligatoria: true },
    { id: uuidv4(), nome: 'Finiture Interne',   obbligatoria: true },
  ]

  const macro2 = [
    { id: uuidv4(), nome: 'Demolizioni',        obbligatoria: true },
    { id: uuidv4(), nome: 'Strutture',          obbligatoria: true },
    { id: uuidv4(), nome: 'Impianti Elettrici', obbligatoria: true },
    { id: uuidv4(), nome: 'Pavimentazioni',     obbligatoria: false },
    { id: uuidv4(), nome: 'Tinteggiatura',      obbligatoria: true },
  ]

  const macro3 = [
    { id: uuidv4(), nome: 'Fondazioni',         obbligatoria: true },
    { id: uuidv4(), nome: 'Muratura',           obbligatoria: true },
    { id: uuidv4(), nome: 'Tetto/Copertura',    obbligatoria: true },
    { id: uuidv4(), nome: 'Impianti',           obbligatoria: true },
    { id: uuidv4(), nome: 'Finiture',           obbligatoria: false },
  ]

  // Cantieri
  const c1Id = uuidv4()
  const c2Id = uuidv4()
  const c3Id = uuidv4()
  const c4Id = uuidv4()

  const cantieri = [
    {
      id: c1Id,
      nome: 'Villa Conti — Nuova Costruzione',
      cliente: 'Famiglia Conti',
      dataAccettazione: d(-30),
      importoStimato: 280000,
      stato: 'cantierizzato',
      note: 'Villa unifamiliare 2 piani, zona residenziale. Consegna prevista Q4.',
      macrocategorie: macro1,
      risorsePermesse: [mario.id, marco.id, luigi.id, sara.id],
      dataCreazione: new Date(y, m, today.getDate() - 30).toISOString(),
    },
    {
      id: c2Id,
      nome: 'Uffici Centrale — Ristrutturazione',
      cliente: 'Beta S.r.l.',
      dataAccettazione: d(-15),
      importoStimato: 95000,
      stato: 'cantierizzato',
      note: 'Ristrutturazione uffici 3° piano. Lavori da eseguire in orario non lavorativo.',
      macrocategorie: macro2,
      risorsePermesse: [luigi.id, giulia.id],
      dataCreazione: new Date(y, m, today.getDate() - 15).toISOString(),
    },
    {
      id: c3Id,
      nome: 'Capannone Industriale — Ampliamento',
      cliente: 'Gamma Industrie S.p.A.',
      dataAccettazione: d(-5),
      importoStimato: 420000,
      stato: 'accettato',
      note: 'Ampliamento capannone esistente +800mq. Attesa approvazione progetto.',
      macrocategorie: macro3,
      risorsePermesse: [],
      dataCreazione: new Date(y, m, today.getDate() - 5).toISOString(),
    },
    {
      id: c4Id,
      nome: 'Appartamento Rossi — Ristrutturazione',
      cliente: 'Sig. Rossi Alberto',
      dataAccettazione: d(-60),
      importoStimato: 45000,
      stato: 'completato',
      note: 'Ristrutturazione completa appartamento 80mq.',
      macrocategorie: [
        { id: uuidv4(), nome: 'Demolizioni', obbligatoria: true },
        { id: uuidv4(), nome: 'Impianti',    obbligatoria: true },
        { id: uuidv4(), nome: 'Finiture',    obbligatoria: true },
      ],
      risorsePermesse: [],
      dataCreazione: new Date(y, m, today.getDate() - 60).toISOString(),
    },
  ]

  // Attività Gantt
  const attivita = [
    // Cantiere 1
    { id: uuidv4(), cantiereId: c1Id, nome: 'Getto fondazioni',     dipendentiIds: [mario.id, marco.id], macrocategoriaId: macro1[0].id, dataInizio: d(-10), dataFine: d(-3),  note: '' },
    { id: uuidv4(), cantiereId: c1Id, nome: 'Struttura in c.a.',    dipendentiIds: [marco.id],           macrocategoriaId: macro1[1].id, dataInizio: d(-2),  dataFine: d(8),   note: '' },
    { id: uuidv4(), cantiereId: c1Id, nome: 'Impianto elettrico',   dipendentiIds: [luigi.id],           macrocategoriaId: macro1[3].id, dataInizio: d(5),   dataFine: d(15),  note: '' },
    { id: uuidv4(), cantiereId: c1Id, nome: 'Impianto idraulico',   dipendentiIds: [sara.id],            macrocategoriaId: macro1[4].id, dataInizio: d(3),   dataFine: d(12),  note: '' },
    { id: uuidv4(), cantiereId: c1Id, nome: 'Muratura esterna',     dipendentiIds: [mario.id],           macrocategoriaId: macro1[2].id, dataInizio: d(10),  dataFine: d(22),  note: '' },
    // Cantiere 2
    { id: uuidv4(), cantiereId: c2Id, nome: 'Demolizioni',          dipendentiIds: [luigi.id],           macrocategoriaId: macro2[0].id, dataInizio: d(2),   dataFine: d(6),   note: '' },
    { id: uuidv4(), cantiereId: c2Id, nome: 'Impianto elettrico',   dipendentiIds: [luigi.id],           macrocategoriaId: macro2[2].id, dataInizio: d(7),   dataFine: d(14),  note: '' },
    { id: uuidv4(), cantiereId: c2Id, nome: 'Pavimentazione',       dipendentiIds: [giulia.id],          macrocategoriaId: macro2[3].id, dataInizio: d(12),  dataFine: d(18),  note: '' },
  ]

  const settings = {
    dataInizioGlobale: d(-15),
    dataFineGlobale: d(60),
    nomeAzienda: 'Impresa Edile Demo',
    giorniLavorativi: [1, 2, 3, 4, 5],
    macrocategorieDefault: ['Fondazioni', 'Strutture', 'Muratura', 'Impianti Elettrici', 'Impianti Idraulici', 'Finiture Interne', 'Finiture Esterne', 'Pavimentazioni', 'Serramenti', 'Tetto/Copertura'],
    coloriDipendenti: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#22c55e'],
  }

  return {
    cantieri,
    dipendenti: [mario, luigi, sara, marco, giulia],
    attivita,
    settings,
    actionLog: [
      { id: uuidv4(), timestamp: new Date().toISOString(), tipo: 'IMPORT', descrizione: 'Dati demo caricati', payload: null }
    ],
  }
}
