import { useState, useEffect, useRef } from "react";

// ─── Design tokens (variables CSS → thème clair / sombre) ────────
// Palette « Sable / Terre cuite ». Les noms de variables sont inchangés
// depuis la version précédente : seules les valeurs évoluent, de sorte
// que les milliers de sites d'appel existants restent valides.
const BG    = "var(--cg-bg)";
const SURF  = "var(--cg-surf)";
const CARD  = "var(--cg-card)";
const PANEL = "var(--cg-panel)";   // fond des cartes
const BDR   = "var(--cg-bdr)";
const TXT   = "var(--cg-txt)";
const MUT   = "var(--cg-mut)";
const DIM   = "var(--cg-dim)";
const INK   = "var(--cg-ink)";
const ACCENT = "var(--cg-accent)";

// Jetons sémantiques : la couleur porte un sens, elle n'est pas décorative.
const OK      = "var(--cg-ok)";
const WARN    = "var(--cg-warn)";
const DANGER  = "var(--cg-danger)";
const BDR2    = "var(--cg-bdr-strong)";
const SERIF   = "var(--cg-serif)";

// Feuille de style des thèmes (injectée par App) — l'app reste autonome.
// Aucune police distante : la PWA doit fonctionner hors-ligne.
const THEME_CSS = `
:root{
  --cg-bg:#F0E6D3; --cg-surf:#F5EDDC; --cg-card:#FAF4E8; --cg-panel:#FEFBF3;
  --cg-bdr:#DFD0B4; --cg-bdr-strong:#C9B694;
  --cg-txt:#3E3323; --cg-mut:#6E6048; --cg-dim:#99896B; --cg-ink:#201A0F;
  --cg-accent:#A0522D; --cg-accent-soft:#F7EBE0; --cg-accent-line:#E3C6B0;
  --cg-ok:#4F6B4A;     --cg-ok-soft:#EDF2EA;     --cg-ok-line:#C6D5C3;
  --cg-warn:#8A5A1E;   --cg-warn-soft:#F7EEDF;   --cg-warn-line:#DFCBA4;
  --cg-danger:#8E2C2C; --cg-danger-soft:#F8E9E7; --cg-danger-line:#E0BDBD;
  --cg-bg2:#EDE1CB; --cg-accent-btn:#A0522D; --cg-on-accent:#FEFBF3;
  --cg-serif:'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif;
  color-scheme: light;
}
[data-theme="dark"]{
  --cg-bg:#14110C; --cg-surf:#2A241B; --cg-card:#1B1710; --cg-panel:#231E16;
  --cg-bdr:#352E22; --cg-bdr-strong:#4A4030;
  --cg-txt:#DDD4C2; --cg-mut:#9C9179; --cg-dim:#786E5A; --cg-ink:#F7F1E4;
  --cg-accent:#D98F63; --cg-accent-soft:#2A1D13; --cg-accent-line:#4A3421;
  --cg-ok:#8FB287;     --cg-ok-soft:#1A2419;     --cg-ok-line:#31432E;
  --cg-warn:#D2A24E;   --cg-warn-soft:#241C10;   --cg-warn-line:#443A22;
  --cg-danger:#E08076; --cg-danger-soft:#2B1714; --cg-danger-line:#4E2925;
  --cg-bg2:#100D09; --cg-accent-btn:#D98F63; --cg-on-accent:#14110C;
  color-scheme: dark;
}
html,body{ background:var(--cg-bg); }

/* ─── Rail de navigation (ordinateur) ───────────────────────────
   Replié à 56 px, déployé à 236 px au survol ou au focus clavier.
   Il est en surimpression : le contenu ne se décale jamais, et
   gagne donc 180 px de largeur utile en permanence.              */
.cg-rail{
  width:56px;
  overflow-x:hidden;
  transition:width .18s cubic-bezier(.4,0,.2,1), box-shadow .18s;
}
.cg-rail:hover, .cg-rail:focus-within{
  width:236px;
  box-shadow:6px 0 24px rgba(31,27,21,.10);
}
[data-theme="dark"] .cg-rail:hover,
[data-theme="dark"] .cg-rail:focus-within{
  box-shadow:6px 0 24px rgba(0,0,0,.45);
}
.cg-rail::-webkit-scrollbar{ width:0; }
/* Éléments qui n'apparaissent qu'une fois le rail déployé */
.cg-fade{ opacity:0; transition:opacity .12s; pointer-events:none; }
.cg-rail:hover .cg-fade,
.cg-rail:focus-within .cg-fade{ opacity:1; pointer-events:auto; transition-delay:.04s; }
/* Respect du réglage « réduire les animations » du système */
@media (prefers-reduced-motion: reduce){
  .cg-rail, .cg-fade{ transition:none; }
}
`;

// ─── Correspondance couleur → sens ───────────────────────────────
// Le contenu médical transmet des couleurs en dur (2124 sites d'appel,
// hérités de la version précédente). Plutôt que de tous les reprendre,
// on les traduit ici vers un jeton sémantique : l'effet « arc-en-ciel »
// disparaît sans qu'aucune fiche clinique ne soit modifiée.
const TONE_MAP = {
  // verts → issue favorable, indication retenue
  "#27AE60":OK, "#2F8F66":OK, "#00966A":OK, "#0F766E":OK, "#1ABC9C":OK, "#16A085":OK,
  // rouges → danger, contre-indication, urgence
  "#EB5757":DANGER, "#E85D4A":DANGER, "#D0442F":DANGER, "#EE6E5A":DANGER, "#C0392B":DANGER,
  // oranges / jaunes → prudence, réserve
  "#C26A1C":WARN, "#F2C94C":WARN, "#F5A623":WARN, "#B5790F":WARN, "#FFD37A":WARN, "#E4923F":WARN,
};
// Teintes neutres (bleus, violets, roses) : information, pas d'alerte.
function tone(color) {
  if (!color) return ACCENT;
  if (typeof color !== "string") return ACCENT;
  if (color.indexOf("var(") === 0) return color;      // déjà un jeton
  const hex = color.toUpperCase();
  if (TONE_MAP[hex]) return TONE_MAP[hex];
  if (hex.length !== 7 || hex[0] !== "#") return ACCENT;
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
  if (mx - mn < 26) return MUT;                        // gris
  if (mx === g) return OK;
  if (mx === r) return (g > b + 40) ? WARN : DANGER;   // orangé vs rouge franc
  return ACCENT;                                       // bleus, violets, roses
}

// ─── Version & journal des nouveautés ────────────────────────────
// Pour publier une mise à jour : incrémenter APP_VERSION et ajouter
// une entrée en tête de CHANGELOG. La fenêtre s'ouvrira automatiquement
// chez les utilisateurs qui avaient déjà installé l'application.
const APP_VERSION = "2.0";
const CHANGELOG = [
  {
    v: "2.0",
    date: "Juillet 2026",
    items: [
      { t: "Interface entièrement repensée", d: "Nouvelle identité visuelle sable et terre cuite, titres en serif, surfaces plates. Le contenu clinique est inchangé." },
      { t: "Icônes dessinées", d: "Les emojis cèdent la place à un jeu de 30 icônes au trait, monochromes et cohérentes." },
      { t: "Couleur porteuse de sens", d: "Fini les dix-huit teintes décoratives : le rouge signale désormais l'urgence, le vert l'indication retenue, l'ambre la réserve." },
      { t: "Barre d'onglets sur téléphone", d: "Chapitres, Urgences, Outils et Recherche accessibles au pouce depuis n'importe quel écran." },
      { t: "Mode sombre revu", d: "Fond brun profond plutôt que noir, accordé à la palette claire. Contrastes vérifiés au niveau AA." },
      { t: "Installation corrigée", d: "L'icône d'accueil et le manifeste manquaient : le mode hors-ligne ne s'activait pas. C'est réparé." },
    ],
  },
  {
    v: "1.3",
    date: "Juillet 2026",
    items: [
      { t: "Nouveaux chapitres", d: "Congénital adulte (ESC 2020), Grossesse & cardiopathie (ESC 2025), Maladie thromboembolique hors urgence, USIC & assistance circulatoire." },
      { t: "Rythmologie enrichie", d: "Stimulation & DAI (ESC 2021/2022) et Canalopathies (ESC 2022) intégrées au chapitre." },
      { t: "Mode sombre", d: "Bascule clair / sombre depuis l'en-tête, avec suivi du réglage du téléphone." },
      { t: "Nouveaux scores interactifs", d: "HEART, PESI complet, Padua, DAPT, STOP-BANG, Wells TVP et CHA₂DS₂-VASc." },
      { t: "Contact & suggestions", d: "Signaler une coquille ou proposer un chapitre directement depuis l'accueil." },
      { t: "Interface allégée", d: "Boutons de bas de page retirés, navigation par le bouton retour et le fil d'Ariane." },
    ],
  },
];

const VALVES = {
  rac: { label: "RAC",  full: "Rétrécissement Aortique Calcifié", icon: "🔴", color: "#E85D4A" },
  iao: { label: "IAo",  full: "Insuffisance Aortique",             icon: "🟣", color: "#A267D9" },
  im:  { label: "IM",   full: "Insuffisance Mitrale",              icon: "🟢", color: "#00966A" },
  rm:  { label: "RM",   full: "Rétrécissement Mitral",             icon: "🟡", color: "#B5790F" },
  it:  { label: "IT",   full: "Insuffisance Tricuspide",           icon: "🔵", color: "#1684A8" },
  ecg: { label: "ECG",  full: "Électrocardiogramme normal — Valeurs de référence", icon: "📈", color: "#C26A1C" },
  ecgpath: { label: "ECG patho", full: "Interprétation de l'ECG pathologique", icon: "📉", color: "#EB5757" },
  ett: { label: "ETT",  full: "Échocardiographie normale — Valeurs de référence", icon: "📐", color: "#2F8F66" },
  eto: { label: "ETO",  full: "Échocardiographie transœsophagienne normale", icon: "🔬", color: "#A267D9" },
  irm: { label: "IRM cardiaque", full: "IRM cardiaque — indications et séquences", icon: "🧲", color: "#A267D9" },
  scanner: { label: "Scanner / coroscanner", full: "Scanner cardiaque, coroscanner et score calcique", icon: "🩻", color: "#1684A8" },
  cathd: { label: "KT cardiaque droit", full: "Cathétérisme cardiaque droit (Swan-Ganz) — indications, mesures, résultats", icon: "🩸", color: "#E85D4A" },
  avk: { label: "AVK",  full: "Gestion des Anti-Vitamines K", icon: "💊", color: "#1684A8" },
  poso: { label: "Posologies", full: "Fiche posologies rapides — Cardiologie", icon: "💉", color: "#E85D4A" },
  scores: { label: "Scores", full: "Calculateurs de scores cliniques", icon: "🧮", color: ACCENT },
  calc: { label: "Calculateurs", full: "Clairance créatinine, QTc, surface corporelle, débits", icon: "🧪", color: "#0F766E" },
  crett: { label: "Compte-rendu ETT", full: "Générateur de conclusion d'échocardiographie", icon: "🖨️", color: "#2F8F66" },
  antibio: { label: "Antibioprophylaxie", full: "Antibioprophylaxie de l'endocardite (ESC 2023)", icon: "🦠", color: "#EB5757" },
  relais: { label: "Relais anticoagulants", full: "Gestion péri-opératoire des antithrombotiques", icon: "🔄", color: "#B5790F" },
  equiv: { label: "Équivalences", full: "Équivalences : antihypertenseurs & bêta-bloquants", icon: "⚖️", color: "#2F8F66" },
  classif: { label: "Échelles & classifications", full: "Échelles & classifications (NYHA, CCS, Killip, Forrester…)", icon: "📚", color: ACCENT },
};

// Regroupement des cartes de référence de l'accueil en sections "chapeau"
const REF_SECTIONS = {
  ecgSec:   { label: "ECG", full: "Électrocardiogramme — normal & pathologique", icon: "📈", color: "#C26A1C",
    items: ["ecg", "ecgpath"] },
  imgSec:   { label: "Imagerie & explorations", full: "Écho (ETT/ETO), IRM, scanner, KT droit", icon: "🔬", color: "#1684A8",
    items: ["ett", "eto", "irm", "scanner", "cathd"] },
  tttSec:   { label: "Traitements", full: "AVK, posologies, équivalences", icon: "💊", color: "#E85D4A",
    items: ["avk", "poso", "equiv"] },
  toolsSec: { label: "Outils", full: "Scores, calculateurs, CR ETT, antibioprophylaxie", icon: "🧰", color: ACCENT,
    items: ["scores", "calc", "crett", "antibio", "relais", "classif"] },
};

const IC_TOPICS = {
  diag:  { label: "Diagnostic", full: "Diagnostic de l'insuffisance cardiaque", icon: "🔍", color: "#2F8F66" },
  hfref: { label: "ICFEr",  full: "Insuffisance Cardiaque à FE Réduite (≤ 40%)", icon: "🔴", color: "#E85D4A" },
  hfmref:{ label: "ICFElr", full: "IC à FE légèrement réduite (41–49%)",         icon: "🟠", color: "#C26A1C" },
  hfpef: { label: "ICFEp",  full: "Insuffisance Cardiaque à FE Préservée (≥ 50%)", icon: "🟡", color: "#B5790F" },
  aigue: { label: "IC aiguë", full: "Insuffisance Cardiaque Aiguë",              icon: "🚨", color: "#EB5757" },
  choc:  { label: "Choc cardiogénique & assistances", full: "Choc cardiogénique, ECMO, assistances, greffe", icon: "🫀", color: "#EB5757" },
  device:{ label: "Dispositifs", full: "CRT, DAI — Indications de resynchronisation et défibrillation", icon: "🔌", color: "#A267D9" },
};

const ISCHEMIC_TOPICS = {
  sca:    { label: "SCA — ST+",  full: "Syndrome Coronarien Aigu avec sus-décalage ST (STEMI)", icon: "🚨", color: "#E85D4A" },
  nste:   { label: "SCA — NST",  full: "Syndrome Coronarien Aigu sans sus-décalage ST (NSTE-ACS)", icon: "⚡", color: "#C26A1C" },
  ccs:    { label: "Angor stable", full: "Syndrome Coronarien Chronique — diagnostic", icon: "🔍", color: "#B5790F" },
  tests:  { label: "Tests ischémie & viabilité", full: "Explorations avant revascularisation non urgente", icon: "🎯", color: "#00966A" },
  antithromb: { label: "Antithrombotiques", full: "Stratégies antiplaquettaires et anticoagulantes", icon: "💊", color: "#A267D9" },
  revasc: { label: "Revascularisation", full: "PCI vs pontage — choix de stratégie", icon: "🔧", color: "#1684A8" },
  cardioprot: { label: "Cardioprotecteurs", full: "Traitements cardioprotecteurs post-revascularisation", icon: "🛡️", color: "#2F8F66" },
  readapt: { label: "Réadaptation", full: "Réadaptation cardiaque — indications et contre-indications", icon: "🏃", color: "#00966A" },
};

const FA_TOPICS = {
  fa_diag:  { label: "FA — Diagnostic", full: "Fibrillation Atriale — Diagnostic et stratification", icon: "🔍", color: "#2F8F66" },
  fa_aoc:   { label: "FA — Anticoagulation", full: "Fibrillation Atriale — Prévention du risque thromboembolique", icon: "💊", color: "#A267D9" },
  fa_rate:  { label: "FA — Contrôle FC/rythme", full: "Fibrillation Atriale — Contrôle de fréquence et du rythme", icon: "📈", color: "#1684A8" },
  fa_abl:   { label: "FA — Ablation", full: "Fibrillation Atriale — Ablation par cathéter", icon: "🔥", color: "#C26A1C" },
  fa_sca:   { label: "FA & SCA aigu", full: "FA dans les 48 premières heures d'un SCA revascularisé", icon: "🚨", color: "#EB5757" },
};

const RYTHMO_TOPICS = {
  fa:       { label: "Fibrillation Atriale", full: "Fibrillation Atriale — ESC/EACTS 2024", icon: "🫀", color: "#2F8F66" },
  vt:       { label: "TV", full: "Tachycardies ventriculaires et prévention de la mort subite", icon: "⚡", color: "#EB5757" },
  tsv:      { label: "TSV", full: "Tachycardies supraventriculaires — diagnostic et traitement aigu", icon: "💓", color: "#00966A" },
  brady:    { label: "Bradycardie", full: "Troubles conductifs — indications de stimulation cardiaque", icon: "🔌", color: "#B5790F" },
  canal:    { label: "Canalopathies", full: "QT long, Brugada, TV catécholergique — ESC 2022", icon: "🧬", color: "#B5790F" },
  stim:     { label: "Stimulation & DAI", full: "Pacemaker, resynchronisation et défibrillateur — ESC 2021/2022", icon: "📟", color: "#6B5CA5" },
};

const SPORT_TOPICS = {
  screening: { label: "Dépistage", full: "Évaluation pré-participation et dépistage cardiovasculaire", icon: "🩺", color: "#00966A" },
  ecg:       { label: "ECG de l'athlète", full: "Interprétation de l'ECG chez le sportif", icon: "📈", color: "#1684A8" },
  effort:    { label: "Épreuve d'effort & VO₂max", full: "Test d'effort et épreuve d'effort cardio-respiratoire (VO₂max)", icon: "🏃", color: "#A267D9" },
  cmp:       { label: "Cardiomyopathies", full: "Cardiomyopathies et éligibilité sportive", icon: "🫀", color: "#E85D4A" },
  rythmo_sport: { label: "Arythmies / canalopathies", full: "Arythmies et canalopathies chez le sportif", icon: "⚡", color: "#C26A1C" },
};

const HTA_TOPICS = {
  diag:      { label: "Diagnostic", full: "Hypertension artérielle — Diagnostic et classification", icon: "🔍", color: "#2F8F66" },
  bilan:     { label: "Bilan initial", full: "Bilan étiologique et retentissement", icon: "🧪", color: "#1684A8" },
  treatment: { label: "Traitement", full: "Stratégie thérapeutique et cibles tensionnelles", icon: "💊", color: "#A267D9" },
  resistant: { label: "HTA résistante", full: "HTA résistante et secondaire", icon: "🚫", color: "#EB5757" },
  urgency:   { label: "Urgence hypertensive", full: "Poussée hypertensive et urgence hypertensive", icon: "🚨", color: "#E85D4A" },
};

const CMP_TOPICS = {
  classif: { label: "Classification", full: "Démarche diagnostique et classification phénotypique", icon: "🗂️", color: "#2F8F66" },
  hcm:     { label: "CMH", full: "Cardiomyopathie hypertrophique", icon: "🫀", color: "#E85D4A" },
  dcm:     { label: "CMD", full: "Cardiomyopathie dilatée", icon: "🔵", color: "#1684A8" },
  rcm:     { label: "CMR", full: "Cardiomyopathie restrictive", icon: "🟡", color: "#B5790F" },
  amylose: { label: "Amylose", full: "Amylose cardiaque — diagnostic et traitement", icon: "🎗️", color: "#C26A1C" },
  arvc:    { label: "ACM / DAVD", full: "Cardiomyopathie arythmogène du VD", icon: "⚡", color: "#A267D9" },
};

const ENDO_TOPICS = {
  diag:      { label: "Diagnostic", full: "Endocardite infectieuse — Critères diagnostiques", icon: "🔍", color: "#2F8F66" },
  treatment: { label: "Antibiothérapie", full: "Traitement antibiotique probabiliste et documenté", icon: "💉", color: "#1684A8" },
  surgery:   { label: "Chirurgie", full: "Indications et timing chirurgical", icon: "🔪", color: "#EB5757" },
  prophyl:   { label: "Prophylaxie", full: "Prévention — patients et procédures à risque", icon: "🛡️", color: "#00966A" },
};

const PERIMYO_TOPICS = {
  pericardite: { label: "Péricardite aiguë", full: "Péricardite aiguë — ESC 2025", icon: "🫀", color: "#1684A8" },
  myocardite:  { label: "Myocardite", full: "Myocardite aiguë — ESC 2025", icon: "🔥", color: "#EB5757" },
  constrictive:{ label: "Péricardite constrictive", full: "Péricardite chronique constrictive", icon: "🔗", color: "#B5790F" },
};

const SPEC_TOPICS = {
  syncope: { label: "Syncope", full: "Syncope — Diagnostic et stratification (ESC 2018)", icon: "😵", color: "#A267D9" },
  preop:   { label: "Évaluation pré-opératoire", full: "Évaluation cardiaque pré-opératoire (ESC 2022)", icon: "🔪", color: "#1684A8" },
  onco:    { label: "Cardio-oncologie", full: "Cardio-oncologie — Cardiotoxicité (ESC 2022)", icon: "🎗️", color: "#E85D4A" },
};

const URG_TOPICS = {
  doses:    { label: "Doses d'urgence", full: "Aide-mémoire posologies en aigu (ERC 2021/2025)", icon: "💉", color: "#D0442F" },
  acr:      { label: "Arrêt cardiaque", full: "Arrêt cardio-respiratoire — ACLS", icon: "🫀", color: "#EB5757" },
  chest:    { label: "Douleur thoracique", full: "Douleur thoracique aux urgences", icon: "💥", color: "#E85D4A" },
  oap:      { label: "OAP", full: "Œdème aigu du poumon / IC aiguë", icon: "🫁", color: "#1684A8" },
  ep:       { label: "Embolie pulmonaire", full: "Embolie pulmonaire — prise en charge", icon: "🩸", color: "#A267D9" },
  tampon:   { label: "Tamponnade", full: "Tamponnade péricardique", icon: "💧", color: "#B5790F" },
};

const METAB_TOPICS = {
  hyperk: { label: "Hyperkaliémie", full: "Hyperkaliémie — signes ECG et PEC", icon: "🔺", color: "#EB5757" },
  hypok:  { label: "Hypokaliémie", full: "Hypokaliémie — signes ECG et PEC", icon: "🔻", color: "#1684A8" },
  calc:   { label: "Dyscalcémies", full: "Hyper/hypocalcémie — retentissement ECG", icon: "🦴", color: "#B5790F" },
};

const AORTE_TOPICS = {
  aneurysm: { label: "Anévrysme aorte ascendante", full: "Anévrysme — seuils chirurgicaux (ESC 2024)", icon: "🎈", color: "#E85D4A" },
  genetic:  { label: "Aortopathies génétiques", full: "Marfan, Loeys-Dietz, Turner, bicuspidie", icon: "🧬", color: "#A267D9" },
  surveil:  { label: "Imagerie & surveillance", full: "Suivi et traitement médical", icon: "📅", color: "#1684A8" },
};

const HTAP_TOPICS = {
  defclass: { label: "Définition & classification", full: "Définition hémodynamique et 5 groupes (ESC 2022)", icon: "🫁", color: "#1684A8" },
  diag:     { label: "Démarche diagnostique", full: "Algorithme en 3 étapes, quand adresser", icon: "🔍", color: "#2F8F66" },
  manage:   { label: "Principes de PEC", full: "Stratification du risque et orientation", icon: "🧭", color: "#A267D9" },
};

const FDR_TOPICS = {
  risk:    { label: "Évaluation du risque CV", full: "Catégories de risque, SCORE2, modificateurs", icon: "🎯", color: "#0F766E" },
  lipides: { label: "Dyslipidémies", full: "Cibles LDL et traitements hypolipémiants (ESC/EAS 2025)", icon: "🧈", color: "#C26A1C" },
  tabac:   { label: "Tabagisme & sevrage", full: "Le facteur de risque le plus modifiable", icon: "🚭", color: "#EB5757" },
  diabete: { label: "Diabète & dysglycémie", full: "Prise en charge cardiovasculaire du diabète", icon: "🍬", color: ACCENT },
  hygiene: { label: "Mode de vie", full: "Alimentation, activité physique, poids, alcool", icon: "🥗", color: "#2F8F66" },
};

const STIM_TOPICS = {
  indic:  { label: "Indications de stimulation", full: "BAV, dysfonction sinusale, syncope, post-TAVI (ESC 2021)", icon: "🩺", color: "#6B5CA5" },
  modes:  { label: "Modes & code NBG", full: "Choix du mode et minimisation de la stimulation VD", icon: "⚙️", color: "#1684A8" },
  crt:    { label: "Resynchronisation (CRT)", full: "Indications CRT-P / CRT-D (ESC 2021)", icon: "🔀", color: "#A267D9" },
  dai:    { label: "Défibrillateur (DAI)", full: "Prévention primaire et secondaire (ESC 2022)", icon: "⚡", color: "#EB5757" },
  prog:   { label: "Programmation & suivi", full: "Réglages du DAI, télésuivi, orage rythmique", icon: "🎛️", color: "#2F8F66" },
  compl:  { label: "Complications & dysfonctions", full: "Défaut de capture/détection, infection, chocs inappropriés", icon: "⚠️", color: "#C26A1C" },
  situ:   { label: "IRM & situations particulières", full: "IRM, chirurgie, aimant, radiothérapie, fin de vie", icon: "🧲", color: "#B5790F" },
};

const CONG_TOPICS = {
  princ:   { label: "Principes & suivi", full: "Classification de complexité, centre expert, suivi à vie (ESC 2020)", icon: "🧭", color: "#2E86AB" },
  shunt:   { label: "Shunts gauche-droite", full: "CIA, CIV, canal artériel — indications de fermeture", icon: "↔️", color: "#1684A8" },
  obst:    { label: "Obstacles", full: "Coarctation, obstacles pulmonaire et aortique", icon: "⛔", color: "#C26A1C" },
  fallot:  { label: "Tétralogie de Fallot opérée", full: "Complications tardives et réintervention", icon: "🔧", color: "#A267D9" },
  complex: { label: "Circulations complexes", full: "VD systémique, transposition, Fontan", icon: "🔁", color: ACCENT },
  eisen:   { label: "Eisenmenger & HTAP", full: "Maladie vasculaire pulmonaire des cardiopathies congénitales", icon: "🫁", color: "#EB5757" },
  compli:  { label: "Complications transversales", full: "Arythmies, endocardite, cyanose, grossesse", icon: "⚠️", color: "#2F8F66" },
};

const GROSS_TOPICS = {
  risque:  { label: "Évaluation du risque", full: "mWHO 2.0, Pregnancy Heart Team, conseil pré-conceptionnel (ESC 2025)", icon: "🧮", color: "#C2557A" },
  physio:  { label: "Physiologie & examens", full: "Adaptations hémodynamiques, quels examens, biomarqueurs", icon: "📈", color: "#1684A8" },
  medic:   { label: "Médicaments", full: "Contre-indiqués, autorisés, allaitement", icon: "💊", color: "#A267D9" },
  htagr:   { label: "HTA & pré-éclampsie", full: "Seuils, traitement, prévention par aspirine", icon: "🩸", color: "#2F8F66" },
  valve:   { label: "Valvulopathies & prothèses", full: "Anticoagulation de la valve mécanique en grossesse", icon: "🫀", color: "#E85D4A" },
  cmpgr:   { label: "Cardiomyopathies & péripartum", full: "CMP du péripartum, CMH, CMD", icon: "💔", color: "#C26A1C" },
  rythme:  { label: "Arythmies & urgences", full: "FA, arythmies, MTEV, SCA en grossesse", icon: "⚡", color: "#B5790F" },
  accouch: { label: "Accouchement & post-partum", full: "Mode et timing, gestion des anticoagulants, suivi", icon: "👶", color: ACCENT },
};

const MTEV_TOPICS = {
  duree:  { label: "Durée d'anticoagulation", full: "La question centrale — facteurs de risque et décision (ESC 2019)", icon: "⏳", color: "#2C6E9B" },
  choix:  { label: "Choix du traitement", full: "AOD, AVK, héparines — modalités et cas particuliers", icon: "💊", color: "#A267D9" },
  tvp:    { label: "TVP & formes cliniques", full: "Proximale, distale, membre supérieur, thrombose superficielle", icon: "🦵", color: "#E85D4A" },
  bilan:  { label: "Bilan étiologique", full: "Thrombophilie et recherche de cancer — quand chercher", icon: "🔬", color: "#2F8F66" },
  suivi:  { label: "Suivi & complications tardives", full: "Syndrome post-thrombotique, CTEPH, récidive", icon: "📅", color: "#C26A1C" },
  situ:   { label: "Situations particulières", full: "Cancer, SAPL, grossesse, gestes invasifs", icon: "🧩", color: ACCENT },
};

const CANAL_TOPICS = {
  qtlong:   { label: "Syndrome du QT long", full: "Diagnostic, traitement et stratification (ESC 2022)", icon: "📏", color: "#B5790F" },
  qtacquis: { label: "QT long acquis", full: "Médicaments, troubles ioniques, torsades de pointes", icon: "💊", color: "#C26A1C" },
  brugada:  { label: "Syndrome de Brugada", full: "Diagnostic ECG, critères 2022, stratification", icon: "🌊", color: "#1684A8" },
  cpvt:     { label: "TV catécholergique", full: "CPVT — diagnostic et traitement", icon: "🏃", color: "#EB5757" },
  autres:   { label: "Autres syndromes", full: "QT court, repolarisation précoce, FV idiopathique", icon: "🔎", color: "#2F8F66" },
  famille:  { label: "Dépistage familial", full: "Enquête familiale et conseil génétique", icon: "👨‍👩‍👧", color: "#A267D9" },
};

const USIC_TOPICS = {
  choc:    { label: "Choc cardiogénique", full: "Reconnaître, classer (SCAI) et phénotyper", icon: "🚨", color: "#EB5757" },
  drogues: { label: "Vasopresseurs & inotropes", full: "Quelle drogue, quel objectif, quels pièges", icon: "💉", color: "#D0442F" },
  assist:  { label: "Assistance circulatoire", full: "Contre-pulsion, Impella, ECMO — ce que disent les essais", icon: "⚙️", color: ACCENT },
  vd:      { label: "Défaillance ventriculaire droite", full: "Reconnaître et traiter — pièges spécifiques", icon: "🫀", color: "#1684A8" },
  monito:  { label: "Monitorage hémodynamique", full: "Cathéter droit, pression artérielle, échographie, lactates", icon: "📟", color: "#2F8F66" },
};

const CHAPTERS = {
  urgences: { label: "Urgences de garde", full: "Urgences cardiologiques — Garde", icon: "🚨", color: "#EB5757", ready: true,
    subtitle: "ACR, douleur thoracique, OAP, embolie pulmonaire, tamponnade" },
  valvulo: { label: "Valvulopathies", full: "Valvulopathies — ESC/EACTS 2025", icon: "🫀", color: "#1684A8", ready: true,
    subtitle: "5 algorithmes décisionnels" },
  ischemic: { label: "Cardiopathie ischémique", full: "Cardiopathie ischémique — ESC 2023/2024", icon: "🩸", color: "#E85D4A", ready: true,
    subtitle: "SCA ST+/NST, angor stable, antithrombotiques, revascularisation, cardioprotection, réadaptation" },
  rythmo: { label: "Rythmologie", full: "Rythmologie — ESC 2021/2022/2024", icon: "⚡", color: "#B5790F", ready: true,
    subtitle: "FA, troubles conductifs, TV et prévention de la mort subite" },
  sport: { label: "Cardiologie du sport", full: "Cardiologie du sport — ESC 2020", icon: "🏃", color: "#00966A", ready: true,
    subtitle: "Dépistage, ECG de l'athlète, cardiomyopathies, arythmies" },
  ic: { label: "Insuffisance cardiaque", full: "Insuffisance cardiaque", icon: "💧", color: "#A267D9", ready: true,
    subtitle: "ICFEr, ICFElr, ICFEp, IC aiguë, dispositifs — ESC 2021/2023" },
  hta: { label: "Hypertension artérielle", full: "Hypertension artérielle — ESC 2024", icon: "🩸", color: "#2F8F66", ready: true,
    subtitle: "Diagnostic, bilan, traitement, HTA résistante, urgences" },
  fdr: { label: "Facteurs de risque CV", full: "Prévention et facteurs de risque cardiovasculaire", icon: "🎯", color: "#0F766E", ready: true,
    subtitle: "Risque CV, dyslipidémies, tabac, diabète, mode de vie" },
  cmp: { label: "Cardiomyopathies", full: "Cardiomyopathies — ESC 2023", icon: "🫀", color: "#A267D9", ready: true,
    subtitle: "Classification, CMH, CMD, CMR, ACM/DAVD" },
  endo: { label: "Endocardite infectieuse", full: "Endocardite infectieuse — ESC 2023", icon: "🦠", color: "#EB5757", ready: true,
    subtitle: "Diagnostic, antibiothérapie, chirurgie, prophylaxie" },
  pericmyo: { label: "Péricardite & Myocardite", full: "Maladies inflammatoires — ESC 2025", icon: "🔥", color: "#1684A8", ready: true,
    subtitle: "Péricardite aiguë, myocardite, constriction — concept IMPS" },
  metab: { label: "Dyskaliémies & métabolisme", full: "Troubles ioniques et retentissement cardiaque", icon: "🧪", color: "#2F8F66", ready: true,
    subtitle: "Hyper/hypokaliémie, dyscalcémies — signes ECG, seuils, PEC" },
  aorte: { label: "Aorte thoracique", full: "Aorte thoracique — ESC 2024", icon: "🎈", color: "#C26A1C", ready: true,
    subtitle: "Anévrysmes, seuils chirurgicaux, aortopathies génétiques, suivi" },
  htap: { label: "HTAP / cœur pulmonaire", full: "Hypertension pulmonaire — ESC 2022", icon: "🫁", color: "#1684A8", ready: true,
    subtitle: "Définition, 5 groupes, démarche diagnostique, quand adresser" },
  cong: { label: "Congénital adulte", full: "Cardiopathies congénitales de l'adulte — ESC 2020", icon: "🧬", color: "#2E86AB", ready: true,
    subtitle: "Shunts, coarctation, Fallot, Fontan, Eisenmenger, suivi à vie" },
  usic: { label: "USIC & assistance", full: "Soins intensifs cardiologiques et assistance circulatoire", icon: "🏥", color: "#8C4A5E", ready: true,
    subtitle: "Choc cardiogénique, drogues, ECMO/Impella, défaillance droite, monitorage" },
  mtev: { label: "Maladie thromboembolique", full: "Maladie thromboembolique veineuse — prise en charge hors urgence", icon: "🦵", color: "#2C6E9B", ready: true,
    subtitle: "TVP, durée d'anticoagulation, thrombophilie, suivi et récidive" },
  gross: { label: "Grossesse & cardiopathie", full: "Maladies cardiovasculaires et grossesse — ESC 2025", icon: "🤰", color: "#C2557A", ready: true,
    subtitle: "mWHO 2.0, médicaments, valve mécanique, péripartum, accouchement" },
  spec: { label: "Situations particulières", full: "Situations particulières", icon: "🧩", color: ACCENT, ready: true,
    subtitle: "Syncope, évaluation pré-opératoire, cardio-oncologie" },
};

// ─── Index de recherche : agrège chapitres, sous-topics, fiches ───
// Normalise (minuscules, sans accents) pour une recherche tolérante.
function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
const REF_CARD_KEYS = ["ecg","ecgpath","ett","eto","irm","scanner","cathd","avk","poso","scores","calc","crett","antibio","relais","classif","equiv"];
const VALVE_CLINICAL_KEYS = ["rac","iao","im","rm","it"];

// ─── Index des traitements : chaque molécule pointe vers sa fiche ──
const DRUGS = (() => {
  const T   = (chapterKey, topicKey) => ({ kind:"topic",   chapterKey, topicKey });
  const REF = (topicKey)             => ({ kind:"refcard", topicKey });
  const FA  = (topicKey)             => ({ kind:"fa",      topicKey });
  const g = (cls, to, names) => names.map(n => ({ n, cls, to }));
  return [].concat(
    // ── Antithrombotiques ──
    g("Antiagrégant plaquettaire", T("ischemic","antithromb"),
      ["Aspirine","Acide acétylsalicylique","Clopidogrel","Ticagrélor","Prasugrel","Cangrélor"]),
    g("Héparine / anticoagulant injectable", T("ischemic","antithromb"),
      ["Héparine non fractionnée","HBPM","Énoxaparine","Fondaparinux","Bivalirudine"]),
    g("Anticoagulant oral direct (AOD)", FA("fa_aoc"),
      ["Apixaban","Rivaroxaban","Édoxaban","Dabigatran"]),
    g("Antidote des AOD", FA("fa_aoc"), ["Idarucizumab","Andexanet alfa"]),
    g("Anti-vitamine K (AVK)", REF("avk"),
      ["Warfarine","Coumadine","Fluindione","Previscan","Acénocoumarol","Vitamine K","PPSB","Kaskadil"]),
    g("Gestion péri-opératoire", REF("relais"), ["Relais anticoagulant","Bridging"]),

    // ── Hypolipémiants ──
    g("Statine", T("fdr","lipides"),
      ["Atorvastatine","Rosuvastatine","Simvastatine","Pravastatine","Fluvastatine","Pitavastatine"]),
    g("Hypolipémiant non-statine", T("fdr","lipides"),
      ["Ézétimibe","Acide bempédoïque","Évolocumab","Alirocumab","Anti-PCSK9","Inclisiran","Évinacumab","Icosapent éthyl","Fénofibrate","Volanésorsen"]),

    // ── Insuffisance cardiaque ──
    g("Traitement de fond de l'ICFEr", T("ic","hfref"),
      ["Sacubitril/valsartan","Entresto","ARNI","Dapagliflozine","Empagliflozine","Gliflozine","Inhibiteur SGLT2",
       "Spironolactone","Éplérénone","Anti-aldostérone","Ivabradine","Vériciguat","Hydralazine"]),
    g("Insuffisance cardiaque aiguë", T("ic","aigue"),
      ["Furosémide","Bumétanide","Diurétique de l'anse","Trinitrine","Dérivé nitré"]),
    g("Inotrope / vasopresseur", T("ic","choc"),
      ["Dobutamine","Noradrénaline","Adrénaline","Lévosimendan","Milrinone","Dopamine"]),

    // ── Antihypertenseurs & bêta-bloquants ──
    g("Inhibiteur de l'enzyme de conversion (IEC)", REF("equiv"),
      ["Ramipril","Périndopril","Énalapril","Lisinopril","Captopril","Quinapril"]),
    g("Antagoniste des récepteurs de l'angiotensine (ARA2)", REF("equiv"),
      ["Candésartan","Valsartan","Irbésartan","Losartan","Telmisartan","Olmésartan","Sartan"]),
    g("Inhibiteur calcique", REF("equiv"),
      ["Amlodipine","Lercanidipine","Nifédipine","Nicardipine","Vérapamil","Diltiazem"]),
    g("Diurétique", REF("equiv"),
      ["Indapamide","Hydrochlorothiazide","Chlortalidone"]),
    g("Bêta-bloquant", REF("equiv"),
      ["Bisoprolol","Carvédilol","Métoprolol","Nébivolol","Aténolol","Propranolol","Labétalol","Esmolol"]),

    // ── Antiarythmiques & rythmologie ──
    g("Antiarythmique / contrôle du rythme", FA("fa_rate"),
      ["Amiodarone","Flécaïnide","Propafénone","Dronédarone","Sotalol","Digoxine","Vernakalant"]),
    g("Tachycardie supraventriculaire", T("rythmo","tsv"), ["Adénosine","Striadyne","Krénosine"]),
    g("Bradycardie", T("rythmo","brady"), ["Atropine","Isoprénaline"]),

    // ── Diabète & facteurs de risque ──
    g("Antidiabétique à bénéfice cardiovasculaire", T("fdr","diabete"),
      ["Metformine","Sémaglutide","Liraglutide","Dulaglutide","Agoniste GLP-1"]),
    g("Sevrage tabagique", T("fdr","tabac"),
      ["Varénicline","Bupropion","Substitut nicotinique","Nicotine"]),

    // ── Infectiologie cardiaque ──
    g("Antibiothérapie de l'endocardite", T("endo","treatment"),
      ["Amoxicilline","Gentamicine","Vancomycine","Daptomycine","Ceftriaxone","Céfazoline","Rifampicine","Cloxacilline"]),
    g("Antibioprophylaxie", REF("antibio"), ["Antibioprophylaxie","Clindamycine"]),

    // ── Péricarde ──
    g("Péricardite", T("pericmyo","pericardite"), ["Colchicine","Anakinra","AINS","Ibuprofène"]),

    // ── Dyskaliémies ──
    g("Hyperkaliémie", T("metab","hyperk"),
      ["Gluconate de calcium","Insuline-glucose","Salbutamol","Bicarbonate de sodium","Patiromer","Kayexalate","Sulfonate de polystyrène"]),
    g("Hypokaliémie", T("metab","hypok"), ["Chlorure de potassium","KCl","Magnésium"]),

    // ── HTAP ──
    g("Traitement spécifique de l'HTAP", T("htap","manage"),
      ["Sotatercept","Riociguat","Bosentan","Macitentan","Ambrisentan","Sildénafil","Tadalafil","Époprosténol","Tréprostinil","Sélexipag"]),

    // ── Cardiomyopathies ──
    g("Amylose cardiaque", T("cmp","amylose"), ["Tafamidis","Patisiran","Vutrisiran"]),
    g("Cardiomyopathie hypertrophique", T("cmp","hcm"), ["Mavacamten","Disopyramide"]),

    // ── Aorte ──
    g("Aortopathie génétique", T("aorte","genetic"), ["Céliprolol"]),

    // ── Urgences ──
    g("Arrêt cardiaque", T("urgences","acr"), ["Adrénaline ACR","Amiodarone ACR"]),
    g("Embolie pulmonaire", T("urgences","ep"), ["Altéplase","Ténectéplase","Thrombolyse","Fibrinolyse"]),

    // ── Cardio-oncologie ──
    g("Cardiotoxicité", T("spec","onco"), ["Anthracycline","Doxorubicine","Trastuzumab"]),
  );
})();

const SEARCH_INDEX = (() => {


  const idx = [];
  // Chapters (excluding urgences shown separately, but include it too for search)
  Object.entries(CHAPTERS).forEach(([key, c]) => {
    idx.push({ kind:"chapter", chapterKey:key, label:c.label, sub:c.subtitle||c.full, icon:c.icon, color:c.color });
  });
  // Valvulopathies : clinical valves + reference cards
  Object.entries(VALVES).forEach(([key, v]) => {
    if (VALVE_CLINICAL_KEYS.includes(key)) {
      idx.push({ kind:"valve", topicKey:key, label:v.label, sub:v.full, icon:v.icon, color:v.color, parent:"Valvulopathies" });
    } else if (REF_CARD_KEYS.includes(key)) {
      idx.push({ kind:"refcard", topicKey:key, label:v.label, sub:v.full, icon:v.icon, color:v.color, parent:"Référence" });
    }
  });
  // Chapter sub-topics
  const topicMap = [
    ["ic", IC_TOPICS, "Insuffisance cardiaque"],
    ["ischemic", ISCHEMIC_TOPICS, "Cardiopathie ischémique"],
    ["rythmo", RYTHMO_TOPICS, "Rythmologie"],
    ["sport", SPORT_TOPICS, "Cardiologie du sport"],
    ["hta", HTA_TOPICS, "Hypertension artérielle"],
    ["cmp", CMP_TOPICS, "Cardiomyopathies"],
    ["endo", ENDO_TOPICS, "Endocardite"],
    ["pericmyo", PERIMYO_TOPICS, "Péricardite & Myocardite"],
    ["spec", SPEC_TOPICS, "Situations particulières"],
    ["urgences", URG_TOPICS, "Urgences"],
    ["metab", METAB_TOPICS, "Dyskaliémies"],
    ["aorte", AORTE_TOPICS, "Aorte thoracique"],
    ["htap", HTAP_TOPICS, "HTAP"],
    ["fdr", FDR_TOPICS, "Facteurs de risque CV"],
    ["cong", CONG_TOPICS, "Congénital adulte"],
    ["gross", GROSS_TOPICS, "Grossesse & cardiopathie"],
    ["mtev", MTEV_TOPICS, "Maladie thromboembolique"],
    ["usic", USIC_TOPICS, "USIC & assistance"],
  ];
  topicMap.forEach(([chapterKey, reg, parent]) => {
    Object.entries(reg).forEach(([key, t]) => {
      idx.push({ kind:"topic", chapterKey, topicKey:key, label:t.label, sub:t.full, icon:t.icon, color:t.color, parent });
    });
  });
  // FA sub-topics
  Object.entries(FA_TOPICS).forEach(([key, t]) => {
    idx.push({ kind:"fa", topicKey:key, label:t.label, sub:t.full, icon:t.icon, color:t.color, parent:"Fibrillation atriale" });
  });
  Object.entries(STIM_TOPICS).forEach(([key, t]) => {
    idx.push({ kind:"stim", topicKey:key, label:t.label, sub:t.full, icon:t.icon, color:t.color, parent:"Stimulation & DAI" });
  });
  Object.entries(CANAL_TOPICS).forEach(([key, t]) => {
    idx.push({ kind:"canal", topicKey:key, label:t.label, sub:t.full, icon:t.icon, color:t.color, parent:"Canalopathies" });
  });
  // Traitements (molécules) — pointent vers la fiche correspondante
  DRUGS.forEach(d => {
    idx.push({ kind:"drug", to:d.to, label:d.n, sub:d.cls, icon:"💊", color:"#A267D9", parent:"Traitement" });
  });
  // Precompute normalized search string
  idx.forEach(e => { e._n = normalize(`${e.label} ${e.sub||""} ${e.parent||""}`); });
  // Enrichissement par mots-clés techniques (termes cherchés mais absents des libellés)
  const KW = {
    "mtev:situ": "mtev cancer sapl grossesse geste invasif filtre cave anticoagulation particulier",
    "stim:situ": "irm pacemaker dai compatible bistouri chirurgie aimant radiotherapie desactivation fin de vie conduite",
    "ic:choc": "choc cardiogenique ecmo impella assistance greffe transplantation lvad inotrope",
    "usic:choc": "choc cardiogenique scai lactates marbrures hypoperfusion phenotype usic reanimation",
    tests: "ffr iffr ifr rfr reserve coronaire fractionnaire viabilite ischemie stress spect pet scintigraphie",
    rac: "tavi retrecissement aortique stenose transcatheter",
    iao: "insuffisance aortique regurgitation fuite",
    im: "insuffisance mitrale teer mitraclip regurgitation",
    rm: "retrecissement mitral stenose",
    it: "insuffisance tricuspide evoque triscend teer",
    amylose: "attr al transthyretine tafamidis dpd perugini scintigraphie",
    cathd: "swan ganz catheterisme droit hemodynamique wedge pcwp rvp papi fick thermodilution",
    scanner: "coroscanner ccta calcique agatston cad-rads ffr-ct",
    irm: "cmr lge rehaussement tardif t1 t2 mapping ecv lake louise myocardite",
    scores: "chads vasc has-bled grace timi wells score2 genève pesi rcri",
    classif: "nyha ccs killip forrester mmrc stevenson",
    antibio: "antibioprophylaxie endocardite amoxicilline prophylaxie osler",
    relais: "bridging aod avk anticoagulant peri-operatoire arret",
    hyperk: "hyperkaliemie potassium kaliemie",
    hypok: "hypokaliemie potassium kaliemie",
    aneurysm: "anevrysme aorte ascendante marfan bicuspidie seuil chirurgical",
    defclass: "htap hypertension pulmonaire mpap groupe",
    vo2: "vo2max efx cpet epreuve effort cardio-respiratoire",
    ee: "epreuve effort ecg bruce",
    princ: "congenital adulte suivi transition centre expert complexite classification cardiopathie congenitale",
    shunt: "cia civ canal arteriel communication interauriculaire interventriculaire shunt fermeture qp qs resistances wood",
    obst: "coarctation aorte stenose pulmonaire obstacle sous-aortique williams bicuspidie congenital",
    fallot: "tetralogie fallot insuffisance pulmonaire remplacement valve pulmonaire reintervention",
    complex: "fontan ventricule droit systemique transposition gros vaisseaux mustard senning univentriculaire",
    eisen: "eisenmenger cyanose shunt inverse maladie vasculaire pulmonaire congenital saignee",
    compli: "arythmie congenital endocardite cyanose chronique erythrocytose embolie paradoxale",
    qtlong: "qt long congenital lqts schwartz nadolol propranolol mexiletine denervation sympathique torsade",
    qtacquis: "qt long acquis medicament torsade de pointes magnesium isoprenaline hypokaliemie allongement",
    brugada: "brugada type 1 scn5a fievre ajmaline quinidine mort subite",
    cpvt: "cpvt tachycardie catecholergique bidirectionnelle flecainide effort syncope enfant",
    autres: "qt court repolarisation precoce fibrillation ventriculaire idiopathique quinidine",
    famille: "depistage familial genetique cascade apparentes mort subite inexpliquee autopsie",
    drogues: "noradrenaline adrenaline dobutamine milrinone levosimendan vasopresseur inotrope usic",
    assist: "assistance circulatoire ecmo impella contre-pulsion ballon danger shock ecls shock ecpella",
    vd: "defaillance ventriculaire droite vd aigu tapse remplissage post-charge pulmonaire usic",
    monito: "monitorage hemodynamique catheter droit swan ganz lactates echographie usic puissance cardiaque",
    duree: "duree anticoagulation mtev recidive provoquee non provoquee facteur risque persistant transitoire prolonge dose reduite",
    choix: "aod avk hbpm fondaparinux apixaban rivaroxaban edoxaban dabigatran initiation thrombose schema",
    tvp: "tvp thrombose veineuse profonde distale mollet proximale membre superieur superficielle paget schrotter",
    bilan: "thrombophilie bilan facteur v leiden proteine c s antithrombine sapl recherche cancer mtev",
    suivi: "syndrome post-thrombotique cteph dyspnee scintigraphie suivi mtev recidive consultation",
    risque: "grossesse risque mwho pregnancy heart team conseil preconceptionnel contraception grossesse cardiopathie",
    physio: "grossesse physiologie debit cardiaque volume plasmatique examens irradiation echographie enceinte",
    medic: "medicament grossesse contre-indique iec ara2 sacubitril sglt2 allaitement teratogene enceinte",
    htagr: "hta grossesse preeclampsie eclampsie hellp methyldopa labetalol aspirine gestationnelle",
    valve: "valve mecanique grossesse anticoagulation avk hbpm prothese retrecissement mitral enceinte",
    cmpgr: "cardiomyopathie peripartum ppcm bromocriptine post-partum insuffisance cardiaque grossesse",
    rythme: "arythmie grossesse fa cardioversion adenosine mtev embolie pulmonaire sca dissection coronaire enceinte",
    accouch: "accouchement cesarienne voie basse peridurale post-partum anticoagulation peripartum plan de naissance",
    indic: "stimulation pacemaker indication bav bloc auriculo-ventriculaire dysfonction sinusale mobitz syncope tavi entrainement",
    modes: "mode stimulation nbg ddd vvi aai vdd asservissement code sonde leadless faisceau his branche gauche",
    crt: "resynchronisation crt biventriculaire crt-p crt-d bbg qrs sonde ventriculaire gauche",
    dai: "defibrillateur dai icd prevention primaire secondaire mort subite choc sous-cutane gilet",
    prog: "programmation dai telesurveillance telesuivi atp zone detection orage rythmique controle pacemaker",
    compl: "complication dysfonction pacemaker defaut capture detection sur-detection hematome pneumothorax infection sonde twiddler choc inapproprie",
    crett: "compte-rendu ett echographie echocardiographie conclusion generateur fevg valve paps tapse redaction rapport",
    calc: "calculateur clairance creatinine cockcroft ckd-epi dfg qtc bazett fridericia surface corporelle imc noradrenaline debit ivse",
    doses: "doses urgence posologie adrenaline amiodarone atropine adenosine noradrenaline dobutamine cardioversion anaphylaxie hyperkaliemie acls erc reanimation debit drogue choc",
    fa_sca: "fa sca sca syndrome coronarien aigu tritherapie bitherapie antithrombotique post-pci stent aspirine clopidogrel aod anticoagulant revascularise 48h",
    lipides: "dyslipidemie ldl cholesterol statine atorvastatine rosuvastatine ezetimibe pcsk9 evolocumab alirocumab inclisiran acide bempedoique lipoproteine lp(a) triglycerides hypercholesterolemie familiale icosapent hypolipemiant",
    risk: "score2 risque cardiovasculaire prevention modificateur calcique lp(a)",
    tabac: "tabac sevrage nicotine varenicline bupropion fumeur",
    diabete: "diabete sglt2 gliflozine glp-1 metformine hba1c glycemie",
    hygiene: "mode de vie alimentation mediterraneen activite physique poids alcool sel imc",
    equiv: "equivalence dose betabloquant bisoprolol carvedilol metoprolol nebivolol antihypertenseur iec ara2 sartan amlodipine indapamide posologie",
  };
  idx.forEach(e => {
    const k = e.topicKey;
    if (!k) return;
    // clé composite « chapitre:rubrique » prioritaire, sinon clé simple
    const scope = e.chapterKey || e.kind;
    const kw = KW[scope + ":" + k] || KW[k];
    if (kw) e._n += " " + normalize(kw);
  });
  return idx;
})();

function searchIndex(query) {
  const q = normalize(query).trim();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/);
  const scored = [];
  for (const e of SEARCH_INDEX) {
    if (terms.every(t => e._n.includes(t))) {
      // score: label match > sub match; earlier position better
      const labelN = normalize(e.label);
      let score = 0;
      if (labelN.startsWith(q)) score += 100;
      else if (labelN.includes(q)) score += 50;
      if (e.kind === "chapter") score += 10;
      if (e.kind === "drug" && labelN.startsWith(q)) score += 30;
      scored.push({ e, score });
    }
  }
  scored.sort((a,b) => b.score - a.score);
  return scored.slice(0, 12).map(s => s.e);
}


// ─── Jeu d'icônes ────────────────────────────────────────────────
// Tracés au trait, épaisseur uniforme, monochromes : ils héritent de
// la couleur du texte. Les données continuent de porter des emojis
// (265 champs `icon:`) ; la traduction se fait ici, au rendu.
const ICON_PATHS = {
  heart:   '<path d="M19 14c1.5-1.6 2-3.4 2-5a5 5 0 0 0-9-3 5 5 0 0 0-9 3c0 1.6.5 3.4 2 5l7 7z"/>',
  pulse:   '<path d="M3 12h3.5l2-5 3.5 10 2.5-7 1.5 2H21"/>',
  bolt:    '<path d="M13 2 4.1 12.9a1 1 0 0 0 .8 1.6H11l-1 7.5 8.9-10.9a1 1 0 0 0-.8-1.6H12z"/>',
  drop:    '<path d="M12 2.7 6.7 8a7.5 7.5 0 1 0 10.6 0z"/>',
  lungs:   '<path d="M12 3v10"/><path d="M12 13c0 4-2 8-5.5 8C4 21 3 18.5 3 15c0-4 2-7 4-8"/><path d="M12 13c0 4 2 8 5.5 8C20 21 21 18.5 21 15c0-4-2-7-4-8"/>',
  flask:   '<path d="M9 2v7L4.5 18a2.5 2.5 0 0 0 2.2 3.7h10.6A2.5 2.5 0 0 0 19.5 18L15 9V2"/><path d="M8 2h8M7 14h10"/>',
  alert:   '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  pill:    '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9 9l6 6"/>',
  syringe: '<path d="M18 2l4 4M20 4l-8 8"/><path d="M14 6l4 4-8 8H6v-4z"/><path d="M9 11l4 4"/>',
  stetho:  '<path d="M5 3v6a5 5 0 0 0 10 0V3"/><path d="M4 3h2M14 3h2"/><path d="M10 14v2a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="11" r="2.5"/>',
  calc:    '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h2M8 15h2M14 11h2M14 15h2"/>',
  microbe: '<circle cx="12" cy="12" r="6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  target:  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  run:     '<circle cx="14" cy="4.5" r="2"/><path d="M11 21l1.5-6-3-2.5 1-5 3.5 3 3 1"/><path d="M9.5 12.5 6 15l-1 6"/>',
  dna:     '<path d="M8 3c0 4 8 4 8 8s-8 4-8 8"/><path d="M16 3c0 4-8 4-8 8s8 4 8 8"/>',
  shield:  '<path d="M12 21s7-3.5 7-9V5.5L12 3 5 5.5V12c0 5.5 7 9 7 9z"/>',
  flame:   '<path d="M12 21c4-3 7-6.5 7-10a7 7 0 0 0-14 0c0 3.5 3 7 7 10z"/><path d="M12 3c-1.5 3-3 4.5-3 7a3 3 0 0 0 6 0c0-2.5-1.5-4-3-7z"/>',
  device:  '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M9 6h6M9 10h6"/><circle cx="12" cy="16.5" r="1.6"/>',
  tool:    '<path d="M14.5 5.5a4 4 0 0 0 5 5l-9 9a2.8 2.8 0 0 1-4-4z"/>',
  calendar:'<path d="M9 3v4M15 3v4M4 8h16M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><path d="M9 13h6M9 17h4"/>',
  search:  '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  circle:  '<circle cx="12" cy="12" r="7.5"/>',
  balloon: '<path d="M6 21V10a6 6 0 0 1 12 0v3"/><path d="M18 13c0 2.5-1.5 4-3.5 4S11 15.5 11 13"/>',
  scan:    '<path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16"/><path d="M7 12h10"/>',
  ruler:   '<path d="M3 15 15 3l6 6L9 21z"/><path d="M7 11l2 2M10 8l2 2M13 5l2 2"/>',
  preg:    '<circle cx="12" cy="4.5" r="2"/><path d="M12 7c-2 0-3 1.5-3 3.5 0 3 3 3.5 3 6.5v4"/><path d="M12 10.5c2.5 0 4 1.5 4 4s-1.5 3.5-4 3.5"/>',
  puzzle:  '<path d="M9 3h6v3a2 2 0 1 0 3 2h3v6h-3a2 2 0 1 0-2 3v3H9v-3a2 2 0 1 0-3-2H3V9h3a2 2 0 1 0 2-3z"/>',
  cycle:   '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 4v4h-4"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 20v-4h4"/>',
  clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  hospital:'<path d="M3 21V8l9-5 9 5v13"/><path d="M12 10v5M9.5 12.5h5"/>',
};

// Emoji des données → clé d'icône. Tout ce qui n'est pas listé
// retombe sur un point neutre plutôt que d'afficher un emoji.
const ICON_ALIAS = {
  "🫀":"heart","❤️":"heart","💔":"heart","💓":"heart","💗":"heart","💪":"heart","🕊️":"heart",
  "📈":"pulse","📉":"pulse","〰️":"pulse","📊":"pulse","📶":"pulse",
  "⚡":"bolt","🔌":"bolt","🔋":"bolt","⚙️":"bolt","🌩️":"bolt",
  "🩸":"drop","💧":"drop","🌊":"drop","🌿":"drop","🥗":"drop","🍽️":"drop","🫧":"drop","🚽":"drop",
  "🫁":"lungs",
  "🧪":"flask","🔬":"flask","⚗️":"flask","🧫":"flask","🍬":"flask","🧂":"flask","🧈":"flask",
  "🚨":"alert","⚠️":"alert","⚠":"alert","❗":"alert","‼️":"alert","🛑":"alert","❌":"alert","💥":"alert",
  "☠️":"alert","💀":"alert","☢️":"alert","⛔":"alert","🚫":"alert","🚩":"alert","😵":"alert","🚭":"alert",
  "💊":"pill","🧴":"pill",
  "💉":"syringe","🩹":"syringe",
  "🩺":"stetho","👂":"stetho",
  "🧮":"calc","🔢":"calc","➗":"calc",
  "🦠":"microbe",
  "🎯":"target","⭐":"target","🌟":"target","✨":"target","🆕":"target",
  "🏃":"run","🏋️":"run","🚴":"run","⛹️":"run",
  "🧬":"dna","👶":"dna","👨‍👩‍👧":"dna",
  "🛡️":"shield","🦺":"shield","✅":"shield","☑️":"shield","🎗️":"shield","🔒":"shield","🤚":"shield",
  "🔥":"flame","🌡️":"flame","🕯️":"flame",
  "📟":"device","⌚":"device","📱":"device","🖨️":"device","🎛️":"device",
  "🔧":"tool","🔨":"tool","🪛":"tool","🔪":"tool","⚔️":"tool","🦾":"tool","🧰":"tool",
  "🏥":"hospital","🏨":"hospital","➕":"hospital","🏠":"hospital",
  "📅":"calendar","🗓️":"calendar",
  "⏱️":"clock","⏰":"clock","🕐":"clock","⌛":"clock","💤":"clock","😴":"clock","🐢":"clock","⏳":"clock",
  "🔍":"search","🔎":"search","👁️":"search","👀":"search","❓":"search",
  "🔴":"circle","🔵":"circle","🟢":"circle","🟡":"circle","🟣":"circle","🟠":"circle","⚫":"circle","⚪":"circle",
  "🔘":"circle","⭕":"circle","👤":"circle","👥":"circle","👴":"circle","🧑":"circle","😌":"circle","1️⃣":"circle",
  "2️⃣":"circle","3️⃣":"circle",
  "🎈":"balloon",
  "🩻":"scan","🧲":"scan","📡":"scan","📷":"scan","🖥️":"scan","🦴":"scan","🦵":"scan","🦷":"scan",
  "📐":"ruler","📏":"ruler","⚖️":"ruler","⚖":"ruler",
  "🤰":"preg","🍼":"preg","🤱":"preg",
  "🧩":"puzzle","🧠":"puzzle","🗂️":"puzzle","📋":"puzzle","📝":"puzzle","📄":"puzzle","📚":"puzzle","🔤":"puzzle",
  "🔄":"cycle","🔀":"cycle","♻️":"cycle","🔁":"cycle","🧭":"cycle","➡️":"cycle","↔️":"cycle","🔗":"cycle",
  "💫":"cycle","🌀":"cycle","🔺":"cycle","🔻":"cycle",
};

// `name` accepte indifféremment une clé ("heart") ou un emoji hérité ("🫀").
function Icon({ name, size = 16, stroke = 1.6, style }) {
  let key = ICON_PATHS[name] ? name : null;
  if (!key && name) {
    const bare = String(name).replace(/[️‍]/g, "");
    key = ICON_ALIAS[name] || ICON_ALIAS[bare] || null;
  }
  const d = key ? ICON_PATHS[key] : ICON_PATHS.circle;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false"
      style={{ flexShrink:0, display:"block", ...(style||{}) }}
      dangerouslySetInnerHTML={{ __html: d }} />
  );
}

// ─── Tiny shared components ───────────────────────────────────────
// Badge d'annotation (classe de recommandation, niveau de preuve).
// Aplat pour la classe, contour pour le niveau : deux poids visuels
// distincts sans recourir à deux couleurs.
const Badge = ({ color, children, outline }) => {
  const t = tone(color);
  return (
    <span style={{
      background: outline ? "transparent" : t,
      color: outline ? t : "var(--cg-on-accent)",
      border: outline ? `1px solid ${t}` : "1px solid transparent",
      borderRadius:3, padding:"2.5px 7px", fontSize:10, fontWeight:560,
      letterSpacing:"0.045em", textTransform:"uppercase", whiteSpace:"nowrap",
    }}>{children}</span>
  );
};

const Arr = ({ color }) => (
  <div style={{ display:"flex", justifyContent:"center", margin:"6px 0" }}>
    <svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true">
      <line x1="7" y1="0" x2="7" y2="13" stroke={BDR2} strokeWidth="1.5"/>
      <path d="M3 13l4 5 4-5" fill="none" stroke={BDR2} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const Sec = ({ title, color }) => (
  <div style={{ display:"flex", alignItems:"center", gap:9, margin:"22px 0 10px" }}>
    <div style={{ width:2.5, height:15, background:tone(color), borderRadius:2, flexShrink:0 }}/>
    <span style={{ color:INK, fontFamily:SERIF, fontWeight:600, fontSize:15.5,
      letterSpacing:"-0.005em", lineHeight:1.25 }}>{title}</span>
  </div>
);

// Navigation globale exposée aux composants de contenu (liens croisés)
const NAV = { go: null };
// Lien croisé « voir aussi » : ouvre une autre fiche
// target = { kind, chapterKey?, topicKey? } (comme un résultat de recherche)
const SeeAlso = ({ items }) => (
  <div style={{ marginTop:16, marginBottom:4 }}>
    <div style={{ fontSize:10, fontWeight:660, color:DIM, textTransform:"uppercase",
      letterSpacing:"0.08em", marginBottom:8 }}>Voir aussi</div>
    <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
      {items.map((it, i) => (
        <button key={i} onClick={() => NAV.go && NAV.go(it.target)} style={{
          display:"inline-flex", alignItems:"center", gap:7,
          background:PANEL, border:`1px solid ${BDR}`, borderRadius:6,
          padding:"7px 11px", cursor:"pointer", fontSize:12.5, fontWeight:520,
          color:TXT, fontFamily:"inherit", minHeight:36,
          transition:"border-color 0.12s, color 0.12s",
        }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor="var(--cg-accent-line)"; e.currentTarget.style.color="var(--cg-accent)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--cg-bdr)"; e.currentTarget.style.color="var(--cg-txt)"; }}
        >
          {it.label}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      ))}
    </div>
  </div>
);

// Option cliquable d'un algorithme. Surface plate, bordure fine :
// la couleur ne sert qu'au survol, pas à la décoration permanente.
// Hauteur minimale de 44 px — cible tactile iOS.
const Btn = ({ title, subtitle, color, onClick }) => {
  const t = tone(color);
  return (
    <div onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); onClick && onClick(); } }}
      style={{
        background:PANEL, border:`1px solid ${BDR}`, borderRadius:8,
        padding:"12px 14px", cursor:"pointer", minHeight:44,
        display:"flex", alignItems:"center", gap:12,
        transition:"border-color 0.12s, background 0.12s",
      }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=t; e.currentTarget.style.background="var(--cg-accent-soft)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--cg-bdr)"; e.currentTarget.style.background="var(--cg-panel)"; }}
    >
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ color:INK, fontWeight:560, fontSize:13.5, letterSpacing:"-0.005em", lineHeight:1.35 }}>{title}</div>
        {subtitle && <div style={{ color:MUT, fontSize:11.5, marginTop:2, lineHeight:1.4 }}>{subtitle}</div>}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        style={{ color:DIM, flexShrink:0 }} aria-hidden="true">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </div>
  );
};

// Conclusion d'un algorithme. Le filet de gauche porte le sens ;
// la prop `icon` (emoji, héritée) est volontairement ignorée.
const Res = ({ title, classe, level, color, items }) => {
  const t = tone(color);
  const soft = t===OK ? "var(--cg-ok-soft)" : t===DANGER ? "var(--cg-danger-soft)"
             : t===WARN ? "var(--cg-warn-soft)" : "var(--cg-accent-soft)";
  const line = t===OK ? "var(--cg-ok-line)" : t===DANGER ? "var(--cg-danger-line)"
             : t===WARN ? "var(--cg-warn-line)" : "var(--cg-accent-line)";
  return (
    <div style={{
      background:soft, border:`1px solid ${line}`, borderLeft:`2.5px solid ${t}`,
      borderRadius:8, padding:"14px 16px", marginBottom:10,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
        marginBottom: items ? 9 : 0 }}>
        <span style={{ color:t, fontFamily:SERIF, fontWeight:600, fontSize:14.5,
          letterSpacing:"-0.005em", lineHeight:1.25 }}>{title}</span>
        {classe && <Badge color={color}>{classe}</Badge>}
        {level  && <Badge color={color} outline>Niveau {level}</Badge>}
      </div>
      {items && <ul style={{ margin:0, padding:0, listStyle:"none",
        display:"flex", flexDirection:"column", gap:5 }}>
        {items.map((d,i)=>(
          <li key={i} style={{ color:TXT, fontSize:12.5, lineHeight:1.5,
            paddingLeft:14, position:"relative" }}>
            <span style={{ position:"absolute", left:2, top:7, width:4, height:4,
              borderRadius:"50%", background:t, opacity:0.65 }}/>
            {d}
          </li>
        ))}
      </ul>}
    </div>
  );
};

const Info = ({ title, color, children }) => {
  const t = tone(color);
  return (
    <div style={{
      background:SURF, border:`1px solid ${BDR}`, borderLeft:`2.5px solid ${t}`,
      borderRadius:8, padding:"12px 15px", marginBottom:10,
    }}>
      {title && <div style={{ color:INK, fontWeight:620, fontSize:12.5,
        marginBottom:4, letterSpacing:"-0.005em" }}>{title}</div>}
      <div style={{ color:MUT, fontSize:12.5, lineHeight:1.55 }}>{children}</div>
    </div>
  );
};

// ─── Algorithm content per valve ─────────────────────────────────
function useValveAlgo(valve) {
  const [step, setStep] = useState("start");
  const [hist, setHist] = useState([]);
  const go   = n => { setHist(h=>[...h,step]); setStep(n); };
  const back  = () => { if(!hist.length) return; setStep(hist[hist.length-1]); setHist(h=>h.slice(0,-1)); };
  const reset = () => { setStep("start"); setHist([]); };
  return { step, hist, go, back, reset };
}

// ── RAC ──────────────────────────────────────────────────────────
function RACContent({ go, step }) {
  const c = VALVES.rac.color;
  switch(step) {
    case "start": return (<div>
      <SevereCriteria title="Critères de RA serré (ESC 2025)" criteria={[
        { param:"Vmax", value:"≥ 4,0 m/s" },
        { param:"Gradient moyen", value:"≥ 40 mmHg" },
        { param:"Surface valvulaire", value:"≤ 1,0 cm²" },
      ]}/>
      <Btn title="Critères de sévérité (léger / modéré / sévère)" color={c} onClick={()=>go("severity")}/>
      <div style={{ height:8 }}/>
      <Sec title="Le patient est-il symptomatique ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Symptomatique" subtitle="Dyspnée, angor, syncope" color={c} onClick={()=>go("symp")}/>
        <Btn title="Asymptomatique" subtitle="Pas de symptôme" color={c} onClick={()=>go("asymp")}/>
        <Btn title="Discordance gradient / surface" subtitle="SVA < 1 cm² mais gradient < 40 mmHg" color={c} onClick={()=>go("discord")}/>
      </div>
    </div>);
    case "severity": return (<div>
      <Sec title="Rétrécissement aortique — grades de sévérité" color={c}/>
      <GradeTable rows={[
        ["Vmax (m/s)","2,6–2,9","3,0–3,9","≥ 4,0"],
        ["Gradient moyen (mmHg)","< 20","20–39","≥ 40"],
        ["Surface valvulaire (cm²)","> 1,5","1,0–1,5","< 1,0"],
        ["Surface indexée (cm²/m²)","> 0,85","0,60–0,85","< 0,6"],
        ["Ratio de vitesses (CCVG/Ao)","> 0,50","0,25–0,50","< 0,25"],
      ]}/>
      <Info title="Formes particulières de RA serré" color={c}>
        Bas débit/bas gradient à FEVG altérée (échographie dobutamine pour distinguer vraie sténose vs pseudo-sténose) et bas débit/bas gradient paradoxal à FEVG préservée (score calcique au scanner) — surface ≤ 1,0 cm² mais gradient &lt; 40 mmHg. Voir la rubrique « Discordance gradient / surface ».
      </Info>
      <Info title="Confirmation d'un RA serré en cas de doute" color={c}>
        Score calcique aortique au scanner sans injection : sévère si &gt; 3000 UA (homme) / &gt; 1600 UA (femme), très probable si &gt; 2000 UA (homme) / &gt; 1200 UA (femme).
      </Info>
    </div>);
    case "symp": return (<div>
      <Res title="Intervention indiquée" classe="Classe I" level="B" color="#27AE60" icon="🏥"
        items={["RA serré + symptômes = indication formelle","Ne pas différer"]}/>
      <Arr color={c}/>
      <Sec title="TAVI ou SAVR ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="≥ 70 ans" subtitle="Anatomie fémorale favorable" color={c} onClick={()=>go("tavi")}/>
        <Btn title="< 70 ans" subtitle="Espérance de vie longue" color={c} onClick={()=>go("savr")}/>
        <Btn title="Haut risque chirurgical" subtitle="EuroSCORE élevé, fragilité" color={c} onClick={()=>go("highrisk")}/>
      </div>
    </div>);
    case "tavi": return (<div>
      <Res title="TAVI recommandé ≥ 70 ans" classe="Classe I" level="A" color={c} icon="🦾"
        items={["Nouveau seuil 2025 : abaissé de 75 à 70 ans","Valve tricuspide, voie fémorale","Heart Team obligatoire"]}/>
    </div>);
    case "savr": return (<div>
      <Res title="SAVR préféré < 70 ans" classe="Classe I" level="A" color="#9B59B6" icon="🫀"
        items={["Espérance de vie longue → durabilité","Valve mécanique si pas CI aux AVK","Lifetime management à planifier"]}/>
    </div>);
    case "highrisk": return (<div>
      <Res title="TAVI privilégié" classe="Classe I" level="A" color={c} icon="⚠️"
        items={["EuroSCORE élevé / fragilité","TAVI voie fémorale si compatible","Évaluation gériatrique recommandée"]}/>
    </div>);
    case "asymp": return (<div>
      <Sec title="Marqueurs de haut risque ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="FEVG < 50 %" color={c} onClick={()=>go("asymp_lvef50")}/>
        <Btn title="FEVG 50–55 % + bas risque" subtitle="Nouveau 2025" color={c} onClick={()=>go("asymp_lvef55")}/>
        <Btn title="Vmax > 5 m/s ou gradient ≥ 60 mmHg" color={c} onClick={()=>go("asymp_severe")}/>
        <Btn title="BNP élevé + progression rapide (> 0,3 m/s/an)" color={c} onClick={()=>go("asymp_bnp")}/>
        <Btn title="Test d'effort anormal" color={c} onClick={()=>go("asymp_effort")}/>
        <Btn title="Asympt. bas risque + haut gradient" subtitle="Early intervention (NOUVEAU 2025)" color={c} onClick={()=>go("asymp_early")}/>
        <Btn title="Aucun marqueur → Surveillance" color={MUT} onClick={()=>go("surveil")}/>
      </div>
    </div>);
    case "asymp_lvef50": return <Res title="RVAo indiqué" classe="Classe I" level="A" color="#27AE60" icon="🚨" items={["Indication même sans symptômes","Éliminer autres causes de dysfonction VG"]}/>;
    case "asymp_lvef55": return <Res title="RVAo à envisager" classe="Classe IIa" level="B" color="#C26A1C" icon="⚠️" items={["Nouveau critère 2025","Seulement si risque procédural faible","Études montrent surmortalité dès FEVG < 55%"]}/>;
    case "asymp_severe": return <Res title="RVAo à envisager" classe="Classe IIa" level="B" color="#C26A1C" icon="⚡" items={["Risque élevé d'événement dans les 12 mois","Test d'effort recommandé","Seulement si bas risque procédural"]}/>;
    case "asymp_bnp":    return <Res title="RVAo à envisager" classe="Classe IIa" level="B" color="#C26A1C" icon="📈" items={["BNP > 3× normale à 2 reprises","Progression Vmax > 0,3 m/s/an","Bas risque requis"]}/>;
    case "asymp_effort": return <Res title="RVAo indiqué" classe="Classe I" level="C" color="#27AE60" icon="🏃" items={["Symptômes à l'effort = patient réellement symptomatique","Chute TA > 20 mmHg = réponse anormale","Intervention sans délai"]}/>;
    case "asymp_early":  return <Res title="TAVI/RVAo précoce acceptable" classe="Classe IIa" level="A" color={c} icon="🆕" items={["Basé sur essai Early-TAVR (2025)","Asymptomatique, épreuve effort négative, bas risque","Rupture avec les éditions précédentes","Décision partagée avec le patient"]}/>;
    case "discord": return (<div>
      <Info title="Discordance : SVA < 1 cm² mais gradient < 40 mmHg" color={c}>
        Vérifier d'abord : mesure CCVG, alignement Doppler, PA, SVA indexée, VESi
      </Info>
      <Sec title="Phénotype ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="BDBG classique : FEVG < 50% + VESi ≤ 35 ml/m²" color={c} onClick={()=>go("lflg_c")}/>
        <Btn title="BDBG paradoxal : FEVG ≥ 50% + VESi ≤ 35 ml/m²" color={c} onClick={()=>go("lflg_p")}/>
        <Btn title="Bas gradient débit normal : FEVG ≥ 50% + VESi normal" color={c} onClick={()=>go("nlg")}/>
      </div>
    </div>);
    case "lflg_c": return (<div>
      <Info title="BDBG classique" color={c}>Score Ca CT + écho dobutamine (équivalents en 2025)</Info>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="RA vrai sévère confirmé" color="#27AE60" onClick={()=>go("lflg_true")}/>
        <Btn title="Pseudo-sévère" color="#EB5757" onClick={()=>go("lflg_pseudo")}/>
        <Btn title="Pas de réserve contractile" color="#C26A1C" onClick={()=>go("lflg_nores")}/>
      </div>
    </div>);
    case "lflg_true":  return <Res title="RVAo indiqué" classe="Classe I" level="B" color="#27AE60" icon="✅" items={["Score Ca > 2000 UA (H) / 1250 UA (F)","Symptômes + VG dysfonctionnel → intervenir sans délai"]}/>;
    case "lflg_pseudo":return <Res title="Pas d'intervention valvulaire" color={MUT} icon="🔄" items={["RA modéré fonctionnel","Optimiser traitement IC : IEC, BB, ARM, iSGLT2","Réévaluer à 3–6 mois"]}/>;
    case "lflg_nores": return <Res title="Heart Team — Décision individualisée" classe="Classe IIa" level="C" color="#C26A1C" icon="⚖️" items={["Pronostic défavorable dans tous les cas","Score Ca CT pour confirmer sévérité","TAVI préféré si décision d'intervenir"]}/>;
    case "lflg_p": return (<div>
      <Info title="Seuils score Ca TDM (ESC 2025)" color={c}>
        Femme : &gt;1600 UA très probable · &gt;1200 probable · &lt;800 peu probable{"\n"}
        Homme : &gt;3000 UA très probable · &gt;2000 probable · &lt;1600 peu probable
      </Info>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Score élevé → RA serré confirmé" color="#27AE60" onClick={()=>go("lflg_para_sev")}/>
        <Btn title="Score bas → RA non serré" color={MUT} onClick={()=>go("lflg_para_no")}/>
      </div>
    </div>);
    case "lflg_para_sev": return <Res title="RVAo à envisager si symptomatique" classe="Classe IIa" level="C" color="#C26A1C" icon="⚠️" items={["Contrôler HTA en premier","TAVI préféré chez femme âgée"]}/>;
    case "lflg_para_no":  return <Res title="Traitement médical + surveillance" color={MUT} icon="💊" items={["Optimiser HTA","Réévaluation ETT à 6–12 mois"]}/>;
    case "nlg": return <Res title="Réviser les mesures + score Ca CT + planimétrie" color="#F2C94C" icon="🔍" items={["Revoir diamètre CCVG (erreur n°1)","Scanner pour planimétrie valve","IRM ou cathétérisme si discordance persistante"]}/>;
    case "surveil": return (<div>
      <Info title="Rythme de surveillance" color={MUT}>
        RA modéré → ETT 1–2 ans · RA serré → ETT 6–12 mois · Très serré → ETT 6 mois
      </Info>
      <Info color={MUT}>Surveillance : FEVG, Vmax, BNP, symptômes à chaque consultation</Info>
    </div>);
    default: return null;
  }
}

// ── IAo ──────────────────────────────────────────────────────────
function IAoContent({ go, step }) {
  const c = VALVES.iao.color;
  switch(step) {
    case "start": return (<div>
      <SevereCriteria title="Critères d'IAo sévère (ESC 2025)" criteria={[
        { param:"Jet / CCVG", value:"≥ 65%" },
        { param:"Vena contracta", value:"> 6 mm" },
        { param:"Volume régurg.", value:"≥ 60 mL" },
        { param:"Fraction régurg.", value:"≥ 50%" },
        { param:"EROA", value:"≥ 30 mm²" },
        { param:"VDTel", value:"> 50 mm" },
      ]}/>
      <Btn title="Critères de sévérité (léger / modéré / sévère)" color={c} onClick={()=>go("severity")}/>
      <div style={{ height:8 }}/>
      <Sec title="Type ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="IAo aiguë" subtitle="Endocardite, dissection, traumatisme" color="#EB5757" onClick={()=>go("acute")}/>
        <Btn title="⏱️ IAo chronique" subtitle="Maladie annuloectasiante, bicuspide" color={c} onClick={()=>go("chronic")}/>
      </div>
    </div>);
    case "severity": return (<div>
      <Sec title="Insuffisance aortique — grades de sévérité" color={c}/>
      <GradeTable rows={[
        ["Largeur jet / CCVG (%)","< 25","25–64","≥ 65"],
        ["Vena contracta (mm)","< 3","3–6","> 6"],
        ["EROA (mm²)","< 10","10–29","≥ 30"],
        ["Volume régurgitant (mL/bat)","< 30","30–59","≥ 60"],
        ["Fraction régurgitante (%)","< 30","30–49","≥ 50"],
        ["PHT (ms)","> 500","200–500","< 200"],
        ["Flux diastolique aorte desc.","Bref proto","Intermédiaire","Holodiastolique inversé"],
      ]}/>
      <Info title="Signes indirects de sévérité" color={c}>
        Dilatation du VG (retentissement d'une IAo chronique volumique), inversion holodiastolique du flux dans l'aorte descendante (voire abdominale si très sévère), PHT court traduisant l'égalisation rapide des pressions aorte–VG.
      </Info>
    </div>);
    case "acute": return (<div>
      <Res title="Intervention urgente" classe="Classe I" level="B" color="#EB5757" icon="🚨"
        items={["IAo aiguë = urgence cardiaque","Vasodilatateurs IV en pont","SAVR sans délai","TAVI contre-indiqué en aigu"]}/>
      <Arr color="#EB5757}"/>
      <Sec title="Étiologie ?" color="#EB5757"/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Endocardite infectieuse" color="#EB5757" onClick={()=>go("endocard")}/>
        <Btn title="Dissection aortique type A" color="#EB5757" onClick={()=>go("dissec")}/>
      </div>
    </div>);
    case "endocard": return <Res title="Chirurgie urgente + ATB" classe="Classe I" level="B" color="#27AE60" icon="🔴" items={["ATB préop 24–72h minimum","Urgence si décompensation, sepsis, abcès","Cure radicale + traitement valvulaire"]}/>;
    case "dissec":   return <Res title="Chirurgie aortique d'urgence" classe="Classe I" level="A" color="#27AE60" icon="⚡" items={["Remplacement aorte ascendante = priorité","RVAo concomitant si IAo sévère","TAVI absolument contre-indiqué"]}/>;
    case "chronic": return (<div>
      <Sec title="Retentissement VG ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="FEVG ≤ 50 %" color="#EB5757" onClick={()=>go("lvef50")}/>
        <Btn title="VDTel > 50 mm (ou > 25 mm/m²)" color="#C26A1C" onClick={()=>go("dilat")}/>
        <Btn title="Symptômes d'effort confirmés" color="#EB5757" onClick={()=>go("symp_ef")}/>
        <Btn title="FEVG 45–50 % première baisse" color="#C26A1C" onClick={()=>go("lvef45")}/>
        <Btn title="VG normal, asymptomatique" color={MUT} onClick={()=>go("surveil")}/>
      </div>
    </div>);
    case "lvef50":  return <Res title="Chirurgie indiquée" classe="Classe I" level="B" color="#27AE60" icon="🏥" items={["Même sans symptômes","SAVR standard · TAVI si inopérable + anatomie favorable (IIb)"]}/>;
    case "dilat":   return <Res title="Chirurgie indiquée" classe="Classe I" level="B" color="#27AE60" icon="📏" items={["Dilatation VG significative = indication","Évaluer aorte ascendante (> 50 mm → remplacement)"]}/>;
    case "symp_ef": return <Res title="Chirurgie indiquée" classe="Classe I" level="B" color="#27AE60" icon="🏃" items={["Symptômes même minimes → opérer","Ne pas attendre la dépression FEVG"]}/>;
    case "lvef45":  return <Res title="Chirurgie indiquée" classe="Classe I" level="B" color="#27AE60" icon="📉" items={["Intervenir avant FEVG < 45%","Meilleur pronostic post-op"]}/>;
    case "surveil": return (<div>
      <Info title="Suivi IAo asymptomatique" color={c}>
        &lt;60 ans : ETT 6–12 mois + effort annuel · 60–70 ans : ETT 6–12 mois · &gt;70 ans : ETT annuelle
      </Info>
      <Info color="#EB5757">Alertes → intervenir : symptômes nouveaux, FEVG ≤ 50%, VDTel &gt; 50 mm, nouvelle FA</Info>
    </div>);
    default: return null;
  }
}

// ── IM ───────────────────────────────────────────────────────────
function IMContent({ go, step }) {
  const c = VALVES.im.color;
  switch(step) {
    case "start": return (<div>
      <SevereCriteria title="Critères d'IM sévère (ESC 2025)" criteria={[
        { param:"EROA primaire", value:"≥ 40 mm²" },
        { param:"Vena contracta", value:"≥ 7 mm" },
        { param:"Volume régurg.", value:"≥ 60 mL" },
        { param:"Fraction régurg.", value:"≥ 50%" },
        { param:"EROA secondaire", value:"≥ 40 mm²" },
      ]} note="En IM secondaire (fonctionnelle), une IM est déjà pronostiquement significative dès EROA ≥ 20 mm² / volume ≥ 30 mL."/>
      <Btn title="Critères de sévérité (léger / modéré / sévère)" color={c} onClick={()=>go("severity")}/>
      <div style={{ height:8 }}/>
      <Sec title="Type d'IM ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="IM primaire" subtitle="Prolapsus, flail, endocardite, rhumatisme" color={c} onClick={()=>go("prim")}/>
        <Btn title="IM secondaire ventriculaire" subtitle="Cardiomyopathie, ischémie, dilatation VG" color="#C26A1C" onClick={()=>go("secv")}/>
        <Btn title="IM secondaire atriale" subtitle="FA chronique, dilatation atriale" color="#9B59B6" onClick={()=>go("seca")}/>
      </div>
    </div>);
    case "severity": return (<div>
      <Sec title="IM primaire (organique) — grades" color={c}/>
      <GradeTable rows={[
        ["Vena contracta (mm)","< 3","3–6,9","≥ 7"],
        ["EROA (mm²)","< 20","20–39","≥ 40"],
        ["Volume régurgitant (mL/bat)","< 30","30–59","≥ 60"],
        ["Fraction régurgitante (%)","< 30","30–49","≥ 50"],
      ]}/>
      <Info title="Seuils abaissés pour l'IM secondaire" color="#C26A1C">
        En IM secondaire (fonctionnelle), le seuil de sévérité est plus bas : EROA ≥ 40 mm² et volume régurgitant ≥ 60 mL restent les repères de sévérité, mais une IM est déjà pronostiquement significative dès EROA ≥ 20 mm² / volume ≥ 30 mL dans ce contexte (myocarde pathologique).
      </Info>
      <GradeTable rows={[
        ["EROA secondaire (mm²)","< 20","20–39","≥ 40"],
        ["Volume régurg. secondaire (mL)","< 30","30–59","≥ 60"],
      ]}/>
      <Info title="Signes qualitatifs de sévérité" color={c}>
        Flux de régurgitation systolique inversé dans les veines pulmonaires, onde E mitrale ample (&gt; 1,2 m/s), zone de convergence (PISA) large, jet excentré heurtant la paroi atriale (souvent une sous-estimation en Doppler couleur).
      </Info>
    </div>);
    case "prim": return (<div>
      <Sec title="Symptomatique ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Symptomatique" color="#EB5757" onClick={()=>go("prim_symp")}/>
        <Btn title="Asymptomatique" color={c} onClick={()=>go("prim_asymp")}/>
      </div>
    </div>);
    case "prim_symp": return <Res title="Réparation mitrale indiquée" classe="Classe I" level="B" color="#27AE60" icon="🏥" items={["Réparation = or standard","Résultats supérieurs au remplacement","Mini-thoracotomie si centre expert","ETO pour planification chirurgicale"]}/>;
    case "prim_asymp": return (<div>
      <Info title="NOUVEAUTÉ 2025 — Classe I" color={c}>Réparation si ≥ 3 facteurs de risque + bas risque chirurgical</Info>
      <div style={{ background:CARD, borderRadius:8, padding:"10px 12px", marginBottom:8, border:`1px solid ${BDR}` }}>
        <div style={{ color:TXT, fontWeight:560, fontSize:11, marginBottom:6 }}>Facteurs de risque :</div>
        {["FA documentée","HTAP (PAPS > 50 mmHg)","Dilatation OG (> 60 mL/m² ou > 55 mm)","DTSVG ≥ 40 mm (ou ≥ 21 mm/m²)","FEVG 50–60%","IT sévère concomitante"].map((f,i)=>(
          <div key={i} style={{ color:MUT, fontSize:11, padding:"2px 0", borderBottom:`1px solid ${BDR}` }}>{f}</div>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="≥ 3 facteurs + bas risque" color="#27AE60" onClick={()=>go("prim_3fac")}/>
        <Btn title="1–2 facteurs" color="#C26A1C" onClick={()=>go("prim_1fac")}/>
        <Btn title="Aucun facteur" color={MUT} onClick={()=>go("prim_surveil")}/>
      </div>
    </div>);
    case "prim_3fac":   return <Res title="Réparation recommandée" classe="Classe I" level="B" color="#27AE60" icon="✅" items={["Nouveau standard 2025","Prévient dégradation VG irréversible","Décision Heart Team + patient"]}/>;
    case "prim_1fac":   return <Res title="Surveillance rapprochée ± réparation" classe="Classe IIa" level="B" color="#C26A1C" icon="⚖️" items={["ETT 3–6 mois","Test d'effort recommandé","Décision individualisée Heart Team"]}/>;
    case "prim_surveil":return <Res title="Surveillance active" color={MUT} icon="👁️" items={["ETT annuelle","Rechercher symptômes à chaque visite"]}/>;
    case "secv": return (<div>
      <Info title="Toujours d'abord : optimisation traitement médical (Classe I)" color={c}>
        IEC/ARNI + BB + ARM + iSGLT2 + CRT si indication · Durée : 3–6 mois
      </Info>
      <Sec title="Après traitement optimal ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="IM sévère persistante + symptômes" color="#C26A1C" onClick={()=>go("secv_pers")}/>
        <Btn title="Fuite disproportionnée (EROA > 0,4 cm², VG modéré)" color="#C26A1C" onClick={()=>go("secv_disp")}/>
        <Btn title="Amélioration sous traitement" color="#27AE60" onClick={()=>go("secv_impr")}/>
      </div>
    </div>);
    case "secv_pers": return <Res title="TEER (MitraClip) ou plastie chirurgicale" classe="Classe IIa" level="B" color="#C26A1C" icon="⚖️" items={["TEER Classe I niveau A si FEVG < 50% + critères COAPT","Plastie chirurgicale si bas risque","Sélection stricte Heart Team"]}/>;
    case "secv_disp": return <Res title="TEER possible" classe="Classe IIb" level="B" color="#F2C94C" icon="⚡" items={["EROA > 0,4 cm² + VG peu dilaté (VTDi < 97 mL/m²)","Pas de niveau A sur bénéfice pronostique","Décision Heart Team + IRM"]}/>;
    case "secv_impr": return <Res title="Poursuite traitement + surveillance" color="#27AE60" icon="✅" items={["Continuer traitement optimal","ETT 6–12 mois"  ]}/>;
    case "seca": return (<div>
      <Info title="Traitement médical en premier" color="#9B59B6">Contrôle FC/FA · HTA · Diurétiques · Anticoagulation si FA · IEC/ARNi</Info>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="IM sévère + symptômes réfractaires" color="#C26A1C" onClick={()=>go("seca_symp")}/>
        <Btn title="IM sévère asymptomatique" color={MUT} onClick={()=>go("seca_asymp")}/>
      </div>
    </div>);
    case "seca_symp":  return <Res title="Plastie chirurgicale ± ablation FA" classe="Classe IIa" level="B" color="#C26A1C" icon="⚖️" items={["Annuloplastie TV + ablation FA concomitantes","TEER si inopérable (Classe IIb)"]}/>;
    case "seca_asymp": return <Res title="Surveillance" color={MUT} icon="👁️" items={["Traitement causal (FA, HTA) en priorité","ETT 6–12 mois · Intervenir si symptômes"]}/>;
    default: return null;
  }
}

// ── RM ───────────────────────────────────────────────────────────
function RMContent({ go, step }) {
  const c = VALVES.rm.color;
  switch(step) {
    case "start": return (<div>
      <SevereCriteria title="Critères de RM serré (ESC 2025)" criteria={[
        { param:"Surface mitrale", value:"≤ 1,5 cm²" },
        { param:"Gradient moyen", value:"≥ 5 mmHg" },
        { param:"PAPS", value:"> 50 mmHg" },
      ]} note="RM très serré si surface < 1,0 cm². Le gradient moyen dépend de la FC et du débit — à interpréter avec prudence en cas de tachycardie ou de FA."/>
      <Btn title="Critères de sévérité (léger / modéré / sévère)" color={c} onClick={()=>go("severity")}/>
      <div style={{ height:8 }}/>
      <Sec title="Étiologie ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="RM rhumatismal" subtitle="Fusion commissurale, RAA" color={c} onClick={()=>go("rhumato")}/>
        <Btn title="RM dégénératif / MAC" subtitle="Calcification annulaire, sujet âgé" color="#F2C94C" onClick={()=>go("mac")}/>
      </div>
    </div>);
    case "severity": return (<div>
      <Sec title="Rétrécissement mitral — grades de sévérité" color={c}/>
      <GradeTable rows={[
        ["Surface mitrale (cm²)","> 1,5","1,5–1,0","< 1,0"],
        ["Gradient moyen (mmHg)","< 5","5–10","> 10"],
        ["PAPS (mmHg)","< 30","30–50","> 50"],
      ]}/>
      <Info title="Précisions méthodologiques" color={c}>
        La surface est mesurée par planimétrie directe (référence), par PHT (temps de demi-décroissance de pression) ou par équation de continuité. Le gradient moyen dépend de la fréquence cardiaque et du débit — à interpréter avec prudence en cas de tachycardie ou de FA. Un RM est dit « serré » (sévère) dès une surface ≤ 1,5 cm² selon l'ESC, avec un stade « très serré » &lt; 1,0 cm².
      </Info>
    </div>);
    case "rhumato": return (<div>
      <Info title="Score de Wilkins (PMC éligibilité)" color={c}>
        Mobilité · Épaisseur · Calcifications · Sous-valvulaire — 4 critères × 4 = max 16{"\n"}
        ≤ 8 → anatomie favorable (PMC) · &gt; 8 → anatomie défavorable (chirurgie)
      </Info>
      <Sec title="Situation clinique ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Symptomatique" color="#EB5757" onClick={()=>go("symp")}/>
        <Btn title="Asymptomatique" color={c} onClick={()=>go("asymp")}/>
        <Btn title="Grossesse" color="#9B59B6" onClick={()=>go("grossesse")}/>
      </div>
    </div>);
    case "symp": return (<div>
      <Info title="Contre-indications PMC à vérifier" color="#C26A1C">
        Thrombus OG (ETO obligatoire) · IM ≥ 2/4 · Calcif bicommissurale · Coronaropathie nécessitant pontage
      </Info>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Anatomie favorable + pas CI (Wilkins ≤ 8)" color="#27AE60" onClick={()=>go("pmc")}/>
        <Btn title="Anatomie défavorable OU CI PMC" color="#EB5757" onClick={()=>go("chir")}/>
      </div>
    </div>);
    case "pmc": return <Res title="PMC indiquée" classe="Classe I" level="A" color="#27AE60" icon="🎯" items={["ETO préalable : exclure thrombus OG","Technique Inoue en centre expert","Surface cible post-PMC > 1,5 cm²","Résultats équivalents à la chirurgie si anatomie favorable"]}/>;
    case "chir": return <Res title="Remplacement valvulaire mitral" classe="Classe I" level="B" color="#27AE60" icon="🏥" items={["Anatomie défavorable ou CI PMC","Valve mécanique préférée (AVK à vie)","Plastie chirurgicale si non calcifiée + expertise"]}/>;
    case "asymp": return (<div>
      <Sec title="Facteurs de risque ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="FA paroxystique ou risque embolique" color="#C26A1C" onClick={()=>go("fa_risk")}/>
        <Btn title="HTAP > 50 mmHg" color="#C26A1C" onClick={()=>go("htap")}/>
        <Btn title="Test d'effort anormal" color="#C26A1C" onClick={()=>go("effort")}/>
        <Btn title="Aucun facteur → Surveillance" color={MUT} onClick={()=>go("surveil")}/>
      </div>
    </div>);
    case "fa_risk": return <Res title="PMC si anatomie favorable" classe="Classe IIa" level="B" color="#C26A1C" icon="⚡" items={["FA = risque embolie → PMC préventive","AVK impératifs si FA + RM","Wilkins ≤ 8 + pas CI → PMC réalisable"]}/>;
    case "htap":    return <Res title="PMC si anatomie favorable" classe="Classe IIa" level="B" color="#C26A1C" icon="📈" items={["HTAP signe de décompensation précoce","PMC améliore les pressions pulmonaires","Éviter dysfonction VD irréversible"]}/>;
    case "effort":  return <Res title="PMC à envisager" classe="Classe IIa" level="C" color="#C26A1C" icon="🏃" items={["Test effort + = patient symptomatique","PMC si Wilkins ≤ 8","Chirurgie si anatomie défavorable"]}/>;
    case "surveil": return (<div>
      <Info title="Rythme de suivi" color={MUT}>
        RM modéré → ETT 1–2 ans · RM serré → ETT annuelle · RM très serré → ETT 6 mois + test effort
      </Info>
      <Info color={MUT}>Traitement médical : BB (contrôle FC) · Diurétiques · AVK si FA · Prophylaxie RAA</Info>
    </div>);
    case "grossesse": return <Res title="PMC après 20 SA si symptômes réfractaires" classe="Classe IIa" level="C" color="#9B59B6" icon="🤰" items={["BB + diurétiques en 1ère intention","PMC possible > 20 semaines d'aménorrhée","Radioprotection fœtale obligatoire","Chirurgie à cœur ouvert à éviter (risque fœtal élevé)"]}/>;
    case "mac": return (<div>
      <Info title="RM dégénératif / MAC — PMC contre-indiquée" color="#F2C94C">
        Patients âgés, calcifications annulaires diffuses. Risque chirurgical très élevé.
      </Info>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="RM sévère + haut risque chirurgical" color="#EB5757" onClick={()=>go("mac_high")}/>
        <Btn title="RM sévère + risque chirurgical acceptable" color="#C26A1C" onClick={()=>go("mac_surg")}/>
        <Btn title="RM modéré ou asymptomatique" color={MUT} onClick={()=>go("mac_surveil")}/>
      </div>
    </div>);
    case "mac_high":    return <Res title="TMVI transcathéter à envisager" classe="Classe IIb" level="C" color="#F2C94C" icon="🆕" items={["NOUVEAUTÉ ESC 2025","Centre expert Heart Valve Centre uniquement","Risques : obstruction CCVG, thrombose, durabilité","Heart Team obligatoire"]}/>;
    case "mac_surg":    return <Res title="RVM chirurgical" classe="Classe IIa" level="B" color="#C26A1C" icon="🏥" items={["Techniquement complexe : décalcification annulaire","Centre expérimenté recommandé"]}/>;
    case "mac_surveil": return <Res title="Traitement médical + surveillance ETT annuelle" color={MUT} icon="👁️" items={["Diurétiques si congestion","Contrôle facteurs de risque CV"]}/>;
    default: return null;
  }
}

// ── IT ───────────────────────────────────────────────────────────
function ITContent({ go, step }) {
  const c = VALVES.it.color;
  switch(step) {
    case "start": return (<div>
      <SevereCriteria title="Critères d'IT sévère (ESC 2025)" criteria={[
        { param:"EROA", value:"≥ 40 mm²" },
        { param:"Vena contracta", value:"≥ 7 mm" },
        { param:"Volume régurg.", value:"≥ 45 mL" },
      ]} note="90% des IT sont secondaires. Gradation étendue au-delà de « sévère » : massive (VC 14–20 mm) et torrentielle (VC ≥ 21 mm)."/>
      <Info title="NOUVEAUTÉ 2025 — Heart Team obligatoire (Classe I)" color={c}>
        Toute intervention en IT sévère doit être précédée d'une évaluation Heart Team complète (sévérité, fonction VD, pressions pulmonaires, risque opératoire).
      </Info>
      <Btn title="Critères de sévérité (léger / modéré / sévère)" color={c} onClick={()=>go("severity")}/>
      <div style={{ height:8 }}/>
      <Sec title="Étiologie ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="IT primaire (organique)" subtitle="Prolapsus, endocardite, Ebstein, carcinoïde" color={c} onClick={()=>go("prim")}/>
        <Btn title="IT secondaire ventriculaire" subtitle="Dilatation VD, HTP, cardiopathie gauche" color="#C26A1C" onClick={()=>go("secv")}/>
        <Btn title="IT secondaire atriale" subtitle="FA chronique, dilatation OD" color="#9B59B6" onClick={()=>go("seca")}/>
        <Btn title="IT sur CIED / Sonde" subtitle="PM / DAI traversant la valve" color="#F2C94C" onClick={()=>go("cied")}/>
      </div>
    </div>);
    case "severity": return (<div>
      <Sec title="Insuffisance tricuspide — grades de sévérité" color={c}/>
      <GradeTable rows={[
        ["Vena contracta (mm)","< 3","3–6,9","≥ 7"],
        ["EROA (mm²)","< 20","20–39","≥ 40"],
        ["Volume régurgitant (mL/bat)","< 30","30–44","≥ 45"],
        ["Largeur jet couleur","Petit central","Intermédiaire","Large / central étendu"],
      ]}/>
      <Info title="Gradation étendue (sévère → torrentielle)" color={c}>
        L'IT sévère est désormais subdivisée en formes plus avancées (« massive » et « torrentielle »), avec des vena contracta et EROA croissants (VC 14–20 mm, EROA 60–79 mm² pour « massive » ; VC ≥ 21 mm, EROA ≥ 80 mm² pour « torrentielle »). Cette gradation fine oriente le choix et l'urgence de l'intervention (chirurgie vs TEER/T-TVI).
      </Info>
      <Info title="Signes indirects de sévérité" color={c}>
        Inversion du flux systolique dans les veines sus-hépatiques (signe fiable de sévérité), dilatation de l'OD et de la VCI, dilatation de l'anneau tricuspide (≥ 40 mm ou ≥ 21 mm/m²), retentissement sur la fonction VD.
      </Info>
    </div>);
    case "prim": return (<div>
      <Sec title="Symptomatique ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Symptomatique (ICD, ascite, hépatomégalie)" color="#EB5757" onClick={()=>go("prim_symp")}/>
        <Btn title="Asymptomatique" color={c} onClick={()=>go("prim_asymp")}/>
      </div>
    </div>);
    case "prim_symp": return (<div>
      <Sec title="Fonction VD + HTAP précapillaire ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="VD conservé + pas d'HTAP précapillaire" subtitle="TAPSE > 17 mm, FAC > 35%" color="#27AE60" onClick={()=>go("prim_rv_ok")}/>
        <Btn title="Dysfonction VD ou HTAP précapillaire" subtitle="TAPSE < 14 mm, RVP > 3 UW" color="#EB5757" onClick={()=>go("prim_rv_no")}/>
      </div>
    </div>);
    case "prim_rv_ok": return <Res title="Chirurgie TV indiquée" classe="Classe I" level="B" color="#27AE60" icon="🏥" items={["Réparation TV = référence si anatomie favorable","Annuloplastie + plastie","RVM biologique si réparation impossible","Centre expert"]}/>;
    case "prim_rv_no": return <Res title="Traitement médical optimal" color="#C26A1C" icon="💊" items={["Chirurgie très haut risque","Diurétiques pour congestion","TTVI dans centres très experts","Réévaluer si amélioration"]}/>;
    case "prim_asymp": return (<div>
      <Sec title="Dilatation VD progressive ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Dilatation VD progressive documentée" color="#C26A1C" onClick={()=>go("prim_dilat")}/>
        <Btn title="VD normal → Surveillance" color={MUT} onClick={()=>go("surveil")}/>
      </div>
    </div>);
    case "prim_dilat": return <Res title="Chirurgie à envisager" classe="Classe IIa" level="C" color="#C26A1C" icon="⚠️" items={["Intervenir avant dysfonction VD irréversible","VDTd ≥ 42 mm ou VTD VD ≥ 100 mL/m²","Réparation TV préférable"]}/>;
    case "secv": return (<div>
      <Sec title="Contexte ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="IT lors d'une chirurgie valvulaire gauche" color="#1ABC9C" onClick={()=>go("conco")}/>
        <Btn title="IT isolée sévère symptomatique" color="#C26A1C" onClick={()=>go("secv_iso")}/>
      </div>
    </div>);
    case "conco": return (<div>
      <Res title="IT sévère → Réparation TV recommandée" classe="Classe I" level="B" color="#27AE60" icon="✅" items={["IT sévère lors de chirurgie mitrale/aortique → annuloplastie TV concomitante"]}/>
      <div style={{ marginTop:8 }}>
      <Res title="IT modérée + anneau ≥ 40 mm → Réparation à envisager" classe="Classe IIa" level="B" color="#C26A1C" icon="⚖️" items={["Annuloplastie TV préventive (données CTSN 2022)","Éviter progression IT post-op"]}/>
      </div>
    </div>);
    case "secv_iso": return (<div>
      <Info title="Traitement médical d'abord (Classe I)" color="#27AE60">
        Diurétiques · Traiter cause (HTP, cardiopathie gauche) · AVK si FA · Réévaluation 3 mois
      </Info>
      <Sec title="Après traitement : VD + HTAP précapillaire ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="VD conservé + pas HTAP précapillaire" color="#27AE60" onClick={()=>go("secv_rv_ok")}/>
        <Btn title="Dysfonction VD ou HTAP précapillaire" color="#EB5757" onClick={()=>go("secv_rv_no")}/>
      </div>
    </div>);
    case "secv_rv_ok": return (<div>
      <Res title="Chirurgie TV si risque acceptable" classe="Classe IIa" level="B" color="#27AE60" icon="🏥" items={["Annuloplastie TV","Candidat jeune, bon état, anatomie favorable"]}/>
      <div style={{ marginTop:8 }}>
      <Res title="TTVI transcathéter si haut risque" classe="Classe IIa" level="A" color={c} icon="🎯" items={["NOUVEAUTÉ 2025 : upgradé Classe IIa niveau A","T-TEER (TriClip, CLASP) ou remplacement (TRISCEND, EVOQUE)","Amélioration sympt. + remodelage VD documentés","Centre expert uniquement · pas RVD sévère ni pcPH"]}/>
      </div>
    </div>);
    case "secv_rv_no": return <Res title="Traitement médical optimal" color="#C26A1C" icon="💊" items={["Chirurgie : mortalité très élevée","TTVI : risque de futilité","Diurétiques agressifs · Traiter cause","Évaluer greffe cœur si insuffisance terminale"]}/>;
    case "seca": return (<div>
      <Info title="Mécanisme" color="#9B59B6">FA chronique → dilatation OD → dilatation anneau TV → IT fonctionnelle sans dilatation VD</Info>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="IT + chirurgie gauche programmée + FA" color="#9B59B6" onClick={()=>go("seca_chir")}/>
        <Btn title="IT isolée symptomatique" color="#C26A1C" onClick={()=>go("seca_iso")}/>
      </div>
    </div>);
    case "seca_chir": return <Res title="Annuloplastie TV + ablation FA concomitantes" classe="Classe IIa" level="B" color="#9B59B6" icon="⚡" items={["Annuloplastie TV si IT sévère ou anneau ≥ 40 mm","Ablation FA chirurgicale (labyrinthisation)","Occlusion appendice auriculaire gauche"]}/>;
    case "seca_iso":  return <Res title="Traitement médical + contrôle FA + discuter intervention" classe="Classe IIb" level="C" color="#F2C94C" icon="⚖️" items={["Contrôle FC / cardioversion","Anticoagulation systématique","Peu de données sur chirurgie/TTVI isolé","Heart Team décision individualisée"]}/>;
    case "cied": return (<div>
      <Info color="#F2C94C">Sonde PM/DAI traversant la valve → perforation ou entrapment de feuillet. Incidence : 7–30%</Info>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="IT légère–modérée → Surveillance" color="#27AE60" onClick={()=>go("cied_mild")}/>
        <Btn title="IT sévère symptomatique" color="#EB5757" onClick={()=>go("cied_sev")}/>
      </div>
    </div>);
    case "cied_mild": return <Res title="Surveillance active" color="#27AE60" icon="👁️" items={["ETT annuelle","Optimisation paramètres de stimulation"]}/>;
    case "cied_sev":  return <Res title="Extraction sonde + réparation/remplacement TV" classe="Classe IIa" level="C" color="#C26A1C" icon="🔧" items={["Extraction en centre expert (leads extraction team)","T-TEER possible malgré sonde si anatomie favorable","Remplacement TV biologique si réparation impossible","Sonde épicardiaque ou His bundle pacing"]}/>;
    case "surveil": return (<div>
      <Info title="Rythme de suivi" color={MUT}>
        IT légère–modérée → ETT 2–3 ans · IT sévère VD normal → ETT annuelle · IT sévère + début dilatation VD → ETT 6 mois
      </Info>
      <Info title="Paramètres VD à surveiller" color={c}>
        TAPSE (normal &gt; 17 mm) · FAC (normal &gt; 35%) · S' TDI (normal &gt; 9,5 cm/s) · Volume VD indexé · PAPS estimée
      </Info>
    </div>);
    default: return null;
  }
}

// ── ETT normale — Valeurs de référence ─────────────────────────────
function Table({ rows, cols }) {
  return (
    <div style={{ background:PANEL, border:`1px solid ${BDR}`, borderRadius:8,
      overflow:"hidden", marginBottom:10 }}>
      <div style={{ display:"grid", gridTemplateColumns:cols, background:SURF,
        padding:"8px 13px", borderBottom:`1px solid ${BDR}`, gap:8 }}>
        {rows[0].map((h,i)=>(
          <div key={i} style={{ color:MUT, fontSize:10, fontWeight:660,
            textTransform:"uppercase", letterSpacing:"0.055em" }}>{h}</div>
        ))}
      </div>
      {rows.slice(1).map((r,ri)=>(
        <div key={ri} style={{ display:"grid", gridTemplateColumns:cols, padding:"8px 13px",
          borderTop: ri===0?"none":`1px solid ${BDR}`, gap:8 }}>
          {r.map((v,ci)=>(
            <div key={ci} style={{ color: ci===0 ? INK : TXT, fontSize:12,
              fontWeight: ci===0?580:450, lineHeight:1.45,
              fontVariantNumeric: ci===0 ? "normal" : "tabular-nums" }}>{v}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Severity grading table: rows = [[paramLabel, mildVal, moderateVal, severeVal], ...]
function GradeTable({ rows }) {
  // La gradation se lit par le poids typographique, pas par un aplat de
  // couleur sur chaque cellule : seule la colonne « sévère » est accentuée.
  const heads = ["Paramètre","Léger","Modéré","Sévère"];
  return (
    <div style={{ background:PANEL, border:`1px solid ${BDR}`, borderRadius:8,
      overflow:"hidden", marginBottom:10 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr", background:SURF }}>
        {heads.map((h,i)=>(
          <div key={i} style={{
            color: i===3 ? DANGER : MUT, fontSize:10, fontWeight:660,
            letterSpacing:"0.055em", textTransform:"uppercase",
            padding:"8px 9px", textAlign: i===0?"left":"center",
            borderLeft: i>0 ? `1px solid ${BDR}` : "none",
          }}>{h}</div>
        ))}
      </div>
      {rows.map((r,ri)=>(
        <div key={ri} style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr",
          borderTop:`1px solid ${BDR}` }}>
          {r.map((v,ci)=>(
            <div key={ci} style={{
              color: ci===0 ? MUT : ci===3 ? INK : TXT,
              fontSize:11.5, fontWeight: ci===3 ? 620 : 450,
              padding:"8px 9px", textAlign: ci===0?"left":"center",
              borderLeft: ci>0 ? `1px solid ${BDR}` : "none",
              fontVariantNumeric: ci===0 ? "normal" : "tabular-nums",
              lineHeight:1.3,
            }}>{v || "—"}</div>
          ))}
        </div>
      ))}
    </div>
  );
}


// Severity criteria banner: title + array of {param, value} shown as red "severe" pills
// Encadré de critères de sévérité : présenté comme un tableau de valeurs
// seuils plutôt que comme une alerte. Les chiffres sont alignés (tabular-nums).
function SevereCriteria({ title, criteria, note }) {
  return (
    <div style={{ background:PANEL, border:`1px solid ${BDR}`, borderRadius:8,
      overflow:"hidden", marginBottom:14 }}>
      <div style={{ padding:"8px 14px", background:SURF, borderBottom:`1px solid ${BDR}`,
        color:MUT, fontSize:10, fontWeight:660, letterSpacing:"0.06em",
        textTransform:"uppercase" }}>{title}</div>
      {criteria.map((crit,i)=>(
        <div key={i} style={{
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
          padding:"9px 14px", fontSize:13,
          borderTop: i===0 ? "none" : `1px solid ${BDR}`,
        }}>
          <span style={{ color:MUT }}>{crit.param}</span>
          <span style={{ color:INK, fontWeight:600, fontVariantNumeric:"tabular-nums",
            whiteSpace:"nowrap" }}>{crit.value}</span>
        </div>
      ))}
      {note && <div style={{ color:MUT, fontSize:11.5, lineHeight:1.5,
        padding:"9px 14px", borderTop:`1px solid ${BDR}`, background:SURF }}>{note}</div>}
    </div>
  );
}

// ── Calculateurs de scores interactifs ───────────────────────────
// Bandeau de résultat partagé par ScoreCalc et ScoreCalcMulti.
// `res.color` vient du contenu médical : on le traduit en jeton.
function ScoreResult({ total, res }) {
  const t = tone(res.color);
  const soft = t===OK ? "var(--cg-ok-soft)" : t===DANGER ? "var(--cg-danger-soft)"
             : t===WARN ? "var(--cg-warn-soft)" : "var(--cg-accent-soft)";
  const line = t===OK ? "var(--cg-ok-line)" : t===DANGER ? "var(--cg-danger-line)"
             : t===WARN ? "var(--cg-warn-line)" : "var(--cg-accent-line)";
  return (
    <div style={{ background:soft, border:`1px solid ${line}`, borderLeft:`2.5px solid ${t}`,
      borderRadius:8, padding:"14px 16px", marginBottom:10 }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between",
        gap:12, marginBottom:6 }}>
        <span style={{ color:MUT, fontSize:10, fontWeight:660, textTransform:"uppercase",
          letterSpacing:"0.07em" }}>Score total</span>
        <span style={{ color:t, fontSize:30, fontWeight:640, lineHeight:1,
          fontVariantNumeric:"tabular-nums" }}>{total}</span>
      </div>
      <div style={{ color:t, fontFamily:SERIF, fontSize:14.5, fontWeight:600,
        marginBottom:3, letterSpacing:"-0.005em" }}>{res.level}</div>
      <div style={{ color:TXT, fontSize:12.5, lineHeight:1.5 }}>{res.text}</div>
    </div>
  );
}

// Generic interactive score calculator: items = [{label, points, sublabel?}], interpret(total) => {level, text, color}
function ScoreCalc({ title, subtitle, items, interpret, footer }) {
  const [checked, setChecked] = useState({});
  const total = items.reduce((s, it, i) => s + (checked[i] ? it.points : 0), 0);
  const res = interpret(total);
  const toggle = i => setChecked(c => ({ ...c, [i]: !c[i] }));
  return (
    <div>
      {subtitle && <Info color={ACCENT}>{subtitle}</Info>}
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
        {items.map((it,i)=>(
          <div key={i} onClick={()=>toggle(i)} role="checkbox" aria-checked={!!checked[i]} tabIndex={0}
            onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); toggle(i); } }}
            style={{
              display:"flex", alignItems:"center", gap:11, cursor:"pointer", minHeight:44,
              background: checked[i] ? "var(--cg-accent-soft)" : PANEL,
              border:`1px solid ${checked[i] ? "var(--cg-accent-line)" : BDR}`,
              borderRadius:8, padding:"10px 12px", transition:"border-color 0.12s, background 0.12s",
            }}>
            <div style={{
              width:19, height:19, borderRadius:4, flexShrink:0,
              border:`1.5px solid ${checked[i] ? ACCENT : DIM}`,
              background: checked[i] ? ACCENT : "transparent",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {checked[i] && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="var(--cg-on-accent)" strokeWidth="3.2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              )}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:INK, fontSize:12.5, fontWeight:540, lineHeight:1.35 }}>{it.label}</div>
              {it.sublabel && <div style={{ color:MUT, fontSize:11, marginTop:1.5 }}>{it.sublabel}</div>}
            </div>
            <div style={{ color: checked[i] ? ACCENT : DIM, fontSize:12.5, fontWeight:620,
              minWidth:26, textAlign:"right", fontVariantNumeric:"tabular-nums" }}>+{it.points}</div>
          </div>
        ))}
      </div>
      {/* Résultat recalculé en direct */}
      <ScoreResult total={total} res={res} />
      {footer && <Info color={ACCENT}>{footer}</Info>}
    </div>
  );
}

// Variante multi-niveaux : chaque item propose plusieurs choix (0/1/2, ou valeurs)
function ScoreCalcMulti({ title, subtitle, items, extraPoints, interpret, footer }) {
  const [sel, setSel] = useState({});
  const base = items.reduce((s, it, i) => s + (sel[i] != null ? it.options[sel[i]].points : 0), 0);
  const total = base + (extraPoints || 0);
  const res = interpret(total);
  return (
    <div>
      {subtitle && <Info color={ACCENT}>{subtitle}</Info>}
      <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:14 }}>
        {items.map((it,i)=>(
          <div key={i}>
            <div style={{ fontSize:12.5, fontWeight:560, color:INK, marginBottom:6 }}>{it.label}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {it.options.map((o,j)=>(
                <button key={j} onClick={()=>setSel(sx=>({...sx,[i]:j}))}
                  aria-pressed={sel[i]===j} style={{
                    flex:"1 1 auto", minWidth:0, minHeight:40, padding:"9px 11px",
                    borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:520,
                    fontFamily:"inherit", transition:"border-color 0.12s, background 0.12s, color 0.12s",
                    border:`1px solid ${sel[i]===j ? "var(--cg-accent-line)" : BDR}`,
                    background: sel[i]===j ? "var(--cg-accent-soft)" : PANEL,
                    color: sel[i]===j ? ACCENT : MUT,
                  }}>{o.label}{o.points?` (+${o.points})`:""}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <ScoreResult total={total} res={res} />
      {footer && <Info color={ACCENT}>{footer}</Info>}
    </div>
  );
}

function ScoresContent({ go, step }) {
  const c = VALVES.scores.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Calculateurs de scores cliniques" color={c}>
        Cochez les critères présents — le score et son interprétation se mettent à jour en temps réel.
      </Info>
      <Sec title="Choisir un score" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="CHA₂DS₂-VA" subtitle="Risque thromboembolique en FA (ESC 2024)" color={c} onClick={()=>go("chadsva")}/>
        <Btn title="CHA₂DS₂-VASc" subtitle="Version classique avec critère sexe" color={c} onClick={()=>go("chadsvasc")}/>
        <Btn title="Wells — TVP" subtitle="Probabilité clinique de thrombose veineuse profonde" color={c} onClick={()=>go("wellstvp")}/>
        <Btn title="HEART" subtitle="Douleur thoracique aux urgences — risque de MACE" color={c} onClick={()=>go("heart")}/>
        <Btn title="PESI" subtitle="Pronostic d'une EP confirmée (5 classes)" color={c} onClick={()=>go("pesi")}/>
        <Btn title="Padua" subtitle="Risque thromboembolique du patient hospitalisé" color={c} onClick={()=>go("padua")}/>
        <Btn title="DAPT score" subtitle="Bénéfice d'une bithérapie antiplaquettaire prolongée" color={c} onClick={()=>go("dapt")}/>
        <Btn title="STOP-BANG" subtitle="Dépistage du syndrome d'apnées du sommeil" color={c} onClick={()=>go("stopbang")}/>
        <Btn title="HAS-BLED" subtitle="Risque hémorragique sous anticoagulant" color={c} onClick={()=>go("hasbled")}/>
        <Btn title="Wells — Embolie pulmonaire" subtitle="Probabilité clinique pré-test d'EP" color={c} onClick={()=>go("wells")}/>
        <Btn title="sPESI" subtitle="Gravité / pronostic d'une EP confirmée" color={c} onClick={()=>go("spesi")}/>
        <Btn title="RCRI" subtitle="Risque cardiaque avant chirurgie non cardiaque" color={c} onClick={()=>go("rcri")}/>
        <Btn title="TIMI (UA/NSTEMI)" subtitle="Risque à 14j dans le SCA non ST+" color={c} onClick={()=>go("timi")}/>
        <Btn title="Score de Genève (EP)" subtitle="Probabilité clinique d'embolie pulmonaire" color={c} onClick={()=>go("geneve")}/>
        <Btn title="Score GRACE (SCA)" subtitle="Pronostic — composantes et interprétation" color={c} onClick={()=>go("grace")}/>
        <Btn title="SCORE2 / SCORE2-OP" subtitle="Risque CV à 10 ans en prévention primaire (ESC 2021)" color={c} onClick={()=>go("score2")}/>
      </div>
    </div>);

    case "score2": return (<div>
      <Info title="SCORE2 / SCORE2-OP (ESC 2021)" color={c}>
        Estime le risque à 10 ans d'événement cardiovasculaire FATAL ET NON fatal (IDM, AVC) chez les sujets APPARENMMENT SAINS. SCORE2 : 40–69 ans · SCORE2-OP (Older Persons) : 70–89 ans. Ne s'applique PAS aux patients avec maladie CV établie, diabète, insuffisance rénale chronique ou hypercholestérolémie familiale (déjà à haut/très haut risque).
      </Info>
      <Sec title="Les 5 variables" color={c}/>
      <Res title="Composantes du modèle" classe="Variables" color={c} icon="📋" items={[
        "Âge et sexe",
        "Tabagisme (fumeur actuel vs non)",
        "Pression artérielle systolique",
        "Cholestérol non-HDL (= cholestérol total − HDL, reflète les lipoprotéines athérogènes)",
        "Calibré par RÉGION de risque du pays (la France est un pays à BAS risque)",
      ]}/>
      <Sec title="Catégories de risque selon l'âge (ESC 2021)" color={c}/>
      <Table cols="1fr 1fr 1fr 1fr" rows={[
        ["Âge","Faible-modéré","Haut","Très haut"],
        ["< 50 ans","< 2,5 %","2,5 – 7,5 %","≥ 7,5 %"],
        ["50–69 ans","< 5 %","5 – 10 %","≥ 10 %"],
        ["≥ 70 ans","< 7,5 %","7,5 – 15 %","≥ 15 %"],
      ]}/>
      <Info title="Calcul du pourcentage exact" color={c}>
        Le pourcentage précis dépend des tables de calibration régionales : utiliser l'outil officiel ESC (HeartScore / U-Prevent) plutôt qu'un calcul mental. Cette fiche donne les seuils d'interprétation et les composantes.
      </Info>
      <Sec title="Très haut risque D'EMBLÉE (pas besoin de SCORE2)" color={c}/>
      <Res title="Situations classant directement en (très) haut risque" classe="Raccourci" color="#EB5757" icon="🚨" items={[
        "Maladie cardiovasculaire athéromateuse documentée (SCA, IDM, revascularisation, AVC/AIT, AOMI, plaque significative à l'imagerie / CAC très élevé)",
        "Diabète (surtout avec atteinte d'organe ou autres facteurs de risque)",
        "Insuffisance rénale chronique modérée à sévère",
        "Hypercholestérolémie familiale",
        "→ Chez eux, la prévention est intensifiée sans passer par le SCORE2",
      ]}/>
      <Info title="Usage" color={c}>
        Le risque estimé guide l'intensité de la prévention (objectifs de LDL, contrôle tensionnel, sevrage tabagique) avec une décision partagée, en tenant compte des modificateurs de risque (antécédents familiaux, précarité, ethnies à risque, inflammation chronique…). Les seuils de traitement sont dépendants de l'âge.
      </Info>
    </div>);

    case "dapt": return (<ScoreCalcMulti
      title="DAPT score"
      subtitle="Estime le bénéfice de POURSUIVRE une bithérapie antiplaquettaire au-delà de 12 mois après stent, chez un patient sans événement ischémique ni hémorragique à 1 an. Seuil : ≥ 2 = bénéfice attendu."
      items={[
        { label:"Âge", options:[{label:"< 65 ans",points:0},{label:"65–74 ans",points:-1},{label:"≥ 75 ans",points:-2}] },
        { label:"Tabagisme actuel", options:[{label:"Non",points:0},{label:"Oui",points:1}] },
        { label:"Diabète", options:[{label:"Non",points:0},{label:"Oui",points:1}] },
        { label:"IDM à la présentation", options:[{label:"Non",points:0},{label:"Oui",points:1}] },
        { label:"Antécédent d'ICP ou d'IDM", options:[{label:"Non",points:0},{label:"Oui",points:1}] },
        { label:"Stent au paclitaxel", options:[{label:"Non",points:0},{label:"Oui",points:1}] },
        { label:"Diamètre du stent < 3 mm", options:[{label:"Non",points:0},{label:"Oui",points:1}] },
        { label:"Insuffisance cardiaque ou FEVG < 30 %", options:[{label:"Non",points:0},{label:"Oui",points:2}] },
        { label:"Stent sur pontage veineux", options:[{label:"Non",points:0},{label:"Oui",points:2}] },
      ]}
      interpret={t=>{
        if (t>=2) return { level:"Score élevé (≥ 2)", text:"Bénéfice attendu d'une prolongation de la bithérapie (ischémie évitée > risque hémorragique), si le risque hémorragique le permet.", color:"#27AE60" };
        return { level:"Score bas (< 2)", text:"Prolongation peu bénéfique : le risque hémorragique tend à dépasser le bénéfice ischémique. Aspirine seule après 6–12 mois.", color:"#C26A1C" };
      }}
      footer="À utiliser APRÈS 12 mois de bithérapie sans complication. Toujours évaluer le risque hémorragique (PRECISE-DAPT, ARC-HBR, HAS-BLED) et la tolérance. Le score va de −2 à +10."
    />);

    case "stopbang": return (<ScoreCalc
      title="STOP-BANG"
      subtitle="Dépistage du syndrome d'apnées obstructives du sommeil (SAOS). Chaque « oui » = 1 point (0–8)."
      items={[
        { label:"Ronflement bruyant (S)", sublabel:"Plus fort que la parole / audible portes fermées", points:1 },
        { label:"Fatigue diurne (T)", sublabel:"Somnolence ou fatigue en journée", points:1 },
        { label:"Apnées observées (O)", sublabel:"Pauses respiratoires constatées par l'entourage", points:1 },
        { label:"Hypertension artérielle (P)", sublabel:"Traitée ou non", points:1 },
        { label:"IMC > 35 kg/m² (B)", sublabel:"", points:1 },
        { label:"Âge > 50 ans (A)", sublabel:"", points:1 },
        { label:"Tour de cou > 40 cm (N)", sublabel:"", points:1 },
        { label:"Sexe masculin (G)", sublabel:"", points:1 },
      ]}
      interpret={t=>{
        if (t<=2) return { level:"Risque faible", text:"Faible probabilité de SAOS modéré à sévère.", color:"#27AE60" };
        if (t<=4) return { level:"Risque intermédiaire", text:"Probabilité intermédiaire : évaluer les critères STOP et BANG, envisager un dépistage.", color:"#C26A1C" };
        return { level:"Risque élevé", text:"Forte probabilité de SAOS modéré à sévère → orienter vers un enregistrement du sommeil (polygraphie / polysomnographie).", color:"#EB5757" };
      }}
      footer="Le SAOS est fréquent dans la FA, l'HTA résistante et l'insuffisance cardiaque ; son dépistage et son traitement font partie de la prise en charge (ESC). Seuils : 0–2 faible · 3–4 intermédiaire · 5–8 élevé."
    />);

    case "padua": return (<ScoreCalc
      title="Score de Padua"
      subtitle="Risque thromboembolique veineux du patient médical hospitalisé. Seuil : ≥ 4 = haut risque → thromboprophylaxie."
      items={[
        { label:"Cancer actif", sublabel:"Métastases et/ou chimio/radiothérapie < 6 mois", points:3 },
        { label:"Antécédent de MTEV", sublabel:"Hors thrombose superficielle", points:3 },
        { label:"Mobilité réduite", sublabel:"Alitement ≥ 3 jours", points:3 },
        { label:"Thrombophilie connue", sublabel:"Déficit AT/PC/PS, facteur V Leiden, SAPL…", points:3 },
        { label:"Traumatisme / chirurgie récente", sublabel:"≤ 1 mois", points:2 },
        { label:"Âge ≥ 70 ans", sublabel:"", points:1 },
        { label:"Insuffisance cardiaque et/ou respiratoire", sublabel:"", points:1 },
        { label:"IDM ou AVC ischémique aigu", sublabel:"", points:1 },
        { label:"Infection aiguë et/ou maladie rhumatologique", sublabel:"", points:1 },
        { label:"Obésité (IMC ≥ 30)", sublabel:"", points:1 },
        { label:"Traitement hormonal en cours", sublabel:"", points:1 },
      ]}
      interpret={t=>{
        if (t<4) return { level:"Bas risque", text:"Thromboprophylaxie pharmacologique non systématique (< 4 points).", color:"#27AE60" };
        return { level:"Haut risque", text:"Thromboprophylaxie recommandée (HBPM, sauf risque hémorragique — évaluer alors le score IMPROVE bleeding).", color:"#EB5757" };
      }}
      footer="Évaluer en parallèle le risque hémorragique avant de prescrire (contre-indications, IMPROVE bleeding). Le score seul ne remplace pas le jugement clinique."
    />);

    case "heart": return (<ScoreCalcMulti
      title="Score HEART"
      subtitle="Douleur thoracique aux urgences — risque de MACE à 6 semaines. À utiliser AVANT diagnostic d'un SCA, pas pour un SCA établi."
      items={[
        { label:"History (anamnèse)", options:[{label:"Peu suspecte",points:0},{label:"Modérément",points:1},{label:"Très suspecte",points:2}] },
        { label:"ECG", options:[{label:"Normal",points:0},{label:"Anomalies non spécifiques",points:1},{label:"Sous-décalage ST significatif",points:2}] },
        { label:"Âge", options:[{label:"< 45 ans",points:0},{label:"45–64 ans",points:1},{label:"≥ 65 ans",points:2}] },
        { label:"Facteurs de risque", options:[{label:"Aucun",points:0},{label:"1–2",points:1},{label:"≥ 3 ou athérome connu",points:2}] },
        { label:"Troponine", options:[{label:"Normale",points:0},{label:"1–3× la normale",points:1},{label:"> 3× la normale",points:2}] },
      ]}
      interpret={t=>{
        if (t<=3) return { level:"Risque faible (0–3)", text:"MACE à 6 sem ≈ 1–2 %. Sortie possible avec suivi ambulatoire (selon troponines sériées et protocole local).", color:"#27AE60" };
        if (t<=6) return { level:"Risque intermédiaire (4–6)", text:"MACE ≈ 12–17 %. Surveillance hospitalière et bilan complémentaire.", color:"#C26A1C" };
        return { level:"Risque élevé (7–10)", text:"MACE ≈ 50–65 %. Stratégie invasive précoce à envisager.", color:"#EB5757" };
      }}
      footer="Facteurs de risque = HTA, diabète, dyslipidémie, tabac, obésité, antécédents familiaux de coronaropathie. Conçu pour identifier les patients à bas risque, pas pour diagnostiquer un SCA."
    />);

    case "pesi": return (<ScoreCalcMulti
      title="PESI (complet)"
      subtitle="Pronostic à 30 jours d'une EP confirmée. Renseignez l'âge (= nombre de points) puis les items présents."
      items={[
        { label:"Tranche d'âge (points ≈ âge)", options:[{label:"≤ 65",points:60},{label:"66–85",points:75},{label:"86–105",points:95},{label:"106–125",points:115},{label:"> 125",points:130}] },
        { label:"Sexe", options:[{label:"Féminin",points:0},{label:"Masculin",points:10}] },
        { label:"Cancer", options:[{label:"Non",points:0},{label:"Oui",points:30}] },
        { label:"Insuffisance cardiaque", options:[{label:"Non",points:0},{label:"Oui",points:10}] },
        { label:"Maladie pulmonaire chronique", options:[{label:"Non",points:0},{label:"Oui",points:10}] },
        { label:"Pouls ≥ 110/min", options:[{label:"Non",points:0},{label:"Oui",points:20}] },
        { label:"PAS < 100 mmHg", options:[{label:"Non",points:0},{label:"Oui",points:30}] },
        { label:"FR ≥ 30/min", options:[{label:"Non",points:0},{label:"Oui",points:20}] },
        { label:"Température < 36 °C", options:[{label:"Non",points:0},{label:"Oui",points:20}] },
        { label:"Altération de la conscience", options:[{label:"Non",points:0},{label:"Oui",points:60}] },
        { label:"SpO₂ < 90 %", options:[{label:"Non",points:0},{label:"Oui",points:20}] },
      ]}
      interpret={t=>{
        if (t<66) return { level:"Classe I — très bas risque", text:"Mortalité à 30 j ≈ 0–1,6 %. Prise en charge ambulatoire envisageable.", color:"#27AE60" };
        if (t<86) return { level:"Classe II — bas risque", text:"Mortalité ≈ 1,7–3,5 %. Ambulatoire possible selon contexte.", color:"#27AE60" };
        if (t<106) return { level:"Classe III — risque intermédiaire", text:"Mortalité ≈ 3,2–7,1 %. Hospitalisation, évaluer le VD.", color:"#C26A1C" };
        if (t<126) return { level:"Classe IV — haut risque", text:"Mortalité ≈ 4–11 %. Surveillance rapprochée.", color:"#EB5757" };
        return { level:"Classe V — très haut risque", text:"Mortalité ≈ 10–25 %. Soins intensifs, envisager reperfusion.", color:"#EB5757" };
      }}
      footer="La tranche d'âge remplace ici l'âge exact (le vrai PESI ajoute l'âge en années). Pour un tri rapide, le sPESI (0 vs ≥1) est plus simple — voir la fiche dédiée. Classes I–II = bas risque."
    />);

    case "chadsvasc": return (<ScoreCalc
      title="CHA₂DS₂-VASc"
      subtitle="Version classique (score 0–9). La version ESC 2024 (CHA₂DS₂-VA) retire le critère « sexe » — voir la fiche dédiée."
      items={[
        { label:"Insuffisance cardiaque / dysfonction VG", sublabel:"Congestive heart failure", points:1 },
        { label:"Hypertension artérielle", sublabel:"Traitée ou non", points:1 },
        { label:"Âge ≥ 75 ans", sublabel:"", points:2 },
        { label:"Diabète", sublabel:"", points:1 },
        { label:"Antécédent d'AVC / AIT / embolie systémique", sublabel:"", points:2 },
        { label:"Maladie vasculaire", sublabel:"IDM, AOMI, plaque aortique", points:1 },
        { label:"Âge 65–74 ans", sublabel:"", points:1 },
        { label:"Sexe féminin", sublabel:"Modulateur (pèse surtout si ≥ 1 autre facteur)", points:1 },
      ]}
      interpret={t=>{
        if (t===0) return { level:"Risque faible", text:"Anticoagulation généralement non recommandée. Réévaluation périodique.", color:"#27AE60" };
        if (t===1) return { level:"Risque intermédiaire", text:"Anticoagulation à envisager (DOAC en 1ère intention) après évaluation du risque hémorragique.", color:"#C26A1C" };
        return { level:"Risque élevé", text:"Anticoagulation recommandée (DOAC en 1ère intention sauf CI).", color:"#EB5757" };
      }}
      footer="Le critère « sexe » est un modulateur de risque : chez la femme sans autre facteur (score = 1 uniquement par le sexe), le risque reste faible. L'ESC 2024 a simplifié en CHA₂DS₂-VA."
    />);

    case "wellstvp": return (<ScoreCalc
      title="Score de Wells — TVP"
      subtitle="Probabilité clinique de thrombose veineuse profonde (Wells 2003). À combiner avec les D-dimères."
      items={[
        { label:"Cancer actif", sublabel:"Traitement en cours ou < 6 mois, ou palliatif", points:1 },
        { label:"Paralysie / parésie / immobilisation plâtrée d'un membre inférieur", sublabel:"", points:1 },
        { label:"Alitement ≥ 3 jours ou chirurgie majeure < 12 semaines", sublabel:"", points:1 },
        { label:"Douleur sur le trajet veineux profond", sublabel:"", points:1 },
        { label:"Œdème de tout le membre inférieur", sublabel:"", points:1 },
        { label:"Mollet augmenté > 3 cm vs côté sain", sublabel:"Mesuré 10 cm sous la tubérosité tibiale", points:1 },
        { label:"Œdème prenant le godet du côté symptomatique", sublabel:"", points:1 },
        { label:"Veines superficielles collatérales non variqueuses", sublabel:"", points:1 },
        { label:"Antécédent de TVP documentée", sublabel:"", points:1 },
        { label:"Diagnostic alternatif au moins aussi probable", sublabel:"", points:-2 },
      ]}
      interpret={t=>{
        if (t<=0) return { level:"Probabilité faible", text:"TVP peu probable. D-dimères négatifs → TVP exclue, pas d'écho nécessaire.", color:"#27AE60" };
        if (t<=2) return { level:"Probabilité modérée", text:"D-dimères ; si positifs → écho-doppler veineux.", color:"#C26A1C" };
        return { level:"Probabilité élevée", text:"Écho-doppler veineux d'emblée. D-dimères insuffisants pour exclure.", color:"#EB5757" };
      }}
      footer="Modèle à 3 niveaux : ≤ 0 faible · 1–2 modéré · ≥ 3 élevé. En pratique, on dichotomise souvent : < 2 = TVP « peu probable », ≥ 2 = « probable »."
    />);

    case "chadsva": return (<ScoreCalc
      title="CHA₂DS₂-VA"
      subtitle="Version ESC 2024 : le critère « sexe » (Sc) a été retiré du score. Score de 0 à 8. Utilisé dans la FA non valvulaire."
      items={[
        { label:"Insuffisance cardiaque / dysfonction VG", sublabel:"Congestive heart failure", points:1 },
        { label:"Hypertension artérielle", sublabel:"Traitée ou non", points:1 },
        { label:"Âge ≥ 75 ans", sublabel:"", points:2 },
        { label:"Diabète", sublabel:"", points:1 },
        { label:"Antécédent d'AVC / AIT / embolie systémique", sublabel:"", points:2 },
        { label:"Maladie vasculaire", sublabel:"IDM, AOMI, plaque aortique", points:1 },
        { label:"Âge 65–74 ans", sublabel:"", points:1 },
      ]}
      interpret={t=>{
        if (t===0) return { level:"Risque faible", text:"Anticoagulation généralement non recommandée. Réévaluation périodique.", color:"#27AE60" };
        if (t===1) return { level:"Risque intermédiaire", text:"Anticoagulation à envisager (DOAC en 1ère intention) après évaluation du risque hémorragique.", color:"#C26A1C" };
        return { level:"Risque élevé", text:"Anticoagulation recommandée (DOAC en 1ère intention sauf CI), sauf contre-indication.", color:"#EB5757" };
      }}
      footer="Ne s'applique pas aux prothèses mécaniques ni au RM modéré à sévère (anticoagulation d'emblée dans ces cas)."
    />);

    case "hasbled": return (<ScoreCalc
      title="HAS-BLED"
      subtitle="Risque hémorragique majeur sous anticoagulant. Score ≥ 3 = risque élevé → vigilance et correction des facteurs modifiables (ne contre-indique pas l'anticoagulation)."
      items={[
        { label:"Hypertension non contrôlée", sublabel:"PAS > 160 mmHg", points:1 },
        { label:"Fonction rénale anormale", sublabel:"Dialyse, greffe, créat > 200 µmol/L", points:1 },
        { label:"Fonction hépatique anormale", sublabel:"Cirrhose, bili > 2N + ASAT/ALAT > 3N", points:1 },
        { label:"Antécédent d'AVC", sublabel:"", points:1 },
        { label:"Antécédent de saignement / prédisposition", sublabel:"Anémie", points:1 },
        { label:"INR labile", sublabel:"TTR < 60% (si sous AVK)", points:1 },
        { label:"Âge > 65 ans", sublabel:"", points:1 },
        { label:"Médicaments favorisant le saignement", sublabel:"Antiplaquettaires, AINS", points:1 },
        { label:"Alcool ≥ 8 verres / semaine", sublabel:"", points:1 },
      ]}
      interpret={t=>{
        if (t<=1) return { level:"Risque faible", text:"Risque hémorragique bas. Anticoagulation avec surveillance standard.", color:"#27AE60" };
        if (t===2) return { level:"Risque intermédiaire", text:"Vigilance accrue, corriger les facteurs modifiables.", color:"#C26A1C" };
        return { level:"Risque élevé", text:"Corriger les facteurs modifiables, surveillance rapprochée. N'est PAS une contre-indication à l'anticoagulation.", color:"#EB5757" };
      }}
      footer="Facteurs modifiables : HTA, INR labile, médicaments à risque, alcool. Le score sert à optimiser, pas à récuser l'anticoagulation."
    />);

    case "wells": return (<ScoreCalc
      title="Wells — Embolie pulmonaire"
      subtitle="Probabilité clinique pré-test d'EP. Modèle à 2 niveaux : ≤ 4 = EP peu probable (→ D-dimères), > 4 = EP probable (→ angioscanner)."
      items={[
        { label:"Signes cliniques de TVP", sublabel:"Œdème, douleur d'un mollet", points:3 },
        { label:"EP est le diagnostic le plus probable", sublabel:"Diagnostic alternatif moins probable", points:3 },
        { label:"Fréquence cardiaque > 100/min", sublabel:"", points:1.5 },
        { label:"Immobilisation ≥ 3j ou chirurgie < 4 sem", sublabel:"", points:1.5 },
        { label:"Antécédent de TVP ou d'EP", sublabel:"", points:1.5 },
        { label:"Hémoptysie", sublabel:"", points:1 },
        { label:"Cancer actif", sublabel:"Traité < 6 mois ou palliatif", points:1 },
      ]}
      interpret={t=>{
        if (t<=4) return { level:"EP peu probable (≤ 4)", text:"Doser les D-dimères. Si négatifs (seuil ajusté à l'âge) → EP exclue. Si positifs → angioscanner.", color:"#27AE60" };
        return { level:"EP probable (> 4)", text:"Angioscanner thoracique d'emblée (ne pas se fier aux D-dimères). Anticoagulation à discuter selon délai.", color:"#EB5757" };
      }}
      footer="Score de Genève = alternative validée n'incluant pas de jugement subjectif. En cas de forte suspicion, ne pas retarder l'imagerie."
    />);

    case "spesi": return (<ScoreCalc
      title="sPESI"
      subtitle="Pronostic d'une EP confirmée (mortalité à 30j). Chaque item = 1 point. Score 0 = bas risque ; ≥ 1 = risque intermédiaire/élevé."
      items={[
        { label:"Âge > 80 ans", sublabel:"", points:1 },
        { label:"Cancer", sublabel:"", points:1 },
        { label:"Insuffisance cardiaque OU pathologie pulmonaire chronique", sublabel:"", points:1 },
        { label:"Fréquence cardiaque ≥ 110/min", sublabel:"", points:1 },
        { label:"PAS < 100 mmHg", sublabel:"", points:1 },
        { label:"SaO₂ < 90%", sublabel:"", points:1 },
      ]}
      interpret={t=>{
        if (t===0) return { level:"Bas risque", text:"Mortalité à 30j ~1%. Traitement ambulatoire envisageable si contexte favorable (après exclusion d'une dysfonction VD).", color:"#27AE60" };
        return { level:"Risque intermédiaire ou élevé", text:"Hospitalisation. Évaluer la fonction VD (écho, troponine) : distinguer risque intermédiaire-faible vs élevé. Surveillance ± reperfusion si haut risque.", color:"#EB5757" };
      }}
      footer="Ne s'applique qu'à une EP déjà confirmée. Le haut risque (choc/hypotension) se définit cliniquement et impose une reperfusion."
    />);

    case "rcri": return (<ScoreCalc
      title="RCRI (Lee)"
      subtitle="Risque cardiaque avant chirurgie non cardiaque. Chaque item = 1 point. Estime le risque d'événement cardiaque majeur péri-opératoire."
      items={[
        { label:"Chirurgie à haut risque", sublabel:"Intrapéritonéale, intrathoracique, vasculaire sus-inguinale", points:1 },
        { label:"Cardiopathie ischémique", sublabel:"ATCD IDM, angor, ondes Q, test d'ischémie +", points:1 },
        { label:"Insuffisance cardiaque", sublabel:"", points:1 },
        { label:"Antécédent d'AVC / AIT", sublabel:"", points:1 },
        { label:"Diabète insulino-requérant", sublabel:"", points:1 },
        { label:"Insuffisance rénale", sublabel:"Créatinine > 177 µmol/L (2 mg/dL)", points:1 },
      ]}
      interpret={t=>{
        if (t===0) return { level:"Risque faible (~0,4%)", text:"Risque d'événement cardiaque majeur bas.", color:"#27AE60" };
        if (t===1) return { level:"Risque faible-intermédiaire (~1%)", text:"Événement CV majeur ~0,9–1%.", color:"#27AE60" };
        if (t===2) return { level:"Risque intermédiaire (~2,4%)", text:"Renforcer l'évaluation avant chirurgie à haut risque.", color:"#C26A1C" };
        return { level:"Risque élevé (≥ 5,4%)", text:"RCRI ≥ 3. Évaluation approfondie (biomarqueurs, imagerie), avis spécialisé, optimisation avant chirurgie à haut risque.", color:"#EB5757" };
      }}
      footer="À combiner avec le risque chirurgical et la capacité fonctionnelle (voir chapitre Situations particulières → Pré-opératoire)."
    />);

    case "timi": return (<ScoreCalc
      title="TIMI (UA/NSTEMI)"
      subtitle="Risque composite à 14j (décès, IDM, revascularisation urgente) dans le SCA non ST+. 7 items = 1 point chacun (0–7)."
      items={[
        { label:"Âge ≥ 65 ans", sublabel:"", points:1 },
        { label:"≥ 3 facteurs de risque de coronaropathie", sublabel:"ATCD familiaux, HTA, hypercholestérolémie, diabète, tabac actif", points:1 },
        { label:"Coronaropathie connue (sténose ≥ 50%)", sublabel:"", points:1 },
        { label:"Prise d'aspirine dans les 7 derniers jours", sublabel:"Récidive malgré aspirine = maladie plus agressive", points:1 },
        { label:"≥ 2 épisodes angineux en 24h", sublabel:"Angor accéléré", points:1 },
        { label:"Sous-décalage ST ≥ 0,5 mm", sublabel:"À l'ECG d'admission", points:1 },
        { label:"Élévation des biomarqueurs", sublabel:"Troponine / CK-MB", points:1 },
      ]}
      interpret={t=>{
        if (t<=2) return { level:"Risque faible (0–2)", text:"Risque d'événement à 14j ~5–8%. Stratégie souvent non invasive d'emblée, à moduler selon la clinique.", color:"#27AE60" };
        if (t<=4) return { level:"Risque intermédiaire (3–4)", text:"~13–20%. Stratégie invasive à envisager.", color:"#C26A1C" };
        return { level:"Risque élevé (5–7)", text:"~26–41%. Stratégie invasive précoce recommandée.", color:"#EB5757" };
      }}
      footer="Le GRACE a une meilleure discrimination pronostique que le TIMI et est privilégié par l'ESC pour décider du délai de coronarographie. Le TIMI reste un outil rapide au lit du patient."
    />);

    case "geneve": return (<ScoreCalc
      title="Score de Genève révisé (EP)"
      subtitle="Probabilité clinique d'embolie pulmonaire — alternative au Wells, entièrement objectif (pas de jugement subjectif)."
      items={[
        { label:"Âge > 65 ans", sublabel:"", points:1 },
        { label:"Antécédent de TVP ou d'EP", sublabel:"", points:3 },
        { label:"Chirurgie ou fracture < 1 mois", sublabel:"", points:2 },
        { label:"Cancer actif", sublabel:"", points:2 },
        { label:"Douleur d'un membre inférieur unilatérale", sublabel:"", points:3 },
        { label:"Hémoptysie", sublabel:"", points:2 },
        { label:"FC 75–94 /min", sublabel:"", points:3 },
        { label:"FC ≥ 95 /min", sublabel:"(au lieu du palier précédent)", points:5 },
        { label:"Douleur à la palpation + œdème unilatéral", sublabel:"", points:4 },
      ]}
      interpret={t=>{
        if (t<=3) return { level:"Probabilité faible (0–3)", text:"D-dimères → si négatifs, EP exclue.", color:"#27AE60" };
        if (t<=10) return { level:"Probabilité intermédiaire (4–10)", text:"D-dimères → si positifs, angioscanner.", color:"#C26A1C" };
        return { level:"Probabilité forte (≥ 11)", text:"Angioscanner thoracique d'emblée (ne pas se fier aux D-dimères).", color:"#EB5757" };
      }}
      footer="Attention à la double cotation de la FC : ne cocher qu'un seul palier de fréquence cardiaque. Score de Wells = autre alternative validée (cf. rubrique Wells)."
    />);

    case "grace": return (<div>
      <Info title="Score GRACE" color={ACCENT}>
        Estime la mortalité (hospitalière et à 6 mois) dans le SCA. Plus discriminant que le TIMI, il oriente le DÉLAI de la coronarographie dans le NSTE-ACS (ESC). Son calcul repose sur des variables continues pondérées → nécessite une calculatrice/app dédiée (MDCalc, appli ESC).
      </Info>
      <Sec title="Les 8 composantes du GRACE" color={ACCENT}/>
      <Table cols="1fr 1.4fr" rows={[
        ["Variable","Type"],
        ["Âge","Continue (poids croissant avec l'âge)"],
        ["Fréquence cardiaque","Continue"],
        ["Pression artérielle systolique","Continue (poids inverse : plus basse = plus grave)"],
        ["Créatininémie","Continue"],
        ["Classe Killip","I à IV (signes d'insuffisance cardiaque)"],
        ["Arrêt cardiaque à l'admission","Oui / Non"],
        ["Déviation du segment ST","Oui / Non"],
        ["Élévation des biomarqueurs","Oui / Non"],
      ]}/>
      <Sec title="Interprétation & seuils décisionnels" color={ACCENT}/>
      <Table cols="1fr 1.6fr" rows={[
        ["GRACE","Conduite (NSTE-ACS)"],
        ["> 140","Haut risque → coronarographie précoce (< 24h)"],
        ["109–140","Risque intermédiaire → invasif < 72h selon contexte"],
        ["< 109","Bas risque → stratégie sélective / non invasive"],
      ]}/>
      <Info title="En pratique" color={ACCENT}>
        Un GRACE &gt; 140 est l'un des critères de haut risque justifiant une stratégie invasive précoce dans le SCA NST. Utiliser l'outil de calcul officiel pour la valeur exacte.
      </Info>
    </div>);

    default: return null;
  }
}

// ── Posologies rapides — Fiche de référence ──────────────────────
// ── Antibioprophylaxie de l'endocardite (ESC 2023) ───────────────
// ── Équivalences : anti-HTA & bêta-bloquants ─────────────────────
function EquivContent({ go, step }) {
  const c = "#2F8F66";
  switch(step) {
    case "start": return (<div>
      <Info title="Équivalences & posologies usuelles" color={c}>
        Repères de doses pour les grandes classes cardiologiques. Les équivalences entre molécules d'une même classe sont approximatives ; entre classes différentes, elles n'existent pas à proprement parler.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Antihypertenseurs" subtitle="Doses usuelles par classe" color={c} onClick={()=>go("hta")}/>
        <Btn title="Bêta-bloquants" subtitle="Doses cibles, sélectivité, équivalences" color={c} onClick={()=>go("bb")}/>
      </div>
      <Info color={c}>Pour l'équivalence des statines : voir Facteurs de risque CV → Dyslipidémies → Équivalence des statines.</Info>
    </div>);

    case "hta": return (<div>
      <Info title="Pas d'équivalence stricte entre classes" color={c}>
        Contrairement aux statines, il n'existe pas de table de conversion validée d'une classe d'antihypertenseurs à l'autre. On raisonne en <b>dose usuelle</b> (souvent exprimée en demi-dose, dose standard, double dose) et en <b>baisse tensionnelle attendue</b> (≈ 8–10 mmHg de systolique pour une monothérapie à dose standard).
      </Info>
      <Sec title="Inhibiteurs de l'enzyme de conversion (IEC)" color={c}/>
      <Table cols="1fr 1fr 1fr" rows={[
        ["Molécule","Dose initiale","Dose usuelle max"],
        ["Ramipril","2,5 mg/j","10 mg/j"],
        ["Périndopril","4 mg/j (ou 5 mg arginine)","8–10 mg/j"],
        ["Énalapril","5 mg/j","20–40 mg/j"],
        ["Lisinopril","5–10 mg/j","20–40 mg/j"],
        ["Captopril","12,5 mg × 2–3/j","50 mg × 3/j"],
      ]}/>
      <Sec title="Antagonistes des récepteurs de l'angiotensine II (ARA2 / sartans)" color={c}/>
      <Table cols="1fr 1fr 1fr" rows={[
        ["Molécule","Dose initiale","Dose usuelle max"],
        ["Candésartan","8 mg/j","32 mg/j"],
        ["Valsartan","80 mg/j","320 mg/j"],
        ["Irbésartan","150 mg/j","300 mg/j"],
        ["Losartan","50 mg/j","100 mg/j"],
        ["Telmisartan","40 mg/j","80 mg/j"],
        ["Olmésartan","20 mg/j","40 mg/j"],
      ]}/>
      <Sec title="Inhibiteurs calciques" color={c}/>
      <Table cols="1fr 1fr 1.2fr" rows={[
        ["Molécule","Dose usuelle","Type"],
        ["Amlodipine","5–10 mg/j","Dihydropyridine (vasculaire)"],
        ["Lercanidipine","10–20 mg/j","Dihydropyridine"],
        ["Nifédipine LP","30–60 mg/j","Dihydropyridine"],
        ["Vérapamil LP","120–480 mg/j","Non-DHP — bradycardisant"],
        ["Diltiazem LP","120–360 mg/j","Non-DHP — bradycardisant"],
      ]}/>
      <Sec title="Diurétiques" color={c}/>
      <Table cols="1fr 1fr 1.2fr" rows={[
        ["Molécule","Dose usuelle","Classe"],
        ["Indapamide","1,5 mg LP/j","Thiazidique-like (préféré)"],
        ["Hydrochlorothiazide","12,5–25 mg/j","Thiazidique"],
        ["Chlortalidone","12,5–25 mg/j","Thiazidique-like, longue durée"],
        ["Furosémide","20–40 mg/j et +","Diurétique de l'anse (surcharge, pas l'HTA simple)"],
        ["Spironolactone","25–50 mg/j","Anti-aldostérone — HTA résistante (4ᵉ ligne)"],
      ]}/>
      <Res title="Stratégie ESC" classe="Pratique" color={c} icon="🎯" items={[
        "Débuter d'emblée par une BITHÉRAPIE à faible dose (association fixe en un comprimé) plutôt qu'une monothérapie à forte dose",
        "Association préférentielle : IEC ou ARA2 + inhibiteur calcique OU diurétique thiazidique",
        "Ne JAMAIS associer IEC + ARA2",
        "Trithérapie si besoin (IEC/ARA2 + calcique + diurétique), puis spironolactone si HTA résistante",
        "Doubler la dose d'une molécule apporte moins qu'ajouter une seconde classe à faible dose",
      ]}/>
      <SeeAlso items={[{ label:"Hypertension artérielle", icon:"🩸", color:"#2F8F66", target:{ kind:"chapter", chapterKey:"hta" } }]}/>
    </div>);

    case "bb": return (<div>
      <Info title="Les bêta-bloquants ne sont PAS interchangeables" color="#EB5757">
        Dans l'insuffisance cardiaque à FE réduite, seuls <b>bisoprolol, carvédilol, métoprolol succinate</b> (et le <b>nébivolol</b> chez le sujet âgé) ont démontré un bénéfice sur la mortalité. Les autres (aténolol, métoprolol tartrate…) ne doivent pas les remplacer dans cette indication.
      </Info>
      <Sec title="Doses cibles dans l'insuffisance cardiaque (ICFEr)" color={c}/>
      <Table cols="1.1fr 1fr 1.2fr" rows={[
        ["Molécule","Dose initiale","Dose CIBLE"],
        ["Bisoprolol","1,25 mg × 1/j","10 mg × 1/j"],
        ["Carvédilol","3,125 mg × 2/j","25 mg × 2/j (50 mg × 2/j si &gt; 85 kg)"],
        ["Métoprolol succinate (LP)","12,5–25 mg × 1/j","200 mg × 1/j"],
        ["Nébivolol","1,25 mg × 1/j","10 mg × 1/j"],
      ]}/>
      <Info title="Titration" color={c}>
        Doubler la dose toutes les 2 semaines environ, jusqu'à la dose cible ou la dose maximale tolérée. Ne pas débuter en décompensation aiguë. Surveiller fréquence cardiaque, PA et signes congestifs. Dans les essais, une minorité de patients atteint réellement la dose cible : viser le maximum toléré.
      </Info>
      <Sec title="Propriétés comparées" color={c}/>
      <Table cols="1.1fr 1.1fr 1.4fr" rows={[
        ["Molécule","Sélectivité","Particularités"],
        ["Bisoprolol","β1 très sélectif","Longue demi-vie, 1 prise/j"],
        ["Métoprolol succinate","β1 sélectif","LP indispensable (le tartrate n'a pas le même bénéfice)"],
        ["Nébivolol","β1 très sélectif","Effet vasodilatateur (NO) ; validé chez le sujet âgé (SENIORS)"],
        ["Carvédilol","Non sélectif + α1","Vasodilatateur, 2 prises/j ; utile si HTA associée"],
        ["Aténolol","β1 sélectif","Pas de bénéfice démontré dans l'IC ; élimination rénale"],
        ["Propranolol","Non sélectif","Liposoluble (passe la BHE) ; migraine, tremblement, thyrotoxicose"],
        ["Sotalol","Non sélectif + anti-arythmique III","Allonge le QT (rythmologie, pas l'IC)"],
      ]}/>
      <Sec title="Doses usuelles hors insuffisance cardiaque" color={c}/>
      <Table cols="1.1fr 1.5fr" rows={[
        ["Indication","Repères"],
        ["HTA / angor","Bisoprolol 5–10 mg/j · Aténolol 50–100 mg/j · Métoprolol 100–200 mg/j"],
        ["Ralentissement de la FA","Bisoprolol 1,25–20 mg/j · Métoprolol succinate 50–400 mg/j · Carvédilol 3,125–50 mg × 2/j"],
        ["Post-infarctus","Privilégier une molécule à bénéfice démontré, titrer progressivement"],
      ]}/>
      <Res title="Précautions" classe="Sécurité" color="#EB5757" icon="⚠️" items={[
        "Asthme : préférer un β1 très sélectif à faible dose, jamais un non sélectif ; BPCO : les β1 sélectifs sont possibles",
        "Ne pas associer un bêta-bloquant à un inhibiteur calcique bradycardisant (vérapamil, diltiazem) — risque de BAV et de bradycardie sévère",
        "Ne jamais arrêter brutalement (effet rebond : angor, poussée hypertensive, arythmie)",
        "Contre-indications : BAV de haut degré non appareillé, bradycardie sévère, choc, asthme sévère non contrôlé",
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Calculateurs cliniques interactifs ───────────────────────────
function CalcField({ label, value, setValue, unit, placeholder }) {
  return (
    <div style={{ marginBottom:11 }}>
      <label style={{ display:"block", fontSize:11.5, fontWeight:560, color:MUT,
        marginBottom:5 }}>{label}</label>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <input
          type="number" inputMode="decimal" value={value} placeholder={placeholder||""}
          onChange={e => setValue(e.target.value)}
          onFocus={e => { e.target.style.borderColor = "var(--cg-accent)"; }}
          onBlur={e => { e.target.style.borderColor = "var(--cg-bdr)"; }}
          style={{ flex:1, boxSizing:"border-box", padding:"11px 12px", background:PANEL,
            border:`1px solid ${BDR}`, borderRadius:8, fontSize:16, color:INK,
            outline:"none", fontFamily:"inherit", fontVariantNumeric:"tabular-nums",
            transition:"border-color 0.12s" }}
        />
        {unit && <span style={{ fontSize:12, color:MUT, fontWeight:500, minWidth:52 }}>{unit}</span>}
      </div>
    </div>
  );
}
function CalcResult({ color, children }) {
  const t = tone(color);
  const soft = t===OK ? "var(--cg-ok-soft)" : t===DANGER ? "var(--cg-danger-soft)"
             : t===WARN ? "var(--cg-warn-soft)" : "var(--cg-accent-soft)";
  const line = t===OK ? "var(--cg-ok-line)" : t===DANGER ? "var(--cg-danger-line)"
             : t===WARN ? "var(--cg-warn-line)" : "var(--cg-accent-line)";
  return (
    <div style={{ background:soft, border:`1px solid ${line}`, borderLeft:`2.5px solid ${t}`,
      borderRadius:8, padding:"13px 15px", marginTop:8 }}>
      {children}
    </div>
  );
}
function SegBtn({ options, value, setValue, color }) {
  const t = tone(color);
  return (
    <div style={{ display:"flex", gap:6, marginBottom:11 }}>
      {options.map(o => (
        <button key={o.v} onClick={() => setValue(o.v)} aria-pressed={value===o.v} style={{
          flex:1, minHeight:40, padding:"9px 6px", borderRadius:6, cursor:"pointer",
          fontSize:12.5, fontWeight:520, fontFamily:"inherit",
          border:`1px solid ${value===o.v ? "var(--cg-accent-line)" : BDR}`,
          background: value===o.v ? "var(--cg-accent-soft)" : PANEL,
          color: value===o.v ? t : MUT,
          transition:"border-color 0.12s, background 0.12s, color 0.12s",
        }}>{o.l}</button>
      ))}
    </div>
  );
}

function CockcroftCalc() {
  const c = "#0F766E";
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [creat, setCreat] = useState("");
  const [sex, setSex] = useState("h");
  const a = parseFloat(age), w = parseFloat(weight), cr = parseFloat(creat);
  let result = null;
  if (a>0 && w>0 && cr>0) {
    const k = sex==="h" ? 1.23 : 1.04;
    result = (140 - a) * w * k / cr;
  }
  return (
    <div>
      <div style={{ fontSize:11.5, color:MUT, marginBottom:10, lineHeight:1.5 }}>
        Formule de Cockcroft-Gault (clairance estimée). Créatininémie en <b>µmol/L</b>.
      </div>
      <SegBtn options={[{v:"h",l:"Homme"},{v:"f",l:"Femme"}]} value={sex} setValue={setSex} color={c}/>
      <CalcField label="Âge" value={age} setValue={setAge} unit="ans"/>
      <CalcField label="Poids" value={weight} setValue={setWeight} unit="kg"/>
      <CalcField label="Créatininémie" value={creat} setValue={setCreat} unit="µmol/L"/>
      {result !== null && (
        <CalcResult color={c}>
          <div style={{ fontSize:22, fontWeight:640, color:c }}>{result.toFixed(0)} <span style={{ fontSize:13, fontWeight:600 }}>mL/min</span></div>
          <div style={{ fontSize:11.5, color:MUT, marginTop:4 }}>
            {result >= 90 ? "Fonction normale" : result >= 60 ? "Insuffisance rénale légère" : result >= 30 ? "IR modérée — adapter les AOD" : result >= 15 ? "IR sévère — CI de certains AOD" : "IR terminale"}
          </div>
        </CalcResult>
      )}
    </div>
  );
}

function CKDEPICalc() {
  const c = "#0F766E";
  const [age, setAge] = useState("");
  const [creat, setCreat] = useState("");
  const [sex, setSex] = useState("h");
  const a = parseFloat(age), crMg = parseFloat(creat);
  let result = null;
  if (a>0 && crMg>0) {
    const cr = crMg / 88.4;
    const kap = sex==="f" ? 0.7 : 0.9;
    const alpha = sex==="f" ? -0.241 : -0.302;
    const minv = Math.min(cr/kap, 1), maxv = Math.max(cr/kap, 1);
    result = 142 * Math.pow(minv, alpha) * Math.pow(maxv, -1.200) * Math.pow(0.9938, a) * (sex==="f" ? 1.012 : 1);
  }
  return (
    <div>
      <div style={{ fontSize:11.5, color:MUT, marginBottom:10, lineHeight:1.5 }}>
        CKD-EPI 2021 (DFG estimé, sans facteur ethnique). Créatininémie en <b>µmol/L</b>.
      </div>
      <SegBtn options={[{v:"h",l:"Homme"},{v:"f",l:"Femme"}]} value={sex} setValue={setSex} color={c}/>
      <CalcField label="Âge" value={age} setValue={setAge} unit="ans"/>
      <CalcField label="Créatininémie" value={creat} setValue={setCreat} unit="µmol/L"/>
      {result !== null && (
        <CalcResult color={c}>
          <div style={{ fontSize:22, fontWeight:640, color:c }}>{result.toFixed(0)} <span style={{ fontSize:13, fontWeight:600 }}>mL/min/1,73m²</span></div>
          <div style={{ fontSize:11.5, color:MUT, marginTop:4 }}>
            {result >= 90 ? "G1 — normal" : result >= 60 ? "G2 — légèrement diminué" : result >= 45 ? "G3a — modéré" : result >= 30 ? "G3b — modéré à sévère" : result >= 15 ? "G4 — sévère" : "G5 — terminal"}
          </div>
        </CalcResult>
      )}
    </div>
  );
}

function QTcCalc() {
  const c = "#0F766E";
  const [qt, setQt] = useState("");
  const [rr, setRr] = useState("");
  const [sex, setSex] = useState("h");
  const qtv = parseFloat(qt), rrv = parseFloat(rr);
  let bazett = null, fridericia = null;
  if (qtv>0 && rrv>0) {
    const rrs = rrv/1000;
    bazett = qtv / Math.sqrt(rrs);
    fridericia = qtv / Math.cbrt(rrs);
  }
  const seuil = sex==="h" ? 450 : 460;
  return (
    <div>
      <div style={{ fontSize:11.5, color:MUT, marginBottom:10, lineHeight:1.5 }}>
        QT corrigé. Saisir le QT et le RR (ou 60000/FC) en <b>ms</b>.
      </div>
      <SegBtn options={[{v:"h",l:"Homme"},{v:"f",l:"Femme"}]} value={sex} setValue={setSex} color={c}/>
      <CalcField label="Intervalle QT mesuré" value={qt} setValue={setQt} unit="ms"/>
      <CalcField label="Intervalle RR" value={rr} setValue={setRr} unit="ms"/>
      {bazett !== null && (
        <CalcResult color={c}>
          <div style={{ fontSize:20, fontWeight:640, color: bazett>seuil?RED:c }}>QTc {bazett.toFixed(0)} ms <span style={{ fontSize:11, fontWeight:600, color:MUT }}>(Bazett)</span></div>
          <div style={{ fontSize:13, fontWeight:560, color:MUT, marginTop:3 }}>QTc {fridericia.toFixed(0)} ms <span style={{ fontSize:11, fontWeight:500 }}>(Fridericia)</span></div>
          <div style={{ fontSize:11.5, color: bazett>seuil?RED:MUT, marginTop:5, fontWeight: bazett>seuil?700:500 }}>
            {bazett>500 ? "QTc très allongé (> 500 ms) — risque de torsades" : bazett>seuil ? `Allongé (seuil ${seuil} ms)` : `Normal (seuil ${seuil} ms)`}
          </div>
        </CalcResult>
      )}
    </div>
  );
}

function BSACalc() {
  const c = "#0F766E";
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const h = parseFloat(height), w = parseFloat(weight);
  let bsa = null, bmi = null;
  if (h>0 && w>0) {
    bsa = Math.sqrt(h * w / 3600);
    bmi = w / Math.pow(h/100, 2);
  }
  return (
    <div>
      <div style={{ fontSize:11.5, color:MUT, marginBottom:10, lineHeight:1.5 }}>
        Surface corporelle (Mosteller) et IMC. Utile pour l'indexation en ETT.
      </div>
      <CalcField label="Taille" value={height} setValue={setHeight} unit="cm"/>
      <CalcField label="Poids" value={weight} setValue={setWeight} unit="kg"/>
      {bsa !== null && (
        <CalcResult color={c}>
          <div style={{ fontSize:22, fontWeight:640, color:c }}>{bsa.toFixed(2)} <span style={{ fontSize:13, fontWeight:600 }}>m²</span></div>
          <div style={{ fontSize:12.5, color:MUT, marginTop:4 }}>IMC : <b>{bmi.toFixed(1)} kg/m²</b> — {bmi<18.5?"maigreur":bmi<25?"normal":bmi<30?"surpoids":"obésité"}</div>
        </CalcResult>
      )}
    </div>
  );
}

function NoradCalc() {
  const c = "#0F766E";
  const [weight, setWeight] = useState("");
  const [dose, setDose] = useState("");
  const [conc, setConc] = useState("0.2");
  const w = parseFloat(weight), d = parseFloat(dose), cc = parseFloat(conc);
  let rate = null;
  if (w>0 && d>0 && cc>0) {
    const mgPerH = d * w * 60 / 1000;
    rate = mgPerH / cc;
  }
  return (
    <div>
      <div style={{ fontSize:11.5, color:MUT, marginBottom:10, lineHeight:1.5 }}>
        Débit de noradrénaline à la seringue électrique (mL/h) selon la dose et la concentration.
      </div>
      <CalcField label="Poids" value={weight} setValue={setWeight} unit="kg"/>
      <CalcField label="Dose voulue" value={dose} setValue={setDose} unit="µg/kg/min"/>
      <CalcField label="Concentration" value={conc} setValue={setConc} unit="mg/mL"/>
      {rate !== null && (
        <CalcResult color={c}>
          <div style={{ fontSize:22, fontWeight:640, color:c }}>{rate.toFixed(1)} <span style={{ fontSize:13, fontWeight:600 }}>mL/h</span></div>
          <div style={{ fontSize:11.5, color:MUT, marginTop:4 }}>Concentrations usuelles : 0,2 mg/mL ou 0,5 mg/mL. Vérifie le protocole local.</div>
        </CalcResult>
      )}
    </div>
  );
}

function CalcContent({ go, step }) {
  const c = "#0F766E";
  switch(step) {
    case "start": return (<div>
      <Info title="Calculateurs cliniques" color={c}>
        Saisie directe, calcul immédiat. Repères pour la pratique — vérifie toujours le contexte clinique et les protocoles de ton service.
      </Info>
      <Sec title="Choisir un calculateur" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Clairance créatinine (Cockcroft)" subtitle="Adaptation des AOD" color={c} onClick={()=>go("cockcroft")}/>
        <Btn title="DFG (CKD-EPI 2021)" color={c} onClick={()=>go("ckdepi")}/>
        <Btn title="QTc (Bazett & Fridericia)" color={c} onClick={()=>go("qtc")}/>
        <Btn title="Surface corporelle & IMC" color={c} onClick={()=>go("bsa")}/>
        <Btn title="Débit de noradrénaline" color={c} onClick={()=>go("norad")}/>
      </div>
    </div>);
    case "cockcroft": return (<div><Sec title="Clairance de la créatinine — Cockcroft-Gault" color={c}/><CockcroftCalc/></div>);
    case "ckdepi": return (<div><Sec title="DFG estimé — CKD-EPI 2021" color={c}/><CKDEPICalc/></div>);
    case "qtc": return (<div><Sec title="QT corrigé" color={c}/><QTcCalc/></div>);
    case "bsa": return (<div><Sec title="Surface corporelle & IMC" color={c}/><BSACalc/></div>);
    case "norad": return (<div><Sec title="Débit de noradrénaline" color={c}/><NoradCalc/></div>);
    default: return null;
  }
}


// ── Générateur de compte-rendu ETT ───────────────────────────────
function CRETTField({ label, value, setValue, unit, placeholder, width }) {
  return (
    <div style={{ marginBottom:9, flex: width||"1 1 100%" }}>
      <label style={{ display:"block", fontSize:11, fontWeight:560, color:MUT, marginBottom:3 }}>{label}</label>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <input type="number" inputMode="decimal" value={value} placeholder={placeholder||""}
          onChange={e => setValue(e.target.value)}
          style={{ flex:1, boxSizing:"border-box", padding:"9px 10px", background:PANEL,
            border:`1px solid ${BDR}`, borderRadius:6, fontSize:16, color:INK, outline:"none",
            fontFamily:"inherit", fontVariantNumeric:"tabular-nums", minWidth:0 }}/>
        {unit && <span style={{ fontSize:11, color:DIM, fontWeight:600, whiteSpace:"nowrap" }}>{unit}</span>}
      </div>
    </div>
  );
}
function CRETTSelect({ label, value, setValue, options, width }) {
  return (
    <div style={{ marginBottom:9, flex: width||"1 1 100%" }}>
      <label style={{ display:"block", fontSize:11, fontWeight:560, color:MUT, marginBottom:3 }}>{label}</label>
      <select value={value} onChange={e => setValue(e.target.value)}
        style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", background:PANEL,
          border:`1px solid ${BDR}`, borderRadius:6, fontSize:13.5, color:INK, outline:"none", fontFamily:"inherit" }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function CRETTGenerator() {
  const c = "#2F8F66";
  // VG
  const [fevg, setFevg] = useState("");
  const [ddvg, setDdvg] = useState("");
  const [siv, setSiv] = useState("");
  const [cinetique, setCinetique] = useState("homogène");
  // Diastole / OG
  const [ee, setEe] = useState("");
  const [lavi, setLavi] = useState("");
  // Valves
  const [ao, setAo] = useState("normale");
  const [gradAo, setGradAo] = useState("");
  const [surfAo, setSurfAo] = useState("");
  const [ia, setIa] = useState("absente");
  const [im, setIm] = useState("absente");
  const [rm, setRm] = useState("absent");
  const [it, setIt] = useState("absente");
  // VD / PAPS
  const [tapse, setTapse] = useState("");
  const [paps, setPaps] = useState("");
  // Péricarde
  const [pericarde, setPericarde] = useState("sec");

  // ── Interprétations ──
  const num = v => { const n = parseFloat(String(v).replace(",",".")); return isNaN(n)?null:n; };
  const parts = [];

  // VG systolique
  const f = num(fevg);
  if (f !== null) {
    let q = f >= 52 ? "conservée" : f >= 41 ? "légèrement altérée" : f >= 30 ? "modérément altérée" : "sévèrement altérée";
    let sentence = `Ventricule gauche de taille ${num(ddvg)!==null && num(ddvg)>58 ? "augmentée" : "normale"}`;
    if (siv && num(siv)!==null && num(siv) >= 12) sentence += ", hypertrophié";
    sentence += `, à fonction systolique ${q} (FEVG ${f} %`;
    sentence += cinetique !== "homogène" ? `, ${cinetique})` : ", cinétique segmentaire homogène)";
    parts.push(sentence + ".");
  }

  // Diastole
  const eeN = num(ee), laviN = num(lavi);
  if (eeN !== null || laviN !== null) {
    let d = "Fonction diastolique ";
    const high = (eeN!==null && eeN>14) || (laviN!==null && laviN>34);
    if (high) d += "altérée avec élévation probable des pressions de remplissage";
    else d += "sans argument pour une élévation des pressions de remplissage";
    const det = [];
    if (eeN!==null) det.push(`E/e' ${eeN}`);
    if (laviN!==null) det.push(`VG OG indexé ${laviN} mL/m²`);
    if (det.length) d += ` (${det.join(", ")})`;
    parts.push(d + ".");
  }

  // Valve aortique
  if (ao === "sténose" || gradAo || surfAo) {
    const g = num(gradAo), s = num(surfAo);
    let sev = "";
    if (s!==null) sev = s < 1.0 ? "serré" : s < 1.5 ? "moyennement serré" : "peu serré";
    else if (g!==null) sev = g >= 40 ? "serré" : g >= 20 ? "moyennement serré" : "peu serré";
    let sAo = `Rétrécissement aortique ${sev}`.trim();
    const det = [];
    if (g!==null) det.push(`gradient moyen ${g} mmHg`);
    if (s!==null) det.push(`surface ${s} cm²`);
    if (det.length) sAo += ` (${det.join(", ")})`;
    parts.push(sAo + ".");
  } else if (ao !== "normale") {
    parts.push(`Valve aortique : ${ao}.`);
  }
  if (ia !== "absente") parts.push(`Insuffisance aortique ${ia}.`);

  // Valve mitrale
  if (im !== "absente") parts.push(`Insuffisance mitrale ${im}.`);
  if (rm !== "absent") parts.push(`Rétrécissement mitral ${rm}.`);

  // VD / tricuspide / PAPS
  const t = num(tapse), p = num(paps);
  if (t !== null || p !== null || it !== "absente") {
    let vd = "";
    if (t!==null) vd = `Fonction systolique du VD ${t < 17 ? "altérée" : "conservée"} (TAPSE ${t} mm)`;
    else vd = "Ventricule droit non dilaté, de fonction conservée";
    parts.push(vd + ".");
    if (it !== "absente") parts.push(`Insuffisance tricuspide ${it}.`);
    if (p!==null) {
      let pq = p < 35 ? "normale" : p < 50 ? "modérément élevée" : "élevée";
      parts.push(`PAPS estimée à ${p} mmHg (${pq}).`);
    }
  }

  // Péricarde
  if (pericarde !== "sec") parts.push(`Épanchement péricardique ${pericarde}.`);

  const conclusion = parts.length ? parts.join(" ") : "Renseignez les mesures ci-dessus pour générer la conclusion.";

  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      navigator.clipboard.writeText(conclusion).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false), 1800); });
    } catch(e) {}
  };

  const row = { display:"flex", gap:8, flexWrap:"wrap" };
  return (
    <div>
      <Info title="Générateur de conclusion d'ETT" color={c}>
        Renseignez les mesures ; la conclusion se rédige automatiquement avec interprétation (seuils ASE/EACVI). Laissez vide les items non pertinents. Outil d'aide à la rédaction — relisez toujours avant de valider.
      </Info>

      <Sec title="Ventricule gauche" color={c}/>
      <div style={row}>
        <CRETTField label="FEVG" value={fevg} setValue={setFevg} unit="%" width="1 1 30%"/>
        <CRETTField label="DTD VG" value={ddvg} setValue={setDdvg} unit="mm" width="1 1 30%"/>
        <CRETTField label="SIV" value={siv} setValue={setSiv} unit="mm" width="1 1 30%"/>
      </div>
      <CRETTSelect label="Cinétique segmentaire" value={cinetique} setValue={setCinetique}
        options={["homogène","hypokinésie globale","trouble de cinétique segmentaire","akinésie territoriale"]}/>

      <Sec title="Fonction diastolique / OG" color={c}/>
      <div style={row}>
        <CRETTField label="E/e' moyen" value={ee} setValue={setEe} unit="" width="1 1 45%"/>
        <CRETTField label="Volume OG indexé" value={lavi} setValue={setLavi} unit="mL/m²" width="1 1 45%"/>
      </div>

      <Sec title="Valve aortique" color={c}/>
      <CRETTSelect label="Aspect" value={ao} setValue={setAo} options={["normale","sténose","remaniée non serrée","bioprothèse","mécanique"]}/>
      <div style={row}>
        <CRETTField label="Gradient moyen" value={gradAo} setValue={setGradAo} unit="mmHg" width="1 1 45%"/>
        <CRETTField label="Surface aortique" value={surfAo} setValue={setSurfAo} unit="cm²" width="1 1 45%"/>
      </div>
      <CRETTSelect label="Insuffisance aortique" value={ia} setValue={setIa} options={["absente","minime","modérée","sévère"]}/>

      <Sec title="Valve mitrale" color={c}/>
      <CRETTSelect label="Insuffisance mitrale" value={im} setValue={setIm} options={["absente","minime","modérée","sévère"]}/>
      <CRETTSelect label="Rétrécissement mitral" value={rm} setValue={setRm} options={["absent","modéré","serré"]}/>

      <Sec title="Ventricule droit / PAPS" color={c}/>
      <div style={row}>
        <CRETTField label="TAPSE" value={tapse} setValue={setTapse} unit="mm" width="1 1 45%"/>
        <CRETTField label="PAPS estimée" value={paps} setValue={setPaps} unit="mmHg" width="1 1 45%"/>
      </div>
      <CRETTSelect label="Insuffisance tricuspide" value={it} setValue={setIt} options={["absente","minime","modérée","sévère"]}/>

      <Sec title="Péricarde" color={c}/>
      <CRETTSelect label="Péricarde" value={pericarde} setValue={setPericarde}
        options={["sec","de faible abondance","de moyenne abondance","de grande abondance"]}/>

      <Sec title="Conclusion générée" color={c}/>
      <div style={{ background:PANEL, border:`1px solid ${c}44`, borderLeft:`4px solid ${c}`, borderRadius:8, padding:"14px 16px", fontSize:13.5, lineHeight:1.65, color:INK, whiteSpace:"pre-wrap" }}>
        {conclusion}
      </div>
      <button onClick={copy} style={{
        marginTop:10, width:"100%", padding:"12px", borderRadius:8, cursor:"pointer",
        background: copied ? c : c+"18", color: copied ? "#fff" : c,
        border:`1px solid ${c}`, fontSize:13.5, fontWeight:640, fontFamily:"inherit", transition:"all 0.2s",
      }}>{copied ? "Copié dans le presse-papiers" : "Copier la conclusion"}</button>
    </div>
  );
}
function CRETTContent({ go, step }) {
  return <CRETTGenerator/>;
}


// ═══ STIMULATION & DAI ════════════════════════════════════════════
// ── Indications de stimulation (ESC 2021) ────────────────────────
function STIMindicContent({ go, step }) {
  const c = STIM_TOPICS.indic.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Indications de stimulation permanente" color={c}>
        ESC 2021. Deux principes avant tout : éliminer une cause réversible, et vérifier la corrélation entre les symptômes et la bradycardie.
      </Info>
      <Sec title="Choisir la situation" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Bloc auriculo-ventriculaire" color={c} onClick={()=>go("bav")}/>
        <Btn title="Dysfonction sinusale" color={c} onClick={()=>go("sinus")}/>
        <Btn title="Syncope & bloc de branche" color={c} onClick={()=>go("syncope")}/>
        <Btn title="Après TAVI ou chirurgie cardiaque" color={c} onClick={()=>go("tavi")}/>
        <Btn title="Causes réversibles à éliminer" color={c} onClick={()=>go("revers")}/>
      </div>
    </div>);

    case "bav": return (<div>
      <Sec title="Bloc auriculo-ventriculaire" color={c}/>
      <Table cols="1.5fr 1.3fr" rows={[
        ["Situation","Conduite (ESC 2021)"],
        ["BAV 3ᵉ degré ou 2ᵉ degré Mobitz II","Stimulation — classe I, quels que soient les symptômes"],
        ["BAV 2:1 ou de haut degré","Stimulation si symptomatique ou siège infra-nodal"],
        ["BAV 2ᵉ degré Mobitz I","Stimulation si symptomatique ou siège infra-nodal démontré"],
        ["BAV 1ᵉʳ degré isolé","Pas d'indication (sauf PR très long mal toléré)"],
        ["Alternance de blocs de branche","Stimulation — classe I"],
        ["BAV paroxystique documenté","Stimulation — classe I"],
      ]}/>
      <Res title="Points clés" classe="ESC 2021" level="" color={c} icon="🚫" items={[
        "Le BAV 3ᵉ degré et le Mobitz II acquis relèvent de la stimulation même asymptomatiques (risque d'asystolie)",
        "Le siège du bloc compte : nodal (souvent bénin, répond à l'atropine) vs infra-nodal (risque d'évolution)",
        "Exploration électrophysiologique : HV ≥ 70 ms est considéré comme positif pour une indication de stimulation",
        "Maladie neuromusculaire (dystrophie myotonique, Kearns-Sayre…) : en cas d'indication de stimulation, discuter un DAI",
      ]}/>
      <SeeAlso items={[
        { label:"Bradycardies (Rythmologie)", icon:"⚡", color:"#B5790F", target:{ kind:"topic", chapterKey:"rythmo", topicKey:"brady" } },
        { label:"Doses d'urgence", icon:"💉", color:"#D0442F", target:{ kind:"topic", chapterKey:"urgences", topicKey:"doses" } },
      ]}/>
    </div>);

    case "sinus": return (<div>
      <Sec title="Dysfonction sinusale" color={c}/>
      <Res title="Règle centrale" classe="ESC 2021" level="Classe I" color={c} icon="🐢" items={[
        "La stimulation n'est indiquée que si les symptômes sont clairement corrélés à la bradycardie",
        "Une bradycardie sinusale asymptomatique ne relève PAS de la stimulation, même marquée",
        "La stimulation améliore les symptômes mais n'améliore pas la survie dans cette indication",
      ]}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Outil","Objectif"],
        ["Holter / télémétrie","Corrélation symptôme–rythme sur épisodes fréquents"],
        ["Moniteur ECG implantable","Symptômes rares et inexpliqués"],
        ["Test d'effort","Recherche d'une incompétence chronotrope"],
        ["Recherche de SAOS","Le traitement par PPC réduit les épisodes de bradycardie"],
      ]}/>
      <Info title="Avant de conclure" color={c}>
        Toujours réévaluer les traitements bradycardisants (bêtabloquants, inhibiteurs calciques bradycardisants, anti-arythmiques, ivabradine, digoxine, certains collyres) et l'hypothyroïdie.
      </Info>
    </div>);

    case "syncope": return (<div>
      <Sec title="Syncope et troubles conductifs" color={c}/>
      <Table cols="1.5fr 1.3fr" rows={[
        ["Situation","Conduite"],
        ["Syncope + bloc de branche + EEP positif (HV ≥ 70 ms)","Stimulation — classe I"],
        ["Syncope inexpliquée + bloc de branche","Moniteur implantable ou EEP"],
        ["Syncope réflexe cardio-inhibitrice récidivante","Stimulation à envisager si > 40 ans et pause spontanée documentée"],
        ["Syncope vasodépressive pure","Pas d'indication de stimulation"],
      ]}/>
      <Res title="Démarche" classe="Pratique" level="" color={c} icon="💫" items={[
        "Documenter le mécanisme avant d'implanter : la stimulation ne traite que la composante cardio-inhibitrice",
        "Le moniteur ECG implantable est l'outil clé des syncopes rares et inexpliquées",
        "Massage sino-carotidien et tilt-test aident à caractériser la syncope réflexe",
      ]}/>
      <SeeAlso items={[
        { label:"Syncope", icon:"💫", color:ACCENT, target:{ kind:"topic", chapterKey:"spec", topicKey:"syncope" } },
      ]}/>
    </div>);

    case "tavi": return (<div>
      <Sec title="Après TAVI" color={c}/>
      <Table cols="1.5fr 1.3fr" rows={[
        ["Situation","Conduite (ESC 2021)"],
        ["BAV complet / haut degré persistant 24–48 h","Stimulation définitive — classe I"],
        ["Alternance de blocs de branche de novo","Stimulation définitive — classe I"],
        ["BBD préexistant + nouveau trouble conductif","Stimulation précoce à envisager (IIa)"],
        ["BBG de novo, QRS > 150 ms ou PR > 240 ms","Monitorage prolongé (jusqu'à 5 j) ou EEP"],
        ["Trouble conductif préexistant qui s'aggrave (> 20 ms)","Monitorage ambulatoire ou EEP à envisager"],
      ]}/>
      <Res title="Points clés" classe="ESC 2021" level="" color={c} icon="🫀" items={[
        "Le bloc de branche droit préexistant est le facteur prédictif le plus puissant de stimulation après TAVI",
        "Le BBG de novo est le trouble conductif le plus fréquent (proximité anatomique de la branche gauche)",
        "Après chirurgie cardiaque, laisser un délai de récupération (souvent ~5 jours) sauf BAV complet d'emblée non résolutif",
      ]}/>
      <SeeAlso items={[
        { label:"Rétrécissement aortique", icon:"🔴", color:"#E85D4A", target:{ kind:"valve", topicKey:"rac" } },
      ]}/>
    </div>);

    case "revers": return (<div>
      <Sec title="Causes réversibles à éliminer" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Cause","Commentaire"],
        ["Médicaments bradycardisants","Bêtabloquants, vérapamil/diltiazem, anti-arythmiques, digoxine, ivabradine, collyres bêtabloquants"],
        ["Ischémie myocardique aiguë","BAV de l'IDM inférieur souvent régressif"],
        ["Troubles ioniques","Hyperkaliémie surtout"],
        ["Hypothyroïdie","Bradycardie sinusale"],
        ["Infection","Maladie de Lyme, endocardite avec abcès septal"],
        ["Post-opératoire précoce","Récupération fréquente dans les premiers jours"],
        ["Hypothermie, hypertonie vagale","Contexte évident"],
      ]}/>
      <Info title="Réflexe" color={c}>
        Implanter un stimulateur sur une cause réversible expose le patient à un matériel à vie et à ses complications. En cas de doute, temporiser sous surveillance (± sonde d'entraînement temporaire).
      </Info>
      <SeeAlso items={[
        { label:"Hyperkaliémie", icon:"🧪", color:ACCENT, target:{ kind:"topic", chapterKey:"metab", topicKey:"hyperk" } },
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Modes & code NBG ─────────────────────────────────────────────
function STIMmodesContent({ go, step }) {
  const c = STIM_TOPICS.modes.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Modes de stimulation" color={c}>
        Le mode se lit avec le code NBG. En pratique, quatre modes couvrent la quasi-totalité des situations : DDD(R), VVI(R), AAI(R) et VDD.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Code NBG — lire un mode" color={c} onClick={()=>go("nbg")}/>
        <Btn title="Quel mode pour quelle indication ?" color={c} onClick={()=>go("choix")}/>
        <Btn title="Minimiser la stimulation ventriculaire" color={c} onClick={()=>go("mini")}/>
        <Btn title="Stimulation du système de conduction" color={c} onClick={()=>go("csp")}/>
      </div>
    </div>);

    case "nbg": return (<div>
      <Sec title="Code NBG — les 5 positions" color={c}/>
      <Table cols="1fr 2fr" rows={[
        ["Position","Signification"],
        ["I — chambre stimulée","A (oreillette), V (ventricule), D (double), O (aucune)"],
        ["II — chambre détectée","A, V, D, O"],
        ["III — réponse à la détection","I (inhibée), T (déclenchée), D (double), O (aucune)"],
        ["IV — asservissement","R (fréquence asservie à l'effort)"],
        ["V — stimulation multisite","A, V ou D (ex. resynchronisation)"],
      ]}/>
      <Res title="Exemples de lecture" classe="Repères" level="" color={c} icon="🔤" items={[
        "DDD : stimule et détecte les deux cavités, réponse double — mode « physiologique »",
        "VVI : stimule et détecte le ventricule, inhibé par l'activité spontanée",
        "AAI : stimule et détecte l'oreillette — suppose une conduction AV intacte",
        "VDD : stimule le ventricule, détecte les deux cavités — suppose une fonction sinusale normale",
        "DDDR : DDD avec asservissement de fréquence",
      ]}/>
    </div>);

    case "choix": return (<div>
      <Sec title="Choix du mode" color={c}/>
      <Table cols="1.4fr 1.4fr" rows={[
        ["Indication","Mode recommandé"],
        ["Dysfonction sinusale, conduction AV normale","DDD(R) avec algorithme de minimisation de la stimulation VD"],
        ["BAV avec fonction sinusale normale","DDD ou VDD"],
        ["BAV avec dysfonction sinusale","DDD(R)"],
        ["FA permanente avec bradycardie","VVI(R)"],
        ["Incompétence chronotrope","Ajouter l'asservissement (R)"],
      ]}/>
      <Res title="Points clés" classe="ESC 2021" level="" color={c} icon="🎯" items={[
        "Le double chambre est préféré au simple chambre ventriculaire quand le rythme sinusal est conservé (moins de syndrome du pacemaker, moins de FA)",
        "Le VVI reste le mode logique en FA permanente : il n'y a pas de synchronisme AV à préserver",
        "L'asservissement (R) n'a d'intérêt qu'en cas d'incompétence chronotrope documentée",
      ]}/>
    </div>);

    case "mini": return (<div>
      <Sec title="Minimiser la stimulation ventriculaire droite" color={c}/>
      <Res title="Pourquoi" classe="ESC 2021" level="Classe I" color={c} icon="📉" items={[
        "La stimulation VD apicale crée une désynchronisation (aspect de bloc de branche gauche stimulé)",
        "Un pourcentage élevé de stimulation VD peut induire une cardiomyopathie de stimulation et favoriser la FA",
        "Chez le patient en dysfonction sinusale avec conduction AV conservée, la programmation doit minimiser la stimulation VD (classe I)",
      ]}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Moyen","Principe"],
        ["Algorithmes dédiés","Bascule automatique AAI(R) ↔ DDD(R) selon la conduction"],
        ["Allongement de l'AV","Favorise la conduction spontanée (à ne pas pousser à l'excès)"],
        ["Surveillance du % de stimulation VD","À vérifier à chaque contrôle"],
      ]}/>
      <Info title="Cardiomyopathie induite par la stimulation" color={c}>
        Devant une baisse de la FEVG chez un patient stimulé avec un pourcentage élevé de stimulation VD, y penser systématiquement et discuter une conversion en resynchronisation.
      </Info>
      <SeeAlso items={[
        { label:"Resynchronisation (CRT)", icon:"🔀", color:"#A267D9", target:{ kind:"stim", topicKey:"crt" } },
      ]}/>
    </div>);

    case "csp": return (<div>
      <Sec title="Stimulation du système de conduction" color={c}/>
      <Res title="Principe" classe="ESC 2021" level="" color={c} icon="🌿" items={[
        "Stimuler le faisceau de His ou la branche gauche pour recruter le réseau de conduction natif",
        "Objectif : obtenir une activation ventriculaire physiologique et éviter la désynchronisation de la stimulation VD apicale",
        "La stimulation hissienne est à envisager en cas d'échec de mise en place de la sonde ventriculaire gauche chez un candidat à la resynchronisation (IIa)",
      ]}/>
      <Info title="À connaître" color={c}>
        Domaine en évolution rapide : seuils de stimulation parfois plus élevés, sur-détection possible, surveillance spécifique. Les indications sont amenées à évoluer avec les données récentes.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Resynchronisation (CRT) ──────────────────────────────────────
function STIMcrtContent({ go, step }) {
  const c = STIM_TOPICS.crt.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Resynchronisation cardiaque" color={c}>
        ESC 2021. La largeur du QRS et la morphologie (bloc de branche gauche ou non) déterminent la force de l'indication.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Indications en rythme sinusal" color={c} onClick={()=>go("rs")}/>
        <Btn title="Cas particuliers (FA, stimulation VD)" color={c} onClick={()=>go("part")}/>
        <Btn title="CRT-P ou CRT-D ?" color={c} onClick={()=>go("pd")}/>
      </div>
    </div>);

    case "rs": return (<div>
      <Sec title="Rythme sinusal, IC symptomatique malgré traitement optimal" color={c}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Situation (FEVG ≤ 35 %)","Recommandation"],
        ["BBG + QRS ≥ 150 ms","Classe I"],
        ["BBG + QRS 130–149 ms","Classe IIa"],
        ["Non-BBG + QRS ≥ 150 ms","Classe IIa"],
        ["Non-BBG + QRS 130–149 ms","Classe IIb"],
        ["QRS < 130 ms (sans indication de stimulation)","Non indiqué — classe III"],
      ]}/>
      <Res title="Points clés" classe="ESC 2021" level="" color={c} icon="📋" items={[
        "Le seuil bas de QRS est passé de 120 à 130 ms par rapport à 2013",
        "Le BBG + QRS 130–149 ms a été rétrogradé de classe I à IIa",
        "Le bloc de branche droit isolé n'est pas une indication reconnue",
        "Prérequis : traitement médical optimal et symptômes persistants",
      ]}/>
      <SeeAlso items={[
        { label:"Insuffisance cardiaque (ICFEr)", icon:"💧", color:"#A267D9", target:{ kind:"topic", chapterKey:"ic", topicKey:"hfref" } },
      ]}/>
    </div>);

    case "part": return (<div>
      <Sec title="Cas particuliers" color={c}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Situation","Recommandation"],
        ["FEVG < 40 % + BAV de haut degré nécessitant une stimulation","CRT plutôt que stimulation VD — classe I"],
        ["FA + IC + fréquence non contrôlée, candidat à ablation de la jonction AV","CRT — classe I"],
        ["FA permanente + FEVG ≤ 35 % + NYHA III–IV + QRS ≥ 130 ms","CRT à envisager, si capture biventriculaire assurée"],
        ["Capture biventriculaire incomplète (< 90–95 %) en FA","Ajouter une ablation de la jonction AV"],
        ["Échec de sonde ventriculaire gauche","Stimulation hissienne à envisager (IIa)"],
      ]}/>
      <Info title="Réflexe" color={c}>
        Chez un patient à FEVG altérée qui va être appareillé pour un bloc, la question n'est pas « pacemaker simple ou double chambre » mais « faut-il d'emblée une resynchronisation ».
      </Info>
    </div>);

    case "pd": return (<div>
      <Sec title="CRT-P ou CRT-D ?" color={c}/>
      <Res title="Principe de décision" classe="Pratique" level="" color={c} icon="🔋" items={[
        "Un patient candidat à la resynchronisation ET relevant par ailleurs d'un défibrillateur reçoit un CRT-D",
        "Le CRT-P suffit quand l'indication de défibrillateur n'est pas retenue (âge élevé, comorbidités, espérance de vie limitée, cardiopathie non ischémique à faible risque rythmique)",
        "La décision intègre l'espérance de vie, les comorbidités et les préférences du patient (décision partagée)",
      ]}/>
      <SeeAlso items={[
        { label:"Défibrillateur (DAI)", icon:"⚡", color:"#EB5757", target:{ kind:"stim", topicKey:"dai" } },
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Défibrillateur (DAI) ─────────────────────────────────────────
function STIMdaiContent({ go, step }) {
  const c = STIM_TOPICS.dai.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Défibrillateur implantable" color={c}>
        ESC 2022 (arythmies ventriculaires et mort subite). Prérequis constant : espérance de vie supérieure à 1 an avec un bon état fonctionnel.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Prévention secondaire" color={c} onClick={()=>go("sec")}/>
        <Btn title="Prévention primaire" color={c} onClick={()=>go("prim")}/>
        <Btn title="Cardiomyopathies & cas particuliers" color={c} onClick={()=>go("cmp")}/>
        <Btn title="Type de dispositif (sous-cutané, gilet)" color={c} onClick={()=>go("type")}/>
      </div>
    </div>);

    case "sec": return (<div>
      <Sec title="Prévention secondaire" color={c}/>
      <Res title="Indication" classe="ESC 2022" level="Classe I" color={c} icon="🔁" items={[
        "Survivant d'un arrêt cardiaque par fibrillation ventriculaire ou tachycardie ventriculaire, en l'absence de cause totalement réversible",
        "Tachycardie ventriculaire soutenue mal tolérée sur cardiopathie structurelle",
        "Toujours avec une espérance de vie supérieure à 1 an et un bon état fonctionnel",
      ]}/>
      <Info title="Cause réversible" color={c}>
        Une FV survenant à la phase aiguë d'un infarctus (premières 48 h) ne constitue pas en soi une indication de défibrillateur. De même pour une torsade de pointes sur QT allongé médicamenteux corrigé, ou une arythmie sur trouble ionique majeur.
      </Info>
      <SeeAlso items={[
        { label:"Arrêt cardiaque", icon:"🫀", color:"#EB5757", target:{ kind:"topic", chapterKey:"urgences", topicKey:"acr" } },
      ]}/>
    </div>);

    case "prim": return (<div>
      <Sec title="Prévention primaire" color={c}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Situation","Recommandation"],
        ["Cardiopathie ischémique, NYHA II–III, FEVG ≤ 35 % malgré ≥ 3 mois de traitement optimal","Classe I"],
        ["Cardiomyopathie dilatée non ischémique, mêmes critères","Classe IIa"],
        ["Moins de 40 jours après un infarctus","Non recommandé"],
        ["NYHA IV réfractaire, non candidat à greffe/assistance","Non recommandé"],
        ["Espérance de vie < 1 an","Non recommandé"],
      ]}/>
      <Res title="Points clés" classe="ESC 2022" level="" color={c} icon="🛡️" items={[
        "L'indication en cardiopathie non ischémique a été rétrogradée en IIa à la suite de l'essai DANISH",
        "Le délai de 3 mois de traitement optimal est essentiel : la FEVG peut remonter et faire disparaître l'indication",
        "Réévaluer la FEVG après optimisation complète (incluant ARNI, bêtabloquant, ARM, iSGLT2)",
        "Dans l'attente, un gilet défibrillateur peut être discuté chez les patients à risque transitoire élevé",
      ]}/>
      <SeeAlso items={[
        { label:"ICFEr — traitement", icon:"💧", color:"#A267D9", target:{ kind:"topic", chapterKey:"ic", topicKey:"hfref" } },
      ]}/>
    </div>);

    case "cmp": return (<div>
      <Sec title="Cardiomyopathies et situations spécifiques" color={c}/>
      <Table cols="1.4fr 1.4fr" rows={[
        ["Contexte","Repère"],
        ["Cardiomyopathie hypertrophique","Score de risque à 5 ans ; en risque intermédiaire, le DAI est à envisager si rehaussement tardif étendu, FEVG < 50 %, réponse tensionnelle anormale à l'effort, anévrysme apical ou mutation sarcomérique"],
        ["Cardiomyopathie dilatée / hypokinétique non dilatée","Mutations à risque rythmique élevé : LMNA, PLN, FLNC, RBM20"],
        ["Cardiomyopathie arythmogène","Stratification spécifique (syncope, TV, dysfonction VD/VG, étendue du rehaussement)"],
        ["Amylose cardiaque","DAI à envisager en cas de TV mal tolérée"],
        ["Attente de transplantation","DAI à envisager (IIa) ; gilet défibrillateur possible"],
      ]}/>
      <SeeAlso items={[
        { label:"Cardiomyopathies", icon:"🫀", color:"#A267D9", target:{ kind:"chapter", chapterKey:"cmp" } },
      ]}/>
    </div>);

    case "type": return (<div>
      <Sec title="Choix du dispositif" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Dispositif","Quand y penser"],
        ["DAI transveineux simple chambre","Indication rythmique isolée sans besoin de stimulation"],
        ["DAI double chambre","Si stimulation atriale nécessaire (dysfonction sinusale associée)"],
        ["CRT-D","Indication de resynchronisation associée"],
        ["DAI sous-cutané","Pas de besoin de stimulation anti-bradycardique, ni d'ATP, ni de resynchronisation ; utile en cas de difficulté d'accès veineux ou de risque infectieux"],
        ["Gilet défibrillateur","Risque transitoire élevé : attente d'optimisation, post-infarctus récent, attente de greffe, infection de matériel"],
      ]}/>
      <Info title="Limite du sous-cutané" color={c}>
        Le DAI sous-cutané ne stimule pas : il ne convient ni aux patients nécessitant une stimulation anti-bradycardique, ni à ceux susceptibles de bénéficier d'une stimulation anti-tachycardique.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Programmation & suivi ────────────────────────────────────────
function STIMprogContent({ go, step }) {
  const c = STIM_TOPICS.prog.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Programmation & suivi" color={c}>
        Une programmation adaptée réduit les chocs inappropriés et la mortalité. ESC 2022.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Programmation du défibrillateur" color={c} onClick={()=>go("prog")}/>
        <Btn title="Suivi & télésurveillance" color={c} onClick={()=>go("suivi")}/>
        <Btn title="Orage rythmique" color={c} onClick={()=>go("orage")}/>
      </div>
    </div>);

    case "prog": return (<div>
      <Sec title="Programmation du DAI" color={c}/>
      <Table cols="1.4fr 1.4fr" rows={[
        ["Paramètre","Repère (ESC 2022)"],
        ["Zone de thérapie (prévention primaire)","≥ 188 battements/min"],
        ["Délai de détection","Prolongé : 6–12 s ou ≥ 30 intervalles"],
        ["Stimulation anti-tachycardique (ATP)","À activer dans toutes les zones de TV ; burst préféré au ramp"],
        ["Discriminateurs TSV/TV","Activés jusqu'à 230 battements/min"],
        ["Alertes de sonde","Activées, avec télésurveillance"],
        ["Stimulation ventriculaire","Minimisée si non indiquée"],
      ]}/>
      <Res title="Objectif" classe="ESC 2022" level="" color={c} icon="⚙️" items={[
        "Laisser le temps aux arythmies non soutenues de s'arrêter spontanément (détection prolongée)",
        "Privilégier l'ATP, indolore, avant le choc",
        "Réduire les chocs inappropriés améliore la qualité de vie et le pronostic",
      ]}/>
    </div>);

    case "suivi": return (<div>
      <Sec title="Suivi du porteur de dispositif" color={c}/>
      <Res title="Ce qu'on vérifie" classe="Pratique" level="" color={c} icon="📡" items={[
        "État de la pile et impédances de sondes",
        "Seuils de stimulation et qualité de détection",
        "Pourcentage de stimulation par cavité (et capture biventriculaire si resynchronisation)",
        "Épisodes enregistrés : arythmies atriales (FA silencieuse), TV/FV, thérapies délivrées",
        "Alertes techniques : dysfonction de sonde, bruit",
      ]}/>
      <Info title="Télésurveillance" color={c}>
        Recommandée : elle permet de détecter précocement les dysfonctions de sonde, les arythmies asymptomatiques et l'épuisement de la pile, et réduit les consultations non nécessaires.
      </Info>
      <Info title="En pratique" color={c}>
        La découverte d'épisodes atriaux rapides sur un dispositif (AHRE) doit faire discuter une anticoagulation en fonction de la durée des épisodes et du risque thromboembolique.
      </Info>
      <SeeAlso items={[
        { label:"FA — anticoagulation", icon:"💊", color:"#A267D9", target:{ kind:"fa", topicKey:"fa_aoc" } },
      ]}/>
    </div>);

    case "orage": return (<div>
      <Sec title="Orage rythmique" color={c}/>
      <Res title="Définition" classe="ESC 2022" level="" color={c} icon="🌩️" items={[
        "Au moins 3 épisodes distincts de TV/FV en 24 h nécessitant une intervention (thérapie du DAI ou cardioversion)",
        "Situation grave, associée à une surmortalité et à un retentissement psychologique majeur",
      ]}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Étape","Action"],
        ["Interroger le dispositif","Confirmer le rythme, distinguer thérapies appropriées et inappropriées, reprogrammer"],
        ["Traiter les facteurs déclenchants","Ischémie, troubles ioniques, décompensation, médicaments allongeant le QT"],
        ["Traitement anti-arythmique","Bêtabloquant ; amiodarone selon le contexte"],
        ["Sédation","Réduit le tonus adrénergique ; intubation si nécessaire"],
        ["Ablation","Ablation de TV en centre spécialisé, précoce en cas de récidives"],
        ["Modulation autonome / assistance","Blocs sympathiques, assistance circulatoire dans les formes réfractaires"],
      ]}/>
      <SeeAlso items={[
        { label:"Doses d'urgence", icon:"💉", color:"#D0442F", target:{ kind:"topic", chapterKey:"urgences", topicKey:"doses" } },
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Complications & dysfonctions ─────────────────────────────────
function STIMcomplContent({ go, step }) {
  const c = STIM_TOPICS.compl.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Complications & dysfonctions" color={c}>
        Savoir reconnaître une anomalie de fonctionnement sur l'ECG est un réflexe de garde.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Complications de l'implantation" color={c} onClick={()=>go("impl")}/>
        <Btn title="Dysfonctions à l'ECG" color={c} onClick={()=>go("ecg")}/>
        <Btn title="Infection de matériel" color={c} onClick={()=>go("infect")}/>
        <Btn title="Chocs inappropriés" color={c} onClick={()=>go("chocs")}/>
      </div>
    </div>);

    case "impl": return (<div>
      <Sec title="Complications péri-opératoires" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Complication","Repère"],
        ["Hématome de loge","Favorisé par les antithrombotiques ; éviter le drainage systématique"],
        ["Pneumothorax","Après ponction sous-clavière ; radiographie de contrôle"],
        ["Déplacement de sonde","Surtout dans les premières semaines : perte de capture ou de détection"],
        ["Perforation / tamponnade","Douleur, hoquet, seuils qui montent, hypotension"],
        ["Thrombose veineuse du membre supérieur","Œdème du bras homolatéral"],
        ["Infection","Précoce ou tardive — voir la rubrique dédiée"],
      ]}/>
      <Info title="À savoir" color={c}>
        Les femmes présentent des taux de complications plus élevés (pneumothorax, épanchement péricardique, hématome de loge), possiblement pour des raisons anatomiques.
      </Info>
    </div>);

    case "ecg": return (<div>
      <Sec title="Reconnaître une dysfonction sur l'ECG" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Anomalie","Ce qu'on voit / causes"],
        ["Défaut de capture","Spike non suivi de dépolarisation : déplacement de sonde, seuil élevé, hyperkaliémie, fibrose, médicaments"],
        ["Absence de stimulation","Pas de spike alors qu'attendu : sur-détection, rupture de sonde, épuisement de pile"],
        ["Sous-détection","Spike inapproprié au milieu du cycle : signal intracardiaque trop faible, déplacement"],
        ["Sur-détection","Inhibition inappropriée : myopotentiels, onde T, interférences électromagnétiques"],
        ["Syndrome du pacemaker","Perte du synchronisme AV en VVI : asthénie, dyspnée, pulsations cervicales, hypotension"],
        ["Tachycardie par réentrée électronique","En DDD : tachycardie à la fréquence maximale de suivi"],
        ["Syndrome de Twiddler","Manipulation du boîtier par le patient, enroulement et déplacement de sonde"],
      ]}/>
      <Info title="Réflexe de garde" color={c}>
        Devant tout dysfonctionnement, penser à l'hyperkaliémie (élévation des seuils de capture) et vérifier la kaliémie, surtout chez l'insuffisant rénal.
      </Info>
      <SeeAlso items={[
        { label:"ECG pathologique", icon:"📈", color:"#C26A1C", target:{ kind:"refcard", topicKey:"ecgpath" } },
        { label:"Hyperkaliémie", icon:"🧪", color:ACCENT, target:{ kind:"topic", chapterKey:"metab", topicKey:"hyperk" } },
      ]}/>
    </div>);

    case "infect": return (<div>
      <Sec title="Infection de matériel" color={c}/>
      <Res title="Principes" classe="ESC 2023 (endocardite)" level="" color={c} icon="🦠" items={[
        "Toute infection de matériel implantable impose l'extraction complète du système (boîtier et sondes), associée à l'antibiothérapie",
        "Une antibiothérapie seule expose à la rechute",
        "Formes : infection de loge (rougeur, écoulement, désunion) ou endocardite sur sonde (fièvre, hémocultures positives, végétation)",
        "Hémocultures et échocardiographie (transœsophagienne au besoin) systématiques",
        "Réimplantation différée, après négativation des hémocultures, et réévaluation de l'indication initiale",
      ]}/>
      <SeeAlso items={[
        { label:"Endocardite infectieuse", icon:"🦠", color:"#EB5757", target:{ kind:"chapter", chapterKey:"endo" } },
      ]}/>
    </div>);

    case "chocs": return (<div>
      <Sec title="Chocs inappropriés" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Cause","Conduite"],
        ["FA rapide / flutter","Contrôle de la fréquence, discriminateurs, ± anti-arythmique ou ablation"],
        ["Tachycardie sinusale","Ajuster les zones, bêtabloquant"],
        ["Sur-détection de l'onde T","Reprogrammation de la sensibilité"],
        ["Fracture / dysfonction de sonde","Bruit sur les électrogrammes, impédance anormale : révision de sonde"],
        ["Interférences électromagnétiques","Identifier la source"],
      ]}/>
      <Res title="Conduite immédiate" classe="Pratique" level="" color={c} icon="⚡" items={[
        "Chocs répétés : appliquer un aimant sur le boîtier suspend les thérapies anti-tachycardiques (sans arrêter la stimulation)",
        "Interroger le dispositif en urgence pour distinguer choc approprié et inapproprié",
        "Rechercher un facteur déclenchant et rassurer : les chocs ont un fort retentissement psychologique",
      ]}/>
    </div>);
    default: return null;
  }
}

// ── IRM & situations particulières ───────────────────────────────
function STIMsituContent({ go, step }) {
  const c = STIM_TOPICS.situ.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Situations particulières" color={c}>
        Questions fréquentes en garde et en consultation chez le porteur de stimulateur ou de défibrillateur.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="IRM chez le porteur de dispositif" color={c} onClick={()=>go("irm")}/>
        <Btn title="Chirurgie & bistouri électrique" color={c} onClick={()=>go("chir")}/>
        <Btn title="Effet de l'aimant" color={c} onClick={()=>go("aimant")}/>
        <Btn title="Fin de vie & désactivation" color={c} onClick={()=>go("fin")}/>
      </div>
    </div>);

    case "irm": return (<div>
      <Sec title="IRM et dispositifs implantés" color={c}/>
      <Res title="Règles" classe="ESC 2021" level="" color={c} icon="🧲" items={[
        "L'IRM peut être réalisée en sécurité chez les porteurs d'un système déclaré compatible, en respectant les instructions du fabricant",
        "La compatibilité concerne l'ensemble du système : boîtier ET sondes",
        "Protocole encadré : reprogrammation adaptée avant l'examen, surveillance pendant, reprogrammation après",
        "Systèmes non compatibles ou sondes abandonnées : décision au cas par cas, en centre expérimenté, après évaluation du rapport bénéfice-risque",
      ]}/>
      <Info title="En pratique" color={c}>
        Ne jamais répondre « IRM contre-indiquée » de principe : la très grande majorité des dispositifs récents sont compatibles. Vérifier la carte de porteur et contacter le rythmologue.
      </Info>
    </div>);

    case "chir": return (<div>
      <Sec title="Chirurgie et bistouri électrique" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Mesure","Détail"],
        ["Bistouri bipolaire","À privilégier ; sinon, salves brèves"],
        ["Plaque de retour","Positionnée pour que le courant ne traverse pas le boîtier"],
        ["Patient dépendant du stimulateur","Programmer un mode asynchrone (ou aimant) pour éviter l'inhibition"],
        ["Porteur de défibrillateur","Suspendre les thérapies en peropératoire, avec scope continu et défibrillateur externe disponible"],
        ["Après l'intervention","Réactiver les thérapies et contrôler le dispositif"],
      ]}/>
      <Info title="Ne jamais oublier" color={c}>
        Un défibrillateur dont les thérapies ont été suspendues doit être réactivé : le patient reste sous surveillance scopée tant que ce n'est pas fait.
      </Info>
      <Info title="Radiothérapie" color={c}>
        Éviter l'irradiation directe du boîtier, évaluation dosimétrique préalable et surveillance du dispositif pendant et après le traitement ; repositionnement du boîtier parfois nécessaire.
      </Info>
    </div>);

    case "aimant": return (<div>
      <Sec title="Effet de l'aimant" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Dispositif","Effet de l'aimant"],
        ["Stimulateur (pacemaker)","Passage en mode asynchrone à une fréquence fixe (dépend du fabricant et de l'état de la pile)"],
        ["Défibrillateur (DAI)","Suspension des thérapies anti-tachycardiques ; la fonction de stimulation n'est PAS modifiée"],
      ]}/>
      <Res title="Usages" classe="Pratique" level="" color={c} icon="🧭" items={[
        "Chocs répétés inappropriés : l'aimant suspend les thérapies en attendant l'interrogation",
        "Inhibition par interférences chez un patient dépendant : l'aimant rétablit une stimulation asynchrone",
        "L'effet cesse dès le retrait de l'aimant",
      ]}/>
    </div>);

    case "fin": return (<div>
      <Sec title="Fin de vie et désactivation" color={c}/>
      <Res title="Principes" classe="Éthique & pratique" level="" color={c} icon="🕊️" items={[
        "En situation de fin de vie, la désactivation des thérapies de choc du défibrillateur doit être discutée pour éviter des chocs douloureux dans les derniers moments",
        "La décision se prend avec le patient (ou selon ses directives anticipées) et l'équipe, et se documente clairement dans le dossier",
        "La fonction de stimulation n'est en général pas désactivée : son arrêt n'apporte pas de confort et peut aggraver les symptômes chez un patient dépendant",
        "Anticiper la discussion : elle est plus difficile en situation d'urgence",
      ]}/>
      <Info title="Conduite automobile" color={c}>
        Des restrictions temporaires existent après l'implantation et après une thérapie appropriée, avec des règles distinctes pour la conduite professionnelle. Se référer à la réglementation nationale en vigueur.
      </Info>
    </div>);
    default: return null;
  }
}

function StimContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "indic") return <STIMindicContent {...props}/>;
  if (topic === "modes") return <STIMmodesContent {...props}/>;
  if (topic === "crt")   return <STIMcrtContent   {...props}/>;
  if (topic === "dai")   return <STIMdaiContent   {...props}/>;
  if (topic === "prog")  return <STIMprogContent  {...props}/>;
  if (topic === "compl") return <STIMcomplContent {...props}/>;
  if (topic === "situ")  return <STIMsituContent  {...props}/>;
  return null;
}


// ═══ CARDIOPATHIES CONGÉNITALES DE L'ADULTE ═══════════════════════
function CONGprincContent({ go, step }) {
  const c = CONG_TOPICS.princ.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Principes de prise en charge" color={c}>
        ESC 2020. La cardiopathie congénitale est une maladie chronique à vie : la réparation chirurgicale corrige l&apos;anatomie mais ne guérit pas la maladie.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Classification de complexité" color={c} onClick={()=>go("classif")}/>
        <Btn title="Qui suit qui, et où ?" color={c} onClick={()=>go("orga")}/>
        <Btn title="Bilan et surveillance" color={c} onClick={()=>go("bilan")}/>
      </div>
    </div>);

    case "classif": return (<div>
      <Sec title="Complexité — 3 niveaux (ESC 2020)" color={c}/>
      <Table cols="1fr 1.8fr" rows={[
        ["Niveau","Exemples"],
        ["Légère","CIA ostium secundum ou CIV isolées de petite taille, canal artériel isolé, sténose pulmonaire légère, lésions simples réparées sans séquelle"],
        ["Modérée","CIA sinus venosus / ostium primum, CIV avec anomalie associée, coarctation, tétralogie de Fallot réparée, anomalie d&apos;Ebstein, retour veineux pulmonaire anormal"],
        ["Sévère","Toute cardiopathie avec maladie vasculaire pulmonaire (dont Eisenmenger), cyanose, circulation de Fontan, ventricule droit systémique, transposition des gros vaisseaux, cœur univentriculaire, atrésie pulmonaire"],
      ]}/>
      <Res title="Pourquoi cela compte" classe="ESC 2020" level="" color={c} icon="📊" items={[
        "Le niveau de complexité détermine le rythme de suivi et le lieu de prise en charge",
        "Les formes modérées et sévères doivent être suivies au moins en partie en centre expert",
        "Les formes sévères relèvent d&apos;un suivi exclusif ou co-piloté par un centre expert",
      ]}/>
    </div>);

    case "orga": return (<div>
      <Sec title="Organisation du suivi" color={c}/>
      <Res title="Principes" classe="ESC 2020" level="" color={c} icon="🏥" items={[
        "Suivi à vie, même après une réparation dite complète : les séquelles apparaissent souvent des années plus tard",
        "Transition organisée entre la cardiologie pédiatrique et la cardiologie adulte, à ne pas laisser au hasard",
        "La perte de vue est un problème majeur : beaucoup de patients réapparaissent au stade de complication",
        "Centre expert : équipe pluridisciplinaire dédiée (cardiologue congénitaliste, chirurgien, imageur, rythmologue, obstétricien, anesthésiste)",
        "Planification anticipée des soins chez les formes sévères, à mesure que la population vieillit",
      ]}/>
      <Info title="En pratique" color={c}>
        Devant un adulte porteur d&apos;une cardiopathie congénitale, la première action utile est de reconstituer l&apos;histoire : diagnostic initial, dates et nature des interventions, comptes-rendus opératoires. Sans cela, l&apos;interprétation de l&apos;imagerie est hasardeuse.
      </Info>
    </div>);

    case "bilan": return (<div>
      <Sec title="Bilan et surveillance" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Examen","Apport"],
        ["ETT","Examen de première ligne, mais fenêtres souvent limitées après chirurgie"],
        ["IRM cardiaque","Référence pour les volumes et la fonction du ventricule droit, les shunts et l&apos;anatomie des gros vaisseaux"],
        ["Scanner","Alternative si IRM impossible ; anatomie coronaire, stents, calcifications"],
        ["Épreuve d&apos;effort / VO₂","Suivi objectif de la capacité fonctionnelle, valeur pronostique"],
        ["Holter","Dépistage des arythmies, très fréquentes et pronostiques"],
        ["Biomarqueurs (BNP/NT-proBNP)","Utiles dans le suivi, en tendance plutôt qu&apos;en valeur isolée"],
        ["Cathétérisme droit","Indispensable si suspicion de maladie vasculaire pulmonaire"],
      ]}/>
      <Info title="Piège" color={c}>
        Une saturation en oxygène doit être mesurée systématiquement, au repos et à l&apos;effort : une cyanose modérée peut passer inaperçue à l&apos;inspection.
      </Info>
      <SeeAlso items={[
        { label:"IRM cardiaque", icon:"🧲", color:"#A267D9", target:{ kind:"refcard", topicKey:"irm" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function CONGshuntContent({ go, step }) {
  const c = CONG_TOPICS.shunt.color;
  switch(step) {
    case "start": return (<div>
      <Info title="↔️ Shunts gauche-droite" color={c}>
        La décision de fermeture repose sur le retentissement (surcharge volumétrique) et sur les résistances vasculaires pulmonaires.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Communication interauriculaire (CIA)" color={c} onClick={()=>go("cia")}/>
        <Btn title="Communication interventriculaire (CIV)" color={c} onClick={()=>go("civ")}/>
        <Btn title="Canal artériel persistant" color={c} onClick={()=>go("pca")}/>
        <Btn title="Seuils de résistances pulmonaires" color={c} onClick={()=>go("rvp")}/>
      </div>
    </div>);

    case "cia": return (<div>
      <Sec title="Communication interauriculaire" color={c}/>
      <Res title="Quand fermer" classe="ESC 2020" level="Classe I" color={c} icon="🔵" items={[
        "Surcharge volumétrique du ventricule droit (dilatation) avec shunt significatif et résistances pulmonaires inférieures à 3 unités Wood — fermeture recommandée, quels que soient les symptômes",
        "La fermeture percutanée est la méthode de choix pour une CIA ostium secundum anatomiquement favorable",
        "Les CIA sinus venosus, ostium primum et sinus coronaire relèvent de la chirurgie",
      ]}/>
      <Res title="Points de vigilance" classe="Pratique" level="" color={c} icon="⚠️" items={[
        "Toujours rechercher un retour veineux pulmonaire anormal associé (fréquent avec les formes sinus venosus)",
        "Chez le sujet âgé ou en cas de cardiopathie gauche, la fermeture peut démasquer une élévation des pressions de remplissage : test d&apos;occlusion au ballon et discussion d&apos;une fermeture fenêtrée ou d&apos;une abstention",
        "Après 40 ans, la fermeture réduit les symptômes et les événements mais ne supprime pas le risque d&apos;arythmie atriale",
      ]}/>
      <Info title="À retenir" color={c}>
        Une CIA découverte devant une dilatation inexpliquée des cavités droites doit faire chercher activement le shunt : échographie de contraste, ETO, IRM.
      </Info>
    </div>);

    case "civ": return (<div>
      <Sec title="Communication interventriculaire" color={c}/>
      <Table cols="1.5fr 1.3fr" rows={[
        ["Situation","Conduite"],
        ["Surcharge volumétrique du VG avec shunt significatif, sans maladie vasculaire pulmonaire","Fermeture recommandée"],
        ["Antécédent d&apos;endocardite sur la CIV","Fermeture à envisager"],
        ["Insuffisance aortique progressive par prolapsus sigmoïdien","Fermeture à envisager"],
        ["CIV restrictive, petite, sans retentissement","Surveillance simple, pas de fermeture"],
        ["Maladie vasculaire pulmonaire avancée","Fermeture non recommandée"],
      ]}/>
      <Info title="Suivi" color={c}>
        Une petite CIV isolée sans retentissement garde un pronostic excellent : la surveillance porte sur l&apos;apparition d&apos;une insuffisance aortique, d&apos;une endocardite et sur l&apos;évolution du shunt.
      </Info>
    </div>);

    case "pca": return (<div>
      <Sec title="Canal artériel persistant" color={c}/>
      <Res title="Conduite" classe="ESC 2020" level="" color={c} icon="🔗" items={[
        "Fermeture recommandée en cas de surcharge volumétrique du ventricule gauche avec résistances pulmonaires basses",
        "La fermeture percutanée est la technique de première intention",
        "Un canal minime, sans retentissement ni souffle audible, ne justifie pas de fermeture systématique",
        "Fermeture non recommandée en cas de maladie vasculaire pulmonaire avancée avec shunt inversé",
      ]}/>
    </div>);

    case "rvp": return (<div>
      <Sec title="Résistances vasculaires pulmonaires — seuils décisionnels" color={c}/>
      <Table cols="1.4fr 1.4fr" rows={[
        ["Résistances (unités Wood)","Décision (shunt significatif, rapport de débits > 1,5)"],
        ["Inférieures à 3","Fermeture recommandée (CIA, CIV, canal artériel)"],
        ["Entre 3 et 5","Décision individualisée en centre expert"],
        ["≥ 5, abaissées sous 5 après traitement ciblé","CIA : fermeture fenêtrée seulement, à envisager ; CIV et canal : décision individuelle en centre expert"],
        ["≥ 5 malgré traitement ciblé","Fermeture non recommandée"],
      ]}/>
      <Res title="Règle de sécurité" classe="ESC 2020" level="Classe I" color={c} icon="📐" items={[
        "Devant tout shunt avec signes non invasifs d&apos;élévation des pressions pulmonaires, la mesure invasive des résistances est obligatoire avant toute décision",
        "Fermer un shunt en présence d&apos;une maladie vasculaire pulmonaire établie supprime la soupape de sécurité et aggrave le pronostic",
      ]}/>
      <SeeAlso items={[
        { label:"HTAP", icon:"🫁", color:"#1684A8", target:{ kind:"chapter", chapterKey:"htap" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function CONGobstContent({ go, step }) {
  const c = CONG_TOPICS.obst.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Obstacles" color={c}>
        Coarctation et obstacles à l&apos;éjection : des lésions souvent considérées comme réglées dans l&apos;enfance, mais qui récidivent et se compliquent à l&apos;âge adulte.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Coarctation de l&apos;aorte" color={c} onClick={()=>go("coarct")}/>
        <Btn title="Obstacle pulmonaire" color={c} onClick={()=>go("rvot")}/>
        <Btn title="Obstacle aortique congénital" color={c} onClick={()=>go("lvot")}/>
      </div>
    </div>);

    case "coarct": return (<div>
      <Sec title="Coarctation et re-coarctation" color={c}/>
      <Res title="Quand intervenir" classe="ESC 2020" level="" color={c} icon="🩸" items={[
        "Gradient invasif significatif entre membres supérieurs et inférieurs, en particulier chez l&apos;hypertendu",
        "Rétrécissement anatomique important avec circulation collatérale, même si le gradient est faussement bas",
        "Hypertension artérielle difficile à contrôler avec sténose documentée",
        "Traitement : stent ou angioplastie chez l&apos;adulte le plus souvent, chirurgie selon l&apos;anatomie",
      ]}/>
      <Res title="Le suivi après réparation" classe="Points clés" level="" color={c} icon="⚠️" items={[
        "Hypertension artérielle résiduelle très fréquente, même après réparation réussie : à dépister à vie, y compris à l&apos;effort",
        "Rechercher une re-coarctation, un anévrysme au site de réparation et des anévrysmes intracrâniens",
        "Bicuspidie aortique associée dans une majorité de cas : surveiller la valve et l&apos;aorte ascendante",
        "Imagerie de l&apos;aorte (IRM ou scanner) à intervalles réguliers, pas seulement une échographie",
      ]}/>
      <SeeAlso items={[
        { label:"Aorte thoracique", icon:"🎈", color:"#C26A1C", target:{ kind:"chapter", chapterKey:"aorte" } },
        { label:"HTA — bilan", icon:"🩸", color:"#2F8F66", target:{ kind:"topic", chapterKey:"hta", topicKey:"bilan" } },
      ]}/>
    </div>);

    case "rvot": return (<div>
      <Sec title="Obstacle sur la voie droite" color={c}/>
      <Res title="Repères" classe="ESC 2020" level="" color={c} icon="🫁" items={[
        "Sténose pulmonaire valvulaire serrée symptomatique : valvuloplastie percutanée en première intention si la valve est souple",
        "Sténose serrée asymptomatique avec retentissement sur le ventricule droit : intervention à envisager",
        "Les sténoses légères ont un excellent pronostic et évoluent peu",
        "Les obstacles sous- ou sus-valvulaires et les sténoses de branches relèvent d&apos;une évaluation spécialisée",
      ]}/>
    </div>);

    case "lvot": return (<div>
      <Sec title="Obstacle sur la voie gauche" color={c}/>
      <Res title="Repères" classe="ESC 2020" level="" color={c} icon="🫀" items={[
        "Bicuspidie aortique : cause la plus fréquente de sténose aortique du sujet jeune, avec aortopathie associée à surveiller",
        "Sténose sous-aortique membraneuse : tendance à récidiver et à léser la valve aortique, indication chirurgicale si gradient significatif ou insuffisance aortique progressive",
        "Sténose supra-valvulaire : penser au syndrome de Williams, atteinte fréquente des coronaires",
      ]}/>
      <SeeAlso items={[
        { label:"Rétrécissement aortique", icon:"🔴", color:"#E85D4A", target:{ kind:"valve", topicKey:"rac" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function CONGfallotContent({ go, step }) {
  const c = CONG_TOPICS.fallot.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Tétralogie de Fallot opérée" color={c}>
        La cardiopathie cyanogène la plus fréquente. Après réparation, la survie est excellente, mais les complications tardives sont la règle et justifient un suivi à vie.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Complications à surveiller" color={c} onClick={()=>go("compl")}/>
        <Btn title="Remplacement de la valve pulmonaire" color={c} onClick={()=>go("rvp")}/>
        <Btn title="Risque rythmique" color={c} onClick={()=>go("rythme")}/>
      </div>
    </div>);

    case "compl": return (<div>
      <Sec title="Complications tardives" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Complication","Commentaire"],
        ["Insuffisance pulmonaire","Quasi constante après élargissement de la voie droite : bien tolérée longtemps, puis dilatation et dysfonction du ventricule droit"],
        ["Obstacle résiduel sur la voie droite","Sténose valvulaire, infundibulaire ou de branches"],
        ["Dilatation et dysfonction du ventricule droit","Élément central du suivi, quantifié par IRM"],
        ["Arythmies","Tachycardies atriales et tachycardies ventriculaires par réentrée sur les cicatrices"],
        ["Dilatation de l&apos;aorte ascendante","À surveiller"],
        ["Insuffisance aortique, CIV résiduelle","Moins fréquentes mais à rechercher"],
      ]}/>
      <Info title="Suivi" color={c}>
        L&apos;IRM cardiaque est l&apos;examen clé : elle quantifie la fuite pulmonaire et les volumes du ventricule droit, que l&apos;échographie estime mal.
      </Info>
    </div>);

    case "rvp": return (<div>
      <Sec title="Remplacement de la valve pulmonaire" color={c}/>
      <Res title="Principes de décision" classe="ESC 2020" level="" color={c} icon="🔁" items={[
        "Indication retenue chez le patient symptomatique avec insuffisance pulmonaire sévère ou obstacle significatif",
        "Chez l&apos;asymptomatique, la décision repose sur un faisceau d&apos;arguments : dilatation progressive du ventricule droit, baisse de la fonction ventriculaire droite ou gauche, arythmies, diminution objective de la capacité d&apos;effort",
        "Les seuils volumétriques exacts restent débattus : la décision se prend en centre expert, sur l&apos;évolution plutôt que sur une valeur isolée",
        "Voie percutanée ou chirurgicale selon l&apos;anatomie de la voie droite",
      ]}/>
      <Info title="Le bon moment" color={c}>
        Intervenir trop tard expose à une dysfonction ventriculaire droite irréversible ; intervenir trop tôt expose à des réinterventions répétées, la durée de vie des prothèses étant limitée. D&apos;où l&apos;importance d&apos;un suivi régulier par IRM.
      </Info>
    </div>);

    case "rythme": return (<div>
      <Sec title="Risque rythmique" color={c}/>
      <Res title="Points clés" classe="ESC 2020 / ESC 2022" level="" color={c} icon="⚡" items={[
        "Les tachycardies ventriculaires naissent de circuits de réentrée autour des cicatrices chirurgicales et des zones de patch",
        "Les tachycardies atriales sont fréquentes et souvent mal tolérées",
        "En cas de tachycardie ventriculaire soutenue documentée, cibler les isthmes anatomiques par ablation, idéalement avant une réintervention sur la voie droite qui rendrait le substrat inaccessible",
        "La stratification du risque de mort subite intègre la fonction ventriculaire, la durée du QRS, les arythmies documentées et les résultats de la stimulation programmée",
      ]}/>
      <SeeAlso items={[
        { label:"Défibrillateur (DAI)", icon:"⚡", color:"#EB5757", target:{ kind:"stim", topicKey:"dai" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function CONGcomplexContent({ go, step }) {
  const c = CONG_TOPICS.complex.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Circulations complexes" color={c}>
        Deux situations à connaître : le ventricule droit en position systémique, et la circulation de Fontan (cœur univentriculaire palliatif).
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Ventricule droit systémique" color={c} onClick={()=>go("vds")}/>
        <Btn title="Circulation de Fontan" color={c} onClick={()=>go("fontan")}/>
      </div>
    </div>);

    case "vds": return (<div>
      <Sec title="Ventricule droit systémique" color={c}/>
      <Res title="Deux contextes" classe="Anatomie" level="" color={c} icon="➡️" items={[
        "Transposition des gros vaisseaux réparée par switch atrial (interventions de Mustard ou Senning) : le ventricule droit reste la pompe systémique",
        "Transposition congénitalement corrigée : discordance auriculo-ventriculaire et ventriculo-artérielle",
        "Dans les deux cas, le ventricule droit n&apos;est pas fait pour supporter durablement une pression systémique",
      ]}/>
      <Res title="Ce qu&apos;on surveille" classe="ESC 2020" level="" color={c} icon="⚠️" items={[
        "Dysfonction progressive du ventricule droit systémique",
        "Insuffisance de la valve tricuspide (valve auriculo-ventriculaire systémique), dont l&apos;aggravation accélère la dysfonction ventriculaire",
        "Arythmies atriales et dysfonction sinusale, très fréquentes après switch atrial",
        "Après switch atrial : sténoses ou fuites des chenaux, à rechercher spécifiquement",
      ]}/>
      <Info title="Chirurgie valvulaire" color={c}>
        En cas de fuite tricuspide sévère sur ventricule droit systémique, il est préférable d&apos;intervenir avant l&apos;installation d&apos;une dysfonction ventriculaire marquée : les résultats sont nettement moins bons lorsque la fonction est déjà effondrée.
      </Info>
    </div>);

    case "fontan": return (<div>
      <Sec title="Circulation de Fontan" color={c}/>
      <Res title="Principe" classe="Physiologie" level="" color={c} icon="🔄" items={[
        "Le retour veineux systémique est dirigé directement vers les artères pulmonaires, sans ventricule sous-pulmonaire",
        "Le débit pulmonaire dépend passivement de la pression veineuse centrale et des résistances pulmonaires",
        "Conséquence pratique : tout ce qui augmente les résistances pulmonaires ou diminue la précharge est mal toléré (déshydratation, ventilation en pression positive, arythmie, embolie pulmonaire)",
      ]}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Complication","À rechercher"],
        ["Arythmies atriales","Très mal tolérées : restaurer le rythme sinusal rapidement"],
        ["Thrombose","Risque élevé : anticoagulation selon le contexte"],
        ["Entéropathie exsudative","Diarrhée, œdèmes, hypoalbuminémie — pronostic sévère"],
        ["Bronchite plastique","Rare, grave"],
        ["Maladie hépatique associée au Fontan","Fibrose puis cirrhose, dépistage systématique"],
        ["Cyanose","Fenestration, collatérales veino-systémiques, fistules artério-veineuses pulmonaires"],
      ]}/>
      <Info title="Réflexe de garde" color={c}>
        Chez un patient en circulation de Fontan, méfiance avec le remplissage excessif comme avec la déshydratation, et prudence avec toute ventilation en pression positive. Un avis en centre expert doit être pris précocement.
      </Info>
    </div>);
    default: return null;
  }
}

function CONGeisenContent({ go, step }) {
  const c = CONG_TOPICS.eisen.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Eisenmenger et HTAP des congénitaux" color={c}>
        Le syndrome d&apos;Eisenmenger est l&apos;évolution d&apos;un shunt gauche-droite non corrigé vers une maladie vasculaire pulmonaire avec inversion du shunt et cyanose.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Prise en charge" color={c} onClick={()=>go("pec")}/>
        <Btn title="Pièges à éviter" color={c} onClick={()=>go("pieges")}/>
      </div>
    </div>);

    case "pec": return (<div>
      <Sec title="Prise en charge" color={c}/>
      <Res title="Principes" classe="ESC 2020" level="" color={c} icon="🩺" items={[
        "Prise en charge en centre expert associant compétences congénitales et hypertension pulmonaire",
        "Chez le patient avec capacité d&apos;effort réduite (périmètre de marche de 6 minutes inférieur à 450 m), une monothérapie initiale par antagoniste des récepteurs de l&apos;endothéline est à envisager, avec passage à une association en l&apos;absence d&apos;amélioration",
        "En cas d&apos;hypertension pulmonaire pré-capillaire sur lésion simple réparée : association orale d&apos;emblée ou séquentielle selon le risque, avec prostanoïdes parentéraux dans les formes à haut risque",
        "La fermeture du shunt n&apos;est pas recommandée au stade d&apos;Eisenmenger",
      ]}/>
      <SeeAlso items={[
        { label:"HTAP", icon:"🫁", color:"#1684A8", target:{ kind:"chapter", chapterKey:"htap" } },
      ]}/>
    </div>);

    case "pieges": return (<div>
      <Sec title="Pièges spécifiques" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Situation","Précaution"],
        ["Saignée systématique","À proscrire : l&apos;érythrocytose est adaptative. Saignée réservée aux symptômes d&apos;hyperviscosité sévères avec hématocrite très élevé, après correction d&apos;une carence martiale"],
        ["Carence en fer","Fréquente et délétère, à dépister et corriger"],
        ["Voies veineuses","Filtres anti-bulles indispensables : risque d&apos;embolie paradoxale"],
        ["Altitude, avion, déshydratation","Mal tolérées"],
        ["Anesthésie et chirurgie non cardiaque","Risque élevé, à organiser en centre expert"],
        ["Grossesse","Risque maternel très élevé — voir le chapitre dédié"],
        ["Vasodilatateurs systémiques","Peuvent aggraver le shunt droite-gauche"],
      ]}/>
      <SeeAlso items={[
        { label:"Grossesse & cardiopathie", icon:"🤰", color:"#C2557A", target:{ kind:"chapter", chapterKey:"gross" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function CONGcompliContent({ go, step }) {
  const c = CONG_TOPICS.compli.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Complications transversales" color={c}>
        Quelle que soit la cardiopathie, quelques problèmes reviennent : arythmies, endocardite, cyanose chronique et questions de grossesse.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Arythmies" color={c} onClick={()=>go("rythme")}/>
        <Btn title="Endocardite & prophylaxie" color={c} onClick={()=>go("endo")}/>
        <Btn title="Cyanose chronique" color={c} onClick={()=>go("cyan")}/>
      </div>
    </div>);

    case "rythme": return (<div>
      <Sec title="Arythmies" color={c}/>
      <Res title="Points clés" classe="ESC 2020" level="" color={c} icon="⚡" items={[
        "Première cause d&apos;hospitalisation dans cette population",
        "Les tachycardies atriales par macro-réentrée sur cicatrice sont typiques et souvent mal tolérées : chercher le rythme sinusal plutôt que se contenter de ralentir",
        "Toute arythmie nouvelle doit faire rechercher une dégradation hémodynamique sous-jacente (fuite, obstacle, dysfonction ventriculaire)",
        "L&apos;ablation en centre expert donne de bons résultats mais demande une cartographie adaptée à l&apos;anatomie",
        "L&apos;anticoagulation ne suit pas les scores habituels : elle se discute selon l&apos;anatomie (Fontan, cyanose, ventricule systémique)",
      ]}/>
    </div>);

    case "endo": return (<div>
      <Sec title="Endocardite infectieuse" color={c}/>
      <Res title="Population à risque" classe="ESC 2023" level="" color={c} icon="🦠" items={[
        "Cardiopathie congénitale cyanogène non réparée, ou réparée avec shunt résiduel",
        "Matériel prothétique : les 6 premiers mois après pose, et à vie en cas de shunt résiduel au contact",
        "Antécédent d&apos;endocardite",
        "Antibioprophylaxie lors des gestes dentaires à risque dans ces situations",
        "Éducation : hygiène bucco-dentaire rigoureuse, suivi dentaire régulier, prudence avec piercings et tatouages",
      ]}/>
      <SeeAlso items={[
        { label:"Endocardite infectieuse", icon:"🦠", color:"#EB5757", target:{ kind:"chapter", chapterKey:"endo" } },
        { label:"Antibioprophylaxie", icon:"💊", color:ACCENT, target:{ kind:"refcard", topicKey:"antibio" } },
      ]}/>
    </div>);

    case "cyan": return (<div>
      <Sec title="Cyanose chronique" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Retentissement","Conséquence pratique"],
        ["Érythrocytose secondaire","Adaptative : ne pas saigner de principe"],
        ["Carence martiale","Fréquente, aggrave les symptômes, à corriger"],
        ["Troubles de l&apos;hémostase","Risque hémorragique ET thrombotique coexistants"],
        ["Atteinte rénale","Protéinurie, insuffisance rénale"],
        ["Hyperuricémie, lithiase, arthropathie","À dépister"],
        ["Embolie paradoxale","Filtres sur toutes les voies veineuses"],
        ["Anesthésie","Risque majoré, prise en charge spécialisée"],
      ]}/>
      <Info title="À retenir" color={c}>
        Chez un patient cyanosé, une hémoglobine « normale » est en réalité anormalement basse : elle doit faire chercher une carence en fer.
      </Info>
    </div>);
    default: return null;
  }
}

function CongContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "princ")   return <CONGprincContent   {...props}/>;
  if (topic === "shunt")   return <CONGshuntContent   {...props}/>;
  if (topic === "obst")    return <CONGobstContent    {...props}/>;
  if (topic === "fallot")  return <CONGfallotContent  {...props}/>;
  if (topic === "complex") return <CONGcomplexContent {...props}/>;
  if (topic === "eisen")   return <CONGeisenContent   {...props}/>;
  if (topic === "compli")  return <CONGcompliContent  {...props}/>;
  return null;
}


// ═══ GROSSESSE & CARDIOPATHIE (ESC 2025) ══════════════════════════
function GROSSrisqueContent({ go, step }) {
  const c = GROSS_TOPICS.risque.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Évaluation du risque" color={c}>
        ESC 2025 (remplace la version 2018). Changement de philosophie majeur : on ne dit plus simplement à une femme à haut risque d&apos;éviter la grossesse — on l&apos;informe, on évalue, et on décide avec elle.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Classification mWHO 2.0" color={c} onClick={()=>go("mwho")}/>
        <Btn title="Pregnancy Heart Team" color={c} onClick={()=>go("pht")}/>
        <Btn title="Conseil pré-conceptionnel" color={c} onClick={()=>go("conseil")}/>
        <Btn title="Contraception & procréation assistée" color={c} onClick={()=>go("contra")}/>
      </div>
    </div>);

    case "mwho": return (<div>
      <Sec title="Classification mWHO 2.0" color={c}/>
      <Table cols="1fr 1.9fr" rows={[
        ["Classe","Signification et conduite"],
        ["I","Risque maternel non augmenté ou très peu. Suivi cardiologique limité (une à deux fois pendant la grossesse). Ex. : lésions simples réparées sans séquelle, extrasystoles isolées"],
        ["II","Risque légèrement augmenté. Suivi une fois par trimestre. Ex. : CIA ou CIV non opérée sans retentissement, tétralogie de Fallot réparée, la plupart des arythmies supraventriculaires"],
        ["II–III","Risque intermédiaire. Suivi bimestriel. Ex. : dysfonction ventriculaire gauche légère, cardiomyopathie hypertrophique, coarctation réparée, valvulopathie native modérée"],
        ["III","Risque élevé de morbidité sévère. Suivi mensuel ou bimensuel en centre expert. Ex. : dysfonction ventriculaire modérée, valve mécanique, ventricule droit systémique, circulation de Fontan non compliquée, cardiopathie cyanogène non réparée"],
        ["IV","Risque très élevé de mortalité ou de morbidité sévère. Suivi mensuel ou bimensuel en centre expert. Ex. : hypertension artérielle pulmonaire, dysfonction ventriculaire systémique sévère, rétrécissement mitral serré, rétrécissement aortique serré symptomatique, dilatation aortique majeure, Fontan compliqué"],
      ]}/>
      <Res title="Ce qui change en 2025" classe="ESC 2025" level="" color={c} icon="📊" items={[
        "La mWHO 2.0 élargit la classification à des situations absentes de la version précédente : coronaropathie, syndrome du QT long, cardiomyopathie arythmogène, transposition réparée par switch artériel",
        "Elle couvre désormais dysfonction ventriculaire, hypertension pulmonaire, arythmies, cardiomyopathies, aortopathies et valvulopathies",
        "En classe IV, le discours n&apos;est plus « grossesse contre-indiquée » mais une information complète sur le risque maternel et fœtal, avec décision partagée incluant la possibilité d&apos;une interruption",
        "L&apos;autonomie de la patiente et le soutien psychosocial sont explicitement mis en avant",
      ]}/>
      <Info title="Usage" color={c}>
        Le tableau ci-dessus donne des exemples représentatifs pour situer une patiente. L&apos;attribution exacte de la classe se fait sur la table mWHO 2.0 complète des recommandations, et doit être validée en équipe.
      </Info>
    </div>);

    case "pht": return (<div>
      <Sec title="Pregnancy Heart Team" color={c}/>
      <Res title="Recommandations" classe="ESC 2025" level="" color={c} icon="👥" items={[
        "Toute femme dont la cardiopathie est classée mWHO 2.0 II–III ou au-delà doit être évaluée et suivie par une équipe dédiée, depuis la période pré-conceptionnelle jusqu&apos;au post-partum",
        "Équipe pluridisciplinaire : cardiologue, obstétricien, anesthésiste, néonatologue, et selon les cas généticien, hématologue, réanimateur",
        "En classe IV, une discussion formelle sur le risque de mortalité et de morbidité maternelle et fœtale est recommandée, incluant la question de l&apos;interruption de grossesse dans un processus de décision partagée",
        "Un plan de naissance écrit doit être établi à l&apos;avance et accessible en urgence",
      ]}/>
      <Info title="En pratique" color={c}>
        Le plan de naissance précise le lieu d&apos;accouchement, le mode envisagé, la gestion des anticoagulants, la surveillance hémodynamique, l&apos;analgésie et la conduite en cas d&apos;urgence. C&apos;est le document le plus utile la nuit où la patiente se présente.
      </Info>
    </div>);

    case "conseil": return (<div>
      <Sec title="Conseil pré-conceptionnel" color={c}/>
      <Res title="Ce qu&apos;on fait avant la grossesse" classe="ESC 2025" level="" color={c} icon="🗓️" items={[
        "Évaluation complète : clinique, imagerie, capacité d&apos;effort, biomarqueurs",
        "Optimisation du traitement et arrêt des médicaments contre-indiqués, avec relais planifié",
        "Traiter avant la grossesse ce qui doit l&apos;être : valvulopathie serrée, obstacle, arythmie, dilatation aortique",
        "Dosage des peptides natriurétiques avant la grossesse en cas d&apos;insuffisance cardiaque de toute cause, de cardiomyopathie, de cardiopathie congénitale ou d&apos;hypertension pulmonaire",
        "Conseil génétique et information sur le risque de transmission en cas de maladie héréditaire ; test génétique recommandé en cas de maladie aortique et de cardiomyopathie du péripartum",
        "Après transplantation cardiaque, différer la grossesse d&apos;au moins un an",
      ]}/>
      <Info title="Le bon moment" color={c}>
        Une correction valvulaire ou aortique nécessaire se planifie avant la conception : réaliser ces gestes pendant la grossesse expose la mère et le fœtus à un risque nettement supérieur.
      </Info>
    </div>);

    case "contra": return (<div>
      <Sec title="Contraception et aide à la procréation" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Méthode","Repère chez la femme cardiaque"],
        ["Œstroprogestatifs","À éviter en cas de risque thromboembolique, cardiopathie cyanogène, hypertension pulmonaire, antécédent thrombotique, Fontan"],
        ["Progestatifs seuls, implant","Généralement bien tolérés sur le plan cardiovasculaire"],
        ["Dispositif intra-utérin","Efficace ; risque de réaction vagale à la pose, à anticiper chez les cardiopathies à haut risque"],
        ["Stérilisation","Option à discuter, en tenant compte du risque anesthésique"],
      ]}/>
      <Res title="Procréation médicalement assistée" classe="ESC 2025" level="" color={c} icon="🧪" items={[
        "La stimulation ovarienne comporte des risques propres : syndrome d&apos;hyperstimulation, surcharge volumique, thrombose",
        "L&apos;évaluation cardiologique préalable et l&apos;avis de l&apos;équipe dédiée sont nécessaires",
        "Privilégier les protocoles limitant l&apos;hyperstimulation et le transfert d&apos;un seul embryon (les grossesses multiples majorent la charge hémodynamique)",
      ]}/>
    </div>);
    default: return null;
  }
}

function GROSSphysioContent({ go, step }) {
  const c = GROSS_TOPICS.physio.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Physiologie & examens" color={c}>
        Comprendre les adaptations normales évite deux erreurs : s&apos;alarmer d&apos;un signe physiologique, ou banaliser un signe pathologique.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Adaptations hémodynamiques" color={c} onClick={()=>go("hemo")}/>
        <Btn title="Quels examens, et quand" color={c} onClick={()=>go("exam")}/>
      </div>
    </div>);

    case "hemo": return (<div>
      <Sec title="Adaptations normales" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Paramètre","Évolution"],
        ["Volume plasmatique","Augmente fortement dès le premier trimestre"],
        ["Débit cardiaque","Augmente d&apos;environ 30 à 50 %, maximum vers le deuxième trimestre"],
        ["Fréquence cardiaque","Augmente progressivement"],
        ["Résistances périphériques","Diminuent, d&apos;où une baisse tensionnelle au deuxième trimestre"],
        ["Coagulation","État prothrombotique physiologique"],
        ["Travail et post-partum immédiat","Pics de débit : période la plus à risque de décompensation"],
      ]}/>
      <Res title="Signes à ne pas banaliser" classe="Pratique" level="" color={c} icon="⚠️" items={[
        "Dyspnée de repos ou orthopnée, dyspnée d&apos;aggravation rapide",
        "Douleur thoracique, syncope, palpitations soutenues",
        "Souffle diastolique, souffle systolique intense ou nouveau",
        "Désaturation, signes congestifs francs",
        "Une fatigue et une dyspnée d&apos;effort modérées sont en revanche banales en fin de grossesse",
      ]}/>
      <Info title="Fenêtre à risque" color={c}>
        Les décompensations surviennent surtout autour de la fin du deuxième trimestre, pendant le travail, et dans les premiers jours du post-partum lors de la redistribution volémique.
      </Info>
    </div>);

    case "exam": return (<div>
      <Sec title="Examens en grossesse" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Examen","Position"],
        ["ECG et échocardiographie","Sans risque, à utiliser largement et en première intention"],
        ["Peptides natriurétiques","Utiles avant la grossesse et en suivi selon la sévérité ou l&apos;apparition de symptômes"],
        ["IRM sans gadolinium","Possible si nécessaire ; éviter le gadolinium"],
        ["Radiographie et scanner","À ne pas refuser si l&apos;examen est nécessaire : protection abdominale, dose optimisée. Le risque d&apos;un diagnostic manqué dépasse celui de l&apos;irradiation"],
        ["Épreuve d&apos;effort sous-maximale","Possible avant ou en cours de grossesse selon le contexte"],
      ]}/>
      <Res title="Règle générale" classe="ESC 2025" level="" color={c} icon="🔍" items={[
        "Dans les situations menaçant le pronostic vital, la démarche diagnostique et thérapeutique doit être la même que chez une femme non enceinte",
        "Retarder un examen ou un traitement nécessaire par crainte du fœtus expose la mère — et donc le fœtus — à un risque supérieur",
      ]}/>
    </div>);
    default: return null;
  }
}

function GROSSmedicContent({ go, step }) {
  const c = GROSS_TOPICS.medic.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Médicaments et grossesse" color={c}>
        Les recommandations 2025 proposent une matrice de sécurité : premier choix, second choix, ou contre-indiqué. Vérifiez toujours avant de prescrire ou de renouveler.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Contre-indiqués" color={c} onClick={()=>go("ci")}/>
        <Btn title="Utilisables" color={c} onClick={()=>go("ok")}/>
        <Btn title="Allaitement" color={c} onClick={()=>go("allait")}/>
      </div>
    </div>);

    case "ci": return (<div>
      <Sec title="À ne pas utiliser" color={c}/>
      <Table cols="1.4fr 1.4fr" rows={[
        ["Classe","Commentaire"],
        ["IEC, ARA2, inhibiteurs directs de la rénine","Contre-indiqués : fœtotoxicité (atteinte rénale, oligoamnios)"],
        ["Sacubitril/valsartan","Contre-indiqué"],
        ["Antagonistes des récepteurs minéralocorticoïdes","Non recommandés"],
        ["Inhibiteurs de SGLT2","Non recommandés"],
        ["Anticoagulants oraux directs","Non recommandés pendant la grossesse"],
        ["Statines","Traditionnellement évitées ; réévaluation au cas par cas en situation à très haut risque"],
        ["Amiodarone","À éviter sauf absence d&apos;alternative (toxicité thyroïdienne fœtale)"],
        ["Bosentan et la plupart des traitements de l&apos;HTAP","Tératogènes ou déconseillés"],
      ]}/>
      <Info title="Réflexe" color={c}>
        Chez toute femme en âge de procréer traitée pour une insuffisance cardiaque, la question de la contraception et du projet de grossesse doit être abordée dès l&apos;instauration du traitement, pas au moment du test positif.
      </Info>
    </div>);

    case "ok": return (<div>
      <Sec title="Utilisables (selon indication)" color={c}/>
      <Table cols="1.4fr 1.4fr" rows={[
        ["Situation","Options"],
        ["Hypertension artérielle","Méthyldopa, labétalol, inhibiteurs calciques"],
        ["Bêtabloquants","Préférer les cardiosélectifs ; surveiller la croissance fœtale"],
        ["Insuffisance cardiaque","Diurétiques de l&apos;anse si congestion (à dose utile, sans excès), bêtabloquants, hydralazine et dérivés nitrés en remplacement des bloqueurs du système rénine-angiotensine"],
        ["Anticoagulation","Héparines de bas poids moléculaire ou héparine non fractionnée ; antivitamines K selon le contexte (voir valve mécanique)"],
        ["Prévention de la pré-éclampsie","Aspirine 75 à 100 mg par jour, de la 12ᵉ semaine jusqu&apos;à 36–37 semaines, en cas de risque modéré ou élevé"],
        ["Arythmies","Bêtabloquants ; adénosine utilisable en aigu ; digoxine possible"],
      ]}/>
    </div>);

    case "allait": return (<div>
      <Sec title="Allaitement" color={c}/>
      <Res title="Repères" classe="ESC 2025" level="" color={c} icon="🍼" items={[
        "La plupart des traitements cardiovasculaires usuels sont compatibles avec l&apos;allaitement, mais la vérification molécule par molécule est indispensable",
        "La matrice de sécurité des recommandations couvre grossesse et allaitement séparément : un médicament interdit pendant la grossesse n&apos;est pas forcément interdit pendant l&apos;allaitement, et inversement",
        "Dans la cardiomyopathie du péripartum traitée par bromocriptine, l&apos;allaitement est interrompu",
        "La décision tient compte du bénéfice de l&apos;allaitement et de la nécessité du traitement maternel : ne pas priver la mère d&apos;un traitement utile",
      ]}/>
    </div>);
    default: return null;
  }
}

function GROSShtaContent({ go, step }) {
  const c = GROSS_TOPICS.htagr.color;
  switch(step) {
    case "start": return (<div>
      <Info title="HTA et pré-éclampsie" color={c}>
        Les troubles hypertensifs sont les complications médicales les plus fréquentes de la grossesse et une cause majeure de morbidité maternelle et fœtale.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Définitions & seuils" color={c} onClick={()=>go("def")}/>
        <Btn title="Traitement" color={c} onClick={()=>go("ttt")}/>
        <Btn title="Prévention & dépistage" color={c} onClick={()=>go("prev")}/>
      </div>
    </div>);

    case "def": return (<div>
      <Sec title="Définitions" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Entité","Définition"],
        ["HTA chronique","Présente avant la grossesse ou avant 20 semaines"],
        ["HTA gestationnelle","Apparue après 20 semaines, sans protéinurie"],
        ["Pré-éclampsie","HTA après 20 semaines avec protéinurie ou atteinte d&apos;organe (rénale, hépatique, neurologique, hématologique) ou retentissement utéro-placentaire"],
        ["Pré-éclampsie surajoutée","Sur une HTA chronique préexistante"],
      ]}/>
      <Res title="Urgence" classe="ESC 2025" level="" color={c} icon="🚨" items={[
        "Une pression artérielle supérieure ou égale à 160/100 mmHg chez une femme enceinte est une urgence qui impose l&apos;hospitalisation",
        "Signes d&apos;alarme : céphalées, troubles visuels, douleur épigastrique ou de l&apos;hypochondre droit, vomissements, œdèmes d&apos;installation rapide, dyspnée",
        "Complications : éclampsie, HELLP, hématome rétro-placentaire, œdème pulmonaire, accident vasculaire cérébral",
      ]}/>
    </div>);

    case "ttt": return (<div>
      <Sec title="Traitement" color={c}/>
      <Res title="Molécules" classe="ESC 2025" level="" color={c} icon="💊" items={[
        "Première intention : méthyldopa, labétalol, inhibiteurs calciques",
        "Bloqueurs du système rénine-angiotensine formellement contre-indiqués",
        "En urgence hypertensive : traitement intraveineux en milieu hospitalier, avec baisse contrôlée pour préserver la perfusion placentaire",
        "Le sulfate de magnésium est utilisé dans la prévention et le traitement de l&apos;éclampsie",
        "Le seul traitement curatif de la pré-éclampsie reste la naissance : le moment se décide avec l&apos;équipe obstétricale",
      ]}/>
    </div>);

    case "prev": return (<div>
      <Sec title="Prévention et dépistage" color={c}/>
      <Res title="Aspirine" classe="ESC 2025" level="" color={c} icon="🛡️" items={[
        "Chez les femmes à risque modéré ou élevé de pré-éclampsie : aspirine 75 à 100 mg par jour",
        "Débutée à la 12ᵉ semaine et poursuivie jusqu&apos;à 36 à 37 semaines",
      ]}/>
      <Res title="Surveillance" classe="ESC 2025" level="" color={c} icon="🔍" items={[
        "Dépistage répété au cours de la grossesse : examen clinique, mesure de la pression artérielle, recherche de protéinurie, bilan biologique",
        "Éducation de la patiente aux signes d&apos;alarme et conduite à tenir",
      ]}/>
      <Info title="Après la grossesse" color={c}>
        Les recommandations 2025 consacrent une section nouvelle aux conséquences à long terme : pré-éclampsie, HTA gestationnelle, diabète gestationnel, prématurité et retard de croissance augmentent le risque cardiovasculaire ultérieur de la mère. Ces antécédents doivent figurer dans l&apos;évaluation du risque et justifier un suivi.
      </Info>
      <SeeAlso items={[
        { label:"Facteurs de risque CV", icon:"🎯", color:"#0F766E", target:{ kind:"chapter", chapterKey:"fdr" } },
        { label:"HTA — chapitre", icon:"🩸", color:"#2F8F66", target:{ kind:"chapter", chapterKey:"hta" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function GROSSvalveContent({ go, step }) {
  const c = GROSS_TOPICS.valve.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Valvulopathies & prothèses" color={c}>
        La valve mécanique chez la femme enceinte est l&apos;une des situations les plus délicates de la cardiologie : aucun schéma d&apos;anticoagulation n&apos;est réellement sûr.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Valvulopathies natives" color={c} onClick={()=>go("native")}/>
        <Btn title="Valve mécanique & anticoagulation" color={c} onClick={()=>go("meca")}/>
      </div>
    </div>);

    case "native": return (<div>
      <Sec title="Valvulopathies natives" color={c}/>
      <Table cols="1.4fr 1.4fr" rows={[
        ["Lésion","Tolérance de la grossesse"],
        ["Rétrécissement mitral serré","Mal toléré : l&apos;augmentation du débit et de la fréquence élève la pression capillaire. À traiter avant la grossesse"],
        ["Rétrécissement aortique serré symptomatique","Mal toléré, à corriger avant la conception"],
        ["Fuites régurgitantes (mitrale, aortique)","Généralement mieux tolérées : la baisse des résistances périphériques est favorable"],
        ["Valvulopathie légère à modérée, asymptomatique","Habituellement bien tolérée avec surveillance"],
      ]}/>
      <Info title="Principe" color={c}>
        Les sténoses serrées sont mal supportées, les fuites le sont mieux. C&apos;est l&apos;inverse d&apos;une idée répandue et cela oriente le calendrier des interventions avant grossesse.
      </Info>
      <SeeAlso items={[
        { label:"Valvulopathies", icon:"🫀", color:"#1684A8", target:{ kind:"chapter", chapterKey:"valvulo" } },
      ]}/>
    </div>);

    case "meca": return (<div>
      <Sec title="Valve mécanique" color={c}/>
      <Res title="Le message central" classe="ESC 2025" level="" color={c} icon="⚙️" items={[
        "Aucun schéma d&apos;anticoagulation n&apos;est totalement sûr pendant la grossesse : chacun expose soit la mère (thrombose de prothèse), soit le fœtus (embryopathie, pertes fœtales)",
        "Chez la femme en âge de procréer, il est recommandé d&apos;éviter autant que possible l&apos;implantation d&apos;une prothèse mécanique — le choix de la valve doit anticiper un projet de grossesse",
        "Une valve mécanique avec anticoagulation bien équilibrée relève de la classe mWHO 2.0 III",
        "Un plan de soins écrit documentant la stratégie d&apos;anticoagulation retenue doit exister avant la grossesse, ou dès qu&apos;elle est reconnue",
        "La décision est individualisée, en tenant compte de la dose d&apos;antivitamine K nécessaire, du type et de la position de la prothèse, et des possibilités de surveillance biologique locale",
      ]}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Option","Compromis"],
        ["Antivitamine K poursuivie","Meilleure protection maternelle contre la thrombose de prothèse ; risque fœtal, en particulier au premier trimestre et surtout à forte dose"],
        ["HBPM au premier trimestre","Réduit le risque embryonnaire ; exige une surveillance rigoureuse de l&apos;activité anti-Xa, avec un objectif optimal non défini"],
        ["Héparine non fractionnée","Utilisée en péri-partum ; contrôle plus fin mais contraignant"],
        ["Anticoagulants oraux directs","Non recommandés"],
      ]}/>
      <Info title="Accouchement" color={c}>
        Chez les patientes à haut risque, il est recommandé de relayer l&apos;HBPM par de l&apos;héparine non fractionnée intraveineuse au moins 36 heures avant l&apos;accouchement, puis d&apos;arrêter la perfusion 4 à 6 heures avant la naissance prévue, avec surveillance du TCA.
      </Info>
      <SeeAlso items={[
        { label:"AVK", icon:"💊", color:ACCENT, target:{ kind:"refcard", topicKey:"avk" } },
        { label:"Relais anticoagulants", icon:"🔄", color:ACCENT, target:{ kind:"refcard", topicKey:"relais" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function GROSScmpContent({ go, step }) {
  const c = GROSS_TOPICS.cmpgr.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Cardiomyopathies" color={c}>
        À connaître absolument : la cardiomyopathie du péripartum, souvent diagnostiquée avec retard parce que ses symptômes ressemblent à ceux d&apos;une fin de grossesse normale.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Cardiomyopathie du péripartum" color={c} onClick={()=>go("ppcm")}/>
        <Btn title="Cardiomyopathies préexistantes" color={c} onClick={()=>go("preex")}/>
      </div>
    </div>);

    case "ppcm": return (<div>
      <Sec title="Cardiomyopathie du péripartum" color={c}/>
      <Res title="Y penser" classe="ESC 2025" level="" color={c} icon="🤱" items={[
        "Devant toute insuffisance cardiaque de la fin de grossesse ou du post-partum, évoquer systématiquement le diagnostic",
        "Diagnostic d&apos;élimination : insuffisance cardiaque avec dysfonction ventriculaire gauche, sans autre cause identifiée",
        "Le retard diagnostique est fréquent : dyspnée, œdèmes et fatigue sont attribués à tort à la grossesse",
        "Un test génétique est recommandé : il existe un recoupement avec les cardiomyopathies dilatées familiales",
      ]}/>
      <Res title="Prise en charge" classe="ESC 2025" level="" color={c} icon="💊" items={[
        "Traitement rapide de l&apos;insuffisance cardiaque, adapté au statut (enceinte ou accouchée)",
        "La bromocriptine peut faire partie du traitement, toujours associée à une anticoagulation prophylactique et avec arrêt de l&apos;allaitement ; le niveau de preuve reste limité",
        "Après l&apos;accouchement, le traitement de l&apos;insuffisance cardiaque devient possible dans sa forme complète",
        "Anticoagulation à discuter, le risque thromboembolique étant élevé, surtout si la fraction d&apos;éjection est très basse",
      ]}/>
      <Info title="Grossesse ultérieure" color={c}>
        Une nouvelle grossesse est à éviter si la fonction ventriculaire gauche n&apos;a pas récupéré. Même après récupération, le risque de récidive existe et impose une évaluation et un suivi rapproché.
      </Info>
      <SeeAlso items={[
        { label:"Insuffisance cardiaque aiguë", icon:"🫁", color:"#1684A8", target:{ kind:"topic", chapterKey:"ic", topicKey:"aigue" } },
      ]}/>
    </div>);

    case "preex": return (<div>
      <Sec title="Cardiomyopathies et canalopathies préexistantes" color={c}/>
      <Res title="Repères" classe="ESC 2025" level="" color={c} icon="🧬" items={[
        "Beaucoup de femmes porteuses d&apos;une cardiomyopathie ou d&apos;un syndrome arythmique primitif tolèrent bien la grossesse, sous surveillance rapprochée et traitement adapté",
        "Deux situations demandent une vigilance particulière : la cardiomyopathie hypertrophique obstructive et le syndrome du QT long de type 2",
        "Dans le QT long, le post-partum est une période particulièrement à risque : les bêtabloquants ne doivent pas être interrompus",
        "Conseil génétique systématique : informer sur le risque de transmission et les options de procréation",
      ]}/>
      <SeeAlso items={[
        { label:"Cardiomyopathies", icon:"🫀", color:"#A267D9", target:{ kind:"chapter", chapterKey:"cmp" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function GROSSrythmeContent({ go, step }) {
  const c = GROSS_TOPICS.rythme.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Arythmies & urgences" color={c}>
        Règle générale : dans les situations menaçant le pronostic vital, on applique la même stratégie que chez une femme non enceinte.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Arythmies" color={c} onClick={()=>go("ary")}/>
        <Btn title="Maladie thromboembolique" color={c} onClick={()=>go("mtev")}/>
        <Btn title="Syndrome coronarien aigu" color={c} onClick={()=>go("sca")}/>
      </div>
    </div>);

    case "ary": return (<div>
      <Sec title="Arythmies" color={c}/>
      <Res title="Conduite" classe="ESC 2025" level="" color={c} icon="💓" items={[
        "Les extrasystoles et les palpitations bénignes sont fréquentes et ne justifient que rassurance et vérification",
        "Tachycardie supraventriculaire : manœuvres vagales, puis adénosine en aigu ; bêtabloquant en traitement de fond",
        "Mauvaise tolérance hémodynamique : cardioversion électrique, réalisable pendant la grossesse avec surveillance fœtale",
        "En cas de fibrillation atriale, l&apos;indication d&apos;anticoagulation suit les mêmes critères qu&apos;en dehors de la grossesse, avec le score CHA₂DS₂-VA — mais avec héparine ou antivitamine K, jamais d&apos;anticoagulant oral direct",
        "Ablation et implantation de dispositif restent possibles si nécessaire, en limitant l&apos;irradiation",
      ]}/>
      <SeeAlso items={[
        { label:"Scores (CHA₂DS₂-VA)", icon:"🧮", color:ACCENT, target:{ kind:"refcard", topicKey:"scores" } },
      ]}/>
    </div>);

    case "mtev": return (<div>
      <Sec title="Maladie thromboembolique veineuse" color={c}/>
      <Res title="Démarche diagnostique" classe="ESC 2025" level="" color={c} icon="🩸" items={[
        "La grossesse est un état prothrombotique : le seuil de suspicion doit être bas",
        "Algorithme YEARS adapté à la grossesse, avec seuils de D-dimères ajustés",
        "Débuter une héparine de bas poids moléculaire à dose curative en attendant la confirmation ou l&apos;exclusion",
        "Échographie de compression en première intention ; angioscanner pulmonaire si le bilan reste non concluant",
      ]}/>
      <Res title="Traitement" classe="ESC 2025" level="" color={c} icon="💊" items={[
        "Héparine de bas poids moléculaire, traitement de référence pendant la grossesse",
        "Anticoagulants oraux directs non recommandés",
        "En post-partum, poursuivre l&apos;anticoagulation au moins 6 semaines, jusqu&apos;à 3 mois selon le contexte, sauf indication au long cours",
      ]}/>
      <SeeAlso items={[
        { label:"Embolie pulmonaire", icon:"🩸", color:"#A267D9", target:{ kind:"topic", chapterKey:"urgences", topicKey:"ep" } },
      ]}/>
    </div>);

    case "sca": return (<div>
      <Sec title="Syndrome coronarien aigu" color={c}/>
      <Res title="Points clés" classe="ESC 2025" level="" color={c} icon="🚨" items={[
        "Rare mais grave, et volontiers de mécanisme non athéromateux : penser en premier lieu à la dissection coronaire spontanée, plus fréquente en péri-partum",
        "Ne pas retarder la prise en charge : devant un infarctus avec sus-décalage, la stratégie de reperfusion est la même que hors grossesse",
        "La coronarographie est réalisable avec protection et minimisation de l&apos;irradiation",
        "La prise en charge de la dissection coronaire spontanée est souvent conservatrice, l&apos;angioplastie étant réservée aux situations à haut risque",
      ]}/>
      <SeeAlso items={[
        { label:"SCA ST+", icon:"🚨", color:"#E85D4A", target:{ kind:"topic", chapterKey:"ischemic", topicKey:"sca" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function GROSSaccouchContent({ go, step }) {
  const c = GROSS_TOPICS.accouch.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Accouchement & post-partum" color={c}>
        Le mode d&apos;accouchement se décide sur des critères obstétricaux et cardiologiques : la césarienne n&apos;est pas la règle chez la femme cardiaque.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Mode et moment de l&apos;accouchement" color={c} onClick={()=>go("mode")}/>
        <Btn title="Anticoagulation péri-partum" color={c} onClick={()=>go("acg")}/>
        <Btn title="Post-partum & suivi" color={c} onClick={()=>go("post")}/>
      </div>
    </div>);

    case "mode": return (<div>
      <Sec title="Mode d&apos;accouchement" color={c}/>
      <Res title="Principes" classe="ESC 2025" level="" color={c} icon="🗓️" items={[
        "L&apos;accouchement par voie basse reste le mode privilégié dans la majorité des cardiopathies, avec adaptation au type de lésion et au niveau de risque",
        "L&apos;analgésie péridurale précoce limite les à-coups hémodynamiques liés à la douleur",
        "Raccourcir les efforts expulsifs (extraction instrumentale) est souvent préférable dans les cardiopathies à risque",
        "La césarienne se discute sur indication obstétricale, ou cardiologique dans certaines situations : anticoagulation par antivitamine K non relayée, pathologie aortique à risque, instabilité hémodynamique, certaines formes sévères",
        "Le lieu d&apos;accouchement et le niveau de surveillance sont définis à l&apos;avance dans le plan de naissance",
      ]}/>
    </div>);

    case "acg": return (<div>
      <Sec title="Anticoagulation autour de l&apos;accouchement" color={c}/>
      <Res title="Schéma chez la patiente à haut risque" classe="ESC 2025" level="" color={c} icon="💉" items={[
        "Relais de l&apos;héparine de bas poids moléculaire par de l&apos;héparine non fractionnée intraveineuse au moins 36 heures avant l&apos;accouchement",
        "Arrêt de la perfusion 4 à 6 heures avant la naissance prévue",
        "Surveillance du TCA",
        "Reprise de l&apos;anticoagulation après l&apos;accouchement selon l&apos;hémostase et l&apos;avis de l&apos;équipe",
      ]}/>
      <Info title="Analgésie" color={c}>
        La réalisation d&apos;une anesthésie périmédullaire impose de respecter les délais après la dernière dose d&apos;anticoagulant. C&apos;est une raison majeure d&apos;anticiper le plan de naissance.
      </Info>
    </div>);

    case "post": return (<div>
      <Sec title="Post-partum et suivi à long terme" color={c}/>
      <Res title="Surveillance immédiate" classe="ESC 2025" level="" color={c} icon="🔎" items={[
        "Les premières 24 à 72 heures sont à haut risque : redistribution volémique après la délivrance",
        "Surveillance hémodynamique adaptée au niveau de risque, dans une unité appropriée",
        "Attention aux hémorragies du post-partum chez la patiente anticoagulée, et à l&apos;usage des utérotoniques dans certaines cardiopathies",
      ]}/>
      <Res title="Après la maternité" classe="ESC 2025" level="" color={c} icon="📅" items={[
        "Consultation cardiologique de réévaluation programmée",
        "Contraception discutée avant la sortie",
        "Les complications de la grossesse (pré-éclampsie, HTA gestationnelle, diabète gestationnel, prématurité, retard de croissance) constituent des marqueurs de risque cardiovasculaire à long terme et doivent être consignées",
      ]}/>
      <SeeAlso items={[
        { label:"Facteurs de risque CV", icon:"🎯", color:"#0F766E", target:{ kind:"chapter", chapterKey:"fdr" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function GrossContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "risque")  return <GROSSrisqueContent  {...props}/>;
  if (topic === "physio")  return <GROSSphysioContent  {...props}/>;
  if (topic === "medic")   return <GROSSmedicContent   {...props}/>;
  if (topic === "htagr")   return <GROSShtaContent     {...props}/>;
  if (topic === "valve")   return <GROSSvalveContent   {...props}/>;
  if (topic === "cmpgr")   return <GROSScmpContent     {...props}/>;
  if (topic === "rythme")  return <GROSSrythmeContent  {...props}/>;
  if (topic === "accouch") return <GROSSaccouchContent {...props}/>;
  return null;
}


// ═══ MALADIE THROMBOEMBOLIQUE VEINEUSE (hors urgence) ═════════════
function MTEVdureeContent({ go, step }) {
  const c = MTEV_TOPICS.duree.color;
  switch(step) {
    case "start": return (<div>
      <Info title="⏳ Durée d'anticoagulation" color={c}>
        Tout épisode se traite au minimum 3 mois. Passé ce délai, la décision de poursuivre met en balance le risque de récidive et le risque hémorragique.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Le vocabulaire a changé (ESC 2019)" color={c} onClick={()=>go("vocab")}/>
        <Btn title="Estimer le risque de récidive" color={c} onClick={()=>go("recid")}/>
        <Btn title="Estimer le risque hémorragique" color={c} onClick={()=>go("hemo")}/>
        <Btn title="Décision et dose d'entretien" color={c} onClick={()=>go("decision")}/>
      </div>
    </div>);

    case "vocab": return (<div>
      <Sec title="Ce qui a changé" color={c}/>
      <Res title="Abandon de « provoquée / non provoquée »" classe="ESC 2019" level="" color={c} icon="🔤" items={[
        "Les recommandations ne soutiennent plus cette dichotomie, trop grossière pour décider",
        "On raisonne désormais en trois catégories : facteur de risque majeur transitoire ou réversible, facteur de risque persistant, ou aucun facteur identifiable",
        "Intérêt pratique : un épisode « provoqué » par un facteur qui persiste (cancer, insuffisance cardiaque, obésité, syndrome inflammatoire) ne justifie pas un arrêt à 3 mois",
      ]}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Catégorie","Exemples"],
        ["Facteur majeur transitoire","Chirurgie sous anesthésie générale de plus de 30 minutes, alitement à l'hôpital ≥ 3 jours, traumatisme avec fracture — dans les 3 mois"],
        ["Facteur mineur transitoire","Chirurgie mineure, immobilisation brève, voyage prolongé, grossesse et post-partum, œstroprogestatifs"],
        ["Facteur persistant","Cancer actif, syndrome des antiphospholipides, maladie inflammatoire chronique, insuffisance cardiaque, obésité, thrombophilie majeure"],
        ["Aucun facteur identifiable","Anciennement « non provoquée » — risque de récidive élevé"],
      ]}/>
    </div>);

    case "recid": return (<div>
      <Sec title="Risque de récidive après arrêt" color={c}/>
      <Table cols="1.4fr 1.4fr" rows={[
        ["Contexte de l'épisode","Récidive attendue à 1 an après arrêt"],
        ["Facteur majeur transitoire (chirurgie)","Faible, de l'ordre de 3 % par an"],
        ["Facteur mineur transitoire","Intermédiaire"],
        ["Aucun facteur identifiable","Élevé, de l'ordre de 10 % la première année"],
        ["Facteur persistant (cancer actif)","Élevé, tant que le facteur persiste"],
      ]}/>
      <Res title="Repères utiles" classe="Données" level="" color={c} icon="📊" items={[
        "Après un premier épisode sans facteur identifiable, le risque cumulé de récidive approche 50 % à 10 ans",
        "Prolonger le traitement de 3 à 6, 12 ou 24 mois ne modifie pas le risque une fois le traitement arrêté : cela ne fait que décaler l'échéance",
        "La létalité d'une récidive est plus élevée après une embolie pulmonaire (environ 12 %) qu'après une thrombose veineuse profonde (environ 5 %) — le type d'épisode initial pèse dans la décision",
        "Facteurs augmentant la récidive : sexe masculin, épisode sans facteur identifiable, D-dimères élevés après arrêt, thrombus résiduel, SAPL",
      ]}/>
    </div>);

    case "hemo": return (<div>
      <Sec title="Risque hémorragique" color={c}/>
      <Res title="Facteurs à peser" classe="ESC 2019" level="" color={c} icon="🩸" items={[
        "Âge avancé, antécédent de saignement majeur, insuffisance rénale ou hépatique, cancer, antiagrégants associés",
        "Anémie, thrombopénie, antécédent d'accident vasculaire cérébral, alcool, chutes répétées, mauvaise observance",
        "Hypertension artérielle non contrôlée, ulcère gastroduodénal, malformation vasculaire connue",
      ]}/>
      <Info title="Un équilibre réel" color={c}>
        La létalité d'une hémorragie majeure est du même ordre, voire supérieure, à celle d'une récidive thromboembolique. Poursuivre l'anticoagulation n'est pas une décision anodine, et l'évaluation doit être réévaluée au moins une fois par an.
      </Info>
    </div>);

    case "decision": return (<div>
      <Sec title="Décider et adapter la dose" color={c}/>
      <Table cols="1.5fr 1.3fr" rows={[
        ["Situation","Durée"],
        ["Facteur majeur transitoire disparu","3 mois, puis arrêt"],
        ["Facteur mineur transitoire","3 à 6 mois, puis réévaluation individualisée"],
        ["Aucun facteur identifiable, risque hémorragique faible","Traitement prolongé, sans date d'arrêt programmée"],
        ["Facteur persistant","Traitement prolongé tant que le facteur persiste"],
        ["Récidive sous ou après anticoagulation","Traitement prolongé"],
        ["Risque hémorragique élevé","3 mois, puis arrêt avec surveillance"],
      ]}/>
      <Res title="Dose d'entretien" classe="ESC 2019" level="Classe IIa" color={c} icon="🧭" items={[
        "Au-delà des 6 premiers mois, une dose réduite d'apixaban (2,5 mg deux fois par jour) ou de rivaroxaban (10 mg par jour) est à envisager pour la phase prolongée",
        "Cette réduction conserve l'efficacité préventive avec moins de saignements",
        "Elle ne s'applique pas au cancer actif ni au syndrome des antiphospholipides",
      ]}/>
      <Info title="En pratique" color={c}>
        Une consultation dédiée à 3 mois, consacrée uniquement à la question de la durée, est le meilleur moyen de ne pas laisser un traitement se prolonger par inertie — ou s'arrêter par oubli.
      </Info>
      <SeeAlso items={[
        { label:"Embolie pulmonaire (aiguë)", icon:"🩸", color:"#A267D9", target:{ kind:"topic", chapterKey:"urgences", topicKey:"ep" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function MTEVchoixContent({ go, step }) {
  const c = MTEV_TOPICS.choix.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Choix du traitement" color={c}>
        Les anticoagulants oraux directs sont le traitement de première intention de la majorité des patients, y compris chez ceux qui pourraient recevoir un antivitamine K.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="AOD, AVK ou héparine ?" color={c} onClick={()=>go("compar")}/>
        <Btn title="Schémas d'initiation" color={c} onClick={()=>go("schema")}/>
        <Btn title="Situations où l'AOD n'est pas le bon choix" color={c} onClick={()=>go("ci")}/>
      </div>
    </div>);

    case "compar": return (<div>
      <Sec title="Quel anticoagulant" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Traitement","Place"],
        ["Anticoagulants oraux directs","Première intention chez la majorité des patients — efficacité comparable et moins de saignements majeurs que les AVK"],
        ["Antivitamines K","Quand les AOD sont contre-indiqués : syndrome des antiphospholipides, insuffisance rénale sévère, valve mécanique, grossesse (relais héparine)"],
        ["HBPM","Phase initiale de certains schémas, cancer, grossesse, insuffisance rénale sévère selon la molécule"],
        ["Fondaparinux","Alternative en phase initiale, notamment en cas d'antécédent de thrombopénie induite par l'héparine"],
      ]}/>
      <SeeAlso items={[
        { label:"AVK", icon:"💊", color:ACCENT, target:{ kind:"refcard", topicKey:"avk" } },
        { label:"Relais anticoagulants", icon:"🔄", color:ACCENT, target:{ kind:"refcard", topicKey:"relais" } },
      ]}/>
    </div>);

    case "schema": return (<div>
      <Sec title="Modalités d'initiation" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Molécule","Schéma"],
        ["Apixaban","Dose de charge orale d'emblée pendant 7 jours, puis dose d'entretien — pas de relais parentéral préalable"],
        ["Rivaroxaban","Dose renforcée pendant 21 jours, puis dose d'entretien — pas de relais parentéral préalable"],
        ["Édoxaban","Après au moins 5 jours d'héparine parentérale"],
        ["Dabigatran","Après au moins 5 jours d'héparine parentérale"],
        ["AVK","Chevauchement avec l'héparine jusqu'à un INR dans la cible sur 2 jours consécutifs"],
      ]}/>
      <Info title="Piège fréquent" color={c}>
        Apixaban et rivaroxaban se donnent d'emblée par voie orale, tandis qu'édoxaban et dabigatran exigent une phase d'héparine préalable. Confondre les deux schémas est une erreur classique de prescription.
      </Info>
      <SeeAlso items={[
        { label:"Posologies", icon:"💊", color:ACCENT, target:{ kind:"refcard", topicKey:"poso" } },
      ]}/>
    </div>);

    case "ci": return (<div>
      <Sec title="Quand éviter les AOD" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Situation","Conduite"],
        ["Syndrome des antiphospholipides","Préférer un AVK, surtout en cas de triple positivité : les AOD y ont montré plus d'événements thrombotiques"],
        ["Grossesse et allaitement","AOD non recommandés — héparine de bas poids moléculaire"],
        ["Insuffisance rénale sévère","Selon la molécule et la clairance : vérifier au cas par cas"],
        ["Valve mécanique","AOD contre-indiqués"],
        ["Cancer digestif ou urogénital","Prudence : les AOD augmentent le risque hémorragique muqueux"],
        ["Interactions médicamenteuses fortes","Inducteurs ou inhibiteurs puissants, notamment antiépileptiques, rifampicine, antifongiques azolés"],
        ["Poids extrêmes","Données limitées ; avis spécialisé"],
      ]}/>
      <SeeAlso items={[
        { label:"Calculateurs (clairance)", icon:"🧪", color:"#0F766E", target:{ kind:"refcard", topicKey:"calc" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function MTEVtvpContent({ go, step }) {
  const c = MTEV_TOPICS.tvp.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Formes cliniques" color={c}>
        Toutes les thromboses ne se traitent pas de la même façon : la localisation change la conduite.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="TVP proximale" color={c} onClick={()=>go("prox")}/>
        <Btn title="🟡 TVP distale (mollet)" color={c} onClick={()=>go("dist")}/>
        <Btn title="TVP du membre supérieur" color={c} onClick={()=>go("sup")}/>
        <Btn title="Thrombose veineuse superficielle" color={c} onClick={()=>go("superf")}/>
      </div>
    </div>);

    case "prox": return (<div>
      <Sec title="TVP proximale" color={c}/>
      <Res title="Prise en charge" classe="Repères" level="" color={c} icon="🔵" items={[
        "Anticoagulation à dose curative, selon les mêmes schémas et les mêmes durées que l'embolie pulmonaire",
        "Prise en charge ambulatoire possible chez un patient stable, autonome, sans insuffisance rénale sévère ni risque hémorragique majeur",
        "Mobilisation précoce encouragée : l'alitement n'apporte aucun bénéfice",
        "Bas de compression : proposés pour les symptômes, sans preuve solide de prévention du syndrome post-thrombotique",
        "Thrombolyse ou geste endovasculaire réservés aux formes très étendues et menaçantes (phlegmatia), en centre spécialisé",
      ]}/>
      <SeeAlso items={[
        { label:"Score de Wells (TVP)", icon:"🧮", color:ACCENT, target:{ kind:"refcard", topicKey:"scores" } },
      ]}/>
    </div>);

    case "dist": return (<div>
      <Sec title="TVP distale isolée" color={c}/>
      <Res title="Deux stratégies acceptables" classe="Pratique" level="" color={c} icon="🟡" items={[
        "Anticoagulation curative pendant environ 3 mois",
        "Ou surveillance par échographies répétées (typiquement à une puis deux semaines), en traitant uniquement en cas d'extension proximale",
        "Le choix dépend des symptômes, de l'étendue du thrombus, des facteurs de risque persistants et du risque hémorragique",
        "Anticoaguler d'emblée si : symptômes marqués, thrombus étendu ou proche de la veine poplitée, cancer actif, antécédent de MTEV, facteur de risque persistant",
      ]}/>
      <Info title="À retenir" color={c}>
        Une TVP distale isolée chez un patient peu symptomatique et sans facteur de risque persistant ne nécessite pas obligatoirement une anticoagulation : la surveillance échographique est une option légitime, à condition qu'elle soit réellement organisée.
      </Info>
    </div>);

    case "sup": return (<div>
      <Sec title="TVP du membre supérieur" color={c}/>
      <Res title="Repères" classe="Pratique" level="" color={c} icon="💪" items={[
        "Le plus souvent liée à un cathéter central ou à un dispositif implanté",
        "Traitement anticoagulant d'au moins 3 mois, sur le modèle du membre inférieur",
        "Le cathéter peut être laissé en place s'il reste nécessaire, fonctionnel et non infecté, sous couvert de l'anticoagulation",
        "Forme sans cathéter chez un sujet jeune et sportif : évoquer un syndrome du défilé thoraco-brachial (syndrome de Paget-Schrötter) et demander un avis spécialisé",
      ]}/>
    </div>);

    case "superf": return (<div>
      <Sec title="Thrombose veineuse superficielle" color={c}/>
      <Res title="Ne pas la banaliser" classe="Pratique" level="" color={c} icon="🩹" items={[
        "Une échographie est nécessaire : elle recherche une extension profonde associée, présente dans une proportion non négligeable des cas",
        "Thrombose superficielle étendue (généralement ≥ 5 cm) ou proche de la jonction saphéno-fémorale : anticoagulation à dose prophylactique pendant environ 6 semaines (fondaparinux ou HBPM)",
        "Forme courte, distale, peu symptomatique : traitement local et surveillance peuvent suffire",
        "Récidive ou localisation atypique : rechercher un cancer ou une maladie inflammatoire (maladie de Behçet, thrombose superficielle migratrice)",
      ]}/>
    </div>);
    default: return null;
  }
}

function MTEVbilanContent({ go, step }) {
  const c = MTEV_TOPICS.bilan.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Bilan étiologique" color={c}>
        Deux questions reviennent systématiquement : faut-il chercher une thrombophilie, et faut-il chercher un cancer ? La réponse est plus souvent « non » qu'on ne le croit.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Bilan de thrombophilie" color={c} onClick={()=>go("thrombo")}/>
        <Btn title="Recherche de cancer" color={c} onClick={()=>go("cancer")}/>
      </div>
    </div>);

    case "thrombo": return (<div>
      <Sec title="Thrombophilie — quand chercher" color={c}/>
      <Res title="Le principe" classe="Consensus international" level="" color={c} icon="🧬" items={[
        "La majorité des patients ne doivent PAS avoir de bilan de thrombophilie : le résultat ne change généralement pas la prise en charge",
        "Le bilan ne se justifie que si son résultat va modifier une décision importante pour le patient ou sa famille",
        "Un bilan négatif n'exclut pas une prédisposition : les tests disponibles ne couvrent pas tout",
        "Rechercher un syndrome des antiphospholipides a en revanche un impact direct : il fait préférer un AVK à un AOD et oriente vers un traitement prolongé",
      ]}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Situation","Bilan"],
        ["Épisode avec facteur majeur transitoire","Non indiqué"],
        ["Épisode sans facteur identifiable","Ne change pas la durée si un traitement prolongé est déjà retenu ; discuter la recherche de SAPL"],
        ["Sujet jeune, récidives, site inhabituel, forte histoire familiale","Discuter en concertation avec un spécialiste de l'hémostase"],
        ["Apparentées envisageant une grossesse ou une contraception œstroprogestative","Situation où le résultat peut réellement modifier une décision"],
      ]}/>
      <Info title="Quand prélever" color={c}>
        Jamais à la phase aiguë ni pendant les 3 premiers mois de traitement : les résultats sont ininterprétables. Sous AVK, prélever 3 à 4 semaines après l'arrêt ; les AOD interfèrent également avec plusieurs dosages, notamment la recherche d'anticoagulant circulant.
      </Info>
    </div>);

    case "cancer": return (<div>
      <Sec title="Recherche de cancer" color={c}/>
      <Res title="Conduite raisonnable" classe="Pratique" level="" color={c} icon="🎗️" items={[
        "Devant un épisode sans facteur identifiable : interrogatoire et examen clinique complets, biologie de base (hémogramme, fonction rénale et hépatique, bilan d'hémostase)",
        "Mettre à jour les dépistages recommandés selon l'âge et le sexe",
        "Ne pas multiplier les examens d'imagerie systématiques : les stratégies extensives n'améliorent pas la survie",
        "Explorer davantage uniquement en présence de symptômes, de signes d'appel ou d'anomalies biologiques",
      ]}/>
      <Info title="À retenir" color={c}>
        Le rendement d'un bilan « en aveugle » est faible et génère anxiété, faux positifs et examens en cascade. C'est l'examen clinique et l'interrogatoire qui orientent.
      </Info>
    </div>);
    default: return null;
  }
}

function MTEVsuiviContent({ go, step }) {
  const c = MTEV_TOPICS.suivi.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Suivi et complications tardives" color={c}>
        Un suivi structuré 3 à 6 mois après l'épisode est recommandé : il permet de décider de la durée du traitement et de dépister les complications tardives.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="La consultation de suivi" color={c} onClick={()=>go("consult")}/>
        <Btn title="Syndrome post-thrombotique" color={c} onClick={()=>go("spt")}/>
        <Btn title="Dyspnée persistante et CTEPH" color={c} onClick={()=>go("cteph")}/>
      </div>
    </div>);

    case "consult": return (<div>
      <Sec title="Consultation de suivi" color={c}/>
      <Res title="Ce qu'on y fait" classe="ESC 2019" level="" color={c} icon="🔎" items={[
        "Réévaluer la durée du traitement : c'est l'objectif principal",
        "Rechercher une dyspnée ou une limitation à l'effort persistantes",
        "Vérifier la tolérance et l'observance du traitement, réévaluer le risque hémorragique et la fonction rénale",
        "Rechercher des signes de syndrome post-thrombotique en cas de TVP",
        "Réévaluer les facteurs de risque persistants et les mesures de prévention lors des situations à risque futures",
      ]}/>
      <Info title="Organisation" color={c}>
        Les recommandations encouragent un modèle de suivi intégré, articulant l'hospitalisation et la ville, plutôt qu'un patient qui sort avec une ordonnance et sans rendez-vous.
      </Info>
    </div>);

    case "spt": return (<div>
      <Sec title="Syndrome post-thrombotique" color={c}/>
      <Res title="Repères" classe="Pratique" level="" color={c} icon="🦵" items={[
        "Complication tardive fréquente après une TVP proximale : lourdeur, œdème, douleur, troubles trophiques, parfois ulcère",
        "Apparaît dans les mois à années suivant l'épisode ; le diagnostic est clinique",
        "Facteurs favorisants : TVP proximale étendue, récidive homolatérale, obésité, anticoagulation initiale insuffisante",
        "Prise en charge : compression élastique, activité physique, soins cutanés ; avis spécialisé pour les formes sévères ou obstructives",
      ]}/>
      <Info title="Nuance" color={c}>
        Les bas de compression soulagent les symptômes, mais leur capacité à prévenir le syndrome post-thrombotique n'est pas solidement démontrée. Ils se proposent pour le confort, sans être présentés comme une garantie.
      </Info>
    </div>);

    case "cteph": return (<div>
      <Sec title="Dyspnée persistante après embolie pulmonaire" color={c}/>
      <Res title="Démarche" classe="ESC 2019" level="" color={c} icon="🫁" items={[
        "Une dyspnée ou une limitation à l'effort persistant au-delà de 3 mois doit être explorée, et non attribuée d'emblée au déconditionnement",
        "Échographie cardiaque à la recherche de signes d'hypertension pulmonaire et de dysfonction du ventricule droit",
        "Scintigraphie de ventilation-perfusion : examen clé, une persistance de défects de perfusion non appariés au-delà de 3 mois doit faire adresser le patient à un centre expert en hypertension pulmonaire thromboembolique chronique",
        "Beaucoup de patients gardent des symptômes sans hypertension pulmonaire : c'est le syndrome post-embolie pulmonaire, qui relève de la réadaptation",
      ]}/>
      <SeeAlso items={[
        { label:"HTAP / cœur pulmonaire", icon:"🫁", color:"#1684A8", target:{ kind:"chapter", chapterKey:"htap" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function MTEVsituContent({ go, step }) {
  const c = MTEV_TOPICS.situ.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Situations particulières" color={c}>
        Quatre contextes modifient les règles habituelles.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Cancer actif" color={c} onClick={()=>go("cancer")}/>
        <Btn title="Syndrome des antiphospholipides" color={c} onClick={()=>go("sapl")}/>
        <Btn title="Grossesse" color={c} onClick={()=>go("gross")}/>
        <Btn title="Gestes invasifs et chirurgie" color={c} onClick={()=>go("geste")}/>
      </div>
    </div>);

    case "cancer": return (<div>
      <Sec title="MTEV et cancer" color={c}/>
      <Res title="Principes" classe="ESC 2019" level="" color={c} icon="🎗️" items={[
        "Le cancer actif est un facteur de risque persistant : l'anticoagulation se poursuit tant que le cancer est actif ou traité",
        "Édoxaban ou rivaroxaban sont à envisager comme alternative à l'héparine de bas poids moléculaire",
        "Prudence avec les AOD en cas de cancer digestif : le risque hémorragique muqueux est majoré, l'HBPM garde une place",
        "Tenir compte des interactions avec les traitements anticancéreux, des vomissements et de la thrombopénie induite",
        "Réévaluer régulièrement : la situation oncologique évolue et la balance bénéfice-risque avec elle",
      ]}/>
    </div>);

    case "sapl": return (<div>
      <Sec title="Syndrome des antiphospholipides" color={c}/>
      <Res title="Ce qui change" classe="Pratique" level="" color={c} icon="🧪" items={[
        "Facteur de risque persistant : anticoagulation prolongée",
        "Préférer un antivitamine K aux AOD, en particulier en cas de triple positivité, où les AOD ont montré davantage d'événements thrombotiques",
        "Le diagnostic exige une confirmation biologique à distance (habituellement à 12 semaines) : ne pas retenir le diagnostic sur un seul dosage",
        "Prise en charge conjointe avec un spécialiste (médecine interne ou hémostase)",
      ]}/>
    </div>);

    case "gross": return (<div>
      <Sec title="Grossesse et post-partum" color={c}/>
      <Res title="Repères" classe="ESC 2025" level="" color={c} icon="🤰" items={[
        "Héparine de bas poids moléculaire : traitement de référence pendant toute la grossesse",
        "AOD non recommandés ; les AVK sont réservés à des situations particulières",
        "En post-partum, poursuivre l'anticoagulation au moins 6 semaines, pour une durée totale d'environ 3 mois",
        "Anticiper l'accouchement : l'anticoagulation curative impose une organisation, notamment pour l'analgésie périmédullaire",
      ]}/>
      <SeeAlso items={[
        { label:"Grossesse & cardiopathie", icon:"🤰", color:"#C2557A", target:{ kind:"topic", chapterKey:"gross", topicKey:"rythme" } },
      ]}/>
    </div>);

    case "geste": return (<div>
      <Sec title="Gestes invasifs sous anticoagulant" color={c}/>
      <Res title="Démarche" classe="Pratique" level="" color={c} icon="🔪" items={[
        "Évaluer le risque hémorragique du geste et le risque thrombotique du patient : un épisode récent (moins de 3 mois) est à haut risque",
        "Différer le geste non urgent si l'épisode est très récent, chaque fois que c'est possible",
        "Sous AOD : arrêt basé sur la molécule, la fonction rénale et le risque hémorragique du geste, sans relais héparinique dans la plupart des cas",
        "Sous AVK : relais héparinique réservé aux situations à haut risque thrombotique",
        "Filtre cave temporaire : uniquement si l'anticoagulation est impossible à la phase aiguë, avec retrait programmé",
      ]}/>
      <SeeAlso items={[
        { label:"Relais anticoagulants", icon:"🔄", color:ACCENT, target:{ kind:"refcard", topicKey:"relais" } },
        { label:"Évaluation pré-opératoire", icon:"🧩", color:ACCENT, target:{ kind:"topic", chapterKey:"spec", topicKey:"preop" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function MtevContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "duree") return <MTEVdureeContent {...props}/>;
  if (topic === "choix") return <MTEVchoixContent {...props}/>;
  if (topic === "tvp")   return <MTEVtvpContent   {...props}/>;
  if (topic === "bilan") return <MTEVbilanContent {...props}/>;
  if (topic === "suivi") return <MTEVsuiviContent {...props}/>;
  if (topic === "situ")  return <MTEVsituContent  {...props}/>;
  return null;
}


// ═══ CANALOPATHIES (ESC 2022) ═════════════════════════════════════
function CANALqtlongContent({ go, step }) {
  const c = CANAL_TOPICS.qtlong.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Syndrome du QT long congénital" color={c}>
        ESC 2022. Le traitement médicamenteux est la première ligne ; le défibrillateur vient en complément, pas en remplacement.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Diagnostic" color={c} onClick={()=>go("diag")}/>
        <Btn title="Traitement" color={c} onClick={()=>go("ttt")}/>
        <Btn title="Quand implanter un défibrillateur" color={c} onClick={()=>go("dai")}/>
        <Btn title="Génotypes et déclencheurs" color={c} onClick={()=>go("geno")}/>
      </div>
    </div>);

    case "diag": return (<div>
      <Sec title="Critères diagnostiques" color={c}/>
      <Table cols="1.5fr 1.2fr" rows={[
        ["Critère","Recommandation"],
        ["QTc ≥ 480 ms sur ECG 12 dérivations répétés","Diagnostic retenu, avec ou sans symptômes — classe I"],
        ["Score diagnostique (Schwartz) supérieur à 3","Diagnostic retenu — classe I"],
        ["Mutation pathogène identifiée","Diagnostic retenu quelle que soit la durée du QT — classe I"],
        ["Test génétique et conseil génétique","Recommandés dès le diagnostic clinique — classe I"],
      ]}/>
      <Res title="En pratique" classe="ESC 2022" level="" color={c} icon="🔍" items={[
        "Mesurer le QT sur plusieurs ECG : la durée varie dans le temps et un ECG isolé peut être faussement rassurant",
        "Utiliser la correction de Bazett en pratique courante, mais se méfier aux fréquences extrêmes",
        "Toujours éliminer d'abord une cause acquise : médicaments, hypokaliémie, hypomagnésémie, bradycardie",
        "Contexte évocateur : syncope à l'effort ou lors d'une émotion, convulsions étiquetées épilepsie, mort subite familiale précoce, surdité congénitale associée",
      ]}/>
      <SeeAlso items={[
        { label:"Calculateur QTc", icon:"🧪", color:"#0F766E", target:{ kind:"refcard", topicKey:"calc" } },
        { label:"QT long acquis", icon:"💊", color:"#C26A1C", target:{ kind:"canal", topicKey:"qtacquis" } },
      ]}/>
    </div>);

    case "ttt": return (<div>
      <Sec title="Traitement" color={c}/>
      <Res title="Bases" classe="ESC 2022" level="Classe I" color={c} icon="💊" items={[
        "Bêtabloquants chez tout patient avec allongement documenté du QT, de préférence non sélectifs : nadolol ou propranolol",
        "Ne jamais interrompre brutalement le traitement : l'arrêt est une cause classique d'événement",
        "Mexilétine en cas de QT long de type 3 avec QT allongé (classe I)",
        "Correction et prévention des facteurs aggravants : kaliémie, magnésémie, médicaments allongeant le QT",
        "Éviter les sports de compétition intenses et les déclencheurs propres au génotype, après évaluation spécialisée",
      ]}/>
      <Info title="Réflexe de prescription" color={c}>
        Chez tout patient avec un QT long, vérifier chaque nouvelle ordonnance : de nombreux antibiotiques, antifongiques, antiémétiques, psychotropes et anti-arythmiques allongent le QT.
      </Info>
    </div>);

    case "dai": return (<div>
      <Sec title="Défibrillateur et dénervation" color={c}/>
      <Table cols="1.5fr 1.2fr" rows={[
        ["Situation","Recommandation"],
        ["Patient symptomatique malgré bêtabloquants et traitement adapté au génotype","Défibrillateur — classe I"],
        ["Survivant d'un arrêt cardiaque","Défibrillateur (prévention secondaire)"],
        ["Dénervation sympathique cardiaque gauche","Indiquée si le défibrillateur est refusé ou contre-indiqué, ou en cas de chocs multiples et de syncopes malgré traitement optimal — classe I"],
      ]}/>
      <Res title="Hiérarchie thérapeutique" classe="ESC 2022" level="" color={c} icon="⚡" items={[
        "Le traitement médicamenteux vient en premier : bêtabloquant, puis traitement adapté au génotype",
        "Le défibrillateur est un complément, pas une alternative au traitement médicamenteux qui doit être poursuivi",
        "La dénervation sympathique gauche est une option d'appoint, pas de première intention",
      ]}/>
      <SeeAlso items={[
        { label:"Défibrillateur (DAI)", icon:"⚡", color:"#EB5757", target:{ kind:"stim", topicKey:"dai" } },
      ]}/>
    </div>);

    case "geno": return (<div>
      <Sec title="Génotypes et déclencheurs" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Type","Déclencheur typique"],
        ["QT long type 1","Effort, en particulier la natation"],
        ["QT long type 2","Émotion, stimulus auditif brutal (réveil, sonnerie) — période du post-partum particulièrement à risque"],
        ["QT long type 3","Repos et sommeil — bénéfice attendu de la mexilétine"],
      ]}/>
      <Info title="Intérêt pratique" color={c}>
        Le génotype oriente les conseils de mode de vie, le choix du traitement et la surveillance. C'est l'une des rares situations où le résultat génétique change directement la prise en charge.
      </Info>
      <SeeAlso items={[
        { label:"Grossesse — cardiomyopathies", icon:"🤰", color:"#C2557A", target:{ kind:"topic", chapterKey:"gross", topicKey:"cmpgr" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function CANALqtacquisContent({ go, step }) {
  const c = CANAL_TOPICS.qtacquis.color;
  switch(step) {
    case "start": return (<div>
      <Info title="QT long acquis" color={c}>
        Beaucoup plus fréquent que la forme congénitale, et largement évitable. C'est une des situations de garde où l'anticipation change tout.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Facteurs favorisants" color={c} onClick={()=>go("facteurs")}/>
        <Btn title="Torsades de pointes" color={c} onClick={()=>go("torsades")}/>
      </div>
    </div>);

    case "facteurs": return (<div>
      <Sec title="Ce qui allonge le QT" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Catégorie","Exemples"],
        ["Anti-arythmiques","Amiodarone, sotalol, flécaïnide (indirect), disopyramide"],
        ["Anti-infectieux","Macrolides, fluoroquinolones, antifongiques azolés, certains antipaludéens"],
        ["Psychotropes","Halopéridol, antipsychotiques atypiques, antidépresseurs tricycliques, citalopram et escitalopram"],
        ["Antiémétiques","Ondansétron, dompéridone"],
        ["Troubles ioniques","Hypokaliémie, hypomagnésémie, hypocalcémie"],
        ["Autres","Bradycardie, bloc auriculo-ventriculaire, hypothyroïdie, dénutrition, anorexie"],
      ]}/>
      <Res title="Facteurs de risque du patient" classe="Pratique" level="" color={c} icon="⚠️" items={[
        "Sexe féminin, âge avancé, cardiopathie sous-jacente, insuffisance rénale ou hépatique",
        "Association de plusieurs médicaments allongeant le QT, ou interaction augmentant les concentrations",
        "Prédisposition génétique latente, révélée par le médicament",
      ]}/>
      <Info title="Réflexe" color={c}>
        Avant d'introduire une molécule à risque chez un patient fragile : ECG de référence, correction de la kaliémie et de la magnésémie, et ECG de contrôle après l'introduction.
      </Info>
    </div>);

    case "torsades": return (<div>
      <Sec title="Torsades de pointes" color={c}/>
      <Res title="Prise en charge" classe="Urgence" level="" color={c} icon="🌀" items={[
        "Arrêter immédiatement tout médicament suspect",
        "Sulfate de magnésium par voie intraveineuse, même si la magnésémie est normale",
        "Corriger la kaliémie, en visant plutôt la partie haute de la normale",
        "Accélérer la fréquence cardiaque en cas de bradycardie ou de pauses : entraînement électrosystolique ou isoprénaline (sauf QT long congénital)",
        "Choc électrique si dégradation en fibrillation ventriculaire ou mauvaise tolérance",
        "Surveillance scopée jusqu'à normalisation du QT",
      ]}/>
      <Info title="Distinction importante" color={c}>
        L'isoprénaline est utile dans le QT long acquis avec bradycardie, mais elle est délétère dans le QT long congénital, où les bêtabloquants restent la base du traitement.
      </Info>
      <SeeAlso items={[
        { label:"Doses d'urgence", icon:"💉", color:"#D0442F", target:{ kind:"topic", chapterKey:"urgences", topicKey:"doses" } },
        { label:"Dyskaliémies", icon:"🧪", color:ACCENT, target:{ kind:"topic", chapterKey:"metab", topicKey:"hyperk" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function CANALbrugadaContent({ go, step }) {
  const c = CANAL_TOPICS.brugada.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Syndrome de Brugada" color={c}>
        Les critères diagnostiques ont été resserrés en 2022 : un aspect type 1 induit ne suffit plus à lui seul.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Diagnostic" color={c} onClick={()=>go("diag")}/>
        <Btn title="Stratification du risque" color={c} onClick={()=>go("risque")}/>
        <Btn title="Prise en charge" color={c} onClick={()=>go("pec")}/>
      </div>
    </div>);

    case "diag": return (<div>
      <Sec title="Diagnostic" color={c}/>
      <Res title="Ce qui a changé en 2022" classe="ESC 2022" level="" color={c} icon="📈" items={[
        "Aspect type 1 spontané : le diagnostic peut être retenu",
        "Aspect type 1 seulement induit par un test pharmacologique : il faut désormais un argument clinique associé — arrêt cardiaque récupéré (classe I), histoire familiale évocatrice, ou syncope de mécanisme arythmique",
        "Cette restriction évite de coller une étiquette lourde à des sujets asymptomatiques sans autre argument",
        "Test génétique orienté sur le gène SCN5A recommandé chez le cas index",
      ]}/>
      <Info title="Piège" color={c}>
        Un aspect de type 1 peut être démasqué par la fièvre : chez un patient connu ou suspect, la fièvre impose un traitement antipyrétique rapide et une surveillance ECG.
      </Info>
    </div>);

    case "risque": return (<div>
      <Sec title="Stratification" color={c}/>
      <Table cols="1.4fr 1.4fr" rows={[
        ["Élément","Poids"],
        ["Arrêt cardiaque récupéré ou TV soutenue documentée","Risque maximal — défibrillateur en prévention secondaire"],
        ["Syncope de mécanisme arythmique","Risque élevé"],
        ["Aspect type 1 spontané","Plus à risque qu'un aspect seulement induit"],
        ["Patient asymptomatique avec aspect induit","Risque faible"],
        ["Stimulation ventriculaire programmée","Peut être envisagée chez l'asymptomatique avec type 1 spontané (classe IIb)"],
      ]}/>
    </div>);

    case "pec": return (<div>
      <Sec title="Prise en charge" color={c}/>
      <Res title="Mesures" classe="ESC 2022" level="" color={c} icon="🛡️" items={[
        "Éviter les médicaments contre-indiqués : consulter une liste dédiée avant toute prescription",
        "Traiter énergiquement la fièvre",
        "Éviter les excès d'alcool et les repas très copieux",
        "Défibrillateur en prévention secondaire ; discussion individualisée chez le patient symptomatique",
        "Quinidine ou ablation du substrat épicardique dans les formes avec orages rythmiques, en centre expert",
        "L'ablation systématique n'est pas recommandée chez le patient asymptomatique",
      ]}/>
    </div>);
    default: return null;
  }
}

function CANALcpvtContent({ go, step }) {
  const c = CANAL_TOPICS.cpvt.color;
  switch(step) {
    case "start": return (<div>
      <Info title="TV catécholergique (CPVT)" color={c}>
        Syncopes déclenchées par l'effort ou l'émotion chez un sujet jeune, avec un ECG de repos normal : le diagnostic repose sur l'épreuve d'effort.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Diagnostic" color={c} onClick={()=>go("diag")}/>
        <Btn title="Traitement" color={c} onClick={()=>go("ttt")}/>
      </div>
    </div>);

    case "diag": return (<div>
      <Sec title="Diagnostic" color={c}/>
      <Res title="Éléments clés" classe="ESC 2022" level="" color={c} icon="🔍" items={[
        "ECG de repos typiquement normal : c'est un piège classique",
        "Épreuve d'effort ou Holter : extrasystoles ventriculaires puis TV bidirectionnelle ou polymorphe, reproductibles et proportionnelles à l'effort",
        "Contexte : syncope à l'effort ou lors d'une émotion forte chez l'enfant, l'adolescent ou l'adulte jeune",
        "Test génétique recommandé ; le diagnostic peut être retenu sans mutation identifiée si le phénotype est typique",
      ]}/>
    </div>);

    case "ttt": return (<div>
      <Sec title="Traitement" color={c}/>
      <Res title="Stratégie" classe="ESC 2022" level="" color={c} icon="💊" items={[
        "Bêtabloquants pour tous, de préférence non sélectifs (nadolol ou propranolol), à la dose maximale tolérée",
        "Flécaïnide à ajouter au bêtabloquant chez les patients symptomatiques présentant des TV polymorphes ou bidirectionnelles, des extrasystoles persistantes à l'effort ou des syncopes récidivantes — indépendamment de la présence d'une mutation",
        "Limitation des sports de compétition et des situations d'émotion intense",
        "Dénervation sympathique cardiaque gauche : place renforcée en cas d'échec ou d'intolérance",
        "Défibrillateur à envisager en cas de syncope arythmique malgré bêtabloquant à dose maximale et flécaïnide (classe IIa)",
      ]}/>
      <Info title="Attention" color={c}>
        Un défibrillateur seul, sans traitement médicamenteux optimal, expose à des chocs qui déclenchent à leur tour une décharge adrénergique et de nouvelles arythmies. Le traitement de fond reste indispensable.
      </Info>
    </div>);
    default: return null;
  }
}

function CANALautresContent({ go, step }) {
  const c = CANAL_TOPICS.autres.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Autres syndromes" color={c}>
        Trois entités plus rares, mais à connaître devant une mort subite inexpliquée.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Syndrome du QT court" color={c} onClick={()=>go("qtcourt")}/>
        <Btn title="〰️ Repolarisation précoce" color={c} onClick={()=>go("rep")}/>
        <Btn title="Fibrillation ventriculaire idiopathique" color={c} onClick={()=>go("fvi")}/>
      </div>
    </div>);

    case "qtcourt": return (<div>
      <Sec title="Syndrome du QT court" color={c}/>
      <Res title="Diagnostic (critères resserrés en 2022)" classe="ESC 2022" level="" color={c} icon="📐" items={[
        "Un QTc court, de l'ordre de 360 ms ou moins, ne suffit plus à lui seul",
        "Il faut un élément associé : mutation pathogène, histoire familiale de syndrome du QT court, ou antécédent familial de mort subite par arythmie ventriculaire",
        "Le moniteur ECG implantable peut aider à la stratification chez le sujet jeune",
        "Quinidine et défibrillateur constituent les options thérapeutiques, en centre expert",
      ]}/>
    </div>);

    case "rep": return (<div>
      <Sec title="Repolarisation précoce" color={c}/>
      <Res title="Repères" classe="ESC 2022" level="" color={c} icon="〰️" items={[
        "Aspect ECG très fréquent et le plus souvent totalement bénin, notamment chez le sujet jeune sportif",
        "On ne parle de syndrome que si l'aspect est associé à un arrêt cardiaque ou une arythmie ventriculaire documentée, sans autre cause",
        "Éléments plus inquiétants : sus-décalage du point J marqué, localisation inférieure ou latérale étendue, segment ST horizontal ou descendant, contexte familial",
        "Le moniteur implantable peut aider en cas de facteurs de risque associés",
      ]}/>
      <Info title="À retenir" color={c}>
        Ne pas transformer une variante bénigne en maladie : en l'absence de symptôme et d'antécédent familial, un aspect de repolarisation précoce isolé ne justifie ni bilan lourd ni restriction.
      </Info>
    </div>);

    case "fvi": return (<div>
      <Sec title="Fibrillation ventriculaire idiopathique" color={c}/>
      <Res title="Démarche" classe="ESC 2022" level="" color={c} icon="❓" items={[
        "Diagnostic d'élimination : il exige d'avoir écarté une cause structurelle, une canalopathie et une cause métabolique ou toxique",
        "Bilan complet : imagerie (dont IRM), tests pharmacologiques, épreuve d'effort, génétique, bilan familial",
        "Défibrillateur en prévention secondaire",
        "En cas d'orage rythmique ou de chocs répétés, l'isoprénaline, le vérapamil ou la quinidine sont à envisager en phase aiguë",
        "Rechercher des extrasystoles déclenchantes accessibles à une ablation",
      ]}/>
    </div>);
    default: return null;
  }
}

function CANALfamilleContent({ go, step }) {
  const c = CANAL_TOPICS.famille.color;
  switch(step) {
    case "start": return (<div>
      <Sec title="Dépistage familial et conseil génétique" color={c}/>
      <Res title="Principes" classe="ESC 2022" level="" color={c} icon="👨‍👩‍👧" items={[
        "La plupart des canalopathies se transmettent sur un mode autosomique dominant : un apparenté du premier degré a environ une chance sur deux d'être porteur",
        "Le dépistage commence par un ECG et un examen clinique des apparentés du premier degré, avant même la génétique",
        "Le test génétique se fait d'abord chez le cas index ; si une mutation pathogène est identifiée, on teste ensuite les apparentés (test en cascade)",
        "Un apparenté porteur mais sans phénotype relève d'une surveillance et de mesures de prévention adaptées",
        "Le conseil génétique fait partie intégrante de la démarche : information, accompagnement, questions de procréation",
      ]}/>
      <Res title="Après une mort subite inexpliquée" classe="Pratique" level="" color={c} icon="🕯️" items={[
        "Autopsie recommandée, avec conservation d'un prélèvement pour analyse génétique post-mortem",
        "Évaluation systématique des apparentés du premier degré : ECG, échographie, épreuve d'effort, avis spécialisé",
        "Un diagnostic posé chez un apparenté vivant permet de protéger toute une famille",
      ]}/>
      <SeeAlso items={[
        { label:"Cardiomyopathies", icon:"🫀", color:"#A267D9", target:{ kind:"chapter", chapterKey:"cmp" } },
        { label:"Cardiologie du sport", icon:"🏃", color:"#00966A", target:{ kind:"chapter", chapterKey:"sport" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function CanalContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "qtlong")   return <CANALqtlongContent   {...props}/>;
  if (topic === "qtacquis") return <CANALqtacquisContent {...props}/>;
  if (topic === "brugada")  return <CANALbrugadaContent  {...props}/>;
  if (topic === "cpvt")     return <CANALcpvtContent     {...props}/>;
  if (topic === "autres")   return <CANALautresContent   {...props}/>;
  if (topic === "famille")  return <CANALfamilleContent  {...props}/>;
  return null;
}


// ═══ USIC & ASSISTANCE CIRCULATOIRE ═══════════════════════════════
function USICchocContent({ go, step }) {
  const c = USIC_TOPICS.choc.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Choc cardiogénique" color={c}>
        Défaillance de la pompe cardiaque avec hypoperfusion tissulaire. La mortalité reste élevée : reconnaître tôt et orienter vite comptent plus que le choix du dispositif.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Reconnaître" color={c} onClick={()=>go("reco")}/>
        <Btn title="Stades SCAI" color={c} onClick={()=>go("scai")}/>
        <Btn title="Phénotypes et causes" color={c} onClick={()=>go("pheno")}/>
        <Btn title="Premières heures" color={c} onClick={()=>go("prise")}/>
      </div>
    </div>);

    case "reco": return (<div>
      <Sec title="Reconnaître le choc" color={c}/>
      <Res title="Le diagnostic est clinique et biologique" classe="Repères" level="" color={c} icon="🔍" items={[
        "Hypoperfusion : marbrures, extrémités froides, oligurie, confusion, lactates élevés",
        "Hypotension habituelle, mais un patient normotendu peut déjà être en choc si les résistances compensent",
        "Congestion souvent associée, mais un choc peut être « sec » : la volémie doit être évaluée, pas supposée",
        "Échographie précoce indispensable : fonction ventriculaire gauche et droite, valves, épanchement, veine cave",
      ]}/>
      <Info title="Ne pas manquer" color={c}>
        Devant tout choc cardiogénique, chercher immédiatement une cause immédiatement curable : infarctus en cours, complication mécanique, tamponnade, embolie pulmonaire grave, trouble du rythme, intoxication, dysfonction de prothèse.
      </Info>
      <SeeAlso items={[
        { label:"Choc cardiogénique (IC)", icon:"💧", color:"#1684A8", target:{ kind:"topic", chapterKey:"ic", topicKey:"choc" } },
      ]}/>
    </div>);

    case "scai": return (<div>
      <Sec title="Classification SCAI" color={c}/>
      <Table cols="1fr 1.9fr" rows={[
        ["Stade","Description"],
        ["A — à risque","Pas de signe de choc, mais situation exposant (infarctus étendu, insuffisance cardiaque décompensée)"],
        ["B — début","Hypotension ou tachycardie sans hypoperfusion : lactates normaux"],
        ["C — classique","Hypoperfusion nécessitant un soutien (drogues, remplissage, assistance)"],
        ["D — dégradation","Absence de réponse à la prise en charge initiale, nécessité d'escalade"],
        ["E — extrême","Défaillance circulatoire, arrêt cardiaque ou réanimation en cours"],
      ]}/>
      <Res title="Pourquoi c'est utile" classe="Pratique" level="" color={c} icon="📊" items={[
        "Langage commun pour communiquer entre équipes et déclencher un transfert",
        "Le stade évolue : réévaluer régulièrement plutôt que d'étiqueter une fois pour toutes",
        "La trajectoire (amélioration ou dégradation sous traitement) a plus de valeur pronostique que le stade initial",
      ]}/>
    </div>);

    case "pheno": return (<div>
      <Sec title="Phénotypes" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Phénotype","Conséquence pratique"],
        ["Humide et froid","Le plus fréquent : congestion et hypoperfusion — diurétiques et inotropes"],
        ["Sec et froid","Hypoperfusion sans congestion : un remplissage prudent peut être utile"],
        ["Choc à prédominance droite","Embolie pulmonaire, infarctus du ventricule droit, HTAP décompensée — logique thérapeutique différente"],
        ["Choc mixte","Composante vasoplégique associée (sepsis, post-arrêt) : noradrénaline plus volontiers"],
      ]}/>
      <Info title="Le réflexe utile" color={c}>
        Avant d'ajouter une drogue, se poser trois questions : la volémie est-elle adéquate, le ventricule droit est-il en cause, et la cause déclenchante est-elle traitée ?
      </Info>
    </div>);

    case "prise": return (<div>
      <Sec title="Premières heures" color={c}/>
      <Res title="Priorités" classe="Pratique" level="" color={c} icon="⚡" items={[
        "Traiter la cause : revascularisation en urgence si infarctus, drainage si tamponnade, correction du trouble du rythme",
        "Oxygénation et ventilation adaptées ; la ventilation en pression positive soulage le ventricule gauche mais peut compromettre le droit",
        "Restaurer une pression de perfusion : noradrénaline en première intention",
        "Ajouter un inotrope si le débit reste insuffisant malgré une pression correcte",
        "Surveiller la réponse sur les marqueurs de perfusion (lactates, diurèse, conscience) plus que sur le seul chiffre tensionnel",
        "Appeler tôt : dans les formes qui ne s'améliorent pas, le contact précoce avec un centre disposant d'assistance change le pronostic",
      ]}/>
      <SeeAlso items={[
        { label:"Doses d'urgence", icon:"💉", color:"#D0442F", target:{ kind:"topic", chapterKey:"urgences", topicKey:"doses" } },
        { label:"SCA ST+", icon:"🚨", color:"#E85D4A", target:{ kind:"topic", chapterKey:"ischemic", topicKey:"sca" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function USICdroguesContent({ go, step }) {
  const c = USIC_TOPICS.drogues.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Vasopresseurs & inotropes" color={c}>
        Deux familles, deux objectifs : restaurer une pression de perfusion, ou augmenter le débit cardiaque. Les confondre conduit à des impasses.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Vasopresseurs" color={c} onClick={()=>go("vaso")}/>
        <Btn title="Inotropes" color={c} onClick={()=>go("ino")}/>
        <Btn title="Pièges" color={c} onClick={()=>go("pieges")}/>
      </div>
    </div>);

    case "vaso": return (<div>
      <Sec title="Vasopresseurs" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Drogue","Place"],
        ["Noradrénaline","Première intention : elle restaure la pression avec moins d'arythmies que la dopamine"],
        ["Adrénaline","Effet mixte, réservée aux situations réfractaires — davantage d'arythmies, d'hyperlactatémie et de tachycardie"],
        ["Dopamine","Peu utilisée aujourd'hui : plus d'arythmies, sans bénéfice démontré"],
        ["Vasopressine","Appoint possible dans les composantes vasoplégiques"],
      ]}/>
      <Res title="Objectif" classe="Pratique" level="" color={c} icon="🩸" items={[
        "Viser une pression artérielle moyenne suffisante pour perfuser les organes, en général autour de 65 mmHg, à individualiser",
        "Le but est la perfusion, pas le chiffre : suivre lactates, diurèse et état de conscience",
        "Administration à la seringue électrique, idéalement sur voie centrale, avec surveillance continue",
      ]}/>
    </div>);

    case "ino": return (<div>
      <Sec title="Inotropes" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Drogue","Particularités"],
        ["Dobutamine","Inotrope de référence en première intention ; tachycardisante, vasodilatatrice à forte dose"],
        ["Milrinone","Inodilatateur ; utile sous bêtabloquant chronique et en cas de composante droite, mais hypotension et élimination rénale"],
        ["Lévosimendan","Inodilatateur d'action prolongée ; effet persistant plusieurs jours, hypotension fréquente"],
      ]}/>
      <Info title="Choix" color={c}>
        Chez un patient sous bêtabloquant au long cours, la dobutamine peut être moins efficace : la milrinone et le lévosimendan, qui agissent en aval du récepteur bêta, gardent leur effet.
      </Info>
    </div>);

    case "pieges": return (<div>
      <Sec title="Pièges classiques" color={c}/>
      <Res title="À éviter" classe="Pratique" level="" color={c} icon="⚠️" items={[
        "Empiler les inotropes sans traiter la cause : la mortalité tient d'abord à la cause et au délai",
        "Oublier que les inotropes augmentent la consommation myocardique en oxygène et le risque d'arythmie",
        "Introduire ou majorer un bêtabloquant en phase de choc",
        "Remplir aveuglément un patient déjà congestif, ou au contraire priver de remplissage un choc droit",
        "Prolonger les drogues sans stratégie de sortie : définir tôt l'objectif (récupération, assistance, greffe, ou limitation des soins)",
      ]}/>
      <SeeAlso items={[
        { label:"Calculateur débit noradrénaline", icon:"🧪", color:"#0F766E", target:{ kind:"refcard", topicKey:"calc" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function USICassistContent({ go, step }) {
  const c = USIC_TOPICS.assist.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Assistance circulatoire temporaire" color={c}>
        Domaine en mouvement rapide, où les essais récents ont bousculé les habitudes. Les recommandations européennes datent de 2023 et certaines données leur sont postérieures.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Contre-pulsion intra-aortique" color={c} onClick={()=>go("iabp")}/>
        <Btn title="Pompe micro-axiale (Impella)" color={c} onClick={()=>go("impella")}/>
        <Btn title="ECMO veino-artérielle" color={c} onClick={()=>go("ecmo")}/>
        <Btn title="Comment choisir" color={c} onClick={()=>go("choisir")}/>
      </div>
    </div>);

    case "iabp": return (<div>
      <Sec title="Contre-pulsion intra-aortique" color={c}/>
      <Res title="État des connaissances" classe="Données" level="" color={c} icon="🎈" items={[
        "L'essai IABP-SHOCK II n'a montré aucun bénéfice sur la mortalité dans le choc de l'infarctus",
        "Les recommandations européennes déconseillent son usage systématique dans cette indication",
        "Elle garde une place dans les complications mécaniques de l'infarctus (communication interventriculaire, insuffisance mitrale aiguë) et comme moyen de décharge d'appoint",
        "Support hémodynamique modeste comparé aux autres dispositifs, mais pose simple et complications vasculaires moindres",
      ]}/>
    </div>);

    case "impella": return (<div>
      <Sec title="Pompe micro-axiale" color={c}/>
      <Res title="État des connaissances" classe="Données récentes" level="" color={c} icon="🌀" items={[
        "L'essai DanGer Shock, chez des patients en choc lié à un infarctus avec sus-décalage, a montré une réduction de la mortalité à 180 jours (environ 46 % contre 58 %)",
        "Ce bénéfice s'accompagne d'une augmentation nette des complications : saignements, ischémie de membre, recours à l'épuration extra-rénale",
        "Les recommandations européennes de 2023, antérieures à cet essai, restaient prudentes (usage à envisager dans les formes réfractaires, en centre expérimenté)",
        "Les recommandations américaines de 2025 ont depuis renforcé leur position pour des patients sélectionnés en choc sévère ou réfractaire",
        "Le dispositif décharge le ventricule gauche, contrairement à l'ECMO qui augmente sa post-charge",
      ]}/>
      <Info title="Lecture critique" color={c}>
        Le bénéfice observé concerne une population très sélectionnée. Transposer ce résultat à tout choc cardiogénique serait abusif : la sélection des patients et l'expérience du centre pèsent lourd.
      </Info>
    </div>);

    case "ecmo": return (<div>
      <Sec title="ECMO veino-artérielle" color={c}/>
      <Res title="État des connaissances" classe="Données" level="" color={c} icon="🫁" items={[
        "L'essai ECLS-SHOCK n'a pas montré de bénéfice sur la mortalité dans le choc de l'infarctus, au prix de complications hémorragiques et ischémiques",
        "Son usage systématique n'est donc pas recommandé dans cette indication",
        "Elle garde une place dans le choc réfractaire, l'arrêt cardiaque réfractaire sélectionné, la défaillance biventriculaire ou respiratoire associée, et comme pont vers une décision",
        "Limite physiologique majeure : elle augmente la post-charge du ventricule gauche, avec risque de distension et d'œdème pulmonaire",
        "D'où les stratégies de décharge associées (contre-pulsion ou pompe micro-axiale), dont le bénéfice reste surtout observationnel",
      ]}/>
    </div>);

    case "choisir": return (<div>
      <Sec title="Comment choisir" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Situation","Orientation habituelle"],
        ["Défaillance gauche isolée, choc sévère","Pompe micro-axiale, en centre expérimenté"],
        ["Défaillance biventriculaire ou respiratoire","ECMO veino-artérielle, avec décharge gauche si nécessaire"],
        ["Complication mécanique d'infarctus","Contre-pulsion en attendant la chirurgie"],
        ["Arrêt cardiaque réfractaire sélectionné","ECMO en protocole dédié"],
        ["Choc modéré répondant au traitement","Pas d'assistance : optimiser et surveiller"],
      ]}/>
      <Res title="Principes constants" classe="Pratique" level="" color={c} icon="🧭" items={[
        "Décider en équipe et précocement : une assistance posée trop tard, après défaillance multiviscérale, n'améliore pas le pronostic",
        "Définir dès la pose la stratégie de sortie : récupération, assistance de longue durée, transplantation, ou limitation",
        "Anticiper les complications vasculaires, hémorragiques et infectieuses, qui font une grande partie du pronostic",
        "L'expérience du centre est un déterminant majeur du résultat",
      ]}/>
      <SeeAlso items={[
        { label:"Insuffisance cardiaque avancée", icon:"💧", color:"#A267D9", target:{ kind:"topic", chapterKey:"ic", topicKey:"choc" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function USICvdContent({ go, step }) {
  const c = USIC_TOPICS.vd.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Défaillance ventriculaire droite aiguë" color={c}>
        Situation fréquente en unité de soins intensifs, et où les réflexes du ventricule gauche conduisent souvent à aggraver le patient.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Reconnaître et comprendre" color={c} onClick={()=>go("reco")}/>
        <Btn title="Prise en charge" color={c} onClick={()=>go("ttt")}/>
      </div>
    </div>);

    case "reco": return (<div>
      <Sec title="Reconnaître" color={c}/>
      <Res title="Éléments" classe="Repères" level="" color={c} icon="🔍" items={[
        "Signes droits au premier plan : turgescence jugulaire, reflux hépato-jugulaire, hépatalgie, œdèmes, avec des poumons souvent clairs",
        "Échographie : ventricule droit dilaté, TAPSE abaissé, septum paradoxal, veine cave dilatée peu compliante",
        "Causes principales : embolie pulmonaire, infarctus du ventricule droit, hypertension pulmonaire décompensée, syndrome de détresse respiratoire, post-chirurgie cardiaque",
        "Le ventricule droit tolère mal une élévation brutale de post-charge : il se dilate, comprime le ventricule gauche et le débit s'effondre",
      ]}/>
    </div>);

    case "ttt": return (<div>
      <Sec title="Prise en charge" color={c}/>
      <Res title="Les quatre leviers" classe="Pratique" level="" color={c} icon="💊" items={[
        "Traiter la cause : reperfusion, anticoagulation, traitement de l'HTAP, correction de l'hypoxie et de l'hypercapnie",
        "Optimiser la précharge sans excès : un remplissage prudent peut aider, mais un remplissage abondant distend le ventricule droit et aggrave le débit",
        "Maintenir la pression de perfusion coronaire du ventricule droit : noradrénaline précocement, car l'hypotension crée un cercle vicieux ischémique",
        "Réduire la post-charge droite : oxygénation, correction de l'acidose, ventilation protectrice avec pressions limitées, vasodilatateurs pulmonaires inhalés dans certains cas",
      ]}/>
      <Info title="Trois pièges" color={c}>
        Remplir massivement, intuber sans anticiper l'effet hémodynamique de la ventilation en pression positive, et laisser s'installer une hypotension. Chacun de ces gestes peut précipiter le désamorçage.
      </Info>
      <SeeAlso items={[
        { label:"Embolie pulmonaire", icon:"🩸", color:"#A267D9", target:{ kind:"topic", chapterKey:"urgences", topicKey:"ep" } },
        { label:"HTAP", icon:"🫁", color:"#1684A8", target:{ kind:"chapter", chapterKey:"htap" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function USICmonitoContent({ go, step }) {
  const c = USIC_TOPICS.monito.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Monitorage hémodynamique" color={c}>
        Aucun outil ne remplace la réévaluation clinique répétée, mais certains aident à trancher quand la situation n'est pas claire.
      </Info>
      <Sec title="Choisir" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Marqueurs de perfusion" color={c} onClick={()=>go("perf")}/>
        <Btn title="Cathétérisme cardiaque droit" color={c} onClick={()=>go("kt")}/>
        <Btn title="Échographie et outils au lit" color={c} onClick={()=>go("echo")}/>
      </div>
    </div>);

    case "perf": return (<div>
      <Sec title="Marqueurs de perfusion" color={c}/>
      <Table cols="1.3fr 1.5fr" rows={[
        ["Paramètre","Interprétation"],
        ["Lactates","Marqueur central : c'est la cinétique, plus que la valeur isolée, qui guide"],
        ["Diurèse","Reflet simple et précieux de la perfusion rénale"],
        ["Marbrures, temps de recoloration","Évaluation clinique immédiate, à réévaluer souvent"],
        ["Saturation veineuse centrale en oxygène","Aide à juger de l'adéquation entre transport et consommation"],
        ["Fonction rénale et hépatique","Traduisent le retentissement d'organe"],
      ]}/>
    </div>);

    case "kt": return (<div>
      <Sec title="Cathétérisme cardiaque droit" color={c}/>
      <Res title="Quand il aide vraiment" classe="Pratique" level="" color={c} icon="🩺" items={[
        "Choc dont le mécanisme reste incertain après l'échographie",
        "Suspicion de composante droite prédominante ou d'hypertension pulmonaire",
        "Évaluation avant assistance de longue durée ou transplantation",
        "Guidage d'un traitement qui ne donne pas la réponse attendue",
      ]}/>
      <Res title="Ce qu'on en tire" classe="Paramètres" level="" color={c} icon="📊" items={[
        "Pressions de remplissage droite et gauche, débit cardiaque, résistances",
        "Puissance cardiaque, valeur pronostique reconnue dans le choc",
        "Indice de pulsatilité de l'artère pulmonaire, utile pour juger la fonction droite",
      ]}/>
      <SeeAlso items={[
        { label:"KT cardiaque droit", icon:"🩺", color:"#1684A8", target:{ kind:"refcard", topicKey:"cathd" } },
      ]}/>
    </div>);

    case "echo": return (<div>
      <Sec title="Échographie au lit du malade" color={c}/>
      <Res title="Ce qu'on regarde en priorité" classe="Pratique" level="" color={c} icon="📉" items={[
        "Fonction systolique du ventricule gauche et anomalies segmentaires",
        "Taille et fonction du ventricule droit, septum paradoxal",
        "Épanchement péricardique et signes de tamponnade",
        "Valves : fuite aiguë, dysfonction de prothèse, végétation",
        "Veine cave inférieure et signes de congestion",
        "Répéter l'examen : c'est l'évolution sous traitement qui informe le plus",
      ]}/>
      <SeeAlso items={[
        { label:"ETT", icon:"🔬", color:"#1684A8", target:{ kind:"refcard", topicKey:"ett" } },
        { label:"Générateur de CR ETT", icon:"🖨️", color:"#2F8F66", target:{ kind:"refcard", topicKey:"crett" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function UsicContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "choc")    return <USICchocContent    {...props}/>;
  if (topic === "drogues") return <USICdroguesContent {...props}/>;
  if (topic === "assist")  return <USICassistContent  {...props}/>;
  if (topic === "vd")      return <USICvdContent      {...props}/>;
  if (topic === "monito")  return <USICmonitoContent  {...props}/>;
  return null;
}


// ── Échelles & classifications usuelles ──────────────────────────
function ClassifContent({ go, step }) {
  const c = ACCENT;
  switch(step) {
    case "start": return (<div>
      <Info title="Échelles & classifications en cardiologie" color={c}>
        Accès rapide aux échelles les plus utilisées au quotidien.
      </Info>
      <Sec title="Choisir une classification" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="NYHA — dyspnée / IC" color={c} onClick={()=>go("nyha")}/>
        <Btn title="CCS — angor" color={c} onClick={()=>go("ccs")}/>
        <Btn title="Killip — IDM" color={c} onClick={()=>go("killip")}/>
        <Btn title="Forrester — hémodynamique" color={c} onClick={()=>go("forrester")}/>
        <Btn title="mMRC — dyspnée (échelle)" color={c} onClick={()=>go("mmrc")}/>
        <Btn title="Stevenson — profils IC" color={c} onClick={()=>go("stevenson")}/>
      </div>
    </div>);
    case "nyha": return (<div>
      <Sec title="Classification NYHA (New York Heart Association)" color={c}/>
      <Table cols="0.5fr 2fr" rows={[
        ["Classe","Symptômes"],
        ["I","Aucune limitation ; l'activité physique ordinaire n'entraîne pas de symptôme"],
        ["II","Limitation légère ; symptômes à l'activité ordinaire, à l'aise au repos"],
        ["III","Limitation marquée ; symptômes pour une activité INFÉRIEURE à l'ordinaire, à l'aise au repos"],
        ["IV","Symptômes au moindre effort ou au REPOS"],
      ]}/>
      <Info color={c}>Évalue le retentissement fonctionnel de l'insuffisance cardiaque ; guide le traitement et le pronostic.</Info>
    </div>);
    case "ccs": return (<div>
      <Sec title="Classification CCS (Canadian Cardiovascular Society) — angor" color={c}/>
      <Table cols="0.5fr 2fr" rows={[
        ["Classe","Angor"],
        ["I","Angor uniquement pour un effort intense/prolongé ; activité ordinaire non limitée"],
        ["II","Limitation légère ; angor à la marche rapide, en côte, après les repas, au froid"],
        ["III","Limitation marquée ; angor à la marche de 100–200 m ou 1 étage à allure normale"],
        ["IV","Angor au moindre effort ou au repos"],
      ]}/>
    </div>);
    case "killip": return (<div>
      <Sec title="Classification de Killip (IDM à la phase aiguë)" color={c}/>
      <Table cols="0.5fr 1.5fr 0.8fr" rows={[
        ["Classe","Clinique","Mortalité*"],
        ["I","Pas de signe d'IC","Faible"],
        ["II","Râles crépitants < 50%, B3, turgescence jugulaire","Intermédiaire"],
        ["III","Œdème aigu du poumon (râles > 50%)","Élevée"],
        ["IV","Choc cardiogénique","Très élevée"],
      ]}/>
      <Info color={c}>*Le pronostic s'aggrave avec la classe. Évaluation clinique simple au lit du patient dans l'IDM.</Info>
    </div>);
    case "forrester": return (<div>
      <Sec title="Classification de Forrester (hémodynamique)" color={c}/>
      <Table cols="0.5fr 1.5fr 0.9fr" rows={[
        ["Stade","Profil (IC / PCWP)","Type"],
        ["I","IC normal · PCWP normale","Sec & chaud"],
        ["II","IC normal · PCWP élevée (> 18)","Congestif (humide & chaud)"],
        ["III","IC bas (< 2,2) · PCWP normale","Hypoperfusé (froid & sec)"],
        ["IV","IC bas · PCWP élevée","Choc (froid & humide)"],
      ]}/>
      <Info color={c}>Basée sur l'index cardiaque (IC) et la pression capillaire (PCWP). Historiquement invasive ; l'équivalent clinique est la classification de Stevenson.</Info>
      <SeeAlso items={[{ label:"KT cardiaque droit", icon:"🩺", color:"#1684A8", target:{ kind:"refcard", topicKey:"cathd" } }]}/>
    </div>);
    case "mmrc": return (<div>
      <Sec title="Échelle mMRC (modified Medical Research Council) — dyspnée" color={c}/>
      <Table cols="0.5fr 2fr" rows={[
        ["Grade","Dyspnée"],
        ["0","Pour un effort soutenu uniquement"],
        ["1","À la marche rapide ou en légère montée"],
        ["2","Marche plus lentement que les gens de son âge, ou doit s'arrêter en marchant à plat à son rythme"],
        ["3","S'arrête après ~100 m ou quelques minutes de marche à plat"],
        ["4","Trop essoufflé pour quitter la maison, ou dyspnée à l'habillage"],
      ]}/>
      <Info color={c}>Quantifie la dyspnée d'effort (surtout en pneumologie, utile en cardiologie pour le suivi fonctionnel).</Info>
    </div>);
    case "stevenson": return (<div>
      <Sec title="Classification de Stevenson (profils cliniques de l'IC)" color={c}/>
      <Table cols="1fr 1fr 1.3fr" rows={[
        ["","Sec (pas de congestion)","Humide (congestion)"],
        ["Chaud (bien perfusé)","A — compensé","B — congestif"],
        ["Froid (hypoperfusé)","L — bas débit sec","C — choc (froid/humide)"],
      ]}/>
      <Info color={c}>Évaluation clinique au lit : « congestion ? » (humide/sec) et « perfusion ? » (chaud/froid). Le profil C (froid + humide) = choc cardiogénique. Équivalent clinique de Forrester. Voir Choc cardiogénique.</Info>
    </div>);
    default: return null;
  }
}

function AntibioContent({ go, step }) {
  const c = "#EB5757";
  switch(step) {
    case "start": return (<div>
      <Info title="Antibioprophylaxie de l'endocardite (ESC 2023)" color={c}>
        Réservée aux patients à HAUT risque, uniquement pour les gestes bucco-dentaires à risque. Prophylaxie NON recommandée pour le risque intermédiaire ou faible.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Qui ? (patients à haut risque)" color={c} onClick={()=>go("who")}/>
        <Btn title="Quels gestes ?" color={c} onClick={()=>go("when")}/>
        <Btn title="Quelle molécule ?" color={c} onClick={()=>go("which")}/>
      </div>
    </div>);
    case "who": return (<div>
      <Res title="Patients à HAUT risque (prophylaxie recommandée, Classe I)" classe="Haut risque" color={c} icon="👤" items={[
        "Antécédent d'endocardite infectieuse",
        "Prothèse valvulaire (chirurgicale ou TAVI) ou matériel prothétique utilisé pour une réparation valvulaire",
        "Cardiopathie congénitale cyanogène non réparée, ou réparée avec shunt résiduel / régurgitation",
        "Cardiopathie congénitale réparée avec matériel prothétique : pendant les 6 premiers mois (à vie si shunt/régurgitation résiduels)",
        "Nouveau ESC 2023 : dispositif d'assistance ventriculaire (VAD)",
      ]}/>
      <Info title="À considérer (Classe IIb)" color={c}>
        Antibioprophylaxie à envisager après réparation valvulaire mitrale/tricuspide par voie percutanée, et chez les transplantés cardiaques. Pour le risque intermédiaire : au cas par cas.
      </Info>
    </div>);
    case "when": return (<div>
      <Res title="Gestes bucco-dentaires À RISQUE" classe="Ciblé" color={c} icon="🦷" items={[
        "Manipulation de la région gingivale ou péri-apicale de la dent",
        "Effraction de la muqueuse orale (extractions, détartrage, soins avec saignement)",
        "Cible principale : les streptocoques oraux",
      ]}/>
      <Res title="Gestes NE nécessitant PAS de prophylaxie" classe="Pas de prophylaxie" color="#27AE60" icon="✅" items={[
        "Anesthésie locale en zone saine, radiographie dentaire",
        "Pose/ajustement d'appareillage orthodontique, chute de dents de lait",
        "Gestes respiratoires, digestifs, urogénitaux ou cutanés en routine (prophylaxie seulement à considérer, Classe IIb, chez le haut risque)",
      ]}/>
    </div>);
    case "which": return (<div>
      <Sec title="Protocole (dose unique, 30–60 min avant le geste)" color={c}/>
      <Table cols="1.3fr 1.4fr" rows={[
        ["Situation","Molécule (adulte)"],
        ["Sans allergie","Amoxicilline 2 g PO (ou IV) — ampicilline 2 g IV en alternative"],
        ["Alternative (non allergique)","Céfazoline ou ceftriaxone 1 g IV"],
        ["Allergie pénicilline/ampicilline","Céfazoline/ceftriaxone 1 g IV (SAUF anaphylaxie/angio-œdème/urticaire aux pénicillines)"],
      ]}/>
      <Info title="Changements ESC 2023" color={c}>
        La CLINDAMYCINE n'est plus recommandée (risque d'infections à C. difficile). Les céphalosporines sont désormais proposées, mais contre-indiquées en cas d'allergie sévère (anaphylaxie/angio-œdème) aux pénicillines. Dose pédiatrique : amoxicilline 50 mg/kg.
      </Info>
      <Info title="Au-delà de l'antibiotique" color={c}>
        Le plus important reste l'hygiène bucco-dentaire, l'éducation du patient (carte de prévention), et l'élimination des foyers infectieux dentaires ≥ 2 semaines avant une chirurgie cardiaque programmée.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Relais péri-opératoire des anticoagulants ────────────────────
function RelaisContent({ go, step }) {
  const c = "#B5790F";
  switch(step) {
    case "start": return (<div>
      <Info title="Gestion péri-opératoire des antithrombotiques" color={c}>
        Équilibrer risque hémorragique (lié au geste) et risque thrombotique (lié au patient). Toujours vérifier le protocole local / avis spécialisé.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="AOD (anticoagulants oraux directs)" color={c} onClick={()=>go("doac")}/>
        <Btn title="AVK & bridging" color={c} onClick={()=>go("avk")}/>
        <Btn title="Antiagrégants plaquettaires" color={c} onClick={()=>go("apa")}/>
      </div>
    </div>);
    case "doac": return (<div>
      <Sec title="AOD — arrêt selon le risque hémorragique et la fonction rénale" color={c}/>
      <Res title="Principes" classe="AOD" color={c} icon="💊" items={[
        "Geste à risque hémorragique FAIBLE : dernière prise ~24 h avant (soit sauter 1 prise)",
        "Geste à risque hémorragique ÉLEVÉ : arrêt ~48 h avant (plus si insuffisance rénale, surtout dabigatran)",
        "PAS de relais héparine en règle générale (demi-vie courte, effet prévisible)",
        "Reprise à 24 h (faible risque) à 48–72 h (haut risque hémorragique), après hémostase",
        "Adapter selon la clairance de la créatinine (dabigatran = le plus rénal-dépendant)",
      ]}/>
      <Info title="Gestes à faible risque" color={c}>
        Beaucoup de gestes (dentaires simples, cutanés, cataracte, endoscopie diagnostique) peuvent se faire sans arrêt ou avec un arrêt minime. Ne pas sur-interrompre.
      </Info>
    </div>);
    case "avk": return (<div>
      <Sec title="AVK — selon le risque thrombotique" color={c}/>
      <Res title="Geste à faible risque hémorragique" classe="Simple" color={c} icon="🩸" items={[
        "Souvent réalisable sans arrêt si INR en zone thérapeutique (chirurgie cutanée, dentaire, cataracte)",
      ]}/>
      <Res title="Geste à risque hémorragique : arrêt + éventuel relais" classe="Bridging" color={c} icon="🔄" items={[
        "Arrêt de l'AVK ~5 jours avant (contrôle INR < 1,5 la veille/le jour)",
        "RELAIS par HBPM/HNF (« bridging ») réservé au HAUT risque thrombotique : prothèse valvulaire mécanique (surtout mitrale/ancienne génération), ACFA à très haut risque (ATCD embolique récent, CHA₂DS₂-VASc élevé), MTEV récente (< 3 mois)",
        "Faible risque thrombotique : PAS de relais (le bridging augmente le risque hémorragique sans bénéfice net — essai BRIDGE)",
        "Dernière dose curative d'HBPM ~24 h avant, HNF IV arrêtée ~4–6 h avant",
      ]}/>
      <Info title="Reprise" color={c}>
        Reprendre l'AVK dès que possible après le geste (souvent le soir même), avec relais héparine jusqu'à INR de nouveau en zone cible si haut risque thrombotique.
      </Info>
    </div>);
    case "apa": return (<div>
      <Sec title="Antiagrégants plaquettaires" color={c}/>
      <Res title="Principes" classe="APA" color={c} icon="🫀" items={[
        "Aspirine en prévention secondaire : le plus souvent POURSUIVIE (surtout coronarien, sauf geste à très haut risque hémorragique — neurochirurgie, chambre postérieure de l'œil)",
        "Bithérapie après stent : ne PAS interrompre pendant la période critique (reporter la chirurgie non urgente) — délai selon le type de stent et le contexte (SCA vs stable)",
        "Si arrêt nécessaire : clopidogrel/ticagrélor ~5 j avant, prasugrel ~7 j avant",
        "Discussion cardiologue ↔ chirurgien ↔ anesthésiste pour tout patient stenté récent",
      ]}/>
      <Info title="Le piège" color={c}>
        Interrompre prématurément une bithérapie après un stent récent expose à la thrombose de stent (pronostic redoutable). Toute chirurgie non urgente doit être reportée après la période à risque.
      </Info>
    </div>);
    default: return null;
  }
}

function PosoContent({ go, step }) {
  const c = VALVES.poso.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Fiche posologies rapides" color={c}>
        Doses usuelles adulte à fonction rénale normale — à adapter au cas par cas. Ne remplace pas le VIDAL ni les protocoles locaux.
      </Info>
      <Sec title="Choisir une catégorie" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Urgences rythmiques" subtitle="Amiodarone, Xylocard, adénosine, digoxine, esmolol" color={c} onClick={()=>go("rythmo")}/>
        <Btn title="SCA / antithrombotiques" subtitle="Aspirine, P2Y12, héparines, fibrinolyse" color={c} onClick={()=>go("sca")}/>
        <Btn title="Insuffisance cardiaque aiguë" subtitle="Diurétiques, vasodilatateurs, inotropes" color={c} onClick={()=>go("icaigue")}/>
        <Btn title="Urgence hypertensive" subtitle="Nicardipine, labétalol, urapidil, dérivés nitrés" color={c} onClick={()=>go("hta")}/>
        <Btn title="Anticoagulation (FA / MTEV)" subtitle="DOAC, HBPM, AVK" color={c} onClick={()=>go("anticoag")}/>
      </div>
    </div>);

    case "rythmo": return (<div>
      <Sec title="Antiarythmiques IV — 1ère intention" color={c}/>
      <Table cols="1fr 0.8fr 1.5fr" rows={[
        ["DCI","Nom®","Posologie IV"],
        ["Amiodarone","Cordarone","TV stable : 150 mg/10 min puis 900 mg/24h. Instable/ACR : 300 mg bolus (+150 mg si besoin)"],
        ["Adénosine","Krenosin","TSV : 6 mg flash → 12 mg → 12 mg (rinçage rapide, bras surélevé)"],
        ["ATP","Striadyne","TSV : 10 mg flash → 20 mg"],
        ["Esmolol","Brevibloc","Bolus 500 µg/kg/1 min puis 50–200 µg/kg/min"],
        ["Digoxine","Digoxine","Ralentissement FA : 0,25–0,5 mg IV lente, puis 0,25 mg/4–6h (max 1–1,5 mg/24h)"],
        ["Isoprénaline","Isuprel","Bradycardie/BAV : 0,5–10 µg/min en titration"],
        ["Atropine","—","Bradycardie : 0,5 mg IV, répétable /3–5 min (max 3 mg)"],
      ]}/>
      <Info title="Orage rythmique — amiodarone" color={c}>
        150 mg bolus puis 1 mg/min × 6h puis 0,5 mg/min × 18h, associé à un bêtabloquant non sélectif IV.
      </Info>
      <Sec title="Xylocard (lidocaïne IV) — TV, 2ᵉ intention" color={c}/>
      <div style={{
        background:SURF, border:`1px solid ${BDR}`, borderRadius:8, padding:"12px 14px", marginBottom:10,
      }}>
        <div style={{ color:MUT, fontWeight:640, fontSize:13, marginBottom:6 }}>XYLOCARD 20 mg/mL (lidocaïne)</div>
        <div style={{ background:c+"14", border:`1px solid ${c}44`, borderRadius:6, padding:"6px 9px", marginBottom:8 }}>
          <span style={{ color:c, fontSize:11, fontWeight:560 }}>2ᵉ intention</span>
          <span style={{ color:MUT, fontSize:11 }}> — uniquement en cas d'échec de l'amiodarone (TV sur SCA/IDM, stable)</span>
        </div>
        <ul style={{ margin:0, paddingLeft:16, color:MUT, fontSize:11.5, lineHeight:1.5 }}>
          <li><b>Dose de charge :</b> 1 à 1,5 mg/kg en bolus IV lent (2–3 min), soit ~100 mg (5 mL) chez l'adulte de poids moyen</li>
          <li><b>Réinjection :</b> 0,5–0,75 mg/kg toutes les 5–10 min si l'arythmie persiste (dose cumulée max 3 mg/kg ou 300 mg)</li>
          <li><b>Relais perfusion :</b> 1,5 à 4 mg/min sous surveillance ECG continue</li>
          <li><b>Récidive en cours de perfusion :</b> nouveau bolus de 25–50 mg</li>
          <li><b>Contre-indications :</b> insuffisance cardiaque, choc cardiogénique, BAV non appareillé, porphyrie, épilepsie non contrôlée</li>
        </ul>
      </div>
    </div>);

    case "sca": return (<div>
      <Sec title="Antiagrégants plaquettaires" color={c}/>
      <Table cols="1fr 0.8fr 1.5fr" rows={[
        ["DCI","Nom®","Dose de charge → entretien"],
        ["Aspirine","Kardégic","150–300 mg PO (ou 75–250 mg IV) → 75–100 mg/j"],
        ["Ticagrelor","Brilique","180 mg → 90 mg ×2/j"],
        ["Prasugrel","Efient","60 mg → 10 mg/j (5 mg si <60 kg ou ≥75 ans)"],
        ["Clopidogrel","Plavix","300–600 mg → 75 mg/j"],
        ["Cangrelor","Kengrexal","Bolus 30 µg/kg puis 4 µg/kg/min (PCI, usage hospitalier)"],
      ]}/>
      <Sec title="Anticoagulants de la phase aiguë" color={c}/>
      <Table cols="1fr 0.8fr 1.5fr" rows={[
        ["DCI","Nom®","Posologie"],
        ["Énoxaparine","Lovenox","100 UI/kg (1 mg/kg) SC ×2/j (75 UI/kg si ≥75 ans) ± bolus IV 30 mg"],
        ["HNF","—","Bolus 60–70 UI/kg (max 5000) puis 12–15 UI/kg/h, cible TCA 1,5–2,5×"],
        ["Fondaparinux","Arixtra","2,5 mg SC/j (NSTEMI)"],
      ]}/>
      <Sec title="Fibrinolyse — Ténectéplase (Métalyse), bolus IV unique" color={c}/>
      <Table cols="1.2fr 1fr 1fr" rows={[
        ["Poids","< 75 ans","≥ 75 ans (½ dose)"],
        ["< 60 kg","30 mg","15 mg"],
        ["60–69 kg","35 mg","17,5 mg"],
        ["70–79 kg","40 mg","20 mg"],
        ["80–89 kg","45 mg","22,5 mg"],
        ["≥ 90 kg","50 mg","25 mg"],
      ]}/>
    </div>);

    case "icaigue": return (<div>
      <Sec title="Diurétiques" color={c}/>
      <Table cols="1fr 0.8fr 1.5fr" rows={[
        ["DCI","Nom®","Posologie IV"],
        ["Furosémide","Lasilix","Bolus 20–40 mg IV (ou 1–2,5× la dose orale si déjà traité) ; IVSE 5–20 mg/h si résistance"],
      ]}/>
      <Sec title="Vasodilatateurs (si PAS > 110 mmHg)" color={c}/>
      <Table cols="1fr 0.8fr 1.5fr" rows={[
        ["DCI","Nom®","Posologie IV"],
        ["Trinitrine","Lénitral","1 mg/h initial, titration jusqu'à 10 mg/h selon PA"],
        ["Dinitrate isosorbide","Risordan","1–10 mg/h IVSE"],
      ]}/>
      <Sec title="Inotropes / vasopresseurs (si bas débit / choc)" color={c}/>
      <Table cols="1fr 0.8fr 1.5fr" rows={[
        ["DCI","Nom®","Posologie IVSE"],
        ["Dobutamine","Dobutrex","2–20 µg/kg/min"],
        ["Noradrénaline","—","0,2–1 µg/kg/min (choc cardiogénique, vasopresseur de 1er choix)"],
        ["Milrinone","Corotrope","0,375–0,75 µg/kg/min (inodilatateur)"],
        ["Adrénaline","—","0,05–0,5 µg/kg/min (réservé, arythmogène)"],
      ]}/>
    </div>);

    case "hta": return (<div>
      <Sec title="Antihypertenseurs IV — urgence hypertensive" color={c}/>
      <Table cols="1fr 0.8fr 1.5fr" rows={[
        ["DCI","Nom®","Posologie IV"],
        ["Nicardipine","Loxen","1–5 mg/h en perfusion (neurologique, péri-op)"],
        ["Labétalol","Trandate","Bolus 20–80 mg puis 0,5–2 mg/min (éclampsie, neuro)"],
        ["Urapidil","Eupressyl","Bolus 12,5–25 mg puis 5–40 mg/h (usage général)"],
        ["Esmolol","Brevibloc","Bolus 500 µg/kg puis 50–200 µg/kg/min (dissection)"],
        ["Trinitrine","Lénitral","1–10 mg/h (OAP, SCA)"],
      ]}/>
      <Info title="Dissection aortique" color="#EB5757">
        Cible PAS 100–120 mmHg + FC &lt; 60 bpm — bêtabloquant IV (esmolol/labétalol) en 1ère intention avant tout vasodilatateur seul.
      </Info>
    </div>);

    case "anticoag": return (<div>
      <Sec title="DOAC — FA / MTEV" color={c}/>
      <Table cols="1fr 0.7fr 1.5fr" rows={[
        ["DCI","Nom®","Posologie"],
        ["Apixaban","Eliquis","5 mg ×2/j (2,5 si ≥2 critères : ≥80a, ≤60kg, créat ≥133)"],
        ["Rivaroxaban","Xarelto","20 mg/j (15 si DFG 15–49)"],
        ["Dabigatran","Pradaxa","150 mg ×2/j (110 si ≥80a ou vérapamil)"],
        ["Edoxaban","Lixiana","60 mg/j (30 si ≤60kg, DFG 15–50, ou vérapamil)"],
      ]}/>
      <Sec title="HBPM curative" color={c}/>
      <Table cols="1fr 0.8fr 1.5fr" rows={[
        ["DCI","Nom®","Posologie"],
        ["Énoxaparine","Lovenox","100 UI/kg (1 mg/kg) SC ×2/j ou 150 UI/kg (1,5 mg/kg) SC ×1/j"],
        ["Tinzaparine","Innohep","175 UI/kg SC ×1/j"],
      ]}/>
      <Sec title="AVK — cibles INR" color={c}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Indication","Cible INR"],
        ["FA, MTEV, bioprothèse (3 mois)","2–3"],
        ["Prothèse mécanique aortique bas risque","2–3"],
        ["Prothèse mécanique mitrale / haut risque","2,5–3,5"],
      ]}/>
      <Info color={c}>Détails complets (surdosage, péri-opératoire, interactions) dans la fiche AVK dédiée sur la page d'accueil.</Info>
    </div>);

    default: return null;
  }
}

// ── AVK — Gestion pratique ────────────────────────────────────────
function AVKContent({ go, step }) {
  const c = VALVES.avk.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Anti-Vitamines K — Guide pratique (Recommandations HAS)" color={c}>
        Coumadine (warfarine), Sintrom (acénocoumarol), Previscan (fluindione) — l'INR est le seul paramètre biologique de surveillance
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Cibles INR par indication" subtitle="Zones thérapeutiques selon la pathologie" color={c} onClick={()=>go("targets")}/>
        <Btn title="Surdosage asymptomatique" subtitle="Conduite à tenir selon le niveau d'INR — HAS" color={c} onClick={()=>go("overdose")}/>
        <Btn title="Accident hémorragique" subtitle="Hémorragie non grave et hémorragie grave" color="#EB5757" onClick={()=>go("bleeding")}/>
        <Btn title="Gestion péri-opératoire" subtitle="Arrêt, relais, reprise — chirurgie programmée et urgente" color={c} onClick={()=>go("periop")}/>
        <Btn title="Interactions médicamenteuses majeures" subtitle="Potentialisateurs et inhibiteurs de l'effet AVK" color={c} onClick={()=>go("interactions")}/>
        <Btn title="Initiation du traitement" subtitle="Schéma de démarrage, surveillance initiale" color={c} onClick={()=>go("initiation")}/>
      </div>
    </div>);

    case "targets": return (<div>
      <Sec title="Zones cibles d'INR selon l'indication" color={c}/>
      <Table cols="1.8fr 0.8fr" rows={[
        ["Indication","Cible INR"],
        ["Fibrillation atriale (prévention thromboembolique)","2–3"],
        ["MTEV (TVP/EP) — traitement curatif","2–3"],
        ["MTEV — prévention secondaire au long cours","2–3"],
        ["Valvulopathie mitrale / RM + FA","2–3"],
        ["Prothèse valvulaire biologique (3 premiers mois)","2–3"],
        ["Prothèse valvulaire mécanique en position aortique — bas risque","2–3"],
        ["Prothèse valvulaire mécanique en position aortique — haut risque","2,5–3,5"],
        ["Prothèse valvulaire mécanique en position mitrale","2,5–3,5"],
        ["Double prothèse mécanique ou FA associée à une prothèse mécanique","2,5–3,5"],
      ]}/>
      <Info title="Prothèse valvulaire mécanique — facteurs de risque majorant la cible" color={c}>
        Prothèse mitrale, valve en position tricuspide, antécédent de thromboembolie, FA associée, dysfonction VG sévère (FEVG &lt; 35%), hypercoagulabilité → cible 2,5–3,5 au minimum, parfois plus élevée selon le type de valve.
      </Info>
      <Info color={c}>La cible INR est centrée sur la valeur médiane de la zone (ex. 2,5 pour une cible 2–3). Un INR en dehors de la zone nécessite un ajustement posologique mais pas de correction systématique si asymptomatique et légèrement hors cible.</Info>
    </div>);

    case "overdose": return (<div>
      <Info title="Surdosage asymptomatique (INR cible habituel 2–3)" color={c}>
        Conduite à tenir selon recommandations HAS — pas d'hémorragie, patient asymptomatique
      </Info>
      <Table cols="1fr 1.8fr" rows={[
        ["INR mesuré","Conduite à tenir"],
        ["3 – 4","Simple ajustement posologique sans saut de prise. Contrôle INR à 3–4 jours"],
        ["4 – 6","Saut d'une prise (ou ½ prise de la dose suivante). Contrôle INR le lendemain"],
        ["6 – 10","Arrêt des AVK. Vitamine K 1–2 mg PO (½ à 1 ampoule pédiatrique buvable 2 mg). Contrôle INR le lendemain"],
        ["> 10","Arrêt des AVK. Vitamine K 5 mg PO (½ ampoule adulte 10 mg). Contrôle INR le lendemain. Hospitalisation à envisager si facteur de risque hémorragique"],
      ]}/>
      <Info title="Vitamine K disponible en France" color={c}>
        Vitamine K1 (phytoménadione) : ampoule buvable pédiatrique 2 mg/0,2 mL (Konakion Pédiatrique) et ampoule buvable adulte 10 mg/1 mL (Konakion). Voie orale préférée sauf urgence absolue.
      </Info>
      <Info title="Facteurs de risque hémorragique orientant vers l'hospitalisation" color="#EB5757">
        Âge &gt; 75 ans, insuffisance rénale ou hépatique, antécédent d'hémorragie digestive, anémie, cancer actif, HTA non contrôlée, polymédication à risque — ces facteurs peuvent nécessiter une surveillance hospitalière même sans hémorragie active.
      </Info>
    </div>);

    case "bleeding": return (<div>
      <Sec title="Évaluation de la gravité" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="🟡 Hémorragie non grave" color="#B5790F" onClick={()=>go("minor_bleed")}/>
        <Btn title="Hémorragie grave" color="#EB5757" onClick={()=>go("major_bleed")}/>
      </div>
    </div>);

    case "minor_bleed": return (<div>
      <Res title="Hémorragie non grave — prise en charge ambulatoire possible" classe="Conduite à tenir" color="#B5790F" icon="🟡" items={[
        "INR en urgence",
        "Mesures locales d'hémostase (compression, pansement compressif)",
        "Adapter les AVK selon le niveau d'INR (cf. tableau surdosage)",
        "Recherche d'un facteur déclenchant (interaction médicamenteuse, prise d'AINS/aspirine, modification alimentaire)",
        "Hospitalisation si facteurs de risque hémorragique ou hémorragie persistante malgré mesures locales",
      ]}/>
    </div>);

    case "major_bleed": return (<div>
      <Res title="Critères de gravité d'une hémorragie sous AVK" classe="Hémorragie grave" color="#EB5757" icon="🔴" items={[
        "Hémorragie intracrânienne (HIC), intraoculaire, intrapéritonéale, péricardique",
        "Hémorragie digestive active avec retentissement hémodynamique",
        "Hémorragie musculaire ou articulaire profonde",
        "Traumatisme crânien même sans saignement visible",
        "Tout saignement mettant en jeu le pronostic vital ou fonctionnel",
      ]}/>
      <Res title="Prise en charge urgente — hospitalisation immédiate" classe="Urgence" color="#EB5757" icon="🚨" items={[
        "INR en urgence dès l'arrivée",
        "Arrêt immédiat des AVK",
        "CCP (Concentré de Complexe Prothrombinique) IV — Kanokad, Octaplex — en urgence (dose selon INR et poids)",
        "Vitamine K 5–10 mg IV associée systématiquement aux CCP (sauf si correction < 4h nécessaire)",
        "Traitement chirurgical/endoscopique de la cause si applicable",
      ]}/>
      <Info title="Traumatisme crânien sous AVK — protocole spécifique" color="#EB5757">
        Hospitalisation systématique 24h, même sans signe neurologique. Scanner cérébral en urgence immédiate si signe neurologique, dans les 6–8h si asymptomatique. Correction de l'INR dès l'admission selon le même protocole (CCP + vitamine K).
      </Info>
    </div>);

    case "periop": return (<div>
      <Sec title="Chirurgie programmée — gestion par molécule" color={c}/>
      <Table cols="1.4fr 1.6fr" rows={[
        ["AVK","Arrêt et délai avant chirurgie"],
        ["Warfarine (Coumadine)","Arrêt 5 jours avant l'intervention"],
        ["Fluindione (Previscan)","Arrêt 4 jours avant l'intervention"],
        ["Acénocoumarol (Sintrom)","Arrêt 3 jours avant l'intervention"],
      ]}/>
      <Info color={c}>INR cible la veille de l'intervention : &lt; 1,5 (objectif opératoire). Si INR &gt; 1,5 la veille → 5 mg vitamine K orale, contrôle INR le matin de l'intervention.</Info>
      <Sec title="Nécessité d'un relais héparinique ?" color={c}/>
      <Res title="Relais recommandé (haut risque thromboembolique)" classe="Classe I" color="#27AE60" icon="🔄" items={[
        "Prothèse valvulaire mécanique — toujours",
        "MTEV récente (< 3 mois)",
        "FA avec score CHA₂DS₂-VA ≥ 2 et antécédent AVC/AIT récent",
        "Thrombophilie sévère connue",
      ]}/>
      <Res title="Relais non recommandé (bas risque thromboembolique)" classe="Classe IIb" color="#B5790F" icon="⛔" items={[
        "FA isolée avec score CHA₂DS₂-VA faible sans antécédent AVC",
        "MTEV ancienne (> 3 mois) sans récidive",
        "Prothèse biologique au-delà des 3 premiers mois post-opératoires",
      ]}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Relais par","Modalités"],
        ["HBPM curative","Arrêt 24h avant la chirurgie (dernière injection J-1 soir)"],
        ["HNF SC","Arrêt 8–12h avant la chirurgie"],
        ["HNF IV (SESP)","Arrêt 4–6h avant la chirurgie"],
      ]}/>
      <Info title="Reprise des AVK en post-opératoire" color={c}>
        Dès que l'hémostase le permet (généralement J1 soir ou J2 matin si chirurgie à faible risque hémorragique). Poursuivre le relais héparinique jusqu'à obtention d'un INR thérapeutique ≥ 2 jours consécutifs. Délai de remontée INR : 3–5 jours selon la molécule.
      </Info>
    </div>);

    case "interactions": return (<div>
      <Info title="Principe" color={c}>
        Les AVK sont métabolisés par le CYP2C9 (principalement) et le CYP3A4. Toute interaction modifiant ce métabolisme ou le cycle de la vitamine K entraîne une variation imprévisible de l'INR. Contrôle systématique de l'INR à 3–4 jours lors de tout ajout ou arrêt d'un médicament interférent.
      </Info>
      <Sec title="Médicaments potentialisateurs (↑ effet AVK — risque hémorragique ↑)" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Médicament","Mécanisme / Note"],
        ["Amiodarone (Cordarone)","Inhibition CYP2C9 puissante et prolongée. ↑ INR majeure. Réduire la dose d'AVK de 30–50% à l'introduction. Effet persistant 8 semaines après arrêt"],
        ["Fluconazole, miconazole","Antifongiques azolés — inhibiteurs puissants du CYP2C9"],
        ["Métronidazole","Inhibition CYP2C9 + inhibition métabolisme intestinal de la vitamine K"],
        ["Fluoroquinolones (ciprofloxacine)","Réduction de la flore intestinale productrice de vitamine K"],
        ["AINS (ibuprofène, naproxène…)","Inhibition plaquettaire + compétition albumine → risque hémorragique cumulatif — contre-indiqués si possible"],
        ["Aspirine forte dose","Inhibition plaquettaire synergique"],
        ["Paracétamol > 2g/j prolongé","↑ INR par mécanisme incertain — surveiller"],
      ]}/>
      <Sec title="Médicaments inhibiteurs (↓ effet AVK — risque thrombotique ↑)" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Médicament","Mécanisme / Note"],
        ["Rifampicine","Inducteur enzymatique puissant — ↓↓ INR. Peut nécessiter un doublement de dose d'AVK"],
        ["Phénobarbital, carbamazépine","Inducteurs du CYP2C9/3A4 — surveillance rapprochée"],
        ["Millepertuis (St John's Wort)","Inducteur enzymatique puissant — automédication à risque"],
        ["Cholestyramine","Réduit l'absorption intestinale des AVK"],
      ]}/>
      <Info title="Aliments riches en vitamine K — à surveiller, non contre-indiqués" color={c}>
        Choux, brocolis, choucroute, épinards, persil — non interdits mais leur consommation doit être régulière et stable dans le temps pour éviter les fluctuations d'INR. Un apport massif et inhabituel peut réduire l'effet des AVK.
      </Info>
    </div>);

    case "initiation": return (<div>
      <Res title="Choix de la molécule" classe="Recommandation HAS" color="#27AE60" icon="💊" items={[
        "Warfarine (Coumadine) recommandée en 1ère intention — meilleur rapport bénéfice/risque, demi-vie plus longue (36–42h), données internationales les plus robustes",
        "Fluindione (Previscan) utilisée en France mais non recommandée de novo (manque de données comparatives, risque immunoallergique spécifique : néphrites interstitielles, hépatites)",
        "Acénocoumarol (Sintrom) : demi-vie courte (8–11h), INR plus fluctuant, à éviter si possible",
      ]}/>
      <Sec title="Schéma d'initiation — Warfarine (Coumadine)" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Jour","Posologie indicative (sujet standard)"],
        ["J1","5 mg le soir (réduire à 2–3 mg si sujet âgé, petit poids, insuffisance hépatique, ou polymédication)"],
        ["J3","1er contrôle INR — adapter la dose selon résultat"],
        ["J5–J7","2e contrôle INR — affiner la dose"],
        ["Puis","Contrôle toutes les 2 semaines jusqu'à stabilité, puis mensuel"],
      ]}/>
      <Info color={c}>Il n'est pas recommandé d'utiliser une dose de charge élevée (&gt; 5 mg) pour accélérer l'anticoagulation — augmente le risque de surdosage sans bénéfice thromboembolique démontré. Si une anticoagulation immédiate est nécessaire (ex. MTEV aiguë), initier en relais d'une héparine et poursuivre jusqu'à INR thérapeutique ≥ 2 jours consécutifs.</Info>
      <Sec title="Surveillance minimale recommandée" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Situation","Fréquence INR"],
        ["Initiation ou modification de dose","Dans les 3–4 jours, puis selon résultat"],
        ["Introduction/arrêt d'un médicament interférant","INR à 3–4 jours"],
        ["Traitement stable en zone thérapeutique","Au minimum 1 fois par mois"],
        ["Toute décompensation aiguë (infection, diarrhée, fièvre)","INR dans les 24–48h"],
      ]}/>
    </div>);

    default: return null;
  }
}

// ── ECG normal — Valeurs de référence ────────────────────────────
function ECGContent({ go, step }) {
  const c = VALVES.ecg.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Électrocardiogramme normal de l'adulte" color={c}>
        Valeurs de référence pour l'interprétation systématique d'un tracé ECG 12 dérivations
      </Info>
      <Sec title="Choisir une catégorie" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="⏱️ Intervalles" subtitle="PR, QRS, QT/QTc — durées normales" color={c} onClick={()=>go("intervals")}/>
        <Btn title="Axe et fréquence" subtitle="Axe QRS, fréquence cardiaque" color={c} onClick={()=>go("axis")}/>
        <Btn title="Morphologie des ondes" subtitle="P, QRS, ST, T — caractéristiques normales" color={c} onClick={()=>go("waves")}/>
      </div>
    </div>);
    case "intervals": return (<div>
      <Sec title="Intervalles — valeurs normales (adulte)" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Intervalle","Valeur normale"],
        ["Fréquence cardiaque","60–100 bpm"],
        ["PR","120–200 ms"],
        ["QRS","70–100 ms (anormal si ≥ 120 ms)"],
        ["QTc — Homme","≤ 440 ms"],
        ["QTc — Femme","≤ 460 ms"],
      ]}/>
      <Info color={c}>Règle pratique au lit du malade : le QT est habituellement inférieur à la moitié de l'intervalle RR qui le précède — ne remplace pas le calcul formel du QTc, mais utile en vérification rapide.</Info>
      <Info title="Mesure du QT" color={c}>
        Du début du QRS à la fin de l'onde T. Si la fin de l'onde T est difficile à identifier, utiliser le point où la branche descendante terminale de l'onde T rejoint la ligne isoélectrique. Le QTc corrige le QT pour la fréquence cardiaque (formule de Bazett la plus utilisée en pratique).
      </Info>
    </div>);
    case "axis": return (<div>
      <Sec title="Axe QRS frontal" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Axe","Interprétation"],
        ["−30° à +90°","Normal"],
        ["−30° à −90°","Déviation axiale gauche (hémibloc antérieur gauche, IDM inférieur)"],
        ["+90° à +180°","Déviation axiale droite"],
      ]}/>
      <Info color={c}>L'axe se déplace progressivement vers la gauche avec l'âge — un axe légèrement gauche peut être physiologique chez le sujet âgé en l'absence d'autre anomalie.</Info>
    </div>);
    case "waves": return (<div>
      <Sec title="Onde P" color={c}/>
      <Res title="Caractéristiques normales" classe="Normal" color="#27AE60" icon="🌊" items={[
        "Représente la dépolarisation auriculaire",
        "Normalement positive (upright) dans la majorité des dérivations, sauf en aVR",
        "Peut être biphasique en II et V1 (composante auriculaire droite puis gauche)",
      ]}/>
      <Sec title="Segment ST" color={c}/>
      <Res title="Caractéristiques normales" classe="Normal" color="#27AE60" icon="🌊" items={[
        "Représente la fin de la dépolarisation ventriculaire",
        "Normalement horizontal, sur la ligne de base du segment PR (ou TP), ou légèrement décalé",
      ]}/>
      <Sec title="Onde T" color={c}/>
      <Res title="Caractéristiques normales" classe="Normal" color="#27AE60" icon="🌊" items={[
        "Reflète la repolarisation ventriculaire",
        "Concordance habituelle avec la polarité du QRS — une discordance peut signer un infarctus ancien ou récent",
        "Habituellement lisse et arrondie",
      ]}/>
      <Info title="Variations pathologiques à connaître" color={c}>
        Onde T amples et pointues : hyperkaliémie, hypocalcémie, HVG. Onde T de faible amplitude : hypokaliémie, hypomagnésémie.
      </Info>
    </div>);
    default: return null;
  }
}

// ── ECG pathologique ─────────────────────────────────────────────
// ── Générateur de tracés ECG en SVG ──────────────────────────────
// Dessine une bande rythmique annotée. Chaque "beat" est décrit par des ondes.
function ECGTrace({ pattern, caption, height=130 }) {
  const W = 400, H = height, mid = H * 0.55;
  // Build a path from a list of segments. Each primitive returns points relative to a cursor.
  // We compose beats depending on the pattern.
  const px = [];
  // helpers producing polyline points; x advances, y is amplitude (positive = up on screen => subtract)
  const flat = (x, len, step=4) => { const pts=[]; for(let i=0;i<=len;i+=step) pts.push([x+i, mid]); return {pts, x:x+len}; };
  const pWave = (x, amp=8, w=16) => { const pts=[]; for(let i=0;i<=w;i++){ const t=i/w; pts.push([x+i, mid - amp*Math.sin(Math.PI*t)]); } return {pts, x:x+w}; };
  const qrs = (x, R=42, up=true) => {
    // small q, tall R, s
    const s = up ? 1 : -1;
    const pts=[[x,mid],[x+3, mid + s*6],[x+7, mid - s*R],[x+12, mid + s*14],[x+16, mid]];
    return {pts, x:x+16};
  };
  const qrsWide = (x, R=38, up=true, notch=false) => {
    const s = up ? 1 : -1;
    const pts = notch
      ? [[x,mid],[x+4,mid - s*R*0.7],[x+9,mid - s*R*0.5],[x+14,mid - s*R],[x+22,mid + s*8],[x+30,mid]]
      : [[x,mid],[x+5, mid + s*5],[x+12, mid - s*R],[x+20, mid - s*R*0.6],[x+28, mid + s*10],[x+34,mid]];
    return {pts, x:x + (notch?30:34)};
  };
  const rsr = (x, R=30) => { // rSR' pattern (V1 in RBBB): r, S, R'
    const pts=[[x,mid],[x+3,mid - R*0.5],[x+6,mid + 10],[x+10,mid - R],[x+16,mid + 6],[x+20,mid]];
    return {pts, x:x+20};
  };
  const tWave = (x, amp=14, w=22, inv=false) => { const pts=[]; const s=inv?-1:1; for(let i=0;i<=w;i++){ const t=i/w; pts.push([x+i, mid - s*amp*Math.sin(Math.PI*t)]); } return {pts, x:x+w}; };
  const stElev = (x, len=20, h=14) => { const pts=[[x,mid],[x+3,mid-h]]; for(let i=3;i<=len;i+=3) pts.push([x+i, mid-h]); return {pts, x:x+len, elevated:h}; };

  let x = 8;
  const push = seg => { seg.pts.forEach(p=>px.push(p)); x = seg.x; };
  const annotations = [];

  if (pattern === "bav1") {
    // long PR, all conducted
    for (let b=0;b<3;b++){ push(flat(x,6)); push(pWave(x)); push(flat(x,30)); push(qrs(x)); push(tWave(x)); push(flat(x,24)); }
    annotations.push("PR allongé constant (> 200 ms)");
  } else if (pattern === "bav2mobitz1") {
    // progressively lengthening PR then dropped beat
    const prs=[16,30,46];
    for (const pr of prs){ push(flat(x,6)); push(pWave(x)); push(flat(x,pr)); push(qrs(x)); push(tWave(x)); push(flat(x,14)); }
    // dropped: P without QRS
    push(flat(x,6)); push(pWave(x)); push(flat(x,40));
    annotations.push("PR ↑ progressif puis P bloquée (flèche)");
  } else if (pattern === "bav2mobitz2") {
    // constant PR, sudden dropped P
    for (let b=0;b<2;b++){ push(flat(x,6)); push(pWave(x)); push(flat(x,24)); push(qrs(x)); push(tWave(x)); push(flat(x,18)); }
    push(flat(x,6)); push(pWave(x)); push(flat(x,44)); // dropped
    for (let b=0;b<1;b++){ push(flat(x,6)); push(pWave(x)); push(flat(x,24)); push(qrs(x)); push(tWave(x)); push(flat(x,10)); }
    annotations.push("PR constant puis P bloquée soudaine");
  } else if (pattern === "bav3") {
    // dissociation: regular P at one rate, independent QRS slower
    // draw P waves regularly
    let xp = 12; while (xp < W-10){ px.push([xp,mid]); const pw=pWave(xp); pw.pts.forEach(p=>px.push(p)); xp += 46; }
    // But we need one continuous line; simpler: draw baseline with P's and few wide QRS overlaid sequentially
    px.length = 0; x = 8;
    // sequence approximating dissociation
    push(pWave(x)); push(flat(x,20)); push(qrsWide(x,36,true,true)); push(tWave(x,12)); push(flat(x,6));
    push(pWave(x)); push(flat(x,30)); push(pWave(x)); push(flat(x,10)); push(qrsWide(x,36,true,true)); push(tWave(x,12));
    push(pWave(x)); push(flat(x,20));
    annotations.push("P et QRS indépendants — QRS large lent (échappement)");
  } else if (pattern === "rbbb") {
    for (let b=0;b<3;b++){ push(flat(x,6)); push(pWave(x,6)); push(flat(x,16)); push(rsr(x)); push(tWave(x,10,20,true)); push(flat(x,18)); }
    annotations.push("V1 : rSR' (oreilles de lapin) + T négative");
  } else if (pattern === "lbbb") {
    for (let b=0;b<3;b++){ push(flat(x,6)); push(pWave(x,6)); push(flat(x,16)); push(qrsWide(x,40,true,true)); push(tWave(x,12,20,true)); push(flat(x,16)); }
    annotations.push("V5-V6 : R large crochetée (M) + repolarisation discordante");
  } else if (pattern === "stemi") {
    for (let b=0;b<3;b++){ push(flat(x,6)); push(pWave(x,6)); push(flat(x,16)); push(qrs(x,40)); const st=stElev(x,22,16); st.pts.forEach(p=>px.push(p)); x=st.x; push(tWave(x,16,20)); push(flat(x,14)); }
    annotations.push("Sus-décalage ST convexe (onde de Pardee)");
  } else if (pattern === "normal") {
    for (let b=0;b<3;b++){ push(flat(x,6)); push(pWave(x)); push(flat(x,18)); push(qrs(x)); push(tWave(x)); push(flat(x,22)); }
    annotations.push("Rythme sinusal normal");
  } else if (pattern === "hyperk_mild") {
    // peaked, tall, narrow T waves
    for (let b=0;b<3;b++){ push(flat(x,6)); push(pWave(x,7)); push(flat(x,18)); push(qrs(x));
      // peaked T: narrow and tall, tent-shaped
      const tp=[[x,mid],[x+8,mid-34],[x+16,mid]]; tp.forEach(p=>px.push(p)); x+=16;
      push(flat(x,26)); }
    annotations.push("Ondes T amples, pointues, symétriques (« en tente »)");
  } else if (pattern === "hyperk_mod") {
    // flattened/absent P, widened QRS, peaked T
    for (let b=0;b<3;b++){ push(flat(x,10)); push(qrsWide(x,36,true,false));
      const tp=[[x,mid],[x+9,mid-32],[x+18,mid]]; tp.forEach(p=>px.push(p)); x+=18;
      push(flat(x,26)); }
    annotations.push("Disparition des P + élargissement du QRS + T pointues");
  } else if (pattern === "hyperk_sine") {
    // sine-wave pattern (pre-arrest)
    const pts=[]; for(let i=0;i<=W-16;i++){ pts.push([8+i, mid - 30*Math.sin(2*Math.PI*i/70)]); } pts.forEach(p=>px.push(p)); x=W-8;
    annotations.push("Onde sinusoïdale (pré-arrêt) — urgence absolue");
  } else if (pattern === "hypok") {
    // flat/inverted T, prominent U wave, ST depression
    for (let b=0;b<3;b++){ push(flat(x,6)); push(pWave(x)); push(flat(x,18)); push(qrs(x));
      // slight ST depression
      const st=[[x,mid],[x+4,mid+6],[x+12,mid+6]]; st.forEach(p=>px.push(p)); x+=12;
      // small flat T
      const tt=[]; for(let i=0;i<=16;i++){ const t=i/16; tt.push([x+i, mid+6 - 6*Math.sin(Math.PI*t)]); } tt.forEach(p=>px.push(p)); x+=16;
      // prominent U wave
      const uu=[]; for(let i=0;i<=18;i++){ const t=i/18; uu.push([x+i, mid - 12*Math.sin(Math.PI*t)]); } uu.forEach(p=>px.push(p)); x+=18;
      push(flat(x,16)); }
    annotations.push("Sous-décalage ST, T aplatie, onde U proéminente");
  }

  const d = "M " + px.map(p=>`${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ");
  // ECG grid
  const grid = [];
  for (let gx=0; gx<=W; gx+=8) grid.push(<line key={"vx"+gx} x1={gx} y1={0} x2={gx} y2={H} stroke={gx%40===0?"#E7A9A0":"#F3D3CE"} strokeWidth={gx%40===0?0.8:0.4}/>);
  for (let gy=0; gy<=H; gy+=8) grid.push(<line key={"hy"+gy} x1={0} y1={gy} x2={W} y2={gy} stroke={gy%40===0?"#E7A9A0":"#F3D3CE"} strokeWidth={gy%40===0?0.8:0.4}/>);

  return (
    <div style={{ background:"#FFF9F7", borderRadius:8, padding:"8px", marginBottom:8, border:`1px solid ${BDR}`, width:"100%", boxSizing:"border-box" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:`${height}px`, display:"block" }} preserveAspectRatio="xMidYMid meet">
        {grid}
        <path d={d} fill="none" stroke="#B0143C" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
      </svg>
      {caption && <div style={{ color:MUT, fontSize:11, textAlign:"center", marginTop:2, fontWeight:600 }}>{caption}</div>}
      {annotations.map((a,i)=>(<div key={i} style={{ color:"#B0143C", fontSize:10.5, textAlign:"center", marginTop:1 }}>{a}</div>))}
    </div>
  );
}

function ECGPathContent({ go, step }) {
  const c = VALVES.ecgpath.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Interprétation de l'ECG pathologique" color={c}>
        Lecture systématique : rythme, fréquence, axe, intervalles (PR, QRS, QT), puis anomalies de conduction, d'hypertrophie et de repolarisation. Toujours confronter à la clinique.
      </Info>
      <Sec title="Choisir une catégorie" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Troubles conductifs (BAV)" subtitle="Blocs auriculo-ventriculaires 1er–3e degré" color={c} onClick={()=>go("bav")}/>
        <Btn title="Blocs de branche & hémiblocs" subtitle="BBD, BBG, HBAG, HBPG" color={c} onClick={()=>go("bbb")}/>
        <Btn title="Hypertrophies" subtitle="HVG, HVD, hypertrophies auriculaires" color={c} onClick={()=>go("hyper")}/>
        <Btn title="Ischémie & repolarisation" subtitle="SCA, territoires, diagnostics différentiels du sus-ST" color="#EB5757" onClick={()=>go("ischemia")}/>
        <Btn title="Tachycardies à QRS FIN" subtitle="Démarche devant une tachycardie régulière/irrégulière" color={c} onClick={()=>go("narrow")}/>
        <Btn title="Tachycardies à QRS LARGE" subtitle="TV vs TSV avec aberration — pièges" color="#EB5757" onClick={()=>go("wide")}/>
      </div>
    </div>);
    case "bav": return (<div>
      <Sec title="Blocs auriculo-ventriculaires" color={c}/>
      <ECGTrace pattern="bav1" caption="BAV 1er degré"/>
      <ECGTrace pattern="bav2mobitz1" caption="BAV 2 Mobitz I (Wenckebach)"/>
      <ECGTrace pattern="bav2mobitz2" caption="BAV 2 Mobitz II"/>
      <ECGTrace pattern="bav3" caption="BAV 3 (complet) — dissociation"/>
      <Table cols="1fr 1.8fr" rows={[
        ["Type","Caractéristiques ECG"],
        ["BAV 1er degré","PR allongé &gt; 200 ms, constant, toutes les P conduites"],
        ["BAV 2 Mobitz I (Luciani-Wenckebach)","Allongement progressif du PR jusqu'à une P bloquée. Souvent nodal, bénin"],
        ["BAV 2 Mobitz II","PR constant puis P bloquée soudaine. Souvent infra-nodal, risque d'évolution vers BAV complet"],
        ["BAV 2:1","1 P sur 2 conduite — difficile à classer Mobitz I/II"],
        ["BAV 3 (complet)","Dissociation auriculo-ventriculaire complète : P et QRS indépendants, rythme d'échappement"],
      ]}/>
      <Info title="Localisation & pronostic" color={c}>
        Échappement à QRS fin (jonctionnel, 40–60/min) → bloc haut situé (nodal), plutôt stable. Échappement à QRS large (ventriculaire, &lt; 40/min) → bloc bas situé (infra-nodal), instable, à haut risque. Le Mobitz II et le BAV complet relèvent généralement d'une stimulation (cf. Bradycardies).
      </Info>
    </div>);
    case "bbb": return (<div>
      <Sec title="Blocs de branche (QRS ≥ 120 ms)" color={c}/>
      <ECGTrace pattern="rbbb" caption="Bloc de branche DROIT — aspect en V1"/>
      <Res title="Bloc de branche DROIT (BBD)" classe="BBD" color={c} icon="🔀" items={[
        "QRS ≥ 120 ms (incomplet si 110–120 ms)",
        "Aspect rSR' (« oreilles de lapin ») en V1-V2",
        "Onde S large et empâtée en D1, V5-V6",
        "Troubles secondaires de repolarisation en V1-V2 (T négatives)",
      ]}/>
      <ECGTrace pattern="lbbb" caption="Bloc de branche GAUCHE — aspect en V5-V6"/>
      <Res title="Bloc de branche GAUCHE (BBG)" classe="BBG" color={c} icon="🔀" items={[
        "QRS ≥ 120 ms",
        "Onde R large, monophasique et crochetée en D1, V5-V6 (aspect en 'M')",
        "Absence d'onde Q en V5-V6, aspect QS ou rS en V1",
        "Troubles secondaires de repolarisation (ST/T opposés au QRS)",
        "Un BBG rend l'analyse de l'ischémie difficile ; un BBG NOUVEAU dans un contexte de douleur = équivalent de SCA (critères de Sgarbossa)",
      ]}/>
      <Sec title="Hémiblocs (blocs fasciculaires)" color={c}/>
      <Table cols="1fr 1.8fr" rows={[
        ["Type","Caractéristiques"],
        ["Hémibloc antérieur gauche (HBAG)","Déviation axiale gauche marquée (&lt; −45°), q1S3, QRS peu élargi"],
        ["Hémibloc postérieur gauche (HBPG)","Déviation axiale droite (&gt; +90°), S1Q3, plus rare (éliminer HVD/cœur pulmonaire)"],
        ["Bloc bifasciculaire","BBD + HBAG (ou HBPG). Surveiller car risque d'évolution vers BAV complet"],
      ]}/>
    </div>);
    case "hyper": return (<div>
      <Sec title="Hypertrophie ventriculaire GAUCHE (HVG)" color={c}/>
      <Res title="Critères de voltage (les plus utilisés)" classe="HVG" color={c} icon="💪" items={[
        "Sokolow-Lyon : SV1 + RV5 ou RV6 ≥ 35 mm",
        "Cornell : RaVL + SV3 &gt; 28 mm (homme) / &gt; 20 mm (femme)",
        "R en aVL ≥ 11 mm",
        "Signes associés : déviation axiale gauche, troubles de repolarisation ('surcharge' systolique : ST sous-décalé + T négatif asymétrique en latéral)",
      ]}/>
      <Sec title="Hypertrophie ventriculaire DROITE (HVD)" color={c}/>
      <Res title="Critères" classe="HVD" color={c} icon="💪" items={[
        "Déviation axiale droite (&gt; +90°)",
        "Grande onde R en V1 (R/S &gt; 1 en V1), onde S persistante en V5-V6",
        "Troubles de repolarisation en précordiales droites",
        "Contexte : cœur pulmonaire, HTAP, valvulopathie droite",
      ]}/>
      <Sec title="Hypertrophies auriculaires" color={c}/>
      <Table cols="1fr 1.8fr" rows={[
        ["Type","Onde P"],
        ["HAG (oreillette gauche)","P large ≥ 120 ms, bifide en D2 ('P mitrale'), composante négative large en V1"],
        ["HAD (oreillette droite)","P ample &gt; 2,5 mm, pointue en D2 ('P pulmonaire')"],
      ]}/>
    </div>);
    case "ischemia": return (<div>
      <Sec title="Territoires coronaires à l'ECG" color={c}/>
      <Table cols="1.2fr 1.4fr 1fr" rows={[
        ["Territoire","Dérivations","Artère"],
        ["Antéro-septal","V1–V2 (–V3)","IVA proximale"],
        ["Apical / antérieur","V3–V4","IVA"],
        ["Latéral","D1, aVL, V5–V6","Circonflexe / diagonale"],
        ["Antérieur étendu","V1–V6, D1, aVL","IVA proximale"],
        ["Inférieur","D2, D3, aVF","Coronaire droite (ou Cx)"],
        ["Basal / postérieur","Miroir en V1–V3, V7–V9","Cx / CD"],
        ["VD","V3R–V4R","CD proximale"],
      ]}/>
      <Sec title="Chronologie de l'infarctus ST+" color={c}/>
      <ECGTrace pattern="stemi" caption="Sus-décalage ST (onde de Pardee)"/>
      <Res title="Évolution des signes" classe="STEMI" color="#EB5757" icon="📉" items={[
        "Ondes T amples pointues et symétriques (hyperaiguës) — précoce, fugace",
        "Sus-décalage ST (onde de Pardee), convexe vers le haut, avec signe en miroir",
        "Apparition d'ondes Q de nécrose (après quelques heures)",
        "Négativation des ondes T, normalisation progressive du ST",
      ]}/>
      <Sec title="Diagnostics différentiels d'un sus-décalage ST" color={c}/>
      <Table cols="1fr 1.8fr" rows={[
        ["Cause","Indice distinctif"],
        ["Péricardite","Sus-ST diffus, concave vers le haut, SANS miroir, sous-décalage PQ"],
        ["Repolarisation précoce","Sujet jeune, point J surélevé, ondes T amples, aspect stable"],
        ["Anévrysme VG","Sus-ST persistant en antérieur après IDM ancien, ondes Q"],
        ["Brugada","Sus-ST en dôme (type 1) en V1-V2"],
        ["BBG / pacemaker","Repolarisation discordante — appliquer Sgarbossa"],
        ["Hyperkaliémie / autres","Contexte métabolique, T amples"],
      ]}/>
      <Info title="Ne pas oublier" color="#EB5757">
        Un sous-décalage ST en V1-V3 peut être le miroir d'un IDM postérieur (faire les dérivations postérieures V7-V9). Devant un IDM inférieur, faire V3R-V4R pour dépister l'atteinte du VD (contre-indique les dérivés nitrés).
      </Info>
    </div>);
    case "narrow": return (<div>
      <Info title="Tachycardie à QRS FIN (&lt; 120 ms)" color={c}>
        Origine supraventriculaire. Première étape : le rythme est-il régulier ou irrégulier ?
      </Info>
      <Sec title="Régulière" color={c}/>
      <Res title="Principales causes" classe="QRS fin régulier" color={c} icon="🏃" items={[
        "Tachycardie sinusale (P sinusales normales, contexte : fièvre, effort, hypovolémie…)",
        "Flutter atrial (ondes F en dents de scie, souvent conduction 2:1 → ~150/min)",
        "Tachycardie jonctionnelle (Bouveret : réentrée intranodale ou sur voie accessoire) — P rétrogrades",
        "Tachycardie atriale",
      ]}/>
      <Info title="Manœuvre diagnostique" color={c}>
        Les manœuvres vagales ou l'adénosine ralentissent le nœud AV : arrêtent une réentrée jonctionnelle, ou démasquent les ondes F/P d'un flutter ou d'une tachycardie atriale (sans les réduire). Utile au diagnostic ET au traitement.
      </Info>
      <Sec title="Irrégulière" color={c}/>
      <Res title="Principales causes" classe="QRS fin irrégulier" color={c} icon="🏃" items={[
        "Fibrillation atriale (absence d'onde P, trémulation, irrégularité complète)",
        "Flutter à conduction variable",
        "Tachycardie atriale multifocale (≥ 3 morphologies de P — souvent BPCO)",
      ]}/>
    </div>);
    case "wide": return (<div>
      <Info title="Tachycardie à QRS LARGE (≥ 120 ms)" color="#EB5757">
        Jusqu'à preuve du contraire, une tachycardie régulière à QRS large est une TACHYCARDIE VENTRICULAIRE (TV), surtout s'il existe une cardiopathie. Ne jamais présumer une TSV avec aberration par excès de prudence.
      </Info>
      <Sec title="Arguments en faveur d'une TV" color={c}/>
      <Res title="Critères (Brugada, Vereckei)" classe="TV" color="#EB5757" icon="⚠️" items={[
        "Dissociation auriculo-ventriculaire (P indépendantes) — quasi pathognomonique",
        "Complexes de capture et de fusion",
        "QRS très large (&gt; 140 ms si aspect BBD, &gt; 160 ms si aspect BBG)",
        "Concordance des QRS dans toutes les précordiales (tous positifs ou tous négatifs)",
        "Axe hyper-dévié ('no man's land'), morphologie atypique ne correspondant pas à un bloc de branche classique",
        "Antécédent de cardiopathie ischémique / d'IDM : oriente fortement vers une TV",
      ]}/>
      <Sec title="Causes de tachycardie à QRS large" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Mécanisme","Contexte"],
        ["TV","Cardiopathie, cicatrice d'IDM — le plus fréquent et le plus grave"],
        ["TSV + bloc de branche (aberration)","Bloc préexistant ou fonctionnel"],
        ["TSV + préexcitation (WPW)","Voie accessoire — FA préexcitée : URGENCE (risque de FV)"],
        ["Rythme électro-entraîné","Pacemaker"],
      ]}/>
      <Info title="Conduite" color="#EB5757">
        En cas de mauvaise tolérance → choc électrique externe synchronisé. En cas de doute TV/TSV sur une tachycardie régulière stable, la traiter comme une TV. Éviter le vérapamil sur une tachycardie large indéterminée (risque de collapsus si TV). Cf. chapitre Rythmologie et Urgences.
      </Info>
    </div>);
    default: return null;
  }
}

function EchoDiagram({ view }) {
  const muted = "#9A8F7C";
  // Palette « écran d'échographe » — identique en thème clair et sombre
  const MYO = "#C9B98E", VALVE = "#F7F2E6", SEPT = "#D8C79A";
  const CAV_VD = "#B23A48", STK_VD = "#E86A78";
  const CAV_VG = "#1F4E6B", STK_VG = "#4FA3CE";
  const CAV_OG = "#2A6B5A", STK_OG = "#4FCEA3";
  const CAV_OD = "#8A5A2A", STK_OD = "#E8A04F";
  const AO = "#5A3E7A", STK_AO = "#A97FD0";
  const FOIE = "#5A4535", STK_FOIE = "#8A6A4A";

  const screen = (ch, legend) => (
    <div style={{ marginBottom:10 }}>
      <div style={{ background:"#0E1016", borderRadius:8, padding:"10px", border:`1px solid ${BDR}`, width:"100%", boxSizing:"border-box", display:"flex", justifyContent:"center" }}>
        {ch}
      </div>
      {legend && (
        <div style={{ marginTop:6, display:"flex", flexWrap:"wrap", gap:"4px 10px" }}>
          {legend.map((l,i)=>(
            <span key={i} style={{ fontSize:10.5, color:MUT, lineHeight:1.5 }}>
              <span style={{ color:l.c, fontWeight:640 }}>{l.k}</span> {l.v}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const T = (x,y,txt,anchor="middle",fill="#F5EFE2",size=11,weight=700) => (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={fill}>{txt}</text>
  );
  const cone = <path d="M 200 8 L 44 300 A 262 262 0 0 0 356 300 Z" fill="#14161E" stroke="#2A2B34" strokeWidth="1"/>;

  // ── ① PARASTERNALE GRAND AXE ────────────────────────────────────
  if (view === "plax") return screen(
    <svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%", height:"265px", display:"block" }} preserveAspectRatio="xMidYMid meet">
      {cone}
      {/* Masse myocardique continue : paroi VD + septum + paroi VG en un seul bloc */}
      <path d="M 66 66 Q 162 30 268 84 Q 292 140 256 210 Q 158 248 76 212 Q 48 140 66 66 Z"
            fill={MYO} opacity="0.95" stroke="#8E8266" strokeWidth="1.2"/>
      {/* Aorte : tube arrondi (contour puis lumière) */}
      <path d="M 248 152 Q 298 132 342 98" fill="none" stroke={STK_AO} strokeWidth="50" strokeLinecap="round" opacity="0.55"/>
      <path d="M 248 152 Q 298 132 342 98" fill="none" stroke={AO} strokeWidth="42" strokeLinecap="round" opacity="0.95"/>
      {T(314,116,"Ao","middle","#fff",12)}
      {/* Cavité du VD */}
      <path d="M 94 74 Q 166 54 246 88 Q 200 120 148 118 Q 110 108 94 74 Z"
            fill={CAV_VD} opacity="0.92" stroke={STK_VD} strokeWidth="1.4"/>
      {T(168,96,"VD","middle","#fff",13)}
      {/* Cavité du VG */}
      <path d="M 84 140 Q 162 154 238 158 Q 252 184 234 208 Q 152 226 80 206 Q 64 174 84 140 Z"
            fill={CAV_VG} opacity="0.93" stroke={STK_VG} strokeWidth="1.5"/>
      {T(152,184,"VG","middle","#fff",15)}
      {/* Valve aortique : deux sigmoïdes en travers de la racine */}
      <line x1="269" y1="116" x2="283" y2="135" stroke={VALVE} strokeWidth="2.8"/>
      <line x1="291" y1="154" x2="277" y2="135" stroke={VALVE} strokeWidth="2.8"/>
      {T(258,106,"VA","middle",VALVE,9)}
      {/* Oreillette gauche */}
      <ellipse cx="306" cy="224" rx="58" ry="45" fill={CAV_OG} opacity="0.92" stroke={STK_OG} strokeWidth="1.5"/>
      {T(306,229,"OG","middle","#fff",13)}
      {/* Valve mitrale : feuillet antérieur (continuité aorto-mitrale) et postérieur */}
      <line x1="250" y1="166" x2="208" y2="186" stroke={VALVE} strokeWidth="2.8"/>
      <line x1="246" y1="200" x2="214" y2="193" stroke={VALVE} strokeWidth="2.8"/>
      {T(202,204,"VM","end",VALVE,9)}
      {/* Péricarde */}
      <path d="M 72 220 Q 158 256 250 218" fill="none" stroke="#F0E6C8" strokeWidth="1.6" strokeDasharray="4 3" opacity="0.75"/>
      {/* Aorte descendante */}
      <circle cx="356" cy="284" r="13" fill={AO} opacity="0.9" stroke={STK_AO} strokeWidth="1.4"/>
      {T(356,306,"Ao desc.","middle","#BFA8D8",8,600)}
      {T(200,306,"① Parasternale grand axe (PLAX)","middle",muted,10,600)}
    </svg>,
    [
      { k:"VD", v:"antérieur, le plus proche de la sonde", c:STK_VD },
      { k:"VG", v:"séparé du VD par le septum, paroi inféro-latérale en bas", c:STK_VG },
      { k:"VM", v:"le feuillet antérieur prolonge la paroi postérieure de l'aorte", c:VALVE },
      { k:"Ao / VA", v:"chambre de chasse, valve aortique, aorte ascendante", c:STK_AO },
      { k:"OG", v:"en arrière, sous la racine aortique", c:STK_OG },
      { k:"Ao desc.", v:"repère qui distingue épanchement péricardique et pleural", c:STK_AO },
    ]
  );

  // ── ② PARASTERNALE PETIT AXE (piliers) ──────────────────────────
  if (view === "psax") return screen(
    <svg viewBox="0 0 400 330" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%", height:"270px", display:"block" }} preserveAspectRatio="xMidYMid meet">
      {cone}
      {/* VD en croissant : disque décalé, recouvert ensuite par le VG */}
      <circle cx="150" cy="116" r="100" fill={MYO} opacity="0.85"/>
      <circle cx="150" cy="116" r="92" fill={CAV_VD} opacity="0.9" stroke={STK_VD} strokeWidth="1.4"/>
      {/* VG : myocarde circulaire + cavité */}
      <circle cx="204" cy="176" r="88" fill={MYO} opacity="0.95"/>
      <circle cx="204" cy="176" r="62" fill={CAV_VG} opacity="0.92" stroke={STK_VG} strokeWidth="1.6"/>
      {T(120,76,"VD","middle","#fff",12)}
      {T(204,150,"VG","middle","#fff",15)}
      {/* Muscles piliers */}
      <ellipse cx="238" cy="204" rx="15" ry="11" fill={MYO} opacity="0.95"/>
      <ellipse cx="170" cy="204" rx="15" ry="11" fill={MYO} opacity="0.95"/>
      {T(238,226,"pilier","middle","#E8D8B0",8,600)}
      {T(170,226,"pilier","middle","#E8D8B0",8,600)}
      {/* Segments (niveau médio-ventriculaire) */}
      {T(140,88,"antéro-septal","middle",muted,8,600)}
      {T(246,74,"antérieur","middle",muted,8,600)}
      {T(310,140,"antéro-lat.","middle",muted,8,600)}
      {T(302,232,"inféro-lat.","middle",muted,8,600)}
      {T(204,284,"inférieur","middle",muted,8,600)}
      {T(112,232,"inféro-septal","middle",muted,8,600)}
      {T(200,322,"② Parasternale petit axe — niveau des piliers","middle",muted,10,600)}
    </svg>,
    [
      { k:"VD", v:"en croissant, drapé sur la face antérieure du VG", c:STK_VD },
      { k:"VG", v:"circulaire à ce niveau — toute forme ovalaire fait suspecter une surcharge droite", c:STK_VG },
      { k:"Piliers", v:"niveau de référence pour la cinétique segmentaire", c:"#E8D8B0" },
      { k:"Étages", v:"base (valves) → piliers → apex en inclinant la sonde", c:muted },
    ]
  );

  // ── ③ APICALE 4 CAVITÉS ─────────────────────────────────────────
  if (view === "a4c") return screen(
    <svg viewBox="0 0 400 330" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%", height:"270px", display:"block" }} preserveAspectRatio="xMidYMid meet">
      {cone}
      {T(200,32,"apex","middle","#CDBBA0",9,600)}
      {/* Parois libres */}
      <path d="M 208 46 Q 278 68 294 140 Q 288 186 244 202" fill="none" stroke={MYO} strokeWidth="9" strokeLinecap="round" opacity="0.9"/>
      <path d="M 192 70 Q 136 88 122 150 Q 138 188 184 200" fill="none" stroke={MYO} strokeWidth="7" strokeLinecap="round" opacity="0.85"/>
      {/* Septum interventriculaire */}
      <path d="M 193 46 L 207 46 L 209 196 L 191 196 Z" fill={SEPT} opacity="0.95"/>
      {/* VG — plus grand, forme d'ogive, forme l'apex */}
      <path d="M 208 52 Q 268 74 282 140 Q 276 178 240 192 L 210 194 Q 206 120 208 52 Z" fill={CAV_VG} opacity="0.92" stroke={STK_VG} strokeWidth="1.4"/>
      {T(246,128,"VG","middle","#fff",14)}
      {/* VD — plus petit, triangulaire, n'atteint PAS l'apex */}
      <path d="M 192 76 Q 146 92 134 148 Q 148 180 186 190 L 190 190 Q 190 130 192 76 Z" fill={CAV_VD} opacity="0.9" stroke={STK_VD} strokeWidth="1.4"/>
      {T(162,140,"VD","middle","#fff",12)}
      {/* Bande modératrice */}
      <line x1="150" y1="168" x2="184" y2="178" stroke={MYO} strokeWidth="3" opacity="0.95"/>
      {/* Valve tricuspide — insertion plus apicale que la mitrale */}
      <line x1="191" y1="186" x2="154" y2="196" stroke={VALVE} strokeWidth="2.6"/>
      <line x1="191" y1="186" x2="186" y2="206" stroke={VALVE} strokeWidth="2.6"/>
      {T(148,192,"VT","end",VALVE,9)}
      {/* Valve mitrale */}
      <line x1="209" y1="196" x2="246" y2="206" stroke={VALVE} strokeWidth="2.6"/>
      <line x1="209" y1="196" x2="214" y2="216" stroke={VALVE} strokeWidth="2.6"/>
      {T(252,204,"VM","start",VALVE,9)}
      {/* Oreillettes */}
      <path d="M 186 208 Q 140 214 130 258 Q 158 286 190 280 Q 190 240 186 208 Z" fill={CAV_OD} opacity="0.9" stroke={STK_OD} strokeWidth="1.4"/>
      {T(158,250,"OD","middle","#fff",12)}
      <path d="M 212 210 Q 262 216 274 256 Q 246 286 212 280 Q 208 244 212 210 Z" fill={CAV_OG} opacity="0.9" stroke={STK_OG} strokeWidth="1.4"/>
      {T(242,250,"OG","middle","#fff",12)}
      {/* Septum interauriculaire */}
      <line x1="200" y1="208" x2="201" y2="280" stroke={SEPT} strokeWidth="3" opacity="0.9"/>
      {T(200,322,"③ Apicale 4 cavités (A4C)","middle",muted,10,600)}
    </svg>,
    [
      { k:"Orientation", v:"apex en haut, cavités gauches à droite de l'image", c:muted },
      { k:"VD", v:"triangulaire et plus petit — il ne doit pas atteindre l'apex", c:STK_VD },
      { k:"VG", v:"en ogive, forme la pointe", c:STK_VG },
      { k:"VT", v:"insertion septale plus apicale que la mitrale (décalage normal)", c:VALVE },
      { k:"Bande modératrice", v:"repère du VD", c:"#E8D8B0" },
    ]
  );

  // ── ④ SOUS-COSTALE ──────────────────────────────────────────────
  if (view === "sub") return (
    <div>
      {screen(
        <svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%", height:"250px", display:"block" }} preserveAspectRatio="xMidYMid meet">
          {cone}
          {/* Foie = fenêtre acoustique */}
          <path d="M 66 42 Q 200 28 336 46 Q 322 82 200 86 Q 86 82 66 42 Z" fill={FOIE} opacity="0.8" stroke={STK_FOIE} strokeWidth="1.4"/>
          {T(200,66,"foie","middle","#D8C0A0",12)}
          {/* Péricarde — repère majeur de cette coupe */}
          <path d="M 108 92 Q 210 96 300 210" fill="none" stroke="#F0E6C8" strokeWidth="1.8" strokeDasharray="4 3" opacity="0.95"/>
          {T(120,112,"péricarde","start","#F0E6C8",8,600)}
          {/* Septum en diagonale */}
          <path d="M 118 122 L 132 114 L 296 232 L 284 242 Z" fill={SEPT} opacity="0.95"/>
          {/* Cavités DROITES : les plus proches de la sonde */}
          <path d="M 128 100 Q 88 126 100 176 Q 140 184 166 154 Q 150 122 128 100 Z" fill={CAV_OD} opacity="0.9" stroke={STK_OD} strokeWidth="1.4"/>
          {T(124,146,"OD","middle","#fff",12)}
          <path d="M 142 112 Q 214 98 272 128 Q 242 160 194 162 Q 164 140 142 112 Z" fill={CAV_VD} opacity="0.9" stroke={STK_VD} strokeWidth="1.4"/>
          {T(208,132,"VD","middle","#fff",12)}
          {/* Valve tricuspide */}
          <line x1="150" y1="140" x2="176" y2="126" stroke={VALVE} strokeWidth="2.4"/>
          {/* Cavités GAUCHES : plus profondes */}
          <path d="M 100 186 Q 92 234 130 262 Q 168 240 168 192 Q 134 184 100 186 Z" fill={CAV_OG} opacity="0.9" stroke={STK_OG} strokeWidth="1.4"/>
          {T(128,224,"OG","middle","#fff",12)}
          <path d="M 180 172 Q 250 180 288 244 Q 240 278 186 260 Q 174 214 180 172 Z" fill={CAV_VG} opacity="0.92" stroke={STK_VG} strokeWidth="1.4"/>
          {T(232,224,"VG","middle","#fff",13)}
          {/* Valve mitrale */}
          <line x1="168" y1="196" x2="192" y2="188" stroke={VALVE} strokeWidth="2.4"/>
          {T(200,306,"④ Sous-costale 4 cavités","middle",muted,10,600)}
        </svg>,
        [
          { k:"Foie", v:"fenêtre acoustique — sonde sous la xiphoïde, patient jambes fléchies", c:"#D8C0A0" },
          { k:"Cavités droites", v:"les plus proches de la sonde", c:STK_VD },
          { k:"Péricarde", v:"coupe de choix pour l'épanchement et la tamponnade", c:"#F0E6C8" },
        ]
      )}
      {screen(
        <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%", height:"180px", display:"block" }} preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="240" fill="#14161E"/>
          <path d="M 24 26 Q 200 16 376 30 L 376 68 Q 200 58 24 62 Z" fill={FOIE} opacity="0.65" stroke={STK_FOIE} strokeWidth="1"/>
          {T(70,50,"foie","middle","#D8C0A0",10)}
          {/* Oreillette droite à gauche de l'image */}
          <path d="M 40 72 Q 104 68 118 118 Q 104 172 44 166 Q 28 118 40 72 Z" fill={CAV_OD} opacity="0.9" stroke={STK_OD} strokeWidth="1.4"/>
          {T(76,122,"OD","middle","#fff",12)}
          {/* VCI dans son grand axe */}
          <path d="M 116 104 Q 200 100 380 102 L 380 146 Q 200 144 116 140 Q 108 122 116 104 Z" fill="#3A5A7A" opacity="0.9" stroke="#5F8FBF" strokeWidth="1.4"/>
          {T(270,128,"VCI","middle","#fff",12)}
          {/* Veine sus-hépatique */}
          <path d="M 196 66 Q 206 88 210 100 L 190 100 Q 184 86 176 68 Z" fill="#3A5A7A" opacity="0.75" stroke="#5F8FBF" strokeWidth="1"/>
          {T(186,58,"v. sus-hép.","middle","#9FC5E8",8,600)}
          {/* Site de mesure : 1–2 cm de la jonction */}
          <line x1="168" y1="92" x2="168" y2="156" stroke="#FFD37A" strokeWidth="1.6" strokeDasharray="3 3"/>
          <line x1="160" y1="98" x2="176" y2="98" stroke="#FFD37A" strokeWidth="2"/>
          <line x1="160" y1="148" x2="176" y2="148" stroke="#FFD37A" strokeWidth="2"/>
          {T(168,176,"mesure à 1–2 cm de l'OD","middle","#FFD37A",9,700)}
          {T(200,225,"⑤ VCI en grand axe (sonde tournée en sagittal)","middle",muted,10,600)}
        </svg>,
        [
          { k:"VCI", v:"diamètre et variation respiratoire → estimation de la pression de l'OD", c:"#5F8FBF" },
          { k:"Mesure", v:"1 à 2 cm en amont de la jonction avec l'oreillette droite", c:"#FFD37A" },
        ]
      )}
    </div>
  );

  return null;
}

// ── IRM cardiaque ────────────────────────────────────────────────
function IRMContent({ go, step }) {
  const c = VALVES.irm.color;
  switch(step) {
    case "start": return (<div>
      <Info title="IRM cardiaque (CMR)" color={c}>
        Référence pour la caractérisation tissulaire myocardique et la mesure des volumes/FEVG (surtout si mauvaise fenêtre échographique). Combine ciné (fonction), séquences de perfusion, et caractérisation tissulaire (T1/T2, rehaussement tardif, ECV).
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Indications principales" color={c} onClick={()=>go("indic")}/>
        <Btn title="Séquences & ce qu'elles montrent" color={c} onClick={()=>go("seq")}/>
        <Btn title="Rehaussement tardif (LGE) : patterns" color={c} onClick={()=>go("lge")}/>
        <Btn title="Précautions & contre-indications" color={c} onClick={()=>go("ci")}/>
      </div>
    </div>);
    case "indic": return (<div>
      <Res title="Indications majeures" classe="CMR" color={c} icon="📋" items={[
        "Cardiomyopathies : caractérisation et diagnostic étiologique (CMH, CMD, amylose, sarcoïdose, Fabry, non-compaction)",
        "Myocardite : critères de Lake Louise (œdème + rehaussement tardif sous-épicardique)",
        "Viabilité myocardique avant revascularisation (LGE transmural = non viable)",
        "Recherche d'ischémie : IRM de stress (perfusion sous vasodilatateur)",
        "Quantification précise VG/VD et FEVG (référence, notamment mauvaise échogénicité)",
        "Bilan des masses cardiaques, péricardite/constriction, cardiopathies congénitales",
        "Aide à la stratification du risque rythmique (fibrose = substrat arythmogène)",
      ]}/>
    </div>);
    case "seq": return (<div>
      <Sec title="Séquences clés" color={c}/>
      <Table cols="1fr 1.7fr" rows={[
        ["Séquence","Ce qu'elle montre"],
        ["Ciné (SSFP)","Fonction, volumes, FEVG, cinétique segmentaire, valves"],
        ["T2 / T2 mapping","Œdème myocardique (inflammation aiguë, myocardite, IDM récent)"],
        ["T1 natif","↑ dans œdème, amylose, fibrose ; ↓ typiquement dans la maladie de Fabry (surcharge lipidique) et l'hémochromatose"],
        ["ECV (volume extracellulaire)","Fibrose interstitielle diffuse, infiltration (amylose : ECV très élevé)"],
        ["Perfusion de stress","Défaut de perfusion sous vasodilatateur = ischémie"],
        ["Rehaussement tardif (LGE)","Fibrose/nécrose focale — le pattern oriente l'étiologie"],
      ]}/>
    </div>);
    case "lge": return (<div>
      <Sec title="Patterns de rehaussement tardif (LGE)" color={c}/>
      <Table cols="1fr 1.7fr" rows={[
        ["Distribution","Orientation étiologique"],
        ["Sous-endocardique / transmural","Origine ISCHÉMIQUE (systématisé à un territoire coronaire)"],
        ["Sous-épicardique / intramural","Origine NON ischémique : myocardite, sarcoïdose"],
        ["Médio-mural (paroi latérale)","Cardiomyopathie dilatée, myocardite"],
        ["Point d'insertion VD + hypertrophie","CMH"],
        ["Diffus / sous-endocardique circonférentiel + difficulté à annuler le signal","Amylose"],
        ["Basal inférolatéral","Maladie de Fabry"],
      ]}/>
      <Info title="Intérêt pronostique" color={c}>
        La présence, l'étendue et le type de LGE ont une valeur pronostique (risque d'événements rythmiques et d'insuffisance cardiaque), et participent aux décisions (ex. défibrillateur en prévention primaire dans certaines cardiomyopathies).
      </Info>
    </div>);
    case "ci": return (<div>
      <Res title="Précautions" classe="Sécurité" color={c} icon="⚠️" items={[
        "Dispositifs : la plupart des pacemakers/défibrillateurs récents sont « IRM-compatibles » sous conditions ; vérifier systématiquement",
        "Gadolinium : prudence si insuffisance rénale sévère (DFG bas) — évaluer la balance bénéfice/risque",
        "Claustrophobie, incapacité à tenir l'apnée, arythmie rapide (dégrade la synchronisation)",
        "Corps étrangers métalliques intra-oculaires/cérébraux, certains implants",
      ]}/>
      <Info color={c}>Toujours confronter à la clinique et à l'échographie ; l'IRM complète mais ne remplace pas l'ETT de première intention.</Info>
    </div>);
    default: return null;
  }
}

// ── Scanner cardiaque / coroscanner ──────────────────────────────
// ── Cathétérisme cardiaque droit (Swan-Ganz) ─────────────────────
function CathDContent({ go, step }) {
  const c = VALVES.cathd.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Cathétérisme cardiaque droit (KTD / Swan-Ganz)" color={c}>
        Exploration hémodynamique invasive : une sonde à ballonnet est montée par voie veineuse (jugulaire, fémorale ou brachiale) et progresse OD → VD → artère pulmonaire → position « bloquée » (wedge). Mesure directe des pressions droites, du débit cardiaque et des saturations.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Indications" color={c} onClick={()=>go("indic")}/>
        <Btn title="Mesures & valeurs normales" color={c} onClick={()=>go("mesures")}/>
        <Btn title="Paramètres calculés (RVP, PAPi…)" color={c} onClick={()=>go("calc")}/>
        <Btn title="Profils & interprétation" color={c} onClick={()=>go("profils")}/>
      </div>
    </div>);
    case "indic": return (<div>
      <Res title="Indications principales" classe="KTD" color={c} icon="📋" items={[
        "Diagnostic et classification de l'hypertension pulmonaire (examen de CONFIRMATION indispensable — cf. HTAP)",
        "Test de vasoréactivité pulmonaire (HTAP groupe 1 : NO inhalé, réponse = baisse mPAP ≥ 10 mmHg jusqu'à < 40 avec débit conservé)",
        "Bilan pré-transplantation cardiaque : évaluer les résistances pulmonaires (HTAP fixée = risque pour le greffon)",
        "Choc / IC sévère : caractériser le profil hémodynamique quand la clinique et l'écho ne suffisent pas, guider les thérapeutiques",
        "Diagnostic différentiel constriction vs restriction (cf. péricarde), tamponnade",
        "Quantification des shunts (oxymétrie étagée = « shunt run »), bilan de valvulopathie complexe",
      ]}/>
      <Info title="À noter" color={c}>
        Le monitorage systématique par cathéter artériel pulmonaire n'a PAS montré de bénéfice en routine dans l'IC (essai ESCAPE) : l'indication doit être ciblée, pas systématique.
      </Info>
    </div>);
    case "mesures": return (<div>
      <Sec title="Valeurs normales — « règle des 5 »" color={c}/>
      <Table cols="1.5fr 1.2fr" rows={[
        ["Site / paramètre","Valeur normale"],
        ["Oreillette droite (POD, ≈ PVC)","2–6 mmHg"],
        ["Ventricule droit (VD)","15–25 / 3–8 mmHg (systole/diastole)"],
        ["Artère pulmonaire (PAP)","15–25 / 8–15 mmHg"],
        ["PAP moyenne (mPAP)","10–20 mmHg (HTP si > 20)"],
        ["Pression capillaire bloquée (PCWP/PAPO)","6–12 mmHg (≤ 15)"],
        ["Débit cardiaque (DC)","4–8 L/min"],
        ["Index cardiaque (IC)","2,5–4 L/min/m²"],
        ["SvO₂ (saturation veineuse mêlée, AP)","65–75 %"],
      ]}/>
      <Sec title="Mesure du débit cardiaque" color={c}/>
      <Res title="Deux méthodes" classe="DC" color={c} icon="📏" items={[
        "Thermodilution : injection de sérum froid dans l'OD, variation de température mesurée dans l'AP (moyenne de 3 mesures). Méthode courante ; PRÉFÉRÉE en cas d'insuffisance tricuspide non sévère et pour l'HTP",
        "Fick : DC = consommation d'O₂ / (différence artério-veineuse en O₂). Gold standard théorique ; PRÉFÉRÉE si insuffisance tricuspide sévère (thermodilution faussée)",
        "En cas de SHUNT intracardiaque : la thermodilution est ininterprétable → utiliser Fick + oxymétrie étagée",
      ]}/>
    </div>);
    case "calc": return (<div>
      <Sec title="Paramètres calculés" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Paramètre","Formule / repère"],
        ["RVP (résistances pulmonaires)","(mPAP − PCWP) / DC — normal < 2 UW (unités Wood)"],
        ["RVS (résistances systémiques)","(PAM − POD) / DC × 80 (dyn·s·cm⁻⁵)"],
        ["Gradient transpulmonaire (TPG)","mPAP − PCWP (élevé = maladie vasculaire pulmonaire)"],
        ["PAPi (indice de pulsatilité)","(PAPs − PAPd) / POD — normal > 2 ; < 1 = défaillance VD"],
        ["Rapport POD / PCWP","> 0,86 évocateur de dysfonction VD"],
      ]}/>
      <Info title="PAPi & fonction du VD" color={c}>
        Le PAPi est un marqueur puissant de défaillance ventriculaire droite (notamment après IDM du VD, ou pour décider d'une assistance droite). PAPi bas (&lt; 1) = mauvaise fonction VD. Une POD élevée avec PCWP normale/basse oriente aussi vers l'atteinte droite.
      </Info>
    </div>);
    case "profils": return (<div>
      <Sec title="Profils hémodynamiques typiques" color={c}/>
      <Table cols="1.2fr 1.7fr" rows={[
        ["Situation","Signature au KTD"],
        ["HTP pré-capillaire (groupe 1/3/4)","mPAP > 20, PCWP ≤ 15, RVP > 2 UW"],
        ["HTP post-capillaire (cœur gauche, gr. 2)","mPAP > 20, PCWP > 15 (RVP ≤ 2 = isolée ; > 2 = combinée)"],
        ["Choc cardiogénique","IC bas (< 2,2), PCWP élevée (> 18), RVS ↑, SvO₂ basse"],
        ["Choc hypovolémique","POD/PCWP basses, IC bas, RVS ↑"],
        ["Choc septique / vasoplégique","IC normal ou ↑, RVS effondrées, SvO₂ souvent ↑"],
        ["Défaillance VD / IDM du VD","POD élevée, POD/PCWP > 0,86, PAPi bas"],
        ["Tamponnade","Égalisation des pressions diastoliques (POD = PVD dias = PCWP)"],
        ["Péricardite constrictive","Égalisation + dip-plateau (« racine carrée ») du VD"],
      ]}/>
      <Res title="Analyse des saturations (shunt run)" classe="Shunt" color={c} icon="🩸" items={[
        "Prélèvements étagés VCS/VCI → OD → VD → AP",
        "Saut oxymétrique (« step-up ») = shunt gauche-droit (ex. CIA au niveau de l'OD, CIV au niveau du VD)",
        "SvO₂ basse globale = bas débit / extraction élevée ; SvO₂ haute = shunt ou état hyperkinétique/septique",
      ]}/>
      <Info title="En lien" color={c}>
        Voir HTAP (définition hémodynamique, 5 groupes), Choc cardiogénique & assistances, Péricarde (constriction vs restriction).
      </Info>
    </div>);
    default: return null;
  }
}

function ScannerContent({ go, step }) {
  const c = VALVES.scanner.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Scanner cardiaque & coroscanner" color={c}>
        Le coroscanner (CCTA) est devenu l'examen de 1ère intention pour EXCLURE une maladie coronaire (excellente valeur prédictive négative) chez les patients à probabilité faible à modérée (ESC 2024). Le score calcique (CAC) affine la stratification du risque.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Coroscanner (CCTA)" color={c} onClick={()=>go("ccta")}/>
        <Btn title="Score calcique (CAC)" color={c} onClick={()=>go("cac")}/>
        <Btn title="CAD-RADS & FFR-CT" color={c} onClick={()=>go("cadrads")}/>
        <Btn title="Scanner cardiaque (autres indications)" color={c} onClick={()=>go("other")}/>
      </div>
    </div>);
    case "ccta": return (<div>
      <Res title="Coroscanner (angioscanner coronaire)" classe="CCTA" color={c} icon="🫀" items={[
        "1ère intention pour EXCLURE une CAD obstructive (probabilité pré-test faible à modérée) — haute VPN",
        "Visualise la lumière ET la paroi (plaques, caractéristiques à haut risque)",
        "Évalue aussi les pontages, l'anatomie coronaire (anomalies de naissance), avant certaines procédures (TAVI, ablation FA)",
        "Nécessite un rythme lent et régulier (bêtabloquant souvent donné avant), apnée, produit de contraste iodé",
        "Limites : calcifications massives (score calcique très élevé) et stents peuvent gêner l'analyse de la lumière",
      ]}/>
      <Info title="Place ESC 2024 (angor stable)" color={c}>
        Préféré pour écarter une CAD et détecter une CAD non obstructive. L'imagerie fonctionnelle (IRM/écho de stress, PET) est préférée pour corréler symptômes et ischémie, notamment à probabilité plus élevée.
      </Info>
    </div>);
    case "cac": return (<div>
      <Res title="Score calcique coronaire (CAC, Agatston)" classe="CAC" color={c} icon="🧮" items={[
        "Scanner SANS injection : quantifie les calcifications coronaires",
        "CAC = 0 : très faible probabilité de CAD obstructive → peut permettre de différer d'autres examens",
        "Reclasse les patients à probabilité faible (5–15%) vers très faible risque (ESC 2024)",
        "Valeur pronostique forte (le score augmente avec la charge athéromateuse)",
      ]}/>
      <Table cols="1fr 1.4fr" rows={[
        ["Score d'Agatston","Interprétation"],
        ["0","Pas de calcification détectable"],
        ["1–99","Athérome léger"],
        ["100–399","Athérome modéré"],
        ["≥ 400","Athérome sévère / charge élevée"],
      ]}/>
      <Info color={c}>Un CAC très élevé (souvent &gt; 1000) peut rendre le coroscanner peu interprétable (blooming des calcifications).</Info>
    </div>);
    case "cadrads": return (<div>
      <Sec title="CAD-RADS (compte rendu standardisé)" color={c}/>
      <Table cols="0.7fr 1.6fr" rows={[
        ["CAD-RADS","Sténose maximale"],
        ["0","0% — pas de plaque"],
        ["1","1–24% — minime"],
        ["2","25–49% — légère"],
        ["3","50–69% — modérée"],
        ["4","70–99% (ou tronc commun ≥ 50%) — sévère"],
        ["5","100% — occlusion"],
        ["N","Non interprétable"],
      ]}/>
      <Sec title="FFR-CT" color={c}/>
      <Res title="Réserve de flux fractionnaire par scanner" classe="Fonctionnel" color={c} icon="📊" items={[
        "Ajoute une dimension FONCTIONNELLE au coroscanner (retentissement hémodynamique d'une sténose)",
        "Aide à décider d'une coronarographie/revascularisation pour les sténoses intermédiaires",
        "Évite des coronarographies inutiles quand la sténose n'est pas significative fonctionnellement",
      ]}/>
    </div>);
    case "other": return (<div>
      <Res title="Autres indications du scanner cardiaque" classe="TDM" color={c} icon="🩻" items={[
        "Bilan pré-TAVI (dimensions de l'anneau aortique, accès vasculaires)",
        "Bilan avant ablation de FA (anatomie de l'oreillette gauche et des veines pulmonaires)",
        "Recherche de thrombus de l'auricule gauche (alternative/complément à l'ETO)",
        "Évaluation des prothèses valvulaires (thrombose, pannus), endocardite (complications péri-annulaires)",
        "Anatomie des cardiopathies congénitales, péricarde (calcifications de constriction)",
        "Angioscanner aortique (dissection, anévrysme — cf. chapitre Aorte)",
      ]}/>
    </div>);
    default: return null;
  }
}

function ETTContent({ go, step }) {
  const c = VALVES.ett.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Échocardiographie transthoracique normale" color={c}>
        Valeurs de référence — Recommandations ASE/EACVI quantification des cavités (2015, en vigueur), strain (2015) et PRVG (ASE 2025)
      </Info>
      <Sec title="Choisir une catégorie" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Coupes échographiques standard" subtitle="Schémas annotés des principales coupes" color={c} onClick={()=>go("views")}/>
        <Btn title="Ventricule gauche" subtitle="Dimensions, volumes, masse, FEVG, GLS" color={c} onClick={()=>go("lv")}/>
        <Btn title="Ventricule droit" subtitle="Dimensions, TAPSE, FAC, S', volumes" color={c} onClick={()=>go("rv")}/>
        <Btn title="Oreillettes" subtitle="OG et OD — diamètres, volumes indexés, strain" color={c} onClick={()=>go("atria")}/>
        <Btn title="Pressions de remplissage VG (PRVG)" subtitle="Algorithme ASE 2025 — fonction diastolique" color={c} onClick={()=>go("prvg")}/>
        <Btn title="Aorte / CCVG / VCI" subtitle="Racine aortique, chambre de chasse, veine cave" color={c} onClick={()=>go("aorta")}/>
        <Btn title="Pressions pulmonaires" subtitle="PAPS, IT, temps d'accélération pulmonaire" color={c} onClick={()=>go("pap")}/>
        <Btn title="Doppler valvulaire normal" subtitle="Vitesses, gradients, ITV des 4 valves" color={c} onClick={()=>go("doppler")}/>
        <Btn title="Strain — déformation myocardique" subtitle="GLS segmentaire, courbe bull's-eye, strain OG" color={c} onClick={()=>go("strain")}/>
        <Btn title="Échographie de contraste" subtitle="Indications, produits, opacification" color={c} onClick={()=>go("contrast")}/>
        <Btn title="Foramen ovale perméable (FOP)" subtitle="Recherche, indications, fermeture" color={c} onClick={()=>go("fop")}/>
        <Btn title="Cardiopathies retrouvées à l'ETT" subtitle="Repères diagnostiques par grande pathologie" color={c} onClick={()=>go("findings")}/>
      </div>
    </div>);

    // ── Coupes échographiques ──
    case "views": return (<div>
      <Info title="Coupes échographiques standard" color={c}>
        Schémas anatomiques annotés des principales fenêtres acoustiques. Repères pour identifier les structures et orienter la sonde.
      </Info>
      <Sec title="Choisir une coupe" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="① Parasternale grand axe (PLAX)" subtitle="Grand axe — VG, aorte, OG, valves mitrale et aortique" color={c} onClick={()=>go("view_plax")}/>
        <Btn title="② Parasternale petit axe (PSAX)" subtitle="Petit axe — coupes étagées du VG" color={c} onClick={()=>go("view_psax")}/>
        <Btn title="③ Apicale 4 cavités (A4C)" subtitle="Les 4 cavités, septa, valves AV" color={c} onClick={()=>go("view_a4c")}/>
        <Btn title="④ Sous-costale" subtitle="4 cavités sous-costale + VCI" color={c} onClick={()=>go("view_sub")}/>
      </div>
      <Info title="Astuce" color={c}>
        Un examen ETT complet combine ces fenêtres (parasternale, apicale, sous-costale, suprasternale) pour visualiser chaque structure sous plusieurs angles et croiser les mesures.
      </Info>
    </div>);
    case "view_plax": return (<div>
      <Sec title="① Parasternale grand axe (PLAX)" color={c}/>
      <EchoDiagram view="plax"/>
      <Info title="Repères" color={c}>
        Sonde au 3ᵉ–4ᵉ EIC gauche, marqueur vers l'épaule droite. Visualise de haut en bas : VD, septum IV, VG, valve mitrale, OG en arrière, et l'aorte avec la valve aortique. Coupe de référence pour la mesure des diamètres VG (mode TM), de la racine aortique et de l'OG.
      </Info>
      <Res title="Structures visualisées" classe="PLAX" color={c} icon="🫀" items={[
        "Ventricule droit (antérieur, en haut)",
        "Septum interventriculaire et paroi postérieure du VG",
        "Valve mitrale (feuillets antérieur et postérieur)",
        "Chambre de chasse VG, valve aortique et aorte ascendante proximale",
        "Oreillette gauche (postérieure)",
      ]}/>
    </div>);
    case "view_psax": return (<div>
      <Sec title="② Parasternale petit axe (PSAX)" color={c}/>
      <EchoDiagram view="psax"/>
      <Info title="Repères" color={c}>
        À partir de la PLAX, rotation de la sonde de 90°. En inclinant la sonde, on obtient des coupes étagées : base (gros vaisseaux, valve aortique en « Mercedes »), valve mitrale (« bouche de poisson »), muscles piliers (niveau de référence pour la cinétique segmentaire), et apex.
      </Info>
      <Res title="Niveau des piliers (le plus utilisé)" classe="PSAX" color={c} icon="⭕" items={[
        "VG en coupe circulaire, avec les 2 muscles papillaires (antéro-latéral et postéro-médial)",
        "VD en croissant, accolé à la face antéro-latérale",
        "Évaluation de la cinétique segmentaire et de la symétrie de contraction",
      ]}/>
    </div>);
    case "view_a4c": return (<div>
      <Sec title="③ Apicale 4 cavités (A4C)" color={c}/>
      <EchoDiagram view="a4c"/>
      <Info title="Repères" color={c}>
        Sonde à l'apex (choc de pointe), marqueur vers la gauche du patient. Les ventricules sont en haut (apex au sommet), les oreillettes en bas. Coupe majeure pour la FEVG (Simpson biplan avec l'apicale 2 cavités), les valves mitrale et tricuspide, la fonction du VD et les 4 cavités.
      </Info>
      <Res title="Structures visualisées" classe="A4C" color={c} icon="🔍" items={[
        "VG (à droite de l'image) et VD (à gauche)",
        "OG et OD (en bas)",
        "Valve mitrale et valve tricuspide (insertion tricuspide plus apicale)",
        "Septum interventriculaire et interauriculaire",
        "Mesure de la FEVG, du TAPSE, de l'IT pour la PAPS",
      ]}/>
    </div>);
    case "view_sub": return (<div>
      <Sec title="④ Sous-costale" color={c}/>
      <EchoDiagram view="sub"/>
      <Info title="Repères" color={c}>
        Sonde sous l'appendice xiphoïde, le foie servant de fenêtre acoustique. Deux coupes complémentaires : les 4 cavités sous-costale (le foie est en haut, les cavités DROITES étant les plus proches de la sonde), puis, sonde tournée en sagittal, la VEINE CAVE INFÉRIEURE dans son grand axe se jetant dans l'OD.
      </Info>
      <Res title="Intérêts de la fenêtre sous-costale" classe="Repères" color={c} icon="🔍" items={[
        "4 cavités : épanchement péricardique, septum interauriculaire (CIA/FOP), utile quand la fenêtre parasternale/apicale est mauvaise (BPCO, ventilé)",
        "VCI (coupe sagittale dédiée) : diamètre + collapsus inspiratoire → estimation de la POD",
      ]}/>
      <Res title="Analyse de la VCI" classe="Volémie" color={c} icon="🫁" items={[
        "VCI ≤ 21 mm + collapsus > 50% → POD normale (~3 mmHg)",
        "VCI > 21 mm + collapsus < 50% → POD élevée (~15 mmHg)",
        "Intérêt : estimation de la PAPS (POD + gradient d'IT) et de l'état volémique",
      ]}/>
    </div>);

    // ── FOP ──
    case "fop": return (<div>
      <Info title="Foramen ovale perméable (FOP)" color={c}>
        Présent chez ~25% de la population générale, le FOP est le plus souvent bénin. Son intérêt clinique est la possibilité d'embolie paradoxale (shunt droit-gauche).
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Recherche & technique échographique" color={c} onClick={()=>go("fop_tech")}/>
        <Btn title="Indications de recherche d'un FOP" color={c} onClick={()=>go("fop_indic")}/>
        <Btn title="Critères de FOP à haut risque" color={c} onClick={()=>go("fop_risk")}/>
        <Btn title="Indications de fermeture" color={c} onClick={()=>go("fop_close")}/>
      </div>
    </div>);
    case "fop_tech": return (<div>
      <Sec title="Recherche d'un FOP en échographie" color={c}/>
      <Res title="Test aux microbulles (épreuve de contraste)" classe="Technique" color={c} icon="🫧" items={[
        "Injection IV de sérum physiologique agité (microbulles) au pli du coude",
        "Recherche du passage de bulles dans les cavités gauches (shunt droit-gauche)",
        "Manœuvre de Valsalva indispensable pour démasquer un shunt intermittent (relâchement au moment du retour veineux)",
        "Positivité : passage de bulles dans l'OG dans les 3 premiers cycles cardiaques (au-delà → évoque un shunt pulmonaire)",
      ]}/>
      <Sec title="ETT vs ETO" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Modalité","Place"],
        ["ETT + contraste","1ère intention, dépistage ; sensibilité améliorée par le 2ᵉ harmonique et le Valsalva"],
        ["ETO + contraste","Référence pour la caractérisation : visualise directement le tunnel, mesure le shunt, l'anévrysme du septum (ASIA), la valve d'Eustachi/réseau de Chiari"],
        ["Doppler transcrânien","Quantifie le shunt (comptage de HITS) mais ne localise pas (cardiaque vs pulmonaire)"],
      ]}/>
      <Info title="Quantification du shunt" color={c}>
        Le shunt est dit important si &gt; 20 microbulles passent dans l'OG (ou grade élevé au Doppler transcrânien). Un shunt important est un des critères de FOP à haut risque.
      </Info>
    </div>);
    case "fop_indic": return (<div>
      <Sec title="Quand rechercher un FOP ?" color={c}/>
      <Res title="Indications principales" classe="Contexte" color={c} icon="📋" items={[
        "AVC / AIT cryptogénique, en particulier chez le sujet jeune (< 60 ans) après bilan étiologique complet négatif",
        "Suspicion d'embolie paradoxale (événement embolique systémique sans source cardiaque gauche identifiée, contexte de MTEV)",
        "Syndrome platypnée-orthodéoxie (dyspnée/désaturation en position debout, corrigées en décubitus)",
        "Accidents de décompression chez le plongeur (contexte spécialisé)",
        "Bilan avant certaines procédures / migraine avec aura : indication non consensuelle, au cas par cas",
      ]}/>
      <Info title="Prérequis avant d'imputer un FOP" color={c}>
        Le FOP étant présent chez 1 personne sur 4, sa découverte n'est pas synonyme de causalité. Il faut d'abord un bilan d'AVC complet excluant les autres causes (fibrillation atriale — Holter prolongé, athérome, dissection, état d'hypercoagulabilité, autre source cardio-embolique).
      </Info>
    </div>);
    case "fop_risk": return (<div>
      <Sec title="Critères anatomiques/physiologiques de FOP à haut risque" color={c}/>
      <Res title="Éléments renforçant l'imputabilité (embolie paradoxale probable)" classe="Haut risque" color="#EB5757" icon="🚩" items={[
        "Shunt droit-gauche important (> 20 microbulles dans l'OG) ou spontané (sans Valsalva)",
        "Anévrysme du septum interauriculaire (ASIA) : excursion ≥ 10 mm de part et d'autre du plan septal",
        "Grande taille / tunnel long du FOP",
        "Présence d'une valve d'Eustachi proéminente ou d'un réseau de Chiari (dirige le flux vers le septum)",
        "Hypermobilité du septum interauriculaire",
      ]}/>
      <Sec title="Aide à la décision" color={c}/>
      <Res title="Scores RoPE et PASCAL" classe="Stratification" color={c} icon="🧮" items={[
        "Score RoPE : estime la probabilité que le FOP soit la cause de l'AVC (score élevé = sujet jeune, sans FRCV → imputabilité forte)",
        "Classification PASCAL : combine le score RoPE et les caractéristiques anatomiques à haut risque (shunt important, ASIA)",
        "Objectif : sélectionner les patients chez qui la fermeture apporte un bénéfice",
      ]}/>
    </div>);
    case "fop_close": return (<div>
      <Info title="Fermeture percutanée du FOP" color={c}>
        Quatre grands essais ont démontré la supériorité de la fermeture percutanée + antiplaquettaire sur le traitement médical seul pour prévenir la récidive d'AVC cryptogénique bien sélectionné.
      </Info>
      <Res title="Indication retenue (post-AVC cryptogénique)" classe="Recommandation" color="#27AE60" icon="🔒" items={[
        "Patient de 18 à 60 ans (souvent élargi jusqu'à ~60 ans selon les recommandations)",
        "AVC ischémique cryptogénique confirmé après bilan étiologique complet",
        "FOP jugé responsable (haut risque : shunt important et/ou ASIA), imputabilité étayée par RoPE/PASCAL",
        "Décision prise en concertation neurologue ↔ cardiologue (Heart-Brain Team)",
        "Fermeture associée à un traitement antiplaquettaire ; réduit le risque de récidive d'AVC",
      ]}/>
      <Res title="Situations où la fermeture n'est PAS indiquée" classe="Limites" color="#EB5757" icon="⛔" items={[
        "Prévention primaire : aucune indication en l'absence d'événement neurologique (découverte fortuite)",
        "Autre cause d'AVC identifiée (notamment FA → anticoagulation)",
        "Contre-indication anatomique ou comorbidités limitant le bénéfice",
      ]}/>
      <Info title="Complications à connaître" color={c}>
        Fibrillation atriale de novo (souvent transitoire, post-procédure), thrombose du dispositif, épanchement péricardique, shunt résiduel. Bénéfice/risque à peser individuellement.
      </Info>
    </div>);

    // ── VG ──
    case "lv": return (<div>
      <Sec title="Dimensions et volumes VG (indexés BSA)" color={c}/>
      <Table cols="1.6fr 1fr 1fr" rows={[
        ["Paramètre","Homme","Femme"],
        ["DTDVG","4,2–5,9 cm","3,9–5,3 cm"],
        ["DTSVG","2,5–4,0 cm","2,2–3,5 cm"],
        ["VTDVGi","34–74 mL/m²","29–61 mL/m²"],
        ["VTSVGi","11–31 mL/m²","8–24 mL/m²"],
        ["Épaisseur septum/paroi post.","0,6–1,0 cm","0,6–0,9 cm"],
        ["Masse VG indexée","49–115 g/m²","43–95 g/m²"],
        ["Masse VG / surface corporelle","88 g/m² (H) max","67 g/m² (F) max — alt. indexation"],
      ]}/>
      <Sec title="Géométrie ventriculaire (épaisseur relative de paroi)" color={c}/>
      <Table cols="1.4fr 1fr 1.2fr" rows={[
        ["Profil","RWT","Masse VG"],
        ["Normal","≤ 0,42","Normale"],
        ["Remodelage concentrique","> 0,42","Normale"],
        ["Hypertrophie concentrique","> 0,42","Augmentée"],
        ["Hypertrophie excentrique","≤ 0,42","Augmentée"],
      ]}/>
      <Info color={c}>RWT (relative wall thickness) = (2 × épaisseur paroi postérieure) / DTDVG.</Info>
      <Sec title="Fonction systolique VG" color={c}/>
      <Table cols="1.6fr 1fr 1fr" rows={[
        ["Paramètre","Normal","Anormal si"],
        ["FEVG (Simpson biplan)","≥ 52% (H) / ≥ 54% (F)","< 50%"],
        ["Fraction de raccourcissement","25–43%","< 25%"],
        ["Strain longitudinal global (GLS)","≤ −18% (valeur absolue)","> −16%"],
        ["dP/dt (IM associée)","≥ 1200 mmHg/s","< 1200 mmHg/s = dysfonction"],
      ]}/>
      <Info color={c}>FEVG 50–52% (H) / 50–54% (F) = zone grise, "FEVG liminale" — pertinent en IM/IAo (seuils d'intervention).</Info>
      <Info title="GLS — intérêt clinique" color={c}>
        Plus reproductible et plus sensible que la FEVG pour détecter une dysfonction subclinique précoce (cardiotoxicité, IM/IAo asymptomatique, amylose). Variation inter-vendeur possible — privilégier le suivi avec le même échographe/logiciel chez un même patient.
      </Info>
    </div>);

    // ── VD ──
    case "rv": return (<div>
      <Sec title="Dimensions VD" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Paramètre","Normal"],
        ["Diamètre basal VD (4C)","2,5–4,1 cm"],
        ["Diamètre médian VD","1,9–3,5 cm"],
        ["Longueur VD (base-apex)","6,1–8,9 cm"],
        ["Épaisseur paroi libre VD","≤ 0,5 cm"],
        ["RVOT proximal (PSAX)","2,1–3,5 cm"],
      ]}/>
      <Sec title="Fonction systolique VD" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Paramètre","Normal (seuil dysfonction)"],
        ["TAPSE","> 17 mm"],
        ["FAC (Fractional Area Change)","> 35%"],
        ["S' DTI annulaire tricuspide","> 9,5 cm/s"],
        ["RIMP (indice de Tei)","< 0,40 (pulsé) / < 0,55 (DTI)"],
        ["Strain longitudinal paroi libre VD","≤ −20%"],
      ]}/>
      <Info title="Volumes 3D (si disponibles)" color={c}>
        VTDVDi : ≤ 87 mL/m² (H) / ≤ 74 mL/m² (F) · VTSVDi : ≤ 44 mL/m² (H) / ≤ 36 mL/m² (F)
      </Info>
    </div>);

    // ── Oreillettes ──
    case "atria": return (<div>
      <Sec title="Oreillette gauche" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Paramètre","Normal"],
        ["Diamètre OG (PSLA)","2,7–3,8 cm (H) / 2,3–3,4 cm (F)"],
        ["Volume OG indexé (LAVI)","16–34 mL/m²"],
        ["LAVI — seuil PRVG élevée","> 34 mL/m²"],
      ]}/>
      <Sec title="Strain de l'OG (LARS — 3 phases)" color={c}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Phase / paramètre","Valeur normale"],
        ["Strain réservoir (LASr)","> 38–40%"],
        ["Strain conduit (LAScd)","≈ 23%"],
        ["Strain contractile (LASct)","≈ 17%"],
        ["Seuil PRVG élevée (LASr)","≤ 18%"],
      ]}/>
      <Info color={c}>Le strain réservoir (LASr) est le paramètre le plus robuste et le plus utilisé en pratique — reflète la compliance OG pendant la systole VG. Mesuré par speckle-tracking, moins dépendant de la géométrie que le LAVI.</Info>
      <Sec title="Oreillette droite" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Paramètre","Normal"],
        ["Diamètre OD (4C)","2,9–4,5 cm"],
        ["Volume OD indexé","≤ 33 mL/m² (H) / ≤ 27 mL/m² (F)"],
      ]}/>
      <Info color={c}>LAVI {'>'} 34 mL/m² = remodelage atriale chronique — marqueur clé du PRVG et facteur de risque en IM/RM (cf. algorithmes valvulaires).</Info>
    </div>);

    // ── PRVG (ASE 2025) ──
    case "prvg": return (<div>
      <Info title="Nouveauté ASE 2025 — algorithme structuré en 2 étapes" color={c}>
        Étape 1 : identifier une relaxation myocardique altérée. Étape 2 : rechercher des marqueurs de PRVG élevée et de remodelage.
      </Info>
      <Sec title="Étape 1 — Relaxation myocardique" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Paramètre","Relaxation altérée si"],
        ["e' moyen (septal+latéral)/2","≤ 6,5 cm/s"],
        ["e' septal seul","≤ 6 cm/s"],
        ["e' latéral seul","≤ 7 cm/s"],
      ]}/>
      <Sec title="Étape 2 — Marqueurs de PRVG élevée" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Paramètre","Anormal si"],
        ["E/e' moyen","> 14"],
        ["LAVI","> 34 mL/m²"],
        ["E/A","≤ 0,8 ou ≥ 2"],
        ["Strain réservoir OG (LARS)","≤ 18%"],
        ["Vitesse IT (pic)","> 2,8 m/s"],
      ]}/>
      <Info color={c}>
        Diagnostic de dysfonction diastolique = relaxation altérée (étape 1) + au moins 1 marqueur positif (étape 2). LARS est le nouvel apport majeur 2025, plus sensible que le LAVI seul pour détecter une PRVG élevée précoce.
      </Info>
      <Info title="Cas particulier — MAC (calcification annulaire mitrale) modérée à sévère" color={c}>
        E/A &lt; 0,8 → PRVG normale · E/A &gt; 1,8 → PRVG élevée · E/A 0,8–1,8 → mesurer IVRT (≥ 80 ms = normal, &lt; 80 ms = élevée)
      </Info>
    </div>);

    // ── Aorte / CCVG / VCI ──
    case "aorta": return (<div>
      <Sec title="Racine aortique (indexée BSA si jeune)" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Segment","Normal (adulte)"],
        ["Anneau aortique","2,0–3,1 cm"],
        ["Sinus de Valsalva","2,9–4,5 cm (H) / 2,6–4,0 cm (F)"],
        ["Jonction sino-tubulaire","2,2–3,6 cm"],
        ["Aorte ascendante tubulaire","2,1–3,4 cm"],
      ]}/>
      <Sec title="Chambre de chasse VG (CCVG)" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Paramètre","Normal"],
        ["Diamètre CCVG","1,8–2,4 cm"],
        ["ITV CCVG","18–22 cm"],
        ["VES (volume éjection)","60–100 mL"],
      ]}/>
      <Sec title="Veine cave inférieure" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Paramètre","Normal"],
        ["Diamètre VCI","≤ 2,1 cm"],
        ["Collapsibilité inspiratoire","> 50%"],
        ["POD estimée si normal","0–5 mmHg"],
      ]}/>
    </div>);

    // ── Pressions pulmonaires ──
    case "pap": return (<div>
      <Sec title="Estimation des pressions pulmonaires" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Paramètre","Normal / seuil"],
        ["Vitesse pic IT","≤ 2,8 m/s"],
        ["PAPS (Bernoulli + POD)","< 36 mmHg"],
        ["Temps accélération pulmonaire (TAP)","> 105 ms"],
        ["Notch méso-systolique RVOT","Absent si normal"],
      ]}/>
      <Info color={c}>
        PAPS = 4×(Vmax IT)² + POD estimée (VCI). Probabilité d'HTAP : faible si Vmax IT ≤ 2,8 m/s sans signe indirect ; intermédiaire 2,9–3,4 m/s ; élevée si &gt; 3,4 m/s ou signes indirects associés (ESC/ERS).
      </Info>
    </div>);

    // ── Doppler valvulaire normal ──
    case "doppler": return (<div>
      <Info title="Mesures Doppler — principe général" color={c}>
        Vitesse maximale (Vmax) en Doppler continu (CW) pour les valves sténosantes potentielles ; ITV (intégrale temps-vitesse) pour les calculs de débit/surface par équation de continuité.
      </Info>
      <Sec title="Valve aortique" color={c}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Paramètre","Normal"],
        ["Vitesse maximale (Vmax Ao)","≤ 1,7 m/s (souvent ~1,0–1,5 m/s)"],
        ["Gradient moyen","< 5 mmHg"],
        ["ITV CCVG / ITV Ao (ratio)","≥ 0,5 si normal (sténose si < 0,25 sévère)"],
      ]}/>
      <Sec title="Valve mitrale" color={c}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Paramètre","Normal"],
        ["Onde E (remplissage précoce)","0,6–1,3 m/s (décroît avec l'âge)"],
        ["Onde A (contraction atriale)","Variable selon âge"],
        ["Rapport E/A","0,8–2 (dépend fortement de l'âge)"],
        ["Gradient moyen","< 5 mmHg"],
        ["Surface mitrale (PHT ou planimétrie)","4–6 cm²"],
      ]}/>
      <Sec title="Valve tricuspide" color={c}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Paramètre","Normal"],
        ["Vitesse maximale (Vmax IT)","≤ 2,8 m/s (au repos, en l'absence d'HTAP)"],
        ["Gradient moyen","< 5 mmHg"],
        ["IT physiologique (fuite minime)","Très fréquente, considérée normale"],
      ]}/>
      <Sec title="Valve pulmonaire" color={c}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Paramètre","Normal"],
        ["Vitesse maximale","0,6–0,9 m/s"],
        ["Gradient maximal","< 10 mmHg"],
        ["Temps d'accélération (TAP)","> 105 ms"],
      ]}/>
      <Info title="Rappel — équation de continuité (surface aortique)" color={c}>
        Surface Ao = (Surface CCVG × ITV CCVG) / ITV Ao. Nécessite une mesure précise du diamètre CCVG (source d'erreur la plus fréquente, élevée au carré dans le calcul).
      </Info>
    </div>);

    // ── Strain / déformation myocardique ──
    case "strain": return (<div>
      <Info title="Speckle-tracking — principe" color={c}>
        Suivi des marqueurs acoustiques naturels du myocarde sur le cycle cardiaque, indépendant de l'angle Doppler. Le GLS (Global Longitudinal Strain) est le paramètre le plus validé en pratique clinique courante.
      </Info>
      <Sec title="GLS — valeurs normales par segmentation" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Paramètre","Normal (valeur absolue)"],
        ["GLS global VG","≤ −18% (souvent −19 à −22%)"],
        ["Gradient base-apex","Apex plus négatif que la base (physiologique)"],
        ["Seuil de dysfonction subclinique","> −16%"],
        ["Variation considérée significative au suivi","> 15% relatif (ex. cardiotoxicité chimiothérapie)"],
      ]}/>
      <Info color={c}>Représentation classique en "bull's-eye" (carte polaire 17 segments) — permet de repérer une atteinte régionale (ex. apex épargné dans l'amylose : "apical sparing").</Info>
      <Sec title="Strain VD (paroi libre)" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Paramètre","Normal (valeur absolue)"],
        ["Strain longitudinal paroi libre VD","≤ −20%"],
        ["Strain 4 segments VD (paroi libre + septum)","≤ −18%"],
      ]}/>
      <Sec title="Strain de l'OG" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Phase","Valeur normale"],
        ["Réservoir (LASr)","> 38–40%"],
        ["Conduit (LAScd)","≈ 23%"],
        ["Contractile (LASct)","≈ 17%"],
      ]}/>
      <Info title="Applications cliniques principales" color={c}>
        Dépistage précoce de cardiotoxicité (anthracyclines, trastuzumab), évaluation préopératoire en IM/IAo asymptomatique avec FEVG préservée, suspicion d'amylose cardiaque (apical sparing pattern), évaluation pronostique post-IDM.
      </Info>
    </div>);

    // ── Échographie de contraste ──
    case "contrast": return (<div>
      <Info title="Principe" color={c}>
        Microbulles de gaz (hexafluorure de soufre ou perflutren) restant strictement intravasculaires, rehaussant le signal Doppler/2D — produit de contraste ultrasonore, non néphrotoxique, non iodé.
      </Info>
      <Sec title="Indications principales (Classe I/IIa)" color={c}/>
      <div style={{ background:CARD, borderRadius:8, padding:"10px 13px", border:`1px solid ${BDR}` }}>
        <ul style={{ margin:0, paddingLeft:16, color:MUT, fontSize:12 }}>
          <li>Mauvaise échogénicité — opacification des bords endocardiques pour mesure fiable de la FEVG (≥ 2 segments non visualisés)</li>
          <li>Recherche de thrombus apical du VG (différenciation trabéculation vs thrombus)</li>
          <li>Caractérisation de masse intracardiaque (vascularisée = tumeur, avasculaire = thrombus)</li>
          <li>Optimisation du Doppler spectral en cas de signal de mauvaise qualité</li>
          <li>Échocardiographie de stress sous mauvaise échogénicité</li>
        </ul>
      </div>
      <Sec title="Produits disponibles" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Nom commercial","Composition"],
        ["SonoVue","Hexafluorure de soufre"],
        ["Luminity / Definity","Perflutren"],
      ]}/>
      <Info title="Contre-indications" color="#EB5757">
        Shunt droit-gauche connu (risque de passage systémique direct), hypertension pulmonaire sévère non contrôlée, syndrome de détresse respiratoire aiguë, antécédent de réaction allergique au produit. Précaution chez la femme enceinte/allaitante (données limitées).
      </Info>
      <Info color={c}>L'utilisation de produit de contraste n'est pas systématique — réservée aux situations où l'échogénicité native est insuffisante pour une interprétation fiable.</Info>
    </div>);

    // ── Cardiopathies retrouvées à l'ETT ──
    case "findings": return (<div>
      <Info title="Repères diagnostiques rapides" color={c}>
        Cette rubrique synthétise, par grande pathologie, les signes échocardiographiques caractéristiques permettant de l'évoquer — sans remplacer les algorithmes décisionnels dédiés de chaque chapitre.
      </Info>
      <Sec title="Choisir une catégorie" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Valvulopathies" subtitle="Repères rapides RAC, IM, RM, IAo, IT" color={c} onClick={()=>go("find_valve")}/>
        <Btn title="Cardiomyopathies" subtitle="CMH, CMD, CMR/amylose, ACM" color={c} onClick={()=>go("find_cmp")}/>
        <Btn title="Insuffisance cardiaque" subtitle="ICFEr, ICFEp — éléments échographiques clés" color={c} onClick={()=>go("find_ic")}/>
        <Btn title="Endocardite / masses" subtitle="Végétations, abcès, thrombus, tumeurs" color={c} onClick={()=>go("find_endo")}/>
        <Btn title="Péricarde / HTAP / cœur pulmonaire" subtitle="Épanchement, tamponnade, constriction" color={c} onClick={()=>go("find_other")}/>
      </div>
    </div>);
    case "find_valve": return (<div>
      <Sec title="Valvulopathies — repères échographiques" color={c}/>
      <Table cols="0.8fr 1.8fr" rows={[
        ["Pathologie","Signes évocateurs à l'ETT"],
        ["RAC","Valve calcifiée remaniée, Vmax Ao ↑, gradient moyen ↑, surface ↓ (planimétrie/continuité), ratio ITV CCVG/ITV Ao abaissé"],
        ["IAo","Jet de régurgitation diastolique en Doppler couleur, vena contracta, PHT raccourci si sévère, flux holodiastolique rétrograde dans l'aorte descendante"],
        ["IM","Jet systolique dans l'OG, vena contracta, ondes E élevée (flux mitral), dilatation OG/VG si chronique sévère, anomalie de l'appareil sous-valvulaire (prolapsus, rupture de cordage)"],
        ["RM","Épaississement/fusion commissurale, mouvement diastolique en dôme, surface mitrale ↓ (planimétrie/PHT), score de Wilkins, dilatation OG"],
        ["IT","Dilatation de l'anneau tricuspide, jet de régurgitation en Doppler couleur dans l'OD, dilatation VD/OD si sévère et chronique"],
      ]}/>
      <Info color={c}>Pour les algorithmes décisionnels complets (sévérité, indications opératoires), se référer au chapitre Valvulopathies.</Info>
    </div>);
    case "find_cmp": return (<div>
      <Sec title="Cardiomyopathies — repères échographiques" color={c}/>
      <Table cols="0.8fr 1.8fr" rows={[
        ["Pathologie","Signes évocateurs à l'ETT"],
        ["CMH","Épaisseur pariétale VG ≥ 15 mm (asymétrique septale typique), SAM mitral, gradient CCVG dynamique, OG dilatée, fonction systolique souvent hyperkinétique"],
        ["CMD","Dilatation VG, FEVG abaissée, géométrie sphérique (RWT bas), souvent IM fonctionnelle associée par dilatation annulaire"],
        ["CMR / amylose","Volumes VG normaux/petits, parois épaissies avec aspect granité scintillant, fonction diastolique très restrictive, GLS avec 'apical sparing', dilatation biatriale marquée"],
        ["ACM/DAVD","Dilatation et dysfonction VD prédominante, akinésie segmentaire VD, anévrysmes de la paroi libre VD, atteinte VG possible dans les formes biventriculaires"],
      ]}/>
      <Info color={c}>L'IRM cardiaque reste l'examen de caractérisation tissulaire de référence — l'ETT oriente et alerte mais ne pose pas le diagnostic étiologique final.</Info>
      <SeeAlso items={[{ label:"Cardiomyopathies", icon:"🫀", color:"#A267D9", target:{ kind:"chapter", chapterKey:"cmp" } }]}/>
    </div>);
    case "find_ic": return (<div>
      <Sec title="Insuffisance cardiaque — éléments échographiques clés" color={c}/>
      <Table cols="0.9fr 1.7fr" rows={[
        ["Phénotype","Éléments échographiques"],
        ["ICFEr","FEVG ≤ 40%, dilatation VG fréquente, élévation possible des pressions de remplissage (E/e' élevé)"],
        ["ICFElr","FEVG 41–49%, profil souvent intermédiaire entre ICFEr et ICFEp"],
        ["ICFEp","FEVG ≥ 50% + anomalie structurelle (LAVI > 34 mL/m², LVMI ↑) et/ou fonctionnelle (E/e' élevé) — cf. score HFA-PEFF"],
      ]}/>
      <Info color={c}>Cf. rubriques PRVG et Oreillettes de ce chapitre pour le détail des seuils, et le chapitre Insuffisance Cardiaque pour la prise en charge complète.</Info>
    </div>);
    case "find_endo": return (<div>
      <Sec title="Endocardite et masses intracardiaques" color={c}/>
      <Table cols="0.9fr 1.7fr" rows={[
        ["Élément","Signes évocateurs"],
        ["Végétation","Masse mobile échogène appendue à une valve, dans le sens du flux, mouvement chaotique indépendant"],
        ["Abcès périannulaire","Zone hypoéchogène/anéchogène épaississant l'anneau valvulaire, parfois cavité avec flux Doppler (faux anévrysme)"],
        ["Désinsertion de prothèse","Mouvement de bascule anormal ('rocking'), fuite périprothétique nouvelle"],
        ["Thrombus","Masse avasculaire au contraste, souvent apical VG, contexte de dysfonction VG/FA"],
        ["Tumeur (myxome typiquement)","Masse pédiculée, le plus souvent dans l'OG attachée au septum interatrial, vascularisée au contraste"],
      ]}/>
      <Info color={c}>L'ETO est souvent nécessaire pour confirmer/caractériser ces lésions, en particulier sur prothèse valvulaire.</Info>
      <SeeAlso items={[{ label:"Endocardite infectieuse", icon:"🦠", color:"#00966A", target:{ kind:"chapter", chapterKey:"endo" } }]}/>
    </div>);
    case "find_other": return (<div>
      <Sec title="Péricarde et cœur pulmonaire" color={c}/>
      <Table cols="0.9fr 1.7fr" rows={[
        ["Pathologie","Signes évocateurs à l'ETT"],
        ["Épanchement péricardique","Espace anéchogène entre péricarde viscéral et pariétal, quantifié en faible/modéré/abondant"],
        ["Tamponnade","Collapsus diastolique VD, swing cardiaque, variation respiratoire exagérée des flux mitral/tricuspide (> 25%), VCI dilatée non compliante"],
        ["Péricardite constrictive","Septum 'bondissant' (septal bounce), variation respiratoire des flux, péricarde épaissi, VCI dilatée"],
        ["Cœur pulmonaire / HTAP","Dilatation et dysfonction VD, septum aplati en D (surcharge de pression), Vmax IT élevée — cf. rubrique Pressions pulmonaires"],
      ]}/>
    </div>);

    default: return null;
  }
}

// ── ETO normale — Vues et valeurs de référence ───────────────────
function ETOContent({ go, step }) {
  const c = VALVES.eto.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Échocardiographie transœsophagienne normale" color={c}>
        Vues standard, indications principales et repères de mesure — complément ou alternative à l'ETT selon le contexte clinique
      </Info>
      <Sec title="Choisir une catégorie" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Indications principales" subtitle="Quand préférer l'ETO à l'ETT" color={c} onClick={()=>go("indications")}/>
        <Btn title="Vues standard" subtitle="Coupes de référence et structures explorées" color={c} onClick={()=>go("views")}/>
        <Btn title="Mesures et repères normaux" subtitle="OG/auricule, septum, valve mitrale, aorte" color={c} onClick={()=>go("measures")}/>
        <Btn title="Contre-indications et préparation" subtitle="Précautions avant l'examen" color={c} onClick={()=>go("contraindications")}/>
      </div>
    </div>);
    case "indications": return (<div>
      <Res title="Indications principales" classe="Classe I" level="B" color="#27AE60" icon="🎯" items={[
        "Recherche de thrombus de l'auricule gauche avant cardioversion ou ablation de FA",
        "Suspicion d'endocardite infectieuse, en particulier sur prothèse valvulaire ou ETT non concluante",
        "Évaluation précise des valvulopathies mitrales (mécanisme de l'IM, planimétrie du RM) avant chirurgie/intervention percutanée",
        "Recherche de source cardio-embolique (AVC/AIT inexpliqué) — auricule gauche, septum interatrial, arc aortique",
        "Guidage peropératoire ou interprocédural (TAVI, fermeture de FOP/auricule, MitraClip)",
        "Suspicion de dissection aortique (en alternative ou complément au scanner selon le contexte)",
        "Échogénicité ETT insuffisante chez un patient nécessitant une évaluation cardiaque précise",
      ]}/>
    </div>);
    case "views": return (<div>
      <Sec title="Vues standard de référence (recommandations ASE)" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Vue","Structures principalement explorées"],
        ["4 cavités œsophagienne moyenne (0°)","VG, VD, valves mitrale et tricuspide, septum interventriculaire"],
        ["Petit axe valve aortique (30–60°)","Valve aortique en vue 'en mercedes', septum interatrial, auricule gauche"],
        ["Grand axe valve aortique (120–140°)","CCVG, valve aortique, racine aortique, valve mitrale"],
        ["Bicommissurale mitrale (60–70°)","Valve mitrale, appareil sous-valvulaire, festons (A1-A2-A3/P1-P2-P3)"],
        ["Auricule gauche (0–90°, multi-angles)","Auricule gauche — recherche de thrombus, flux Doppler"],
        ["Œsophagienne basse / transgastrique","VG en coupe petit axe, fonction systolique segmentaire"],
        ["Arc aortique et aorte descendante","Recherche de plaque, dissection, athérome emboligène"],
      ]}/>
      <Info color={c}>L'examen complet associe systématiquement les approches œsophagiennes hautes, moyennes et transgastriques pour une exploration exhaustive des 4 cavités et des gros vaisseaux.</Info>
    </div>);
    case "measures": return (<div>
      <Sec title="Repères de mesure normaux" color={c}/>
      <Table cols="1.4fr 1.6fr" rows={[
        ["Structure","Repère normal"],
        ["Auricule gauche","Vitesse de vidange auriculaire normale > 40 cm/s ; absence de contraste spontané ou de thrombus"],
        ["Septum interatrial","Continu, sans anévrysme ni shunt visible en Doppler couleur ; épreuve aux microbulles si suspicion de FOP"],
        ["Valve mitrale","Festons bien individualisés (A1-A3/P1-P3), coaptation normale sans prolapsus"],
        ["Valve aortique","Tricuspide, ouverture symétrique en 'mercedes', sans épaississement significatif"],
        ["Aorte thoracique","Paroi régulière, sans plaque ni image de dissection (flap intimal)"],
      ]}/>
      <Info color={c}>Pour les valeurs quantitatives détaillées (volumes, FEVG, Doppler), se référer aux rubriques du chapitre ETT normale — les principes de quantification restent les mêmes, l'ETO offrant une meilleure résolution pour certaines structures (OG, valve mitrale, aorte).</Info>
    </div>);
    case "contraindications": return (<div>
      <Res title="Contre-indications" classe="À vérifier" color="#EB5757" icon="⚠️" items={[
        "Pathologie œsophagienne connue : sténose, varices, diverticule, tumeur, antécédent de chirurgie œsophagienne",
        "Perforation digestive haute suspectée",
        "Trouble de la coagulation non corrigé (relatif, à discuter selon l'urgence)",
        "Instabilité hémodynamique ou respiratoire non contrôlée (relatif)",
      ]}/>
      <Info title="Préparation" color={c}>
        Jeûne recommandé (typiquement ≥ 4–6h), anesthésie locale pharyngée ± sédation consciente selon protocole local, surveillance de la saturation et de la conscience pendant et après l'examen.
      </Info>
    </div>);
    default: return null;
  }
}
// ── IC — Diagnostic ─────────────────────────────────────────────
function ICDiagContent({ go, step }) {
  const c = IC_TOPICS.diag.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Définition (ESC 2021)" color={c}>
        Syndrome clinique : symptômes typiques (dyspnée, fatigue, œdèmes) ± signes (crépitants, turgescence jugulaire, œdèmes) causés par une anomalie cardiaque structurelle et/ou fonctionnelle, avec élévation des pressions de remplissage et/ou débit cardiaque inadéquat au repos/effort.
      </Info>
      <Sec title="Étape 1 — Probabilité clinique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Symptômes/signes évocateurs + antécédent CV" subtitle="Dyspnée d'effort, ATCD IDM/HTA, anomalie ECG" color={c} onClick={()=>go("biomarker")}/>
        <Btn title="Présentation atypique ou doute diagnostique" color={c} onClick={()=>go("biomarker")}/>
      </div>
    </div>);
    case "biomarker": return (<div>
      <Sec title="Étape 2 — Peptides natriurétiques" color={c}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Seuil (non aigu/ambulatoire)","Valeur"],
        ["NT-proBNP","≥ 125 pg/mL"],
        ["BNP","≥ 35 pg/mL"],
      ]}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Seuil (aigu/urgences)","Valeur"],
        ["NT-proBNP","≥ 300 pg/mL"],
        ["BNP","≥ 100 pg/mL"],
      ]}/>
      <Info title="Facteurs confondants" color={c}>
        FA, âge avancé, IRC augmentent les NP. Obésité les diminue. Un NP normal n'exclut pas formellement l'IC en présence de forte suspicion clinique.
      </Info>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="NP élevés ou forte suspicion clinique" color={c} onClick={()=>go("echo")}/>
        <Btn title="NP normaux + faible suspicion" color="#27AE60" onClick={()=>go("excl")}/>
      </div>
    </div>);
    case "excl": return <Res title="IC peu probable" color="#27AE60" icon="✅" items={["Rechercher diagnostic différentiel (pneumopathie, anémie, BPCO...)","Réévaluer si évolution clinique"]}/>;
    case "echo": return (<div>
      <Sec title="Étape 3 — Échocardiographie : classification par FEVG" color={c}/>
      <Table cols="1.3fr 1fr 1.6fr" rows={[
        ["Phénotype","FEVG","Critère additionnel"],
        ["ICFEr","≤ 40%","—"],
        ["ICFElr","41–49%","—"],
        ["ICFEp","≥ 50%","Anomalie structurelle/fonctionnelle + NP élevés"],
      ]}/>
      <Info color={c}>Pour ICFElr et ICFEp : nécessite preuve objective d'anomalie cardiaque structurelle (LAVI &gt; 34 mL/m², LVMI augmenté) et/ou fonctionnelle (E/e' élevé) en plus des NP élevés — cf. chapitre ETT normale pour les valeurs de référence et l'algorithme PRVG.</Info>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="FEVG ≤ 40% → ICFEr" color="#E85D4A" onClick={()=>go("to_hfref")}/>
        <Btn title="FEVG 41–49% → ICFElr" color="#C26A1C" onClick={()=>go("to_hfmref")}/>
        <Btn title="FEVG ≥ 50% → ICFEp probable" color="#B5790F" onClick={()=>go("hfa_peff")}/>
      </div>
    </div>);
    case "to_hfref":  return <Res title="→ Voir chapitre ICFEr" color="#E85D4A" icon="➡️" items={["Quadrithérapie GDMT — 4 piliers","Retour au hub IC pour accéder à l'algorithme complet"]}/>;
    case "to_hfmref": return <Res title="→ Voir chapitre ICFElr" color="#C26A1C" icon="➡️" items={["Profil intermédiaire, traitement proche de l'ICFEr","Retour au hub IC pour accéder à l'algorithme complet"]}/>;
    case "hfa_peff": return (<div>
      <Info title="Score HFA-PEFF (si doute diagnostique persistant)" color={c}>
        Score 0–1 : ICFEp peu probable · Score 2–4 : zone grise (test d'effort/cathétérisme) · Score 5–6 : ICFEp confirmée
      </Info>
      <Table cols="1fr 1.3fr 1.3fr" rows={[
        ["Domaine","Critère majeur (2 pts)","Critère mineur (1 pt)"],
        ["Fonctionnel","E/e' moyen ≥ 15 ; e' septal < 7 ou latéral < 10 cm/s ; Vit. IT > 2,8 m/s","E/e' 9–14 ; GLS < 16%"],
        ["Morphologique","LAVI > 34 mL/m² ; LVMI ↑ (H≥149/F≥122 g/m²)","LAVI 29–34 ; paroi VG ≥ 12mm"],
        ["Biomarqueur","NT-proBNP > 220 pg/mL (RS)","NT-proBNP 125–220 pg/mL"],
      ]}/>
      <Info color={c}>Seuils NT-proBNP doublés si fibrillation atriale (NP majoré par la FA elle-même).</Info>
      <Res title="→ Voir chapitre ICFEp" color="#B5790F" icon="➡️" items={["Si score ≥ 5 : traitement ICFEp","Si zone grise 2–4 : échographie d'effort ou cathétérisme"]}/>
    </div>);
    default: return null;
  }
}

// ── IC — ICFEr (FEVG ≤ 40%) ─────────────────────────────────────
function ICHFrEFContent({ go, step }) {
  const c = IC_TOPICS.hfref.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Les 4 piliers — ESC 2021 + Focused Update 2023" color={c}>
        IEC/ARNI · Bêtabloquant · ARM (antagoniste minéralocorticoïde) · iSGLT2 — à introduire en parallèle/rapidement, pas nécessairement séquentiel.
      </Info>
      <Sec title="Situation clinique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="🆕 IC de novo / ambulatoire stable" color={c} onClick={()=>go("pillars")}/>
        <Btn title="Hospitalisé pour IC aiguë décompensée" color="#EB5757" onClick={()=>go("strong_hf")}/>
        <Btn title="Symptômes persistants malgré 4 piliers" color="#C26A1C" onClick={()=>go("residual")}/>
      </div>
    </div>);
    case "pillars": return (<div>
      <Sec title="Les 4 piliers — Classe I niveau A (tous)" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Classe","Molécules de référence"],
        ["ARNI (préféré)","Sacubitril/valsartan"],
        ["IEC (si ARNI non dispo)","Ramipril, périndopril, énalapril"],
        ["Bêtabloquant","Bisoprolol, carvédilol, métoprolol succinate, nébivolol"],
        ["ARM","Éplérénone, spironolactone"],
        ["iSGLT2","Dapagliflozine, empagliflozine"],
      ]}/>
      <Info title="Stratégie d'introduction" color={c}>
        Introduire les 4 classes le plus rapidement possible (semaines), en parallèle si toléré, plutôt que séquentiellement. iSGLT2 n'a pas d'effet hémodynamique aigu → peut être démarré précocement même en intra-hospitalier.
      </Info>
      <Arr color={c}/>
      <Res title="Réévaluation à 3–6 mois" classe="Classe I" level="C" color="#27AE60" icon="🔄" items={["Échographie de contrôle : FEVG améliorée ?","Si FEVG > 40% avec amélioration ≥ 10 points → ICFE améliorée (HFimpEF)","Poursuivre les 4 piliers même si FEVG normalisée (TRED-HF)"]}/>
    </div>);
    case "strong_hf": return (<div>
      <Info title="Stratégie 'high-intensity care' (STRONG-HF, ESC 2023)" color="#EB5757">
        Optimisation rapide avant sortie + suivi rapproché (6 semaines) réduit réhospitalisations/décès de 34%.
      </Info>
      <Res title="Introduction/titration rapide avant sortie" classe="Classe I" level="B" color="#27AE60" icon="🏥" items={["Objectif : 50% des doses cibles avant sortie","100% des doses cibles à 2 semaines post-sortie","Consultations rapprochées : J7, J14, J42","Surveillance : iono, fonction rénale, PA, FC, NP"]}/>
    </div>);
    case "residual": return (<div>
      <Sec title="Thérapies additionnelles selon phénotype" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Rythme sinusal + FC ≥ 70 bpm malgré BB max toléré" color={c} onClick={()=>go("ivabradine")}/>
        <Btn title="Origine ischémique + élargissement QRS ≥ 130 ms" color={c} onClick={()=>go("crt_link")}/>
        <Btn title="Carence martiale (ferritine < 100 ou 100–299 + CST < 20%)" color={c} onClick={()=>go("iron")}/>
        <Btn title="Symptômes NYHA II–IV persistants, origine non ischémique" color={c} onClick={()=>go("vericiguat_arni")}/>
      </div>
    </div>);
    case "ivabradine": return <Res title="Ivabradine à envisager" classe="Classe IIa" level="B" color="#C26A1C" icon="💊" items={["Rythme sinusal, FC ≥ 70 bpm, FEVG ≤ 35%","Malgré dose maximale tolérée de bêtabloquant","Réduction hospitalisations pour IC (SHIFT)"]}/>;
    case "crt_link": return <Res title="→ Voir chapitre Dispositifs (CRT)" color="#A267D9" icon="➡️" items={["Resynchronisation cardiaque selon morphologie QRS (BBG vs non-BBG)","Retour au hub IC pour accéder à l'algorithme dispositifs"]}/>;
    case "iron": return <Res title="Fer IV (carboxymaltose/dérisomaltose ferrique)" classe="Classe IIa" level="A" color="#C26A1C" icon="🩸" items={["Réduction des réhospitalisations pour IC (AFFIRM-AHF, IRONMAN)","Pas de bénéfice mortalité formellement démontré","Réévaluer statut martial tous les 3–6 mois"]}/>;
    case "vericiguat_arni": return (<div>
      <Res title="Vericiguat à envisager" classe="Classe IIb" level="B" color="#F2C94C" icon="💊" items={["Aggravation récente d'IC malgré GDMT optimal","Stimulateur de la guanylate cyclase soluble"]}/>
      <div style={{marginTop:8}}>
      <Res title="Digoxine à envisager" classe="Classe IIb" level="B" color="#F2C94C" icon="💊" items={["Rythme sinusal symptomatique malgré GDMT","Réduit hospitalisations, pas d'effet mortalité"]}/>
      </div>
    </div>);
    default: return null;
  }
}

// ── IC — ICFElr (41–49%) ────────────────────────────────────────
function ICHFmrEFContent({ go, step }) {
  const c = IC_TOPICS.hfmref.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Profil intermédiaire" color={c}>
        Phénotype hétérogène, plus proche de l'ICFEr pour la physiopathologie (forte prévalence de coronaropathie). Le niveau de preuve est moins robuste qu'en ICFEr (sous-groupes d'essais).
      </Info>
      <Sec title="Traitement" color={c}/>
      <Table cols="1.4fr 1fr 1fr" rows={[
        ["Classe","Recommandation","Niveau"],
        ["iSGLT2 (dapa/empagliflozine)","Classe I","A"],
        ["Diurétiques si congestion","Classe I","C"],
        ["IEC/ARNI","Classe IIb","C"],
        ["Bêtabloquant","Classe IIb","C"],
        ["ARM","Classe IIb","C"],
      ]}/>
      <Info color={c}>iSGLT2 = seule classe avec recommandation forte (DELIVER incluait FEVG ≥ 40%). Les autres piliers de l'ICFEr peuvent être envisagés au cas par cas, en particulier si FEVG proche de 40% ou antécédent d'ICFEr améliorée.</Info>
    </div>);
    default: return null;
  }
}

// ── IC — ICFEp (≥ 50%) ──────────────────────────────────────────
function ICHFpEFContent({ go, step }) {
  const c = IC_TOPICS.hfpef.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Profil très hétérogène" color={c}>
        Rechercher systématiquement une étiologie spécifique traitable : amylose cardiaque, valvulopathie, HTAP, cardiomyopathie hypertrophique, péricardite constrictive.
      </Info>
      <Sec title="Traitement de fond" color={c}/>
      <Table cols="1.6fr 1fr 1fr" rows={[
        ["Classe","Recommandation","Niveau"],
        ["iSGLT2 (dapa/empagliflozine)","Classe I","A"],
        ["Diurétiques si congestion","Classe I","C"],
        ["Finérénone (FK chronique diabétique)","Classe IIa","B"],
      ]}/>
      <Info title="Évolution depuis 2021 — DELIVER et FINEARTS-HF" color={c}>
        iSGLT2 efficaces sur tout le spectre de FEVG (DELIVER 2022). Finérénone (ARM non stéroïdien) montre un bénéfice en ICFEp/ICFElr (FINEARTS-HF 2024) — intégré dans les mises à jour 2025 mais pas encore Classe I ESC formelle.
      </Info>
      <Sec title="Comorbidités à traiter systématiquement" color={c}/>
      <div style={{ background:CARD, borderRadius:8, padding:"10px 13px", border:`1px solid ${BDR}` }}>
        <ul style={{ margin:0, paddingLeft:16, color:MUT, fontSize:11 }}>
          <li>HTA — contrôle tensionnel strict</li>
          <li>FA — anticoagulation + contrôle du rythme/fréquence</li>
          <li>Obésité — perte de poids (agonistes GLP-1 à l'étude, STEP-HFpEF)</li>
          <li>Carence martiale — fer IV si critères présents</li>
          <li>Apnée du sommeil — dépistage et traitement</li>
        </ul>
      </div>
    </div>);
    default: return null;
  }
}

// ── IC — Aiguë ───────────────────────────────────────────────────
function ICAigueContent({ go, step }) {
  const c = IC_TOPICS.aigue.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Évaluation initiale immédiate" color={c}>
        2 axes cliniques simultanés : (1) Congestion — sec vs humide ; (2) Perfusion périphérique — chaud vs froid.
      </Info>
      <Sec title="Profil hémodynamique (clinique au lit du patient)" color={c}/>
      <Table cols="1fr 1fr 1fr" rows={[
        ["","Sec (pas de congestion)","Humide (congestion)"],
        ["Chaud (bien perfusé)","Normal","Profil le + fréquent (chaud-humide)"],
        ["Froid (mal perfusé)","Hypoperfusion isolée","Choc cardiogénique"],
      ]}/>
      <Sec title="Profil identifié" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="🟢 Chaud et humide (le plus fréquent — 70%)" color="#27AE60" onClick={()=>go("warm_wet")}/>
        <Btn title="Froid et humide" color="#1684A8" onClick={()=>go("cold_wet")}/>
        <Btn title="Froid et sec / choc cardiogénique" color="#EB5757" onClick={()=>go("cardiogenic")}/>
      </div>
    </div>);
    case "warm_wet": return (<div>
      <Res title="Diurétiques de l'anse IV" classe="Classe I" level="C" color="#27AE60" icon="💧" items={["Furosémide IV (bolus ou perfusion continue)","Dose ≥ dose orale habituelle si déjà sous diurétique","Réévaluer la diurèse à 2–6h (objectif : Na+ urinaire > 50–70 mmol/L à 2h)"]}/>
      <Arr color={c}/>
      <Info title="Si réponse diurétique insuffisante" color={c}>
        Doubler la dose de furosémide IV, ou association séquentielle (thiazidique) — étude ADVOR : acétazolamide en add-on accélère la décongestion sans bénéfice sur mortalité.
      </Info>
      <Res title="Vasodilatateurs si PAS > 110 mmHg" classe="Classe IIb" level="B" color="#F2C94C" icon="💉" items={["Dérivés nitrés IV si congestion + PA conservée","Soulagement symptomatique de la dyspnée"]}/>
    </div>);
    case "cold_wet": return (<div>
      <Res title="Diurétiques + évaluation de la perfusion" classe="Classe I" level="C" color="#27AE60" icon="💧" items={["Diurétiques IV comme ci-dessus","Si PAS < 90 mmHg : envisager inotrope"]}/>
      <Res title="Inotrope à envisager" classe="Classe IIb" level="C" color="#F2C94C" icon="💉" items={["Dobutamine ou lévosimendan si hypoperfusion + PAS basse","Lévosimendan préféré si patient sous bêtabloquant chronique"]}/>
    </div>);
    case "cardiogenic": return (<div>
      <Info title="Urgence vitale" color="#EB5757">
        Hypoperfusion sévère (extrémités froides, oligurie, confusion, lactates élevés) avec ou sans hypotension.
      </Info>
      <Res title="Prise en charge urgence cardiogénique" classe="Classe I" level="C" color="#EB5757" icon="🚨" items={["Coronarographie en urgence si IDM en cause (Classe I)","Inotropes/vasopresseurs (noradrénaline si choc)","Évaluer assistance circulatoire mécanique (ECMO, Impella) si réfractaire","Transfert centre expert avec USIC + chirurgie cardiaque","Éviter surcharge volémique"]}/>
    </div>);
    default: return null;
  }
}

// ── IC — Dispositifs (CRT / DAI) ────────────────────────────────
function ICDeviceContent({ go, step }) {
  const c = IC_TOPICS.device.color;
  switch(step) {
    case "start": return (<div>
      <Sec title="Type de dispositif ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="DAI (prévention mort subite)" color={c} onClick={()=>go("icd")}/>
        <Btn title="CRT (resynchronisation)" color={c} onClick={()=>go("crt")}/>
      </div>
    </div>);
    case "icd": return (<div>
      <Sec title="Prévention secondaire" color={c}/>
      <Res title="DAI indiqué" classe="Classe I" level="A" color="#27AE60" icon="⚡" items={["Survivant d'arrêt cardiaque par FV/TV sans cause réversible","Espérance de vie > 1 an en bon état fonctionnel"]}/>
      <Arr color={c}/>
      <Sec title="Prévention primaire" color={c}/>
      <Res title="DAI à envisager" classe="Classe I" level="A" color="#27AE60" icon="⚡" items={["FEVG ≤ 35% malgré ≥ 3 mois de GDMT optimal","Origine ischémique, NYHA II–III","Espérance de vie > 1 an en bon état fonctionnel"]}/>
      <Res title="DAI — origine non ischémique" classe="Classe I" level="B" color="#27AE60" icon="⚡" items={["FEVG ≤ 35% malgré GDMT optimal, NYHA II–III","Cardiomyopathie dilatée non ischémique"]}/>
      <Info title="Délai d'attente" color={c}>
        Attendre ≥ 3–6 mois après revascularisation (post-IDM) ou optimisation GDMT avant réévaluation FEVG — la fonction VG peut récupérer.
      </Info>
    </div>);
    case "crt": return (<div>
      <Info title="Critère commun à toutes les indications" color={c}>
        FEVG ≤ 35% + rythme sinusal + GDMT optimal ≥ 3 mois + espérance de vie {'>'} 1 an
      </Info>
      <Sec title="Morphologie QRS" color={c}/>
      <Table cols="1.3fr 1fr 1fr 1fr" rows={[
        ["Morphologie","QRS 130–149ms","QRS ≥ 150ms",""],
        ["BBG (bloc branche G)","Classe IIa","Classe I",""],
        ["Non-BBG","Classe IIb","Classe IIa",""],
      ]}/>
      <Info color={c}>BBG + QRS ≥ 150 ms = profil avec le bénéfice le plus robuste (réduction mortalité et hospitalisations). Plus le QRS est large et plus la morphologie est BBG typique, plus la réponse à la CRT est favorable.</Info>
      <Res title="CRT — indications particulières" classe="Classe I/IIa" level="B" color="#C26A1C" icon="🔄" items={["FA + indication d'ablation du nœud AV + FEVG ≤ 35% (Classe IIa)","Upgrade d'un stimulateur conventionnel si % stimulation VD élevé + FEVG dégradée (Classe IIa)"]}/>
    </div>);
    default: return null;
  }
}

// ── Cardiopathie ischémique — SCA ST+ (STEMI) ───────────────────
function SCAContent({ go, step }) {
  const c = ISCHEMIC_TOPICS.sca.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Définition STEMI" color={c}>
        Douleur thoracique ischémique persistante + sus-décalage ST ≥ 1 mm (2 dérivations contiguës, ≥ 2 mm en V2-V3 chez l'homme &lt; 40 ans / ≥ 1,5 mm chez la femme) ou équivalent (BBG nouveau, sus-décalage isolé aVR).
      </Info>
      <Sec title="Délai depuis premier contact médical (PCM)" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="PCI primaire possible ≤ 120 min" subtitle="Centre avec salle de cathétérisme disponible" color={c} onClick={()=>go("ppci")}/>
        <Btn title="⏱️ PCI primaire impossible ≤ 120 min" subtitle="Délai de transfert trop long" color="#EB5757" onClick={()=>go("fibrinolysis")}/>
      </div>
    </div>);
    case "ppci": return (<div>
      <Res title="Angioplastie primaire (PPCI)" classe="Classe I" level="A" color="#27AE60" icon="🏥" items={["Objectif : PCM → guide-fil ≤ 60 min si présentation directe en centre PCI","Objectif : PCM → guide-fil ≤ 90 min si transfert","Voie radiale privilégiée (Classe I, niveau A)","Traiter la lésion coupable en premier"]}/>
      <Arr color={c}/>
      <Sec title="Atteinte multitronculaire ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Lésions non coupables significatives" color={c} onClick={()=>go("multivessel")}/>
        <Btn title="Choc cardiogénique associé" color="#EB5757" onClick={()=>go("shock")}/>
      </div>
    </div>);
    case "multivessel": return <Res title="Revascularisation complète à envisager" classe="Classe I" level="A" color="#27AE60" icon="🔧" items={["PCI des lésions non coupables significatives recommandée","Peut être réalisée pendant la procédure index ou avant la sortie (Classe I)","Évaluation FFR/iFR pour les sténoses intermédiaires non coupables","Réduction réinfarctus et revascularisations itératives (COMPLETE)"]}/>;
    case "shock": return <Res title="PCI de la lésion coupable uniquement" classe="Classe III" level="B" color="#EB5757" icon="⚠️" items={["PCI systématique des lésions non coupables NON recommandée en choc (CULPRIT-SHOCK)","Traiter uniquement la lésion coupable en phase aiguë","Assistance circulatoire à discuter si état réfractaire","Réévaluer lésions non coupables à distance si stabilisation"]}/>;
    case "fibrinolysis": return (<div>
      <Res title="Fibrinolyse" classe="Classe I" level="A" color="#C26A1C" icon="💉" items={["Si délai symptômes ≤ 12h et PPCI impossible ≤ 120 min","Idéalement administrée ≤ 10 min après diagnostic (préhospitalier)","Ténectéplase préférée (bolus unique, demi-dose si ≥ 75 ans)"]}/>
      <Sec title="Posologie — Ténectéplase (Métalyse), bolus IV unique 5–10 sec" color={c}/>
      <Table cols="1.2fr 1fr 1fr" rows={[
        ["Poids","Dose standard (< 75 ans)","Dose ≥ 75 ans (demi-dose)"],
        ["< 60 kg","30 mg (6 mL)","15 mg (3 mL)"],
        ["60–69 kg","35 mg (7 mL)","17,5 mg (3,5 mL)"],
        ["70–79 kg","40 mg (8 mL)","20 mg (4 mL)"],
        ["80–89 kg","45 mg (9 mL)","22,5 mg (4,5 mL)"],
        ["≥ 90 kg","50 mg (10 mL) — dose max","25 mg (5 mL)"],
      ]}/>
      <Info title="STREAM-2 (2024) — demi-dose ≥ 75 ans" color={c}>
        Réduit le risque d'hémorragie intracrânienne sans perte d'efficacité chez le sujet âgé. Dose maximale absolue : 50 mg (standard) / 25 mg (demi-dose). Seule la ténectéplase (Métalyse) est utilisée en pratique en France pour le STEMI ; l'altéplase (Actilyse) reste réservée à d'autres indications (AVC, EP).
      </Info>
      <Sec title="Traitements associés à la fibrinolyse" color={c}/>
      <Table cols="1.2fr 0.8fr 1.6fr" rows={[
        ["DCI","Nom commercial","Posologie"],
        ["Aspirine","Kardégic","150–300 mg PO (ou 75–250 mg IV) puis 75–100 mg/j à vie"],
        ["Clopidogrel","Plavix","Dose de charge 300 mg si ≤ 75 ans (75 mg si ≥ 75 ans), puis 75 mg/j"],
        ["Énoxaparine","Lovenox","Bolus IV 30 mg (omis si ≥ 75 ans) puis 100 UI/kg (1 mg/kg) SC/12h (75 UI/kg si ≥75 ans)"],
      ]}/>
      <Info title="Contre-indications absolues à la fibrinolyse" color="#EB5757">
        AVC hémorragique ou d'origine indéterminée quel que soit le délai · AVC ischémique &lt; 6 mois · Néoplasie ou malformation vasculaire cérébrale · Traumatisme crânien/chirurgie majeure récente (&lt; 3 semaines) · Hémorragie digestive &lt; 1 mois · Trouble de l'hémostase connu · Dissection aortique · Ponction non compressible (biopsie hépatique, PL) &lt; 24h
      </Info>
      <Arr color={c}/>
      <Sec title="Évaluation post-fibrinolyse (60–90 min)" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Critères de reperfusion présents" subtitle="Résolution ST > 50%, disparition douleur" color="#27AE60" onClick={()=>go("success_fibrino")}/>
        <Btn title="Échec de reperfusion" color="#EB5757" onClick={()=>go("rescue_pci")}/>
      </div>
    </div>);
    case "success_fibrino": return <Res title="Coronarographie systématique différée" classe="Classe I" level="A" color="#27AE60" icon="🔍" items={["Angiographie de routine entre 2h et 24h après fibrinolyse réussie","Ne pas différer au-delà de 24h","Pharmaco-invasive strategy"]}/>;
    case "rescue_pci": return <Res title="PCI de sauvetage immédiate" classe="Classe I" level="A" color="#EB5757" icon="🚨" items={["Angiographie + PCI en urgence dès suspicion d'échec","Ne pas attendre, ne pas re-fibrinolyser"]}/>;
    default: return null;
  }
}

// ── Cardiopathie ischémique — SCA NST (NSTEMI/angor instable) ───
function NSTEContent({ go, step }) {
  const c = ISCHEMIC_TOPICS.nste.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Algorithme troponine hs 0h/1h (ou 0h/2h)" color={c}>
        Dosage troponine ultrasensible à l'admission puis à 1h (ou 2h). Permet rule-in/rule-out rapide du NSTEMI selon valeur absolue + delta.
      </Info>
      <Sec title="Stratification du risque" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Très haut risque" subtitle="Instabilité hémodynamique, choc, douleur réfractaire, arythmie ventriculaire, complication mécanique" color="#EB5757" onClick={()=>go("very_high")}/>
        <Btn title="🟠 Haut risque" subtitle="NSTEMI confirmé (rise/fall troponine), modif ST-T dynamiques, score GRACE > 140" color="#C26A1C" onClick={()=>go("high_risk")}/>
        <Btn title="🟡 Risque faible/intermédiaire" subtitle="Troponine normale, pas de critère de haut risque" color="#B5790F" onClick={()=>go("low_risk")}/>
      </div>
    </div>);
    case "very_high": return <Res title="Stratégie invasive immédiate" classe="Classe I" level="C" color="#EB5757" icon="🚨" items={["Coronarographie < 2h, comme un STEMI","Instabilité hémodynamique, arrêt cardiaque ressuscité, choc cardiogénique","Angor réfractaire au traitement médical","Complications mécaniques (IM aiguë, CIV post-IDM)","Arythmies ventriculaires menaçantes"]}/>;
    case "high_risk": return <Res title="Stratégie invasive précoce" classe="Classe I" level="A" color="#C26A1C" icon="🏥" items={["Coronarographie dans les 24h suivant l'admission","NSTEMI confirmé biologiquement (Classe I)","Score GRACE > 140 ou critère de haut risque","Évaluation FFR/iFR si lésion intermédiaire"]}/>;
    case "low_risk": return (<div>
      <Res title="Stratégie sélective / différée" classe="Classe I" level="A" color="#B5790F" icon="🔍" items={["Pas d'indication d'angiographie systématique urgente","Évaluation non invasive de l'ischémie si doute diagnostique (test d'effort, écho stress, coroscanner)","Réévaluer si récidive symptomatique"]}/>
      <Info color={c}>Score GRACE permet d'affiner le risque : disponible en ligne, intègre âge, FC, PA, créatinine, classe Killip, arrêt cardiaque, ST déviation, troponine.</Info>
    </div>);
    default: return null;
  }
}

// ── Cardiopathie ischémique — Syndrome coronarien chronique ─────
// ── Tests d'ischémie & de viabilité (guider la revascularisation) ─
function TestsContent({ go, step }) {
  const c = ISCHEMIC_TOPICS.tests.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Guider une revascularisation NON urgente" color={c}>
        Hors SCA, on ne revascularise pas sur la seule anatomie : il faut démontrer une ischémie et/ou une viabilité. Deux questions : (1) la sténose est-elle ischémiante ? (2) le myocarde en aval est-il viable (récupérable) ?
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="FFR / iFR (mesure invasive)" subtitle="Le juge de paix de la sténose intermédiaire" color={c} onClick={()=>go("ffr")}/>
        <Btn title="Tests d'ischémie non invasifs" subtitle="Écho de stress, SPECT, PET, IRM, ECG d'effort" color={c} onClick={()=>go("ischemia")}/>
        <Btn title="Tests de viabilité" subtitle="Myocarde hibernant / sidéré vs nécrosé" color={c} onClick={()=>go("viability")}/>
        <Btn title="Comparatif & comment choisir" color={c} onClick={()=>go("compare")}/>
      </div>
    </div>);
    case "ffr": return (<div>
      <Info title="FFR — Fractional Flow Reserve" color={c}>
        Mesure INVASIVE (pendant la coronarographie) du retentissement fonctionnel d'une sténose. Rapport pression distale / pression aortique en HYPERÉMIE maximale (adénosine IV 140 µg/kg/min ou bolus intracoronaire).
      </Info>
      <Res title="Seuils & interprétation" classe="FFR" color={c} icon="🎯" items={[
        "FFR ≤ 0,80 = sténose ISCHÉMIANTE → revascularisation bénéfique",
        "FFR > 0,80 = non significative → traitement médical (revasculariser n'apporte pas de bénéfice, essais DEFER/FAME)",
        "FFR = 1,0 dans une artère normale ; plus la valeur baisse, plus la sténose est significative",
        "Précision ~90% pour détecter une ischémie sur sténose intermédiaire (40–70%)",
        "Indication reine : sténose intermédiaire à l'angiographie, ou pluritronculaire (guider quelles lésions traiter — FAME)",
      ]}/>
      <Sec title="iFR / RFR (indices non hyperémiques)" color={c}/>
      <Res title="Sans adénosine" classe="iFR / RFR" color={c} icon="🩸" items={[
        "Mesurés au repos (pas besoin d'hyperémie → pas d'adénosine, plus rapide, mieux toléré)",
        "Seuil d'ischémie : iFR / RFR ≤ 0,89",
        "Non-infériorité vs FFR démontrée (DEFINE-FLAIR, iFR-SWEDEHEART) pour guider la revascularisation",
        "Discordance FFR/iFR dans ~15–20% des cas (FA = facteur de discordance)",
      ]}/>
      <Res title="Forces & limites de la FFR" classe="Bilan" color={c} icon="⚖️" items={[
        "Standard de référence lésion par lésion, spécifique, guide précisément le geste, valeur pronostique",
        "Évite de traiter des lésions non significatives (meilleur pronostic que la revascularisation systématique)",
        "Invasive, coût du guide de pression, effets de l'adénosine (dyspnée, BAV transitoire, bronchospasme)",
        "Fiabilité limitée en cas de microcirculation altérée, sténose très serrée évidente, ou contexte aigu (myocarde sidéré)",
        "Alternative non invasive : FFR-CT (calculée sur le coroscanner — cf. Imagerie)",
      ]}/>
    </div>);
    case "ischemia": return (<div>
      <Sec title="Tests d'ischémie non invasifs" color={c}/>
      <Res title="ECG d'effort" classe="Fonctionnel" color={c} icon="🏃" items={[
        "Simple, peu coûteux, disponible, évalue capacité d'effort/symptômes/rythme/TA",
        "Sensibilité/spécificité modestes ; ininterprétable si ECG de base anormal (BBG, pacé, WPW) ou incapacité à l'effort",
        "ESC 2024 : rôle réduit pour le diagnostic, garde une valeur pour la tolérance d'effort et le pronostic",
      ]}/>
      <Res title="Échocardiographie de stress (effort ou dobutamine)" classe="Fonctionnel" color={c} icon="🫀" items={[
        "Pas d'irradiation, disponible, évalue la cinétique segmentaire (trouble = ischémie), les valves, la réserve contractile",
        "Opérateur-dépendante, fenêtre acoustique, moins sensible sur atteinte tritronculaire équilibrée",
      ]}/>
      <Res title="Scintigraphie de perfusion (SPECT)" classe="Fonctionnel" color={c} icon="☢️" items={[
        "Bonne sensibilité, quantifie l'étendue de l'ischémie (valeur pronostique), reproductible",
        "Irradiation, atténuation (artefacts diaphragme/sein), moins bon en atteinte équilibrée tritronculaire",
      ]}/>
      <Res title="PET de perfusion" classe="Fonctionnel" color={c} icon="✨" items={[
        "Référence quantitative : mesure du flux myocardique absolu et de la réserve coronaire (détecte l'atteinte microvasculaire et tritronculaire)",
        "Disponibilité limitée, coût, irradiation (faible)",
      ]}/>
      <Res title="IRM de stress (perfusion sous vasodilatateur)" classe="Fonctionnel" color={c} icon="🧲" items={[
        "Haute résolution, pas d'irradiation, couple ischémie + fonction + viabilité (LGE) dans le même examen",
        "Disponibilité, durée, contre-indications (certains dispositifs), gadolinium si IR sévère",
      ]}/>
      <Info title="Principe ESC" color={c}>
        L'imagerie fonctionnelle est préférée pour corréler symptômes et ischémie (surtout probabilité intermédiaire-élevée). Le choix dépend de la disponibilité, de l'expertise locale et du patient. Plus l'ischémie est étendue, plus le bénéfice potentiel de la revascularisation est important.
      </Info>
    </div>);
    case "viability": return (<div>
      <Info title="Viabilité myocardique" color={c}>
        En cas de dysfonction VG sur cardiopathie ischémique, chercher un myocarde HIBERNANT/SIDÉRÉ (dysfonctionnel mais vivant, susceptible de récupérer après revascularisation) vs NÉCROSÉ (cicatrice, non récupérable).
      </Info>
      <Res title="IRM cardiaque — rehaussement tardif (LGE)" classe="Référence" color={c} icon="🧲" items={[
        "Référence pour la viabilité : quantifie la transmuralité de la nécrose",
        "LGE < 50% de l'épaisseur = viable (récupération probable) ; LGE transmural (> 50%) = non viable",
        "Excellente résolution spatiale, distingue nettement cicatrice et myocarde sain",
      ]}/>
      <Res title="PET métabolique (FDG)" classe="Référence" color={c} icon="✨" items={[
        "Référence métabolique : mismatch perfusion/métabolisme (perfusion ↓ mais captation de glucose conservée = hibernant/viable)",
        "Très sensible ; disponibilité limitée",
      ]}/>
      <Res title="Écho de stress à la dobutamine (faible dose)" classe="Fonctionnel" color={c} icon="🫀" items={[
        "Réserve contractile : amélioration de la cinétique à faible dose = viable (réponse biphasique évocatrice)",
"Disponible, pas d'irradiation ; · opérateur-dépendante, moins sensible que IRM/PET",
      ]}/>
      <Res title="Scintigraphie (thallium / SPECT-repos redistribution)" classe="Fonctionnel" color={c} icon="☢️" items={[
        "Recherche de redistribution/rehaussement = tissu viable",
        "Résolution moindre que l'IRM",
      ]}/>
      <Info title="Nuance importante (STICH / REVIVED)" color={c}>
        La présence de viabilité n'a pas montré, dans les essais récents (STICH, REVIVED-BCIS2), qu'elle prédisait de façon fiable le bénéfice de la revascularisation sur la survie. La viabilité reste un élément d'aide à la décision, à intégrer au contexte global (symptômes, ischémie, anatomie, fonction VG), pas un critère isolé.
      </Info>
    </div>);
    case "compare": return (<div>
      <Sec title="Synthèse — que répond chaque test ?" color={c}/>
      <Table cols="1.2fr 1fr 1.4fr" rows={[
        ["Examen","Question","Point fort / limite"],
        ["FFR / iFR","Sténose ischémiante ?","Référence lésionnelle · invasif"],
        ["FFR-CT","Ischémie (non invasif)","Couplé au coroscanner · dispo limitée"],
        ["Écho de stress","Ischémie / viabilité","Pas d'irradiation · opérateur-dép."],
        ["SPECT","Ischémie (étendue)","Pronostic · irradiation"],
        ["PET","Ischémie + viabilité","Quantitatif++ · dispo/coût"],
        ["IRM stress + LGE","Ischémie + viabilité","Tout-en-un · dispo/durée"],
        ["ECG d'effort","Ischémie (grossier)","Simple · peu sensible"],
      ]}/>
      <Res title="Logique décisionnelle" classe="Démarche" color={c} icon="🧭" items={[
        "Sténose intermédiaire à l'angiographie → FFR/iFR pour trancher",
        "Probabilité intermédiaire-élevée sans angio → imagerie fonctionnelle (écho/SPECT/PET/IRM de stress)",
        "Dysfonction VG ischémique → ajouter la viabilité (IRM/PET), en intégrant STICH/REVIVED",
        "Décision de revascularisation = ischémie documentée + anatomie + symptômes + fonction VG (Heart Team si complexe)",
      ]}/>
      <SeeAlso items={[
        { label:"Revascularisation", icon:"🩹", color:"#00966A", target:{ kind:"topic", chapterKey:"ischemic", topicKey:"revasc" } },
        { label:"Angor stable", icon:"🔍", color:"#B5790F", target:{ kind:"topic", chapterKey:"ischemic", topicKey:"ccs" } },
        { label:"Scanner coronaire", icon:"🖥️", color:"#1684A8", target:{ kind:"refcard", topicKey:"scanner" } },
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Calculateur de probabilité pré-test RF-CL (ESC 2024) ─────────
function CCSPretestCalc({ color, go }) {
  const c = color;
  const [sex, setSex] = useState(null); // "h" | "f"
  const [age, setAge] = useState(null); // age band key
  const [feat, setFeat] = useState({ retro:false, effort:false, repos:false }); // 3 caractéristiques de l'angor
  const [rf, setRf] = useState({ atcd:false, tabac:false, dlp:false, hta:false, diab:false }); // 5 FDR

  const ageBands = [["<40","< 40 ans"],["40-49","40–49"],["50-59","50–59"],["60-69","60–69"],[">=70","≥ 70 ans"]];
  const nFeat = (feat.retro?1:0) + (feat.effort?1:0) + (feat.repos?1:0);
  const symptomLabel = nFeat === 3 ? "Angor typique (3/3)" : nFeat === 2 ? "Angor atypique (2/3)" : "Non angineux (0–1/3)";
  const nRf = Object.values(rf).filter(Boolean).length;

  const box = { background:SURF, border:`1px solid ${BDR}`, borderRadius:8, padding:14, marginBottom:12 };
  const chip = (active, onClick, label) => (
    <div onClick={onClick} style={{
      padding:"9px 12px", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:560,
      border:`1px solid ${active?"var(--cg-accent-line)":BDR}`, minHeight:40,
      background: active?"var(--cg-accent-soft)":PANEL, color: active?ACCENT:TXT,
      transition:"all 0.15s", textAlign:"center", flex:1,
    }}>{label}</div>
  );
  const checkRow = (active, onClick, label) => (
    <div onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:6, cursor:"pointer",
      border:`1px solid ${active?"var(--cg-accent-line)":BDR}`, minHeight:44,
      background: active?"var(--cg-accent-soft)":PANEL, marginBottom:6,
      transition:"border-color 0.12s, background 0.12s",
    }}>
      <div style={{ width:20, height:20, borderRadius:5, border:`1.5px solid ${active?ACCENT:DIM}`, background:active?ACCENT:"transparent",
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {active && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cg-on-accent)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>}
      </div>
      <span style={{ fontSize:13, color:TXT, fontWeight:600 }}>{label}</span>
    </div>
  );

  // Orientation qualitative (ESC 2024) — le % exact vient de la table officielle
  let verdict = null;
  if (sex && age) {
    // Heuristique d'orientation (NON un calcul du % exact) fondée sur la structure du RF-CL :
    // très faible surtout si peu/pas de symptômes + peu de FDR + jeune ; élevée si angor typique + nombreux FDR + âgé.
    const ageScore = ["<40","40-49","50-59","60-69",">=70"].indexOf(age); // 0..4
    const score = nFeat*2 + nRf + ageScore + (sex==="h"?1:0);
    if (nFeat <= 1 && nRf <= 1 && ageScore <= 1) verdict = { cat:"Très faible (probablement < 5%)", key:"very_low", col:"#27AE60" };
    else if (score >= 9 && nFeat >= 2) verdict = { cat:"Élevée à très élevée", key:"mod_high", col:"#C26A1C" };
    else if (score <= 4) verdict = { cat:"Faible (souvent 5–15%)", key:"low_mod", col:"#B5790F" };
    else verdict = { cat:"Faible à modérée — à préciser", key:"low_mod", col:"#B5790F" };
  }

  return (
    <div>
      <Info title="Estimation RF-CL (ESC 2024)" color={c}>
        Renseigne les 4 composantes du modèle. Cet outil calcule le score symptomatique et le nombre de facteurs de risque, et oriente vers la catégorie de probabilité. Le pourcentage EXACT se lit sur la table/app officielle ESC (Figure 4).
      </Info>

      <div style={box}>
        <div style={{ fontSize:12, fontWeight:640, color:MUT, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Sexe</div>
        <div style={{ display:"flex", gap:8 }}>
          {chip(sex==="f", ()=>setSex("f"), "Femme")}
          {chip(sex==="h", ()=>setSex("h"), "Homme")}
        </div>
      </div>

      <div style={box}>
        <div style={{ fontSize:12, fontWeight:640, color:MUT, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Âge</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {ageBands.map(([k,lab]) => chip(age===k, ()=>setAge(k), lab))}
        </div>
      </div>

      <div style={box}>
        <div style={{ fontSize:12, fontWeight:640, color:MUT, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Caractéristiques de la douleur</div>
        {checkRow(feat.retro, ()=>setFeat(f=>({...f,retro:!f.retro})), "Douleur rétrosternale (localisation/qualité typique)")}
        {checkRow(feat.effort, ()=>setFeat(f=>({...f,effort:!f.effort})), "Déclenchée par l'effort ou le stress émotionnel")}
        {checkRow(feat.repos, ()=>setFeat(f=>({...f,repos:!f.repos})), "Soulagée par le repos ou la trinitrine (< 5 min)")}
        <div style={{ marginTop:8, padding:"8px 12px", borderRadius:8, background:c+"14", color:c, fontWeight:640, fontSize:13, textAlign:"center" }}>
          Score symptomatique : {nFeat}/3 — {symptomLabel}
        </div>
      </div>

      <div style={box}>
        <div style={{ fontSize:12, fontWeight:640, color:MUT, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Facteurs de risque CV (0–5)</div>
        {checkRow(rf.atcd, ()=>setRf(r=>({...r,atcd:!r.atcd})), "ATCD familiaux de CAD précoce (H < 55, F < 65 ans)")}
        {checkRow(rf.tabac, ()=>setRf(r=>({...r,tabac:!r.tabac})), "Tabagisme (actif ou sevré)")}
        {checkRow(rf.dlp, ()=>setRf(r=>({...r,dlp:!r.dlp})), "Dyslipidémie")}
        {checkRow(rf.hta, ()=>setRf(r=>({...r,hta:!r.hta})), "Hypertension artérielle")}
        {checkRow(rf.diab, ()=>setRf(r=>({...r,diab:!r.diab})), "Diabète")}
        <div style={{ marginTop:8, padding:"8px 12px", borderRadius:8, background:c+"14", color:c, fontWeight:640, fontSize:13, textAlign:"center" }}>
          {nRf} facteur{nRf>1?"s":""} de risque
        </div>
      </div>

      {verdict ? (
        <div style={{ background:"var(--cg-accent-soft)", border:`1px solid ${tone(verdict.col)}`,
          borderLeft:`2.5px solid ${tone(verdict.col)}`, borderRadius:8, padding:16, marginBottom:12 }}>
          <div style={{ color:verdict.col, fontWeight:680, fontSize:15, marginBottom:6 }}>Orientation : {verdict.cat}</div>
          <div style={{ color:TXT, fontSize:13, marginBottom:4 }}>
            Profil : {sex==="h"?"homme":"femme"}, {ageBands.find(a=>a[0]===age)[1]}, {symptomLabel.toLowerCase()}, {nRf} FDR.
          </div>
          <div onClick={()=>go(verdict.key)} style={{ marginTop:8, color:verdict.col, fontWeight:640, fontSize:13, cursor:"pointer", textDecoration:"underline" }}>
            → Voir la conduite recommandée
          </div>
        </div>
      ) : (
        <Info color={c}>Renseigne au moins le sexe et l'âge pour obtenir une orientation.</Info>
      )}

      <Info title="Important" color={c}>
        Cet outil facilite le raisonnement mais ne remplace pas la lecture du pourcentage exact sur la table RF-CL officielle (ESC 2024, Figure 4) ou une application dédiée. Un ajustement individuel est nécessaire en cas de facteur de risque sévère (hypercholestérolémie familiale, insuffisance rénale sévère, maladie inflammatoire, artériopathie) non reflété par le modèle. Rappel des seuils : &lt; 5% → différer les examens ; 5–15% → envisager le score calcique (CAC) ; 15–85% → imagerie ; &gt; 85% → coronarographie si symptômes/risque élevés.
      </Info>
    </div>
  );
}

function CCSContent({ go, step }) {
  const c = ISCHEMIC_TOPICS.ccs.color;
  switch(step) {
    case "start": return (<div>
      <Info title="ESC 2024 — Risk Factor-weighted Clinical Likelihood (RF-CL)" color={c}>
        Remplace l'ancien modèle de probabilité pré-test 2019. Intègre âge, sexe, type de douleur thoracique ET nombre de facteurs de risque CV.
      </Info>
      <div style={{ marginBottom:8 }}>
        <Btn title="Estimer la probabilité (calculateur RF-CL)" subtitle="Score symptomatique + facteurs de risque" color={c} onClick={()=>go("calc")}/>
      </div>
      <Sec title="Conduite selon la probabilité clinique estimée" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="🟢 Très faible probabilité (< 5%)" color="#27AE60" onClick={()=>go("very_low")}/>
        <Btn title="🟡 Faible à modérée (5–15%)" color="#B5790F" onClick={()=>go("low_mod")}/>
        <Btn title="🟠 Modérée à élevée (15–85%)" color="#C26A1C" onClick={()=>go("mod_high")}/>
        <Btn title="Très élevée (> 85%)" color="#EB5757" onClick={()=>go("very_high_ccs")}/>
      </div>
    </div>);
    case "calc": return <CCSPretestCalc color={c} go={go}/>;
    case "very_low": return <Res title="Différer les explorations complémentaires" classe="Classe I" level="C" color="#27AE60" icon="✅" items={["CAD obstructive peu probable","Rechercher diagnostic différentiel","Réévaluer si évolution clinique"]}/>;
    case "low_mod": return <Res title="Coroscanner (CCTA) en première intention" classe="Classe I" level="A" color="#B5790F" icon="🔍" items={["Excellent pour exclure une CAD obstructive (haute valeur prédictive négative)","Évalue aussi caractéristiques de plaque (risque)","Alternative : imagerie fonctionnelle si CCTA non disponible/non interprétable"]}/>;
    case "mod_high": return (<div>
      <Res title="Imagerie fonctionnelle recommandée" classe="Classe I" level="B" color="#C26A1C" icon="🔬" items={["Échographie de stress, scintigraphie (SPECT/PET), IRM de stress","Confirme l'ischémie myocardique et estime le risque d'événements (MACE)","CCTA reste une option complémentaire selon disponibilité"]}/>
      <Info color={c}>PET = référence pour mesure du flux sanguin myocardique absolu ; IRM de stress = alternative valide.</Info>
    </div>);
    case "very_high_ccs": return (<div>
      <Res title="Coronarographie invasive (ICA)" classe="Classe I" level="C" color="#EB5757" icon="🏥" items={["Symptômes sévères réfractaires au traitement médical optimal","Angor à faible niveau d'effort","Risque élevé d'événements","Évaluation fonctionnelle (FFR/iFR) des sténoses intermédiaires avant revascularisation"]}/>
    </div>);
    default: return null;
  }
}

// ── Cardiopathie ischémique — Antithrombotiques ─────────────────
function AntithrombContent({ go, step }) {
  const c = ISCHEMIC_TOPICS.antithromb.color;
  switch(step) {
    case "start": return (<div>
      <Sec title="Contexte clinique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="🆕 SCA — bithérapie initiale (DAPT)" color={c} onClick={()=>go("dapt_acute")}/>
        <Btn title="Au-delà de 12 mois post-SCA" color={c} onClick={()=>go("long_term")}/>
        <Btn title="Haut risque hémorragique" color="#EB5757" onClick={()=>go("hbr")}/>
        <Btn title="Indication d'anticoagulation orale associée (FA)" color="#A267D9" onClick={()=>go("oac")}/>
      </div>
    </div>);
    case "dapt_acute": return (<div>
      <Res title="Aspirine + inhibiteur P2Y12 — 12 mois" classe="Classe I" level="A" color="#27AE60" icon="💊" items={["Aspirine dose de charge 150–300mg puis 75–100mg/j à vie","Prasugrel ou ticagrelor préférés au clopidogrel (sauf contre-indication)","Clopidogrel si anticoagulation orale associée ou haut risque hémorragique","Durée standard : 12 mois sauf situation particulière"]}/>
      <Sec title="Posologies précises — spécialités disponibles en France" color={c}/>
      <Table cols="1fr 1fr 1.2fr 1.2fr" rows={[
        ["Molécule (DCI)","Nom commercial","Dose de charge","Dose d'entretien"],
        ["Aspirine","Kardégic, génériques","150–300 mg PO (ou 75–250 mg IV)","75–100 mg/j"],
        ["Ticagrelor","Brilique, génériques","180 mg","90 mg × 2/j"],
        ["Prasugrel","Efient, génériques","60 mg (si PCI prévue, naïf de P2Y12)","10 mg/j (5 mg/j si < 60 kg ou ≥ 75 ans)"],
        ["Clopidogrel","Plavix, génériques","300–600 mg","75 mg/j"],
      ]}/>
      <Info title="Prasugrel — règles spécifiques" color={c}>
        Ne pas administrer si antécédent d'AVC/AIT (Classe III). Ne pas administrer si anatomie coronaire inconnue (avant coronarographie). Réduction de dose à 5 mg/j systématique si poids &lt; 60 kg ou âge ≥ 75 ans.
      </Info>
      <Info title="Choix préférentiel et situations particulières" color={c}>
        Prasugrel à privilégier sur ticagrelor si PCI prévue (Classe IIa). Clopidogrel à envisager chez le sujet 70–80 ans à haut risque hémorragique (Classe IIb). Cangrelor IV (Kengrexal — usage hospitalier, réservé à la PCI) à envisager en alternative chez le patient naïf de P2Y12 lors de la PCI.
      </Info>
      <Info title="Prétraitement P2Y12" color={c}>
        NSTE-ACS : prétraitement systématique par P2Y12 NON recommandé si anatomie coronaire inconnue et stratégie invasive précoce prévue (Classe III) — nouveauté 2023.
      </Info>
      <Info title="🇫🇷 Association fixe disponible" color={c}>
        Duoplavin (clopidogrel 75 mg + aspirine 75 ou 100 mg) — comprimé combiné utile pour l'observance en traitement d'entretien après la phase initiale.
      </Info>
    </div>);
    case "long_term": return (<div>
      <Res title="Antiplaquettaire unique à vie" classe="Classe I" level="A" color="#27AE60" icon="💊" items={["Aspirine ou clopidogrel en monothérapie au long cours","Clopidogrel : niveau de preuve le plus robuste en monothérapie prolongée (HOST-EXAM)"]}/>
      <Arr color={c}/>
      <Res title="DAPT prolongée à envisager si haut risque ischémique" classe="Classe IIb" level="A" color="#F2C94C" icon="⚖️" items={["Aspirine + P2Y12 faible dose au-delà de 12 mois","Patients à haut risque ischémique ET bas risque hémorragique","Évaluation individuelle du rapport bénéfice/risque"]}/>
    </div>);
    case "hbr": return (<div>
      <Res title="Stratégies d'allègement" classe="Classe IIa-IIb" level="B" color="#C26A1C" icon="🩸" items={["Arrêt précoce de l'aspirine après 1 mois, poursuite P2Y12 seul (Classe IIa)","Monothérapie (aspirine OU P2Y12) après 1 mois de DAPT à envisager (Classe IIb)","Désescalade : passage prasugrel/ticagrelor → clopidogrel guidé par test plaquettaire ou génotypage (Classe IIb)"]}/>
      <Info title="Désescalade précoce systématique (< 30j)" color="#EB5757">
        Non recommandée en routine (Classe III) — le risque ischémique précoce post-SCA reste élevé dans le premier mois.
      </Info>
    </div>);
    case "oac": return (<div>
      <Info title="Triple vs bithérapie" color="#A267D9">
        FA + SCA + PCI = situation à haut risque hémorragique nécessitant un équilibre ischémie/saignement.
      </Info>
      <Res title="Bithérapie privilégiée (AOD + P2Y12)" classe="Classe I" level="A" color="#27AE60" icon="💊" items={["AOD (privilégié à AVK) + clopidogrel — arrêt aspirine à J1-J7 (sortie hospitalisation)","Trithérapie courte (≤ 1 semaine) à envisager si haut risque ischémique","Clopidogrel = P2Y12 de choix dans cette association"]}/>
    </div>);
    default: return null;
  }
}

// ── Cardiopathie ischémique — Revascularisation ─────────────────
function RevascContent({ go, step }) {
  const c = ISCHEMIC_TOPICS.revasc.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Décision Heart Team" color={c}>
        Recommandée pour toute revascularisation complexe (atteinte multitronculaire, tronc commun) — Classe I.
      </Info>
      <Sec title="Anatomie coronaire" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="1–2 vaisseaux, sans IVA proximale" color={c} onClick={()=>go("simple")}/>
        <Btn title="Atteinte tritronculaire ou tronc commun" color="#C26A1C" onClick={()=>go("complex")}/>
        <Btn title="Diabétique + atteinte multitronculaire" color="#EB5757" onClick={()=>go("diabetic")}/>
      </div>
      <div style={{ height:8 }}/>
      <Sec title="Évaluation angiographique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Flux TIMI (coronarographie)" subtitle="Grade de perfusion coronaire 0–3" color={c} onClick={()=>go("timiflow")}/>
      </div>
    </div>);
    case "timiflow": return (<div>
      <Info title="Flux TIMI — grade angiographique" color={c}>
        Description visuelle de la perfusion coronaire à la coronarographie (écoulement du produit de contraste). À NE PAS confondre avec le score de risque TIMI (clinique, pronostique, cf. Calculateurs de scores).
      </Info>
      <Table cols="0.5fr 2fr" rows={[
        ["Grade","Description angiographique"],
        ["TIMI 0","Absence de flux : aucune opacification en aval de l'occlusion"],
        ["TIMI 1","Pénétration sans perfusion : le contraste franchit la sténose mais n'opacifie pas le lit d'aval"],
        ["TIMI 2","Perfusion partielle : opacification complète du lit d'aval mais écoulement et lavage ralentis"],
        ["TIMI 3","Perfusion normale : flux d'entrée et lavage normaux (objectif après reperfusion)"],
      ]}/>
      <Info title="Objectif de la reperfusion" color={c}>
        Un flux TIMI 3 (± TIMI 2) définit le succès angiographique de l'angioplastie primaire. Un flux TIMI ≤ 2 résiduel ou un phénomène de no-reflow est associé à un moins bon pronostic.
      </Info>
      <Sec title="Index dérivés (quantification fine)" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Index","Signification"],
        ["TIMI frame count","Comptage du nombre d'images (ciné) nécessaires pour opacifier l'artère : quantification objective de la vitesse du flux (corrigé pour l'IVA)"],
        ["TIMI myocardial blush grade","Qualité de la perfusion myocardique tissulaire (0–3), au-delà de l'artère épicardique : reflète la microcirculation"],
      ]}/>
      <Info title="No-reflow" color="#EB5757">
        Flux épicardique restauré (artère ouverte) mais perfusion myocardique absente (blush 0–1) : obstruction microvasculaire, de mauvais pronostic. Peut survenir malgré un flux TIMI 3 apparent sur l'artère.
      </Info>
    </div>);
    case "simple": return <Res title="PCI préférée" classe="Classe I" level="A" color="#27AE60" icon="🔧" items={["Anatomie simple, faible SYNTAX score","Évaluation FFR/iFR des sténoses intermédiaires avant traitement","Stent actif (DES) systématique"]}/>;
    case "complex": return (<div>
      <Info title="SYNTAX Score — outil de décision" color={c}>
        Faible (≤22) : PCI ou pontage équivalents · Intermédiaire (23-32) : discuter en Heart Team · Élevé (≥33) : pontage préféré
      </Info>
      <Res title="Pontage (CABG) généralement préféré si SYNTAX élevé" classe="Classe I" level="A" color="#27AE60" icon="🫀" items={["Meilleurs résultats à long terme si anatomie complexe","PCI = alternative raisonnable si SYNTAX faible-intermédiaire et préférence patient","Décision Heart Team obligatoire"]}/>
    </div>);
    case "diabetic": return <Res title="Pontage (CABG) préféré" classe="Classe I" level="A" color="#27AE60" icon="🫀" items={["Bénéfice de survie démontré chez le diabétique multitronculaire (FREEDOM)","Utilisation de greffons artériels (mammaire interne) recommandée","PCI = option si SYNTAX faible et Heart Team favorable"]}/>;
    default: return null;
  }
}
// ── Cardiopathie ischémique — Traitements cardioprotecteurs ─────
function CardioprotContent({ go, step }) {
  const c = ISCHEMIC_TOPICS.cardioprot.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Introduction systématique à la phase aiguë/post-revascularisation" color={c}>
        Indépendamment de la stratégie de revascularisation (PCI ou pontage), un socle thérapeutique cardioprotecteur doit être initié avant la sortie, sauf contre-indication.
      </Info>
      <Sec title="Classe thérapeutique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Statine haute intensité" color={c} onClick={()=>go("statin")}/>
        <Btn title="Bêtabloquant" color={c} onClick={()=>go("bb")}/>
        <Btn title="IEC / ARA2" color={c} onClick={()=>go("acei")}/>
        <Btn title="ARM (antagoniste minéralocorticoïde)" color={c} onClick={()=>go("mra")}/>
        <Btn title="Colchicine" color={c} onClick={()=>go("colchicine")}/>
      </div>
    </div>);
    case "statin": return (<div>
      <Res title="Statine de haute intensité — systématique" classe="Classe I" level="A" color="#27AE60" icon="💊" items={["Atorvastatine 40–80mg ou rosuvastatine 20–40mg, dès l'admission","Indépendant du taux de LDL initial","Objectif : LDL-c < 0,55 g/L (1,4 mmol/L) ET réduction ≥ 50% par rapport à la valeur de base","Bilan lipidique à 4–6 semaines pour ajustement"]}/>
      <Sec title="Posologies — spécialités disponibles en France" color={c}/>
      <Table cols="1fr 1fr 1fr 1fr" rows={[
        ["DCI","Nom commercial","Dose initiale","Dose cible (haute intensité)"],
        ["Atorvastatine","Tahor, génériques","40 mg/j","80 mg/j"],
        ["Rosuvastatine","Crestor, génériques","20 mg/j","20–40 mg/j"],
      ]}/>
      <Arr color={c}/>
      <Res title="Si objectif non atteint sous statine maximale" classe="Classe I" level="B" color="#C26A1C" icon="➕" items={["Ajout d'ézétimibe en 2e ligne","Ajout d'un anti-PCSK9 (évolocumab, alirocumab) en 3e ligne si LDL toujours non contrôlé","PACMAN-AMI : régression de plaque démontrée avec anti-PCSK9 précoce post-IDM"]}/>
      <Table cols="1fr 0.9fr 1.5fr" rows={[
        ["DCI","Nom commercial","Posologie"],
        ["Ézétimibe","Ezetrol, génériques","10 mg/j en association à la statine"],
        ["Évolocumab","Repatha","140 mg SC/2 semaines ou 420 mg SC/mois"],
        ["Alirocumab","Praluent","75 ou 150 mg SC/2 semaines"],
      ]}/>
      <Info title="🇫🇷 Conditions de prescription des anti-PCSK9 en France" color={c}>
        Remboursement à 65% soumis à une demande d'accord préalable (DAP) auprès de l'Assurance Maladie, à chaque instauration ou renouvellement. Indication post-SCA : LDL-c ≥ 0,7 g/L malgré statine à dose maximale tolérée + ézétimibe, SCA datant de moins de 12 mois. Tensions d'approvisionnement sur Praluent rapportées en 2025 — Repatha en option de repli en cas de rupture.
      </Info>
      <Info title="Contre-indications / précautions" color={c}>
        Hépatopathie active, myopathie/rhabdomyolyse antérieure sous statine, grossesse. Surveillance CPK si symptômes musculaires, transaminases si point d'appel clinique.
      </Info>
    </div>);
    case "bb": return (<div>
      <Res title="FEVG ≤ 40% — indication formelle" classe="Classe I" level="A" color="#27AE60" icon="🫀" items={["Bisoprolol, carvédilol, métoprolol succinate","Réduction de mortalité démontrée, partage avec le traitement de l'ICFEr","Introduction précoce, titration progressive selon tolérance"]}/>
      <Sec title="Posologies — spécialités disponibles en France" color={c}/>
      <Table cols="0.9fr 0.9fr 1fr 1.1fr" rows={[
        ["DCI","Nom commercial","Dose initiale","Dose cible"],
        ["Bisoprolol","Cardensiel, génériques","1,25 mg/j","10 mg/j"],
        ["Carvédilol","Kredex, génériques","3,125 mg × 2/j","25 mg × 2/j (50 mg × 2/j si > 85 kg)"],
        ["Métoprolol succinate LP","Seloken LP, génériques","12,5–25 mg/j","200 mg/j"],
      ]}/>
      <Info color={c}>Doubler la dose toutes les 2–4 semaines selon tolérance (FC, PA, signes de décompensation), jusqu'à la dose cible ou la dose maximale tolérée.</Info>
      <Arr color={c}/>
      <Res title="FEVG préservée (> 40%) — à envisager" classe="Classe IIa" level="B" color="#C26A1C" icon="⚖️" items={["Recommandation affaiblie depuis REDUCE-AMI (NEJM 2024) : pas de bénéfice de mortalité démontré si FEVG préservée et revascularisation complète","Bénéfice symptomatique possible (angor résiduel, contrôle FC)","Décision individualisée — non systématique comme auparavant"]}/>
      <Info title="Contre-indications" color="#EB5757">
        Asthme sévère/BPCO décompensée, bloc AV de haut degré sans pacemaker, choc cardiogénique, bradycardie sévère symptomatique, hypotension artérielle significative.
      </Info>
    </div>);
    case "acei": return (<div>
      <Res title="IEC (ou ARA2 si intolérance) — indications" classe="Classe I" level="A" color="#27AE60" icon="💉" items={["FEVG ≤ 40%","IDM antérieur étendu","Diabète","HTA","Insuffisance rénale chronique stable","Introduction précoce (24–48h), titration jusqu'à dose cible tolérée"]}/>
      <Sec title="Posologies — spécialités disponibles en France" color={c}/>
      <Table cols="0.9fr 0.9fr 1fr 1.1fr" rows={[
        ["DCI","Nom commercial","Dose initiale","Dose cible"],
        ["Ramipril","Triatec, génériques","2,5 mg/j","10 mg/j (ou 5 mg × 2/j)"],
        ["Périndopril","Coversyl, génériques","2,5–5 mg/j","10 mg/j"],
        ["Losartan (ARA2)","Cozaar, génériques","50 mg/j","150 mg/j"],
        ["Valsartan (ARA2)","Tareg, génériques","40 mg × 2/j","160 mg × 2/j"],
      ]}/>
      <Info color={c}>Ramipril et périndopril = IEC les plus utilisés en pratique française post-IDM. ARA2 réservés en cas d'intolérance aux IEC (toux).</Info>
      <Info title="Contre-indications / précautions" color="#EB5757">
        Sténose bilatérale des artères rénales, hyperkaliémie ≥ 5,5 mmol/L, hypotension artérielle (PAS &lt; 100 mmHg), grossesse, angiœdème antérieur sous IEC/ARA2. Surveiller créatinine et kaliémie à J7-J14.
      </Info>
    </div>);
    case "mra": return (<div>
      <Res title="ARM — à envisager" classe="Classe I" level="A" color="#27AE60" icon="🧂" items={["FEVG ≤ 40% + signes d'IC ou diabète, déjà sous IEC + bêtabloquant","Éplérénone préférée en post-IDM (EPHESUS)","Introduction après stabilisation, généralement après quelques jours"]}/>
      <Sec title="Posologies — spécialités disponibles en France" color={c}/>
      <Table cols="0.9fr 0.9fr 1fr 1.1fr" rows={[
        ["DCI","Nom commercial","Dose initiale","Dose cible"],
        ["Éplérénone","Inspra, génériques","25 mg/j","50 mg/j"],
        ["Spironolactone","Aldactone, génériques","25 mg/j","25–50 mg/j"],
      ]}/>
      <Info title="Contre-indications" color="#EB5757">
        Insuffisance rénale sévère (DFG &lt; 30 mL/min), kaliémie &gt; 5,0 mmol/L, association à un diurétique épargneur de potassium. Surveillance kaliémie/créatinine à J3, J7, puis régulière.
      </Info>
    </div>);
    case "colchicine": return (<div>
      <Res title="Colchicine faible dose — à envisager" classe="Classe IIb" level="A" color="#F2C94C" icon="🔥" items={["0,5mg/jour en prévention secondaire","Si événements CV récurrents ou facteurs de risque mal contrôlés malgré traitement optimal","Effet anti-inflammatoire — réduction des événements ischémiques (COLCOT, LoDoCo2)"]}/>
      <Info color={c}>Colchicine Opocalcium 1 mg — comprimé sécable, posologie en prévention secondaire CV : 0,5 mg/j (soit un demi-comprimé).</Info>
      <Info title="Contre-indications / précautions" color="#EB5757">
        Insuffisance rénale ou hépatique sévère, interaction avec inhibiteurs puissants du CYP3A4. Risque accru de pneumopathie infectieuse rapporté (COLCOT) — surveiller signes infectieux.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Cardiopathie ischémique — Réadaptation cardiaque ─────────────
function ReadaptContent({ go, step }) {
  const c = ISCHEMIC_TOPICS.readapt.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Réadaptation cardiaque — Classe I (ESC 2023/2024)" color={c}>
        Programme multidisciplinaire supervisé : entraînement aérobie + résistance, gestion des facteurs de risque, éducation thérapeutique, soutien psychologique, conseils nutritionnels et arrêt du tabac.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Indications" color={c} onClick={()=>go("indications")}/>
        <Btn title="Contre-indications" color="#EB5757" onClick={()=>go("contraindications")}/>
        <Btn title="Timing de reprise de l'activité" color={c} onClick={()=>go("timing")}/>
        <Btn title="Critères d'arrêt à l'effort" color="#C26A1C" onClick={()=>go("stop_criteria")}/>
      </div>
    </div>);
    case "indications": return (<div>
      <Res title="Indication systématique — Classe I, niveau A" classe="Classe I" level="A" color="#27AE60" icon="✅" items={[
        "Post-SCA (STEMI et NSTE-ACS), quelle que soit la stratégie de revascularisation",
        "Post-PCI élective pour syndrome coronarien chronique",
        "Post-pontage aorto-coronarien (CABG)",
        "Insuffisance cardiaque chronique stable (ICFEr, ICFEp)",
        "Post-chirurgie valvulaire",
        "Artériopathie périphérique symptomatique",
      ]}/>
      <Info title="Bénéfices démontrés" color={c}>
        Réduction de la mortalité cardiovasculaire et toute cause, réduction des réhospitalisations, amélioration de la capacité fonctionnelle, du profil lipidique, de la pression artérielle, et de la qualité de vie. Programmes en centre et à domicile montrent un bénéfice comparable.
      </Info>
    </div>);
    case "contraindications": return (<div>
      <Res title="Contre-indications à l'effort — temporaires ou absolues" classe="Classe III" level="C" color="#EB5757" icon="🚫" items={[
        "Angor instable non stabilisé",
        "Insuffisance cardiaque aiguë décompensée non contrôlée",
        "Arythmies ventriculaires non contrôlées",
        "Bloc auriculo-ventriculaire de haut degré sans pacemaker",
        "Sténose aortique serrée symptomatique",
        "Hypertension artérielle non contrôlée (PAS > 180 ou PAD > 110 mmHg)",
        "Myocardite ou péricardite aiguë évolutive",
        "Dissection aortique",
        "Thrombus intracavitaire mobile ou à risque embolique élevé",
        "Embolie pulmonaire ou thrombophlébite récente non traitée",
        "Affection systémique aiguë ou fièvre",
      ]}/>
      <Info title="Distinction importante" color="#C26A1C">
        Ces contre-indications concernent l'entraînement physique actif. Les autres composantes du programme (éducation, nutrition, soutien psychologique, gestion des facteurs de risque) peuvent souvent être maintenues ou adaptées même en cas de contre-indication temporaire à l'exercice.
      </Info>
    </div>);
    case "timing": return (<div>
      <Sec title="Reprise selon le contexte" color={c}/>
      <Table cols="1.6fr 1fr" rows={[
        ["Contexte","Délai de reprise"],
        ["PCI élective, voie radiale","Dès le lendemain"],
        ["PCI élective, voie fémorale","Après 1 semaine (cicatrisation point de ponction)"],
        ["Réparation chirurgicale du point d'accès","Différé jusqu'à cicatrisation"],
        ["Post-IDM (48h)","Marche 2–4×/jour, 3–5 min, FC repos +0 à 20 bpm"],
        ["Test d'effort gradué","Sûr entre J14 et J21 post-IDM"],
      ]}/>
      <Info color={c}>Évaluation de la capacité fonctionnelle réalisable dès J4–J6 post-IDM en hospitalisation pour orienter la prescription d'exercice initiale.</Info>
    </div>);
    case "stop_criteria": return (<div>
      <Res title="Critères d'arrêt immédiat de la séance" classe="Classe I" level="C" color="#EB5757" icon="🛑" items={[
        "Pression artérielle diastolique > 110 mmHg",
        "Apparition d'arythmie ventriculaire ou atriale significative",
        "Bloc auriculo-ventriculaire de 2e ou 3e degré nouveau",
        "Dyspnée marquée disproportionnée à l'effort",
        "Angor à l'effort",
        "Chute tensionnelle paradoxale à l'effort",
        "Vertige, pâleur, sueurs profuses, confusion",
      ]}/>
      <Info title="Surveillance" color={c}>
        Monitorage ECG continu recommandé en phase précoce (programme hospitalier), particulièrement chez les patients à risque arythmique ou avec FEVG réduite.
      </Info>
    </div>);
    default: return null;
  }
}
// ── Rythmologie — FA : Diagnostic et stratification ─────────────
function FADiagContent({ go, step }) {
  const c = FA_TOPICS.fa_diag.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Approche AF-CARE (ESC/EACTS 2024)" color={c}>
        Nouveau cadre structuré : [C]omorbidités et facteurs de risque, [A]nticoagulation (éviter AVC), [R]éduction des symptômes (FC/rythme), [E]valuation dynamique réévaluée régulièrement.
      </Info>
      <Sec title="Confirmation diagnostique" color={c}/>
      <Res title="ECG obligatoire" classe="Classe I" level="B" color="#27AE60" icon="📈" items={["FA clinique = épisode documenté sur ECG 12 dérivations OU tracé ECG ≥ 30 sec montrant absence d'ondes P et intervalles RR irréguliers","Le diagnostic ne repose jamais sur la seule clinique (palpitations, pouls irrégulier)"]}/>
      <Arr color={c}/>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Classification (parox./persist./perm.)" color={c} onClick={()=>go("classification")}/>
        <Btn title="Score CHA₂DS₂-VA" color={c} onClick={()=>go("chadsva")}/>
        <Btn title="Score de risque hémorragique" color={c} onClick={()=>go("bleeding")}/>
        <Btn title="FA infraclinique détectée par dispositif" color={c} onClick={()=>go("subclinical")}/>
        <Btn title="Bilan étiologique systématique" color={c} onClick={()=>go("etiology")}/>
      </div>
    </div>);
    case "classification": return (<div>
      <Info title="Classification temporelle (ESC/EACTS 2024)" color={c}>
        La classification selon le profil temporel — première diagnostiquée, paroxystique, persistante, permanente — reste inchangée par rapport aux versions précédentes.
      </Info>
      <Table cols="1fr 1.9fr" rows={[
        ["Type","Définition"],
        ["Première diagnostiquée","FA jamais documentée auparavant, quelle que soit sa durée ou la sévérité des symptômes"],
        ["Paroxystique","Se termine spontanément ou après intervention (cardioversion) dans les 7 jours suivant le début"],
        ["Persistante","Se maintient au-delà de 7 jours (y compris si cardioversion réalisée après 7 jours)"],
        ["Persistante de longue durée","FA continue ≥ 1 an, lorsqu'une stratégie de contrôle du rythme est retenue"],
        ["Permanente","FA acceptée par le patient et le médecin : aucune stratégie de contrôle du rythme n'est poursuivie"],
      ]}/>
      <Res title="Points clés" classe="Repères" level="" color={c} icon="📋" items={[
        "Une FA récidivante (≥ 2 épisodes) qui se termine seule est classée paroxystique",
        "Le seuil de 7 jours est admis mais reste arbitraire ; la plupart des paroxysmes durent < 48 h",
        "Le cap des 48 h est important : au-delà, la conversion spontanée devient moins probable et l'anticoagulation avant cardioversion doit être envisagée",
        "« Permanente » n'est pas une donnée de durée mais une DÉCISION thérapeutique : si l'on reprend une stratégie de rythme, la FA est reclassée en persistante de longue durée",
        "Si épisodes paroxystiques ET persistants coexistent, retenir le profil prédominant",
      ]}/>
      <Info title="Limite de la classification" color={c}>
        Sans monitoring prolongé, la distinction paroxystique / persistante est souvent imprécise (sous-estimation de la charge en FA). Elle ne suffit pas à elle seule à choisir la stratégie thérapeutique.
      </Info>
    </div>);
    case "chadsva": return (<div>
      <Info title="CHA₂DS₂-VA remplace CHA₂DS₂-VASc (ESC 2024)" color={c}>
        Le sexe féminin est retiré comme facteur de risque indépendant — il agit comme modificateur de risque plutôt que facteur isolé.
      </Info>
      <Table cols="1.8fr 1fr" rows={[
        ["Critère","Points"],
        ["Insuffisance cardiaque (ou dysfonction VG)","1"],
        ["HTA","1"],
        ["Âge ≥ 75 ans","2"],
        ["Diabète","1"],
        ["AVC/AIT/thromboembolie antérieurs","2"],
        ["Maladie vasculaire (coronaropathie, AOMI, plaque aortique)","1"],
        ["Âge 65–74 ans","1"],
      ]}/>
      <Res title="Anticoagulation selon le score" classe="Classe I/IIa" level="A" color="#27AE60" icon="💊" items={[
        "Score = 0 : pas d'anticoagulation (Classe III pour la prescrire)",
        "Score = 1 : anticoagulation à envisager (Classe IIa)",
        "Score ≥ 2 : anticoagulation recommandée (Classe I)",
      ]}/>
      <Info title="Cas particuliers — anticoagulation systématique" color={c}>
        Cardiomyopathie hypertrophique ou amylose cardiaque + FA : anticoagulation recommandée indépendamment du score CHA₂DS₂-VA (Classe I).
      </Info>
    </div>);
    case "bleeding": return (<div>
      <Res title="Évaluation du risque hémorragique" classe="Classe I" level="B" color="#C26A1C" icon="🩸" items={[
        "Ne sert pas à exclure l'anticoagulation mais à identifier et corriger les facteurs modifiables",
        "HTA non contrôlée, labilité INR (si AVK), alcool, AINS/antiplaquettaires associés, anémie",
        "Réévaluation périodique du rapport bénéfice/risque",
      ]}/>
      <Info color={c}>Le risque hémorragique élevé ne contre-indique pas l'anticoagulation en soi — il oriente la correction des facteurs modifiables et le choix de la molécule/dose.</Info>
    </div>);
    case "subclinical": return (<div>
      <Res title="FA infraclinique (device-detected) — Conduite à tenir" classe="Classe IIa" level="B" color="#C26A1C" icon="🔍" items={[
        "Épisodes détectés par PM/DAI/Holter implantable, asymptomatiques",
        "DOAC à envisager si risque thromboembolique élevé ET pas de haut risque hémorragique",
        "Durée et charge en FA (AF burden) à prendre en compte dans la décision",
        "ARTESiA et NOAH-AFNET 6 : bénéfice net modeste, à individualiser",
      ]}/>
    </div>);
    case "etiology": return (<div>
      <Sec title="Bilan initial systématique" color={c}/>
      <div style={{ background:CARD, borderRadius:8, padding:"10px 13px", border:`1px solid ${BDR}` }}>
        <ul style={{ margin:0, paddingLeft:16, color:MUT, fontSize:12 }}>
          <li>Échocardiographie transthoracique (taille OG, FEVG, valvulopathie)</li>
          <li>Bilan thyroïdien (TSH)</li>
          <li>Ionogramme, fonction rénale, NFS</li>
          <li>Dépistage syndrome d'apnées du sommeil si suspicion clinique</li>
          <li>Recherche de facteurs déclenchants : alcool, infection, chirurgie, hyperthyroïdie</li>
        </ul>
      </div>
      <Info title="Gestion des comorbidités — pilier [C] de AF-CARE" color={c}>
        Contrôle de l'HTA, du poids (perte de poids si obésité), de l'activité physique, réduction de l'alcool, traitement de l'apnée du sommeil — réduisent la récidive et la progression de la FA.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Rythmologie — FA : Anticoagulation ───────────────────────────
function FAAOCContent({ go, step }) {
  const c = FA_TOPICS.fa_aoc.color;
  switch(step) {
    case "start": return (<div>
      <Res title="DOAC préféré aux AVK" classe="Classe I" level="A" color="#27AE60" icon="💊" items={["Sauf valve mécanique ou rétrécissement mitral modéré-sévère (uniquement AVK)","Pas de réduction de dose sauf critères spécifiques par molécule","Ne jamais associer systématiquement antiplaquettaire + anticoagulant (sauf SCA/PCI récent)"]}/>
      <Sec title="Posologies DOAC — spécialités disponibles en France" color={c}/>
      <Table cols="0.9fr 0.7fr 1.1fr 1.3fr" rows={[
        ["DCI","Nom commercial","Dose standard","Critères de réduction de dose"],
        ["Apixaban","Eliquis","5 mg × 2/j","2,5 mg × 2/j si ≥ 2 critères : âge ≥80a, poids ≤60kg, créat ≥133 µmol/L"],
        ["Rivaroxaban","Xarelto","20 mg/j","15 mg/j si DFG 15–49 mL/min"],
        ["Apixaban / Rivaroxaban","—","—","—"],
        ["Dabigatran","Pradaxa","150 mg × 2/j","110 mg × 2/j si ≥80a, vérapamil associé, ou risque hémorragique"],
        ["Edoxaban","Lixiana","60 mg/j","30 mg/j si poids ≤60kg, DFG 15–50 mL/min, ou vérapamil/dronédarone"],
      ]}/>
      <Info title="Sous-dosage à éviter" color="#EB5757">
        Ne pas réduire la dose en dehors des critères validés par molécule — le sous-dosage expose à un risque thromboembolique accru sans bénéfice hémorragique démontré (recommandation explicite 2024).
      </Info>
      <Arr color={c}/>
      <Sec title="Situations particulières" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Cardioversion programmée" color={c} onClick={()=>go("cv")}/>
        <Btn title="FA + SCA/PCI récent" color={c} onClick={()=>go("triple")}/>
        <Btn title="Occlusion de l'auricule gauche" color={c} onClick={()=>go("laao")}/>
      </div>
    </div>);
    case "cv": return (<div>
      <Res title="Anticoagulation péri-cardioversion" classe="Classe I" level="B" color="#27AE60" icon="🫀" items={[
        "FA ≥ 24h ou durée inconnue : anticoagulation efficace ≥ 3 semaines avant cardioversion (ou ETO pour exclure thrombus OG)",
        "Anticoagulation poursuivie ≥ 4 semaines après cardioversion, quel que soit le score CHA₂DS₂-VA",
        "ESC 2024 : seuil abaissé de 48h à 24h pour la nécessité d'anticoagulation prolongée avant cardioversion",
      ]}/>
      <Info color={c}>Si FA &lt; 24h : anticoagulation péri-procédure optionnelle selon le contexte clinique, à débuter dès que possible si cardioversion en urgence programmée.</Info>
    </div>);
    case "triple": return (<div>
      <Res title="Bithérapie privilégiée (DOAC + clopidogrel)" classe="Classe I" level="A" color="#27AE60" icon="💊" items={[
        "Arrêt précoce de l'aspirine (J1 à J7 post-PCI)",
        "Trithérapie courte (≤ 1 semaine) seulement si haut risque ischémique",
        "Ne pas associer ticagrelor/prasugrel à l'anticoagulant en trithérapie",
      ]}/>
    </div>);
    case "laao": return (<div>
      <Res title="Occlusion de l'auricule gauche (LAAO)" classe="Classe IIb" level="B" color="#F2C94C" icon="🚫" items={[
        "Alternative si contre-indication formelle et durable à l'anticoagulation orale",
        "Recommandée en adjonction systématique lors de chirurgie cardiaque concomitante (Classe I — nouveauté 2024)",
        "Ne dispense pas d'une réévaluation périodique de l'éligibilité à l'anticoagulation",
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Rythmologie — FA : Contrôle fréquence/rythme ─────────────────
function FARateContent({ go, step }) {
  const c = FA_TOPICS.fa_rate.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Décision partagée patient-équipe" color={c}>
        La plupart des patients nécessitent une combinaison contrôle de fréquence + contrôle du rythme, réévaluée au fil du suivi. Pas d'algorithme strict de sélection — approche individualisée.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Contrôle de fréquence" color={c} onClick={()=>go("rate")}/>
        <Btn title="Contrôle du rythme — indications" color={c} onClick={()=>go("rhythm_indic")}/>
        <Btn title="Antiarythmiques" color={c} onClick={()=>go("aad")}/>
      </div>
    </div>);
    case "rate": return (<div>
      <Res title="Cible de fréquence cardiaque" classe="Classe IIa" level="B" color="#C26A1C" icon="📉" items={[
        "Cible initiale < 110 bpm au repos (contrôle souple) — suffisant chez la majorité des patients",
        "Cible plus stricte (<80 bpm repos) si symptômes persistants malgré contrôle souple",
      ]}/>
      <Table cols="1fr 1fr 1.2fr" rows={[
        ["DCI","Nom commercial","Posologie usuelle"],
        ["Bisoprolol","Cardensiel","2,5–10 mg/j"],
        ["Diltiazem","Tildiem","120–360 mg/j (LP)"],
        ["Digoxine","Digoxine Nativelle","0,125–0,25 mg/j (adapter selon clairance)"],
      ]}/>
      <Info color={c}>Bêtabloquant ou inhibiteur calcique bradycardisant (diltiazem/vérapamil) en 1ère intention. Digoxine en complément si FEVG altérée ou sédentarité, jamais en 1ère intention isolée chez le sujet actif.</Info>
    </div>);
    case "rhythm_indic": return (<div>
      <Res title="Contrôle du rythme à envisager précocement" classe="Classe I" level="A" color="#27AE60" icon="🔄" items={[
        "Dans les 12 mois suivant le diagnostic chez les patients à risque d'événement thromboembolique/CV — réduit hospitalisations et mortalité CV (EAST-AFNET 4)",
        "Patients symptomatiques malgré contrôle de fréquence adéquat",
        "FA secondaire à une cause aiguë réversible (post-chirurgie, infection)",
      ]}/>
      <Info title="Cardioversion comme outil diagnostique" color={c}>
        À envisager en FA persistante pour évaluer l'impact du retour en rythme sinusal sur les symptômes ou la fonction VG, même sans décision définitive de stratégie.
      </Info>
    </div>);
    case "aad": return (<div>
      <Sec title="Antiarythmiques pour maintien du rythme sinusal" color={c}/>
      <Table cols="0.9fr 0.7fr 1.4fr" rows={[
        ["DCI","Nom commercial","Contexte préférentiel"],
        ["Flécaïnide","Flécaïne","Cœur sain, sans cardiopathie structurelle"],
        ["Propafénone","Rythmol","Cœur sain, sans cardiopathie structurelle"],
        ["Amiodarone","Cordarone","Cardiopathie structurelle, FEVG altérée — efficacité supérieure mais toxicité extracardiaque"],
        ["Dronédarone","Multaq","FA non permanente, sans IC sévère ni FEVG très altérée"],
      ]}/>
      <Info title="Contre-indications clés" color="#EB5757">
        Flécaïnide/propafénone contre-indiqués si cardiopathie structurelle ou coronaropathie (risque proarythmique). Amiodarone : surveillance thyroïdienne et hépatique régulière, toxicité pulmonaire possible au long cours.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Rythmologie — FA en contexte de SCA aigu ──────────────────────
function FASCAContent({ go, step }) {
  const c = FA_TOPICS.fa_sca.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Deux problèmes à gérer en parallèle" color={c}>
        Dans les 48 premières heures d'un SCA revascularisé compliqué de FA, deux questions se posent séparément : la <b>stratégie antithrombotique</b> (le vrai enjeu, car on cumule anticoagulation et antiagrégation) et le <b>contrôle de la FA</b> (fréquence/rythme). Sources : ESC SCA 2023, ESC/EACTS FA 2024.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Stratégie antithrombotique post-PCI" subtitle="Trithérapie → bithérapie, durées" color={c} onClick={()=>go("antithrombotique")}/>
        <Btn title="Contrôle de la FA en phase aiguë" subtitle="Fréquence, cardioversion, pièges" color={c} onClick={()=>go("controle")}/>
        <Btn title="Anticoagulation au long cours" color={c} onClick={()=>go("aoc")}/>
        <Btn title="Synthèse pratique 48 h" color={c} onClick={()=>go("synthese")}/>
      </div>
    </div>);

    case "antithrombotique": return (<div>
      <Info title="Logique : démarrer fort, désescalader vite" color={c}>
        On cumule anticoagulant oral (AOD préféré à l'AVK) et double antiagrégation, puis on allège dès que possible pour limiter le risque hémorragique.
      </Info>
      <Res title="Séquence recommandée (ESC SCA 2023)" classe="Classe I" level="A" color="#27AE60" icon="💊" items={[
        "Trithérapie AOD + aspirine + clopidogrel jusqu'à 1 semaine après le SCA (donc active pendant les 48 premières heures)",
        "Puis bithérapie jusqu'à 12 mois : AOD + un seul antiagrégant, de préférence le clopidogrel",
        "Puis AOD seul au-delà de 12 mois",
      ]}/>
      <Res title="Prolonger la trithérapie ?" classe="Classe IIa" level="C" color="#C26A1C" icon="⚠️" items={[
        "Jusqu'à 1 mois de trithérapie si le risque thrombotique (thrombose de stent) l'emporte sur le risque hémorragique",
        "Facteurs de haut risque ischémique : STEMI, antécédent de thrombose de stent, PCI complexe, instabilité prolongée",
      ]}/>
      <Sec title="Règles de choix des molécules" color={c}/>
      <Table cols="1fr 1.5fr" rows={[
        ["Anticoagulant","AOD préféré à l'AVK (apixaban, rivaroxaban, dabigatran, édoxaban), à la dose validée en prévention de l'AVC"],
        ["P2Y12","Clopidogrel = choix par défaut dans l'association · éviter prasugrel/ticagrélor combinés à l'AOD"],
        ["Aspirine","C'est elle qu'on ARRÊTE en premier, à la fin de la trithérapie"],
        ["Indication d'AOC","CHA₂DS₂-VA ≥ 1 (homme) / ≥ 2 (femme)"],
      ]}/>
      <Info title="Nuance FA 2024" color="#EB5757">
        L'association anticoagulant + antiplaquettaire n'est justifiée que par l'événement vasculaire aigu — d'où l'intérêt de la raccourcir au maximum. Évaluer le versant hémorragique (HAS-BLED, PRECISE-DAPT) pour trancher entre 1 semaine et 1 mois.
      </Info>
    </div>);

    case "controle": return (<div>
      <Info title="La conduite dépend de la tolérance hémodynamique" color={c}>
        La FA de novo au décours d'un SCA régresse souvent spontanément une fois l'ischémie traitée et le patient stabilisé.
      </Info>
      <Res title="FA mal tolérée" classe="Urgence" level="" color="#EB5757" icon="🚨" items={[
        "Instabilité hémodynamique, ischémie persistante, OAP → cardioversion électrique en urgence",
      ]}/>
      <Res title="FA bien tolérée" classe="1ère intention" level="" color="#27AE60" icon="📉" items={[
        "Privilégier le CONTRÔLE DE FRÉQUENCE dans ce contexte aigu",
        "Bêta-bloquant = pivot (bénéfice propre post-SCA), sauf IC décompensée ou choc",
        "Amiodarone = alternative utile, notamment si dysfonction VG",
        "Approche « wait-and-see » possible sans compromission hémodynamique : contrôle de fréquence seul, en attendant une cardioversion spontanée",
      ]}/>
      <Info title="Pièges spécifiques au SCA" color="#EB5757">
        Vernakalant IV CONTRE-INDIQUÉ en cas de SCA récent (ainsi qu'en ICFEr et rétrécissement aortique sévère). Flécaïnide et propafénone contre-indiqués (cardiopathie ischémique). Prudence avec les inhibiteurs calciques bradycardisants (diltiazem/vérapamil) si dysfonction VG.
      </Info>
    </div>);

    case "aoc": return (<div>
      <Res title="Décider l'anticoagulation au long cours" classe="Principe" level="" color={c} icon="🎯" items={[
        "La décision suit le risque thromboembolique individuel (CHA₂DS₂-VA), INDÉPENDAMMENT du retour ou non en rythme sinusal",
        "Une FA de novo du SCA n'est PAS bénigne : réévaluer le score et anticoaguler au long cours dans la majorité des cas",
        "Ne pas se rassurer faussement d'un retour spontané en rythme sinusal pour interrompre l'anticoagulation",
      ]}/>
      <SeeAlso items={[{ label:"FA — Anticoagulation", icon:"💊", color:"#A267D9", target:{ kind:"fa", topicKey:"fa_aoc" } }]}/>
    </div>);

    case "synthese": return (<div>
      <Sec title="Résumé pour les 48 premières heures" color={c}/>
      <Res title="En pratique" classe="Synthèse" level="" color={c} icon="⚡" items={[
        "Antithrombotique : trithérapie AOD + aspirine + clopidogrel (aspirine arrêtée en premier à ≤ 1 semaine, extensible à 1 mois si haut risque ischémique)",
        "Rythme : contrôle de fréquence par bêta-bloquant (ou amiodarone) si bien tolérée ; cardioversion électrique si instable",
        "Ne PAS utiliser vernakalant, flécaïnide ni propafénone",
        "Anticoagulation au long cours décidée sur le CHA₂DS₂-VA, pas sur le retour en rythme sinusal",
        "AOD préféré à l'AVK · clopidogrel préféré aux P2Y12 puissants dans l'association",
      ]}/>
      <Info title="Balance à individualiser" color={c}>
        Les seuils de durée de trithérapie (1 semaine vs 1 mois) relèvent d'un jugement au cas par cas selon la balance ischémie / saignement propre au patient.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Rythmologie — FA : Ablation ───────────────────────────────────
function FAAblContent({ go, step }) {
  const c = FA_TOPICS.fa_abl.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Ablation = option de 1ère ligne (ESC 2024)" color={c}>
        Changement majeur : l'ablation par cathéter (isolation des veines pulmonaires) est désormais en 1ère ligne pour la FA paroxystique, et non plus réservée à l'échec des antiarythmiques.
      </Info>
      <Sec title="Type de FA" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="🟢 FA paroxystique" color={c} onClick={()=>go("paroxysmal")}/>
        <Btn title="🟡 FA persistante" color={c} onClick={()=>go("persistent")}/>
        <Btn title="FA + insuffisance cardiaque (FEVG altérée)" color={c} onClick={()=>go("hf_af")}/>
        <Btn title="Récidive après ablation initiale" color={c} onClick={()=>go("redo")}/>
      </div>
    </div>);
    case "paroxysmal": return <Res title="Ablation par cathéter — 1ère ligne" classe="Classe I" level="A" color="#27AE60" icon="🔥" items={["Isolation des veines pulmonaires (radiofréquence, cryoballon, ou champ pulsé)","Alternative aux antiarythmiques dès la 1ère ligne — décision partagée","Champ pulsé (PFA) : technique émergente, moins de complications collatérales"]}/>;
    case "persistent": return <Res title="Ablation à envisager en 2e ligne" classe="Classe IIa" level="B" color="#C26A1C" icon="🔥" items={["Si échec ou intolérance d'au moins un antiarythmique","Peut être envisagée en 1ère ligne dans certains cas sélectionnés (Classe IIb)","Résultats moins bons qu'en FA paroxystique — discussion bénéfice/risque"]}/>;
    case "hf_af": return <Res title="Ablation pour améliorer le pronostic" classe="Classe I" level="B" color="#27AE60" icon="❤️" items={["FA + ICFEr : ablation recommandée pour réduire mortalité et hospitalisations (CASTLE-AF, CABANA)","À discuter même en l'absence de symptômes majeurs si FEVG améliorable","Réévaluation FEVG à 3–6 mois post-ablation"]}/>;
    case "redo": return <Res title="Nouvelle ablation à envisager" classe="Classe IIa" level="B" color="#C26A1C" icon="🔁" items={["Si amélioration symptomatique après la procédure initiale malgré récidive","Ou après échec de l'isolation initiale des veines pulmonaires","Réduit symptômes, récidives et progression de la FA"]}/>;
    default: return null;
  }
}

// ── Rythmologie — TV et mort subite ──────────────────────────────
function VTContent({ go, step }) {
  const c = RYTHMO_TOPICS.vt.color;
  switch(step) {
    case "start": return (<div>
      <Sec title="Contexte clinique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Tachycardie ventriculaire soutenue — phase aiguë" color="#EB5757" onClick={()=>go("acute_vt")}/>
        <Btn title="Orage rythmique (electrical storm)" color="#EB5757" onClick={()=>go("storm")}/>
        <Btn title="Prévention primaire de la mort subite" color={c} onClick={()=>go("primary_prev")}/>
        <Btn title="TV récidivante / chocs ICD répétés" color={c} onClick={()=>go("recurrent")}/>
      </div>
    </div>);
    case "acute_vt": return (<div>
      <Sec title="TV soutenue — tolérance hémodynamique ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Mal tolérée (choc, syncope, OAP)" color="#EB5757" onClick={()=>go("unstable")}/>
        <Btn title="Bien tolérée" color="#27AE60" onClick={()=>go("stable")}/>
      </div>
    </div>);
    case "unstable": return (<div>
      <Res title="Cardioversion électrique synchronisée immédiate" classe="Classe I" level="C" color="#EB5757" icon="🚨" items={["Choc synchronisé en urgence sous sédation/anesthésie brève si possible","Ne pas retarder par tentative médicamenteuse","Rechercher et corriger cause aiguë (ischémie, trouble électrolytique)"]}/>
      <Info title="Si choc inefficace ou TV/FV sans pouls" color={c}>
        Amiodarone (Cordarone) 300 mg IV en bolus lent (10–20 min), à renouveler si besoin par un bolus de 150 mg — protocole arrêt cardiaque après le 3e choc, en association à la RCP/algorithme ACR.
      </Info>
    </div>);
    case "stable": return (<div>
      <Res title="Cardioversion électrique en 1ère intention" classe="Classe I" level="C" color="#27AE60" icon="⚡" items={["Privilégiée même si bien tolérée hémodynamiquement","Antiarythmique IV (amiodarone) en alternative ou en complément","Rechercher la cause sous-jacente (ischémie, cardiomyopathie)"]}/>
      <Sec title="Posologie — Amiodarone IV (Cordarone), TV stable" color={c}/>
      <Table cols="1fr 1.4fr" rows={[
        ["Dose de charge","150 mg IV sur 10 min (5 mg/kg, max 300 mg, sur 20–60 min selon présentations)"],
        ["Perfusion d'entretien (24h)","900 mg/24h : 300 mg sur les 6 premières heures puis 600 mg sur 18h"],
        ["Dose maximale habituelle","1200 mg/24h"],
        ["Présentation France","Cordarone — ampoule 150 mg/3 mL"],
      ]}/>
      <Info color={c}>Autres antiarythmiques (procaïnamide, flécaïnide IV si cœur sain) à envisager en alternative selon disponibilité — Classe IIa.</Info>
    </div>);
    case "storm": return (<div>
      <Info title="Définition" color="#EB5757">≥ 3 épisodes de TV/FV en 24h nécessitant une intervention (choc ICD ou cardioversion)</Info>
      <Res title="Prise en charge multimodale" classe="Classe I" level="C" color="#EB5757" icon="🚨" items={[
        "Bêtabloquant IV (privilégier non sélectif) + sédation",
        "Amiodarone IV en 1ère ligne antiarythmique",
        "Reprogrammation ICD (zones de détection, ATP)",
        "Ablation de la TV à envisager rapidement si récidive malgré traitement médical",
        "Modulation autonome (bloc stellaire, anesthésie péridurale) ou assistance circulatoire si réfractaire",
      ]}/>
      <Sec title="Posologie — Amiodarone IV, protocole orage rythmique" color={c}/>
      <Table cols="1fr 1.4fr" rows={[
        ["Bolus initial","150 mg IV sur 10 min"],
        ["Perfusion phase 1","1 mg/min pendant 6h"],
        ["Perfusion phase 2","0,5 mg/min pendant 18h"],
        ["Association systématique","Bêtabloquant non sélectif IV (sauf contre-indication hémodynamique)"],
      ]}/>
    </div>);
    case "primary_prev": return (<div>
      <Info title="Renvoi vers le chapitre Insuffisance Cardiaque" color={c}>
        Les indications de DAI en prévention primaire (FEVG ≤ 35% post-GDMT optimal ≥ 3 mois) sont développées dans le chapitre Insuffisance Cardiaque → Dispositifs.
      </Info>
      <Sec title="Cardiomyopathies et canalopathies — particularités" color={c}/>
      <Table cols="1.4fr 1.6fr" rows={[
        ["Pathologie","Élément clé de risque"],
        ["Cardiomyopathie hypertrophique","Score HCM Risk-SCD à 5 ans, épaisseur pariétale, ATCD familial MS"],
        ["Syndrome de Brugada","Test génétique SCN5A, syncope inexpliquée, type ECG spontané"],
        ["QT long congénital","Durée QTc, génotype, ATCD syncope/arrêt cardiaque"],
        ["DAVD (dysplasie arythmogène VD)","Étendue atteinte VD, FEVG, ATCD syncope/TV"],
      ]}/>
      <Info color={c}>IRM cardiaque (rehaussement tardif au gadolinium) et test génétique systématiquement recommandés dans le bilan de risque de ces pathologies.</Info>
    </div>);
    case "recurrent": return (<div>
      <Res title="Ablation de la TV — à privilégier sur l'escalade médicamenteuse" classe="Classe I" level="B" color="#27AE60" icon="🔥" items={[
        "TV monomorphe soutenue récidivante ou chocs ICD répétés malgré amiodarone",
        "Préférée à l'augmentation de dose ou l'ajout d'antiarythmique",
        "Cartographie électroanatomique en centre expert",
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Rythmologie — Tachycardies supraventriculaires (TSV) ─────────
function TSVContent({ go, step }) {
  const c = RYTHMO_TOPICS.tsv.color;
  switch(step) {
    case "start": return (<div>
      <Info title="TSV à QRS fins — démarche générale" color={c}>
        Le traitement aigu d'une TSV mal identifiée reste souvent non spécifique : manœuvres vagales puis escalade pharmacologique.
      </Info>
      <Sec title="Tolérance hémodynamique ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Mal tolérée (choc, OAP, syncope)" color="#EB5757" onClick={()=>go("unstable_svt")}/>
        <Btn title="Bien tolérée" color="#27AE60" onClick={()=>go("vagal")}/>
      </div>
    </div>);
    case "unstable_svt": return <Res title="Cardioversion électrique synchronisée immédiate" classe="Classe I" level="C" color="#EB5757" icon="🚨" items={["Choc synchronisé sous sédation brève si possible","Ne pas retarder par manœuvre ou traitement médicamenteux","Énergie plus faible que pour la TV (souvent 50–100 J biphasique)"]}/>;
    case "vagal": return (<div>
      <Res title="Manœuvres vagales — 1ère étape" classe="Classe I" level="B" color="#27AE60" icon="🤚" items={[
        "Manœuvre de Valsalva modifiée (position semi-allongée puis décubitus + élévation des jambes) — taux de succès supérieur à la Valsalva standard",
        "Massage sino-carotidien (après élimination d'un souffle carotidien, sujet jeune sans athérome)",
        "Réflexe du plongeur (immersion faciale eau froide) chez l'enfant",
      ]}/>
      <Arr color={c}/>
      <Btn title="Échec des manœuvres vagales → traitement pharmacologique" color={c} onClick={()=>go("adenosine")}/>
    </div>);
    case "adenosine": return (<div>
      <Res title="Adénosine — traitement de 1ère intention" classe="Classe I" level="B" color="#27AE60" icon="💉" items={[
        "Sous monitorage ECG continu, en milieu équipé pour réanimation",
        "Injection en bolus IV flash (1–2 sec) suivie d'un rinçage rapide au sérum physiologique (10–20 mL)",
        "Bras perfusé surélevé immédiatement après l'injection",
      ]}/>
      <Sec title="Posologie — escalade de dose" color={c}/>
      <Table cols="1fr 1fr 1.3fr" rows={[
        ["Dose","Adénosine (Krenosin)","ATP (Striadyne)"],
        ["1ère injection","6 mg IV flash","10 mg IV flash"],
        ["2e injection (si échec, +1–2 min)","12 mg IV flash","20 mg IV flash"],
        ["3e injection (selon protocoles)","12 mg IV flash","—"],
      ]}/>
      <Info title="Contre-indications" color="#EB5757">
        Asthme sévère/BPCO avec bronchospasme, syndrome de pré-excitation (WPW) avec FA associée documentée ou suspectée, BAV de haut degré sans pacemaker, syndrome du QT long. Effets attendus transitoires (10–20 sec) : flush, oppression thoracique, dyspnée brève — à prévenir le patient.
      </Info>
      <Info title="Toujours enregistrer un tracé ECG continu pendant l'injection" color={c}>
        L'adénosine n'est pas qu'un traitement — c'est aussi un outil diagnostique majeur en bloquant transitoirement le nœud AV (10–20 sec).
      </Info>
      <Arr color={c}/>
      <Btn title="Interpréter la réponse à l'injection" color={c} onClick={()=>go("interpret")}/>
    </div>);
    case "interpret": return (<div>
      <Sec title="Que montre le tracé pendant/après l'injection ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Arrêt brutal de la tachycardie, retour en rythme sinusal" color="#27AE60" onClick={()=>go("resp_terminate")}/>
        <Btn title="Ralentissement transitoire démasquant une activité atriale rapide régulière (ondes en dents de scie)" color={c} onClick={()=>go("resp_flutter")}/>
        <Btn title="Ralentissement transitoire démasquant une activité atriale rapide irrégulière/anarchique" color={c} onClick={()=>go("resp_af")}/>
        <Btn title="Ralentissement démasquant une onde P de morphologie anormale puis reprise de la tachycardie" color={c} onClick={()=>go("resp_at")}/>
        <Btn title="Aucun effet visible (pas de flush, pas de ralentissement)" color="#C26A1C" onClick={()=>go("resp_none")}/>
        <Btn title="Apparition d'une FA pré-excitée à QRS larges irréguliers" color="#EB5757" onClick={()=>go("resp_wpw_af")}/>
      </div>
    </div>);
    case "resp_terminate": return (<div>
      <Res title="Diagnostic le plus probable : TRIN (Bouveret) ou TRAV orthodromique" classe="Diagnostic" color="#27AE60" icon="✅" items={[
        "L'arrêt brutal confirme une réentrée incluant le nœud AV dans le circuit",
        "TRIN (tachycardie par réentrée intranodale) = mécanisme le plus fréquent — pas de voie accessoire",
        "TRAV orthodromique = réentrée via une voie accessoire (rechercher une pré-excitation sur l'ECG de base en rythme sinusal — onde delta, PR court)",
      ]}/>
      <Info color={c}>Reprise rapide de la tachycardie après arrêt transitoire = récidive précoce possible, fréquente et sans gravité — répéter manœuvre vagale ou orienter vers traitement de fond.</Info>
      <Sec title="Orientation ultérieure" color={c}/>
      <div style={{ background:CARD, borderRadius:8, padding:"10px 13px", border:`1px solid ${BDR}` }}>
        <ul style={{ margin:0, paddingLeft:16, color:MUT, fontSize:12 }}>
          <li>ECG 12 dérivations post-critique pour rechercher une pré-excitation</li>
          <li>Discuter ablation par cathéter en cas de récidives (curative dans &gt; 95% des cas pour TRIN/TRAV)</li>
          <li>Traitement de fond (bêtabloquant, inhibiteur calcique) si ablation non souhaitée/différée</li>
        </ul>
      </div>
    </div>);
    case "resp_flutter": return (<div>
      <Res title="Diagnostic démasqué : Flutter atrial" classe="Diagnostic" color={c} icon="🔍" items={[
        "Ondes F en dents de scie, typiquement ~300/min, démasquées par le bloc AV transitoire",
        "Conduction habituelle 2:1 (FC ~150/min) masquant les ondes F en tachycardie de base",
        "L'adénosine ne réduit pas le flutter — ralentit seulement la conduction AV pour révéler les ondes F",
      ]}/>
      <Info title="Prise en charge" color={c}>
        Si persistant et mal toléré : cardioversion électrique. Si bien toléré : contrôle de fréquence (bêtabloquant/inhibiteur calcique) + anticoagulation selon CHA₂DS₂-VA (même risque thromboembolique que la FA). Ablation de l'isthme cavo-tricuspide = traitement curatif de référence pour le flutter typique.
      </Info>
    </div>);
    case "resp_af": return (<div>
      <Res title="Diagnostic démasqué : Fibrillation Atriale" classe="Diagnostic" color={c} icon="🔍" items={[
        "Activité atriale rapide, irrégulière et anarchique, démasquée par le ralentissement transitoire de la conduction AV",
        "Absence d'ondes P organisées — trémulations de la ligne de base",
      ]}/>
      <Info color={c}>→ Orientation vers le chapitre Fibrillation Atriale (Diagnostic, anticoagulation selon CHA₂DS₂-VA, contrôle FC/rythme).</Info>
    </div>);
    case "resp_at": return (<div>
      <Res title="Diagnostic probable : Tachycardie Atriale Focale (TAF)" classe="Diagnostic" color={c} icon="🔍" items={[
        "Onde P de morphologie différente de la P sinusale, précédant chaque QRS, persistant malgré le bloc AV transitoire",
        "Le foyer atrial ectopique ne dépend pas du nœud AV pour s'auto-entretenir — d'où la persistance après adénosine",
        "Diagnostic différentiel parfois difficile avec le flutter atypique sans exploration électrophysiologique",
      ]}/>
      <Info title="Prise en charge" color={c}>
        Bêtabloquant ou inhibiteur calcique en 1ère intention pour le contrôle de fréquence/rythme. Ablation par cathéter du foyer si récidivante ou symptomatique, avec bon taux de succès.
      </Info>
    </div>);
    case "resp_none": return (<div>
      <Res title="Absence de réponse — causes à évoquer" classe="À vérifier" color="#C26A1C" icon="❌" items={[
        "Erreur technique la plus fréquente : injection trop lente, voie veineuse distale, rinçage insuffisant ou trop lent",
        "Vérifier l'absence d'effet indésirable (flush, oppression) — son absence signe souvent que le produit n'a pas atteint la circulation centrale",
        "Plus rarement : tachycardie ventriculaire hautement septale mimant une TSV",
      ]}/>
      <Info title="Conduite à tenir" color={c}>
        Réinjecter à dose supérieure avec technique optimisée (voie proximale, gros calibre, rinçage rapide et franc) avant de conclure à un échec réel. Si échec confirmé après technique correcte → passer aux inhibiteurs calciques/bêtabloquant IV.
      </Info>
      <Arr color={c}/>
      <Btn title="Échec confirmé → traitement alternatif" color={c} onClick={()=>go("calcium_bb")}/>
    </div>);
    case "resp_wpw_af": return (<div>
      <Info title="Situation à risque" color="#EB5757">
        L'adénosine peut précipiter une FA chez un patient porteur d'une voie accessoire (WPW), avec conduction antérograde rapide via la voie accessoire — risque de dégénérescence en FV.
      </Info>
      <Res title="Conduite à tenir en urgence" classe="Urgence" color="#EB5757" icon="🚨" items={[
        "Cardioversion électrique synchronisée immédiate si mauvaise tolérance ou QRS très larges/rapides",
        "Éviter absolument : digoxine, inhibiteurs calciques, bêtabloquants IV — risque d'accélération de la conduction par la voie accessoire",
        "Si stable : antiarythmique de classe I (flécaïnide, procaïnamide) à discuter avec un rythmologue",
      ]}/>
      <Info title="Orientation ultérieure" color={c}>
        Ablation de la voie accessoire fortement recommandée après stabilisation — traitement curatif de référence du WPW symptomatique à haut risque.
      </Info>
    </div>);
    case "calcium_bb": return (<div>
      <Sec title="Alternative — inhibiteurs calciques ou bêtabloquant IV" color={c}/>
      <Table cols="1fr 1fr 1.3fr" rows={[
        ["DCI","Nom commercial","Posologie IV"],
        ["Diltiazem","Tildiem","0,25 mg/kg IV lente sur 2 min (puis 0,35 mg/kg si besoin)"],
        ["Vérapamil","Isoptine","5–10 mg IV lente sur 2 min"],
        ["Esmolol","Brevibloc","Bolus 500 µg/kg sur 1 min puis perfusion 50–200 µg/kg/min"],
      ]}/>
      <Info title="Indications préférentielles" color={c}>
        Inhibiteurs calciques (diltiazem/vérapamil) à privilégier si forte suspicion de réentrée intranodale (TRIN), notamment chez le sujet âgé ou fragile — meilleure tolérance que l'adénosine. Esmolol = alternative si inhibiteur calcique contre-indiqué (FEVG altérée).
      </Info>
      <Info title="Contre-indications" color="#EB5757">
        Diltiazem/vérapamil contre-indiqués si FEVG altérée, pré-excitation (WPW) avec FA, ou bêtabloquant IV déjà administré (risque de bloc/asystolie). Ne jamais associer vérapamil/diltiazem IV à un bêtabloquant IV.
      </Info>
    </div>);
    default: return null;
  }
}
// ── Rythmologie — Bradycardie / Stimulation cardiaque ────────────
function BradyContent({ go, step }) {
  const c = RYTHMO_TOPICS.brady.color;
  switch(step) {
    case "start": return (<div>
      <Btn title="Bradycardie aiguë mal tolérée (garde)" color="#EB5757" onClick={()=>go("acute")}/>
      <div style={{ height:8 }}/>
      <Sec title="Mécanisme / indications de stimulation" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Dysfonction sinusale" color={c} onClick={()=>go("snd")}/>
        <Btn title="Bloc auriculo-ventriculaire (BAV)" color={c} onClick={()=>go("avb")}/>
        <Btn title="Syncope réflexe / vasovagale" color={c} onClick={()=>go("reflex")}/>
        <Btn title="Bloc de branche + syncope inexpliquée" color={c} onClick={()=>go("bbb")}/>
        <Btn title="Exploration électrophysiologique (EEP)" color={c} onClick={()=>go("eep")}/>
      </div>
    </div>);
    case "acute": return (<div>
      <Info title="Bradycardie mal tolérée — urgence" color="#EB5757">
        Signes de mauvaise tolérance : hypotension/choc, troubles de conscience/syncope, angor, insuffisance cardiaque aiguë, pauses ou échappement ventriculaire lent. Rechercher et traiter une cause réversible en parallèle.
      </Info>
      <Sec title="1 — Traitement médicamenteux (paliers)" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Médicament","Posologie IV"],
        ["Atropine (1ère intention)","0,5 mg IV, répétable toutes les 3–5 min (max 3 mg)"],
        ["Isoprénaline (Isuprel)","0,02–0,06 mg bolus puis 0,5–10 µg/min IVSE en titration"],
        ["Adrénaline","2–10 µg/min IVSE si échec (surtout si hypotension/choc)"],
        ["Dopamine","5–20 µg/kg/min (alternative)"],
      ]}/>
      <Info title="Cas particuliers" color={c}>
        Intoxication bêtabloquant → glucagon ± insuline-euglycémie. Intoxication inhibiteur calcique → gluconate de calcium + insuline-euglycémie. Hyperkaliémie → gluconate de Ca + protocole hyperK (cf. dyskaliémies). BAV sur IDM inférieur → souvent atropino-sensible.
      </Info>
      <Sec title="2 — Entraînement électrosystolique (si échec/instabilité)" color={c}/>
      <Res title="Stimulation temporaire" classe="Urgence" color="#EB5757" icon="🔌" items={[
        "Pacing transcutané (patchs) : mesure d'attente immédiate, prévoir sédation/analgésie (inconfortable)",
        "Sonde d'entraînement électrosystolique (SEES) endocavitaire : relais si bradycardie persistante ou récidivante",
        "Indication de SEES : BAV de haut grade/complet mal toléré, échappement lent, pauses symptomatiques réfractaires",
        "Réévaluer le caractère réversible avant toute stimulation définitive",
      ]}/>
      <Info title="Causes réversibles à écarter" color={c}>
        Ischémie/IDM (surtout inférieur), hyperkaliémie et troubles métaboliques, médicaments bradycardisants (bêtabloquants, inhibiteurs calciques, digoxine, amiodarone, ivabradine), hypothyroïdie, hypothermie, hypertonie vagale, infection (Lyme, endocardite avec abcès septal).
      </Info>
    </div>);
    case "snd": return (<div>
      <Res title="Stimulation recommandée" classe="Classe I" level="B" color="#27AE60" icon="🔌" items={[
        "Bradycardie symptomatique documentée et corrélée aux symptômes",
        "Forme bradycardie-tachycardie : stimulation pour permettre le traitement pharmacologique antiarythmique",
        "Incompétence chronotrope symptomatique à l'effort",
      ]}/>
      <Info title="Pas d'indication" color="#EB5757">
        Bradycardie asymptomatique isolée (sauf pauses très prolongées) — pas d'indication de stimulation systématique.
      </Info>
    </div>);
    case "avb": return (<div>
      <Res title="BAV 2e degré Mobitz II, BAV de haut grade, BAV 3e degré" classe="Classe I" level="C" color="#27AE60" icon="🔌" items={[
        "Indication de stimulation même en l'absence de symptômes — pronostique, pas seulement symptomatique",
        "BAV permanent + FA permanente = entité spécifique à traiter comme un BAV de haut grade",
      ]}/>
      <Arr color={c}/>
      <Res title="BAV 1er degré / Mobitz I (Wenckebach)" classe="Classe IIa" level="C" color="#C26A1C" icon="⚖️" items={[
        "Stimulation à envisager seulement si symptomatique ou intervalle PR très prolongé (> 300ms) avec retentissement",
        "Pas d'indication systématique si asymptomatique",
      ]}/>
    </div>);
    case "reflex": return (<div>
      <Res title="Stimulation à envisager" classe="Classe IIa" level="B" color="#C26A1C" icon="😵" items={[
        "Âge > 40 ans, syncopes sévères récurrentes et imprévisibles",
        "Pauses asystoliques documentées (spontanées ou au massage sino-carotidien/tilt test)",
        "Bénéfice limité chez le sujet jeune — privilégier mesures non pharmacologiques en 1ère intention",
      ]}/>
    </div>);
    case "bbb": return (<div>
      <Info title="Démarche diagnostique" color={c}>
        Bloc bifasciculaire + syncope inexpliquée après bilan non invasif négatif → exploration électrophysiologique (EEP) ou Holter implantable selon le contexte.
      </Info>
      <Res title="Stimulation selon résultat EEP/Holter implantable" classe="Classe I" level="B" color="#27AE60" icon="🔌" items={[
        "Intervalle HV ≥ 70ms ou bloc infra-hissien démontré → stimulation",
        "Stimulation empirique possible en cas de syncope récidivante à haut risque sans diagnostic certain",
      ]}/>
    </div>);
    case "eep": return (<div>
      <Info title="Exploration électrophysiologique (EEP)" color={c}>
        Réservée (ESC 2021) au bloc bifasciculaire avec syncope inexpliquée après bilan non invasif négatif, ou quand la cause de bradycardie n'est pas écartée par les tests non invasifs. Évalue la conduction (fonction sinusale, conduction AV nodale et infra-nodale).
      </Info>
      <Sec title="Conduction infra-nodale (système His-Purkinje)" color={c}/>
      <Table cols="1.2fr 1.4fr" rows={[
        ["Paramètre","Valeur / seuil pathologique"],
        ["Intervalle HV (normal)","35–55 ms"],
        ["HV allongé","> 55–70 ms (atteinte infra-hissienne)"],
        ["HV ≥ 70 ms","Seuil retenu → indication de stimulation (Classe I) si syncope + BBB"],
        ["HV ≥ 100 ms","Très pathologique, risque élevé de BAV"],
        ["Bloc infra-hissien à la stimulation atriale","2ᵉ/3ᵉ degré intra- ou infra-His lors du pacing atrial incrémentiel → indication de PM"],
      ]}/>
      <Sec title="Test pharmacologique de provocation" color={c}/>
      <Res title="Démasquage d'une atteinte infra-nodale" classe="Provocation" color={c} icon="💉" items={[
        "Ajmaline (1 mg/kg), procaïnamide, ou disopyramide en IV",
        "Réponse anormale = allongement marqué du HV ou apparition d'un bloc infra-hissien → indication de stimulation",
        "Démasque une conduction His-Purkinje pathologique non visible à l'état basal",
      ]}/>
      <Sec title="Fonction sinusale" color={c}/>
      <Table cols="1.4fr 1.2fr" rows={[
        ["Paramètre","Seuil pathologique"],
        ["SNRT (temps de récupération sinusale)","> 1500–1600 ms"],
        ["SNRT corrigé (cSNRT = SNRT − cycle de base)","> 525–550 ms"],
        ["Temps de conduction sino-atrial (SACT)","> 125 ms (allongé)"],
      ]}/>
      <Info title="Limites & interprétation" color={c}>
        L'EEP a une bonne spécificité mais une sensibilité limitée : une EEP normale n'exclut PAS un trouble conductif paroxystique intermittent. En cas de forte suspicion clinique malgré une EEP négative, privilégier un Holter implantable (moniteur cardiaque implantable) pour documenter l'événement. La conduction AV nodale (intervalle AH, normal 55–125 ms) est peu prédictive du risque de BAV de haut degré (le pronostic dépend surtout de l'atteinte infra-nodale / HV).
      </Info>
    </div>);
    default: return null;
  }
}
// ── Cardiologie du sport — Dépistage / pré-participation ────────
function ScreeningContent({ go, step }) {
  const c = SPORT_TOPICS.screening.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Objectif (ESC 2020)" color={c}>
        Minimiser le risque d'événement cardiovasculaire à l'effort, en particulier la mort subite, tout en évitant une exclusion sportive inutile (effet délétère propre de la sédentarité).
      </Info>
      <Sec title="Définitions" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Athlète de loisir","Activité physique régulière sans compétition structurée"],
        ["Athlète de compétition","Entraînement systématique + participation à des compétitions officielles"],
      ]}/>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Contenu de l'évaluation pré-participation" color={c} onClick={()=>go("eval")}/>
        <Btn title="Spécificités du sportif > 35 ans (Masters)" color={c} onClick={()=>go("masters")}/>
        <Btn title="Symptômes d'alerte à l'effort" color="#EB5757" onClick={()=>go("alert")}/>
      </div>
    </div>);
    case "eval": return (<div>
      <Res title="Évaluation standard recommandée" classe="Classe I" level="C" color="#27AE60" icon="🩺" items={[
        "Anamnèse personnelle et familiale ciblée (mort subite < 50 ans chez un apparenté au 1er degré, syncope d'effort, cardiopathie connue)",
        "Examen clinique cardiovasculaire complet",
        "ECG 12 dérivations de repos — recommandé chez l'athlète de compétition",
      ]}/>
      <Info title="Place de l'échocardiographie" color={c}>
        Non systématique en dépistage de masse — réalisée en 2ème intention si anomalie clinique/ECG, antécédent familial à risque, ou dans certains programmes nationaux structurés (ex. Italie).
      </Info>
    </div>);
    case "masters": return (<div>
      <Res title="Athlète > 35 ans — évaluation du risque coronarien" classe="Classe IIa" level="C" color="#C26A1C" icon="👴" items={[
        "Évaluation du risque cardiovasculaire global avant reprise/intensification d'une activité vigoureuse",
        "ECG de repos à envisager",
        "Test d'effort à envisager si facteurs de risque multiples ou symptômes, avant sport de haute intensité",
      ]}/>
      <Info color={c}>La coronaropathie devient la cause prédominante de mort subite liée au sport après 35 ans (contre les cardiomyopathies/canalopathies chez le sujet jeune).</Info>
    </div>);
    case "alert": return (<div>
      <Res title="Symptômes nécessitant une évaluation cardiologique avant poursuite" classe="Alerte" color="#EB5757" icon="⚠️" items={[
        "Syncope ou pré-syncope à l'effort (ou juste après)",
        "Douleur thoracique d'effort",
        "Dyspnée disproportionnée par rapport au niveau d'entraînement",
        "Palpitations soutenues ou mal tolérées",
        "Antécédent familial de mort subite inexpliquée < 50 ans",
      ]}/>
      <Info color={c}>Toute syncope d'effort chez un sportif doit être considérée comme cardiaque jusqu'à preuve du contraire — ne jamais banaliser.</Info>
    </div>);
    default: return null;
  }
}

// ── Cardiologie du sport — ECG de l'athlète ──────────────────────
function SportECGContent({ go, step }) {
  const c = SPORT_TOPICS.ecg.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Critères internationaux 2017 (consensus Seattle/International)" color={c}>
        Distinguent les adaptations électriques physiologiques de l'entraînement des anomalies pathologiques nécessitant exploration complémentaire.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Findings normaux (adaptation physiologique)" color="#27AE60" onClick={()=>go("normal")}/>
        <Btn title="Findings limites — exploration au cas par cas" color="#C26A1C" onClick={()=>go("borderline")}/>
        <Btn title="Findings anormaux — exploration systématique" color="#EB5757" onClick={()=>go("abnormal")}/>
      </div>
    </div>);
    case "normal": return (<div>
      <Res title="Variantes considérées normales chez l'athlète" classe="Normal" color="#27AE60" icon="✅" items={[
        "Bradycardie sinusale (jusqu'à 30/min si asymptomatique)",
        "Arythmie sinusale respiratoire",
        "Bloc AV du 1er degré (PR jusqu'à 400ms)",
        "BAV Mobitz I (Wenckebach) nocturne, disparaissant à l'effort",
        "Bloc de branche droit incomplet",
        "Repolarisation précoce / élévation du point J",
        "Hypertrophie VG isolée sur critères de voltage seuls (sans autre anomalie associée)",
        "Inversion de l'onde T en V1-V3 chez le sujet pré-pubère, ou limitée à V1-V2 chez la femme",
      ]}/>
      <Info color={c}>Ces findings ne nécessitent aucune exploration complémentaire en l'absence de symptômes ou d'antécédent familial à risque.</Info>
    </div>);
    case "borderline": return (<div>
      <Res title="Anomalies isolées — exploration seulement si associées" classe="Limite" color="#C26A1C" icon="🔍" items={[
        "Déviation axiale gauche isolée",
        "Dilatation isolée de l'oreillette gauche",
        "Déviation axiale droite isolée",
        "Hypertrophie VD isolée sur critères de voltage",
      ]}/>
      <Info color={c}>Un seul critère "limite" isolé = pas d'exploration. Deux critères "limite" associés = exploration recommandée (bilan échocardiographique).</Info>
    </div>);
    case "abnormal": return (<div>
      <Res title="Anomalies nécessitant exploration systématique" classe="Anormal" color="#EB5757" icon="🔴" items={[
        "Inversion de l'onde T (≥ V3, hors variantes physiologiques ethniques/âge)",
        "Sous-décalage du segment ST",
        "Ondes Q pathologiques",
        "BBG complet",
        "QRS très élargi (≥ 140ms) non typique de BBD",
        "Pré-excitation ventriculaire (PR court + onde delta)",
        "QTc ≥ 470ms (homme) / ≥ 480ms (femme)",
        "Syndrome de Brugada type 1 (spontané ou démasqué)",
        "Arythmie ventriculaire (ESV fréquentes, TV non soutenue)",
        "BAV de haut degré ou complet",
      ]}/>
      <Info title="Conduite à tenir" color={c}>
        Bilan cardiologique complet : échocardiographie, test d'effort, Holter-ECG, ± IRM cardiaque ± test génétique selon orientation clinique. Restriction sportive temporaire à discuter le temps du bilan.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Cardiologie du sport — Cardiomyopathies ──────────────────────
function SportCMPContent({ go, step }) {
  const c = SPORT_TOPICS.cmp.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Principe général" color={c}>
        Décision individualisée et partagée, intégrant le risque de mort subite, le retentissement symptomatique, et l'impact du sport sur la progression de la maladie.
      </Info>
      <Sec title="Cardiomyopathie concernée" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Cardiomyopathie hypertrophique (CMH)" color={c} onClick={()=>go("hcm")}/>
        <Btn title="Cardiomyopathie/dysplasie arythmogène (ACM/DAVD)" color="#EB5757" onClick={()=>go("acm")}/>
        <Btn title="Cardiomyopathie dilatée (CMD)" color={c} onClick={()=>go("dcm")}/>
        <Btn title="Myocardite / péricardite" color={c} onClick={()=>go("myocarditis")}/>
      </div>
    </div>);
    case "hcm": return (<div>
      <Res title="Recommandation individualisée — pas d'exclusion automatique" classe="Classe IIa" level="C" color="#C26A1C" icon="⚖️" items={[
        "Évaluation par une équipe experte en cardiomyopathies/sport",
        "Sports de loisir/bas-modérée intensité généralement autorisés si profil de bas risque",
        "Sports de compétition de haute intensité : décision partagée au cas par cas, non systématiquement interdits (évolution depuis les versions antérieures plus restrictives)",
      ]}/>
      <Info title="Éléments de stratification du risque" color={c}>
        Épaisseur pariétale maximale, gradient obstructif, antécédent familial de mort subite, TV non soutenue au Holter, réponse tensionnelle anormale à l'effort, fibrose en IRM (rehaussement tardif).
      </Info>
    </div>);
    case "acm": return (<div>
      <Res title="Sport de haute intensité contre-indiqué" classe="Classe III" level="C" color="#EB5757" icon="🚫" items={[
        "L'exercice intensif accélère la progression de la maladie et le risque arythmique (preuve solide, y compris chez les porteurs génotype-positifs phénotype-négatifs)",
        "Sport de loisir de faible intensité généralement autorisé",
        "Restriction recommandée même chez les porteurs asymptomatiques de mutation à haut risque (PKP2, DSP, FLNC)",
      ]}/>
    </div>);
    case "dcm": return (<div>
      <Res title="Évaluation individualisée selon sévérité" classe="Classe IIa" level="C" color="#C26A1C" icon="⚖️" items={[
        "FEVG préservée/peu altérée, pas d'arythmie ventriculaire, test d'effort normal → sport possible avec suivi",
        "FEVG sévèrement altérée ou arythmie ventriculaire → restriction aux sports de faible intensité",
        "Mutation LMNA ou FLNC : prudence renforcée, risque arythmique disproportionné par rapport à la FEVG",
      ]}/>
    </div>);
    case "myocarditis": return (<div>
      <Res title="Myocardite aiguë — arrêt sportif complet" classe="Classe III" level="C" color="#EB5757" icon="🚫" items={[
        "Aucune activité sportive pendant la phase aiguë",
        "Réévaluation à 3–6 mois : ECG, échocardiographie, Holter, test d'effort, ± IRM cardiaque",
        "Reprise possible si normalisation de la fonction VG, absence d'arythmie, marqueurs inflammatoires normalisés",
      ]}/>
      <Info color={c}>Péricardite : délai de reprise généralement plus court, fonction de la résolution clinique et biologique (CRP).</Info>
    </div>);
    default: return null;
  }
}

// ── Cardiologie du sport — Arythmies et canalopathies ────────────
function SportRythmoContent({ go, step }) {
  const c = SPORT_TOPICS.rythmo_sport.color;
  switch(step) {
    case "start": return (<div>
      <Info title="3 principes directeurs (ESC 2020)" color={c}>
        (1) Prévenir les arythmies menaçant le pronostic vital à l'effort ; (2) gérer les symptômes ; (3) éviter que le sport n'accélère la progression de la maladie arythmogène sous-jacente.
      </Info>
      <Sec title="Situation" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Fibrillation atriale chez le sportif" color={c} onClick={()=>go("af_sport")}/>
        <Btn title="Pré-excitation (WPW) découverte fortuite" color={c} onClick={()=>go("wpw")}/>
        <Btn title="ESV fréquentes / TVNS découvertes fortuites" color={c} onClick={()=>go("pvc")}/>
        <Btn title="Syndrome du QT long" color="#EB5757" onClick={()=>go("lqts")}/>
        <Btn title="Syndrome de Brugada" color="#EB5757" onClick={()=>go("brugada")}/>
      </div>
    </div>);
    case "af_sport": return (<div>
      <Res title="Prise en charge" classe="Classe I" level="B" color="#27AE60" icon="🔥" items={[
        "Ablation par cathéter recommandée en 1ère ligne si FA symptomatique récidivante (alternative aux antiarythmiques au long cours)",
        "Activité physique modérée recommandée en prévention (effet protecteur), mais le sport d'endurance de très haut volume est associé à un risque accru de FA",
        "Anticoagulation : sports de contact à éviter pendant le traitement (risque hémorragique traumatique)",
      ]}/>
    </div>);
    case "wpw": return (<div>
      <Info title="Démarche" color={c}>
        Exclure une pré-excitation à haut risque avant autorisation de sport de compétition/haute intensité.
      </Info>
      <Res title="Pré-excitation manifeste + TSV documentée" classe="Classe I" level="C" color="#27AE60" icon="🔥" items={[
        "Ablation de la voie accessoire recommandée — curative",
        "Reprise sportive normale après ablation réussie",
      ]}/>
      <Res title="Pré-excitation asymptomatique, sport de compétition" classe="Classe I" level="C" color="#27AE60" icon="🔬" items={[
        "Exploration électrophysiologique recommandée pour évaluer le risque (période réfractaire de la voie accessoire)",
        "Ablation recommandée si caractéristiques à haut risque identifiées",
      ]}/>
    </div>);
    case "pvc": return (<div>
      <Res title="Bilan systématique si charge significative" classe="Classe I" level="C" color="#27AE60" icon="🔬" items={[
        "≥ 2 ESV sur ECG de repos, ou ≥ 1 ESV chez l'athlète d'endurance de haut niveau → bilan complet",
        "Holter-ECG, test d'effort, échocardiographie ± IRM cardiaque pour exclure cardiopathie sous-jacente",
      ]}/>
      <Res title="Si bilan négatif (cœur structurellement normal)" classe="Classe I" level="C" color="#27AE60" icon="✅" items={[
        "Tous les sports de compétition et de loisir autorisés",
        "Réévaluation périodique recommandée (charge d'ESV pouvant évoluer)",
      ]}/>
    </div>);
    case "lqts": return (<div>
      <Res title="Restriction si QTc très prolongé ou symptomatique" classe="Classe III" level="B" color="#EB5757" icon="🚫" items={[
        "QTc > 500ms (sous bêtabloquant inclus) → sport de compétition/haute intensité non recommandé",
        "QTc génétiquement positif > 470ms (H) / > 480ms (F) → non recommandé en compétition",
        "Antécédent de syncope arythmique ou arrêt cardiaque → restriction renforcée",
      ]}/>
      <Res title="Porteur génotype-positif asymptomatique, QTc non sévèrement prolongé" classe="Classe IIa" level="C" color="#C26A1C" icon="⚖️" items={[
        "Sport possible au cas par cas selon le type génétique (LQT1 = sensible à la nage, LQT2 = sensible aux bruits/stimuli)",
        "Bêtabloquant systématique, éviction des QT-allongeurs, plan d'action en cas de symptôme",
      ]}/>
    </div>);
    case "brugada": return (<div>
      <Res title="Restriction selon profil" classe="Classe III" level="C" color="#EB5757" icon="🚫" items={[
        "Sport d'endurance avec risque d'hyperthermie (température centrale > 39°C) déconseillé même si asymptomatique",
        "Antécédent de syncope arythmique ou arrêt cardiaque ressuscité → restriction stricte, DAI à discuter",
      ]}/>
      <Res title="Asymptomatique, type 1 non spontané/porteur génotype-positif phénotype-négatif" classe="Classe IIb" level="C" color="#F2C94C" icon="⚖️" items={[
        "Autres types de sport envisageables selon évaluation individuelle",
        "Éviter la fièvre non traitée, l'hyperthermie, certains médicaments contre-indiqués (liste Brugadadrugs.org)",
      ]}/>
    </div>);
    default: return null;
  }
}
// ── Hypertension artérielle — Diagnostic ─────────────────────────
function HTADiagContent({ go, step }) {
  const c = HTA_TOPICS.diag.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Nouvelle classification simplifiée — ESC 2024" color={c}>
        Remplace les anciennes catégories (optimale, normale, normale haute, grades 1-3) par 3 catégories simples basées sur la PA de consultation.
      </Info>
      <Table cols="1.6fr 1fr" rows={[
        ["Catégorie","PA de consultation"],
        ["Non élevée","< 120/70 mmHg"],
        ["PA élevée","120–139/70–89 mmHg"],
        ["Hypertension","≥ 140/90 mmHg"],
      ]}/>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Confirmation diagnostique" color={c} onClick={()=>go("confirm")}/>
        <Btn title="Automesure / MAPA" color={c} onClick={()=>go("home")}/>
      </div>
    </div>);
    case "confirm": return (<div>
      <Res title="Confirmation recommandée avant traitement" classe="Classe I" level="C" color="#27AE60" icon="📏" items={[
        "PA élevée en consultation → confirmer par automesure (AMT) ou MAPA avant de classer définitivement",
        "Hypertension (≥ 140/90) → confirmation rapide recommandée (AMT/MAPA ou répétition des mesures)",
        "Technique de mesure standardisée : position assise, repos 5 min, brassard adapté, moyenne de 2 mesures",
      ]}/>
    </div>);
    case "home": return (<div>
      <Table cols="1.6fr 1fr" rows={[
        ["Méthode","Seuil diagnostique d'HTA"],
        ["Automesure (AMT) — moyenne","≥ 135/85 mmHg"],
        ["MAPA — moyenne diurne","≥ 135/85 mmHg"],
        ["MAPA — moyenne nocturne","≥ 120/70 mmHg"],
        ["MAPA — moyenne 24h","≥ 130/80 mmHg"],
      ]}/>
      <Info color={c}>L'automesure et la MAPA sont préférées à la mesure de consultation isolée pour le diagnostic — meilleure valeur prédictive des événements cardiovasculaires, dépistage de l'effet blouse blanche et de l'HTA masquée.</Info>
    </div>);
    default: return null;
  }
}

// ── Hypertension artérielle — Bilan initial ──────────────────────
function HTABilanContent({ go, step }) {
  const c = HTA_TOPICS.bilan.color;
  switch(step) {
    case "start": return (<div>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Bilan biologique de base" color={c} onClick={()=>go("bio")}/>
        <Btn title="Recherche d'atteinte d'organe cible" color={c} onClick={()=>go("toh")}/>
        <Btn title="Quand rechercher une cause secondaire ?" color={c} onClick={()=>go("secondary")}/>
      </div>
    </div>);
    case "bio": return (<div>
      <Res title="Bilan de 1ère intention systématique" classe="Classe I" level="C" color="#27AE60" icon="🧪" items={[
        "Ionogramme sanguin, créatinine + DFG estimé",
        "Glycémie à jeun, bilan lipidique complet",
        "Bandelette urinaire ± rapport albuminurie/créatininurie",
        "ECG 12 dérivations",
      ]}/>
    </div>);
    case "toh": return (<div>
      <Res title="Recherche d'atteinte des organes cibles" classe="Classe I" level="C" color="#27AE60" icon="🫀" items={[
        "Cœur : ECG systématique ; échocardiographie si signes ECG d'HVG ou suspicion clinique",
        "Rein : DFG estimé + albuminurie",
        "Vaisseaux : fond d'œil si HTA sévère ; recherche de souffles vasculaires",
        "Cerveau : évaluation cognitive chez le sujet âgé si symptomatologie",
      ]}/>
    </div>);
    case "secondary": return (<div>
      <Res title="Signes d'alerte pour HTA secondaire" classe="À rechercher" color="#C26A1C" icon="🔍" items={[
        "Âge de survenue jeune (< 40 ans) sans antécédent familial, ou sévère d'emblée",
        "HTA résistante (cf. chapitre dédié)",
        "Hypokaliémie spontanée",
        "Souffle abdominal (sténose artère rénale)",
        "Aggravation brutale d'une HTA jusque-là stable",
        "Symptomatologie évocatrice : triade phéochromocytome, syndrome de Cushing, SAOS",
      ]}/>
      <Info color={c}>En l'absence de ces signes d'alerte, un bilan étiologique extensif n'est pas recommandé en routine — l'HTA essentielle reste la cause prédominante (&gt; 90%).</Info>
    </div>);
    default: return null;
  }
}

// ── Hypertension artérielle — Traitement ─────────────────────────
function HTATreatmentContent({ go, step }) {
  const c = HTA_TOPICS.treatment.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Cible tensionnelle intensifiée — ESC 2024" color={c}>
        Changement de paradigme : cible systolique 120–129 mmHg pour la majorité des patients traités, contre 130-139 auparavant.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Cibles tensionnelles" color={c} onClick={()=>go("targets")}/>
        <Btn title="Mesures hygiéno-diététiques" color={c} onClick={()=>go("lifestyle")}/>
        <Btn title="Stratégie médicamenteuse" color={c} onClick={()=>go("drugs")}/>
      </div>
    </div>);
    case "targets": return (<div>
      <Table cols="1.8fr 1fr" rows={[
        ["Population","Cible PAS"],
        ["Majorité des patients traités","120–129 mmHg"],
        ["Si intolérance au traitement intensif","Aussi bas que raisonnablement atteignable (ALARA)"],
        ["Âge ≥ 85 ans, fragilité modérée-sévère","Cible assouplie — ALARA"],
        ["Hypotension orthostatique symptomatique","Cible assouplie — ALARA"],
        ["Espérance de vie limitée","Cible assouplie — individualisée"],
      ]}/>
      <Info color={c}>La cible de 120-129 mmHg est un objectif de PA systolique de consultation, à atteindre progressivement et sous surveillance de la tolérance (hypotension, fonction rénale, kaliémie).</Info>
    </div>);
    case "lifestyle": return (<div>
      <Res title="Mesures recommandées chez tout hypertendu" classe="Classe I" level="A" color="#27AE60" icon="🥗" items={[
        "Réduction de l'apport sodé (< 5g de sel/jour)",
        "Augmentation de l'apport potassique (sauf insuffisance rénale/hyperkaliémie)",
        "Activité physique régulière adaptée",
        "Réduction pondérale si surpoids/obésité",
        "Réduction de la consommation d'alcool",
        "Arrêt du tabac",
      ]}/>
    </div>);
    case "drugs": return (<div>
      <Info title="Changement majeur — bêtabloquants" color={c}>
        Les bêtabloquants ne sont plus recommandés en 1ère ligne pour l'HTA non compliquée — réservés aux indications spécifiques (coronaropathie, IC, FA, post-IDM, grossesse).
      </Info>
      <Sec title="Posologies — 4 classes de 1ère ligne (spécialités en France)" color={c}/>
      <Table cols="0.9fr 0.9fr 1fr 1.1fr" rows={[
        ["DCI","Nom commercial","Dose initiale","Dose cible/max"],
        ["Ramipril (IEC)","Triatec","2,5 mg/j","10 mg/j"],
        ["Périndopril (IEC)","Coversyl","2,5–5 mg/j","10 mg/j"],
        ["Losartan (ARA2)","Cozaar","50 mg/j","100 mg/j"],
        ["Valsartan (ARA2)","Tareg","80 mg/j","320 mg/j"],
        ["Amlodipine (ICa)","Amlor","5 mg/j","10 mg/j"],
        ["Indapamide (diurétique)","Fludex LP","1,5 mg/j","1,5 mg/j (dose unique habituelle)"],
        ["Hydrochlorothiazide","Esidrex","12,5–25 mg/j","25 mg/j"],
      ]}/>
      <Res title="Bithérapie d'emblée recommandée" classe="Classe I" level="A" color="#27AE60" icon="💊" items={[
        "Privilégier une association fixe de 2 classes dès l'initiation chez la majorité des patients",
        "Améliore l'observance et l'efficacité par rapport à la monothérapie titrée",
        "Monothérapie réservée aux formes très légères ou au sujet très âgé/fragile",
      ]}/>
      <Sec title="Exemples d'associations fixes disponibles en France" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Nom commercial","Composition"],
        ["Coveram","Périndopril + amlodipine"],
        ["Triplixam","Périndopril + indapamide + amlodipine (trithérapie fixe)"],
        ["CoAprovel","Irbésartan + hydrochlorothiazide"],
        ["Exforge","Valsartan + amlodipine"],
      ]}/>
      <Res title="Spironolactone — HTA résistante" classe="Classe I" level="B" color="#27AE60" icon="🧂" items={[
        "À envisager en 4e ligne si PA non contrôlée sous trithérapie optimale",
        "Posologie : 25 mg/j initial, jusqu'à 50 mg/j (Aldactone, génériques)",
        "Cf. chapitre HTA résistante pour le détail",
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Hypertension artérielle — HTA résistante / secondaire ────────
function HTAResistantContent({ go, step }) {
  const c = HTA_TOPICS.resistant.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Définition de l'HTA résistante" color={c}>
        PA non contrôlée malgré 3 classes antihypertensives à dose optimale incluant un diurétique (dont un thiazidique/apparenté), après confirmation de l'observance et exclusion d'un effet blouse blanche (AMT/MAPA).
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Étapes avant de conclure à une résistance" color={c} onClick={()=>go("checklist")}/>
        <Btn title="Bilan de 1ère intention" color={c} onClick={()=>go("workup")}/>
        <Btn title="4e ligne thérapeutique" color={c} onClick={()=>go("fourth_line")}/>
        <Btn title="Causes secondaires à évoquer" color={c} onClick={()=>go("causes")}/>
      </div>
    </div>);
    case "checklist": return (<div>
      <Res title="Avant de retenir une HTA résistante vraie" classe="À vérifier" color="#C26A1C" icon="✅" items={[
        "Confirmer l'observance thérapeutique (souvent la cause la plus fréquente de pseudo-résistance)",
        "Exclure un effet blouse blanche par AMT/MAPA",
        "Vérifier la technique de mesure et l'adéquation du brassard",
        "Rechercher une interférence médicamenteuse (AINS, corticoïdes, contraceptifs oraux, vasoconstricteurs nasaux)",
        "Évaluer l'apport sodé et la consommation d'alcool",
      ]}/>
    </div>);
    case "workup": return (<div>
      <Info title="Objectif" color={c}>
        Une fois la résistance vraie confirmée (checklist validée), ce bilan systématique de 1ère intention recherche un retentissement et dépiste les causes secondaires les plus fréquentes, avant d'orienter vers des explorations spécialisées ciblées.
      </Info>
      <Sec title="Biologie" color={c}/>
      <Table cols="1.6fr 1.4fr" rows={[
        ["Examen","Objectif"],
        ["Ionogramme sanguin (kaliémie+++)","Dépister une hypokaliémie spontanée (hyperaldostéronisme)"],
        ["Créatinine + DFG estimé","Fonction rénale, retentissement, cause rénale"],
        ["Glycémie à jeun, bilan lipidique","Risque cardiovasculaire global"],
        ["TSH","Dysthyroïdie (cause associée fréquente)"],
        ["Bandelette urinaire ± rapport albuminurie/créatininurie","Atteinte rénale, néphropathie sous-jacente"],
      ]}/>
      <Sec title="Imagerie et explorations fonctionnelles" color={c}/>
      <Table cols="1.6fr 1.4fr" rows={[
        ["Examen","Objectif"],
        ["ECG 12 dérivations","Recherche d'HVG, séquelle ischémique"],
        ["Échocardiographie","HVG, fonction VG — retentissement cardiaque (cf. rubrique ETT)"],
        ["Fond d'œil","Rétinopathie hypertensive si HTA sévère/ancienne"],
        ["Échographie-Doppler des artères rénales","Dépistage de sténose si souffle abdominal ou OAP flash"],
      ]}/>
      <Sec title="Dépistage ciblé selon orientation clinique" color={c}/>
      <Table cols="1.6fr 1.4fr" rows={[
        ["Examen","Indication"],
        ["Rapport aldostérone/rénine plasmatique","1ère intention si hypokaliémie ou forte suspicion d'hyperaldostéronisme"],
        ["Polygraphie/polysomnographie ventilatoire","Si ronflements, somnolence diurne, obésité, périmètre cervical élevé"],
        ["Métanéphrines plasmatiques/urinaires","Si triade céphalées-palpitations-sueurs ou HTA paroxystique"],
      ]}/>
      <Info color={c}>Ce bilan de débrouillage est réalisable en médecine de ville/cardiologie générale ; les explorations hormonales et l'imagerie surrénalienne de 2e intention relèvent d'un avis spécialisé (endocrinologie, néphrologie).</Info>
    </div>);
    case "fourth_line": return (<div>
      <Res title="Spironolactone en 4e ligne" classe="Classe I" level="B" color="#27AE60" icon="🧂" items={[
        "Traitement de choix si DFG et kaliémie le permettent (PATHWAY-2)",
        "Surveillance kaliémie/créatinine rapprochée à l'instauration",
        "Alternative si intolérance : bêtabloquant, alpha-bloquant, ou autre diurétique",
      ]}/>
    </div>);
    case "causes": return (<div>
      <Sec title="Principales causes secondaires à évoquer" color={c}/>
      <Table cols="1.4fr 1.6fr" rows={[
        ["Cause","Élément d'orientation"],
        ["Sténose de l'artère rénale","Souffle abdominal, IRC, OAP flash récidivants"],
        ["Hyperaldostéronisme primaire","Hypokaliémie spontanée, HTA résistante"],
        ["SAOS","Ronflements, somnolence diurne, obésité"],
        ["Phéochromocytome/paragangliome","Triade céphalées-palpitations-sueurs, HTA paroxystique"],
        ["Maladie rénale parenchymateuse","Protéinurie, DFG abaissé"],
        ["Syndrome de Cushing","Morphotype évocateur, diabète, ostéoporose"],
      ]}/>
      <Info color={c}>Orientation vers explorations spécialisées (imagerie rénale, dosage rénine/aldostérone, polygraphie ventilatoire, métanéphrines) selon le contexte clinique évocateur.</Info>
    </div>);
    default: return null;
  }
}

// ── Hypertension artérielle — Urgence hypertensive ───────────────
function HTAUrgencyContent({ go, step }) {
  const c = HTA_TOPICS.urgency.color;
  switch(step) {
    case "start": return (<div>
      <Sec title="Atteinte d'organe cible aiguë associée ?" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Oui — urgence hypertensive vraie" color="#EB5757" onClick={()=>go("true_emergency")}/>
        <Btn title="🟡 Non — poussée hypertensive simple" color="#B5790F" onClick={()=>go("simple")}/>
      </div>
    </div>);
    case "true_emergency": return (<div>
      <Info title="Définition" color="#EB5757">
        PA très élevée (typiquement &gt; 180/120 mmHg) associée à une atteinte aiguë d'organe cible : encéphalopathie, AVC, SCA, OAP, dissection aortique, éclampsie, micro-angiopathie thrombotique.
      </Info>
      <Res title="Prise en charge en urgence" classe="Classe I" level="C" color="#EB5757" icon="🚨" items={[
        "Hospitalisation, traitement IV en unité de soins intensifs/USIC",
        "Baisse contrôlée et progressive de la PA (sauf dissection aortique et AVC ischémique où les modalités diffèrent)",
        "Objectif général : réduction de ~25% de la PAM dans la 1ère heure, puis prudence",
      ]}/>
      <Sec title="Posologies IV — selon l'organe atteint" color={c}/>
      <Table cols="0.9fr 0.9fr 1.3fr" rows={[
        ["DCI","Nom commercial","Posologie IV / indication préférentielle"],
        ["Nicardipine","Loxen IV","1–5 mg/h en perfusion continue — neurologique, péri-opératoire"],
        ["Labétalol","Trandate IV","Bolus 20–80 mg puis perfusion 0,5–2 mg/min — neurologique, éclampsie"],
        ["Esmolol","Brevibloc","Bolus 500 µg/kg puis perfusion 50–200 µg/kg/min — dissection aortique"],
        ["Dérivés nitrés (nitroglycérine)","Lénitral IV","1–10 mg/h titré — OAP, SCA"],
        ["Urapidil","Eupressyl, Médiatensyl","Bolus 12,5–25 mg puis perfusion 5–40 mg/h — usage général"],
      ]}/>
      <Info title="Cas particuliers" color={c}>
        Dissection aortique : baisse rapide et agressive de la PA (cible PAS 100–120 mmHg) et de la FC (cible &lt; 60 bpm) — bêtabloquant IV (esmolol/labétalol) en 1ère intention, avant tout vasodilatateur seul (risque de tachycardie réflexe aggravant le cisaillement aortique). AVC ischémique aigu : seuils de traitement spécifiques et généralement plus permissifs, sauf si thrombolyse envisagée.
      </Info>
    </div>);
    case "simple": return (<div>
      <Res title="Poussée hypertensive simple — pas d'urgence vitale" classe="Classe I" level="C" color="#27AE60" icon="🩺" items={[
        "Pas d'atteinte d'organe cible aiguë",
        "Baisse progressive de la PA sur plusieurs jours par voie orale — pas de traitement IV",
        "Rechercher et corriger un facteur déclenchant (douleur, anxiété, arrêt de traitement, rétention urinaire)",
        "Ne pas chercher à normaliser la PA en urgence — risque d'hypoperfusion d'organe",
      ]}/>
    </div>);
    default: return null;
  }
}
// ── Cardiomyopathies — Classification ────────────────────────────
function CMPClassifContent({ go, step }) {
  const c = CMP_TOPICS.classif.color;
  switch(step) {
    case "start": return (<div>
      <Info title="ESC 2023 — 1er guideline unifié sur les cardiomyopathies" color={c}>
        Approche phénotypique : décrire d'abord la morphologie/fonction observée à l'imagerie, puis rechercher l'étiologie — le phénotype n'est pas en lui-même un diagnostic final.
      </Info>
      <Sec title="5 phénotypes morpho-fonctionnels" color={c}/>
      <Table cols="0.7fr 1.8fr" rows={[
        ["Phénotype","Définition"],
        ["CMH","Hypertrophie VG non expliquée par les conditions de charge"],
        ["CMD","Dilatation VG + dysfonction systolique non expliquée par charge anormale ou coronaropathie"],
        ["CMNV (NDLVC)","Dysfonction VG et/ou cicatrice myocardique sans dilatation significative"],
        ["CMR","Profil restrictif (remplissage altéré) avec volumes/épaisseurs souvent normaux"],
        ["ACM/DAVD","Atteinte arythmogène prédominant au VD (ou bi-ventriculaire)"],
      ]}/>
      <Info title="Place centrale de l'IRM cardiaque" color={c}>
        Recommandée en Classe I chez le patient pour caractérisation tissulaire (rehaussement tardif, cartographie T1/T2) — élément clé pour orienter vers l'étiologie sous-jacente (génétique, infiltrative, inflammatoire).
      </Info>
      <Sec title="Démarche diagnostique générale" color={c}/>
      <div style={{ background:CARD, borderRadius:8, padding:"10px 13px", border:`1px solid ${BDR}` }}>
        <ul style={{ margin:0, paddingLeft:16, color:MUT, fontSize:12 }}>
          <li>Anamnèse familiale sur 3 générations (mort subite, cardiopathie, implantation de dispositif)</li>
          <li>ECG 12 dérivations + échocardiographie en 1ère intention</li>
          <li>IRM cardiaque pour caractérisation tissulaire</li>
          <li>Conseil génétique et test génétique selon le phénotype et le contexte familial</li>
          <li>Dépistage familial en cascade si variant pathogène identifié</li>
        </ul>
      </div>
    </div>);
    default: return null;
  }
}

// ── Cardiomyopathies — CMH ────────────────────────────────────────
function CMPHCMContent({ go, step }) {
  const c = CMP_TOPICS.hcm.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Définition" color={c}>
        Épaisseur pariétale VG ≥ 15 mm (ou ≥ 13 mm si contexte familial/génétique positif) en l'absence de cause hémodynamique suffisante (HTA, RAC, athlète).
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Bilan de 1ère intention" color={c} onClick={()=>go("workup")}/>
        <Btn title="Obstruction de la chambre de chasse (CMH-O)" color={c} onClick={()=>go("lvoto")}/>
        <Btn title="Stratification du risque de mort subite" color="#EB5757" onClick={()=>go("scd_risk")}/>
        <Btn title="Red flags amylose — quand y penser ?" color="#B5790F" onClick={()=>go("amyloid_flags")}/>
      </div>
    </div>);
    case "amyloid_flags": return (<div>
      <Info title="Amylose cardiaque : une phénocopie à ne pas manquer" color="#B5790F">
        Devant toute « CMH », surtout après 65 ans, penser à l'amylose (ATTR sauvage notamment). Le dépistage est recommandé devant une HVG ≥ 12 mm associée à ≥ 1 red flag. Le vrai piège : attribuer l'hypertrophie à l'HTA ou au vieillissement.
      </Info>
      <Sec title="Red flags cardiaques" color={c}/>
      <Res title="À l'imagerie et l'ECG" classe="Alerte" color="#B5790F" icon="🫀" items={[
        "Discordance ECG/écho : hypertrophie VG à l'écho MAIS QRS de bas voltage (ou voltages non augmentés) à l'ECG",
        "Aspect granité/brillant du myocarde, épaississement des parois libres, du septum interauriculaire et des valves",
        "Épanchement péricardique, dysfonction diastolique, aspect restrictif",
        "Baisse du strain longitudinal avec préservation apicale (« apical sparing », aspect en cocarde)",
        "Rehaussement tardif sous-endocardique diffus et T1/ECV augmentés en IRM",
        "Troubles conductifs (BAV), FA, pseudo-ondes Q de nécrose sans coronaropathie",
      ]}/>
      <Sec title="Red flags EXTRA-cardiaques (les plus utiles !)" color={c}/>
      <Res title="À rechercher systématiquement à l'interrogatoire" classe="Alerte" color="#B5790F" icon="🔎" items={[
        "Syndrome du canal carpien bilatéral (souvent des années avant l'atteinte cardiaque)",
        "Canal lombaire étroit / rupture du tendon du biceps",
        "Neuropathie périphérique, dysautonomie (hypotension orthostatique, troubles digestifs)",
        "Intolérance aux traitements de l'IC (bêtabloquants, IEC — hypotension)",
        "Sténose aortique 'low-flow low-gradient' du sujet âgé (association fréquente AS-ATTR)",
        "Antécédents familiaux (formes héréditaires ATTRv)",
      ]}/>
      <Info title="Conduite" color={c}>
        La présence de red flags doit déclencher le parcours diagnostique de l'amylose (voir chapitre CMR → Amylose cardiaque). Le diagnostic change radicalement le pronostic et l'accès aux traitements spécifiques (tafamidis, etc.).
      </Info>
    </div>);
    case "workup": return (<div>
      <Info title="Objectif" color={c}>
        Confirmer le phénotype, évaluer le retentissement fonctionnel/rythmique, et orienter la recherche étiologique (sarcomérique vs phénocopie) avant avis spécialisé.
      </Info>
      <Sec title="Clinique" color={c}/>
      <Res title="Anamnèse et examen" classe="Classe I" level="C" color="#27AE60" icon="🩺" items={[
        "Anamnèse familiale sur 3 générations (mort subite, CMH, implantation de dispositif, dialyse, surdité)",
        "Recherche de syncope, dyspnée d'effort, douleur thoracique, palpitations",
        "Examen cardiovasculaire (souffle dynamique évocateur d'obstruction, signes extracardiaques)",
      ]}/>
      <Sec title="Examens complémentaires de 1ère intention" color={c}/>
      <Table cols="1.4fr 1.6fr" rows={[
        ["Examen","Objectif"],
        ["ECG 12 dérivations","Quasi-constamment anormal (HVG, ondes Q, repolarisation) — oriente et sert de référence"],
        ["Échocardiographie transthoracique","Mesure de l'épaisseur pariétale, recherche de SAM/obstruction CCVG (repos + Valsalva), fonction diastolique, taille OG"],
        ["Holter-ECG 24-48h","Recherche de TVNS, arythmies atriales (FA), pour la stratification du risque"],
        ["Test d'effort cardio-respiratoire","Réponse tensionnelle à l'effort (facteur de risque de mort subite), capacité fonctionnelle"],
        ["Biologie standard","NFS, iono, créatinine, bilan hépatique, CPK, NT-proBNP, troponine"],
      ]}/>
      <Sec title="Bilan étiologique et familial" color={c}/>
      <Res title="Orientation spécialisée" classe="Classe I" level="B" color="#27AE60" icon="🔬" items={[
        "IRM cardiaque avec rehaussement tardif — caractérisation tissulaire, recherche de fibrose (Classe I)",
        "Conseil génétique et test génétique panel CMH — à proposer systématiquement au cas index",
        "Dépistage en cascade des apparentés du 1er degré si variant pathogène identifié",
        "Recherche de phénocopie si signes d'alerte (amylose, maladie de Fabry, glycogénoses) — cf. rubrique CMR pour les red flags",
      ]}/>
    </div>);
    case "lvoto": return (<div>
      <Info title="Définition de l'obstruction" color={c}>
        Gradient CCVG ≥ 30 mmHg au repos, ou ≥ 50 mmHg après manœuvre de provocation (Valsalva, effort) — souvent par mouvement systolique antérieur de la mitrale (SAM).
      </Info>
      <Res title="Traitement de 1ère ligne — symptomatique" classe="Classe I" level="B" color="#27AE60" icon="💊" items={[
        "Bêtabloquant non vasodilatateur à dose titrée selon tolérance",
        "Vérapamil ou diltiazem si bêtabloquant contre-indiqué/inefficace",
        "Disopyramide en association possible si symptômes persistants",
      ]}/>
      <Sec title="Posologies — 1ère ligne" color={c}/>
      <Table cols="0.9fr 0.9fr 1.2fr" rows={[
        ["DCI","Nom commercial","Posologie"],
        ["Bisoprolol","Cardensiel","1,25–10 mg/j, titration progressive"],
        ["Métoprolol succinate","Seloken LP","25–200 mg/j"],
        ["Vérapamil","Isoptine LP","120–480 mg/j (introduction prudente, surveillance hémodynamique)"],
        ["Diltiazem","Tildiem LP","120–360 mg/j"],
        ["Disopyramide","Rythmodan","300–600 mg/j en association au bêtabloquant"],
      ]}/>
      <Info title="Vérapamil/diltiazem — précaution" color="#EB5757">
        Introduction prudente en cas d'obstruction sévère (risque d'aggravation hémodynamique par effet vasodilatateur) — à débuter en milieu surveillé chez les patients très symptomatiques.
      </Info>
      <Res title="Inhibiteur de la myosine cardiaque (mavacamten)" classe="Classe I" level="B" color="#27AE60" icon="💊" items={[
        "À envisager si symptômes persistants malgré traitement de 1ère ligne, NYHA II-III",
        "Réduit le gradient CCVG et améliore les symptômes (EXPLORER-HCM)",
        "Surveillance échocardiographique de la FEVG nécessaire (risque de baisse excessive)",
      ]}/>
      <Table cols="0.9fr 0.9fr 1.2fr" rows={[
        ["DCI","Nom commercial","Posologie"],
        ["Mavacamten","Camzyos","Dose initiale 5 mg/j, titration selon FEVG/gradient (5→10→15 mg/j), sous surveillance échographique stricte (REMS)"],
      ]}/>
      <Res title="Traitement septal invasif (myectomie/ablation alcoolisée)" classe="Classe I" level="B" color="#27AE60" icon="🔪" items={[
        "Si symptômes sévères réfractaires au traitement médical optimal",
        "Myectomie chirurgicale = référence en centre expert",
        "Ablation septale alcoolisée = alternative selon anatomie et préférence du patient",
      ]}/>
    </div>);
    case "scd_risk": return (<div>
      <Info title="Score HCM Risk-SCD (à 5 ans)" color="#EB5757">
        Intègre : âge, épaisseur pariétale maximale, diamètre OG, gradient CCVG, antécédent familial de mort subite, TVNS au Holter, syncope inexpliquée.
      </Info>
      <Res title="DAI en prévention primaire" classe="Classe I/IIa" level="B" color="#C26A1C" icon="⚡" items={[
        "Risque estimé à 5 ans ≥ 6% → DAI à envisager (Classe IIa)",
        "Risque 4-6% → DAI possible selon facteurs de risque additionnels (Classe IIb)",
        "Risque < 4% → DAI généralement non recommandé en l'absence d'autre facteur",
      ]}/>
      <Res title="DAI en prévention secondaire" classe="Classe I" level="B" color="#27AE60" icon="⚡" items={[
        "Antécédent d'arrêt cardiaque récupéré ou TV soutenue mal tolérée — indication formelle",
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Cardiomyopathies — CMD ────────────────────────────────────────
function CMPDCMContent({ go, step }) {
  const c = CMP_TOPICS.dcm.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Définition" color={c}>
        Dilatation et dysfonction systolique du VG non expliquées par une coronaropathie ou des conditions de charge anormales (HTA, valvulopathie).
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Bilan de 1ère intention" color={c} onClick={()=>go("workup")}/>
        <Btn title="Indications du DAI" color={c} onClick={()=>go("icd")}/>
        <Btn title="Stratification génétique du risque rythmique" color={c} onClick={()=>go("genetics")}/>
      </div>
    </div>);
    case "workup": return (<div>
      <Info title="Objectif" color={c}>
        Confirmer le phénotype, rechercher une cause curable ou réversible, et orienter vers le traitement étiologique en complément du traitement de fond de l'ICFEr.
      </Info>
      <Sec title="Clinique" color={c}/>
      <Res title="Anamnèse et examen" classe="Classe I" level="C" color="#27AE60" icon="🩺" items={[
        "Anamnèse familiale sur 3 générations (CMD, mort subite, implantation de dispositif, troubles de conduction)",
        "Recherche de toxiques : consommation d'alcool, chimiothérapie cardiotoxique (anthracyclines, trastuzumab), cocaïne",
        "Antécédent de myocardite, grossesse récente (cardiomyopathie du péripartum), maladie systémique (connectivite, endocrinopathie)",
      ]}/>
      <Sec title="Examens complémentaires de 1ère intention" color={c}/>
      <Table cols="1.4fr 1.6fr" rows={[
        ["Examen","Objectif"],
        ["ECG 12 dérivations","Troubles de conduction (BBG fréquent), arythmies — oriente notamment vers une cause LMNA si BAV/FA précoces"],
        ["Échocardiographie transthoracique","Diamètres et volumes VG, FEVG (Simpson biplan), géométrie (RWT), IM fonctionnelle associée"],
        ["Holter-ECG 24-48h","Recherche d'arythmies atriales/ventriculaires pour la stratification du risque rythmique"],
        ["Biologie standard","NFS, iono, créatinine, bilan hépatique, ferritine (hémochromatose), TSH, NT-proBNP"],
        ["Coronarographie ou coroscanner","Éliminer une origine ischémique, indispensable avant de retenir le diagnostic de CMD"],
      ]}/>
      <Sec title="Bilan étiologique et familial" color={c}/>
      <Res title="Orientation spécialisée" classe="Classe I" level="B" color="#27AE60" icon="🔬" items={[
        "IRM cardiaque avec rehaussement tardif — caractérisation tissulaire, pattern de fibrose (médio-pariétale évocatrice de cause génétique/inflammatoire)",
        "Conseil génétique et test génétique panel CMD (TTN, LMNA, FLNC, autres) — à proposer systématiquement",
        "Dépistage en cascade des apparentés du 1er degré si variant pathogène identifié",
        "Sérologies virales/bilan inflammatoire si suspicion de myocardite, dosage CPK si suspicion de dystrophinopathie",
      ]}/>
    </div>);
    case "icd": return (<div>
      <Info title="Point clé ESC 2023 — rôle central de la génétique et de l'IRM" color={c}>
        La CMD ne répond pas à un seuil unique de FEVG pour le DAI. La décision intègre le contexte clinique, la génétique moléculaire, et les données IRM (rehaussement tardif), indépendamment du niveau de FEVG.
      </Info>
      <Sec title="Prévention secondaire" color={c}/>
      <Res title="DAI recommandé" classe="Classe I" level="A" color="#27AE60" icon="⚡" items={[
        "Arrêt cardiaque récupéré sur FV ou TV hémodynamiquement instable",
        "TV soutenue documentée entraînant une instabilité hémodynamique ou une syncope",
        "Espérance de vie > 1 an avec bon état fonctionnel",
      ]}/>
      <Sec title="Prévention primaire — CMD sans génotype à haut risque" color={c}/>
      <Res title="Algorithme standard ICFEr" classe="Classe I / Renvoi" color={c} icon="➡️" items={[
        "FEVG ≤ 35% persistante après ≥ 3 mois de traitement médical optimal (TMO)",
        "NYHA II–III malgré TMO",
        "Espérance de vie > 1 an avec bon état fonctionnel",
        "Se référer au chapitre Insuffisance Cardiaque → Dispositifs pour l'algorithme complet (CRT-D, CSDI, etc.)",
      ]}/>
      <Info title="Cas particulier — FEVG améliorée sous TMO" color={c}>
        Si la FEVG remonte au-dessus de 35% sous traitement optimal, le DAI en prévention primaire n'est plus systématiquement indiqué — réévaluer à 3 mois et à 1 an, et tenir compte du génotype avant une éventuelle explantation ou abstention.
      </Info>
      <Sec title="Prévention primaire — génotypes à haut risque arythmique" color={c}/>
      <Info title="Principe ESC 2023" color={c}>
        Pour les variants pathogènes/probablement pathogènes (P/LP) dans les gènes à haut risque, le DAI peut être envisagé même si la FEVG est supérieure à 35%, selon la présence ou non de facteurs de risque additionnels.
      </Info>
      <Table cols="1fr 1.5fr" rows={[
        ["Gène","Particularité du risque"],
        ["LMNA","Risque arythmique disproportionné par rapport à la FEVG. 1er gène reconnu à haut risque, données les plus robustes"],
        ["FLNC","Substitutions gain-de-fonction : phénotype arythmogène prédominant, risque de mort subite précoce"],
        ["DSP (desmoplakin)","Forme avec atteinte ventriculaire gauche prédominante, LGE fréquent et étendu"],
        ["PLN (phospholamban)","Variante p.Arg14del très arythmogène, risque de mort subite dès la phase précoce"],
        ["RBM20","Forme très arythmogène, dilatation et mort subite fréquentes chez le jeune adulte"],
        ["TMEM43","Forme DAVD de type 5, risque très élevé — phénotype parfois CMD"],
      ]}/>
      <Res title="Génotype à haut risque + facteur(s) de risque supplémentaire(s)" classe="Classe IIa" level="C" color="#C26A1C" icon="⚡" items={[
        "DAI à envisager, même si FEVG > 35%",
        "Facteurs de risque additionnels : syncope inexpliquée, TVNS au Holter, LGE significatif à l'IRM cardiaque, dysfonction VD associée",
      ]}/>
      <Res title="Génotype à haut risque SANS facteur de risque supplémentaire" classe="Classe IIb" level="C" color="#B5790F" icon="⚡" items={[
        "DAI peut être envisagé — décision individualisée en centre expert",
        "Discussion risque/bénéfice d'autant plus importante que la FEVG est préservée",
      ]}/>
      <Sec title="Rôle de l'IRM cardiaque dans la décision" color={c}/>
      <Res title="Rehaussement tardif (LGE) = facteur de risque indépendant" classe="Classe IIa" level="B" color="#C26A1C" icon="🔬" items={[
        "LGE significatif (en particulier médio-pariétal ou sous-épicardique) associé à un risque augmenté de TV soutenue/mort subite dans la CMD, indépendamment de la FEVG",
        "Renforce l'indication de DAI y compris chez les patients avec FEVG entre 35 et 50%",
        "IRM recommandée avant toute décision de DAI en prévention primaire en CMD (Classe I ESC 2023)",
      ]}/>
      <Info title="Particularité CRT-D vs DAI seul" color={c}>
        Si le patient a par ailleurs une indication de resynchronisation (CRT) — BBG avec QRS ≥ 130ms + FEVG ≤ 35% — privilégier le CRT-D (resynchronisation + défibrillation) plutôt que le DAI seul. Cf. chapitre Insuffisance Cardiaque → Dispositifs.
      </Info>
    </div>);
    case "genetics": return (<div>
      <Res title="Traitement de fond" classe="Renvoi" color={c} icon="➡️" items={[
        "Traitement pharmacologique = 4 piliers de l'ICFEr — voir chapitre Insuffisance Cardiaque",
        "Bilan étiologique systématique : génétique, toxique (alcool, chimiothérapie), inflammatoire, métabolique",
      ]}/>
      <Sec title="Stratification génétique du risque rythmique" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Gène","Particularité"],
        ["LMNA","Risque arythmique élevé disproportionné par rapport à la FEVG — DAI à discuter même si FEVG modérément altérée"],
        ["FLNC","Profil arythmogène similaire, risque de mort subite précoce"],
        ["TTN (titine)","Cause génétique la plus fréquente de CMD, pronostic généralement plus favorable"],
      ]}/>
      <Info title="Implication clinique" color={c}>
        En présence d'un variant LMNA ou FLNC, le seuil habituel de FEVG ≤ 35% pour le DAI peut ne pas s'appliquer — discussion en centre expert recommandée, le risque arythmique précédant souvent la dysfonction sévère.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Cardiomyopathies — CMR ────────────────────────────────────────
function CMPRCMContent({ go, step }) {
  const c = CMP_TOPICS.rcm.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Définition" color={c}>
        Profil de remplissage restrictif (dysfonction diastolique sévère) avec volumes ventriculaires et épaisseurs pariétales souvent normaux ou modérément augmentés — dilatation biatriale fréquente.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Bilan de 1ère intention" color={c} onClick={()=>go("workup")}/>
        <Btn title="Démarche étiologique" color={c} onClick={()=>go("etiology")}/>
        <Btn title="Amylose cardiaque" color={c} onClick={()=>go("amyloid")}/>
      </div>
    </div>);
    case "workup": return (<div>
      <Info title="Objectif" color={c}>
        Confirmer le profil restrictif, distinguer une péricardite constrictive (cause différentielle curable chirurgicalement), et orienter rapidement vers la recherche étiologique — en particulier l'amylose, fréquemment sous-diagnostiquée.
      </Info>
      <Sec title="Clinique" color={c}/>
      <Res title="Anamnèse et examen" classe="Classe I" level="C" color="#27AE60" icon="🩺" items={[
        "Recherche de signes droits prédominants (œdèmes, ascite, hépatomégalie) souvent au 1er plan",
        "Antécédent de radiothérapie thoracique, maladie systémique (sarcoïdose, amylose, connectivite), exposition toxique",
        "Signes extracardiaques évocateurs d'amylose : canal carpien bilatéral, dysautonomie, neuropathie périphérique",
      ]}/>
      <Sec title="Examens complémentaires de 1ère intention" color={c}/>
      <Table cols="1.4fr 1.6fr" rows={[
        ["Examen","Objectif"],
        ["ECG 12 dérivations","Microvoltage ou discordance voltage/épaisseur pariétale (évocateur d'amylose), troubles de conduction"],
        ["Échocardiographie transthoracique","Profil de remplissage restrictif (E/A élevé, E/e' élevé), dilatation biatriale, épaisseurs pariétales, strain avec 'apical sparing'"],
        ["Biologie standard","NFS, iono, créatinine, bilan hépatique, NT-proBNP (souvent très élevé), troponine"],
        ["Électrophorèse des protéines + immunofixation","Dépistage d'une gammapathie monoclonale (amylose AL)"],
        ["Bilan martial, enzyme de conversion","Orientation hémochromatose, sarcoïdose selon le contexte"],
      ]}/>
      <Sec title="Bilan étiologique et différentiel" color={c}/>
      <Res title="Orientation spécialisée" classe="Classe I" level="B" color="#27AE60" icon="🔬" items={[
        "IRM cardiaque avec cartographie T1/T2 et rehaussement tardif — caractérisation tissulaire de 1ère intention",
        "Scintigraphie osseuse si suspicion d'amylose à transthyrétine (cf. rubrique dédiée)",
        "Cathétérisme cardiaque droit/gauche pour différencier CMR vs péricardite constrictive en cas de doute persistant",
        "Biopsie endomyocardique réservée aux cas non résolus par l'imagerie non invasive",
      ]}/>
    </div>);
    case "etiology": return (<div>
      <Sec title="Causes principales à évoquer" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Catégorie","Exemples"],
        ["Infiltrative","Amylose, sarcoïdose"],
        ["Stockage","Maladie de Fabry, hémochromatose"],
        ["Non infiltrative","Idiopathique, génétique (sarcomérique)"],
        ["Post-radique / fibrose endomyocardique","Antécédent de radiothérapie thoracique"],
      ]}/>
      <Info color={c}>L'IRM cardiaque (cartographie T1, rehaussement tardif) et la scintigraphie osseuse (suspicion d'amylose à transthyrétine) orientent fortement le diagnostic étiologique avant biopsie myocardique si besoin.</Info>
    </div>);
    case "amyloid": return (<div>
      <Info title="Signes évocateurs ('red flags')" color={c}>
        Hypertrophie pariétale disproportionnée par rapport au voltage ECG (discordance), strain longitudinal avec "apical sparing", canal carpien bilatéral, dysautonomie, intolérance aux IEC/bêtabloquants.
      </Info>
      <Res title="Bilan diagnostique" classe="Classe I" level="B" color="#27AE60" icon="🔬" items={[
        "Scintigraphie osseuse (99mTc-DPD/PYP/HMDP) — très sensible et spécifique pour l'amylose à transthyrétine (ATTR) en l'absence de gammapathie",
        "Recherche de gammapathie monoclonale (immunofixation sérique/urinaire, chaînes légères libres) pour exclure une amylose AL",
        "Test génétique TTR pour distinguer forme héréditaire vs sauvage (wild-type)",
      ]}/>
      <Info title="Traitement spécifique ATTR" color={c}>
        Stabilisateurs de la transthyrétine disponibles selon le profil — orientation vers un centre expert en amylose cardiaque pour la prise en charge spécifique et le suivi.
      </Info>
      <Table cols="0.9fr 0.9fr 1.2fr" rows={[
        ["DCI","Nom commercial","Posologie"],
        ["Tafamidis","Vyndaqel","61 mg/j en prise unique (gélule), per os"],
      ]}/>
      <Info title="Accès au traitement" color={c}>
        Prescription initiale hospitalière réservée aux spécialistes, soumise à conditions de prise en charge (ATTR cardiaque symptomatique, stade NYHA I-II principalement selon les données d'AMM).
      </Info>
    </div>);
    default: return null;
  }
}

// ── Cardiomyopathies — ACM/DAVD ──────────────────────────────────
function CMPARVCContent({ go, step }) {
  const c = CMP_TOPICS.arvc.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Définition" color={c}>
        Remplacement fibro-adipeux progressif du myocarde, prédominant au VD (forme classique) ou pouvant toucher le VG (formes arythmogènes biventriculaires/à prédominance gauche).
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Bilan de 1ère intention" color={c} onClick={()=>go("workup")}/>
        <Btn title="Restriction sportive et stratification du risque" color="#EB5757" onClick={()=>go("management")}/>
      </div>
    </div>);
    case "workup": return (<div>
      <Info title="Objectif" color={c}>
        Confirmer le phénotype arythmogène, évaluer l'extension de l'atteinte (VD isolée vs biventriculaire) et stratifier le risque rythmique avant toute décision de restriction sportive ou de DAI.
      </Info>
      <Sec title="Clinique" color={c}/>
      <Res title="Anamnèse et examen" classe="Classe I" level="C" color="#27AE60" icon="🩺" items={[
        "Anamnèse familiale sur 3 générations (mort subite, implantation de DAI, syncope inexpliquée)",
        "Recherche de palpitations, syncope d'effort, antécédent de pratique sportive intensive",
        "Profil souvent découvert sur arythmie ventriculaire ou bilan familial systématique",
      ]}/>
      <Sec title="Examens complémentaires de 1ère intention" color={c}/>
      <Table cols="1.4fr 1.6fr" rows={[
        ["Examen","Objectif"],
        ["ECG 12 dérivations","Ondes epsilon, inversion T en V1-V3 (au-delà de l'âge pédiatrique), bloc de branche droit incomplet"],
        ["Échocardiographie transthoracique","Dilatation/dysfonction VD, akinésie segmentaire de la paroi libre, anévrysmes VD ; atteinte VG associée à rechercher"],
        ["Holter-ECG 24-48h","Quantification de la charge en extrasystoles ventriculaires (seuil ≥ 500/24h évocateur), morphologie des ESV (origine VD = retard gauche)"],
        ["Test d'effort cardio-respiratoire","Démasquage d'arythmies ventriculaires à l'effort, évaluation de la capacité fonctionnelle"],
        ["Biologie standard","NT-proBNP, troponine, bilan standard"],
      ]}/>
      <Sec title="Bilan étiologique et familial" color={c}/>
      <Res title="Orientation spécialisée" classe="Classe I" level="B" color="#27AE60" icon="🔬" items={[
        "IRM cardiaque avec rehaussement tardif — caractérisation de l'extension fibro-adipeuse (VD et VG), critère diagnostique majeur",
        "Conseil génétique et test génétique panel ACM/DAVD (PKP2, DSP, FLNC, autres desmosomaux)",
        "Dépistage en cascade des apparentés du 1er degré si variant pathogène identifié",
        "Application des critères de Padoue/Task Force révisés pour la confirmation diagnostique",
      ]}/>
    </div>);
    case "management": return (<div>
      <Res title="Restriction sportive — élément clé de la prise en charge" classe="Classe III" level="C" color="#EB5757" icon="🚫" items={[
        "Sport de haute intensité contre-indiqué, y compris chez le porteur génotype-positif phénotype-négatif asymptomatique",
        "L'exercice intensif accélère la progression de la maladie et le risque arythmique — voir chapitre Cardiologie du sport",
      ]}/>
      <Res title="Stratification du risque rythmique" classe="Classe I" level="C" color="#27AE60" icon="💀" items={[
        "Antécédent d'arrêt cardiaque ressuscité ou TV soutenue → DAI en prévention secondaire",
        "Syncope inexpliquée, TVNS, dysfonction VD sévère, extension de l'atteinte → discussion DAI en prévention primaire",
        "Gènes à haut risque : PKP2, DSP, FLNC — stratification renforcée",
      ]}/>
      <Info color={c}>Bêtabloquant systématique recommandé chez tout patient symptomatique, indépendamment de la décision de DAI.</Info>
    </div>);
    default: return null;
  }
}


// ── Endocardite infectieuse — Diagnostic ─────────────────────────
function EndoDiagContent({ go, step }) {
  const c = ENDO_TOPICS.diag.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Critères Duke-ISCVID 2023" color={c}>
        Révision majeure des critères de Duke modifiés, avec ajout d'un critère chirurgical majeur et élargissement des micro-organismes typiques.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Critères majeurs" color={c} onClick={()=>go("major")}/>
        <Btn title="Critères mineurs et classification" color={c} onClick={()=>go("minor")}/>
        <Btn title="Place de l'imagerie" color={c} onClick={()=>go("imaging")}/>
      </div>
    </div>);
    case "major": return (<div>
      <Sec title="Critère microbiologique majeur" color={c}/>
      <Res title="Hémocultures positives" classe="Majeur" color={c} icon="🔬" items={[
        "Micro-organisme typique d'EI dans ≥ 2 hémocultures séparées (liste élargie en 2023)",
        "Ou hémocultures persistantes positives à un micro-organisme compatible",
        "Ou sérologie/PCR positive pour Coxiella burnetii, Bartonella spp.",
      ]}/>
      <Sec title="Critère d'imagerie majeur" color={c}/>
      <Res title="Atteinte endocardique à l'imagerie" classe="Majeur" color={c} icon="📷" items={[
        "Végétation, abcès, pseudo-anévrysme, fistule à l'échocardiographie (ETT/ETO)",
        "Nouvelle déhiscence partielle de prothèse valvulaire",
        "Lésion identifiée au PET-scan ou scanner cardiaque (selon le contexte)",
      ]}/>
      <Sec title="Nouveau critère chirurgical majeur (2023)" color={c}/>
      <Res title="Constatation chirurgicale" classe="Majeur" color={c} icon="🔪" items={[
        "Évidence directe d'EI constatée en peropératoire — ne nécessite pas de confirmation par imagerie, histologie ou microbiologie",
        "Spécifique aux critères Duke-ISCVID, absent des critères ESC 2015",
      ]}/>
    </div>);
    case "minor": return (<div>
      <Sec title="Critères mineurs" color={c}/>
      <Table cols="1.8fr 1fr" rows={[
        ["Critère","Type"],
        ["Cardiopathie prédisposante ou usage de drogue IV","Mineur"],
        ["Fièvre ≥ 38°C","Mineur"],
        ["Phénomène vasculaire (embolie, anévrysme mycotique, hémorragie intracrânienne, lésions de Janeway)","Mineur"],
        ["Phénomène immunologique (glomérulonéphrite, nodules d'Osler, taches de Roth, facteur rhumatoïde)","Mineur"],
        ["Hémoculture positive ne remplissant pas les critères majeurs","Mineur"],
      ]}/>
      <Sec title="Classification diagnostique finale" color={c}/>
      <Table cols="1fr 1.8fr" rows={[
        ["Catégorie","Critères requis"],
        ["EI certaine","2 majeurs, ou 1 majeur + 3 mineurs, ou 5 mineurs, ou critère chirurgical seul"],
        ["EI possible","1 majeur + 1 mineur, ou 3 mineurs"],
        ["EI rejetée","Diagnostic alternatif formel, ou résolution sous antibiothérapie ≤ 4j, ou absence de preuve anatomopathologique"],
      ]}/>
    </div>);
    case "imaging": return (<div>
      <Res title="Échocardiographie — pierre angulaire" classe="Classe I" level="B" color="#27AE60" icon="📷" items={[
        "ETT en 1ère intention dès suspicion clinique",
        "ETO recommandée si ETT non concluante, prothèse valvulaire, ou forte suspicion clinique persistante malgré ETT négative",
        "Répéter l'imagerie à 7-10 jours si forte suspicion initiale malgré 1ère imagerie négative",
      ]}/>
      <Res title="Imagerie multimodale — même niveau de preuve que l'écho" classe="Classe I" level="B" color="#27AE60" icon="🔬" items={[
        "PET-FDG et/ou scanner cardiaque recommandés en cas de suspicion d'EI sur prothèse valvulaire avec critères de Duke non concluants",
        "IRM cérébrale systématique recherchée si suspicion d'embolie cérébrale, même asymptomatique",
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Endocardite infectieuse — Antibiothérapie ────────────────────
function EndoTreatmentContent({ go, step }) {
  const c = ENDO_TOPICS.treatment.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Principe général" color={c}>
        Antibiothérapie bactéricide prolongée, idéalement documentée (antibiogramme), débutée après prélèvements microbiologiques. Décision et suivi en concertation avec l'Endocarditis Team.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Posologies par micro-organisme" color={c} onClick={()=>go("dosing")}/>
        <Btn title="⏱️ Durée de traitement" color={c} onClick={()=>go("duration")}/>
        <Btn title="Relais oral / ambulatoire" color={c} onClick={()=>go("oral_outpatient")}/>
        <Btn title="Endocarditis Team" color={c} onClick={()=>go("team")}/>
      </div>
    </div>);
    case "dosing": return (<div>
      <Info title="Posologies indicatives" color={c}>
        Le choix précis, l'association et l'adaptation (fonction rénale, allergies, antibiogramme) relèvent d'une décision spécialisée en concertation avec l'Endocarditis Team. Doses pour adulte à fonction rénale normale.
      </Info>
      <Sec title="Streptocoques oraux sensibles à la pénicilline" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Molécule","Posologie"],
        ["Amoxicilline (Clamoxyl)","100–200 mg/kg/j IV en 4–6 injections"],
        ["Ceftriaxone (Rocéphine)","2 g/j IV ou IM en 1 injection"],
        ["+ Gentamicine (option)","3 mg/kg/j IV en 1 injection, 2 semaines max"],
      ]}/>
      <Sec title="Staphylocoques — valve native, méti-sensible" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Molécule","Posologie"],
        ["Cloxacilline/Oxacilline","12 g/j IV en 4–6 injections"],
        ["Alternative : Céfazoline","6 g/j IV en 3 injections"],
      ]}/>
      <Sec title="Staphylocoques — méti-résistant (SARM) ou allergie" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Molécule","Posologie"],
        ["Vancomycine","30–60 mg/kg/j IV continue ou en 2–3 injections (cible taux résiduel)"],
        ["Daptomycine (alternative)","≥ 8–10 mg/kg/j IV en 1 injection"],
      ]}/>
      <Sec title="Entérocoques" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Molécule","Posologie"],
        ["Amoxicilline","200 mg/kg/j IV en 4–6 injections"],
        ["+ Gentamicine ou Ceftriaxone","Bithérapie synergique selon souche/sensibilité"],
      ]}/>
      <Sec title="Endocardite sur prothèse — staphylocoque" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Molécule","Posologie"],
        ["β-lactamine ou vancomycine (selon sensibilité)","Comme ci-dessus"],
        ["+ Rifampicine","900–1200 mg/j PO/IV en 2–3 prises (débutée après 3–5 jours)"],
        ["+ Gentamicine","3 mg/kg/j IV en 1 injection, 2 semaines"],
      ]}/>
      <Info title="Gentamicine — surveillance" color={c}>
        Néphrotoxicité et ototoxicité potentielles — dosage des taux résiduels/pics et surveillance de la fonction rénale indispensables en cas d'utilisation prolongée.
      </Info>
    </div>);
    case "duration": return (<div>
      <Table cols="1.6fr 1fr" rows={[
        ["Contexte","Durée totale"],
        ["Endocardite sur valve native (NVE)","4 semaines (standard)"],
        ["Endocardite sur prothèse valvulaire (PVE)","6 semaines (standard)"],
        ["Streptocoques oraux sensibles à la pénicilline","4 semaines (NVE) / 6 semaines (PVE) — durées parfois raccourcies selon protocole"],
      ]}/>
      <Info color={c}>La durée se compte à partir du 1er jour d'antibiothérapie efficace (hémocultures négativées), pas du diagnostic initial. Choix de la molécule et association selon le micro-organisme identifié et l'antibiogramme — décision spécialisée.</Info>
    </div>);
    case "oral_outpatient": return (<div>
      <Res title="Relais oral — nouveauté 2023" classe="Classe IIa" level="B" color="#C26A1C" icon="🏠" items={[
        "À envisager chez les patients stables après ≥ 10 jours de traitement IV efficace",
        "Endocardite à streptocoques oraux principalement concernée (étude POET)",
        "Nécessite stabilité clinique, absence de complication, suivi rapproché possible",
      ]}/>
      <Res title="Antibiothérapie parentérale ambulatoire (OPAT)" classe="Classe IIa" level="C" color="#C26A1C" icon="💉" items={[
        "À envisager pour la poursuite du traitement IV en ambulatoire chez le patient stabilisé",
        "Cadre structuré avec suivi médical rapproché indispensable",
      ]}/>
    </div>);
    case "team": return (<div>
      <Res title="Endocarditis Team — recommandé systématiquement" classe="Classe I" level="B" color="#27AE60" icon="👥" items={[
        "Équipe pluridisciplinaire : cardiologue, infectiologue/microbiologiste, chirurgien cardiaque",
        "Discussion systématique des cas complexes ou nécessitant une évaluation chirurgicale",
        "Transfert vers un centre de référence ('Heart Valve Centre') recommandé pour les formes compliquées",
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Endocardite infectieuse — Chirurgie ──────────────────────────
function EndoSurgeryContent({ go, step }) {
  const c = ENDO_TOPICS.surgery.color;
  switch(step) {
    case "start": return (<div>
      <Sec title="3 grandes indications de chirurgie" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Insuffisance cardiaque" color={c} onClick={()=>go("hf")}/>
        <Btn title="Infection non contrôlée" color={c} onClick={()=>go("infection")}/>
        <Btn title="Prévention embolique" color={c} onClick={()=>go("embolic")}/>
      </div>
    </div>);
    case "hf": return (<div>
      <Res title="Chirurgie en urgence (< 24h)" classe="Classe I" level="B" color="#EB5757" icon="🚨" items={[
        "Régurgitation aortique/mitrale aiguë sévère ou obstruction valvulaire causant un œdème pulmonaire réfractaire ou choc cardiogénique",
      ]}/>
      <Res title="Chirurgie urgente (quelques jours)" classe="Classe I" level="B" color="#C26A1C" icon="🔪" items={[
        "Insuffisance cardiaque persistante ou signes hémodynamiques de mauvaise tolérance malgré traitement médical",
      ]}/>
    </div>);
    case "infection": return (<div>
      <Res title="Chirurgie urgente recommandée" classe="Classe I" level="B" color="#C26A1C" icon="🔪" items={[
        "Infection non contrôlée : abcès, faux anévrysme, fistule, végétation grandissante sous antibiothérapie adaptée",
        "Fièvre persistante et hémocultures positives malgré antibiothérapie adaptée ≥ 7-10 jours",
        "Endocardite fongique ou à micro-organisme multirésistant",
        "Endocardite sur prothèse valvulaire à staphylocoque ou bacille Gram négatif non-HACEK",
      ]}/>
    </div>);
    case "embolic": return (<div>
      <Res title="Chirurgie précoce pour prévention embolique" classe="Classe I" level="B" color="#C26A1C" icon="🧠" items={[
        "Végétation > 10 mm avec antécédent embolique malgré antibiothérapie adaptée",
        "Végétation > 10 mm associée à une autre indication chirurgicale (sténose/régurgitation sévère, abcès)",
      ]}/>
      <Res title="Végétation isolée très volumineuse" classe="Classe IIa" level="B" color="#C26A1C" icon="⚖️" items={[
        "Végétation > 15-30 mm isolée, sans autre critère, à discuter au cas par cas en Endocarditis Team",
      ]}/>
      <Info title="Timing après AVC" color={c}>
        Chirurgie non retardée en l'absence de coma ou d'hémorragie intracrânienne ; délai de prudence (≥ 4 semaines) recommandé après hémorragie cérébrale significative, à réévaluer selon l'imagerie de contrôle.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Endocardite infectieuse — Prophylaxie ────────────────────────
function EndoProphylContent({ go, step }) {
  const c = ENDO_TOPICS.prophyl.color;
  switch(step) {
    case "start": return (<div>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Patients à haut risque" color={c} onClick={()=>go("high_risk")}/>
        <Btn title="Procédures concernées" color={c} onClick={()=>go("procedures")}/>
        <Btn title="Schéma antibiotique" color={c} onClick={()=>go("regimen")}/>
      </div>
    </div>);
    case "high_risk": return (<div>
      <Res title="Patients à haut risque — prophylaxie recommandée" classe="Classe I" level="B" color="#27AE60" icon="🎯" items={[
        "Antécédent personnel d'endocardite infectieuse",
        "Prothèse valvulaire (chirurgicale ou transcathéter) ou matériel de réparation valvulaire",
        "Cardiopathie congénitale cyanogène non réparée",
        "Cardiopathie congénitale réparée avec matériel prothétique (jusqu'à 6 mois post-procédure, ou à vie si shunt/fuite résiduel)",
        "Assistance ventriculaire (Classe I)",
      ]}/>
      <Res title="Situations à discuter au cas par cas" classe="Classe IIa/IIb" level="C" color="#C26A1C" icon="⚖️" items={[
        "Réparation transcathéter mitrale ou tricuspide (Classe IIa)",
        "Transplantation cardiaque avec valvulopathie (Classe IIb)",
      ]}/>
    </div>);
    case "procedures": return (<div>
      <Res title="Procédures dentaires à risque — prophylaxie recommandée" classe="Classe I" level="B" color="#27AE60" icon="🦷" items={[
        "Manipulation de la gencive ou de la région périapicale dentaire",
        "Perforation de la muqueuse orale",
      ]}/>
      <Info title="Élargissement 2023" color={c}>
        Prophylaxie systémique à envisager au cas par cas (Classe IIb) pour certaines procédures invasives respiratoires, gastro-intestinales, génito-urinaires, cutanées ou ostéo-articulaires chez le patient à haut risque — réintroduction par rapport aux versions antérieures plus restrictives.
      </Info>
    </div>);
    case "regimen": return (<div>
      <Sec title="Schéma — dose unique 30-60 min avant la procédure" color={c}/>
      <Table cols="1fr 1fr 1fr" rows={[
        ["Situation","Adulte","Enfant"],
        ["Pas d'allergie aux β-lactamines","Amoxicilline ou ampicilline 2g PO/IV","50 mg/kg PO/IV"],
        ["Alternative sans allergie","Céfazoline ou ceftriaxone 1g IV","50 mg/kg IV"],
        ["Allergie aux β-lactamines","Clarithromycine ou doxycycline (selon disponibilité)","Adapté au poids"],
      ]}/>
      <Info title="Clindamycine non recommandée" color="#EB5757">
        Exclue depuis 2023 en raison du risque accru d'infection à Clostridioides difficile, remplacée par d'autres alternatives chez l'allergique aux pénicillines.
      </Info>
    </div>);
    default: return null;
  }
}
// ═══ URGENCES DE GARDE ═══════════════════════════════════════════
// ── Doses d'urgence (aide-mémoire) ───────────────────────────────
function URGdosesContent({ go, step }) {
  const c = URG_TOPICS.doses.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Aide-mémoire — posologies en aigu" color={c}>
        Doses de l'adulte, d'après les recommandations ERC 2021 (confirmées 2025). Vérifie toujours la dilution locale et adapte au poids et à la fonction rénale. Ne remplace pas un protocole de service.
      </Info>
      <Sec title="Choisir une situation" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Arrêt cardiaque (ACLS)" color={c} onClick={()=>go("acr")}/>
        <Btn title="Bradycardie" color={c} onClick={()=>go("brady")}/>
        <Btn title="Tachycardie & cardioversion" color={c} onClick={()=>go("tachy")}/>
        <Btn title="Drogues de choc (débits)" color={c} onClick={()=>go("choc")}/>
        <Btn title="Autres urgences" subtitle="Anaphylaxie, hyperkaliémie, intoxications" color={c} onClick={()=>go("autres")}/>
      </div>
    </div>);

    case "acr": return (<div>
      <Sec title="Arrêt cardiaque — médicaments" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Médicament","Dose"],
        ["Adrénaline","1 mg IV/IO, puis répéter toutes les 3–5 min"],
        ["→ rythme non choquable","dès que possible (AESP / asystolie)"],
        ["→ rythme choquable","après le 3ᵉ choc (FV / TV sans pouls)"],
        ["Amiodarone","300 mg IV après le 3ᵉ choc, puis 150 mg après le 5ᵉ choc"],
        ["Lidocaïne (alternative)","100 mg IV, + 50 mg possible après le 5ᵉ choc"],
        ["Sulfate de magnésium","2 g IV si torsades de pointes / hypoMg"],
        ["Bicarbonate","à envisager si hyperK ou intoxication tricycliques"],
      ]}/>
      <Res title="Repères" classe="ERC 2021/2025" level="" color={c} icon="🫀" items={[
        "Adrénaline : non choquable = le plus tôt possible · choquable = après le 3ᵉ choc",
        "Énergie de choc biphasique : ≥ 150 J (1ᵉʳ choc), puis selon appareil",
        "Thrombolyse à envisager si EP cause de l'ACR → poursuivre RCP 60–90 min",
        "Causes réversibles : 4H / 4T (hypoxie, hypovolémie, hypo/hyperK, hypothermie ; thrombose, tamponnade, pneumothorax, toxiques)",
      ]}/>
      <SeeAlso items={[{ label:"Arrêt cardiaque", icon:"🫀", color:"#EB5757", target:{ kind:"topic", chapterKey:"urgences", topicKey:"acr" } }]}/>
    </div>);

    case "brady": return (<div>
      <Sec title="Bradycardie mal tolérée" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Médicament","Dose"],
        ["Atropine","500 µg IV, à répéter toutes les 3–5 min (max 3 mg)"],
        ["Isoprénaline","5 µg/min en dose initiale (titrer)"],
        ["Adrénaline","2–10 µg/min IV (titrer à l'effet)"],
        ["Aminophylline","100–200 mg IV lent (IDM inférieur, greffe, lésion médullaire)"],
        ["Glucagon","si bêtabloquant ou inhibiteur calcique en cause"],
      ]}/>
      <Res title="Points clés" classe="ERC 2021" level="" color={c} icon="🐢" items={[
        "Signes de gravité : choc, syncope, ischémie myocardique, insuffisance cardiaque",
        "Pas d'atropine chez le transplanté cardiaque (risque de BAV complet)",
        "Si échec médicamenteux : entraînement électrosystolique (pacing externe puis transveineux)",
      ]}/>
    </div>);

    case "tachy": return (<div>
      <Sec title="Tachycardie — cardioversion synchronisée (patient instable)" color={c}/>
      <Table cols="1.4fr 1.4fr" rows={[
        ["Rythme","Énergie (biphasique)"],
        ["Fibrillation atriale","120–150 J (↑ si échec)"],
        ["Flutter / TSV","70–120 J (↑ si échec)"],
        ["TV avec pouls","120–150 J (↑ si échec)"],
      ]}/>
      <Sec title="Tachycardie — médicaments" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Médicament","Dose"],
        ["Adénosine","6 mg IVD rapide, puis 12 mg, puis 12 mg (TSV régulière)"],
        ["Amiodarone","300 mg IV sur 10–20 min, puis 900 mg / 24 h"],
        ["Bêtabloquant","si FEVG &lt; 40 % : plus petite dose pour FC &lt; 110/min ; + digoxine si besoin"],
      ]}/>
      <Res title="Points clés" classe="ERC 2021" level="" color={c} icon="⚡" items={[
        "Instable (choc, syncope, ischémie, IC) → cardioversion synchronisée d'emblée",
        "Adénosine : bolus IV rapide + rinçage, TSV régulière à QRS fin ; prévenir le patient (malaise bref)",
        "TV / instabilité hémodynamique avec FEVG effondrée → amiodarone",
      ]}/>
    </div>);

    case "choc": return (<div>
      <Sec title="Drogues de choc — débits usuels" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Drogue","Débit"],
        ["Noradrénaline","0,05–1 µg/kg/min IVSE (vasopresseur de 1ʳᵉ intention)"],
        ["Adrénaline","0,05–0,5 µg/kg/min (ou 2–10 µg/min)"],
        ["Dobutamine","2,5–20 µg/kg/min (inotrope)"],
        ["Dopamine","5–20 µg/kg/min (peu utilisée)"],
        ["Milrinone","0,375–0,75 µg/kg/min (inodilatateur)"],
        ["Lévosimendan","0,05–0,2 µg/kg/min sur 24 h (± dose de charge)"],
      ]}/>
      <Info title="Sécurité" color={c}>
        Les vasopresseurs et inotropes se donnent à la seringue électrique, idéalement sur voie centrale, avec surveillance continue. Les débits ci-dessus sont des repères : suis le protocole de dilution de ton service et titre à l'effet hémodynamique.
      </Info>
      <SeeAlso items={[{ label:"Choc cardiogénique", icon:"💧", color:"#1684A8", target:{ kind:"topic", chapterKey:"ic", topicKey:"choc" } }]}/>
    </div>);

    case "autres": return (<div>
      <Sec title="Anaphylaxie" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Médicament","Dose"],
        ["Adrénaline IM","500 µg IM (0,5 mg) face antéro-latérale de cuisse, à répéter à 5 min si besoin"],
        ["Remplissage","cristalloïdes 500–1000 mL IV rapide"],
      ]}/>
      <Sec title="Hyperkaliémie menaçante" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Médicament","Dose"],
        ["Gluconate de calcium","10 mL à 10 % IV (protection membranaire)"],
        ["Insuline + glucose","10 UI insuline rapide + 25 g glucose IV"],
        ["Salbutamol","nébulisation forte dose"],
      ]}/>
      <Sec title="Intoxications cardiotropes" color={c}/>
      <Table cols="1.2fr 1.6fr" rows={[
        ["Situation","Antidote / mesure"],
        ["Bêtabloquant / inhibiteur calcique","Glucagon, calcium, insuline-glucose forte dose"],
        ["Digoxine","Anticorps anti-digoxine (Fab)"],
        ["Tricycliques (QRS large)","Bicarbonate de sodium molaire"],
      ]}/>
      <SeeAlso items={[
        { label:"Dyskaliémies", icon:"🧂", color:ACCENT, target:{ kind:"topic", chapterKey:"metab", topicKey:"hyperk" } },
        { label:"Arrêt cardiaque", icon:"🫀", color:"#EB5757", target:{ kind:"topic", chapterKey:"urgences", topicKey:"acr" } },
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Arrêt cardio-respiratoire ────────────────────────────────────
function URGacrContent({ go, step }) {
  const c = URG_TOPICS.acr.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Priorités absolues" color={c}>
        RCP de qualité (100–120/min, 5–6 cm, minimiser les interruptions) + défibrillation précoce si rythme choquable. Alterner les intervenants toutes les 2 min.
      </Info>
      <Sec title="Analyse du rythme" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Rythme choquable (FV / TV sans pouls)" color="#EB5757" onClick={()=>go("shock")}/>
        <Btn title="Rythme non choquable (asystolie / DEM)" color="#B5790F" onClick={()=>go("noshock")}/>
        <Btn title="Causes réversibles (4H / 4T)" color={c} onClick={()=>go("causes")}/>
        <Btn title="Doses médicamenteuses" color={c} onClick={()=>go("drugs")}/>
      </div>
    </div>);
    case "shock": return (<div>
      <Sec title="Rythme choquable — FV / TV sans pouls" color={c}/>
      <Res title="Séquence" classe="ACLS" color="#EB5757" icon="⚡" items={[
        "Choc immédiat (biphasique 150–200 J, ou max disponible), puis reprise RCP 2 min sans délai",
        "Adrénaline 1 mg IV/IO après le 2ᵉ choc, puis toutes les 3–5 min",
        "Amiodarone 300 mg IV/IO après le 3ᵉ choc ; 2ᵉ dose de 150 mg possible après le 4ᵉ choc",
        "Alternative : lidocaïne (Xylocard) 1–1,5 mg/kg si amiodarone indisponible",
        "Analyse du rythme toutes les 2 min (pause < 10 s), rechercher/traiter les causes réversibles",
      ]}/>
      <Info title="TV/FV réfractaire" color={c}>
        Envisager : double défibrillation séquentielle (protocoles locaux), sulfate de magnésium 2 g si torsades de pointes, et discussion ECMO/e-CPR précoce si cause réversible suspectée.
      </Info>
    </div>);
    case "noshock": return (<div>
      <Sec title="Rythme non choquable — asystolie / DEM" color={c}/>
      <Res title="Séquence" classe="ACLS" color="#B5790F" icon="🚫" items={[
        "Adrénaline 1 mg IV/IO le plus tôt possible, puis toutes les 3–5 min",
        "Pas de défibrillation (aucun bénéfice sur ces rythmes)",
        "RCP continue de qualité, analyse du rythme toutes les 2 min",
        "Priorité ABSOLUE : rechercher et traiter les causes réversibles (4H/4T)",
        "Vérifier régulièrement si passage à un rythme choquable → basculer sur l'algorithme choc",
      ]}/>
      <Info title="DEM (dissociation électromécanique)" color={c}>
        Activité électrique sans pouls : le pronostic dépend entièrement de l'identification d'une cause réversible. L'échographie au lit (tamponnade, pneumothorax, hypovolémie, EP) est très utile.
      </Info>
    </div>);
    case "causes": return (<div>
      <Info title="Principe" color={c}>
        L'identification et le traitement d'une cause réversible est LA priorité, surtout dans les rythmes non choquables (asystolie/DEM). L'échographie au lit (FEER/POCUS) oriente rapidement plusieurs de ces causes.
      </Info>
      <Sec title="Développer par catégorie" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Les 4 H" subtitle="Hypoxie, Hypovolémie, Hypo/Hyperkaliémie, Hypothermie" color={c} onClick={()=>go("causes_h")}/>
        <Btn title="Les 4 T" subtitle="Thrombose, Tamponnade, pneumoThorax, Toxiques" color={c} onClick={()=>go("causes_t")}/>
      </div>
    </div>);
    case "causes_h": return (<div>
      <Sec title="Hypoxie" color={c}/>
      <Res title="Orientation & traitement" classe="4H" color={c} icon="🫁" items={[
        "Contexte : détresse respiratoire, obstruction des voies aériennes, noyade, intoxication",
        "Assurer un contrôle des voies aériennes et une oxygénation à FiO₂ 100%",
        "Vérifier le bon positionnement du dispositif (auscultation, capnographie)",
        "Ventilation efficace : soulèvement thoracique, éviter l'hyperventilation",
      ]}/>
      <Sec title="Hypovolémie" color={c}/>
      <Res title="Orientation & traitement" classe="4H" color={c} icon="🩸" items={[
        "Contexte : hémorragie (digestive, trauma, rupture d'anévrysme, grossesse extra-utérine), sepsis, anaphylaxie, déshydratation",
        "Remplissage vasculaire rapide : cristalloïdes en bolus, culots globulaires si hémorragie",
        "Contrôle de la source hémorragique (compression, chirurgie, radiologie interventionnelle)",
        "Échographie : VCI plate, cavités vides et hyperkinétiques ('kissing walls')",
        "Adrénaline IM + remplissage si anaphylaxie",
      ]}/>
      <Sec title="Hypo / Hyperkaliémie & troubles métaboliques" color={c}/>
      <Res title="Hyperkaliémie" classe="4H" color="#EB5757" icon="⚡" items={[
        "Contexte : insuffisance rénale, rhabdomyolyse, acidose, traitements (IEC/ARA2, diurétiques épargneurs)",
        "Gluconate de calcium 10% 10–30 mL IV (stabilisation membranaire, action rapide)",
        "Insuline rapide 10 UI + G30% 100–250 mL (transfert intracellulaire)",
        "Bicarbonate de sodium si acidose associée",
        "± salbutamol nébulisé ; épuration extra-rénale en aval",
      ]}/>
      <Res title="Hypokaliémie / Hypomagnésémie" classe="4H" color={c} icon="⚡" items={[
        "Contexte : diurétiques, pertes digestives, dénutrition",
        "Recharge potassique IV prudente ; sulfate de Mg 2 g IV (surtout si torsades de pointes)",
      ]}/>
      <Sec title="Hypothermie" color={c}/>
      <Res title="Orientation & traitement" classe="4H" color={c} icon="🌡️" items={[
        "Contexte : exposition au froid, noyade, sujet âgé, intoxication",
        "Réchauffement actif interne et externe (couvertures chauffantes, perfusions réchauffées, lavages)",
        "Poursuivre la RCP prolongée : « nul n'est mort tant qu'il n'est pas réchauffé et mort »",
        "Adapter les médicaments/chocs si T° < 30°C (efficacité réduite, espacer les injections)",
        "Envisager l'ECMO comme moyen de réchauffement dans les formes sévères",
      ]}/>
    </div>);
    case "causes_t": return (<div>
      <Sec title="Thrombose (coronaire ou pulmonaire)" color={c}/>
      <Res title="Orientation & traitement" classe="4T" color="#EB5757" icon="🩸" items={[
        "Coronaire (SCA) : contexte de douleur thoracique, sus-décalage pré-arrêt → coronarographie en urgence sous RCP si possible",
        "EP massive : contexte thrombotique, dilatation VD à l'échographie, DEM → thrombolyse en per-RCP (altéplase)",
        "Après thrombolyse pour EP : poursuivre la RCP au moins 60–90 min avant de l'arrêter",
        "Envisager l'e-CPR (ECMO) précoce si cause réversible et centre disponible",
      ]}/>
      <Sec title="Tamponnade" color={c}/>
      <Res title="Orientation & traitement" classe="4T" color="#EB5757" icon="💧" items={[
        "Contexte : post-IDM (rupture), dissection, néoplasie, post-chirurgie/procédure, trauma",
        "Échographie : épanchement péricardique + collapsus des cavités droites",
        "Péricardiocentèse en urgence (écho-guidée) — geste salvateur",
        "Thoracotomie de sauvetage si tamponnade traumatique / post-chirurgie cardiaque",
      ]}/>
      <Sec title="pneumoThorax compressif (suffocant)" color={c}/>
      <Res title="Orientation & traitement" classe="4T" color="#EB5757" icon="🫁" items={[
        "Contexte : trauma, ventilation en pression positive, pose de voie centrale, BPCO",
        "Signes : abolition unilatérale du murmure, tympanisme, déviation trachéale, turgescence jugulaire",
        "Exsufflation immédiate à l'aiguille (2ᵉ EIC ligne médio-claviculaire ou 4–5ᵉ EIC ligne axillaire)",
        "Puis drainage thoracique définitif",
      ]}/>
      <Sec title="Toxiques" color={c}/>
      <Res title="Orientation & traitement" classe="4T" color={c} icon="☠️" items={[
        "Opioïdes → naloxone",
        "Benzodiazépines → flumazénil (prudence)",
        "β-bloquants / inhibiteurs calciques → glucagon, insuline-euglycémie forte dose, calcium, adrénaline",
        "Antidépresseurs tricycliques → bicarbonate de sodium",
        "Intoxication aux anesthésiques locaux → émulsion lipidique (Intralipide)",
        "Digitaliques → anticorps anti-digoxine (Fab)",
        "Avis centre antipoison ; envisager l'e-CPR (intoxications souvent réversibles chez des sujets jeunes)",
      ]}/>
    </div>);
    case "drugs": return (<div>
      <Sec title="Médicaments de l'ACR — doses" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Médicament","Posologie IV/IO"],
        ["Adrénaline","1 mg toutes les 3–5 min (tous rythmes)"],
        ["Amiodarone","300 mg après 3ᵉ choc, puis 150 mg après 4ᵉ choc (FV/TV réfractaire)"],
        ["Lidocaïne (Xylocard)","1–1,5 mg/kg puis 0,5–0,75 mg/kg (alternative à l'amiodarone)"],
        ["Sulfate de Mg","2 g IV si torsades de pointes"],
        ["Bicarbonate","Selon contexte : hyperK, intoxication tricycliques, acidose sévère"],
        ["Gluconate de Ca","Si hyperkaliémie ou intoxication inhibiteur calcique"],
      ]}/>
      <Info title="Post-ROSC" color={c}>
        ECG 12 dérivations immédiat (coronarographie si STEMI/suspicion), objectif SpO₂ 94–98% et normocapnie, contrôle ciblé de la température, cause déclenchante, USIC.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Douleur thoracique ───────────────────────────────────────────
function URGchestContent({ go, step }) {
  const c = URG_TOPICS.chest.color;
  switch(step) {
    case "start": return (<div>
      <Info title="⏱️ Réflexe : ECG < 10 min" color={c}>
        Tout patient avec douleur thoracique non traumatique doit avoir un ECG 12 dérivations dans les 10 minutes suivant le 1er contact médical. Étape 1 : éliminer une détresse vitale (respiratoire, hémodynamique, neurologique).
      </Info>
      <Sec title="Orientation" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Les 4 urgences CV — « PIED »" subtitle="Péricardite, Infarctus, Embolie pulmonaire, Dissection" color="#EB5757" onClick={()=>go("pied")}/>
        <Btn title="Autres urgences vitales" subtitle="Pneumothorax compressif, rupture œsophagienne" color="#C26A1C" onClick={()=>go("other_urg")}/>
        <Btn title="Diagnostics différentiels non cardiaques" subtitle="Ne pas passer à côté !" color={c} onClick={()=>go("ddx")}/>
        <Btn title="Prise en charge STEMI" color="#EB5757" onClick={()=>go("stemi")}/>
        <Btn title="🟠 Protocole troponine 0h/1h" color="#C26A1C" onClick={()=>go("troponin")}/>
      </div>
    </div>);
    case "pied": return (<div>
      <Info title="Moyen mnémotechnique « PIED »" color="#EB5757">
        Les 4 urgences cardiovasculaires à évoquer systématiquement devant toute douleur thoracique, du fait de leur gravité immédiate ou potentielle (item 230).
      </Info>
      <Sec title="P — Péricardite (± tamponnade)" color={c}/>
      <Res title="Éléments d'orientation" classe="P" color={c} icon="🫀" items={[
        "Douleur augmentée à l'inspiration profonde et en décubitus, soulagée par l'antéflexion (position 'en prière mahométane')",
        "Frottement péricardique (persiste en apnée), contexte viral fébrile fréquent",
        "ECG : sus-décalage ST diffus, concave vers le haut, SANS signe en miroir ± sous-décalage PQ",
        "Rechercher une tamponnade (hypotension, turgescence jugulaire, pouls paradoxal) → écho (cf. fiche Tamponnade)",
      ]}/>
      <Sec title="I — Infarctus / SCA" color={c}/>
      <Res title="Éléments d'orientation" classe="I" color="#EB5757" icon="💔" items={[
        "Douleur constrictive rétrosternale, irradiation (mâchoire, bras gauche), trinitro-sensibilité",
        "Facteurs de risque cardiovasculaires ; 50% inaugural de la maladie coronaire",
        "ECG + troponine (voir protocoles STEMI et troponine 0h/1h)",
      ]}/>
      <Sec title="E — Embolie pulmonaire" color={c}/>
      <Res title="Éléments d'orientation" classe="E" color="#A267D9" icon="🫁" items={[
        "Douleur basithoracique de type pleural + dyspnée, tachycardie, parfois hémoptysie",
        "Terrain : cancer, contraception + tabac, post-op, post-partum, alitement, ATCD de MTEV",
        "Score de Wells / Genève → D-dimères ou angioscanner (cf. fiche Embolie pulmonaire + Calculateurs)",
      ]}/>
      <Sec title="D — Dissection aortique" color={c}/>
      <Res title="Éléments d'orientation" classe="D" color="#EB5757" icon="🩸" items={[
        "Douleur brutale, intense, transfixiante, à type de déchirement, migratrice vers le dos/les lombes",
        "Terrain : HTA ancienne, Marfan ; asymétrie tensionnelle (> 20 mmHg), abolition d'un pouls, souffle d'IAo, déficit neuro",
        "Angioscanner aortique en urgence ; ne PAS anticoaguler ; contrôle PA + FC (bêtabloquant IV)",
      ]}/>
    </div>);
    case "other_urg": return (<div>
      <Info title="Au-delà de PIED" color="#C26A1C">
        Deux autres urgences vitales à ne jamais oublier devant une douleur thoracique.
      </Info>
      <Sec title="Pneumothorax compressif" color={c}/>
      <Res title="Éléments d'orientation" classe="Urgence vitale" color="#EB5757" icon="🫁" items={[
        "Douleur brutale unilatérale en coup de poignard + dyspnée",
        "Abolition du murmure vésiculaire, tympanisme, abolition des vibrations vocales du côté atteint",
        "Formes compressives : turgescence jugulaire, déviation trachéale, choc → exsufflation en urgence",
        "Terrain : sujet jeune longiligne tabagique (spontané) ou BPCO/emphysème (sujet âgé)",
      ]}/>
      <Sec title="Rupture / perforation œsophagienne (sd de Boerhaave)" color={c}/>
      <Res title="Éléments d'orientation" classe="Urgence vitale" color="#EB5757" icon="🍽️" items={[
        "Exceptionnelle mais gravissime — urgence thérapeutique",
        "Douleur thoracique après vomissements violents, associée à dyspnée",
        "Emphysème sous-cutané (crépitation neigeuse), pneumomédiastin au scanner",
        "Mortalité élevée si diagnostic retardé → avis chirurgical urgent",
      ]}/>
    </div>);
    case "ddx": return (<div>
      <Info title="Ne pas se limiter au cœur" color={c}>
        Une fois les urgences vitales écartées, penser aux causes non cardiaques — fréquentes et souvent bénignes, mais à identifier pour ne pas méconnaître un diagnostic. Repère utile : l'effet de la respiration sur la douleur oriente (douleurs rythmées par la respiration = pleuro-pariétales, non rythmées = SCA, œsophage).
      </Info>
      <Sec title="Causes pulmonaires / pleurales" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Diagnostic","Orientation"],
        ["Pneumopathie / pleurésie","Fièvre, toux, expectoration, douleur pleurale, foyer auscultatoire"],
        ["Pneumothorax (non compressif)","Douleur brutale, dyspnée, abolition unilatérale du murmure"],
        ["Trachéobronchite","Douleur médiane à la toux, contexte viral"],
      ]}/>
      <Sec title="Causes digestives" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Diagnostic","Orientation"],
        ["RGO / spasme œsophagien","Pyrosis, brûlure rétrosternale, lien postural/alimentaire (peut mimer un angor)"],
        ["Ulcère / pathologie gastrique","Douleur épigastrique, rythmée par les repas"],
        ["Pancréatite, cholécystite","Douleur épigastrique/hypochondre, contexte, lipasémie/écho"],
      ]}/>
      <Sec title="Causes pariétales / neurologiques" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Diagnostic","Orientation"],
        ["Douleur pariétale / costochondrite","Douleur reproduite à la palpation, position-dépendante (syndrome de Tietze)"],
        ["Zona thoracique","Brûlure métamérique précédant l'éruption vésiculaire (24–48h)"],
        ["Fracture / lésion costale","Contexte traumatique, point douloureux exquis"],
      ]}/>
      <Sec title="Cause fonctionnelle" color={c}/>
      <Res title="Douleur psychogène / anxiété" classe="Diagnostic d'élimination" color={c} icon="🧠" items={[
        "Attaque de panique, trouble anxieux : douleur atypique, contexte évocateur",
        "Diagnostic d'élimination : ne le retenir qu'après avoir écarté les causes organiques",
      ]}/>
      <Info title="Piège toxicologique" color="#EB5757">
        Toujours rechercher une prise de cocaïne devant une douleur thoracique (vasospasme coronaire, dissection, SCA) — particulièrement chez le sujet jeune sans facteur de risque.
      </Info>
    </div>);
    case "stemi": return (<div>
      <Res title="STEMI — reperfusion en urgence" classe="Urgence vitale" color="#EB5757" icon="🔴" items={[
        "Angioplastie primaire si accessible < 120 min : stratégie de choix",
        "Fibrinolyse si angioplastie non accessible dans les délais (puis transfert)",
        "Double antiagrégation + anticoagulation (voir chapitre Cardiopathie ischémique)",
        "Ne pas retarder la reperfusion pour un bilan complémentaire",
      ]}/>
      <Info color={c}>Détail complet des posologies et de la stratégie dans le chapitre Cardiopathie ischémique → SCA ST+.</Info>
    </div>);
    case "troponin": return (<div>
      <Sec title="Protocole troponine ultrasensible 0h/1h (ESC)" color={c}/>
      <Res title="Démarche" classe="ESC" color="#C26A1C" icon="🟠" items={[
        "Troponine hs à H0 et H1 (ou H0/H2-H3 selon le dosage)",
        "Interprétation selon les seuils spécifiques du dosage (valeur ET cinétique/delta)",
        "Rule-out : troponine très basse à H0 (+ douleur > 3h) ou absence de delta significatif",
        "Rule-in : élévation franche ou delta significatif → SCA NST, voir chapitre dédié",
        "Zone d'observation : surveillance, 3ᵉ dosage, imagerie selon probabilité clinique",
      ]}/>
      <Info title="Attention" color={c}>
        Une troponine élevée n'est pas synonyme de SCA : penser aux autres causes (EP, myocardite, insuffisance rénale, sepsis, IC, tachycardie). Toujours interpréter avec la clinique et l'ECG.
      </Info>
    </div>);
    default: return null;
  }
}

// ── OAP / IC aiguë ───────────────────────────────────────────────
function URGoapContent({ go, step }) {
  const c = URG_TOPICS.oap.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Reconnaissance" color={c}>
        Dyspnée aiguë, orthopnée, crépitants bilatéraux, désaturation. L'échographie pleuro-pulmonaire (lignes B bilatérales) confirme rapidement l'origine cardiogénique.
      </Info>
      <Sec title="Prise en charge selon la présentation" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="OAP hypertensif / normotendu" color={c} onClick={()=>go("standard")}/>
        <Btn title="Choc cardiogénique (bas débit)" color="#EB5757" onClick={()=>go("shock")}/>
        <Btn title="Doses rapides" color={c} onClick={()=>go("doses")}/>
      </div>
    </div>);
    case "standard": return (<div>
      <Res title="OAP avec PA conservée — 'OVD'" classe="Prise en charge" color={c} icon="🌊" items={[
        "Oxygénothérapie ± VNI (CPAP) si détresse respiratoire et PA conservée",
        "Vasodilatateurs (dérivés nitrés) si PAS > 110 mmHg — pierre angulaire de l'OAP hypertensif",
        "Diurétiques de l'anse (furosémide IV) pour la surcharge",
        "Position assise, recherche et traitement du facteur déclenchant (poussée HTA, FA rapide, SCA, écart de traitement, infection)",
      ]}/>
    </div>);
    case "shock": return (<div>
      <Res title="Choc cardiogénique" classe="Urgence vitale" color="#EB5757" icon="🔴" items={[
        "Hypotension (PAS < 90) + signes d'hypoperfusion (marbrures, oligurie, confusion, lactates ↑)",
        "Éviter/limiter les vasodilatateurs et les fortes doses de diurétiques",
        "Inotropes (dobutamine) ± vasopresseur (noradrénaline = 1ère intention)",
        "Rechercher une cause traitable en urgence (SCA → coronarographie, complication mécanique)",
        "Discussion précoce assistance circulatoire / USIC / centre expert",
      ]}/>
    </div>);
    case "doses": return (<div>
      <Table cols="1fr 1.6fr" rows={[
        ["Médicament","Posologie IV"],
        ["Furosémide (Lasilix)","Bolus 20–40 mg (ou 1–2,5× dose orale) ; IVSE 5–20 mg/h si résistance"],
        ["Trinitrine (Lénitral)","1 mg/h initial → jusqu'à 10 mg/h selon PA"],
        ["Dobutamine","2–20 µg/kg/min (bas débit)"],
        ["Noradrénaline","0,2–1 µg/kg/min (choc cardiogénique)"],
      ]}/>
      <SeeAlso items={[{ label:"IC aiguë / OAP", icon:"🫁", color:"#1684A8", target:{ kind:"topic", chapterKey:"ic", topicKey:"aigue" } }]}/>
    </div>);
    default: return null;
  }
}

// ── Embolie pulmonaire ───────────────────────────────────────────
function URGepContent({ go, step }) {
  const c = URG_TOPICS.ep.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Démarche" color={c}>
        Probabilité clinique (score de Wells / Genève) → D-dimères si probabilité faible/intermédiaire, angioscanner si probabilité forte ou D-dimères positifs. Puis stratification du risque.
      </Info>
      <Sec title="Étapes" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Probabilité clinique & diagnostic" color={c} onClick={()=>go("diag")}/>
        <Btn title="Stratification du risque" color={c} onClick={()=>go("risk")}/>
        <Btn title="Traitement selon le risque" color={c} onClick={()=>go("ttt")}/>
      </div>
    </div>);
    case "diag": return (<div>
      <Res title="Stratégie diagnostique" classe="ESC" color={c} icon="🔍" items={[
        "Score de Wells ou de Genève (voir Calculateurs de scores)",
        "Probabilité faible/intermédiaire → D-dimères (seuil ajusté à l'âge > 50 ans : âge × 10)",
        "D-dimères négatifs + probabilité non forte → EP exclue",
        "Probabilité forte ou D-dimères positifs → angioscanner thoracique",
        "Si instabilité hémodynamique → échographie cardiaque au lit (dysfonction VD) sans délai",
      ]}/>
    </div>);
    case "risk": return (<div>
      <Sec title="Stratification (ESC)" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Niveau","Définition"],
        ["Haut risque","Instabilité hémodynamique (choc, hypotension persistante, ACR)"],
        ["Intermédiaire-élevé","Stable + dysfonction VD (écho/scanner) ET troponine élevée"],
        ["Intermédiaire-faible","Stable + un seul (ou aucun) marqueur VD/troponine, sPESI ≥ 1"],
        ["Faible","sPESI = 0, pas de dysfonction VD, pas d'élévation troponine"],
      ]}/>
      <Info color={c}>Le score sPESI (voir Calculateurs) sépare le bas risque du risque intermédiaire. La dysfonction VD et la troponine affinent le risque intermédiaire.</Info>
    </div>);
    case "ttt": return (<div>
      <Res title="Haut risque" classe="Urgence vitale" color="#EB5757" icon="🔴" items={[
        "Thrombolyse systémique en urgence (altéplase) sauf contre-indication absolue",
        "Alternatives si CI/échec : thrombectomie ou embolectomie chirurgicale",
        "Support hémodynamique (noradrénaline), envisager ECMO si réfractaire",
      ]}/>
      <Res title="Risque intermédiaire" classe="Prise en charge" color="#C26A1C" icon="🟠" items={[
        "Anticoagulation curative (HBPM ou DOAC)",
        "Surveillance rapprochée du sous-groupe intermédiaire-élevé (thrombolyse de sauvetage si dégradation)",
      ]}/>
      <Res title="Faible risque" classe="Prise en charge" color="#27AE60" icon="🟢" items={[
        "Anticoagulation curative (DOAC en 1ère intention)",
        "Traitement ambulatoire envisageable si contexte favorable (sPESI = 0)",
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Tamponnade ───────────────────────────────────────────────────
function URGtamponContent({ go, step }) {
  const c = URG_TOPICS.tampon.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Reconnaissance — urgence vitale" color={c}>
        Triade de Beck : hypotension, turgescence jugulaire, assourdissement des bruits du cœur. Pouls paradoxal (chute PAS inspiratoire &gt; 10 mmHg). Confirmation échographique.
      </Info>
      <Sec title="En savoir plus" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Signes échographiques" color={c} onClick={()=>go("echo")}/>
        <Btn title="Prise en charge" color="#EB5757" onClick={()=>go("ttt")}/>
      </div>
    </div>);
    case "echo": return (<div>
      <Res title="Signes échographiques de tamponnade" classe="ETT" color={c} icon="🔍" items={[
        "Épanchement péricardique (souvent circonférentiel, parfois localisé)",
        "Collapsus diastolique des cavités droites (OD puis VD) — signe majeur",
        "Swing cardiaque (cœur 'dansant' dans l'épanchement)",
        "Variation respiratoire exagérée des flux mitral/tricuspide (> 25–30%)",
        "VCI dilatée non compliante (pléthorique)",
      ]}/>
    </div>);
    case "ttt": return (<div>
      <Res title="Prise en charge" classe="Urgence vitale" color="#EB5757" icon="🩹" items={[
        "Péricardiocentèse en urgence (drainage) — geste salvateur, idéalement écho-guidé",
        "Remplissage vasculaire prudent en attendant le drainage (précharge-dépendance)",
        "ÉVITER les vasodilatateurs et les diurétiques (aggravent le bas débit)",
        "Éviter si possible la ventilation en pression positive (majore la baisse du retour veineux)",
        "Chirurgie si tamponnade post-opératoire, dissection, ou récidive (drainage chirurgical/fenêtre)",
      ]}/>
      <Info title="Étiologies fréquentes" color={c}>
        Néoplasique, infectieuse (péricardite, tuberculose), post-IDM (rupture), dissection aortique, post-chirurgie/procédure, urémique, auto-immune.
      </Info>
    </div>);
    default: return null;
  }
}

// ═══ SITUATIONS PARTICULIÈRES ════════════════════════════════════
// ── Syncope ──────────────────────────────────────────────────────
function SPECsyncopeContent({ go, step }) {
  const c = SPEC_TOPICS.syncope.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Définition (ESC 2018)" color={c}>
        Perte de connaissance transitoire par hypoperfusion cérébrale : début rapide, durée brève, récupération spontanée et complète. Distinguer des autres pertes de connaissance (épilepsie, cause psychogène, trauma).
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Bilan initial (les 3 questions)" color={c} onClick={()=>go("workup")}/>
        <Btn title="Critères de HAUT risque" color="#EB5757" onClick={()=>go("highrisk")}/>
        <Btn title="🟢 Critères de BAS risque" color="#27AE60" onClick={()=>go("lowrisk")}/>
        <Btn title="Orientation & prise en charge" color={c} onClick={()=>go("dispo")}/>
        <Btn title="Syncope réflexe (vasovagale)" color={c} onClick={()=>go("reflex")}/>
      </div>
    </div>);
    case "workup": return (<div>
      <Res title="Bilan initial systématique — tout patient" classe="Classe I" color={c} icon="🔬" items={[
        "Interrogatoire précis (circonstances, prodromes, position, témoins, récupération)",
        "Examen physique complet",
        "Mesure de la PA couché ET debout (recherche d'hypotension orthostatique)",
        "ECG 12 dérivations",
      ]}/>
      <Sec title="Les 3 questions clés" color={c}/>
      <div style={{ background:CARD, borderRadius:8, padding:"10px 13px", border:`1px solid ${BDR}` }}>
        <ul style={{ margin:0, paddingLeft:16, color:MUT, fontSize:12, lineHeight:1.6 }}>
          <li>S'agit-il bien d'une syncope (vs autre perte de connaissance) ?</li>
          <li>La cause étiologique est-elle identifiée ?</li>
          <li>Y a-t-il des éléments suggérant un risque élevé d'événement cardiovasculaire ou de décès ?</li>
        </ul>
      </div>
      <Info title="Examens de 2ᵉ intention (ciblés)" color={c}>
        Échocardiographie si cardiopathie connue/suspectée · monitoring ECG (télémétrie, Holter, Holter implantable) si suspicion d'arythmie · test d'inclinaison, massage sino-carotidien, explorations selon le contexte. Les examens biologiques et l'imagerie cérébrale ne sont PAS systématiques.
      </Info>
    </div>);
    case "highrisk": return (<div>
      <Res title="Éléments de HAUT risque (hospitalisation / surveillance)" classe="Haut risque" color="#EB5757" icon="🚨" items={[
        "Syncope à l'effort ou en position couchée",
        "Palpitations rapides précédant la syncope",
        "ECG anormal : signes d'ischémie, BAV de haut degré, bradycardie sévère, TV, préexcitation, QT long/court, Brugada, signes d'ACM/DAVD",
        "Cardiopathie structurelle connue ou insuffisance cardiaque (FEVG basse)",
        "Antécédents familiaux de mort subite précoce",
        "Absence de prodrome ou syncope brutale traumatisante",
        "Anémie sévère, troubles électrolytiques",
      ]}/>
      <Info title="Conduite" color="#EB5757">
        La présence de critères de haut risque impose une surveillance/hospitalisation et des investigations rapides (souvent monitoring ECG et échocardiographie). Ils orientent vers une syncope d'origine cardiaque (pronostic plus sévère).
      </Info>
    </div>);
    case "lowrisk": return (<div>
      <Res title="Éléments de BAS risque (rassurants)" classe="Bas risque" color="#27AE60" icon="🟢" items={[
        "Prodromes typiques de syncope réflexe (nausées, sensation de chaleur, sueurs)",
        "Facteur déclenchant identifié : douleur, émotion, vue du sang, station debout prolongée, environnement chaud/confiné",
        "Survenue après un repas, à la miction/défécation/toux",
        "Longue histoire de syncopes récidivantes identiques, bénignes",
        "Absence de cardiopathie et ECG normal",
      ]}/>
      <Info title="Conduite" color="#27AE60">
        En présence uniquement de critères de bas risque : rassurer, éduquer le patient sur la nature bénigne, mesures de prévention — retour à domicile sans investigation extensive.
      </Info>
    </div>);
    case "dispo": return (<div>
      <Sec title="Orientation selon la stratification" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Profil","Orientation"],
        ["Bas risque uniquement","Retour à domicile, éducation, pas d'examen extensif"],
        ["Haut risque","Surveillance/hospitalisation, monitoring ECG, écho, investigations rapides"],
        ["Intermédiaire / incertain","Évaluation structurée (unité syncope, observation, Holter implantable selon récidive)"],
      ]}/>
      <Info title="Message ESC" color={c}>
        Les scores de risque ne font pas mieux qu'un bon jugement clinique et ne doivent pas être utilisés seuls aux urgences. La stratification repose sur l'anamnèse, l'examen et l'ECG.
      </Info>
    </div>);
    case "reflex": return (<div>
      <Res title="Syncope réflexe (vasovagale) — prise en charge" classe="Prise en charge" color={c} icon="💗" items={[
        "Éducation et réassurance : reconnaître les prodromes, éviter les facteurs déclenchants",
        "Manœuvres de contre-pression isométriques dès les prodromes (croiser les jambes, serrer les mains/bras)",
        "Hydratation et apports sodés suffisants",
        "Réévaluer les traitements hypotenseurs chez le sujet âgé",
        "Cas sélectionnés récidivants : midodrine, ou stimulation cardiaque si composante cardio-inhibitrice documentée (formes sévères)",
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Évaluation pré-opératoire ────────────────────────────────────
function SPECpreopContent({ go, step }) {
  const c = SPEC_TOPICS.preop.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Démarche ESC 2022" color={c}>
        L'évaluation combine 3 axes : le risque lié à la chirurgie, le risque lié au patient (RCRI, comorbidités), et la capacité fonctionnelle. Le tout détermine les examens complémentaires utiles.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Risque lié à la chirurgie" color={c} onClick={()=>go("surg")}/>
        <Btn title="Capacité fonctionnelle (METs)" color={c} onClick={()=>go("mets")}/>
        <Btn title="RCRI & examens complémentaires" color={c} onClick={()=>go("rcri")}/>
        <Btn title="Gestion péri-opératoire des traitements" color={c} onClick={()=>go("drugs")}/>
      </div>
    </div>);
    case "surg": return (<div>
      <Sec title="Risque chirurgical (risque d'événement CV à 30j)" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Niveau","Exemples"],
        ["Faible (< 1%)","Chirurgie superficielle, sein, dentaire, thyroïde, ophtalmo, endoscopie"],
        ["Intermédiaire (1–5%)","Chirurgie abdominale, carotide, tête/cou, orthopédie majeure, urologie/gynéco majeure"],
        ["Élevé (> 5%)","Chirurgie aortique/vasculaire majeure, transplantation, duodéno-pancréatectomie, pneumonectomie"],
      ]}/>
      <Info color={c}>Aucun test cardiaque n'est recommandé avant une chirurgie à faible risque, quel que soit le patient.</Info>
    </div>);
    case "mets": return (<div>
      <Sec title="Capacité fonctionnelle" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Niveau","Équivalent"],
        ["< 4 METs (faible)","Ne peut monter 2 étages / marcher en côte — mauvais pronostic"],
        ["4–10 METs (modérée)","Monter 2 étages, marche rapide, course légère"],
        ["> 10 METs (bonne)","Sports intenses (natation, tennis en simple)"],
      ]}/>
      <Info title="Repère pratique" color={c}>
        Monter 2 étages sans s'arrêter ≈ 4 METs = seuil rassurant. Une capacité fonctionnelle ≥ 4 METs permet souvent de surseoir aux explorations avant chirurgie intermédiaire. Le score DASI (questionnaire) objective cette évaluation.
      </Info>
    </div>);
    case "rcri": return (<div>
      <Sec title="RCRI (Revised Cardiac Risk Index) — 6 critères" color={c}/>
      <div style={{ background:CARD, borderRadius:8, padding:"10px 13px", border:`1px solid ${BDR}`, marginBottom:10 }}>
        <ul style={{ margin:0, paddingLeft:16, color:MUT, fontSize:12, lineHeight:1.6 }}>
          <li>Chirurgie à haut risque (intrapéritonéale, intrathoracique, vasculaire sus-inguinale)</li>
          <li>Cardiopathie ischémique</li>
          <li>Insuffisance cardiaque</li>
          <li>Antécédent d'AVC / AIT</li>
          <li>Diabète insulino-requérant</li>
          <li>Insuffisance rénale (créatinine &gt; 177 µmol/L / 2 mg/dL)</li>
        </ul>
      </div>
      <Sec title="Examens complémentaires (ESC 2022)" color={c}/>
      <Res title="Recommandations" classe="ESC 2022" color={c} icon="🧪" items={[
        "ECG + biomarqueurs (troponine hs, ± NT-proBNP) avant chirurgie intermédiaire/haut risque si patient avec MCV, FRCV ou âge ≥ 65 ans",
        "ETT si dyspnée inexpliquée, souffle non exploré, ou capacité fonctionnelle faible avant chirurgie à haut risque",
        "Test d'ischémie (préférer l'effort) si capacité faible ET RCRI ≥ 1 avant chirurgie à haut risque",
        "Troponine hs à H24 et H48 post-op chez les patients à risque (dépistage du dommage myocardique péri-opératoire)",
      ]}/>
      <Info color={c}>Le RCRI est disponible en version interactive dans les Calculateurs de scores.</Info>
    </div>);
    case "drugs": return (<div>
      <Sec title="Gestion péri-opératoire" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Traitement","Conduite"],
        ["Aspirine","Poursuivre si prévention secondaire et risque hémorragique acceptable ; sinon discuter au cas par cas"],
        ["Bêtabloquants","Poursuivre si déjà en cours ; ne PAS initier à forte dose juste avant (surmortalité — POISE)"],
        ["IEC / ARA2","Envisager de suspendre le matin de l'intervention (risque d'hypotension), à réévaluer"],
        ["Statines","Poursuivre (bénéfice péri-opératoire)"],
        ["DAPT après stent","Ne pas interrompre prématurément — reporter la chirurgie élective, avis cardiologique"],
        ["Anticoagulants (AVK/DOAC)","Gestion selon risque thrombotique/hémorragique — voir fiche AVK / relais"],
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Cardio-oncologie ─────────────────────────────────────────────
function SPEConcoContent({ go, step }) {
  const c = SPEC_TOPICS.onco.color;
  switch(step) {
    case "start": return (<div>
      <Info title="ESC 2022 — 1er guideline dédié" color={c}>
        La cardio-oncologie vise à permettre au patient de compléter son traitement anticancéreux en minimisant la toxicité cardiovasculaire (CTR-CVT), par une évaluation et une surveillance structurées.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Évaluation de base (avant traitement)" color={c} onClick={()=>go("baseline")}/>
        <Btn title="Toxicités par classe de traitement" color={c} onClick={()=>go("classes")}/>
        <Btn title="Surveillance pendant le traitement" color={c} onClick={()=>go("surveillance")}/>
        <Btn title="Définition de la CTRCD" color={c} onClick={()=>go("ctrcd")}/>
        <Btn title="Cardioprotection" color={c} onClick={()=>go("protect")}/>
      </div>
    </div>);
    case "baseline": return (<div>
      <Res title="Évaluation de base — tous les patients" classe="Classe I" color={c} icon="📋" items={[
        "Stratification du risque CV avant tout traitement cardiotoxique (proformas HFA-ICOS adaptées au type de traitement)",
        "Anamnèse (FRCV, antécédents CV, traitements antérieurs), examen, ECG 12 dérivations",
        "Biomarqueurs de référence : troponine et/ou peptides natriurétiques (NT-proBNP)",
        "Échocardiographie avec FEVG et strain longitudinal global (GLS) de référence",
        "Classer en risque faible / modéré / élevé / très élevé → détermine l'intensité de la surveillance",
      ]}/>
    </div>);
    case "classes": return (<div>
      <Info title="Effets cardiovasculaires par classe" color={c}>
        Chaque classe d'anticancéreux a un profil de toxicité CV propre, qui conditionne les examens de surveillance à programmer. Tableau de synthèse orienté « quoi rechercher ».
      </Info>
      <Sec title="Anthracyclines (doxorubicine, épirubicine, daunorubicine)" color={c}/>
      <Res title="À rechercher" classe="Toxicité myocardique" color="#EB5757" icon="❤️" items={[
        "Dysfonction VG / insuffisance cardiaque — toxicité DOSE-DÉPENDANTE et en partie irréversible",
        "Surveillance : FEVG + GLS (ETT) et troponine ; le GLS chute avant la FEVG",
        "Risque majoré par : dose cumulée élevée, âge, radiothérapie thoracique, cardiopathie préexistante, association anti-HER2",
        "Cardioprotection possible : dexrazoxane, formulations liposomales si hautes doses chez patient à risque",
      ]}/>
      <Sec title="Anti-HER2 (trastuzumab, pertuzumab)" color={c}/>
      <Res title="À rechercher" classe="Dysfonction VG" color="#C26A1C" icon="❤️" items={[
        "Baisse de FEVG / insuffisance cardiaque — souvent RÉVERSIBLE à l'arrêt (contraste avec les anthracyclines)",
        "Surveillance : ETT (FEVG + GLS) toutes les ~3 mois pendant le traitement",
        "Toxicité majorée si administration concomitante ou séquentielle avec anthracyclines",
      ]}/>
      <Sec title="Fluoropyrimidines (5-FU, capécitabine)" color={c}/>
      <Res title="À rechercher" classe="Ischémie / vasospasme" color="#EB5757" icon="💔" items={[
        "Vasospasme coronaire → angor, ischémie myocardique, parfois IDM ou troubles du rythme",
        "Survient typiquement pendant la perfusion ; ECG + troponine si douleur thoracique",
        "Récidive fréquente à la réintroduction → avis cardio-oncologique",
      ]}/>
      <Sec title="Inhibiteurs VEGF / anti-angiogéniques (bévacizumab, ITK : sunitinib, sorafenib)" color={c}/>
      <Res title="À rechercher" classe="HTA / thrombose" color="#C26A1C" icon="🩸" items={[
        "HYPERTENSION artérielle (effet de classe, très fréquent) — surveillance TA rapprochée, traiter selon recommandations",
        "Dysfonction VG / insuffisance cardiaque",
        "Événements thrombotiques artériels et veineux ; risque hémorragique",
        "Allongement du QT pour certains ITK",
      ]}/>
      <Sec title="Inhibiteurs du protéasome (bortézomib, carfilzomib)" color={c}/>
      <Res title="À rechercher" classe="IC / HTA" color="#C26A1C" icon="❤️" items={[
        "Insuffisance cardiaque, dysfonction VG (surtout carfilzomib)",
        "HTA, plus rarement événements ischémiques",
        "ETT + biomarqueurs de référence puis surveillance selon le risque",
      ]}/>
      <Sec title="Inhibiteurs de checkpoint immunitaire (nivolumab, pembrolizumab, ipilimumab)" color={c}/>
      <Res title="À rechercher" classe="Myocardite (rare, grave)" color="#EB5757" icon="🔥" items={[
        "MYOCARDITE immuno-induite : rare mais potentiellement fulminante, mortalité élevée",
        "Survient souvent précocement (premières semaines) ; peut associer myosite et troubles conductifs/rythmiques",
        "Alerte : troponine ↑, dyspnée, douleur thoracique, BAV/arythmie → ECG + troponine + ETT/IRM, avis urgent",
        "Traitement : arrêt de l'immunothérapie + corticothérapie forte dose",
      ]}/>
      <Sec title="Inhibiteurs de tyrosine kinase BCR-ABL (nilotinib, ponatinib)" color={c}/>
      <Res title="À rechercher" classe="Vasculaire / QT" color="#C26A1C" icon="🩸" items={[
        "Événements vasculaires occlusifs (artériopathie, cardiopathie ischémique) — surtout ponatinib, nilotinib",
        "Allongement du QT ; contrôle des facteurs de risque CV",
      ]}/>
      <Sec title="Agents allongeant le QT" color={c}/>
      <Res title="À rechercher" classe="Torsades de pointes" color="#C26A1C" icon="📈" items={[
        "Arsenic trioxyde, certains ITK, anti-émétiques associés → risque de torsades de pointes",
        "ECG (QTc) avant et pendant ; corriger kaliémie/magnésémie ; prudence sur les associations QT-prolongatrices",
      ]}/>
      <Sec title="Radiothérapie thoracique" color={c}/>
      <Res title="À rechercher" classe="Toxicité tardive" color="#C26A1C" icon="☢️" items={[
        "Atteinte souvent TARDIVE (années) : coronaropathie, valvulopathie, péricardite constrictive, cardiomyopathie, troubles conductifs",
        "Surveillance à long terme, dépistage des FRCV et des atteintes structurelles",
      ]}/>
    </div>);
    case "surveillance": return (<div>
      <Res title="Surveillance pendant le traitement" classe="Selon risque" color={c} icon="👁️" items={[
        "Fréquence adaptée au risque de base et au type de thérapie",
        "Anthracyclines : ETT + biomarqueurs à intervalles selon le risque et la dose cumulée",
        "Anti-HER2 (trastuzumab) : ETT toutes les ~3 mois pendant le traitement (tous risques)",
        "Inhibiteurs du protéasome, ITK, thérapies ciblées : surveillance selon la classe et le risque",
        "GLS : sa baisse relative précède souvent la chute de FEVG (détection précoce)",
      ]}/>
    </div>);
    case "ctrcd": return (<div>
      <Sec title="CTRCD — dysfonction cardiaque liée au traitement" color={c}/>
      <Info title="Définition (IC-OS / ESC 2022)" color={c}>
        La dysfonction asymptomatique se gradue selon la FEVG et le GLS ; la forme symptomatique correspond à une insuffisance cardiaque clinique.
      </Info>
      <Table cols="1fr 1.6fr" rows={[
        ["Grade","Définition (asymptomatique)"],
        ["Légère","FEVG ≥ 50% + baisse relative du GLS > 15% et/ou ↑ des biomarqueurs"],
        ["Modérée","Baisse FEVG ≥ 10 points vers une valeur 40–49%"],
        ["Sévère","FEVG < 40%"],
      ]}/>
      <Info color={c}>Toute CTR-CVT devrait être discutée en réunion multidisciplinaire (cardiologue + oncologue) pour peser la balance bénéfice/risque de poursuite du traitement anticancéreux.</Info>
    </div>);
    case "protect": return (<div>
      <Res title="Stratégies de cardioprotection" classe="ESC 2022" color={c} icon="🛡️" items={[
        "Contrôle optimal des facteurs de risque CV avant/pendant/après (prévention ESC 2021)",
        "Patients à risque élevé/très élevé sous anthracyclines : envisager IEC/ARA2 + bêtabloquant en prévention primaire",
        "Envisager les statines chez les patients à haut risque",
        "Anthracyclines liposomales ou dexrazoxane à envisager si haut risque nécessitant de fortes doses d'anthracyclines",
        "Traitement de l'IC selon les recommandations habituelles si CTRCD avérée",
      ]}/>
    </div>);
    default: return null;
  }
}

// ═══ PÉRICARDITE & MYOCARDITE (ESC 2025) ═════════════════════════
// ── Péricardite aiguë ────────────────────────────────────────────
function PMpericarditeContent({ go, step }) {
  const c = PERIMYO_TOPICS.pericardite.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Péricardite aiguë (ESC 2025)" color={c}>
        Nouveau cadre ESC 2025 : concept de syndrome myopéricardique inflammatoire (IMPS) regroupant péricardite, myocardite et formes mixtes (myopéricardite = péricardite dominante + atteinte myocardique ; périmyocardite = myocardite dominante + atteinte péricardique).
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Diagnostic (critères)" color={c} onClick={()=>go("diag")}/>
        <Btn title="Critères de haut risque / hospitalisation" color="#EB5757" onClick={()=>go("highrisk")}/>
        <Btn title="Traitement" color={c} onClick={()=>go("ttt")}/>
        <Btn title="Formes récidivantes / incessantes" color={c} onClick={()=>go("recurrent")}/>
      </div>
    </div>);
    case "diag": return (<div>
      <Res title="Diagnostic — ≥ 2 des 4 critères" classe="Clinique" color={c} icon="🔍" items={[
        "Douleur thoracique typique : rétrosternale, aggravée à l'inspiration et en décubitus, soulagée par l'antéflexion",
        "Frottement péricardique à l'auscultation (persiste en apnée)",
        "ECG : sus-décalage ST diffus concave vers le haut ± sous-décalage du PQ, SANS signe en miroir",
        "Épanchement péricardique (nouveau ou aggravé) à l'échographie",
      ]}/>
      <Info title="Éléments de soutien" color={c}>
        Syndrome inflammatoire (CRP élevée), contexte viral fébrile. L'IRM cardiaque peut confirmer l'inflammation péricardique au-delà des critères cliniques. Toujours rechercher une atteinte myocardique associée (troponine).
      </Info>
      <Info title="Élévation de troponine" color={c}>
        Une troponine élevée signe une atteinte myocardique associée (myopéricardite). Elle nécessite une IRM cardiaque pour confirmer et impose la prudence (repos, cf. section Myocardite).
      </Info>
    </div>);
    case "highrisk": return (<div>
      <Res title="Facteurs de MAUVais pronostic → hospitalisation" classe="Haut risque" color="#EB5757" icon="🚨" items={[
        "Fièvre > 38°C",
        "Début subaigu (installation progressive sur plusieurs jours/semaines)",
        "Épanchement péricardique abondant (> 20 mm) ou tamponnade",
        "Absence de réponse à 7 jours d'AINS/aspirine",
        "Myopéricardite (atteinte myocardique associée)",
        "Immunodépression, traitement anticoagulant oral, traumatisme",
      ]}/>
      <Info title="Conduite" color="#EB5757">
        La présence d'au moins un facteur majeur ou mineur oriente vers une hospitalisation et une recherche étiologique approfondie. En leur absence, prise en charge ambulatoire avec réévaluation.
      </Info>
    </div>);
    case "ttt": return (<div>
      <Res title="Traitement de 1ère intention (IA)" classe="ESC 2025" color="#27AE60" icon="💊" items={[
        "AINS ou aspirine à dose anti-inflammatoire jusqu'à disparition des symptômes + normalisation CRP",
        "Aspirine : 750–1000 mg × 3/j · Ibuprofène : 600 mg × 3/j (avec protection gastrique)",
        "+ COLCHICINE systématique : 0,5 mg/j (< 70 kg) ou 0,5 mg × 2/j (≥ 70 kg), pendant 3 mois",
        "La colchicine réduit le risque de récidive de moitié — dernier médicament à arrêter",
        "Restriction d'activité physique jusqu'à résolution (symptômes + CRP + ECG)",
      ]}/>
      <Res title="2ᵉ intention" classe="Réservé" color="#C26A1C" icon="⚠️" items={[
        "Corticoïdes à FAIBLE dose : réservés aux contre-indications AINS/colchicine, grossesse, ou cause auto-immune",
        "Les corticoïdes favorisent les récidives et la cortico-dépendance — à éviter en 1ère intention et à décroître lentement",
      ]}/>
    </div>);
    case "recurrent": return (<div>
      <Info title="Récidive : 15–30% des cas" color={c}>
        Récidive = nouvel épisode après un intervalle libre ≥ 4–6 semaines. Forme incessante = symptômes persistants sans intervalle libre (~10%).
      </Info>
      <Res title="Stratégie d'escalade thérapeutique" classe="ESC 2025" color={c} icon="🔄" items={[
        "Reprise AINS/aspirine + colchicine (prolonger la colchicine ≥ 6 mois)",
        "Si cortico-dépendance : anti-IL1 (anakinra, rilonacept) — avancée majeure des recommandations",
        "Recherche étiologique approfondie (auto-immune, familiale)",
        "Suivi à long terme recommandé pour les formes récidivantes/incessantes",
      ]}/>
    </div>);
    default: return null;
  }
}

// ── Myocardite ───────────────────────────────────────────────────
function PMmyocarditeContent({ go, step }) {
  const c = PERIMYO_TOPICS.myocardite.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Myocardite aiguë (ESC 2025)" color={c}>
        Diagnostic clinique appuyé par l'IRM cardiaque (critères de Lake Louise) ou la biopsie endomyocardique. Attention : le risque de mort subite persiste même après résolution de l'inflammation.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Présentation & diagnostic" color={c} onClick={()=>go("diag")}/>
        <Btn title="Formes graves / haut risque" color="#EB5757" onClick={()=>go("severe")}/>
        <Btn title="Prise en charge" color={c} onClick={()=>go("ttt")}/>
      </div>
    </div>);
    case "diag": return (<div>
      <Res title="Présentations cliniques évocatrices" classe="Clinique" color={c} icon="🔍" items={[
        "Douleur thoracique pseudo-angineuse (souvent post-virale : syndrome grippal récent)",
        "Insuffisance cardiaque récente inexpliquée (dyspnée, dysfonction VG)",
        "Troubles du rythme ou de conduction (parfois révélateurs, mort subite)",
        "Tableau de choc cardiogénique (myocardite fulminante)",
      ]}/>
      <Res title="Bilan diagnostique" classe="ESC 2025" color={c} icon="🧪" items={[
        "Troponine (élévation quasi-constante), BNP/NT-proBNP, CRP",
        "ECG (troubles diffus, sus-ST, troubles conductifs), ETT (fonction VG segmentaire/globale)",
        "Coronarographie ou coroscanner pour éliminer un SCA (diagnostic différentiel majeur)",
        "IRM cardiaque : critères de Lake Louise (œdème + rehaussement tardif de type myocarditique)",
        "Biopsie endomyocardique si forme sévère/incertaine (myocardite à cellules géantes, sarcoïdose)",
      ]}/>
    </div>);
    case "severe": return (<div>
      <Res title="Critères de gravité / haut risque" classe="Haut risque" color="#EB5757" icon="🚨" items={[
        "Dysfonction VG (FEVG abaissée)",
        "Insuffisance cardiaque aiguë, bas débit, choc cardiogénique (forme fulminante)",
        "Troubles du rythme ventriculaire ou troubles conductifs de haut degré",
        "Élévation importante et persistante de la troponine",
        "Suspicion de myocardite à cellules géantes ou de sarcoïdose (pronostic sévère)",
      ]}/>
      <Info title="Surveillance du risque rythmique" color="#EB5757">
        Le risque de mort subite persiste même après résolution de l'inflammation. Un défibrillateur portable (LifeVest) est recommandé chez des patients sélectionnés à haut risque pendant les 3–6 mois de récupération. DAI à envisager si haut risque persistant (cellules géantes, sarcoïdose).
      </Info>
    </div>);
    case "ttt": return (<div>
      <Res title="Prise en charge" classe="ESC 2025" color={c} icon="💊" items={[
        "Hospitalisation et monitoring ECG pour les formes avec dysfonction VG, arythmie ou troponine élevée",
        "Traitement de l'insuffisance cardiaque selon les recommandations (si dysfonction VG)",
        "RESTRICTION SPORTIVE stricte ≥ 3–6 mois (éviction de l'effort intense — risque rythmique)",
        "Formes fulminantes : support hémodynamique, assistance circulatoire (ECMO) en centre expert",
        "Immunosuppression réservée aux myocardites auto-immunes prouvées (cellules géantes, sarcoïdose, connectivites)",
        "Colchicine + AINS pour la composante péricardique associée (périmyocardite)",
      ]}/>
      <Res title="Bêtabloquants (nouveauté ESC 2025)" classe="Classe IIa" level="C" color="#27AE60" icon="💊" items={[
        "À envisager pendant ≥ 6 mois chez les patients avec myocardite aiguë, en particulier si troponine élevée",
        "Objectif : contrôle des symptômes et prévention des arythmies (effet anti-adrénergique)",
        "Recommandés indépendamment de la fonction VG (position ESC, contrairement au consensus ACC américain)",
        "NE PAS initier à la phase instable : contre-indiqués si insuffisance cardiaque décompensée, choc cardiogénique, hypotension, bradycardie ou BAV de haut degré (fréquents dans les formes fulminantes)",
        "Introduction après stabilisation hémodynamique, puis titration prudente",
      ]}/>
      <Info title="Bêtabloquants — le bon timing" color={c}>
        Le principe est celui de l'insuffisance cardiaque : jamais en phase aiguë instable/fulminante (où ils aggravent le bas débit), mais recommandés une fois le patient stabilisé, et poursuivis au moins 6 mois. En cas de dysfonction VG persistante, ils s'intègrent dans le traitement standard de l'IC.
      </Info>
      <Info title="Myocardite des inhibiteurs de checkpoint" color={c}>
        Urgence spécifique (cf. Cardio-oncologie) : arrêt de l'immunothérapie + corticothérapie forte dose, mortalité élevée.
      </Info>
    </div>);
    default: return null;
  }
}

// ── Péricardite constrictive ─────────────────────────────────────
function PMconstrictiveContent({ go, step }) {
  const c = PERIMYO_TOPICS.constrictive.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Péricardite chronique constrictive" color={c}>
        Épaississement/rigidité péricardique gênant le remplissage diastolique. Évolution possible d'une péricardite (surtout bactérienne, tuberculeuse, post-radique, post-chirurgicale).
      </Info>
      <Sec title="Signes cliniques" color={c}/>
      <Res title="Tableau d'insuffisance cardiaque DROITE prédominante" classe="Clinique" color={c} icon="🔗" items={[
        "Turgescence jugulaire, signe de Kussmaul (↑ paradoxale de la pression jugulaire à l'inspiration)",
        "Œdèmes des membres inférieurs, ascite, hépatomégalie",
        "Signes de bas débit, dyspnée d'effort",
      ]}/>
      <Sec title="Diagnostic" color={c}/>
      <Res title="Explorations" classe="Imagerie" color={c} icon="🔍" items={[
        "ETT : épaississement péricardique, septum paradoxal, variations respiratoires marquées des flux, dilatation VCI",
        "Scanner / IRM : épaississement péricardique (± calcifications au scanner)",
        "Cathétérisme : égalisation des pressions diastoliques, aspect en 'dip-plateau' (racine carrée)",
        "Diagnostic différentiel clé : cardiomyopathie restrictive (démarche écho + cathé)",
      ]}/>
      <Info title="Traitement" color={c}>
        Péricardectomie chirurgicale (traitement curatif de référence dans les formes symptomatiques) — la péricardectomie totale est préférée à la résection partielle, en centre expert. Traitement médical de la surcharge en attendant / si constriction transitoire inflammatoire (essai anti-inflammatoire).
      </Info>
    </div>);
    default: return null;
  }
}

function PeriMyoContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "pericardite")  return <PMpericarditeContent  {...props}/>;
  if (topic === "myocardite")   return <PMmyocarditeContent   {...props}/>;
  if (topic === "constrictive") return <PMconstrictiveContent {...props}/>;
  return null;
}

// ═══ FACTEURS DE RISQUE CARDIOVASCULAIRE ═════════════════════════
function FDRriskContent({ go, step }) {
  const c = FDR_TOPICS.risk.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Estimer le risque avant de traiter" color={c}>
        La catégorie de risque détermine la cible de LDL et l'intensité du traitement. Chez le sujet « apparemment sain », on utilise SCORE2 (40–69 ans) ou SCORE2-OP (70–89 ans). Certaines situations classent d'emblée en (très) haut risque, sans calcul.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Catégories de risque & cibles LDL" color={c} onClick={()=>go("cat")}/>
        <Btn title="Modificateurs de risque" subtitle="Lp(a), score calcique, ATCD familiaux…" color={c} onClick={()=>go("modif")}/>
        <Btn title="Bilan à réaliser" color={c} onClick={()=>go("bilan")}/>
      </div>
    </div>);
    case "cat": return (<div>
      <Sec title="Situations classant d'emblée (pas de SCORE2)" color={c}/>
      <Res title="TRÈS haut risque" classe="Très haut" color="#EB5757" icon="🚨" items={[
        "Maladie cardiovasculaire athéromateuse DOCUMENTÉE (SCA, IDM, revascularisation, AVC/AIT, AOMI, plaque significative en imagerie)",
        "Diabète avec atteinte d'organe cible, ou ≥ 3 facteurs de risque majeurs, ou DT1 précoce et ancien",
        "Insuffisance rénale chronique SÉVÈRE (DFG &lt; 30 mL/min/1,73 m²)",
        "Hypercholestérolémie familiale AVEC maladie CV ou autre facteur de risque majeur",
        "SCORE2 ≥ 7,5 % (&lt; 50 ans) · ≥ 10 % (50–69 ans) · ≥ 15 % (≥ 70 ans)",
      ]}/>
      <Res title="HAUT risque" classe="Haut" color="#C26A1C" icon="⚠️" items={[
        "Facteur de risque isolé très élevé : cholestérol total &gt; 8 mmol/L (&gt; 310 mg/dL), LDL &gt; 4,9 mmol/L (&gt; 190 mg/dL), PA ≥ 180/110 mmHg",
        "Hypercholestérolémie familiale sans autre facteur de risque majeur",
        "Diabète ≥ 10 ans sans atteinte d'organe cible, ou avec un autre facteur de risque",
        "Insuffisance rénale chronique MODÉRÉE (DFG 30–59)",
        "SCORE2 2,5–7,5 % (&lt; 50 ans) · 5–10 % (50–69) · 7,5–15 % (≥ 70)",
      ]}/>
      <Sec title="Cibles de LDL-cholestérol (ESC/EAS, inchangées en 2025)" color={c}/>
      <Table cols="1.1fr 1.3fr" rows={[
        ["Catégorie","Cible LDL"],
        ["Très haut risque","&lt; 1,4 mmol/L (&lt; 55 mg/dL) ET réduction ≥ 50 % du LDL initial"],
        ["Haut risque","&lt; 1,8 mmol/L (&lt; 70 mg/dL) ET réduction ≥ 50 %"],
        ["Risque modéré","&lt; 2,6 mmol/L (&lt; 100 mg/dL)"],
        ["Risque faible","&lt; 3,0 mmol/L (&lt; 116 mg/dL)"],
        ["Récidive d'événement &lt; 2 ans sous statine max","&lt; 1,0 mmol/L (&lt; 40 mg/dL) — à envisager"],
      ]}/>
      <Info title="Deux conditions, pas une" color={c}>
        Aux niveaux haut et très haut risque, il faut atteindre la cible chiffrée <b>ET</b> une réduction d'au moins 50 % par rapport au LDL de départ. Un patient déjà bas au départ doit quand même être traité.
      </Info>
    </div>);
    case "modif": return (<div>
      <Info title="Reclasser un patient proche d'un seuil" color={c}>
        Le SCORE2 ne capture pas tout. Chez les patients proches d'un seuil décisionnel, ces modificateurs peuvent faire basculer la décision de traiter.
      </Info>
      <Res title="Modificateurs de risque (ESC/EAS 2025)" classe="Reclassification" color={c} icon="🔍" items={[
        "Lp(a) élevée — un dosage au moins UNE FOIS dans la vie est recommandé chez l'adulte (déterminisme génétique, ne varie quasiment pas)",
        "Score calcique coronaire (CAC) élevé — reclasse vers le haut ; un CAC = 0 rassure (cf. fiche Scanner)",
        "Plaque athéromateuse à l'écho-doppler des carotides ou fémorales",
        "Antécédents familiaux de maladie CV précoce (H &lt; 55 ans, F &lt; 65 ans)",
        "Maladies inflammatoires chroniques (PR, lupus, psoriasis), VIH",
        "Précarité socio-économique, ethnies à haut risque (ex. Asie du Sud)",
        "Syndrome d'apnées obstructives du sommeil, stéatose hépatique, pathologies de la grossesse (pré-éclampsie, diabète gestationnel)",
      ]}/>
      <Info title="Nouveauté 2025" color={c}>
        La Lp(a) et le score calcique prennent une place plus explicite comme modificateurs de risque. Ils ne remplacent pas SCORE2 mais l'affinent.
      </Info>
    </div>);
    case "bilan": return (<div>
      <Sec title="Bilan initial de prévention" color={c}/>
      <Res title="Biologie" classe="Bilan" color={c} icon="🧪" items={[
        "Bilan lipidique : cholestérol total, HDL, LDL, triglycérides. Le non-HDL (= CT − HDL) est utile (et ne nécessite pas d'être à jeun)",
        "ApoB : intéressante si triglycérides élevés, diabète, obésité, LDL très bas",
        "Lp(a) : au moins une fois dans la vie",
        "Glycémie à jeun ± HbA1c, créatinine et DFG, bilan hépatique, TSH (dyslipidémie secondaire)",
      ]}/>
      <Res title="Clinique & paraclinique" classe="Bilan" color={c} icon="🩺" items={[
        "Pression artérielle (mesures répétées, MAPA/automesure si besoin)",
        "IMC, tour de taille, statut tabagique, activité physique, consommation d'alcool",
        "Calcul du SCORE2 / SCORE2-OP (cf. Outils → Scores)",
        "Score calcique ou écho-doppler artériel selon le contexte de reclassification",
      ]}/>
      <Info title="Éliminer une dyslipidémie secondaire" color={c}>
        Avant d'étiqueter une dyslipidémie primitive : hypothyroïdie, syndrome néphrotique, cholestase, alcool, diabète déséquilibré, médicaments (corticoïdes, antirétroviraux, ciclosporine).
      </Info>
    </div>);
    default: return null;
  }
}

function FDRlipidesContent({ go, step }) {
  const c = FDR_TOPICS.lipides.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Dyslipidémies — ESC/EAS 2025 (mise à jour ciblée)" color={c}>
        Les cibles de LDL restent celles de 2019. Ce qui change : on doit les atteindre <b>plus vite</b>, avec un recours plus large et plus précoce à la <b>bithérapie</b>. « The lower, the better ; the earlier, the better. »
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Cibles de LDL" color={c} onClick={()=>go("cibles")}/>
        <Btn title="Les traitements disponibles" color={c} onClick={()=>go("ttt")}/>
        <Btn title="Équivalence des statines" subtitle="Intensité, doses, conversions" color={c} onClick={()=>go("equiv")}/>
        <Btn title="Stratégie d'escalade" color={c} onClick={()=>go("escalade")}/>
        <Btn title="Après un SCA" subtitle="Intensification précoce (nouveauté 2025)" color={c} onClick={()=>go("sca")}/>
        <Btn title="Intolérance aux statines" color={c} onClick={()=>go("intol")}/>
        <Btn title="Hypercholestérolémie familiale & Lp(a)" color={c} onClick={()=>go("fh")}/>
        <Btn title="Hypertriglycéridémie" color={c} onClick={()=>go("tg")}/>
      </div>
    </div>);
    case "cibles": return (<div>
      <Sec title="Cibles de LDL selon le risque" color={c}/>
      <Table cols="1.1fr 1.3fr" rows={[
        ["Catégorie","Cible LDL"],
        ["Très haut risque","&lt; 1,4 mmol/L (&lt; 55 mg/dL) + réduction ≥ 50 %"],
        ["Haut risque","&lt; 1,8 mmol/L (&lt; 70 mg/dL) + réduction ≥ 50 %"],
        ["Risque modéré","&lt; 2,6 mmol/L (&lt; 100 mg/dL)"],
        ["Risque faible","&lt; 3,0 mmol/L (&lt; 116 mg/dL)"],
        ["2ᵉ événement &lt; 2 ans sous statine maximale","&lt; 1,0 mmol/L (&lt; 40 mg/dL) — à envisager"],
      ]}/>
      <Info title="Cibles secondaires" color={c}>
        Non-HDL : cible = LDL + 0,8 mmol/L (soit &lt; 2,2 / 2,6 / 3,4 mmol/L). ApoB : &lt; 65 / 80 / 100 mg/dL selon très haut / haut / risque modéré.
      </Info>
      <Info title="Repère de conversion" color={c}>
        1 mmol/L de LDL ≈ 38,7 mg/dL. Une baisse de 1 mmol/L soutenue réduit les événements majeurs d'environ 20 %.
      </Info>
    </div>);
    case "ttt": return (<div>
      <Sec title="Statines — intensité" color={c}/>
      <Table cols="1fr 1.5fr 0.9fr" rows={[
        ["Intensité","Molécules","Baisse LDL"],
        ["Haute","Atorvastatine 40–80 mg · Rosuvastatine 20–40 mg","≈ 50 %"],
        ["Modérée","Atorvastatine 10–20 · Rosuvastatine 5–10 · Simvastatine 20–40 · Pravastatine 40","≈ 30–50 %"],
        ["Faible","Simvastatine 10 · Pravastatine 10–20","&lt; 30 %"],
      ]}/>
      <Sec title="Traitements non-statines" color={c}/>
      <Table cols="1fr 1.1fr 1.4fr" rows={[
        ["Molécule","Baisse LDL","Points clés"],
        ["Ézétimibe","≈ 15–20 % en add-on","Inhibe l'absorption intestinale · 1ʳᵉ association, bien tolérée, orale"],
        ["Acide bempédoïque","≈ 20–25 %","Nouveauté 2025 (essai CLEAR Outcomes) · pro-drogue hépatique → peu de myalgies · utile si intolérance aux statines"],
        ["Anti-PCSK9 (évolocumab, alirocumab)","≈ 50–60 % en add-on","Anticorps monoclonal SC toutes les 2–4 semaines"],
        ["Inclisiran","≈ 50 %","Petit ARN interférent (siRNA) · 2 injections par an après la dose de charge"],
        ["Évinacumab","—","Réservé à l'hypercholestérolémie familiale HOMOZYGOTE"],
      ]}/>
      <Info title="Statine = socle" color={c}>
        La statine à dose maximale tolérée reste le traitement de première intention (Classe I). Les autres agents viennent en complément, ou en remplacement en cas d'intolérance authentique.
      </Info>
    </div>);
    case "equiv": return (<div>
      <Info title="Équivalence des statines" color={c}>
        Les statines se comparent par leur <b>intensité</b> (baisse de LDL attendue), pas par leur nombre de milligrammes. Une intensité haute vise ≈ 50 % de baisse.
      </Info>
      <Sec title="Classement par intensité (baisse de LDL attendue)" color={c}/>
      <Table cols="1.1fr 1fr 1fr 1fr" rows={[
        ["Molécule","Faible (&lt; 30 %)","Modérée (30–50 %)","Haute (≥ 50 %)"],
        ["Atorvastatine","—","10–20 mg","40–80 mg"],
        ["Rosuvastatine","—","5–10 mg","20–40 mg"],
        ["Simvastatine","10 mg","20–40 mg","—"],
        ["Pravastatine","10–20 mg","40–80 mg","—"],
        ["Fluvastatine","20–40 mg","80 mg (LP)","—"],
        ["Pitavastatine","1 mg","2–4 mg","—"],
      ]}/>
      <Sec title="Rapports de puissance (méta-analyse VOYAGER)" color={c}/>
      <Res title="Règle de conversion" classe="Équivalence" color={c} icon="⚖️" items={[
        "À dose égale, la rosuvastatine est ≈ 3 fois plus puissante que l'atorvastatine, et ≈ 7–8 fois plus que la simvastatine",
        "Repère simple : rosuvastatine 10 mg ≈ atorvastatine 30 mg ≈ simvastatine 70 mg (baisse de LDL comparable)",
        "Autre repère : atorvastatine ≈ 2 fois plus puissante que la simvastatine, à dose égale",
        "Doubler la dose d'une statine n'apporte qu'environ 6 % de baisse supplémentaire (« règle des 6 % »)",
      ]}/>
      <Table cols="1fr 1fr 1fr" rows={[
        ["Rosuvastatine","≈ Atorvastatine","≈ Simvastatine"],
        ["5 mg","15 mg","40 mg"],
        ["10 mg","30 mg","70 mg"],
        ["20 mg","70 mg","non atteignable"],
        ["40 mg","non atteignable (&gt; 80 mg)","non atteignable"],
      ]}/>
      <Info title="Points de vigilance" color={c}>
        La simvastatine 80 mg n'est plus recommandée (risque de myopathie). Simvastatine et atorvastatine sont métabolisées par le CYP3A4 → nombreuses interactions (amiodarone, vérapamil, diltiazem, macrolides, antifongiques azolés, jus de pamplemousse). Rosuvastatine et pravastatine y échappent largement : à privilégier en cas d'interactions ou de polymédication.
      </Info>
      <Info title="Association" color={c}>
        Au-delà de la statine maximale tolérée, doubler la dose apporte peu : mieux vaut associer l'ézétimibe (≈ 15–20 % de baisse supplémentaire) que de forcer la posologie.
      </Info>
    </div>);
    case "escalade": return (<div>
      <Sec title="Stratégie d'intensification" color={c}/>
      <Res title="Démarche" classe="ESC/EAS 2025" color={c} icon="📈" items={[
        "1️⃣ Mode de vie + statine de HAUTE intensité à dose maximale tolérée",
        "2️⃣ Si cible non atteinte : ajouter l'ÉZÉTIMIBE (ne pas attendre — bithérapie précoce)",
        "3️⃣ Si cible toujours non atteinte : ajouter un anti-PCSK9 (ou acide bempédoïque selon l'écart à la cible et la disponibilité)",
        "Réévaluer le bilan lipidique 4 à 6 semaines après chaque modification, puis annuellement",
        "Nouveauté 2025 : privilégier l'association d'emblée plutôt qu'une escalade lente, si l'écart à la cible rend l'objectif inatteignable en monothérapie",
      ]}/>
      <Info title="L'inertie thérapeutique" color={c}>
        C'est le vrai problème en pratique : une minorité de patients à très haut risque atteint sa cible. La titration « lente et prudente » est explicitement critiquée. Si l'écart à la cible dépasse ce qu'une statine seule peut faire (≈ 50 %), il faut associer d'emblée.
      </Info>
    </div>);
    case "sca": return (<div>
      <Info title="Nouveauté 2025 — intensification dès l'hospitalisation" color="#EB5757">
        Après un syndrome coronarien aigu, on ne procède plus par paliers successifs : le traitement hypolipémiant doit être intensifié <b>pendant l'hospitalisation index</b>.
      </Info>
      <Res title="Conduite" classe="Post-SCA" color={c} icon="🚨" items={[
        "Patient naïf de traitement : envisager d'emblée une statine de haute intensité + ÉZÉTIMIBE dès l'hospitalisation, si la cible ne peut être atteinte par la statine seule",
        "Patient déjà traité : intensifier selon l'écart à la cible",
        "Cible : LDL &lt; 1,4 mmol/L (&lt; 55 mg/dL) et réduction ≥ 50 %",
        "Un anti-PCSK9 peut être introduit précocement (essai EVOPACS) si l'objectif reste hors d'atteinte",
        "Contrôle du bilan lipidique à 4–6 semaines",
      ]}/>
      <SeeAlso items={[
        { label:"SCA (ST+/NST)", icon:"🩸", color:"#E85D4A", target:{ kind:"topic", chapterKey:"ischemic", topicKey:"sca" } },
        { label:"Cardioprotection", icon:"🛡️", color:"#2F8F66", target:{ kind:"topic", chapterKey:"ischemic", topicKey:"cardioprot" } },
      ]}/>
    </div>);
    case "intol": return (<div>
      <Info title="Intolérance aux statines" color={c}>
        Les myalgies sont fréquemment rapportées, mais l'intolérance <b>authentique</b> est rare : les essais en aveugle (effet nocebo) montrent que la plupart des symptômes ne sont pas imputables à la molécule.
      </Info>
      <Res title="Démarche pratique" classe="Conduite" color={c} icon="🔄" items={[
        "Éliminer une autre cause : hypothyroïdie, effort inhabituel, interactions médicamenteuses, déficit en vitamine D",
        "Doser les CPK : arrêt si &gt; 10 × la normale ou rhabdomyolyse ; sinon poursuite possible",
        "Ré-essai (rechallenge) : fenêtre thérapeutique puis reprise de la même statine à dose plus faible",
        "Essayer une AUTRE statine (rosuvastatine, pravastatine), ou une prise un jour sur deux",
        "Associer d'emblée l'ézétimibe à une faible dose de statine",
        "Si intolérance vraie et complète : acide bempédoïque, ézétimibe, anti-PCSK9, inclisiran",
      ]}/>
      <Info title="Ne pas laisser un patient sans traitement" color={c}>
        L'objectif reste d'abaisser le LDL. Une statine à faible dose tolérée + ézétimibe fait souvent mieux que l'abandon pur et simple.
      </Info>
    </div>);
    case "fh": return (<div>
      <Sec title="Hypercholestérolémie familiale (HF)" color={c}/>
      <Res title="Reconnaître" classe="HF" color={c} icon="🧬" items={[
        "Suspicion : LDL &gt; 4,9 mmol/L (&gt; 190 mg/dL) chez l'adulte, ATCD familiaux d'hypercholestérolémie ou de maladie CV précoce",
        "Signes cliniques : xanthomes tendineux, arc cornéen avant 45 ans, xanthélasma",
        "Critères de Dutch Lipid Clinic Network (score diagnostique)",
        "Forme hétérozygote : fréquente (≈ 1/300) et très sous-diagnostiquée",
        "Dépistage familial en cascade recommandé",
      ]}/>
      <Res title="Traiter" classe="HF" color={c} icon="💊" items={[
        "Statine haute intensité d'emblée, très souvent associée à l'ézétimibe",
        "Recours fréquent aux anti-PCSK9 pour atteindre la cible",
        "Forme homozygote : centre expert, évinacumab, aphérèse des LDL",
      ]}/>
      <Sec title="Lipoprotéine(a)" color={c}/>
      <Res title="Lp(a)" classe="Modificateur" color={c} icon="🔬" items={[
        "Déterminée génétiquement, stable toute la vie → un dosage UNIQUE suffit, recommandé au moins une fois chez tout adulte",
        "Une Lp(a) élevée majore le risque athéromateux ET le risque de rétrécissement aortique",
        "Pas de traitement spécifique validé à ce jour ; les statines ne l'abaissent pas (elles peuvent l'augmenter légèrement)",
        "Conduite : intensifier le contrôle des AUTRES facteurs de risque · des thérapies ciblées sont en cours d'évaluation",
      ]}/>
    </div>);
    case "tg": return (<div>
      <Info title="Hypertriglycéridémie" color={c}>
        Le LDL reste la cible principale. Les triglycérides sont un facteur de risque additionnel, reconnu plus explicitement en 2025, et un risque de pancréatite quand ils sont très élevés.
      </Info>
      <Res title="Conduite" classe="Triglycérides" color={c} icon="🔺" items={[
        "1ʳᵉ étape : mode de vie (alcool, sucres rapides, poids, activité physique), équilibrer un diabète, éliminer une cause secondaire",
        "Statine en 1ʳᵉ intention chez le patient à risque (elle abaisse aussi les TG)",
        "Haut/très haut risque, TG 1,52–5,63 mmol/L (135–499 mg/dL) malgré statine : envisager l'icosapent éthyl 2 × 2 g/j en association (essai REDUCE-IT)",
        "TG &gt; 8,5 mmol/L (&gt; 750 mg/dL) : risque de PANCRÉATITE — mesures diététiques strictes, fibrate",
        "Syndrome de chylomicronémie familiale : volanésorsen à envisager (centre expert)",
      ]}/>
      <Info title="Piège" color={c}>
        En cas de TG très élevés, le LDL calculé (Friedewald) devient faux. Utiliser le non-HDL ou l'ApoB, ou un dosage direct.
      </Info>
    </div>);
    default: return null;
  }
}

function FDRtabacContent({ go, step }) {
  const c = FDR_TOPICS.tabac.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Le facteur de risque le plus rentable à traiter" color={c}>
        L'arrêt du tabac est l'intervention la plus efficace en prévention cardiovasculaire, quel que soit l'âge. Le bénéfice débute dès les premières semaines et le sur-risque décroît fortement en 1 à 5 ans.
      </Info>
      <Res title="Principes" classe="Sevrage" color={c} icon="🚭" items={[
        "Objectif : arrêt COMPLET (pas de réduction seule) ; éviter aussi le tabagisme passif",
        "Conseil bref systématique à chaque consultation, répété, sans jugement",
        "Évaluer la dépendance (test de Fagerström) et la motivation",
        "Accompagnement comportemental + traitement pharmacologique = meilleure efficacité",
      ]}/>
      <Sec title="Aides pharmacologiques" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Traitement","Points clés"],
        ["Substituts nicotiniques","Patch (dose de fond) + forme orale (compulsions) · remboursés · associables"],
        ["Varénicline","Efficace ; surveiller la tolérance neuropsychiatrique"],
        ["Bupropion","Alternative ; contre-indications (convulsions, troubles alimentaires)"],
        ["Cigarette électronique","Peut aider au sevrage, mais pas un traitement recommandé en première intention ; ne pas la promouvoir chez le non-fumeur"],
      ]}/>
      <Info title="Après un SCA" color={c}>
        L'hospitalisation est un moment privilégié : le sevrage débuté à l'hôpital, avec suivi structuré, a un taux de réussite nettement supérieur.
      </Info>
      <SeeAlso items={[{ label:"Réadaptation cardiaque", icon:"🏃", color:"#2F8F66", target:{ kind:"topic", chapterKey:"ischemic", topicKey:"readapt" } }]}/>
    </div>);
    default: return null;
  }
}

function FDRdiabeteContent({ go, step }) {
  const c = FDR_TOPICS.diabete.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Le diabète est une maladie cardiovasculaire" color={c}>
        La prise en charge ne se limite plus à l'HbA1c : on choisit désormais les molécules pour leur bénéfice cardiovasculaire et rénal démontré, indépendamment du contrôle glycémique.
      </Info>
      <Res title="Molécules à bénéfice cardiovasculaire prouvé" classe="Priorité" color={c} icon="💊" items={[
        "Inhibiteurs de SGLT2 (gliflozines) : réduisent l'insuffisance cardiaque et la progression rénale · bénéfice y compris SANS diabète (cf. chapitre IC)",
        "Agonistes du récepteur du GLP-1 : réduisent les événements athéromateux majeurs, effet favorable sur le poids",
        "Metformine : traitement historique de fond",
        "À privilégier chez le diabétique avec maladie CV établie ou à haut risque, quel que soit le niveau d'HbA1c",
      ]}/>
      <Res title="Le reste de la prise en charge" classe="Global" color={c} icon="🎯" items={[
        "Le diabète classe d'emblée en haut ou très haut risque selon l'atteinte d'organe et l'ancienneté (cf. Évaluation du risque)",
        "Cible LDL correspondante : &lt; 1,8 ou &lt; 1,4 mmol/L — la statine est presque toujours indiquée",
        "Contrôle tensionnel strict, arrêt du tabac, mode de vie",
        "Cible d'HbA1c individualisée (âge, comorbidités, risque hypoglycémique)",
        "Dépistage : rétine, pieds, albuminurie/DFG",
      ]}/>
      <Info title="Prédiabète" color={c}>
        Ne pas le négliger : hyperglycémie modérée à jeun ou intolérance au glucose justifient une intervention intensive sur le mode de vie, qui réduit la conversion en diabète.
      </Info>
    </div>);
    default: return null;
  }
}

function FDRhygieneContent({ go, step }) {
  const c = FDR_TOPICS.hygiene.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Le socle de toute prévention" color={c}>
        Les mesures de mode de vie s'appliquent à TOUS les patients, quel que soit le niveau de risque, et conditionnent l'efficacité des traitements.
      </Info>
      <Sec title="Repères chiffrés" color={c}/>
      <Table cols="1fr 1.5fr" rows={[
        ["Domaine","Objectif"],
        ["Activité physique","≥ 150 min/semaine d'intensité modérée, ou 75 min d'intensité élevée · + renforcement musculaire 2×/semaine"],
        ["Sédentarité","Rompre les périodes assises prolongées"],
        ["Alimentation","Régime de type méditerranéen : légumes, fruits, légumineuses, poisson, huile d'olive · limiter viandes transformées, sucres, acides gras saturés (remplacés par des insaturés)"],
        ["Sel","&lt; 5 g/jour"],
        ["Poids","IMC ≈ 20–25 kg/m² · tour de taille &lt; 94 cm (H) / &lt; 80 cm (F)"],
        ["Alcool","Le moins possible ; aucun seuil n'est cardioprotecteur"],
        ["Sommeil","≈ 7–9 h ; dépister le SAOS si ronflements, somnolence, HTA résistante"],
      ]}/>
      <Res title="En pratique" classe="Conseils" color={c} icon="🥗" items={[
        "Fixer des objectifs concrets et progressifs plutôt que des injonctions générales",
        "Le bénéfice de l'activité physique existe dès les faibles doses : « un peu vaut mieux que rien »",
        "Réadaptation cardiaque après un événement : bénéfice démontré sur la mortalité et les réhospitalisations",
        "Prendre en compte la précarité, qui est elle-même un facteur de risque",
      ]}/>
      <SeeAlso items={[
        { label:"Hypertension artérielle", icon:"🩸", color:"#2F8F66", target:{ kind:"chapter", chapterKey:"hta" } },
        { label:"Cardiologie du sport", icon:"🏃", color:"#00966A", target:{ kind:"chapter", chapterKey:"sport" } },
        { label:"Réadaptation", icon:"💪", color:"#2F8F66", target:{ kind:"topic", chapterKey:"ischemic", topicKey:"readapt" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function FdrContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "risk")    return <FDRriskContent    {...props}/>;
  if (topic === "lipides") return <FDRlipidesContent {...props}/>;
  if (topic === "tabac")   return <FDRtabacContent   {...props}/>;
  if (topic === "diabete") return <FDRdiabeteContent {...props}/>;
  if (topic === "hygiene") return <FDRhygieneContent {...props}/>;
  return null;
}

// ═══ HTAP / HYPERTENSION PULMONAIRE (ESC 2022) ═══════════════════
function HTAPdefclassContent({ go, step }) {
  const c = HTAP_TOPICS.defclass.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Définition hémodynamique (ESC 2022)" color={c}>
        Nouveau seuil abaissé : hypertension pulmonaire (HTP) = mPAP &gt; 20 mmHg au repos (avant : ≥ 25). Confirmation par cathétérisme cardiaque droit (KTD) obligatoire.
      </Info>
      <Sec title="Profils hémodynamiques (KTD)" color={c}/>
      <Table cols="1.3fr 1.6fr" rows={[
        ["Profil","Critères"],
        ["Pré-capillaire","mPAP > 20 + PAWP ≤ 15 mmHg + RVP > 2 UW"],
        ["Post-capillaire isolée (IpcPH)","mPAP > 20 + PAWP > 15 + RVP ≤ 2 UW"],
        ["Combinée pré+post-capillaire (CpcPH)","mPAP > 20 + PAWP > 15 + RVP > 2 UW"],
        ["HTP d'effort","mPAP/débit cardiaque pente > 3 mmHg/L/min (repos normal)"],
      ]}/>
      <Info title="Paramètres clés" color={c}>
        mPAP = pression artérielle pulmonaire moyenne · PAWP = pression capillaire bloquée (« wedge », reflète le cœur gauche) · RVP = résistances vasculaires pulmonaires (Wood units). Le PAWP distingue une cause vasculaire pulmonaire (pré-cap) d'une cause cardiaque gauche (post-cap).
      </Info>
      <Sec title="Classification en 5 groupes" color={c}/>
      <Table cols="0.4fr 2fr" rows={[
        ["Grp","Type"],
        ["1","HTAP (artérielle pulmonaire) : idiopathique, héréditaire, toxiques, connectivites, cardiopathie congénitale, HTP porto-pulmonaire"],
        ["2","HTP des cardiopathies GAUCHES (la plus fréquente) : IC, valvulopathies"],
        ["3","HTP des maladies respiratoires / hypoxie : BPCO, fibrose, SAOS, altitude"],
        ["4","HTP post-embolique chronique (CTEPH) — potentiellement curable"],
        ["5","HTP multifactorielle / mécanismes incertains (hémopathies, sarcoïdose…)"],
      ]}/>
      <Info title="Ne pas confondre HTP et HTAP" color={c}>
        « HTAP » (groupe 1) est une entité précise (maladie vasculaire pulmonaire pré-capillaire). « HTP » est le terme générique englobant les 5 groupes. Les groupes 2 et 3 sont de loin les plus fréquents et relèvent d'abord du traitement de la cause.
      </Info>
    </div>);
    default: return null;
  }
}

function HTAPdiagContent({ go, step }) {
  const c = HTAP_TOPICS.diag.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Algorithme diagnostique en 3 étapes (ESC 2022)" color={c}>
        Démarche simplifiée : suspicion → détection → confirmation.
      </Info>
      <Res title="Étape 1 — Suspicion" classe="Clinique" color={c} icon="1️⃣" items={[
        "Symptômes d'effort peu spécifiques : dyspnée, fatigue, douleur thoracique, syncope, œdèmes",
        "Signes d'IC droite : turgescence jugulaire, hépatomégalie, reflux hépato-jugulaire, œdèmes",
        "Signes ECG (HVD, axe droit, BBD), contexte (connectivite, ATCD d'EP, cardiopathie gauche)",
      ]}/>
      <Res title="Étape 2 — Détection (échocardiographie)" classe="ETT" color={c} icon="2️⃣" items={[
        "Estimation de la probabilité d'HTP (vitesse d'IT, signes indirects VD/OD)",
        "Dilatation/dysfonction du VD, septum paradoxal, dilatation de l'OD, épanchement péricardique",
        "Recherche d'une cardiopathie gauche ou valvulaire (orientation groupe 2)",
      ]}/>
      <Res title="Étape 3 — Confirmation (centre expert)" classe="KTD" color="#EB5757" icon="3️⃣" items={[
        "Cathétérisme cardiaque droit : INDISPENSABLE au diagnostic et à la classification hémodynamique",
        "Bilan étiologique : scintigraphie pulmonaire V/Q (dépister la CTEPH — groupe 4), EFR, TDM, biologie",
        "La scintigraphie V/Q normale élimine une CTEPH (meilleure sensibilité que l'angio-TDM)",
      ]}/>
      <Info title="Quand adresser en centre expert ?" color={c}>
        Toute suspicion d'HTAP (groupe 1) ou de CTEPH (groupe 4) doit être adressée à un centre de compétence/référence de l'HTP, car le diagnostic (KTD, test de vasoréactivité) et les traitements spécifiques y sont réalisés. Les groupes 2 et 3 relèvent d'abord du traitement de la cardiopathie gauche ou de la maladie respiratoire.
      </Info>
    </div>);
    default: return null;
  }
}

function HTAPmanageContent({ go, step }) {
  const c = HTAP_TOPICS.manage.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Principes de prise en charge" color={c}>
        La PEC dépend du GROUPE. L'interne doit surtout savoir orienter : traiter la cause (groupes 2/3), adresser en centre expert (groupes 1/4).
      </Info>
      <Sec title="Selon le groupe" color={c}/>
      <Table cols="0.4fr 2fr" rows={[
        ["Grp","Prise en charge"],
        ["1 (HTAP)","Centre expert : test de vasoréactivité, traitements spécifiques (antagonistes de l'endothéline, inhibiteurs PDE5, analogues prostacycline, agonistes récepteur prostacycline). Nouveauté : sotatercept"],
        ["2","Traiter la cardiopathie gauche — PAS de vasodilatateurs spécifiques de l'HTAP (risque d'OAP)"],
        ["3","Traiter la maladie respiratoire + oxygénothérapie ; pas de traitement spécifique en routine"],
        ["4 (CTEPH)","Endartériectomie pulmonaire (curatif si accessible), angioplastie pulmonaire au ballon, ou traitement médical (riociguat)"],
        ["5","Traiter la cause sous-jacente"],
      ]}/>
      <Sec title="Stratification du risque (HTAP groupe 1)" color={c}/>
      <Res title="Modèle ESC à 3-4 strates" classe="Pronostic" color={c} icon="🎯" items={[
        "Combine : classe fonctionnelle OMS, test de marche de 6 min, BNP/NT-proBNP",
        "+ paramètres hémodynamiques (POD, index cardiaque, SvO2) et imagerie",
        "Détermine l'intensité du traitement et le rythme de suivi (objectif : atteindre le bas risque)",
      ]}/>
      <Sec title="Mesures générales" color={c}/>
      <Res title="Pour tous" classe="Général" color={c} icon="💊" items={[
        "Diurétiques si surcharge droite, oxygène si hypoxémie",
        "Réadaptation supervisée, vaccination",
        "Grossesse fortement déconseillée dans l'HTAP (mortalité élevée) — contraception efficace",
        "Anticoagulation au cas par cas (systématique dans la CTEPH)",
      ]}/>
    </div>);
    default: return null;
  }
}

function HtapContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "defclass") return <HTAPdefclassContent {...props}/>;
  if (topic === "diag")     return <HTAPdiagContent     {...props}/>;
  if (topic === "manage")   return <HTAPmanageContent   {...props}/>;
  return null;
}

// ═══ AORTE THORACIQUE (ESC 2024) ═════════════════════════════════
function AORTEaneurysmContent({ go, step }) {
  const c = AORTE_TOPICS.aneurysm.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Anévrysme de l'aorte ascendante" color={c}>
        Dilatation ≥ 40 mm (le risque de dissection augmente nettement ≥ 45 mm). L'ESC 2024 intègre désormais, au-delà du seul diamètre, la longueur aortique, l'indexation à la taille, le phénotype (racine vs tubulaire) et la vitesse de croissance.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Seuils chirurgicaux par étiologie" color={c} onClick={()=>go("thresholds")}/>
        <Btn title="Critères de haut risque (chirurgie plus précoce)" color={c} onClick={()=>go("highrisk")}/>
        <Btn title="Chirurgie valvulaire associée" color={c} onClick={()=>go("combined")}/>
      </div>
    </div>);
    case "thresholds": return (<div>
      <Sec title="Seuils de chirurgie prophylactique (aorte ascendante)" color={c}/>
      <Table cols="1.4fr 1fr" rows={[
        ["Contexte","Seuil diamètre"],
        ["Aorte tricuspide, sporadique","≥ 55 mm"],
        ["Bicuspidie aortique","≥ 55 mm (≥ 50 mm si facteurs de risque)"],
        ["Syndrome de Marfan","≥ 50 mm (≥ 45 mm si facteurs de risque)"],
        ["Loeys-Dietz / formes agressives","≥ 45 mm (centre expert, selon la mutation)"],
        ["Turner","Indexé : diamètre aortique / taille &gt; 2,5 cm/m (Z-score)"],
        ["Aorte descendante thoraco-abdo","≥ 60 mm (ou endovasculaire selon anatomie)"],
      ]}/>
      <Info title="Indexation & paramètres complémentaires (ESC 2024)" color={c}>
        Chez les sujets de petite ou grande taille, indexer (diamètre/taille, ou aire aortique/taille &gt; 10 cm²/m). Une longueur aortique &gt; 11 cm est un critère de haut risque. Décision toujours en concertation (Aortic Team), en pesant le risque aortique vs le risque opératoire.
      </Info>
    </div>);
    case "highrisk": return (<div>
      <Res title="Critères abaissant le seuil chirurgical" classe="Haut risque" color="#EB5757" icon="🚩" items={[
        "Croissance rapide : ≥ 3 mm/an (ou ≥ 5 mm/an documenté)",
        "Antécédents familiaux de dissection aortique (surtout à petit diamètre)",
        "HTA résistante non contrôlée",
        "Longueur aortique &gt; 11 cm, aire aortique/taille élevée",
        "Coarctation associée, désir de grossesse (Marfan, Turner)",
        "Phénotype racine (dilatation des sinus de Valsalva > aorte tubulaire)",
      ]}/>
      <Info title="Grossesse" color={c}>
        Le risque de dissection augmente pendant la grossesse (surtout 3ᵉ trimestre et post-partum). Discuter une chirurgie préconceptionnelle si aorte dilatée dans les aortopathies génétiques ; suivi rapproché sinon.
      </Info>
    </div>);
    case "combined": return (<div>
      <Res title="Chirurgie de l'aorte lors d'un remplacement/réparation valvulaire aortique" classe="ESC 2024" color={c} icon="🔗" items={[
        "Si chirurgie valvulaire aortique programmée + aorte dilatée : remplacer l'aorte ascendante si ≥ 45 mm (centre expert) ou ≥ 50 mm",
        "Remplacement valvulaire épargnant la valve (valve-sparing root replacement) recommandé en centre expert quand la valve est réparable",
        "Ne pas sous-estimer l'aortopathie de la bicuspidie même quand la valve est le problème principal",
      ]}/>
      <SeeAlso items={[
        { label:"Valvulopathies", icon:"🫀", color:"#E85D4A", target:{ kind:"chapter", chapterKey:"valvulo" } },
        { label:"Dissection aortique", icon:"💥", color:"#EB5757", target:{ kind:"topic", chapterKey:"urgences", topicKey:"chest" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function AORTEgeneticContent({ go, step }) {
  const c = AORTE_TOPICS.genetic.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Aortopathies héréditaires" color={c}>
        Suspicion devant : antécédents familiaux d'anévrysme/dissection, dissection ou anévrysme à un âge jeune, signes syndromiques. Un test génétique et un dépistage familial sont recommandés.
      </Info>
      <Sec title="Marfan" color={c}/>
      <Res title="Points clés" classe="FBN1" color={c} icon="🧬" items={[
        "Mutation du gène FBN1 (fibrilline-1), atteinte du tissu conjonctif",
        "Critères de Gand (score systémique, ectopie du cristallin, dilatation de la racine aortique — Z-score)",
        "Traitement : bêtabloquants OU ARA2 (losartan) à dose maximale tolérée, restriction des efforts intenses/isométriques",
        "Chirurgie racine ≥ 50 mm (≥ 45 mm si facteurs de risque)",
      ]}/>
      <Sec title="Loeys-Dietz" color={c}/>
      <Res title="Points clés" classe="TGFβ" color={c} icon="🧬" items={[
        "Mutations de la voie du TGF-β (TGFBR1/2, SMAD3, TGFB2/3)",
        "Aortopathie plus AGRESSIVE, tortuosité artérielle, anévrysmes à distance",
        "Seuils chirurgicaux plus bas (dès ~45 mm, parfois moins selon la mutation)",
      ]}/>
      <Sec title="Bicuspidie aortique" color={c}/>
      <Res title="Points clés" classe="BAV" color={c} icon="🫀" items={[
        "Valvulopathie congénitale la plus fréquente, associée à une aortopathie (dilatation de l'aorte ascendante)",
        "Surveillance ETT si &gt; 40 mm ; chirurgie ≥ 55 mm (≥ 50 mm si facteurs de risque)",
        "Nouveau : nomenclature/classification internationale consensuelle de la valvulo-aortopathie",
      ]}/>
      <Sec title="Turner & Ehlers-Danlos vasculaire" color={c}/>
      <Res title="Points clés" classe="Autres" color={c} icon="🧬" items={[
        "Turner : risque de dissection ; seuils INDEXÉS (diamètre/taille &gt; 2,5 cm/m), imagerie dédiée",
        "Ehlers-Danlos vasculaire (COL3A1) : fragilité artérielle, éviter les gestes invasifs ; traitement médical (céliprolol)",
      ]}/>
    </div>);
    default: return null;
  }
}

function AORTEsurveilContent({ go, step }) {
  const c = AORTE_TOPICS.surveil.color;
  switch(step) {
    case "start": return (<div>
      <Sec title="Imagerie (ESC 2024)" color={c}/>
      <Res title="Modalités" classe="Imagerie" color={c} icon="📅" items={[
        "ETT : dépistage et suivi de la racine/aorte ascendante (mesures reproductibles)",
        "Angio-TDM ou IRM de l'aorte thoracique en cas de discordance ou dès que le diamètre dépasse ~45 mm",
        "Bilan initial complet : angio-TDM synchronisée à l'ECG, du cou au pelvis, dans les formes génétiques",
        "Mesures à des repères standardisés, indexées si besoin",
      ]}/>
      <Sec title="Rythme de surveillance" color={c}/>
      <Table cols="1.4fr 1fr" rows={[
        ["Situation","Fréquence"],
        ["Bicuspidie, aorte &gt; 40 mm","ETT à 1 an puis tous les 2–3 ans (selon stabilité)"],
        ["Aortopathie génétique","Suivi annuel (ou rapproché si croissance/proche du seuil)"],
        ["Post-chirurgie ouverte","Imagerie à 1 an puis tous les 5 ans"],
        ["Post-endovasculaire","TDM à 1 mois, écho-doppler à 12 mois puis annuel"],
      ]}/>
      <Sec title="Traitement médical" color={c}/>
      <Res title="Principes" classe="Médical" color={c} icon="💊" items={[
        "Contrôle tensionnel STRICT (cible selon le contexte), l'HTA étant le principal facteur modifiable",
        "Bêtabloquants et/ou ARA2 (notamment Marfan) à dose maximale tolérée",
        "Arrêt du tabac, prise en charge des facteurs de risque cardiovasculaires",
        "Restriction des efforts isométriques intenses et des sports de contact",
      ]}/>
    </div>);
    default: return null;
  }
}

function AorteContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "aneurysm") return <AORTEaneurysmContent {...props}/>;
  if (topic === "genetic")  return <AORTEgeneticContent  {...props}/>;
  if (topic === "surveil")  return <AORTEsurveilContent  {...props}/>;
  return null;
}

// ═══ DYSKALIÉMIES & MÉTABOLISME ══════════════════════════════════
function METABhyperkContent({ go, step }) {
  const c = METAB_TOPICS.hyperk.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Hyperkaliémie" color={c}>
        K⁺ ≥ 5,5 mmol/L. Urgence vitale par risque d'arythmie/arrêt cardiaque. Les signes ECG et la CINÉTIQUE d'installation priment sur la valeur absolue. Toute anomalie ECG = urgence.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Signes ECG étagés par sévérité" color={c} onClick={()=>go("ecg")}/>
        <Btn title="Prise en charge urgente" color="#EB5757" onClick={()=>go("ttt")}/>
        <Btn title="Étiologies & fausse hyperK" color={c} onClick={()=>go("causes")}/>
      </div>
    </div>);
    case "ecg": return (<div>
      <Sec title="Évolution ECG (aggravation avec la kaliémie)" color={c}/>
      <ECGTrace pattern="hyperk_mild" caption="Hyperkaliémie légère (≈ 5,5–6,5)"/>
      <ECGTrace pattern="hyperk_mod" caption="Hyperkaliémie modérée-sévère (≈ 6,5–8)"/>
      <ECGTrace pattern="hyperk_sine" caption="Hyperkaliémie sévère (> 8) — pré-arrêt"/>
      <Table cols="1fr 1.8fr" rows={[
        ["Kaliémie","Signes ECG"],
        ["≈ 5,5–6,5","Ondes T amples, pointues, symétriques (« en tente »), à base étroite — précordiales"],
        ["≈ 6,5–7,5","Allongement du PR, aplatissement puis disparition de l'onde P"],
        ["≈ 7–8","Élargissement progressif du QRS, troubles de conduction"],
        ["> 8","Fusion QRS-T → onde sinusoïdale, bradycardie, TV/FV, asystolie"],
      ]}/>
      <Info title="Message clé" color="#EB5757">
        L'absence de signes ECG n'élimine PAS le risque : l'évolution peut être brutale. Un ECG normal avec K⁺ élevé impose quand même surveillance et traitement selon le contexte.
      </Info>
    </div>);
    case "ttt": return (<div>
      <Sec title="Prise en charge (3 axes)" color={c}/>
      <Res title="1 — Stabiliser la membrane myocardique (si signes ECG)" classe="Immédiat" color="#EB5757" icon="🛡️" items={[
        "Gluconate de calcium 10% : 10 mL IV lente (ou 30 mL) — répétable à 5–10 min si l'ECG reste anormal",
        "Action en quelques minutes, durée brève (~30–60 min) ; ne baisse PAS la kaliémie",
        "Chlorure de calcium (plus concentré) si voie centrale / instabilité hémodynamique",
        "La digoxine n'est plus une contre-indication formelle au calcium (données récentes)",
      ]}/>
      <Res title="2 — Transférer le K⁺ en intracellulaire" classe="Rapide" color={c} icon="🔄" items={[
        "Insuline rapide 10 UI IV + glucose 25 g (surveiller la glycémie — risque d'hypoglycémie 2h)",
        "Salbutamol nébulisé 10–20 mg (effet additif à l'insuline)",
        "Bicarbonate de sodium : seulement si acidose métabolique associée (pH < 7,2)",
      ]}/>
      <Res title="3 — Éliminer le K⁺ de l'organisme" classe="Durable" color={c} icon="🚽" items={[
        "Diurétiques de l'anse (si fonction rénale conservée)",
        "Chélateurs oraux du potassium (patiromer, sodium zirconium)",
        "Hémodialyse : traitement le plus efficace — à envisager tôt si IRC/IRA sévère ou hyperK réfractaire",
        "Arrêter les apports et les médicaments hyperkaliémiants",
      ]}/>
    </div>);
    case "causes": return (<div>
      <Sec title="Étiologies fréquentes" color={c}/>
      <Table cols="1fr 1.8fr" rows={[
        ["Mécanisme","Exemples"],
        ["Défaut d'excrétion","Insuffisance rénale (aiguë/chronique), hypoaldostéronisme"],
        ["Médicaments","IEC/ARA2, diurétiques épargneurs de K⁺, AINS, héparine, triméthoprime, bactrim"],
        ["Transfert extracellulaire","Acidose, lyse cellulaire (rhabdomyolyse, syndrome de lyse tumorale, hémolyse), déficit en insuline"],
        ["Apports excessifs","Supplémentation, substituts de sel (surtout si insuffisance rénale)"],
      ]}/>
      <Info title="Fausse hyperkaliémie (pseudo-hyperK)" color={c}>
        Hémolyse du prélèvement (garrot prolongé, tube secoué), thrombocytose ou hyperleucocytose majeures. En cas de valeur élevée sans contexte ni signe ECG, recontrôler (sur tube hépariné, sans garrot) avant tout geste.
      </Info>
    </div>);
    default: return null;
  }
}

function METABhypokContent({ go, step }) {
  const c = METAB_TOPICS.hypok.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Hypokaliémie" color={c}>
        K⁺ &lt; 3,5 mmol/L. Sévère si &lt; 2,5 mmol/L ou signes ECG/neuromusculaires. Favorise les troubles du rythme, surtout sur cœur pathologique, sous digitaliques ou si QT long associé.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Signes ECG" color={c} onClick={()=>go("ecg")}/>
        <Btn title="Prise en charge / recharge" color={c} onClick={()=>go("ttt")}/>
        <Btn title="Étiologies" color={c} onClick={()=>go("causes")}/>
      </div>
    </div>);
    case "ecg": return (<div>
      <Sec title="Signes ECG" color={c}/>
      <ECGTrace pattern="hypok" caption="Hypokaliémie — ST, T aplatie, onde U"/>
      <Res title="Anomalies caractéristiques" classe="ECG" color={c} icon="📉" items={[
        "Sous-décalage du segment ST",
        "Aplatissement puis inversion de l'onde T",
        "Apparition d'une onde U (après la T), pouvant fusionner avec elle (aspect de QT long apparent)",
        "Allongement du QU / QT → risque de torsades de pointes",
        "Extrasystoles, tachyarythmies (surtout si digitaliques ou cardiopathie)",
      ]}/>
    </div>);
    case "ttt": return (<div>
      <Sec title="Recharge potassique" color={c}/>
      <Res title="Modalités" classe="PEC" color={c} icon="💊" items={[
        "Forme sévère (arythmie, paralysie, K⁺ &lt; 2,5) : KCl IV 5–10 mmol sur 15–30 min sous scope, répétable",
        "KCl IV dans du sérum SALÉ (pas glucosé : le glucose stimule l'insuline → aggrave l'hypoK)",
        "Débit habituel ≤ 10 mmol/h en périphérie (plus rapide seulement en USIC, voie centrale, sous scope)",
        "Formes modérées : supplémentation orale privilégiée",
        "CORRIGER LA MAGNÉSÉMIE en parallèle : une hypomagnésémie entretient l'hypokaliémie et favorise les torsades",
        "Surveillance de la kaliémie toutes les 2–4 h",
      ]}/>
    </div>);
    case "causes": return (<div>
      <Sec title="Étiologies fréquentes" color={c}/>
      <Table cols="1fr 1.8fr" rows={[
        ["Mécanisme","Exemples"],
        ["Pertes digestives","Diarrhée, vomissements, aspiration gastrique, laxatifs"],
        ["Pertes rénales","Diurétiques (anse, thiazidiques), hyperaldostéronisme, hypomagnésémie"],
        ["Transfert intracellulaire","Alcalose, insuline, bêta-2-mimétiques, réalimentation"],
        ["Apports insuffisants","Dénutrition (rare isolément)"],
      ]}/>
    </div>);
    default: return null;
  }
}

function METABcalcContent({ go, step }) {
  const c = METAB_TOPICS.calc.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Dyscalcémies — retentissement ECG" color={c}>
        Le calcium module surtout la durée du segment ST, donc du QT. Repère simple : hyperCa → QT court ; hypoCa → QT long.
      </Info>
      <Sec title="Hypercalcémie" color={c}/>
      <Res title="Signes ECG" classe="Hypercalcémie" color={c} icon="🔺" items={[
        "Raccourcissement du segment ST → QT court",
        "Formes sévères : bradycardie, troubles de conduction, ondes T larges, risque d'arythmie",
        "Contexte : hyperparathyroïdie, néoplasie, sarcoïdose, immobilisation",
      ]}/>
      <Sec title="Hypocalcémie" color={c}/>
      <Res title="Signes ECG" classe="Hypocalcémie" color={c} icon="🔻" items={[
        "Allongement du segment ST → QT long (l'onde T reste de morphologie normale)",
        "Risque de torsades de pointes si QT très allongé",
        "Contexte : hypoparathyroïdie, IRC, carence en vitamine D, hypomagnésémie, post-chirurgie thyroïdienne",
      ]}/>
      <Info title="À retenir" color={c}>
        Devant un QT anormal, penser aux électrolytes : calcium (ST), potassium et magnésium. Corriger conjointement K⁺, Mg²⁺ et Ca²⁺ en cas de QT long, surtout avant d'incriminer un médicament.
      </Info>
    </div>);
    default: return null;
  }
}

function MetabContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "hyperk") return <METABhyperkContent {...props}/>;
  if (topic === "hypok")  return <METABhypokContent  {...props}/>;
  if (topic === "calc")   return <METABcalcContent   {...props}/>;
  return null;
}

function SpecContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "syncope") return <SPECsyncopeContent {...props}/>;
  if (topic === "preop")   return <SPECpreopContent   {...props}/>;
  if (topic === "onco")    return <SPEConcoContent    {...props}/>;
  return null;
}

function UrgencesContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "doses")  return <URGdosesContent  {...props}/>;
  if (topic === "acr")    return <URGacrContent    {...props}/>;
  if (topic === "chest")  return <URGchestContent  {...props}/>;
  if (topic === "oap")    return <URGoapContent    {...props}/>;
  if (topic === "ep")     return <URGepContent     {...props}/>;
  if (topic === "tampon") return <URGtamponContent {...props}/>;
  return null;
}

function AlgoContent({ valve, go, step }) {
  const props = { go, step };
  if (valve === "rac") return <RACContent {...props}/>;
  if (valve === "iao") return <IAoContent {...props}/>;
  if (valve === "im")  return <IMContent  {...props}/>;
  if (valve === "rm")  return <RMContent  {...props}/>;
  if (valve === "it")  return <ITContent  {...props}/>;
  if (valve === "avk") return <AVKContent {...props}/>;
  if (valve === "poso") return <PosoContent {...props}/>;
  if (valve === "scores") return <ScoresContent {...props}/>;
  if (valve === "calc") return <CalcContent {...props}/>;
  if (valve === "crett") return <CRETTContent {...props}/>;
  if (valve === "antibio") return <AntibioContent {...props}/>;
  if (valve === "relais") return <RelaisContent {...props}/>;
  if (valve === "classif") return <ClassifContent {...props}/>;
  if (valve === "equiv") return <EquivContent {...props}/>;
  if (valve === "ecg") return <ECGContent {...props}/>;
  if (valve === "ecgpath") return <ECGPathContent {...props}/>;
  if (valve === "ett") return <ETTContent {...props}/>;
  if (valve === "eto") return <ETOContent {...props}/>;
  if (valve === "irm") return <IRMContent {...props}/>;
  if (valve === "scanner") return <ScannerContent {...props}/>;
  if (valve === "cathd") return <CathDContent {...props}/>;
  return null;
}

function HTAContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "diag")      return <HTADiagContent      {...props}/>;
  if (topic === "bilan")     return <HTABilanContent     {...props}/>;
  if (topic === "treatment") return <HTATreatmentContent {...props}/>;
  if (topic === "resistant") return <HTAResistantContent {...props}/>;
  if (topic === "urgency")   return <HTAUrgencyContent   {...props}/>;
  return null;
}

function CMPAmyloseContent({ go, step }) {
  const c = CMP_TOPICS.amylose.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Amylose cardiaque" color={c}>
        Dépôt extracellulaire de protéines mal repliées dans le myocarde. Deux types dominent : AL (chaînes légères, hématologique, urgente) et ATTR (transthyrétine — forme sauvage ATTRwt du sujet âgé, ou héréditaire ATTRv). Cause sous-diagnostiquée d'IC à FE préservée et de « CMH » du sujet âgé.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Quand y penser (red flags)" color={c} onClick={()=>go("flags")}/>
        <Btn title="Parcours diagnostique" color={c} onClick={()=>go("diag")}/>
        <Btn title="Traitement & pronostic" color={c} onClick={()=>go("ttt")}/>
      </div>
    </div>);
    case "flags": return (<div>
      <Info title="Seuil de dépistage" color={c}>
        HVG ≥ 12 mm + ≥ 1 red flag → dépister l'amylose. Ne pas se laisser piéger par une hypertrophie attribuée à l'HTA ou à l'âge.
      </Info>
      <Sec title="Red flags cardiaques" color={c}/>
      <Res title="Imagerie / ECG" classe="Alerte" color={c} icon="🫀" items={[
        "Discordance ECG/écho : HVG à l'écho mais bas voltage QRS à l'ECG",
        "Myocarde granité, épaississement septum interauriculaire + valves + parois du VD",
        "Strain longitudinal avec préservation apicale (« apical sparing »)",
        "Rehaussement tardif diffus sous-endocardique, ECV très augmenté en IRM",
        "Épanchement péricardique, physiologie restrictive",
        "Pseudo-ondes Q sans coronaropathie, BAV, FA",
      ]}/>
      <Sec title="Red flags extra-cardiaques" color={c}/>
      <Res title="Interrogatoire" classe="Alerte" color={c} icon="🔎" items={[
        "Canal carpien bilatéral (peut précéder de années), canal lombaire étroit, rupture tendon du biceps",
        "Neuropathie périphérique, dysautonomie (hypotension orthostatique)",
        "Intolérance aux traitements de l'IC (hypotension sous BB/IEC)",
        "RAC low-flow low-gradient du sujet âgé",
        "Contexte familial (ATTRv)",
      ]}/>
    </div>);
    case "diag": return (<div>
      <Sec title="Parcours diagnostique (position ESC)" color={c}/>
      <Res title="Étape 1 — Suspicion + imagerie" classe="Démarche" color={c} icon="🔬" items={[
        "Écho + IRM cardiaque évocatrices (HVG concentrique non dilatée, ECV élevé, rehaussement tardif diffus)",
        "Élévation des biomarqueurs (troponine, NT-proBNP souvent très élevé)",
      ]}/>
      <Res title="Étape 2 — Éliminer une amylose AL (URGENT)" classe="Indispensable" color="#EB5757" icon="🩸" items={[
        "Dosage des chaînes légères libres sériques (rapport kappa/lambda) + immunofixation sérique ET urinaire",
        "Toute anomalie → avis hématologique urgent + biopsie (l'AL est de pronostic sombre, traitement spécifique urgent)",
      ]}/>
      <Res title="Étape 3 — Scintigraphie osseuse (99mTc-DPD/HMDP/PYP)" classe="Clé du diagnostic ATTR" color={c} icon="☢️" items={[
        "Fixation myocardique gradée sur l'échelle de Perugini (0 à 3)",
        "Perugini grade 2 ou 3 + ABSENCE de composant monoclonal → diagnostic d'ATTR SANS biopsie (VPP 100%)",
        "Grade 1 ou composant monoclonal présent → biopsie endomyocardique + typage",
      ]}/>
      <Res title="Étape 4 — Typage & génétique" classe="Caractérisation" color={c} icon="🧬" items={[
        "Confirmer ATTR sauvage (ATTRwt) vs héréditaire (ATTRv) par test génétique du gène TTR",
        "Conseil génétique et dépistage familial si ATTRv",
      ]}/>
      <Info title="Piège" color={c}>
        Une scintigraphie positive n'est spécifique de l'ATTR QUE si l'amylose AL est formellement écartée (~40% des AL fixent aussi le traceur). Toujours coupler scintigraphie ET recherche de chaînes légères.
      </Info>
    </div>);
    case "ttt": return (<div>
      <Sec title="Traitement" color={c}/>
      <Res title="Spécifique de l'ATTR" classe="Étiologique" color={c} icon="💊" items={[
        "Stabilisateurs de la transthyrétine : tafamidis (améliore survie et hospitalisations dans l'ATTR-CM)",
        "Autres approches (silencers ARN, etc.) selon le type et l'accès",
        "Prise en charge en centre expert de l'amylose",
      ]}/>
      <Res title="Spécifique de l'AL" classe="Hématologique" color="#EB5757" icon="🩸" items={[
        "Urgence : chimiothérapie ciblant le clone plasmocytaire (prise en charge hématologique)",
        "Pronostic conditionné par l'atteinte cardiaque (stades biomarqueurs)",
      ]}/>
      <Sec title="Prise en charge cardiologique symptomatique" color={c}/>
      <Res title="Particularités" classe="Prudence" color={c} icon="⚠️" items={[
        "Diurétiques = pierre angulaire du contrôle de la congestion",
        "MAUVAISE tolérance des traitements classiques de l'IC (bêtabloquants, IEC/ARA2) → hypotension",
        "Anticoagulation si FA (risque thrombo-embolique élevé, même en rythme sinusal parfois)",
        "Prudence avec les digitaliques (fixation aux dépôts amyloïdes → toxicité)",
      ]}/>
      <Info title="Pronostic" color={c}>
        L'ATTRwt a un pronostic meilleur que l'AL. Le diagnostic précoce est crucial : il conditionne l'accès aux traitements modificateurs de la maladie et le pronostic.
      </Info>
    </div>);
    default: return null;
  }
}

function CMPContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "classif") return <CMPClassifContent {...props}/>;
  if (topic === "hcm")     return <CMPHCMContent     {...props}/>;
  if (topic === "dcm")     return <CMPDCMContent     {...props}/>;
  if (topic === "rcm")     return <CMPRCMContent     {...props}/>;
  if (topic === "amylose") return <CMPAmyloseContent {...props}/>;
  if (topic === "arvc")    return <CMPARVCContent    {...props}/>;
  return null;
}

function EndoContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "diag")      return <EndoDiagContent      {...props}/>;
  if (topic === "treatment") return <EndoTreatmentContent {...props}/>;
  if (topic === "surgery")   return <EndoSurgeryContent   {...props}/>;
  if (topic === "prophyl")   return <EndoProphylContent   {...props}/>;
  return null;
}

// ── Choc cardiogénique, assistances & greffe ─────────────────────
function ICChocContent({ go, step }) {
  const c = "#EB5757";
  switch(step) {
    case "start": return (<div>
      <Info title="Choc cardiogénique" color={c}>
        Défaillance circulatoire primitivement cardiaque : hypoperfusion tissulaire malgré une volémie adéquate. PAS &lt; 90 mmHg (ou besoin d'amines), index cardiaque bas, signes d'hypoperfusion (marbrures, oligurie, confusion, lactate ↑). Causes : IDM (le plus fréquent), IC décompensée avancée, myocardite, EP grave, valvulopathie aiguë, arythmie.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Profils cliniques (chaud/froid, sec/humide)" color={c} onClick={()=>go("profils")}/>
        <Btn title="Classification SCAI (A → E)" color={c} onClick={()=>go("scai")}/>
        <Btn title="Prise en charge initiale" color={c} onClick={()=>go("pec")}/>
        <Btn title="Assistances circulatoires (dont ECMO)" color={c} onClick={()=>go("assist")}/>
        <Btn title="🇫🇷 Assistances disponibles en France" color={c} onClick={()=>go("france")}/>
        <Btn title="Indications de transplantation cardiaque" color={c} onClick={()=>go("greffe")}/>
      </div>
    </div>);
    case "profils": return (<div>
      <Sec title="Profils hémodynamiques (Stevenson / Forrester)" color={c}/>
      <Info title="2 questions au lit du patient" color={c}>
        « Congestion ? » (humide vs sec) et « Perfusion ? » (froid vs chaud). Le choc cardiogénique typique = froid + humide.
      </Info>
      <Table cols="1fr 1fr 1.4fr" rows={[
        ["Profil","Description","Conduite"],
        ["Chaud & sec","Bien perfusé, sans congestion — compensé","Traitement de fond, optimiser"],
        ["Chaud & humide","Congestif mais perfusé (le + fréquent en OAP)","Diurétiques ± vasodilatateurs"],
        ["Froid & humide","Hypoperfusé + congestif = choc cardiogénique","Inotropes ± vasopresseurs, assistance si réfractaire"],
        ["Froid & sec","Hypoperfusé, hypovolémique/bas débit sans congestion","Remplissage prudent, inotropes"],
      ]}/>
    </div>);
    case "scai": return (<div>
      <Sec title="Classification SCAI du choc (2019, MàJ 2022)" color={c}/>
      <Table cols="0.5fr 1fr 1.5fr" rows={[
        ["Stade","Nom","Description"],
        ["A","At risk","À risque, pas de signe de choc (ex. IDM étendu)"],
        ["B","Beginning","Pré-choc : hypotension/tachycardie SANS hypoperfusion"],
        ["C","Classic","Choc « classique » : hypoperfusion nécessitant inotropes/amines/assistance"],
        ["D","Deteriorating","Aggravation malgré une 1ère intervention → escalade"],
        ["E","Extremis","Collapsus réfractaire, ACR, support multiple / CPR"],
      ]}/>
      <Info title="Intérêt" color={c}>
        Permet une stratification pronostique et une communication commune (« shock team »). Le stade guide l'escalade thérapeutique. Rechercher aussi l'ACR à la présentation (facteur pronostique majeur).
      </Info>
    </div>);
    case "pec": return (<div>
      <Res title="Prise en charge initiale" classe="Urgence" color={c} icon="💊" items={[
        "Traiter la CAUSE : coronarographie + revascularisation en urgence si IDM (pierre angulaire du choc sur SCA)",
        "Monitorage rapproché (scope, PA invasive, diurèse, lactates), échocardiographie précoce",
        "Optimiser la volémie (remplissage prudent guidé, éviter la surcharge)",
        "Inotropes : dobutamine en 1ère intention ; vasopresseur : noradrénaline (préférée à la dopamine)",
        "Ventilation/oxygénation, correction des troubles métaboliques et du rythme",
        "Concept de « shock team » : décision précoce d'escalade vers l'assistance si réfractaire",
      ]}/>
      <Info title="Ballon de contre-pulsion (IABP)" color={c}>
        L'IABP intra-aortique n'est PLUS recommandé en routine dans le choc sur IDM (essai IABP-SHOCK II négatif). Peut garder une place dans certaines complications mécaniques (CIV, IM aiguë) en pont vers la chirurgie.
      </Info>
    </div>);
    case "assist": return (<div>
      <Info title="Assistance circulatoire mécanique (MCS)" color={c}>
        À envisager sans retard dans le choc réfractaire aux amines. Objectif : restaurer la perfusion d'organe et « décharger » le ventricule. Toujours définir une stratégie de sortie (récupération, pont vers assistance durable ou greffe).
      </Info>
      <Sec title="Dispositifs temporaires (percutanés / courte durée)" color={c}/>
      <Table cols="1fr 1.7fr" rows={[
        ["Dispositif","Principe / particularités"],
        ["VA-ECMO","Assistance circulatoire ET oxygénation (cœur + poumon). Choc réfractaire, ACR réfractaire (ECPR). ↑ post-charge VG → parfois besoin de « décharge » (Impella/IABP = ECpella)"],
        ["Impella (2.5 / CP / 5.5)","Pompe axiale trans-aortique, décharge le VG et augmente le débit. DanGer Shock : bénéfice sur la survie dans le choc du STEMI sélectionné"],
        ["TandemHeart","Pompe de dérivation OG → artère fémorale (canulation trans-septale)"],
        ["Impella RP / ProtekDuo","Assistance du ventricule DROIT"],
        ["IABP","Ballon de contre-pulsion — peu d'effet sur le débit, non recommandé en routine"],
      ]}/>
      <Sec title="Assistances de longue durée (durables)" color={c}/>
      <Res title="LVAD / assistance mono- ou biventriculaire" classe="Durable" color={c} icon="🔋" items={[
        "Pompe à flux continu implantée (ex. HeartMate 3) pour l'IC terminale",
        "Stratégies : pont vers la transplantation (BTT), pont vers la candidature (BTC), pont vers la récupération (BTR), ou thérapie de destination (DT) si greffe non envisageable",
        "Complications à connaître : thromboses de pompe, AVC, hémorragies, infections de câble",
      ]}/>
      <Info title="Stratégie « bridge »" color={c}>
        BTT = bridge to transplant · BTR = bridge to recovery · BTD/BTC = bridge to decision/candidacy · DT = destination therapy. Le choix dépend de la réversibilité, des comorbidités et de l'éligibilité à la greffe.
      </Info>
    </div>);
    case "france": return (<div>
      <Info title="🇫🇷 Assistances disponibles en France" color={c}>
        Aperçu des dispositifs utilisés en pratique française (la disponibilité dépend des centres experts / chirurgie cardiaque). Toujours passer par un centre de référence.
      </Info>
      <Sec title="Courte durée (choc aigu)" color={c}/>
      <Res title="Dispositifs temporaires" classe="Courte durée" color={c} icon="⚙️" items={[
        "ECMO veino-artérielle (VA-ECMO) : la plus répandue, mobilisable par les unités mobiles d'assistance circulatoire (UMAC) — pose sur place puis transfert",
        "Impella (CP / 5.5) : décharge du VG, disponible dans les centres interventionnels",
        "ECMO veino-veineuse (VV) : pour la défaillance respiratoire pure (pas un support circulatoire)",
        "IABP : encore présent mais indications restreintes",
      ]}/>
      <Sec title="Longue durée (durables)" color={c}/>
      <Res title="Assistances implantables" classe="Durable" color={c} icon="🔋" items={[
        "LVAD à flux continu type HeartMate 3 : assistance monoventriculaire gauche de longue durée",
        "Assistances biventriculaires / cœur artificiel total (ex. Aeson/CARMAT dans certains centres) selon indications",
        "Posées dans les centres de transplantation / chirurgie cardiaque avancée",
      ]}/>
      <Info title="Organisation" color={c}>
        Le maillage repose sur les centres de chirurgie cardiaque et les UMAC (équipes mobiles qui posent l'ECMO au chevet puis rapatrient le patient). L'orientation précoce vers un centre expert conditionne le pronostic.
      </Info>
    </div>);
    case "greffe": return (<div>
      <Info title="Transplantation cardiaque" color={c}>
        Traitement de référence de l'insuffisance cardiaque terminale réfractaire, chez des patients sélectionnés sans contre-indication.
      </Info>
      <Res title="Indications (IC avancée réfractaire)" classe="Indications" color={c} icon="✅" items={[
        "IC terminale, symptômes sévères (NYHA III-IV) malgré traitement médical/dispositifs optimaux",
        "VO₂max effondrée à l'épreuve cardio-respiratoire (classiquement pic ≤ 12–14 mL/kg/min — cf. VO₂max)",
        "Chocs cardiogéniques à répétition / dépendance aux inotropes, arythmies ventriculaires réfractaires",
        "Assistance de longue durée en pont (BTT) vers la greffe",
      ]}/>
      <Res title="Contre-indications (à évaluer, souvent relatives)" classe="Prudence" color={c} icon="⛔" items={[
        "HTAP précapillaire fixée sévère (risque de défaillance du VD du greffon) — à évaluer par KTD",
        "Comorbidités limitant l'espérance de vie : néoplasie active, infection non contrôlée, atteinte multiviscérale sévère",
        "Insuffisance rénale/hépatique irréversible sévère (discuter greffe combinée)",
        "Non-observance, addictions actives, contexte psychosocial non compatible",
        "Âge physiologique avancé (au cas par cas)",
      ]}/>
      <Info title="Parcours" color={c}>
        Évaluation multidisciplinaire en centre de transplantation, inscription sur liste (score d'attribution national), avec le recours fréquent à une assistance en pont. Alternatives si greffe impossible : assistance de destination (DT), soins palliatifs.
      </Info>
    </div>);
    default: return null;
  }
}

function ICContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "diag")   return <ICDiagContent   {...props}/>;
  if (topic === "hfref")  return <ICHFrEFContent  {...props}/>;
  if (topic === "hfmref") return <ICHFmrEFContent {...props}/>;
  if (topic === "hfpef")  return <ICHFpEFContent  {...props}/>;
  if (topic === "aigue")  return <ICAigueContent  {...props}/>;
  if (topic === "choc")   return <ICChocContent   {...props}/>;
  if (topic === "device") return <ICDeviceContent {...props}/>;
  return null;
}

function IschemicContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "sca")        return <SCAContent        {...props}/>;
  if (topic === "nste")       return <NSTEContent        {...props}/>;
  if (topic === "ccs")        return <CCSContent         {...props}/>;
  if (topic === "tests")      return <TestsContent       {...props}/>;
  if (topic === "antithromb") return <AntithrombContent  {...props}/>;
  if (topic === "revasc")     return <RevascContent      {...props}/>;
  if (topic === "cardioprot") return <CardioprotContent  {...props}/>;
  if (topic === "readapt")    return <ReadaptContent     {...props}/>;
  return null;
}

function RythmoContent({ topic, go, step }) {
  const props = { go, step };
  // FA sub-topics (selected via the FA mini-hub)
  if (topic === "fa_diag") return <FADiagContent {...props}/>;
  if (topic === "fa_aoc")  return <FAAOCContent  {...props}/>;
  if (topic === "fa_rate") return <FARateContent {...props}/>;
  if (topic === "fa_abl")  return <FAAblContent  {...props}/>;
  if (topic === "fa_sca")  return <FASCAContent  {...props}/>;
  // Top-level rythmo topics
  if (topic === "vt")      return <VTContent     {...props}/>;
  if (topic === "tsv")     return <TSVContent    {...props}/>;
  if (topic === "brady")   return <BradyContent  {...props}/>;
  return null;
}

// ── Épreuve d'effort & VO2max (cardiologie du sport) ─────────────
function SportEffortContent({ go, step }) {
  const c = SPORT_TOPICS.effort.color;
  switch(step) {
    case "start": return (<div>
      <Info title="Explorations d'effort chez le sportif" color={c}>
        Deux examens complémentaires : l'épreuve d'effort « classique » (ECG d'effort, dépistage d'ischémie et de troubles du rythme), et l'épreuve d'effort cardio-respiratoire (EFX / VO₂max) qui mesure la performance et différencie les causes d'une limitation à l'effort.
      </Info>
      <Sec title="Choisir une rubrique" color={c}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <Btn title="Épreuve d'effort (ECG d'effort)" subtitle="Indications, réalisation, critères d'arrêt" color={c} onClick={()=>go("ee")}/>
        <Btn title="EFX / VO₂max" subtitle="Épreuve cardio-respiratoire, paramètres clés" color={c} onClick={()=>go("vo2")}/>
        <Btn title="Interprétation & repères VO₂max" color={c} onClick={()=>go("interpret")}/>
      </div>
    </div>);
    case "ee": return (<div>
      <Sec title="Épreuve d'effort (ECG d'effort)" color={c}/>
      <Res title="Indications chez le sportif" classe="Indications" color={c} icon="📈" items={[
        "Évaluation de symptômes d'effort (douleur thoracique, dyspnée, palpitations, malaise)",
        "Dépistage d'une coronaropathie chez le sportif > 35 ans avec facteurs de risque (sport intense, reprise)",
        "Recherche d'un trouble du rythme d'effort (extrasystoles, TV catécholergique)",
        "Évaluation d'une réponse tensionnelle à l'effort, d'une chronotropie",
        "Aptitude / suivi d'une cardiopathie connue",
      ]}/>
      <Res title="Réalisation" classe="Méthode" color={c} icon="⚙️" items={[
        "Sur tapis roulant (protocole de Bruce) ou cycloergomètre, par paliers croissants",
        "Surveillance continue : ECG 12 dérivations, FC, PA à chaque palier, symptômes",
        "Objectif : atteindre la FC maximale théorique (≈ 220 − âge) ou un effort maximal (épuisement)",
        "Test maximal préféré au test sous-maximal pour le dépistage rythmique/ischémique",
      ]}/>
      <Res title="Critères d'arrêt / réponse anormale" classe="Vigilance" color="#EB5757" icon="🛑" items={[
        "Sous-décalage ST horizontal/descendant ≥ 1 mm (ischémie), sus-décalage ST",
        "Troubles du rythme ventriculaires (TV, ESV polymorphes croissantes)",
        "Chute tensionnelle à l'effort, ou absence d'élévation (mauvais pronostic)",
        "Douleur thoracique, épuisement, signes de mauvaise tolérance",
        "Poussée hypertensive marquée",
      ]}/>
      <Info title="Limite" color={c}>
        L'ECG d'effort a une sensibilité/spécificité modestes pour l'ischémie ; il est surtout utile chez le sportif pour le dépistage rythmique, la tolérance et la réponse tensionnelle. Ininterprétable pour l'ischémie si ECG de base anormal (BBG, pacé, WPW).
      </Info>
    </div>);
    case "vo2": return (<div>
      <Info title="Épreuve d'effort cardio-respiratoire (EFX / CPET)" color={c}>
        Couple l'épreuve d'effort à l'analyse des gaz expirés (O₂ consommé, CO₂ produit). Mesure objective de la capacité aérobie et différencie l'origine d'une limitation à l'effort (cardiaque, respiratoire, musculaire, déconditionnement).
      </Info>
      <Sec title="Paramètres clés" color={c}/>
      <Table cols="1fr 1.7fr" rows={[
        ["Paramètre","Signification"],
        ["VO₂max / VO₂ pic","Consommation maximale d'oxygène (mL/kg/min) — reflet de la capacité aérobie et de la performance"],
        ["Seuil ventilatoire (SV1/SV2)","Repères d'intensité pour l'entraînement (endurance vs résistance)"],
        ["VE/VCO₂ slope","Efficacité ventilatoire — élevée = mauvais pronostic (insuffisance cardiaque)"],
        ["Pouls d'O₂ (VO₂/FC)","Estime le volume d'éjection systolique — plateau = limitation cardiaque"],
        ["Quotient respiratoire (RER)","VCO₂/VO₂ ; RER > 1,10 confirme un effort maximal"],
        ["Réserve ventilatoire","Distingue une limitation respiratoire d'une limitation cardiaque"],
      ]}/>
      <Sec title="Indications" color={c}/>
      <Res title="Chez le sportif et en cardiologie" classe="Indications" color={c} icon="🎯" items={[
        "Évaluation de la performance et individualisation de l'entraînement (seuils, zones de FC)",
        "Explorer une dyspnée d'effort inexpliquée (démêler cardiaque / pulmonaire / déconditionnement)",
        "Insuffisance cardiaque : évaluation pronostique et sélection pour la transplantation (VO₂max abaissée)",
        "Suivi objectif de l'aptitude et de la réadaptation",
      ]}/>
    </div>);
    case "interpret": return (<div>
      <Sec title="Repères de VO₂max" color={c}/>
      <Res title="Ordres de grandeur" classe="Valeurs" color={c} icon="🎯" items={[
        "Sédentaire moyen : ~30–40 mL/kg/min",
        "Sujet actif / bien entraîné : ~45–60 mL/kg/min",
        "Athlète d'endurance de haut niveau : > 65–70 mL/kg/min (valeurs les plus élevées en ski de fond, cyclisme)",
        "Diminue avec l'âge et le déconditionnement ; s'améliore avec l'entraînement en endurance",
      ]}/>
      <Sec title="Origine d'une limitation à l'effort" color={c}/>
      <Table cols="1fr 1.6fr" rows={[
        ["Profil","Orientation"],
        ["Pouls d'O₂ en plateau, VE/VCO₂ ↑","Limitation cardiaque"],
        ["Réserve ventilatoire épuisée, désaturation","Limitation respiratoire"],
        ["RER bas, arrêt précoce sans plateau","Déconditionnement / effort sous-maximal"],
        ["VO₂max effondrée + VE/VCO₂ très ↑","Insuffisance cardiaque avancée (valeur pronostique)"],
      ]}/>
      <Info title="Intérêt pronostique (insuffisance cardiaque)" color={c}>
        Une VO₂max basse (classiquement un pic ≤ 12–14 mL/kg/min) et une pente VE/VCO₂ élevée sont associées à un mauvais pronostic et participent à l'évaluation en vue d'une transplantation cardiaque.
      </Info>
      <SeeAlso items={[
        { label:"ECG de l'athlète", icon:"📈", color:"#00966A", target:{ kind:"topic", chapterKey:"sport", topicKey:"ecg" } },
        { label:"Dépistage pré-participation", icon:"🩺", color:"#00966A", target:{ kind:"topic", chapterKey:"sport", topicKey:"screening" } },
        { label:"Insuffisance cardiaque", icon:"💧", color:"#1684A8", target:{ kind:"chapter", chapterKey:"ic" } },
      ]}/>
    </div>);
    default: return null;
  }
}

function SportContent({ topic, go, step }) {
  const props = { go, step };
  if (topic === "screening")    return <ScreeningContent   {...props}/>;
  if (topic === "ecg")          return <SportECGContent    {...props}/>;
  if (topic === "effort")       return <SportEffortContent {...props}/>;
  if (topic === "cmp")          return <SportCMPContent    {...props}/>;
  if (topic === "rythmo_sport") return <SportRythmoContent {...props}/>;
  return null;
}


// ─── Style d'un item de la barre latérale desktop ────────────────
function sidebarItemStyle(active) {
  return {
    padding:"7px 9px", borderRadius:6, fontSize:12.5,
    fontWeight: active ? 580 : 470,
    color: active ? ACCENT : MUT,
    background: active ? "var(--cg-accent-soft)" : "transparent",
    display:"flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom:1,
    minHeight:32, lineHeight:1.3,
    // Indispensable dans le rail replié : sans cela les libellés
    // reviendraient à la ligne au lieu d'être simplement masqués.
    whiteSpace:"nowrap", overflow:"hidden",
    transition:"background 0.12s, color 0.12s",
  };
}

// ─── Responsive hook : détecte les grands écrans (ordinateur) ─────
function useIsDesktop(breakpoint = 900) {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= breakpoint);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isDesktop;
}

// ─── Main app ────────────────────────────────────────────────────
export default function App() {
  const isDesktop = useIsDesktop();
  const [chapter, setChapter] = useState(null);     // null | "valvulo" | "ic" | "ischemic" | "rythmo" | "sport" | "hta" | "cmp" | "endo" | ...
  const [selected, setSelected] = useState(null);   // valve key within valvulo chapter
  const [icSelected, setIcSelected] = useState(null); // topic key within ic chapter
  const [ischemicSelected, setIschemicSelected] = useState(null); // topic key within ischemic chapter
  const [rythmoSelected, setRythmoSelected] = useState(null); // topic key within rythmo chapter ("fa" | "vt" | "tsv" | "brady")
  const [faSelected, setFaSelected] = useState(null); // topic key within FA mini-hub
  const [sportSelected, setSportSelected] = useState(null); // topic key within sport chapter
  const [htaSelected, setHtaSelected] = useState(null); // topic key within hta chapter
  const [cmpSelected, setCmpSelected] = useState(null); // topic key within cmp chapter
  const [endoSelected, setEndoSelected] = useState(null); // topic key within endo chapter
  const [urgSelected, setUrgSelected] = useState(null); // topic key within urgences chapter
  const [specSelected, setSpecSelected] = useState(null); // topic key within situations particulières chapter
  const [pmSelected, setPmSelected] = useState(null); // topic key within péricardite/myocardite chapter
  const [metabSelected, setMetabSelected] = useState(null); // topic key within dyskaliémies chapter
  const [aorteSelected, setAorteSelected] = useState(null); // topic key within aorte thoracique chapter
  const [htapSelected, setHtapSelected] = useState(null); // topic key within HTAP chapter
  const [fdrSelected, setFdrSelected] = useState(null); // topic key within facteurs de risque chapter
  const [stimSelected, setStimSelected] = useState(null); // topic key within stimulation & DAI chapter
  const [congSelected, setCongSelected] = useState(null); // topic key within congenital chapter
  const [grossSelected, setGrossSelected] = useState(null); // topic key within pregnancy chapter
  const [mtevSelected, setMtevSelected] = useState(null); // topic key within VTE chapter
  const [canalSelected, setCanalSelected] = useState(null); // topic key within channelopathies sub-hub
  const [usicSelected, setUsicSelected] = useState(null); // topic key within ICU chapter
  const [refSection, setRefSection] = useState(null); // grouped home reference section (ecgSec/imgSec/tttSec/toolsSec)
  const [step, setStep] = useState("start");
  const [hist, setHist] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  // Référence du champ de recherche mobile : l'onglet « Recherche »
  // ramène à l'accueil puis y place le curseur, ce qui ouvre le clavier.
  const searchInputRef = useRef(null);
  const focusSearch = () => {
    setSearchOpen(true);
    window.requestAnimationFrame(() => {
      const el = searchInputRef.current;
      if (el) { el.focus(); el.scrollIntoView({ block:"center", behavior:"smooth" }); }
    });
  };
  const [searchQ, setSearchQ] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [recents, setRecents] = useState([]);
  const [theme, setTheme] = useState("light");
  const [showNews, setShowNews] = useState(false);

  // Thème : préférence enregistrée, sinon réglage du système
  useEffect(() => {
    let t = null;
    try { t = localStorage.getItem("cardio_theme"); } catch (e) {}
    if (!t) {
      try { t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { t = "light"; }
    }
    setTheme(t);
  }, []);
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      const m = document.querySelector('meta[name="theme-color"]');
      // Doit rester accordé à --cg-bg2 : c'est la teinte de la barre
      // d'état iOS quand l'application tourne en plein écran.
      if (m) m.setAttribute("content", theme === "dark" ? "#100D09" : "#EDE1CB");
    } catch (e) {}
  }, [theme]);
  // Nouveautés : n'apparaît qu'après une mise à jour, jamais à la première visite
  useEffect(() => {
    try {
      const seen = localStorage.getItem("cardio_seen_version");
      if (!seen) { localStorage.setItem("cardio_seen_version", APP_VERSION); return; }
      if (seen !== APP_VERSION) setShowNews(true);
    } catch (e) {}
  }, []);
  const closeNews = () => {
    setShowNews(false);
    try { localStorage.setItem("cardio_seen_version", APP_VERSION); } catch (e) {}
  };

  const toggleTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    try { localStorage.setItem("cardio_theme", t); } catch (e) {}
  };

  // Charger favoris & historique depuis localStorage au démarrage
  useEffect(() => {
    try {
      const f = localStorage.getItem("cardio_favorites");
      if (f) setFavorites(JSON.parse(f));
      const r = localStorage.getItem("cardio_recents");
      if (r) setRecents(JSON.parse(r));
    } catch (e) {}
  }, []);
  const persistFav = (list) => { setFavorites(list); try { localStorage.setItem("cardio_favorites", JSON.stringify(list)); } catch(e){} };
  const persistRec = (list) => { setRecents(list); try { localStorage.setItem("cardio_recents", JSON.stringify(list)); } catch(e){} };
  const favKey = (r) => `${r.kind}:${r.chapterKey||""}:${r.topicKey||""}`;
  const isFav = (r) => r && favorites.some(f => favKey(f) === favKey(r));
  const toggleFav = (r) => {
    if (!r) return;
    if (isFav(r)) persistFav(favorites.filter(f => favKey(f) !== favKey(r)));
    else persistFav([{ kind:r.kind, chapterKey:r.chapterKey, topicKey:r.topicKey, label:r.label, sub:r.sub, icon:r.icon, color:r.color }, ...favorites].slice(0, 12));
  };
  const pushRecent = (r) => {
    if (!r) return;
    const entry = { kind:r.kind, chapterKey:r.chapterKey, topicKey:r.topicKey, label:r.label, sub:r.sub, icon:r.icon, color:r.color };
    persistRec([entry, ...recents.filter(x => favKey(x) !== favKey(entry))].slice(0, 8));
  };

  const go      = n => { setHist(h=>[...h,step]); setStep(n); };
  const back    = () => { if(!hist.length) return; setStep(hist[hist.length-1]); setHist(h=>h.slice(0,-1)); };
  const reset   = () => { setStep("start"); setHist([]); };
  const choose  = key => { setSelected(key); setStep("start"); setHist([]); };
  const chooseIc = key => { setIcSelected(key); setStep("start"); setHist([]); };
  const chooseIschemic = key => { setIschemicSelected(key); setStep("start"); setHist([]); };
  const chooseRythmo = key => { setRythmoSelected(key); setFaSelected(null); setStimSelected(null); setCanalSelected(null); setStep("start"); setHist([]); };
  const chooseFa = key => { setFaSelected(key); setStep("start"); setHist([]); };
  const chooseSport = key => { setSportSelected(key); setStep("start"); setHist([]); };
  const chooseHta = key => { setHtaSelected(key); setStep("start"); setHist([]); };
  const chooseCmp = key => { setCmpSelected(key); setStep("start"); setHist([]); };
  const chooseEndo = key => { setEndoSelected(key); setStep("start"); setHist([]); };
  const chooseUrg = key => { setUrgSelected(key); setStep("start"); setHist([]); };
  const chooseSpec = key => { setSpecSelected(key); setStep("start"); setHist([]); };
  const choosePm = key => { setPmSelected(key); setStep("start"); setHist([]); };
  const chooseMetab = key => { setMetabSelected(key); setStep("start"); setHist([]); };
  const chooseAorte = key => { setAorteSelected(key); setStep("start"); setHist([]); };
  const chooseHtap = key => { setHtapSelected(key); setStep("start"); setHist([]); };
  const chooseFdr = key => { setFdrSelected(key); setStep("start"); setHist([]); };
  const chooseStim = key => { setStimSelected(key); setStep("start"); setHist([]); };
  const chooseCong = key => { setCongSelected(key); setStep("start"); setHist([]); };
  const chooseGross = key => { setGrossSelected(key); setStep("start"); setHist([]); };
  const chooseMtev = key => { setMtevSelected(key); setStep("start"); setHist([]); };
  const chooseCanal = key => { setCanalSelected(key); setStep("start"); setHist([]); };
  const chooseUsic = key => { setUsicSelected(key); setStep("start"); setHist([]); };
  const openChapter = (key, valveKey) => { setChapter(key); setSelected(valveKey || null); setIcSelected(null); setIschemicSelected(null); setRythmoSelected(null); setFaSelected(null); setSportSelected(null); setHtaSelected(null); setCmpSelected(null); setEndoSelected(null); setUrgSelected(null); setSpecSelected(null); setPmSelected(null); setMetabSelected(null); setAorteSelected(null); setHtapSelected(null); setFdrSelected(null); setStimSelected(null); setCongSelected(null); setGrossSelected(null); setMtevSelected(null); setCanalSelected(null); setUsicSelected(null); setStep("start"); setHist([]); };
  const openValveDirect = key => { setChapter(null); setSelected(key); setIcSelected(null); setIschemicSelected(null); setRythmoSelected(null); setFaSelected(null); setSportSelected(null); setHtaSelected(null); setCmpSelected(null); setEndoSelected(null); setUrgSelected(null); setSpecSelected(null); setPmSelected(null); setMetabSelected(null); setAorteSelected(null); setHtapSelected(null); setFdrSelected(null); setStimSelected(null); setCongSelected(null); setGrossSelected(null); setMtevSelected(null); setCanalSelected(null); setUsicSelected(null); setStep("start"); setHist([]); }; // ECG/ETT/ETO accessed from home page — chapter stays null so back returns home
  const openUrgences = () => openChapter("urgences");
  const homeAll = () => { setChapter(null); setSelected(null); setIcSelected(null); setIschemicSelected(null); setRythmoSelected(null); setFaSelected(null); setSportSelected(null); setHtaSelected(null); setCmpSelected(null); setEndoSelected(null); setUrgSelected(null); setSpecSelected(null); setPmSelected(null); setMetabSelected(null); setAorteSelected(null); setHtapSelected(null); setFdrSelected(null); setStimSelected(null); setCongSelected(null); setGrossSelected(null); setMtevSelected(null); setCanalSelected(null); setUsicSelected(null); setRefSection(null); setStep("start"); setHist([]); };
  const homeChapter = () => { setSelected(null); setIcSelected(null); setIschemicSelected(null); setRythmoSelected(null); setFaSelected(null); setSportSelected(null); setHtaSelected(null); setCmpSelected(null); setEndoSelected(null); setUrgSelected(null); setSpecSelected(null); setPmSelected(null); setMetabSelected(null); setAorteSelected(null); setHtapSelected(null); setFdrSelected(null); setStimSelected(null); setCongSelected(null); setGrossSelected(null); setMtevSelected(null); setCanalSelected(null); setUsicSelected(null); setStep("start"); setHist([]); };

  // ── Recherche : navigation vers un résultat ──
  // Ouvre le chapitre parent puis sélectionne le sous-topic voulu.
  const chooseByChapter = {
    ic: setIcSelected, ischemic: setIschemicSelected, rythmo: setRythmoSelected,
    sport: setSportSelected, hta: setHtaSelected, cmp: setCmpSelected, endo: setEndoSelected,
    urgences: setUrgSelected, spec: setSpecSelected, pericmyo: setPmSelected,
    metab: setMetabSelected, aorte: setAorteSelected, htap: setHtapSelected,
    fdr: setFdrSelected, cong: setCongSelected, gross: setGrossSelected, mtev: setMtevSelected, usic: setUsicSelected,
  };
  const goToSearchResult = (r) => {
    setSearchOpen(false); setSearchQ("");
    if (r.kind === "drug") { goToSearchResult(r.to); return; }
    if (r.kind === "chapter") { openChapter(r.chapterKey); return; }
    if (r.kind === "refcard") { openValveDirect(r.topicKey); return; }
    if (r.kind === "valve") { openChapter("valvulo", r.topicKey); return; }
    if (r.kind === "fa") { openChapter("rythmo"); setRythmoSelected("fa"); setFaSelected(r.topicKey); setStep("start"); setHist([]); return; }
    if (r.kind === "stim") { openChapter("rythmo"); setRythmoSelected("stim"); setStimSelected(r.topicKey); setStep("start"); setHist([]); return; }
    if (r.kind === "canal") { openChapter("rythmo"); setRythmoSelected("canal"); setCanalSelected(r.topicKey); setStep("start"); setHist([]); return; }
    if (r.kind === "topic") {
      openChapter(r.chapterKey);
      const setter = chooseByChapter[r.chapterKey];
      if (setter) { setter(r.topicKey); setStep("start"); setHist([]); }
      return;
    }
  };
  // Exposer la navigation aux composants de contenu (liens croisés « voir aussi »)
  NAV.go = goToSearchResult;
  const homeRythmoSub = () => { setRythmoSelected(null); setFaSelected(null); setStep("start"); setHist([]); }; // back from FA mini-hub to rythmo hub

  const v  = selected ? VALVES[selected] : null;
  const ic = icSelected ? IC_TOPICS[icSelected] : null;
  const isc = ischemicSelected ? ISCHEMIC_TOPICS[ischemicSelected] : null;
  const fa = faSelected ? FA_TOPICS[faSelected] : null;
  const rh = (rythmoSelected && rythmoSelected !== "fa" && rythmoSelected !== "stim" && rythmoSelected !== "canal") ? RYTHMO_TOPICS[rythmoSelected] : null;
  const sp = sportSelected ? SPORT_TOPICS[sportSelected] : null;
  const ht = htaSelected ? HTA_TOPICS[htaSelected] : null;
  const cm = cmpSelected ? CMP_TOPICS[cmpSelected] : null;
  const en = endoSelected ? ENDO_TOPICS[endoSelected] : null;
  const ur = urgSelected ? URG_TOPICS[urgSelected] : null;
  const spx = specSelected ? SPEC_TOPICS[specSelected] : null;
  const pm = pmSelected ? PERIMYO_TOPICS[pmSelected] : null;
  const mtb = metabSelected ? METAB_TOPICS[metabSelected] : null;
  const aor = aorteSelected ? AORTE_TOPICS[aorteSelected] : null;
  const htp = htapSelected ? HTAP_TOPICS[htapSelected] : null;
  const fdr = fdrSelected ? FDR_TOPICS[fdrSelected] : null;
  const stm = stimSelected ? STIM_TOPICS[stimSelected] : null;
  const cng = congSelected ? CONG_TOPICS[congSelected] : null;
  const grs = grossSelected ? GROSS_TOPICS[grossSelected] : null;
  const mte = mtevSelected ? MTEV_TOPICS[mtevSelected] : null;
  const cnl = canalSelected ? CANAL_TOPICS[canalSelected] : null;
  const usc = usicSelected ? USIC_TOPICS[usicSelected] : null;
  const ch = chapter ? CHAPTERS[chapter] : null;
  const sub = v || ic || isc || rh || fa || sp || ht || cm || en || ur || spx || pm || mtb || aor || htp || fdr || stm || cng || grs || mte || cnl || usc; // currently open sub-topic, regardless of chapter

  // Référence de la fiche actuellement ouverte (pour favoris & historique)
  const currentRef = (() => {
    if (!sub) return null;
    if (v)   return selected && ["rac","iao","im","rm","it"].includes(selected)
               ? { kind:"valve", topicKey:selected, label:v.label, sub:v.full, icon:v.icon, color:v.color }
               : { kind:"refcard", topicKey:selected, label:v.label, sub:v.full, icon:v.icon, color:v.color };
    if (fa)  return { kind:"fa", topicKey:faSelected, label:fa.label, sub:fa.full, icon:fa.icon, color:fa.color };
    if (stm) return { kind:"stim", topicKey:stimSelected, label:stm.label, sub:stm.full, icon:stm.icon, color:stm.color };
    if (cnl) return { kind:"canal", topicKey:canalSelected, label:cnl.label, sub:cnl.full, icon:cnl.icon, color:cnl.color };
    const map = [
      [ic, "ic", icSelected], [isc, "ischemic", ischemicSelected], [rh, "rythmo", rythmoSelected],
      [sp, "sport", sportSelected], [ht, "hta", htaSelected], [cm, "cmp", cmpSelected],
      [en, "endo", endoSelected], [ur, "urgences", urgSelected], [spx, "spec", specSelected],
      [pm, "pericmyo", pmSelected], [mtb, "metab", metabSelected], [aor, "aorte", aorteSelected],
      [htp, "htap", htapSelected], [fdr, "fdr", fdrSelected], [cng, "cong", congSelected], [grs, "gross", grossSelected], [mte, "mtev", mtevSelected], [usc, "usic", usicSelected],
    ];
    for (const [obj, chap, key] of map) {
      if (obj) return { kind:"topic", chapterKey:chap, topicKey:key, label:obj.label, sub:obj.full, icon:obj.icon, color:obj.color };
    }
    return null;
  })();

  // Enregistrer dans l'historique quand on ouvre une fiche (au niveau "start")
  useEffect(() => {
    if (currentRef && step === "start") pushRecent(currentRef);
    // eslint-disable-next-line
  }, [currentRef ? favKey(currentRef) : null]);

  // Header visuals: sub-topic color > chapter color > default
  const headerColor = sub ? sub.color : (ch ? ch.color : null);
  const headerTitle = sub ? sub.full : (ch ? ch.full : "CardioGuide");
  const headerSub = sub ? "Algorithme de prise en charge"
    : ch ? ch.subtitle
    : "Guide décisionnel par chapitre";

  // Largeur du contenu : large sur l'accueil desktop (grille de cartes),
  // confortable pour la lecture du contenu, étroite sur mobile.
  const isHomeLevel = !chapter && !sub; // accueil ou sous-menu de section
  const searchResults = searchQ.trim().length >= 2 ? searchIndex(searchQ) : [];
  const contentMaxWidth = isDesktop ? (isHomeLevel ? 1100 : 1100) : 540;
  const headerMaxWidth = isDesktop ? (isHomeLevel ? 1100 : 1100) : 540;

  return (
    <div style={{ minHeight:"100vh", background:BG, fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color:TXT, display: isDesktop ? "flex" : "block" }}>

      <style>{THEME_CSS}</style>

      {/* ── Rail de navigation (ordinateur) ──
          Le premier bloc n'est qu'une réserve d'espace : le rail lui-même
          est en position fixe, de sorte que son déploiement au survol ne
          décale pas le contenu. */}
      {isDesktop && <div style={{ width:56, flexShrink:0 }} aria-hidden="true"/>}
      {isDesktop && (
        <div className="cg-rail" style={{
          position:"fixed", left:0, top:0, bottom:0, zIndex:50,
          background:SURF, borderRight:`1px solid ${BDR}`,
          overflowY:"auto", padding:"16px 10px", boxSizing:"border-box",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 9px 14px" }}>
            <span onClick={homeAll} title="Accueil" style={{ display:"flex", cursor:"pointer", flexShrink:0 }}>
              <Icon name="pulse" size={20} stroke={1.8} style={{ color:"var(--cg-accent)" }}/>
            </span>
            <div className="cg-fade" onClick={homeAll} style={{ fontFamily:SERIF, fontWeight:600, fontSize:16,
              color:INK, letterSpacing:"-0.008em", cursor:"pointer", whiteSpace:"nowrap" }}>CardioGuide</div>
            <button className="cg-fade" onClick={(e)=>{ e.stopPropagation(); toggleTheme(); }} title={theme==="dark"?"Passer en thème clair":"Passer en thème sombre"} aria-label="Changer de thème" style={{
              marginLeft:"auto", width:30, height:30, flexShrink:0, background:"transparent", border:`1px solid ${BDR}`,
              borderRadius:6, cursor:"pointer", color:MUT,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {theme==="dark"
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>}
            </button>
          </div>

          {/* Recherche — masquée tant que le rail est replié */}
          <div className="cg-fade" style={{ position:"relative", margin:"0 4px 12px", width:196 }}>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
                color:DIM, display:"flex", pointerEvents:"none" }}>
                <Icon name="search" size={13} stroke={1.9}/>
              </span>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Rechercher…"
                onFocus={e => { e.target.style.borderColor = "var(--cg-accent)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--cg-bdr)"; }}
                style={{
                  width:"100%", boxSizing:"border-box", padding:"9px 28px 9px 30px",
                  background:PANEL, border:`1px solid ${BDR}`, borderRadius:6,
                  fontSize:13.5, color:TXT, outline:"none", fontFamily:"inherit",
                  transition:"border-color 0.12s",
                }}
              />
              {searchQ && (
                <span onClick={() => setSearchQ("")} role="button" aria-label="Effacer la recherche"
                  style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)",
                    cursor:"pointer", color:DIM, display:"flex" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </span>
              )}
            </div>
            {searchQ.trim().length >= 2 && (
              <div style={{ marginTop:6, background:CARD, border:`1px solid ${BDR}`, borderRadius:8, overflow:"hidden", maxHeight:360, overflowY:"auto" }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding:"12px", fontSize:12, color:MUT, textAlign:"center" }}>Aucun résultat</div>
                ) : searchResults.map((r, i) => (
                  <div key={i} onClick={() => goToSearchResult(r)} style={{
                    padding:"9px 11px", cursor:"pointer", borderBottom: i<searchResults.length-1?`1px solid ${BDR}`:"none",
                    display:"flex", alignItems:"center", gap:9,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = (r.color||"#999")+"12"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <Icon name={r.icon} size={16} style={{ color:"var(--cg-dim)" }}/>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12.5, fontWeight:560, color:INK, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.label}</div>
                      <div style={{ fontSize:10, color:MUT, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.parent ? r.parent+" · " : ""}{r.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cg-fade" style={{ fontSize:9.5, textTransform:"uppercase", letterSpacing:"0.08em", color:DIM, fontWeight:660, margin:"10px 9px 5px", whiteSpace:"nowrap" }}>Accès rapide</div>
          <div onClick={openUrgences} style={{ ...sidebarItemStyle(chapter==="urgences"),
            color: chapter==="urgences" ? "var(--cg-danger)" : "var(--cg-danger)", fontWeight:560 }}>
            <Icon name="alert" size={16}/><span className="cg-fade">Urgences de garde</span>
          </div>
          {Object.entries(REF_SECTIONS).map(([skey, sec]) => (
            <div key={skey} onClick={() => sec.items.length === 1 ? openValveDirect(sec.items[0]) : setRefSection(skey)}
              style={sidebarItemStyle(refSection===skey)}>
              <Icon name={sec.icon} size={16} style={{ color:"var(--cg-dim)" }}/><span className="cg-fade">{sec.label}</span>
            </div>
          ))}

          <div className="cg-fade" style={{ fontSize:9.5, textTransform:"uppercase", letterSpacing:"0.08em", color:DIM, fontWeight:660, margin:"14px 9px 5px", whiteSpace:"nowrap" }}>Chapitres</div>
          {Object.entries(CHAPTERS).filter(([key]) => key !== "urgences").map(([key, chap]) => (
            <div key={key} onClick={() => openChapter(key)} style={sidebarItemStyle(chapter===key)}>
              <Icon name={chap.icon} size={16} style={{ color:"var(--cg-dim)" }}/><span className="cg-fade">{chap.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Main area (header + content) ── */}
      <div style={{ flex:1, minWidth:0 }}>

      {/* ── Header ── */}
      {isDesktop && (sub || ch || refSection) ? (
        /* Desktop content pages: top bar with breadcrumb (true desktop pattern) */
        <div style={{
          background: SURF, borderBottom:`1px solid ${BDR}`, boxSizing:"border-box",
          padding:"0 48px", height:60, display:"flex", alignItems:"center", flexShrink:0,
        }}>
          <div style={{ maxWidth:1400, width:"100%", margin:"0 auto", display:"flex", alignItems:"center" }}>
          <button
            onClick={sub ? (hist.length > 0 ? back : homeChapter) : (refSection ? () => setRefSection(null) : homeAll)}
            style={{
              width:32, height:32, flexShrink:0, marginRight:14,
              background:PANEL, border:`1px solid ${BDR}`, color:MUT,
              borderRadius:8, cursor:"pointer", fontSize:15, fontWeight:560,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
            aria-label="Retour"
          ><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, minWidth:0, overflow:"hidden" }}>
            <span onClick={homeAll} style={{ color:MUT, fontWeight:600, cursor:"pointer" }}>Accueil</span>
            {(ch || refSection) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>}
            {ch && <span onClick={homeChapter} style={{ color: sub ? MUT : INK, fontWeight: sub?600:800, cursor:sub?"pointer":"default" }}>{ch.label}</span>}
            {refSection && !sub && <span style={{ color:INK, fontWeight:640 }}>Référence</span>}
            {sub && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>}
            {sub && <span style={{ color:INK, fontWeight:640, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{sub.label}</span>}
          </div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={toggleTheme} title={theme==="dark"?"Passer en thème clair":"Passer en thème sombre"} aria-label="Changer de thème" style={{
              width:34, height:34, flexShrink:0, background:PANEL, border:`1px solid ${BDR}`,
              borderRadius:8, cursor:"pointer", fontSize:15,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>{theme==="dark" ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>}</button>
          {currentRef && (
            <button onClick={() => toggleFav(currentRef)} title={isFav(currentRef)?"Retirer des favoris":"Ajouter aux favoris"} style={{
              width:34, height:34, flexShrink:0,
              background: isFav(currentRef) ? "var(--cg-accent-soft)" : PANEL, border:`1px solid ${isFav(currentRef)?"var(--cg-accent-line)":BDR}`, color: isFav(currentRef) ? "var(--cg-accent)" : "var(--cg-dim)",
              borderRadius:8, cursor:"pointer", fontSize:16,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>{isFav(currentRef) ? <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.6 5.6 6.4.8-4.7 4.3 1.2 6.3L12 17l-5.5 3 1.2-6.3L3 9.4l6.4-.8z"/></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.6 5.6 6.4.8-4.7 4.3 1.2 6.3L12 17l-5.5 3 1.2-6.3L3 9.4l6.4-.8z"/></svg>}</button>
          )}
          </div>
          </div>
        </div>
      ) : (
      /* Home (desktop + mobile) and all mobile pages: light airy header */
      <div style={{
        background: SURF,
        borderBottom:`1px solid ${BDR}`,
        // Sur ordinateur, la géométrie doit être celle du contenu
        // (48 px de marge, largeur maximale 1400) : sinon l'en-tête est
        // centré sur 1100 px et son titre paraît décalé vers la droite.
        padding: isDesktop
          ? (sub || ch || refSection ? "14px 48px 12px" : "20px 48px 10px")
          : (sub || ch || refSection ? "14px 18px 12px" : "20px 18px 10px"),
        transition:"background 0.3s",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:11,
          maxWidth: isDesktop ? 1400 : headerMaxWidth, margin:"0 auto" }}>
          {(sub || ch || refSection) ? (
            <button
              onClick={sub ? (hist.length > 0 ? back : homeChapter) : (refSection ? () => setRefSection(null) : homeAll)}
              style={{
                width:34, height:34, flexShrink:0,
                background:PANEL, border:`1px solid ${BDR}`, color:MUT,
                borderRadius:8, cursor:"pointer", fontSize:16, fontWeight:560,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}
              aria-label="Retour"
            ><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>
          ) : isDesktop ? null : (
            /* Marque affichée seulement sur téléphone : sur ordinateur le
               rail la porte déjà, et l'icône décalerait le titre par
               rapport au contenu situé juste en dessous. */
            <Icon name="pulse" size={20} stroke={1.8} style={{ color:"var(--cg-accent)" }}/>
          )}
          <div style={{ minWidth:0, flex:1 }}>
            {(sub || ch) && headerColor && (
              <div style={{ fontSize:10.5, color:MUT, fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {sub ? (ch ? ch.label : "Référence") : headerSub}
              </div>
            )}
            <div style={{
              fontFamily:SERIF, fontWeight:600,
              fontSize: sub || ch || refSection ? 19 : 24,
              letterSpacing:"-0.008em", lineHeight:1.22,
              color:INK,
              // Deux lignes autorisées plutôt qu'une troncature : les
              // intitulés cliniques complets sont longs et l'ellipse
              // en masquait l'essentiel sur téléphone.
              display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
              overflow:"hidden", wordBreak:"break-word",
            }}>{headerTitle}</div>
            {!(sub || ch || refSection) && (
              <div style={{ fontSize:12.5, color:MUT, marginTop:1 }}>{headerSub}</div>
            )}
          </div>
          {!isDesktop && (
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <button onClick={toggleTheme} title={theme==="dark"?"Passer en thème clair":"Passer en thème sombre"} aria-label="Changer de thème" style={{
              width:34, height:34, flexShrink:0, background:PANEL, border:`1px solid ${BDR}`,
              borderRadius:8, cursor:"pointer", fontSize:15,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>{theme==="dark" ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>}</button>
          {currentRef && (
            <button onClick={() => toggleFav(currentRef)} style={{
              flexShrink:0, width:34, height:34,
              background: isFav(currentRef) ? "var(--cg-accent-soft)" : PANEL, border:`1px solid ${isFav(currentRef)?"var(--cg-accent-line)":BDR}`, color: isFav(currentRef) ? "var(--cg-accent)" : "var(--cg-dim)",
              borderRadius:8, cursor:"pointer", fontSize:16,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>{isFav(currentRef) ? <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.6 5.6 6.4.8-4.7 4.3 1.2 6.3L12 17l-5.5 3 1.2-6.3L3 9.4l6.4-.8z"/></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.6 5.6 6.4.8-4.7 4.3 1.2 6.3L12 17l-5.5 3 1.2-6.3L3 9.4l6.4-.8z"/></svg>}</button>
          )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── Breadcrumb (within sub-topic algorithm) ── */}
      {/* ── Content ── */}
      <div style={{
        maxWidth: isDesktop ? 1400 : contentMaxWidth,
        width: "100%",
        boxSizing: "border-box",
        margin: "0 auto",
        // Sur mobile, la marge basse dégage la barre d'onglets fixe
        // (50 px) plus la zone sûre de l'iPhone (barre d'accueil).
        padding: isDesktop
          ? "28px 48px 56px"
          : "16px 16px calc(40px + 50px + env(safe-area-inset-bottom))",
        transition:"max-width 0.3s",
      }}>

        {/* ═══ LEVEL 0 — Cardiologie home (chapter selection) ═══ */}
        {!chapter && !sub && !refSection && (
          <div>
            {isDesktop ? (
              /* ── Desktop: welcome screen (navigation is in the sidebar) ── */
              <div>
                <div style={{ marginBottom:26 }}>
                  <div style={{ fontFamily:SERIF, fontSize:28, fontWeight:600, color:INK, marginBottom:5, letterSpacing:"-0.01em" }}>Bienvenue</div>
                  <div style={{ color:MUT, fontSize:14.5, lineHeight:1.5 }}>Guide décisionnel de cardiologie — sélectionnez un chapitre dans le menu de gauche, ou commencez par un accès rapide ci-dessous.</div>
                </div>
                {favorites.length > 0 && (
                  <div style={{ marginBottom:24 }}>
                    <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>Favoris</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      {favorites.map((r,i) => (
                        <div key={i} onClick={() => goToSearchResult(r)} style={{
                          background:PANEL, border:`1px solid var(--cg-bdr)`, borderRadius:8, padding:"12px 14px", cursor:"pointer",
                          display:"flex", alignItems:"center", gap:12, position:"relative", overflow:"hidden",
                        }}>
                          <Icon name={r.icon} size={16} style={{ color:"var(--cg-dim)" }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ color:INK, fontWeight:560, fontSize:14 }}>{r.label}</div>
                            <div style={{ color:MUT, fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.sub}</div>
                          </div>
                          <span onClick={(e)=>{e.stopPropagation(); toggleFav(r);}} style={{ color:"var(--cg-accent)", flexShrink:0, display:"flex" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.6 5.6 6.4.8-4.7 4.3 1.2 6.3L12 17l-5.5 3 1.2-6.3L3 9.4l6.4-.8z"/></svg></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {recents.length > 0 && (
                  <div style={{ marginBottom:24 }}>
                    <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>Récemment consultés</div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      {recents.map((r,i) => (
                        <div key={i} onClick={() => goToSearchResult(r)} style={{
                          background:PANEL, border:`1px solid var(--cg-bdr)`, borderRadius:8, padding:"9px 13px", cursor:"pointer",
                          display:"flex", alignItems:"center", gap:8,
                        }}>
                          <Icon name={r.icon} size={16} style={{ color:"var(--cg-dim)" }}/>
                          <div style={{ color:INK, fontWeight:560, fontSize:12.5 }}>{r.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div onClick={() => openChapter("urgences")} style={{
                  background: "var(--cg-danger-soft)",
                  borderRadius:8, padding:"17px 20px",
                  cursor:"pointer", marginBottom:26, display:"flex", alignItems:"center", gap:15, transition:"all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                >
                  <Icon name="alert" size={22} style={{ color:"var(--cg-danger)" }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ color:"var(--cg-danger)", fontFamily:SERIF, fontWeight:600, fontSize:17, letterSpacing:"-0.005em" }}>Urgences de garde</div>
                    <div style={{ color:MUT, fontSize:12.5, marginTop:1 }}>ACR, douleur thoracique, OAP, embolie pulmonaire, tamponnade</div>
                  </div>
                  <span style={{ color:"var(--cg-danger)", fontSize:18 }}>›</span>
                </div>
                <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.09em", color:DIM, fontWeight:640, marginBottom:11 }}>Accès rapide</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:28 }}>
                  {Object.entries(REF_SECTIONS).map(([skey, sec]) => (
                    <div key={skey} onClick={() => sec.items.length === 1 ? openValveDirect(sec.items[0]) : setRefSection(skey)} style={{
                      background:PANEL, border:`1px solid var(--cg-bdr)`,
                      borderRadius:8, padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:13, transition:"all 0.2s",
                      position:"relative", overflow:"hidden",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                    >
                                            <div style={{ width:40, height:40, display:"flex", alignItems:"center", justifyContent:"center", color:MUT, flexShrink:0 }}><Icon name={sec.icon} size={18}/></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{sec.label}</div>
                        <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{sec.full}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.09em", color:DIM, fontWeight:640, marginBottom:11 }}>Tous les chapitres</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                  {Object.entries(CHAPTERS).filter(([key]) => key !== "urgences").map(([key, chap]) => (
                    <div key={key} onClick={() => openChapter(key)} style={{
                      background:PANEL, border:`1px solid var(--cg-bdr)`,
                      borderRadius:8, padding:"16px 15px 14px", cursor:"pointer", transition:"all 0.2s",
                      position:"relative", overflow:"hidden",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                    >
                      <div style={{ width:26, height:26, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0, marginBottom:9 }}><Icon name={chap.icon} size={20}/></div>
                      <div style={{ color:INK, fontWeight:560, fontSize:13.5, letterSpacing:"-0.01em" }}>{chap.label}</div>
                      <div style={{ color:MUT, fontSize:10.5, marginTop:3, lineHeight:1.45 }}>{chap.subtitle}</div>
                    </div>
                  ))}
                </div>
                {/* Nouveautés */}
                <div style={{ marginTop:28 }}>
                  <div onClick={() => setShowNews(true)} style={{
                    background:PANEL, border:`1px solid ${BDR}`, borderRadius:8,
                    padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
                    marginBottom:0,
                  }}>
                    <span style={{ fontSize:18 }}>🆕</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13.5, fontWeight:560, color:TXT }}>Quoi de neuf</div>
                      <div style={{ fontSize:11.5, color:MUT }}>Journal des mises à jour — version {APP_VERSION}</div>
                    </div>
                    <span style={{ color:DIM, fontSize:16 }}>›</span>
                  </div>
                </div>

                {/* Contact / Suggestions */}
                <div style={{ marginTop:18 }}>
                  <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>Contact & suggestions</div>
                  <div style={{ background:PANEL, border:`1px solid var(--cg-bdr)`, borderRadius:8, padding:"16px 18px" }}>
                    <div style={{ color:MUT, fontSize:13, lineHeight:1.55, marginBottom:12 }}>
                      Une idée de chapitre, une coquille à signaler, une remarque ? Vos retours aident à améliorer CardioGuide.
                    </div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      <a href={"mailto:douglaschoignard@icloud.com?subject=" + encodeURIComponent("CardioGuide — Suggestion de chapitre") + "&body=" + encodeURIComponent("Chapitre ou fiche suggéré(e) :\n\nPourquoi ce serait utile :\n\n")}
                        style={{ flex:"1 1 auto", textDecoration:"none", textAlign:"center", background:"var(--cg-accent-btn)", color:"var(--cg-on-accent)", borderRadius:8, padding:"11px 16px", fontSize:13, fontWeight:560 }}>
 Suggérer un chapitre
                      </a>
                      <a href={"mailto:douglaschoignard@icloud.com?subject=" + encodeURIComponent("CardioGuide — Signalement de coquille") + "&body=" + encodeURIComponent("Fiche concernée :\n\nCoquille / erreur repérée :\n\nCorrection proposée :\n\n")}
                        style={{ flex:"1 1 auto", textDecoration:"none", textAlign:"center", background:PANEL, color:"#E85D4A", border:"1px solid #E85D4A", borderRadius:8, padding:"11px 16px", fontSize:13, fontWeight:560 }}>
 Signaler une coquille
                      </a>
                    </div>
                  </div>
                </div>
                {/* Copyright */}
                <div style={{ marginTop:32, paddingTop:16, textAlign:"center", borderTop:`1px solid ${BDR}` }}>
                  <div style={{ fontSize:11, fontWeight:600, color:MUT }}>
                    Conçu par <span style={{ color:"#C26A1C", fontWeight:640 }}>Douglas C.</span>
                    <span style={{ color:DIM, margin:"0 6px" }}>·</span><span style={{ color:DIM }}>2026</span>
                  </div>
                  <div style={{ color:DIM, fontSize:10, marginTop:6, lineHeight:1.5 }}>
                    Outil d'aide à la décision destiné aux professionnels de santé.<br/>
                    Ne remplace pas le jugement clinique. Vérifiez les recommandations en vigueur.
                  </div>
                </div>
              </div>
            ) : (
            <div>
            {/* Recherche (mobile) */}
            <div style={{ position:"relative", marginBottom:14 }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--cg-dim)", display:"flex", pointerEvents:"none" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></span>
              <input
                ref={searchInputRef}
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onBlur={e => { setSearchOpen(false); e.target.style.borderColor = "var(--cg-bdr)"; }}
                onFocus={e => { setSearchOpen(true); e.target.style.borderColor = "var(--cg-accent)"; }}
                placeholder="Rechercher un chapitre, une fiche, un score…"
                style={{
                  width:"100%", boxSizing:"border-box", padding:"12px 32px 12px 38px",
                  background:PANEL, border:`1px solid ${BDR}`, borderRadius:8,
                  fontSize:16, color:TXT, outline:"none", fontFamily:"inherit",
                  transition:"border-color 0.12s",
                }}
              />
              {searchQ && (
                <span onClick={() => setSearchQ("")} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", cursor:"pointer", color:DIM, display:"flex" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span>
              )}
            </div>
            {searchQ.trim().length >= 2 && (
              <div style={{ marginBottom:16, background:CARD, border:`1px solid ${BDR}`, borderRadius:8, overflow:"hidden" }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding:"14px", fontSize:13, color:MUT, textAlign:"center" }}>Aucun résultat pour « {searchQ} »</div>
                ) : searchResults.map((r, i) => (
                  <div key={i} onClick={() => goToSearchResult(r)} style={{
                    padding:"11px 13px", cursor:"pointer", borderBottom: i<searchResults.length-1?`1px solid ${BDR}`:"none",
                    display:"flex", alignItems:"center", gap:11,
                  }}>
                    <Icon name={r.icon} size={16} style={{ color:"var(--cg-dim)" }}/>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:560, color:INK }}>{r.label}</div>
                      <div style={{ fontSize:11, color:MUT, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.parent ? r.parent+" · " : ""}{r.sub}</div>
                    </div>
                    <span style={{ color:DIM, fontSize:16, flexShrink:0 }}>›</span>
                  </div>
                ))}
              </div>
            )}
            {/* Favoris épinglés */}
            {favorites.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ color:DIM, fontSize:11, marginBottom:9, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>Favoris</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {favorites.map((r,i) => (
                    <div key={i} onClick={() => goToSearchResult(r)} style={{
                      background:PANEL, border:`1px solid var(--cg-bdr)`, borderRadius:8, padding:"11px 13px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:11, position:"relative", overflow:"hidden",
                    }}>
                      <Icon name={r.icon} size={16} style={{ color:"var(--cg-dim)" }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:INK, fontWeight:560, fontSize:13.5 }}>{r.label}</div>
                        <div style={{ color:MUT, fontSize:10.5, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.sub}</div>
                      </div>
                      <span onClick={(e)=>{e.stopPropagation(); toggleFav(r);}} style={{ color:"var(--cg-accent)", flexShrink:0, padding:"0 2px", display:"flex" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.6 5.6 6.4.8-4.7 4.3 1.2 6.3L12 17l-5.5 3 1.2-6.3L3 9.4l6.4-.8z"/></svg></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Récemment consultés */}
            {recents.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ color:DIM, fontSize:11, marginBottom:9, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>Récemment consultés</div>
                <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
                  {recents.map((r,i) => (
                    <div key={i} onClick={() => goToSearchResult(r)} style={{
                      background:PANEL, border:`1px solid var(--cg-bdr)`, borderRadius:8, padding:"9px 12px", cursor:"pointer", flexShrink:0, maxWidth:160,
                      display:"flex", alignItems:"center", gap:8,
                    }}>
                      <Icon name={r.icon} size={16} style={{ color:"var(--cg-dim)" }}/>
                      <div style={{ color:INK, fontWeight:560, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Urgences de garde — priority card at the very top */}
            <div onClick={() => openChapter("urgences")} style={{
              background: "var(--cg-danger-soft)",
              borderRadius:8, padding: "15px 16px",
              cursor: "pointer",
              marginBottom: 16,
              display:"flex", alignItems:"center", gap:13,
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
            >
              <Icon name="alert" size={18} style={{ color:"var(--cg-danger)" }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:"var(--cg-danger)", fontFamily:SERIF, fontWeight:600, fontSize:16, letterSpacing:"-0.005em" }}>{CHAPTERS.urgences.label}</div>
                <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{CHAPTERS.urgences.subtitle}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ color:"var(--cg-danger)", flexShrink:0 }}>
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Reference sections — grouped cards */}
            <div style={{
              display:"grid",
              gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
              gap: isDesktop ? 12 : 0,
              marginBottom: isDesktop ? 16 : 0,
            }}>
            {Object.entries(REF_SECTIONS).map(([skey, sec]) => (
              <div key={skey} onClick={() => sec.items.length === 1 ? openValveDirect(sec.items[0]) : setRefSection(skey)} style={{
                background: PANEL,
                border: `1px solid var(--cg-bdr)`,
                borderRadius:8, padding: "13px 15px", minHeight:56,
                cursor: "pointer",
                marginBottom: isDesktop ? 0 : 10,
                display:"flex", alignItems:"center", gap:13,
                transition: "all 0.2s",
                position:"relative", overflow:"hidden",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
              >
                                <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={sec.icon} size={18}/></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{sec.label}</div>
                  <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{sec.full}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            ))}
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:10, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner un chapitre
              </div>
              <div style={{ display:"grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap:10 }}>
                {Object.entries(CHAPTERS).filter(([key]) => key !== "urgences").map(([key, chap]) => (
                  <div key={key} onClick={() => chap.ready && openChapter(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px", minHeight:56,
                    cursor: chap.ready ? "pointer" : "default",
                    opacity: chap.ready ? 1 : 0.55,
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { if(chap.ready){ e.currentTarget.style.borderColor = "var(--cg-accent-line)"; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={chap.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{chap.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{chap.subtitle}</div>
                    </div>
                    {!chap.ready && <Badge color={MUT}>Bientôt</Badge>}
                    {chap.ready && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Nouveautés (mobile) */}
            <div style={{ marginTop:20 }}>
              <div onClick={() => setShowNews(true)} style={{
                    background:PANEL, border:`1px solid ${BDR}`, borderRadius:8,
                    padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
                    marginBottom:0,
                  }}>
                    <span style={{ fontSize:18 }}>🆕</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13.5, fontWeight:560, color:TXT }}>Quoi de neuf</div>
                      <div style={{ fontSize:11.5, color:MUT }}>Journal des mises à jour — version {APP_VERSION}</div>
                    </div>
                    <span style={{ color:DIM, fontSize:16 }}>›</span>
                  </div>
            </div>

            {/* Contact / Suggestions (mobile) */}
            <div style={{ marginTop:14 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:9, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>Contact & suggestions</div>
              <div style={{ background:PANEL, border:`1px solid var(--cg-bdr)`, borderRadius:8, padding:"14px 15px" }}>
                <div style={{ color:MUT, fontSize:12.5, lineHeight:1.55, marginBottom:11 }}>
                  Une idée de chapitre, une coquille à signaler ? Vos retours aident à améliorer CardioGuide.
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <a href={"mailto:douglaschoignard@icloud.com?subject=" + encodeURIComponent("CardioGuide — Suggestion de chapitre") + "&body=" + encodeURIComponent("Chapitre ou fiche suggéré(e) :\n\nPourquoi ce serait utile :\n\n")}
                    style={{ textDecoration:"none", textAlign:"center", background:"var(--cg-accent-btn)", color:"var(--cg-on-accent)", borderRadius:8, padding:"12px", fontSize:13, fontWeight:560 }}>
 Suggérer un chapitre
                  </a>
                  <a href={"mailto:douglaschoignard@icloud.com?subject=" + encodeURIComponent("CardioGuide — Signalement de coquille") + "&body=" + encodeURIComponent("Fiche concernée :\n\nCoquille / erreur repérée :\n\nCorrection proposée :\n\n")}
                    style={{ textDecoration:"none", textAlign:"center", background:PANEL, color:"#E85D4A", border:"1px solid #E85D4A", borderRadius:8, padding:"12px", fontSize:13, fontWeight:560 }}>
 Signaler une coquille
                  </a>
                </div>
              </div>
            </div>

            {/* Copyright / disclaimer footer */}
            <div style={{ marginTop:20, padding:"14px 16px 8px", textAlign:"center" }}>
              <div style={{ fontSize:11, fontWeight:600, color:MUT, letterSpacing:"0.02em" }}>
                Conçu par <span style={{ color:"#C26A1C", fontWeight:640 }}>Douglas C.</span>
                <span style={{ color:DIM, margin:"0 6px" }}>·</span>
                <span style={{ color:DIM }}>2026</span>
              </div>
              <div style={{ color:DIM, fontSize:10, marginTop:6, lineHeight:1.5 }}>
                Outil d'aide à la décision destiné aux professionnels de santé.<br/>
                Ne remplace pas le jugement clinique. Vérifiez les recommandations en vigueur.
              </div>
            </div>
            </div>
            )}
          </div>
        )}
        {!chapter && !sub && refSection && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                {REF_SECTIONS[refSection].label}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {REF_SECTIONS[refSection].items.map(itemKey => {
                  const item = VALVES[itemKey];
                  return (
                    <div key={itemKey} onClick={() => openValveDirect(itemKey)} style={{
                      background: CARD,
                      border: `1px solid ${BDR}`,
                      borderRadius:8, padding: "14px 16px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display:"flex", alignItems:"center", gap:14,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.background = item.color+"14"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = BDR; e.currentTarget.style.background = CARD; }}
                    >
                      <Icon name={item.icon} size={16} style={{ color:"var(--cg-dim)" }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ color:INK, fontWeight:560, fontSize:14, letterSpacing:"-0.005em" }}>{item.full}</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" style={{ color:DIM, flexShrink:0 }}>
                        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEVEL 1 — Urgences de garde chapter hub ═══ */}
        {chapter === "urgences" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une urgence
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(URG_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseUrg(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <Info title="Aide à la décision" color={URG_TOPICS.acr.color}>
              Ces fiches sont des aide-mémoires de garde et ne remplacent pas les protocoles locaux ni le jugement clinique. En situation critique, appeler l'aide/le sénior sans délai.
            </Info>
          </div>
        )}

        {/* ═══ LEVEL 1 — Situations particulières chapter hub ═══ */}
        {chapter === "spec" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une situation
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(SPEC_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseSpec(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEVEL 1 — Péricardite & Myocardite chapter hub ═══ */}
        {chapter === "pericmyo" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une pathologie
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(PERIMYO_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => choosePm(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <Info title="Concept IMPS (ESC 2025)" color={PERIMYO_TOPICS.pericardite.color}>
              Le « syndrome myopéricardique inflammatoire » unifie péricardite et myocardite : penser à rechercher une atteinte myocardique (troponine) devant toute péricardite, et inversement.
            </Info>
          </div>
        )}

        {/* ═══ LEVEL 1 — Dyskaliémies & métabolisme chapter hub ═══ */}
        {chapter === "metab" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner un trouble
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(METAB_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseMetab(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <Info title="Réflexe de garde" color={METAB_TOPICS.hyperk.color}>
              Toute dyskaliémie symptomatique ou avec anomalie ECG est une urgence. Corriger conjointement le magnésium, souvent associé.
            </Info>
          </div>
        )}

        {/* ═══ LEVEL 1 — Aorte thoracique chapter hub ═══ */}
        {chapter === "aorte" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une rubrique
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(AORTE_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseAorte(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <SeeAlso items={[
              { label:"Dissection aortique", icon:"💥", color:"#EB5757", target:{ kind:"topic", chapterKey:"urgences", topicKey:"chest" } },
              { label:"Valvulopathies", icon:"🫀", color:"#E85D4A", target:{ kind:"chapter", chapterKey:"valvulo" } },
            ]}/>
          </div>
        )}

        {/* ═══ LEVEL 1 — HTAP chapter hub ═══ */}
        {chapter === "htap" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une rubrique
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(HTAP_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseHtap(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <Info title="Réflexe" color={HTAP_TOPICS.defclass.color}>
              Groupes 2 (cœur gauche) et 3 (respiratoire) = les plus fréquents, traiter la cause. Groupes 1 (HTAP) et 4 (CTEPH) = adresser en centre expert.
            </Info>
          </div>
        )}

{/* ═══ LEVEL 1 — Stimulation & DAI chapter hub ═══ */}
        {chapter === "rythmo" && rythmoSelected === "stim" && !stm && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une rubrique
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(STIM_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseStim(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <Info title="Réflexe" color={STIM_TOPICS.indic.color}>
              Avant toute indication de stimulation : éliminer une cause réversible (ischémie aiguë, médicaments bradycardisants, hyperkaliémie, hypothyroïdie, maladie de Lyme, post-opératoire précoce) et vérifier la corrélation symptômes–bradycardie.
            </Info>
          </div>
        )}

                {/* ═══ LEVEL 1 — Facteurs de risque CV chapter hub ═══ */}
        {/* ═══ LEVEL 1 — Canalopathies sub-hub ═══ */}
        {chapter === "rythmo" && rythmoSelected === "canal" && !cnl && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une rubrique
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(CANAL_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseCanal(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <Info title="Réflexe" color={CANAL_TOPICS.qtlong.color}>
              Devant une syncope à l&apos;effort, une syncope avec convulsions ou une mort subite familiale avant 40 ans, penser canalopathie et faire un ECG à toute la fratrie et aux apparentés du premier degré.
            </Info>
          </div>
        )}

                {/* ═══ LEVEL 1 — Facteurs de risque CV chapter hub ═══ */}
        {/* ═══ LEVEL 1 — Congenital adulte chapter hub ═══ */}
        {chapter === "cong" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une rubrique
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(CONG_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseCong(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <Info title="Réflexe" color={CONG_TOPICS.princ.color}>
              Trois questions structurent la consultation : quelle anatomie initiale, quelle réparation, quelles séquelles à surveiller ? Récupérer les comptes-rendus opératoires est souvent l&apos;étape la plus utile.
            </Info>
          </div>
        )}

                {/* ═══ LEVEL 1 — Facteurs de risque CV chapter hub ═══ */}
        {/* ═══ LEVEL 1 — MTEV chapter hub ═══ */}
        {chapter === "mtev" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une rubrique
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(MTEV_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseMtev(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <Info title="Réflexe" color={MTEV_TOPICS.duree.color}>
              Après 3 mois de traitement, la vraie question n&apos;est plus « combien de temps » mais « le facteur déclenchant a-t-il disparu ? ». Les recommandations ESC 2019 ont d&apos;ailleurs abandonné les termes « provoquée » et « non provoquée ».
            </Info>
          </div>
        )}

                {/* ═══ LEVEL 1 — Facteurs de risque CV chapter hub ═══ */}
        {/* ═══ LEVEL 1 — USIC chapter hub ═══ */}
        {chapter === "usic" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une rubrique
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(USIC_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseUsic(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <Info title="Réflexe" color={USIC_TOPICS.choc.color}>
              Un patient normotendu peut déjà être en choc : ce sont les marqueurs de perfusion (lactates, diurèse, marbrures, conscience) qui font le diagnostic, pas seulement le chiffre de pression artérielle.
            </Info>
          </div>
        )}

                {/* ═══ LEVEL 1 — Facteurs de risque CV chapter hub ═══ */}
        {/* ═══ LEVEL 1 — Grossesse chapter hub ═══ */}
        {chapter === "gross" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une rubrique
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(GROSS_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseGross(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <Info title="Réflexe" color={GROSS_TOPICS.risque.color}>
              Toute cardiopathie classée mWHO 2.0 II–III ou au-delà relève d&apos;une équipe pluridisciplinaire dédiée (Pregnancy Heart Team), idéalement dès avant la conception.
            </Info>
          </div>
        )}

                {/* ═══ LEVEL 1 — Facteurs de risque CV chapter hub ═══ */}
        {chapter === "fdr" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner une rubrique
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(FDR_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseFdr(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <SeeAlso items={[
              { label:"Hypertension artérielle", icon:"🩸", color:"#2F8F66", target:{ kind:"chapter", chapterKey:"hta" } },
              { label:"Scores (SCORE2)", icon:"🧮", color:ACCENT, target:{ kind:"refcard", topicKey:"scores" } },
              { label:"Scanner (score calcique)", icon:"🖥️", color:"#1684A8", target:{ kind:"refcard", topicKey:"scanner" } },
            ]}/>
          </div>
        )}

        {/* ═══ LEVEL 1 — Valvulopathies chapter hub ═══ */}
        {chapter === "valvulo" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner la valvulopathie
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {Object.entries(VALVES).filter(([key]) => !["ecg","ecgpath","ett","eto","irm","scanner","cathd","avk","poso","scores","antibio","relais","classif","equiv"].includes(key)).map(([key, valve]) => (
                  <div key={key} onClick={() => choose(key)} style={{
                    background: PANEL,
                    border: `1px solid ${BDR}`,
                    borderRadius:8, padding: "15px 12px", minHeight:96,
                    cursor: "pointer", textAlign: "left",
                    display:"flex", flexDirection:"column", gap:7,
                    transition: "border-color 0.12s, background 0.12s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; e.currentTarget.style.background = "var(--cg-accent-soft)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; e.currentTarget.style.background = "var(--cg-panel)"; }}
                  >
                    <Icon name={valve.icon} size={19} style={{ color:"var(--cg-dim)" }}/>
                    <div>
                      <div style={{ color: INK, fontFamily:SERIF, fontWeight: 600, fontSize: 15.5,
                        letterSpacing:"-0.005em" }}>{valve.label}</div>
                      <div style={{ color: MUT, fontSize: 11, marginTop: 2, lineHeight: 1.35 }}>{valve.full}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background:SURF, border:`1px solid ${BDR}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ color:MUT, fontSize:10, fontWeight:560, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Légende</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {[["#27AE60","Classe I","Recommandé"],["#C26A1C","Classe IIa","À envisager"],["#F2C94C","Classe IIb","Peut être envisagé"],["#EB5757","Classe III","Non recommandé"]].map(([col,cl,desc])=>(
                  <div key={cl} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Badge color={col}>{cl}</Badge>
                    <span style={{ color:MUT, fontSize:11 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEVEL 1 — Insuffisance cardiaque chapter hub ═══ */}
        {chapter === "ic" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner un sous-chapitre
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(IC_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseIc(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background:SURF, border:`1px solid ${BDR}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ color:MUT, fontSize:10, fontWeight:560, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Légende</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {[["#27AE60","Classe I","Recommandé"],["#C26A1C","Classe IIa","À envisager"],["#F2C94C","Classe IIb","Peut être envisagé"],["#EB5757","Classe III","Non recommandé"]].map(([col,cl,desc])=>(
                  <div key={cl} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Badge color={col}>{cl}</Badge>
                    <span style={{ color:MUT, fontSize:11 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEVEL 1 — Cardiologie du sport chapter hub ═══ */}
        {chapter === "sport" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner un sous-chapitre
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(SPORT_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseSport(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background:SURF, border:`1px solid ${BDR}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ color:MUT, fontSize:10, fontWeight:560, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Légende</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {[["#27AE60","Classe I","Recommandé"],["#C26A1C","Classe IIa","À envisager"],["#F2C94C","Classe IIb","Peut être envisagé"],["#EB5757","Classe III","Non recommandé"]].map(([col,cl,desc])=>(
                  <div key={cl} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Badge color={col}>{cl}</Badge>
                    <span style={{ color:MUT, fontSize:11 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEVEL 1 — Hypertension artérielle chapter hub ═══ */}
        {chapter === "hta" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner un sous-chapitre
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(HTA_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseHta(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background:SURF, border:`1px solid ${BDR}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ color:MUT, fontSize:10, fontWeight:560, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Légende</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {[["#27AE60","Classe I","Recommandé"],["#C26A1C","Classe IIa","À envisager"],["#F2C94C","Classe IIb","Peut être envisagé"],["#EB5757","Classe III","Non recommandé"]].map(([col,cl,desc])=>(
                  <div key={cl} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Badge color={col}>{cl}</Badge>
                    <span style={{ color:MUT, fontSize:11 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEVEL 1 — Cardiomyopathies chapter hub ═══ */}
        {chapter === "cmp" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner un sous-chapitre
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(CMP_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseCmp(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background:SURF, border:`1px solid ${BDR}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ color:MUT, fontSize:10, fontWeight:560, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Légende</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {[["#27AE60","Classe I","Recommandé"],["#C26A1C","Classe IIa","À envisager"],["#F2C94C","Classe IIb","Peut être envisagé"],["#EB5757","Classe III","Non recommandé"]].map(([col,cl,desc])=>(
                  <div key={cl} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Badge color={col}>{cl}</Badge>
                    <span style={{ color:MUT, fontSize:11 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEVEL 1 — Endocardite infectieuse chapter hub ═══ */}
        {chapter === "endo" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner un sous-chapitre
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(ENDO_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseEndo(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background:SURF, border:`1px solid ${BDR}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ color:MUT, fontSize:10, fontWeight:560, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Légende</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {[["#27AE60","Classe I","Recommandé"],["#C26A1C","Classe IIa","À envisager"],["#F2C94C","Classe IIb","Peut être envisagé"],["#EB5757","Classe III","Non recommandé"]].map(([col,cl,desc])=>(
                  <div key={cl} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Badge color={col}>{cl}</Badge>
                    <span style={{ color:MUT, fontSize:11 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEVEL 1 — Cardiopathie ischémique chapter hub ═══ */}
        {chapter === "ischemic" && !sub && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner un sous-chapitre
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(ISCHEMIC_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseIschemic(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background:SURF, border:`1px solid ${BDR}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ color:MUT, fontSize:10, fontWeight:560, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Légende</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {[["#27AE60","Classe I","Recommandé"],["#C26A1C","Classe IIa","À envisager"],["#F2C94C","Classe IIb","Peut être envisagé"],["#EB5757","Classe III","Non recommandé"]].map(([col,cl,desc])=>(
                  <div key={cl} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Badge color={col}>{cl}</Badge>
                    <span style={{ color:MUT, fontSize:11 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEVEL 1 — Rythmologie chapter hub ═══ */}
        {chapter === "rythmo" && !sub && rythmoSelected !== "fa" && rythmoSelected !== "stim" && rythmoSelected !== "canal" && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Sélectionner un sous-chapitre
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(RYTHMO_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseRythmo(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ background:SURF, border:`1px solid ${BDR}`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ color:MUT, fontSize:10, fontWeight:560, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Légende</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {[["#27AE60","Classe I","Recommandé"],["#C26A1C","Classe IIa","À envisager"],["#F2C94C","Classe IIb","Peut être envisagé"],["#EB5757","Classe III","Non recommandé"]].map(([col,cl,desc])=>(
                  <div key={cl} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Badge color={col}>{cl}</Badge>
                    <span style={{ color:MUT, fontSize:11 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEVEL 1.5 — FA mini-hub (within Rythmologie) ═══ */}
        {chapter === "rythmo" && rythmoSelected === "fa" && !fa && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:DIM, fontSize:11, marginBottom:11, fontWeight:640, textTransform:"uppercase", letterSpacing:"0.09em" }}>
                Fibrillation Atriale — sélectionner une rubrique
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(FA_TOPICS).map(([key, topic]) => (
                  <div key={key} onClick={() => chooseFa(key)} style={{
                    background: PANEL,
                    border: `1px solid var(--cg-bdr)`,
                    borderRadius:8, padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display:"flex", alignItems:"center", gap:13,
                    position:"relative", overflow:"hidden",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cg-accent-line)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cg-bdr)"; }}
                  >
                                        <div style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", color:DIM, flexShrink:0 }}><Icon name={topic.icon} size={18}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color: INK, fontWeight:560, fontSize:14.5, letterSpacing:"-0.01em" }}>{topic.label}</div>
                      <div style={{ color:MUT, fontSize:11, marginTop:1 }}>{topic.full}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color:DIM, flexShrink:0 }} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={homeRythmoSub} style={{
              background:SURF, border:`1px solid ${BDR}`, color:MUT,
              borderRadius:8, padding:"10px 14px", cursor:"pointer",
              fontSize:12, fontWeight:600, width:"100%",
            }}>← Retour à Rythmologie</button>
          </div>
        )}

        {/* ═══ LEVEL 2 — Algorithm within selected valve, IC topic, ischemic topic, rythmo topic, sport, hta, cmp, or endo topic ═══ */}
        {sub && (
          <div>
            {isDesktop && (
              <div style={{ marginBottom:18 }}>
                <div style={{ fontFamily:SERIF, fontSize:25, fontWeight:600, color:INK, letterSpacing:"-0.008em", lineHeight:1.2 }}>{sub.full || sub.label}</div>
                <div style={{ display:"inline-block", marginTop:9, background:"var(--cg-accent-soft)", color:ACCENT, fontSize:11, fontWeight:640, padding:"4px 11px", borderRadius:6, letterSpacing:"0.03em" }}>
                  {ch ? ch.full || ch.label : "Référence"}
                </div>
              </div>
            )}
            {v   && <AlgoContent valve={selected} go={go} step={step}/>}
            {ic  && <ICContent topic={icSelected} go={go} step={step}/>}
            {isc && <IschemicContent topic={ischemicSelected} go={go} step={step}/>}
            {rh  && <RythmoContent topic={rythmoSelected} go={go} step={step}/>}
            {fa  && <RythmoContent topic={faSelected} go={go} step={step}/>}
            {sp  && <SportContent topic={sportSelected} go={go} step={step}/>}
            {ht  && <HTAContent topic={htaSelected} go={go} step={step}/>}
            {cm  && <CMPContent topic={cmpSelected} go={go} step={step}/>}
            {en  && <EndoContent topic={endoSelected} go={go} step={step}/>}
            {ur  && <UrgencesContent topic={urgSelected} go={go} step={step}/>}
            {spx && <SpecContent topic={specSelected} go={go} step={step}/>}
            {pm  && <PeriMyoContent topic={pmSelected} go={go} step={step}/>}
            {mtb && <MetabContent topic={metabSelected} go={go} step={step}/>}
            {aor && <AorteContent topic={aorteSelected} go={go} step={step}/>}
            {htp && <HtapContent topic={htapSelected} go={go} step={step}/>}
            {fdr && <FdrContent topic={fdrSelected} go={go} step={step}/>}
            {stm && <StimContent topic={stimSelected} go={go} step={step}/>}
            {cng && <CongContent topic={congSelected} go={go} step={step}/>}
            {grs && <GrossContent topic={grossSelected} go={go} step={step}/>}
            {mte && <MtevContent topic={mtevSelected} go={go} step={step}/>}
            {cnl && <CanalContent topic={canalSelected} go={go} step={step}/>}
            {usc && <UsicContent topic={usicSelected} go={go} step={step}/>}
          </div>
        )}
      </div>
      </div>

      {/* ── Fenêtre « Nouveautés » ── */}
      {showNews && (
        <div onClick={closeNews} style={{
          position:"fixed", inset:0, zIndex:1000,
          background:"rgba(0,0,0,0.5)", backdropFilter:"blur(2px)",
          display:"flex", alignItems:"center", justifyContent:"center", padding:16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:PANEL, border:`1px solid ${BDR}`, borderRadius:8,
            maxWidth:520, width:"100%", maxHeight:"82vh", overflowY:"auto",
            boxSizing:"border-box", padding:"20px 20px 16px",
            boxShadow:"0 12px 32px rgba(0,0,0,0.22)",
          }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:14 }}>
              <Icon name="target" size={22} style={{ color:"var(--cg-accent)" }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:18, fontWeight:640, color:INK, letterSpacing:"-0.02em" }}>Nouveautés</div>
                <div style={{ fontSize:12, color:MUT, marginTop:2 }}>Ce qui a changé depuis votre dernière visite</div>
              </div>
              <button onClick={closeNews} aria-label="Fermer" style={{
                width:30, height:30, flexShrink:0, background:"transparent",
                border:`1px solid ${BDR}`, borderRadius:8, cursor:"pointer",
                fontSize:14, color:MUT, display:"flex", alignItems:"center", justifyContent:"center",
              }}></button>
            </div>

            {CHANGELOG.map((rel, ri) => (
              <div key={ri} style={{ marginBottom: ri === CHANGELOG.length - 1 ? 4 : 18 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{
                    background:"var(--cg-accent-btn)", color:"var(--cg-on-accent)", fontSize:11, fontWeight:640,
                    padding:"3px 9px", borderRadius:6, letterSpacing:"0.02em",
                  }}>Version {rel.v}</span>
                  <span style={{ fontSize:11.5, color:DIM, fontWeight:600 }}>{rel.date}</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                  {rel.items.map((it, ii) => (
                    <div key={ii} style={{
                      background:CARD, border:`1px solid ${BDR}`, borderRadius:8, padding:"10px 12px",
                    }}>
                      <div style={{ fontSize:13, fontWeight:560, color:TXT, marginBottom:2 }}>{it.t}</div>
                      <div style={{ fontSize:12, color:MUT, lineHeight:1.5 }}>{it.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={closeNews} style={{
              width:"100%", marginTop:16, padding:"12px", border:"none",
              background:"var(--cg-accent-btn)", color:"var(--cg-on-accent)", borderRadius:8,
              fontSize:13.5, fontWeight:560, cursor:"pointer", fontFamily:"inherit",
            }}>Compris</button>
          </div>
        </div>
      )}

      {/* ── Barre d'onglets (mobile) ────────────────────────────────
          Remplace le rail latéral, inexistant sur téléphone. Placée en
          bas : seule zone atteignable au pouce. « Urgences » y dispose
          d'un onglet permanent, joignable depuis n'importe quel écran. */}
      {!isDesktop && (
        <div style={{
          position:"fixed", left:0, right:0, bottom:0, zIndex:60,
          background:"var(--cg-bg2)", borderTop:`1px solid ${BDR}`,
          display:"flex", paddingBottom:"env(safe-area-inset-bottom)",
        }}>
          {[
            { key:"chap",   label:"Chapitres", icon:"pulse",  active: !chapter && !refSection && !searchOpen,
              on:()=>{ homeAll(); setSearchOpen(false); } },
            { key:"urg",    label:"Urgences",  icon:"alert",  active: chapter==="urgences", danger:true,
              on:()=>{ openUrgences(); setSearchOpen(false); } },
            { key:"tools",  label:"Outils",    icon:"calc",   active: refSection==="toolsSec",
              on:()=>{ homeAll(); setRefSection("toolsSec"); setSearchOpen(false); } },
            { key:"search", label:"Recherche", icon:"search", active: searchOpen,
              on:()=>{ homeAll(); focusSearch(); } },
          ].map(t => {
            const col = t.danger ? "var(--cg-danger)" : (t.active ? ACCENT : DIM);
            return (
              <button key={t.key} onClick={t.on} aria-label={t.label}
                aria-current={t.active ? "page" : undefined}
                style={{
                  flex:1, minHeight:50, paddingTop:7, paddingBottom:5,
                  background:"transparent", border:"none", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", gap:3, color:col,
                  fontFamily:"inherit", fontSize:9.5,
                  fontWeight: t.active ? 640 : 520, letterSpacing:"-0.01em",
                }}>
                <Icon name={t.icon} size={19} stroke={t.active ? 1.9 : 1.6}/>
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
