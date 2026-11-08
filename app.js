// PressNex – Einsatzberichte für die Pressearbeit der Freiwilligen Feuerwehr Lingen (Ems)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app-check.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, query, orderBy, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-ai.js";
import { DEFAULT_STAMM } from "./data.js?v=20261108-2010";

/* ---------- Konfiguration (öffentlich, nicht geheim) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyB3pOV9eR_sGR2b8etc1g8LcDSBOlipBQM",
  authDomain: "pressnex-eddb2.firebaseapp.com",
  projectId: "pressnex-eddb2",
  storageBucket: "pressnex-eddb2.firebasestorage.app",
  messagingSenderId: "683552259157",
  appId: "1:683552259157:web:3b5425c0e06c29708fa8dc"
};
const APPCHECK_KEY = "6LekahYuAAAAAAUuvzof8ZAGkrOA-GTcLB9fPTcO";
const MAIL_DOMAIN = "pressnex-eddb2.firebaseapp.com";
const LOCK_AFTER_MS = 5 * 60 * 1000;

const DEFAULT_KI = {
  modell: "gemini-3.8-flash",
  stil: `Du schreibst Einsatzberichte für die Facebook- und Instagram-Seite der Freiwilligen Feuerwehr Lingen (Ems).
Aufbau und Stil (orientiert an den bisherigen Berichten der Pressesprecher):
- KEINE Überschrift. Erster Satz: Alarmierung mit Tageszeit, Uhrzeit, AAO-Stichwort in Anführungszeichen und Ortsteil, z. B. "Am Freitagmorgen wurden wir um 09:26 Uhr mit dem Einsatzstichwort „F3_Garage/Schuppen“ in den Stadtteil Laxten alarmiert."
- Wurden weitere Lingener Ortsfeuerwehren direkt mitalarmiert, gehören sie in den ersten Satz: "… wurden wir gemeinsam mit der Feuerwehr Altenlingen mit dem Einsatzstichwort „F3_Schiff“ in den Bereich … alarmiert."
- Typische Formulierungen der Pressesprecher: "Beim Eintreffen an der Einsatzstelle bestätigte sich die gemeldete Lage.", "… stand in Vollbrand.", "Umgehend wurde die Brandbekämpfung mittels eines C-Rohres eingeleitet.", "Zwei Trupps unter Atemschutz gingen zur Brandbekämpfung vor und konnten das Feuer zügig unter Kontrolle bringen sowie vollständig ablöschen.", "Aufgrund des Einsatzstichwortes waren zusätzlich … alarmiert worden. … mussten diese Kräfte nicht tätig werden."
- Diese Wörter NICHT verwenden: "Vorfall", "Feuer in voller Ausdehnung" (stattdessen "brannte in voller Ausdehnung" / "stand in Vollbrand"), "Einsatzgeschehen", "Brandereignis", "Schadenslage", "erfolgreich" bei Maßnahmen.
- Danach ein roter Faden in 3 bis 4 Absätzen, in der Reihenfolge der Lagebeschreibung: Lage beim Eintreffen (was brannte bzw. was vorgefunden wurde) → sofortige Maßnahmen ("Umgehend wurde die Brandbekämpfung eingeleitet." bzw. "Umgehend wurde die Menschenrettung eingeleitet.") → Löschangriff → Nachlöscharbeiten → Personen → Abschluss.
- Das AAO-Stichwort beschreibt nur die Alarmierung. Was tatsächlich brannte, steht in der Lagebeschreibung ("Es brannte: …"). Niemals Formulierungen wie "eine Garage beziehungsweise ein Schuppen". Ist nichts angegeben, neutral bleiben ("Beim Eintreffen der ersten Kräfte war eine starke Rauchentwicklung sichtbar.").
- Logischer Aufbau: erst beschreiben, was vorgefunden wurde, dann was getan wurde, dann das Ergebnis. Keine Maßnahme ohne vorherige Lagebeschreibung, keine zusammenhanglosen Sätze. Beispiel: "Beim Eintreffen an der Einsatzstelle bestätigte sich die gemeldete Lage: Eine Person befand sich im Wasser. Umgehend wurde die Menschenrettung eingeleitet. Die Person wurde leicht verletzt und an den Rettungsdienst übergeben."
- Stichpunkte nah am Wortlaut umsetzen und nichts dazuerfinden: "Kontrolle mit der Wärmebildkamera" → "Abschließend erfolgte eine Kontrolle mit der Wärmebildkamera." (nicht "Kontrolle der Brandstelle"). "Im weiteren Einsatzverlauf Netzmittel eingesetzt" → eigener Satz "Im weiteren Einsatzverlauf wurde zusätzlich Netzmittel eingesetzt." – nicht mit dem ersten Löschangriff in einen Satz packen.
- Verletzungen immer der Person zuordnen, die vorher beschrieben wurde ("Die Person wurde leicht verletzt …"), nicht als neue, unbekannte Person einführen.
- "Brannte bereits in voller Ausdehnung" mit dem Brandobjekt verbinden, z. B. "Beim Eintreffen der ersten Kräfte brannte eine Lagerhalle bereits in voller Ausdehnung."
- Maßnahmen neutral im Passiv formulieren, z. B. "Das Feuer wurde mit zwei C-Rohren bekämpft, zusätzlich kam Schaum zum Einsatz." Nicht "die Einsatzkräfte sind vorgegangen".
- Wir-Perspektive nur für die Feuerwehr Lingen selbst ("wurden wir alarmiert", "unterstützte uns").
- Unterstützende Feuerwehren kurz und natürlich einbauen, z. B. "Unterstützt wurden wir von der Feuerwehr Baccum." oder "Die Feuerwehr Baccum unterstützte uns mit einem Löschfahrzeug." Nicht "wurde zur Unterstützung der Feuerwehr Lingen alarmiert".
- Fahrzeuge nur so nennen, wie sie in den Einsatzdaten angegeben sind (allgemein verständlich, z. B. "Löschfahrzeug", "Drehleiter"). Keine Fahrzeuglisten. Fahrzeuge der einsatzführenden Feuerwehr gar nicht nennen.
- Keine Zahlen schätzen: niemals "rund" oder "etwa" vor Fahrzeug- oder Personenzahlen.
- Wortwiederholungen vermeiden, besonders "alarmiert", "Einsatz", "unterstützt" nicht in aufeinanderfolgenden Sätzen.
- KEIN Dank und KEIN Appell an die Bevölkerung, außer er steht ausdrücklich in der Lagebeschreibung ("Dank an …", "Hinweis: …"). Dann am Ende in einem eigenen kurzen Absatz.
- Schluss sachlich, z. B. "Nach rund zwei Stunden konnte der Einsatz beendet werden." – nur mit vorhandenen Angaben, sonst "Anschließend konnte der Einsatz beendet werden."
- Rettungsdienst und Polizei kurz erwähnen, wenn angegeben; Rettungshubschrauber mit Namen.
- Sachlich, ruhig, gut lesbar, abwechslungsreich. Keine Hashtags, keine Emojis, keine Unterschrift.
- Länge: 600 bis 1.500 Zeichen, niemals mehr als 2.000 Zeichen.`,
  beispiele: `Am Sonntagabend wurden wir um 19:50 Uhr mit dem Einsatzstichwort „F2_Fahrzeug“ in den Stadtteil Laxten auf den Parkplatz eines Verbrauchermarktes alarmiert.

Beim Eintreffen an der Einsatzstelle bestätigte sich die gemeldete Lage. Ein PKW brannte, eine starke Rauchentwicklung war sichtbar. Umgehend wurde die Brandbekämpfung eingeleitet. Ein Trupp unter Atemschutz ging mit einem C-Rohr zur Brandbekämpfung vor, wodurch eine weitere Ausbreitung des Feuers verhindert werden konnte. Im weiteren Einsatzverlauf wurde zusätzlich Netzmittel eingesetzt.

Abschließend erfolgte eine Kontrolle mit der Wärmebildkamera. Verletzt wurde niemand. Die Einsatzstelle wurde an die Polizei übergeben, anschließend konnte der Einsatz beendet werden.

---

Am Donnerstagmittag gegen 12:00 Uhr wurden wir gemeinsam mit der Feuerwehr Altenlingen mit dem Einsatzstichwort F3_Schiff in den Bereich des alten Hafens in Lingen alarmiert.

Beim Eintreffen an der Einsatzstelle bestätigte sich die gemeldete Lage. Ein Schiff, das sich aufgrund zuvor durchgeführter Zerlegemaßnahmen nicht mehr im Wasser befand, stand in Vollbrand. Umgehend wurde die Brandbekämpfung mittels eines C-Rohres eingeleitet. Zwei Trupps unter Atemschutz gingen zur Brandbekämpfung vor und konnten das Feuer zügig unter Kontrolle bringen sowie vollständig ablöschen.

Aufgrund des Einsatzstichwortes waren zusätzlich die DLRG Lingen sowie die Feuerwehrtaucher der Feuerwehr Meppen alarmiert worden. Da sich das betroffene Schiff nicht im Wasser befand, mussten diese Kräfte nicht tätig werden.

---

Am frühen Dienstagmorgen um 01:02 Uhr wurden wir mit dem Einsatzstichwort „F3_Garage/Schuppen“ in den Stadtteil Heukampstannen alarmiert. Beim Eintreffen der ersten Kräfte brannte es vor einer Garage direkt an einem Wohnhaus. Die Fassadenverkleidung war durch das Feuer bereits in Mitleidenschaft gezogen worden.

Die Besatzung eines Streifenwagens der Polizei, die zuerst an der Einsatzstelle eingetroffen war, wies die Einsatzkräfte auf ein weiteres Feuer in einem nahegelegenen Bereich hin. Dort brannte eine mobile Toilettenkabine auf einer Baustelle in voller Ausdehnung. Die Feuerwehr Holthausen unterstützte uns hierbei mit einem Löschfahrzeug.

Zum Zeitpunkt der Alarmierung befanden sich noch Einsatzkräfte im Feuerwehrhaus, da wir kurz zuvor bereits zu zwei Kleinfeuern in der Innenstadt alarmiert worden waren. Auch hier handelte es sich um brennende Mülltonnen sowie brennenden Unrat.

---

Am Montagabend wurden wir zu einem Waldbrand alarmiert. Beim Eintreffen brannte eine größere Waldfläche direkt hinter einem Bildungszentrum.

Aufgrund der starken Rauchentwicklung und der Nähe zum Gebäude wurde die Volkshochschule vorsorglich geräumt. Direkt zu Einsatzbeginn wurde außerdem eine Bevölkerungswarnung ausgelöst, um die Menschen im betroffenen Bereich über die Rauchentwicklung zu informieren.

Das Feuer wurde von drei Seiten bekämpft. Dabei wurden wir durch die Feuerwehren Holthausen und Altenlingen unterstützt. Gemeinsam konnte eine weitere Ausbreitung verhindert und der Brand unter Kontrolle gebracht werden. Örtliche Landwirte haben unsere Löschmaßnahme durch ein mit Wasser gefülltes Güllefass sowie technisches Gerät unterstützt. 

Nachdem das Feuer gelöscht war, wurde die gesamte Fläche ausführlich kontrolliert und verbliebene Glutnester wurden abgelöscht. Der Einsatz dauerte bis etwa 22:30 Uhr.

Gerade bei der aktuell hohen Waldbrandgefahr bitten wir darum, die entsprechenden Hinweise und Verhaltensregeln unbedingt zu beachten. Offenes Feuer, achtlos weggeworfene Zigaretten oder heiße Fahrzeugteile können bereits ausreichen, um einen Waldbrand auszulösen.

---

Gestern Morgen um 5:36 Uhr wurden die Feuerwehr Baccum und die Feuerwehr Bramsche parallel zu zwei Einsätzen alarmiert – mit derselben Ursache: Rauchentwicklung aus einem Waldstück im Lingener Wald.

Vor Ort fanden die Einsatzkräfte einen ausgedehnten Waldbrand auf über 3.000 Quadratmetern vor. Umgehend wurden weitere Kräfte nachalarmiert, unter anderem die Feuerwehr Osterbrock mit ihrer Drohneneinheit und die Feuerwehr Groß Hesepe mit dem ATV.

In Spitzenzeiten waren rund 25 Fahrzeuge und über 120 Einsatzkräfte im Einsatz – alle sechs Lingener Ortsfeuerwehren waren beteiligt. Der Grundschutz für das Stadtgebiet war parallel sichergestellt. Am frühen Nachmittag konnte „Feuer aus“ gemeldet werden.`
};
const HARD_RULES = `Unverzichtbare Regeln:
- Verwende ausschließlich die angegebenen Fakten. Erfinde keine Ursachen, Schäden, Verletzten, Maßnahmen, Zahlen oder Zeiten.
- Nenne niemals Straßen, Hausnummern, Kennzeichen, Namen oder das Alter von Personen.
- Gib nur den fertigen Bericht aus, ohne Vorbemerkung.`;

/* ---------- Firebase ---------- */
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
const app = initializeApp(firebaseConfig);
try { initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(APPCHECK_KEY), isTokenAutoRefreshEnabled: true }); } catch (e) { console.warn("App Check", e); }
const auth = getAuth(app);
const db = getFirestore(app);
const ai = getAI(app, { backend: new GoogleAIBackend() });

/* ---------- Zustand ---------- */
const S = {
  user: null, profile: null, loading: true,
  stamm: structuredClone(DEFAULT_STAMM), ki: { ...DEFAULT_KI },
  view: "neu", locked: false, freshLogin: false,
  form: newForm(), result: null, busy: false, error: "",
  berichte: null, filter: { q: "", jahr: "", monat: "", art: "", wehr: "" },
  pickers: {}, pin: "", lockMsg: "", setup: { step: 1, pin1: "" },
  admin: { users: null }, modal: null, editId: null, btab: ""
};

function newForm() {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  return {
    datum: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    uhrzeit: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    code: "", klartext: "", ort: "", adresse: "", besonderheiten: "",
    beteiligte: [], ausschreiben: false
  };
}

/* ---------- Hilfsfunktionen ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); }
function deDate(iso) { const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; }
function tagesPhrase(iso, hhmm) {
  const h = +hhmm.split(":")[0], w = weekday(iso);
  return h < 5 ? `am frühen ${w}morgen` : h < 10 ? `am ${w}morgen` : h < 12 ? `am ${w}vormittag` : h < 14 ? `am ${w}mittag` : h < 18 ? `am ${w}nachmittag` : h < 22 ? `am ${w}abend` : `am späten ${w}abend`;
}
function weekday(iso) { const [y, m, d] = iso.split("-").map(Number); return WTAGE[new Date(y, m - 1, d).getDay()]; }
const isLingen = name => S.stamm.eigene.includes(name);
const aaoByCode = code => S.stamm.aao.find(a => a.code === code);
const fahrzeugLang = kurz => (S.stamm.fahrzeuge.find(f => f.kurz.toLowerCase() === kurz.toLowerCase()) || {}).lang;
const kuerzelToMail = k => `${k.trim().toLowerCase()}@${MAIL_DOMAIN}`;
const mailToKuerzel = m => (m || "").split("@")[0].toUpperCase();
const allWehren = () => S.stamm.gruppen.flatMap(g => g.wehren.map(n => ({ name: n, gruppe: g.gruppe })));
async function copy(text) { try { await navigator.clipboard.writeText(text); toast("Text kopiert"); } catch { toast("Kopieren nicht möglich – bitte markieren und kopieren"); } }

const ICON = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  archiv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  collapse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  spark: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z"/></svg>'
};

/* ---------- Geräte-Sperre (PIN / Face ID) ---------- */
const lockKey = () => `pn_lock_${S.user?.uid}`;
const getLock = () => { try { return JSON.parse(localStorage.getItem(lockKey()) || "null"); } catch { return null; } };
const setLock = v => { try { v ? localStorage.setItem(lockKey(), JSON.stringify(v)) : localStorage.removeItem(lockKey()); } catch {} };
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function sha(text) { return b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))); }
async function bioAvailable() {
  try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}
async function bioRegister() {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: "PressNex" },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: S.profile.kuerzel, displayName: `PressNex ${S.profile.kuerzel}` },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
    timeout: 60000
  } });
  return b64(cred.rawId);
}
async function bioVerify(id) {
  await navigator.credentials.get({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    allowCredentials: [{ type: "public-key", id: unb64(id) }],
    userVerification: "required", timeout: 60000
  } });
}
window.addEventListener("pagehide", () => saveDraft());
let hiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = Date.now(); saveDraft(); }
  else if (hiddenAt && Date.now() - hiddenAt > LOCK_AFTER_MS && S.user && getLock() && !S.locked) { S.locked = true; S.pin = ""; render(); }
});

/* ---------- Auth ---------- */
window.__pnModule = true;
onAuthStateChanged(auth, async user => {
  window.__pnStarted = true;
  S.user = user; S.profile = null; S.berichte = null; S.admin.users = null;
  if (!user) { S.loading = false; render(); return; }
  S.loading = true; render();
  try {
    const ref = doc(db, "users", user.uid);
    let snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { kuerzel: mailToKuerzel(user.email), name: "", rolle: "sprecher", mustChangePw: true, erstellt: serverTimestamp() });
      snap = await getDoc(ref);
    }
    S.profile = snap.data();
    await loadConfig();
    await loadDraft();
    S.locked = !S.freshLogin && !!getLock();
    S.freshLogin = false;
  } catch (e) {
    console.error(e);
    S.error = "Profil konnte nicht geladen werden. Bitte später erneut versuchen. (" + (e.code || e.message) + ")";
  }
  S.loading = false; render();
});

async function loadConfig() {
  const [st, ki] = await Promise.all([getDoc(doc(db, "config", "stammdaten")), getDoc(doc(db, "config", "ki"))]);
  if (st.exists()) S.stamm = { ...structuredClone(DEFAULT_STAMM), ...st.data() };
  if (ki.exists()) S.ki = { ...DEFAULT_KI, ...ki.data() };
}

/* ---------- Entwurf automatisch sichern ---------- */
const draftKey = () => `pn_draft_${S.user?.uid}`;
function formLeer(f) { return !f.code && !f.ort.trim() && !f.adresse.trim() && !f.besonderheiten.trim() && !f.beteiligte.length; }
let draftTimer = null, lastDraft = "";
function saveDraft() {
  if (!S.user || !S.profile) return;
  const leer = formLeer(S.form) && !S.result;
  const data = leer ? null : { form: S.form, result: S.result, editId: S.editId, step: S.step, ts: Date.now() };
  const sig = JSON.stringify(data && { ...data, ts: 0 });
  if (sig === lastDraft) return;
  lastDraft = sig;
  try { data ? localStorage.setItem(draftKey(), JSON.stringify(data)) : localStorage.removeItem(draftKey()); } catch {}
  clearTimeout(draftTimer);
  draftTimer = setTimeout(async () => {
    try {
      if (data) await setDoc(doc(db, "entwuerfe", S.user.uid), { json: JSON.stringify(data), ts: data.ts });
      else await deleteDoc(doc(db, "entwuerfe", S.user.uid));
    } catch (e) { console.warn("Entwurf", e); }
  }, data ? 2500 : 0);
}
function clearDraft() { lastDraft = ""; S.form = newForm(); S.result = null; S.editId = null; S.step = 1; saveDraft(); }
async function loadDraft() {
  let best = null;
  try { const l = JSON.parse(localStorage.getItem(draftKey()) || "null"); if (l) best = l; } catch {}
  try {
    const r = await getDoc(doc(db, "entwuerfe", S.user.uid));
    if (r.exists()) { const d = JSON.parse(r.data().json); if (!best || d.ts > best.ts) best = d; }
  } catch (e) { console.warn("Entwurf laden", e); }
  if (best && best.form) {
    S.form = { ...newForm(), ...best.form }; S.result = best.result || null; S.editId = best.editId || null; S.step = best.step || 1;
    lastDraft = JSON.stringify({ ...best, ts: 0 });
    S.draftRestored = true;
  }
}

/* ---------- Render ---------- */
function render() {
  const el = $("#app");
  if (S.user && S.profile && !S.loading) saveDraft();
  if (S.draftRestored && S.user && S.profile && !S.locked && !S.profile.mustChangePw && getLock()) {
    S.draftRestored = false; S.view = "neu";
    setTimeout(() => toast(S.editId ? "Deine Bearbeitung wurde wiederhergestellt" : "Dein angefangener Bericht wurde wiederhergestellt"), 300);
  }
  if (S.loading) { el.innerHTML = `<div class="splash"><div class="logo-big">${LOGO}</div><p>PressNex wird geladen …</p></div>`; return; }
  if (!S.user) return renderLogin(el);
  if (!S.profile) { el.innerHTML = `<div class="auth"><div class="card"><div class="notice err">${esc(S.error || "Profil fehlt.")}</div><button class="btn" data-act="logout">Abmelden</button></div></div>`; return; }
  if (S.profile.mustChangePw) return renderPwChange(el);
  if (!getLock()) return renderLockSetup(el);
  if (S.locked) return renderLock(el);
  renderShell(el);
}

const LOGO = `<img class="logo-mark" src="icon-192.png" alt="" width="40" height="40">`;
function brand(dark) { return `<div class="brand ${dark ? "dark" : ""}">${LOGO}<div><span class="wordmark">Press<span>Nex</span></span><small>Berichte auf Knopfdruck</small></div></div>`; }

function renderLogin(el) {
  el.innerHTML = `<div class="auth"><form class="card" data-form="login" autocomplete="on">
    ${brand()}
    <h1>Anmelden</h1>
    ${S.error ? `<div class="notice err">${esc(S.error)}</div>` : ""}
    <label class="f">Kürzel<input type="text" name="kuerzel" autocomplete="username" autocapitalize="characters" required></label>
    <label class="f">Passwort<input type="password" name="pw" autocomplete="current-password" required></label>
    <button class="btn primary big block" type="submit">Anmelden</button>
    <p class="hint">Zugang nur für freigeschaltete Pressesprecher. Konten werden vom Administrator angelegt.</p>
  </form></div>`;
}

function renderPwChange(el) {
  el.innerHTML = `<div class="auth"><form class="card" data-form="pwfirst">
    ${brand()}
    <h1>Neues Passwort festlegen</h1>
    <p class="sub">Willkommen, ${esc(S.profile.kuerzel)}! Bitte ersetze dein Startpasswort durch ein eigenes.</p>
    ${S.error ? `<div class="notice err">${esc(S.error)}</div>` : ""}
    <label class="f">Neues Passwort (mind. 8 Zeichen)<input type="password" name="p1" autocomplete="new-password" minlength="8" required></label>
    <label class="f">Neues Passwort wiederholen<input type="password" name="p2" autocomplete="new-password" minlength="8" required></label>
    <button class="btn primary big block" type="submit">Passwort speichern</button>
    <button class="linkbtn" type="button" data-act="logout">Abmelden</button>
  </form></div>`;
}

async function renderLockSetup(el) {
  const bio = await bioAvailable();
  el.innerHTML = `<div class="auth"><form class="card" data-form="locksetup">
    ${brand()}
    <h1>App-Sperre einrichten</h1>
    <p class="sub">Damit niemand mit deinem entsperrten Gerät Berichte sieht, fragt PressNex beim Öffnen nach einer PIN${bio ? " oder Face ID / Touch ID" : ""}. Gilt nur für dieses Gerät.</p>
    ${S.error ? `<div class="notice err">${esc(S.error)}</div>` : ""}
    <label class="f">PIN (4–6 Ziffern)<input type="password" name="p1" inputmode="numeric" pattern="[0-9]{4,6}" autocomplete="off" required></label>
    <label class="f">PIN wiederholen<input type="password" name="p2" inputmode="numeric" pattern="[0-9]{4,6}" autocomplete="off" required></label>
    ${bio ? `<label class="check"><input type="checkbox" name="bio" checked> Zusätzlich mit Face ID / Touch ID entsperren</label>` : `<p class="hint">Face ID / Touch ID ist auf diesem Gerät bzw. in diesem Browser nicht verfügbar.</p>`}
    <button class="btn primary big block" type="submit">Sperre einrichten</button>
    <button class="linkbtn" type="button" data-act="logout">Abmelden</button>
  </form></div>`;
}

function renderLock(el) {
  const lock = getLock();
  const dots = Array.from({ length: 6 }, (_, i) => `<span class="${i < S.pin.length ? "on" : ""}"></span>`).join("");
  el.innerHTML = `<div class="auth"><div class="card" style="align-items:center;text-align:center">
    <div class="logo-big">${LOGO}</div>
    <h1>PressNex entsperren</h1>
    <p class="sub">${esc(S.profile.kuerzel)} · PIN eingeben</p>
    ${S.lockMsg ? `<div class="notice err">${esc(S.lockMsg)}</div>` : ""}
    <div class="pindots" aria-label="${S.pin.length} Ziffern eingegeben">${dots}</div>
    <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-act="pin" data-n="${n}">${n}</button>`).join("")}
      ${lock?.bioId ? `<button type="button" data-act="bio" aria-label="Mit Face ID entsperren" style="font-size:13px">Face&nbsp;ID</button>` : "<span></span>"}
      <button type="button" data-act="pin" data-n="0">0</button>
      <button type="button" data-act="pindel" aria-label="Löschen">⌫</button></div>
    <button class="btn primary block" data-act="pinok">Entsperren</button>
    <button class="linkbtn" data-act="logout">PIN vergessen? Abmelden</button>
  </div></div>`;
}

function renderShell(el) {
  const admin = S.profile.rolle === "admin";
  const nav = [["neu", "Neuer Bericht", ICON.plus], ["archiv", "Archiv", ICON.archiv], ["profil", "Profil", ICON.user]];
  if (admin) nav.push(["admin", "Verwaltung", ICON.admin]);
  const open = localStorage.getItem("pn_nav") === "1";
  el.innerHTML = `<div class="shell ${open ? "nav-open" : "nav-collapsed"}">
    <nav class="nav" aria-label="Hauptmenü">
      <button class="navtoggle" data-act="togglenav" aria-label="${open ? "Menü einklappen" : "Menü ausklappen"}" aria-expanded="${open}">${open ? ICON.collapse : ICON.menu}<span>Menü einklappen</span></button>
      <div class="navbrand">${brand(true)}</div>
      ${nav.map(([v, l, i]) => `<button data-act="nav" data-v="${v}" title="${l}" class="${S.view === v ? "active" : ""}" aria-current="${S.view === v ? "page" : "false"}">${i}<span>${l}</span></button>`).join("")}</nav>
    <div class="content-col">
      <header class="topbar"><div class="top-left"><div class="top-brand">${brand()}</div><div class="page-title">${esc(nav.find(n => n[0] === S.view)?.[1] || "")}</div></div><button class="avatar" data-act="nav" data-v="profil" aria-label="Profil">${esc(S.profile.kuerzel)}</button></header>
      <main class="main" id="main"></main>
    </div></div>${S.modal ? `<div class="modal" data-act="closemodal-bg"><div class="sheet" role="dialog" aria-modal="true">${S.modal}</div></div>` : ""}`;
  const main = $("#main");
  ({ neu: viewNeu, archiv: viewArchiv, profil: viewProfil, admin: viewAdmin }[S.view] || viewNeu)(main);
}

/* ---------- Ansicht: Neuer Bericht ---------- */
function stepCard(n, title, req, summary, body) {
  const open = S.step === n;
  const done = !!summary;
  return `<section class="card step-card ${open ? "open" : ""} ${done ? "done" : ""}">
    <button type="button" class="step-head" data-act="togglestep" data-n="${n}" aria-expanded="${open}">
      <span class="step-num">${done ? "✓" : n}</span>
      <span class="step-title"><b class="${req ? "req" : ""}">${title}</b><small>${summary ? esc(summary) : (req ? "Pflichtangabe" : "optional")}</small></span>
      <span class="step-chev" aria-hidden="true">›</span>
    </button>
    <div class="step-body">${body}</div>
  </section>`;
}
function viewNeu(main) {
  const f = S.form, d = ableiten(f);
  const st = aaoByCode(f.code);
  if (!S.step) S.step = 1;
  const leadNames = new Set(f.beteiligte.filter(b => b.lead).map(b => b.name));
  const quickLead = S.stamm.eigene.map(n => `<button type="button" class="chip ${leadNames.has(n) ? "on" : ""}" data-act="setlead" data-name="${esc(n)}">${esc(n.replace("Feuerwehr ", ""))}</button>`).join("");
  const present = new Set(f.beteiligte.map(b => b.name));
  const quickAdd = S.stamm.eigene.filter(n => !present.has(n)).map(n => `<button type="button" class="chip small ghost" data-act="addwehr" data-name="${esc(n)}">+ ${esc(n.replace("Feuerwehr ", ""))}</button>`).join("");
  const nPunkte = f.besonderheiten.split("\n").filter(l => l.trim()).length;

  const s1 = st ? `${st.code}${f.ort ? " · " + f.ort : ""} · ${deDate(f.datum)} ${f.uhrzeit}` : "";
  const s2 = d.lead ? d.lead.name + (d.eigen ? "" : " (auswärts)") : "";
  const andere = f.beteiligte.filter(b => !b.lead);
  const s3 = andere.length ? andere.map(b => b.name.replace("Feuerwehr ", "")).join(", ") : "";
  const s4 = nPunkte ? `${nPunkte} Stichpunkt${nPunkte > 1 ? "e" : ""}` : "";

  const body1 = `<div class="grid2">
      <label class="f"><span class="req">Datum</span><input type="date" data-bind="datum" value="${esc(f.datum)}"></label>
      <label class="f"><span class="req">Alarmzeit</span><input type="time" data-bind="uhrzeit" value="${esc(f.uhrzeit)}"></label>
    </div>
    <div class="f"><span class="flabel req">Einsatzstichwort (AAO)</span>
      <div class="picker" data-picker="aao">
        ${st ? `<div class="picked"><span class="tag red">${esc(st.code)}</span><span class="picked-txt">${esc(st.art)}</span><button type="button" class="linkbtn" data-act="clearcode">ändern</button></div>`
             : `<input type="search" placeholder="Suchen, z. B. H3Y, Verkehrsunfall, BMA" data-search="aao" autocomplete="off"><div class="picklist hidden"></div>`}
      </div>
    </div>
    <label class="f">Ort / Ortsteil <span class="hint inline">erscheint im Bericht</span><input type="text" data-bind="ort" value="${esc(f.ort)}" placeholder="z. B. Laxten"></label>
    <label class="f"><span>Einsatzadresse <span class="lock-note">🔒 nur intern</span></span><input type="text" data-bind="adresse" value="${esc(f.adresse)}" placeholder="Nie im Bericht, nie an die KI"></label>
    <button type="button" class="btn next" data-act="nextstep" data-n="2">Weiter</button>`;

  const body2 = `<div class="chips">${quickLead}</div>
    <div class="picker" data-picker="lead">
      <input type="search" placeholder="Auswärtige Feuerwehr suchen (z. B. Lohne)" data-search="lead" autocomplete="off"><div class="picklist hidden"></div>
    </div>
    ${d.lead ? `<p class="hint">${d.eigen ? "Einsatz im Stadtgebiet – " + esc(d.lead.name) + " führt." : "Unterstützungseinsatz bei der " + esc(d.lead.name) + "."}</p>` : ""}
    <button type="button" class="btn next" data-act="nextstep" data-n="3">Weiter</button>`;

  const body3 = `<p class="hint desk">Fahrzeuge antippen, die im Einsatz waren. Auch Rettungsdienst und Polizei lassen sich hinzufügen.</p>
    ${f.beteiligte.map((b, i) => wehrCard(b, i)).join("") || `<p class="hint">Zuerst die Hauptfeuerwehr wählen.</p>`}
    ${quickAdd ? `<div class="chips">${quickAdd}</div>` : ""}
    <div class="picker" data-picker="add">
      <input type="search" placeholder="Weitere Feuerwehr, Rettungsdienst, Polizei …" data-search="add" autocomplete="off"><div class="picklist hidden"></div>
    </div>
    ${d.anfo.length ? `<div class="notice info"><b>Anforderungen:</b> ${d.anfo.map(a => esc(a)).join(", ")}</div>` : ""}
    <button type="button" class="btn next" data-act="nextstep" data-n="4">Weiter</button>`;

  const body4 = `${bausteinPanel(f)}
    <textarea id="lage" data-bind="besonderheiten" rows="6" placeholder="Stichpunkte antippen oder selbst schreiben – die KI erfindet nichts dazu.">${esc(f.besonderheiten)}</textarea>
    <label class="check"><input type="checkbox" data-bind="ausschreiben" ${f.ausschreiben ? "checked" : ""}> Genaue Fahrzeugbezeichnungen (z. B. „HLF 20“)</label>`;

  main.innerHTML = `<div class="stack neu">
    ${S.editId ? `<div class="notice info row" style="justify-content:space-between;align-items:center"><span><b>Bericht bearbeiten</b></span><button class="btn" data-act="canceledit">Abbrechen</button></div>` : ""}
    <div class="cols">
      <div class="stack">
        ${stepCard(1, "Einsatz", true, s1, body1)}
        ${stepCard(2, "Hauptfeuerwehr", true, s2, body2)}
        ${stepCard(3, "Beteiligte Kräfte", false, s3, body3)}
      </div>
      <div class="stack">
        ${stepCard(4, "Lagebeschreibung", false, s4, body4)}
        <div class="genbar">
          ${S.error ? `<div class="notice err">${esc(S.error)}</div>` : ""}
          <button class="btn primary big block" data-act="generate" ${S.busy ? "disabled" : ""}>${S.busy ? `<span class="spinner"></span> KI schreibt …` : `${ICON.spark} Bericht mit KI erstellen`}</button>
          ${S.busy ? `<div class="kitimer" role="timer" aria-live="off"><span class="dot"></span><b id="kitimer">${fmtTimer()}</b><span class="hint" id="kihint">${esc(S.busyInfo || wartetext())}</span></div>` : ""}
        </div>
        ${S.result ? resultCard() : ""}
        <button class="linkbtn center" data-act="resetform">Formular leeren</button>
      </div>
    </div>
  </div>`;
  const bt = main.querySelector(".btabs"), bc = main.querySelector(".bchips");
  if (bt) {
    bt.scrollLeft = S.btabScroll || 0;
    if (S.btabCenter) {
      S.btabCenter = false;
      const bon = bt.querySelector(".btab.on");
      if (bon) { const r = bon.getBoundingClientRect(), rb = bt.getBoundingClientRect(); bt.scrollLeft += (r.left - rb.left) - (rb.width - r.width) / 2; }
    }
    bt.addEventListener("scroll", () => { S.btabScroll = bt.scrollLeft; }, { passive: true });
    S.btabScroll = bt.scrollLeft;
  }
  if (bc) { bc.scrollTop = S.bchipScroll || 0; bc.addEventListener("scroll", () => { S.bchipScroll = bc.scrollTop; }, { passive: true }); }
  if (S.result && S.scrollResult) { S.scrollResult = false; $("#result")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
}

function autoTab(f) {
  const st = aaoByCode(f.code); if (!st) return "Was brennt";
  if (/X/.test(st.block) || /gefahr|gas/i.test(st.klartext)) return "Gefahrgut";
  if (/BMA|RWM|Erkundung|Nachschau/i.test(st.code)) return "Lage";
  if (st.art === "Brand") return "Was brennt";
  if (st.art === "MANV") return "Personen";
  if (st.art === "Hilfeleistung") return "Technische Hilfe";
  return "Lage";
}
function bausteinPanel(f) {
  const tabs = S.stamm.bausteine || DEFAULT_STAMM.bausteine || [];
  if (!tabs.length) return "";
  const cur = tabs.find(t => t.reiter === (S.btab || autoTab(f))) || tabs[0];
  const used = f.besonderheiten.toLowerCase();
  return `<div class="btabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" aria-selected="${t === cur}" class="btab ${t === cur ? "on" : ""}" data-act="btab" data-v="${esc(t.reiter)}">${esc(t.reiter)}</button>`).join("")}</div>
    <div class="bchips">${cur.punkte.map(p => {
      if (p.startsWith("## ")) return `<div class="bgroup">${esc(p.slice(3))}</div>`;
      const txt = (cur.prefix || "") + p.replace(/[\[\]]/g, ""); const on = used.includes(txt.toLowerCase());
      return `<button type="button" class="chip small ${on ? "on" : ""}" data-act="baustein" data-v="${esc(txt)}">${on ? "✓ " : ""}${esc(p.replace(/[\[\]]/g, ""))}</button>`; }).join("")}</div>`;
}
function wehrCard(b, i) {
  const own = S.stamm.eigeneFahrzeuge[b.name] || [];
  const extra = b.fz.filter(v => !own.includes(v));
  const chips = [...own, ...extra].map(v => `<button type="button" class="chip small ${b.fz.includes(v) ? "on" : ""}" data-act="togglefz" data-i="${i}" data-v="${esc(v)}">${b.fz.includes(v) ? "✓ " : ""}${esc(v)}</button>`).join("");
  const opts = S.stamm.fahrzeuge.filter(f => !own.includes(f.kurz) && !b.fz.includes(f.kurz)).map(f => `<option value="${esc(f.kurz)}">${esc(f.kurz)} – ${esc(f.lang)}</option>`).join("");
  return `<div class="wehr ${b.lead ? "lead" : ""}">
    <div class="wehr-head"><div><b>${esc(b.name)}</b> ${b.lead ? `<span class="tag red">führt</span>` : `<span class="tag soft">${/feuerwehr/i.test(b.name) ? "unterstützt" : "vor Ort"}</span>`}</div>
      <button type="button" class="iconbtn" data-act="removewehr" data-i="${i}" aria-label="${esc(b.name)} entfernen">${ICON.x}</button></div>
    ${chips ? `<div class="chips">${chips}</div>` : ""}
    <select data-act-change="addfz" data-i="${i}" aria-label="Fahrzeug hinzufügen"><option value="">+ Fahrzeug hinzufügen …</option>${opts}<option value="__frei">Anderes Fahrzeug eingeben …</option></select>
  </div>`;
}

function wartetext() {
  const sec = (Date.now() - (S.busyStart || Date.now())) / 1000;
  return sec < 8 ? "Hab einen Moment Geduld, ich arbeite dran …"
    : sec < 18 ? "Ich sortiere die Stichpunkte …"
    : sec < 30 ? "Ich formuliere den Bericht …"
    : sec < 45 ? "Gleich fertig, nur noch der Feinschliff …"
    : "Dauert heute etwas länger – ich bleibe dran …";
}
function fmtTimer() {
  const ms = Date.now() - (S.busyStart || Date.now()), sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")},${Math.floor((ms % 1000) / 100)}`;
}
function counter(t) { const n = [...t].length; return `<b style="color:${n > 2200 ? "var(--red)" : n > 2000 ? "var(--warn)" : "var(--ok)"}">${n.toLocaleString("de-DE")} / 2.200 Zeichen</b> (Instagram-Grenze)${n > 2200 ? " – bitte kürzen" : ""}`; }
function resultCard() {
  return `<section class="card result-card" id="result">
    <div class="row" style="justify-content:space-between;align-items:center"><h2>Vorschau Social-Media-Bericht</h2><span class="tag ok">Entwurf</span></div>
    <p class="hint">Von der KI erstellt – bitte prüfen und bei Bedarf direkt hier ändern.</p>
    <textarea class="big" data-bind-result="text">${esc(S.result.text)}</textarea>
    <p class="hint" id="cc">${counter(S.result.text)}</p>
    <div class="row">
      <button class="btn" data-act="copyresult">Text kopieren</button>
      <button class="btn" data-act="generate" ${S.busy ? "disabled" : ""}>Neu formulieren</button>
      <button class="btn dark" data-act="save" ${S.busy ? "disabled" : ""}>${S.editId ? "Änderungen speichern" : "Im Archiv speichern"}</button>
    </div>
  </section>`;
}

/* ---------- Logik Formular ---------- */
function anfoCode(v) {
  const u = v.toUpperCase().replace(/\s/g, "");
  if (u.startsWith("HLF")) return "Anfo_HLF";
  if (u.startsWith("TROTLF")) return "Anfo_TroTLF";
  if (u.startsWith("TLF")) return "Anfo_TLF";
  if (u.startsWith("GW-G") || u.startsWith("GW/G")) return "Anfo_GWG";
  if (u.startsWith("DLK") || u.startsWith("DL") || u.startsWith("HAB") || u.startsWith("HRB")) return "Anfo_DL";
  if (u.startsWith("RW")) return "Anfo_RW";
  if (u.startsWith("ELW")) return "Anfo_IuK oder ELW";
  if (u.startsWith("MZB") || u.startsWith("RTB")) return "Anfo_Boot";
  if (u.startsWith("DEKON")) return "Anfo_Dekon";
  if (u.startsWith("GW-MESS") || u.startsWith("GW/MESS")) return "Anfo_Messen";
  return null;
}
function ableiten(f) {
  const lead = f.beteiligte.find(b => b.lead) || null;
  const eigen = !!lead && isLingen(lead.name);
  const anfo = [];
  // Lingener Ortsfeuerwehren, die nicht führen, aber mit Fahrzeugen dabei sind, wurden angefordert (auch innerhalb Lingens, z. B. Lingen für Brögbern)
  if (lead) for (const b of f.beteiligte) if (!b.lead && isLingen(b.name)) for (const v of b.fz) { const c = anfoCode(v); if (c && !anfo.includes(c)) anfo.push(c); }
  return { lead, eigen, anfo };
}
function validate(f) {
  const d = ableiten(f), e = [];
  if (!f.datum) e.push("Datum fehlt.");
  if (!f.uhrzeit) e.push("Alarmzeit fehlt.");
  if (!f.code) e.push("Bitte ein Einsatzstichwort auswählen.");
  if (!d.lead) e.push("Bitte die Hauptfeuerwehr auswählen.");
  if (!f.beteiligte.some(b => isLingen(b.name))) e.push("Mindestens eine Lingener Ortsfeuerwehr muss beteiligt sein.");
  return e;
}
function setLead(name) {
  const f = S.form;
  f.beteiligte = f.beteiligte.filter(b => !(b.lead && b.name !== name && !b.fz.length && !isLingen(b.name))); // leere fremde Hauptwehr entfernen
  f.beteiligte.forEach(b => { b.lead = false; });
  let e = f.beteiligte.find(b => b.name === name);
  if (!e) { e = { name, fz: [], lead: true }; f.beteiligte.unshift(e); }
  else { e.lead = true; f.beteiligte = [e, ...f.beteiligte.filter(b => b !== e)]; }
}
function fzAllgemein(v) {
  const u = v.toUpperCase().replace(/\s/g, "");
  if (u.startsWith("RTHCHRISTOPH")) return "Rettungshubschrauber " + v.replace(/^RTH\s*/i, "");
  const map = [[/^(HLF|LF|TLF|TROTLF|STLF|MLF|TSF|SLF)/, "Löschfahrzeug"], [/^(DLK|DL)/, "Drehleiter"], [/^(HAB|HRB)/, "Hubrettungsfahrzeug"],
    [/^RW/, "Rüstwagen"], [/^ELW/, "Einsatzleitwagen"], [/^KDOW/, "Kommandowagen"], [/^MTW/, "Mannschaftstransportwagen"], [/^MZF/, "Mehrzweckfahrzeug"],
    [/^GW-?G$|^GW\/G/, "Gefahrgutfahrzeug"], [/^GW-?L/, "Logistikfahrzeug"], [/^GW-?MESS/, "Messfahrzeug"], [/^GW-?W/, "Gerätewagen Wasserrettung"],
    [/^(MZB|RTB)/, "Boot"], [/^SW/, "Schlauchwagen"], [/^WLF/, "Wechselladerfahrzeug"], [/^DEKON/, "Dekontaminationsfahrzeug"],
    [/^RTW/, "Rettungswagen"], [/^NEF/, "Notarzteinsatzfahrzeug"], [/^KTW/, "Krankentransportwagen"], [/^RTH/, "Rettungshubschrauber"], [/^STREIFEN/, "Streifenwagen"]];
  for (const [re, t] of map) if (re.test(u)) return t;
  return fahrzeugLang(v) || v;
}
function fzGruppe(list, genau) {
  if (genau) return list.join(", ");
  const c = {}; for (const v of list) { const t = fzAllgemein(v); c[t] = (c[t] || 0) + 1; }
  const zahl = ["", "einem", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn"];
  const plural = t => t.replace(/fahrzeug$/, "fahrzeugen").replace(/wagen$/, "wagen").replace(/leiter$/, "leitern").replace(/hubschrauber$/, "hubschraubern").replace(/Boot$/, "Booten");
  const teile = Object.entries(c).map(([t, n]) => n === 1 ? `einem ${t}`.replace(/^einem (Drehleiter)$/, "einer $1") : `${zahl[n] || n} ${plural(t)}`);
  return teile.length > 1 ? teile.slice(0, -1).join(", ") + " und " + teile.at(-1) : teile[0];
}
function fzText(v, aus) { return aus ? v : fzAllgemein(v); }

function buildPrompt(f) {
  const d = ableiten(f), st = aaoByCode(f.code);
  const lines = [];
  lines.push("EINSATZDATEN");
  lines.push(`- Datum: ${weekday(f.datum)}, ${deDate(f.datum)}`);
  lines.push(`- Alarmierung: ${f.uhrzeit} Uhr, also ${tagesPhrase(f.datum, f.uhrzeit)}`);
  lines.push(`- AAO-Einsatzstichwort: ${f.code}`);
  const kt = f.klartext || st?.klartext || f.code;
  if (/gemeldete lage best[äa]tigte sich/i.test(f.besonderheiten))
    lines.push(`- Gemeldete Lage laut Alarmierung: ${kt}. Sie hat sich bestätigt – deshalb direkt danach in einem eigenen Satz konkret beschreiben, was vorgefunden wurde (z. B. bei „Person im Wasser“: „Eine Person befand sich im Wasser.“). Enthält die Angabe ein „/“, nur den Teil nennen, der durch die Lagebeschreibung belegt ist, sonst allgemein bleiben – niemals „beziehungsweise“.`);
  else
    lines.push(`- Alarmstichwort im Klartext: ${kt} (nur zur Einordnung – beschreibt nicht sicher, was tatsächlich vorgefunden wurde; nicht mit „beziehungsweise“ übernehmen)`);
  lines.push(`- Einsatzart: ${st?.art || "unbekannt"}`);
  lines.push(f.ort.trim() ? `- Einsatzort (nur diesen Ort nennen): ${f.ort.trim()}` : "- Einsatzort: nicht angegeben – keinen Ort nennen");
  lines.push(`- Einsatzführende Feuerwehr: ${d.lead.name}`);
  const angefordert = f.beteiligte.filter(b => !b.lead && isLingen(b.name) && b.fz.length).map(b => b.name);
  lines.push(d.eigen
    ? `- Perspektive: Einsatz der ${d.lead.name} (Ortsfeuerwehr der Freiwilligen Feuerwehr Lingen).` + (angefordert.length ? ` ${angefordert.join(" und ")} kam(en) zur Unterstützung dazu.` : "")
    : `- Perspektive: Unterstützungseinsatz außerhalb Lingens. Kräfte der Feuerwehr Lingen wurden zur Unterstützung der ${d.lead.name} alarmiert. Aus Sicht der Lingener Kräfte schreiben.`);
  lines.push("- Beteiligte Kräfte:");
  let gesamt = 0;
  for (const b of f.beteiligte) {
    const istFw = /feuerwehr/i.test(b.name);
    const rolle = b.lead ? "einsatzführend" : !istFw ? "ebenfalls vor Ort, keine Feuerwehr" : (isLingen(b.name) && b.fz.length ? "unterstützend, angefordert" : "unterstützend");
    gesamt += b.fz.length;
    let fz;
    if (b.lead) fz = "Fahrzeuge NICHT nennen";
    else if (!b.fz.length) fz = "ohne Fahrzeugangabe";
    else fz = (f.ausschreiben ? "mit " : "mit ") + fzGruppe(b.fz, f.ausschreiben);
    lines.push(`  - ${b.name} (${rolle}): ${fz}`);
  }
  const wehren = f.beteiligte.filter(b => /feuerwehr/i.test(b.name)).length;
  if (gesamt >= 10 || wehren >= 4) lines.push(`- Insgesamt waren genau ${gesamt} Fahrzeuge im Einsatz (darf so genannt werden, ohne "rund").`);
  if (d.anfo.length) lines.push(`- Anforderung laut AAO: ${d.anfo.join(", ")}`);
  if (f.besonderheiten.trim()) lines.push(`- Lagebeschreibung (Stichpunkte in dieser Reihenfolge, als flüssigen Fließtext formulieren, nicht wörtlich übernehmen):\n${f.besonderheiten.trim()}`);
  lines.push(f.ausschreiben
    ? "- Fahrzeugschreibweise: genaue Bezeichnungen wie oben (z. B. „mit dem HLF 20“)."
    : "- Fahrzeugschreibweise: allgemeinverständlich wie oben (z. B. „mit einem Löschfahrzeug“, „mit zwei Löschfahrzeugen“, „mit der Drehleiter“). Keine Kürzel.");
  let p = `${S.ki.stil}\n\n${HARD_RULES}\n\n${lines.join("\n")}`;
  if ((S.ki.beispiele || "").trim()) p += `\n\nBEISPIELBERICHTE (nur für Stil und Aufbau, keine Inhalte übernehmen):\n${S.ki.beispiele.trim()}`;
  return p;
}

async function generate() {
  const errs = validate(S.form);
  if (errs.length) { S.error = errs.join(" "); render(); return; }
  S.error = ""; S.busy = true; S.busyStart = Date.now(); render();
  clearInterval(S.timerId);
  S.timerId = setInterval(() => {
    const el = $("#kitimer"); if (el) el.textContent = fmtTimer();
    const h = $("#kihint"); if (h && !S.busyInfo) h.textContent = wartetext();
  }, 200);
  const prompt = buildPrompt(S.form);
  const models = [S.ki.modell, "gemini-3.5-flash-lite", "gemini-3.8-flash"].filter((m, i, a) => m && a.indexOf(m) === i);
  let text = "", lastErr = null;
  for (const m of models) {
    try {
      S.busyInfo = m === models[0] ? "" : "Zweiter Anlauf, gleich geschafft …"; render();
      const model = getGenerativeModel(ai, { model: m, generationConfig: { temperature: 0.6, maxOutputTokens: 2048 } }, { timeout: 45000 });
      const r = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, rej) => setTimeout(() => rej(new Error("Zeitüberschreitung – die KI hat nicht innerhalb von 50 Sekunden geantwortet.")), 50000))
      ]);
      text = (r.response.text() || "").trim();
      if (text) break;
    } catch (e) { lastErr = e; console.warn("KI", m, e); if (/quota|429|app.?check|403/i.test(String(e?.message))) break; }
  }
  S.busy = false; S.busyInfo = ""; clearInterval(S.timerId);
  const dauer = ((Date.now() - S.busyStart) / 1000).toFixed(1).replace(".", ",");
  if (!text) {
    const msg = String(lastErr?.message || "");
    S.error = /quota|429|exhausted/i.test(msg) ? "Das kostenlose KI-Kontingent ist für heute aufgebraucht. Bitte später erneut versuchen."
      : /app.?check|attest|recaptcha|403/i.test(msg) ? "Die Sicherheitsprüfung (App Check) ist fehlgeschlagen. Seite neu laden und erneut versuchen."
      : "Die KI konnte keinen Bericht erstellen. Bitte erneut versuchen." + (msg ? ` (${msg.slice(0, 400)})` : "");
    render(); return;
  }
  text = text.replace(/^```[a-z]*\n?|```$/g, "").trim();
  S.result = { text: `${text}\n\n/${S.profile.kuerzel.toLowerCase()}` };
  S.scrollResult = true;
  toast(`Bericht in ${dauer} Sekunden erstellt`);
  render();
}

async function saveReport() {
  const f = S.form, d = ableiten(f), st = aaoByCode(f.code);
  const [y, m] = f.datum.split("-").map(Number);
  S.busy = true; render();
  try {
    const daten = {
      datum: f.datum, uhrzeit: f.uhrzeit, ts: Date.parse(`${f.datum}T${f.uhrzeit}`), jahr: y, monat: m,
      code: f.code, klartext: f.klartext, art: st?.art || "", block: st?.block || "",
      ort: f.ort.trim(), adresseIntern: f.adresse.trim(), besonderheiten: f.besonderheiten.trim(),
      hauptfeuerwehr: d.lead.name, eigenerEinsatz: d.eigen, anforderungen: d.anfo,
      beteiligte: f.beteiligte.map(b => ({ name: b.name, fz: b.fz, lead: !!b.lead })),
      ausschreiben: f.ausschreiben, text: S.result.text,
      geaendert: serverTimestamp()
    };
    if (S.editId) await updateDoc(doc(db, "berichte", S.editId), daten);
    else await addDoc(collection(db, "berichte"), { ...daten, autorUid: S.user.uid, autorKuerzel: S.profile.kuerzel, erstellt: serverTimestamp() });
    toast(S.editId ? "Änderungen gespeichert" : "Bericht im Archiv gespeichert");
    const warEdit = !!S.editId;
    S.berichte = null; clearDraft();
    if (warEdit) S.view = "archiv";
  } catch (e) { console.error(e); S.error = "Speichern fehlgeschlagen: " + (e.code || e.message); }
  S.busy = false; render();
}

/* ---------- Ansicht: Archiv ---------- */
async function viewArchiv(main) {
  if (!S.berichte) {
    main.innerHTML = `<p class="sub">Berichte werden geladen …</p>`;
    try {
      const snap = await getDocs(query(collection(db, "berichte"), orderBy("ts", "desc")));
      S.berichte = snap.docs.map(x => ({ id: x.id, ...x.data() }));
    } catch (e) { main.innerHTML = `<div class="notice err">Archiv konnte nicht geladen werden (${esc(e.code || e.message)}).</div>`; return; }
    if (S.view !== "archiv") return;
  }
  const F = S.filter, all = S.berichte;
  const jahre = [...new Set(all.map(b => b.jahr))].sort((a, b) => b - a);
  const arten = [...new Set(all.map(b => b.art).filter(Boolean))].sort();
  const q = F.q.trim().toLowerCase();
  const list = all.filter(b =>
    (!F.jahr || String(b.jahr) === F.jahr) && (!F.monat || String(b.monat) === F.monat) && (!F.art || b.art === F.art) &&
    (!q || [b.text, b.code, b.klartext, b.ort, b.besonderheiten, b.hauptfeuerwehr, b.autorKuerzel, ...(b.beteiligte || []).map(x => x.name + " " + x.fz.join(" "))].join(" ").toLowerCase().includes(q)));
  let html = "", last = "";
  for (const b of list) {
    const key = `${MONATE[b.monat - 1]} ${b.jahr}`;
    if (key !== last) { html += `<div class="month">${key}</div>`; last = key; }
    const [, , dd] = b.datum.split("-");
    html += `<button class="item" data-act="openreport" data-id="${b.id}">
      <div class="day"><b>${dd}</b><small>${MONATE[b.monat - 1].slice(0, 3)}</small></div>
      <div class="t"><b>${esc(b.klartext || b.code)}</b><small>${esc(b.code)} · ${esc(b.hauptfeuerwehr)}${b.ort ? " · " + esc(b.ort) : ""}</small></div>
      <span class="tag">${esc(b.autorKuerzel)}</span></button>`;
  }
  main.innerHTML = `<div class="stack">
    <div><h1 class="page-head">Berichtsarchiv</h1><p class="sub">${all.length} Berichte aller Pressesprecher</p></div>
    <div class="card filters">
      <label class="f">Stichwortsuche<input type="search" data-filter="q" value="${esc(F.q)}" placeholder="z. B. Verkehrsunfall, Baccum, DLK"></label>
      <label class="f">Jahr<select data-filter="jahr"><option value="">Alle</option>${jahre.map(j => `<option ${String(j) === F.jahr ? "selected" : ""}>${j}</option>`).join("")}</select></label>
      <label class="f">Monat<select data-filter="monat"><option value="">Alle</option>${MONATE.map((m, i) => `<option value="${i + 1}" ${String(i + 1) === F.monat ? "selected" : ""}>${m}</option>`).join("")}</select></label>
      <label class="f">Einsatzart<select data-filter="art"><option value="">Alle</option>${arten.map(a => `<option ${a === F.art ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></label>
    </div>
    <div id="arlist">${html || `<p class="sub">Keine Berichte gefunden.</p>`}</div>
  </div>`;
  const qi = main.querySelector('[data-filter="q"]');
  if (archivFocus) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); archivFocus = false; }
}
let archivFocus = false;

function openReport(id) {
  const b = S.berichte.find(x => x.id === id); if (!b) return;
  const canEdit = b.autorUid === S.user.uid || S.profile.rolle === "admin";
  S.modal = `<div class="row" style="justify-content:space-between;align-items:center"><h2>${esc(b.klartext || b.code)}</h2><button class="iconbtn" data-act="closemodal" aria-label="Schließen">${ICON.x}</button></div>
    <div class="meta"><span class="tag red">${esc(b.code)}</span><span class="tag">${deDate(b.datum)} · ${esc(b.uhrzeit)} Uhr</span>${b.ort ? `<span class="tag">${esc(b.ort)}</span>` : ""}<span class="tag">${b.eigenerEinsatz ? "Eigener Einsatz" : "Unterstützung"}</span></div>
    ${b.adresseIntern ? `<p class="hint"><span class="lock-note">🔒 intern</span> ${esc(b.adresseIntern)}</p>` : ""}
    <p class="hint"><b>Kräfte:</b> ${(b.beteiligte || []).map(x => esc(x.name) + (x.fz.length ? " (" + esc(x.fz.join(", ")) + ")" : "")).join("; ")}${b.anforderungen?.length ? `<br><b>Anforderungen:</b> ${esc(b.anforderungen.join(", "))}` : ""}</p>
    ${canEdit ? `<textarea class="big" id="edittext">${esc(b.text)}</textarea>` : `<div class="report">${esc(b.text)}</div>`}
    <div class="row">
      <button class="btn" data-act="copyreport" data-id="${b.id}">Text kopieren</button>
      ${canEdit ? `<button class="btn dark" data-act="updatereport" data-id="${b.id}">Text speichern</button>
        <button class="btn" data-act="editreport" data-id="${b.id}">Einsatzdaten bearbeiten</button>
        <button class="btn danger" data-act="deletereport" data-id="${b.id}">Löschen</button>` : ""}
    </div>`;
  render();
}

/* ---------- Ansicht: Profil ---------- */
async function viewProfil(main) {
  const lock = getLock(), bio = await bioAvailable();
  main.innerHTML = `<div class="stack" style="max-width:640px">
    <div><h1 class="page-head">Profil</h1><p class="sub">Kürzel ${esc(S.profile.kuerzel)} · ${S.profile.rolle === "admin" ? "Administrator" : "Pressesprecher"}</p></div>
    <form class="card" data-form="name"><h2>Name (optional)</h2>
      <input type="text" name="name" value="${esc(S.profile.name)}" placeholder="Wird nur intern angezeigt"><button class="btn" type="submit">Speichern</button></form>
    <form class="card" data-form="pwchange"><h2>Passwort ändern</h2>
      <label class="f">Aktuelles Passwort<input type="password" name="old" autocomplete="current-password" required></label>
      <label class="f">Neues Passwort (mind. 8 Zeichen)<input type="password" name="p1" autocomplete="new-password" minlength="8" required></label>
      <label class="f">Neues Passwort wiederholen<input type="password" name="p2" autocomplete="new-password" minlength="8" required></label>
      <button class="btn" type="submit">Passwort ändern</button></form>
    <section class="card"><h2>App-Sperre auf diesem Gerät</h2>
      <p class="hint">Aktiv: PIN${lock?.bioId ? " + Face ID / Touch ID" : ""}. Sperrt nach ${LOCK_AFTER_MS / 60000} Minuten im Hintergrund.</p>
      <div class="row"><button class="btn" data-act="resetlock">PIN neu festlegen</button>
      ${bio && !lock?.bioId ? `<button class="btn" data-act="addbio">Face ID / Touch ID aktivieren</button>` : ""}
      ${lock?.bioId ? `<button class="btn" data-act="removebio">Face ID / Touch ID entfernen</button>` : ""}
      <button class="btn" data-act="locknow">Jetzt sperren</button></div></section>
    <button class="btn danger" data-act="logout">Abmelden</button>
  </div>`;
}

/* ---------- Ansicht: Verwaltung ---------- */
async function viewAdmin(main) {
  if (S.profile.rolle !== "admin") { S.view = "neu"; return render(); }
  if (!S.admin.users) {
    try { S.admin.users = (await getDocs(collection(db, "users"))).docs.map(x => ({ uid: x.id, ...x.data() })); }
    catch (e) { S.admin.users = []; toast("Nutzerliste nicht ladbar"); }
    if (S.view !== "admin") return;
  }
  const st = S.stamm;
  main.innerHTML = `<div class="stack">
    <div><h1 class="page-head">Verwaltung</h1><p class="sub">Nur für Administratoren sichtbar.</p></div>
    <section class="card"><h2>Pressesprecher</h2>
      <p class="hint">Neue Kollegen legst du in der Firebase-Konsole an: Authentication → Nutzer hinzufügen → E-Mail <b>kürzel@${MAIL_DOMAIN}</b> + Startpasswort. Nach dem ersten Login erscheinen sie hier.</p>
      ${S.admin.users.map(u => `<div class="row" style="align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:10px">
        <div><b>${esc(u.kuerzel)}</b> <span class="hint">${esc(u.name || "")}${u.mustChangePw ? " · Startpasswort noch nicht geändert" : ""}</span></div>
        <select data-act-change="setrole" data-uid="${u.uid}" style="width:auto" ${u.uid === S.user.uid ? "disabled" : ""}><option value="sprecher" ${u.rolle !== "admin" ? "selected" : ""}>Pressesprecher</option><option value="admin" ${u.rolle === "admin" ? "selected" : ""}>Administrator</option></select></div>`).join("")}
    </section>
    <section class="card"><h2>KI-Schreibstil</h2>
      <label class="f">Regeln für die KI<textarea class="big" id="ki-stil">${esc(S.ki.stil)}</textarea></label>
      <label class="f">Beispielberichte (gute echte Berichte einfügen, durch Leerzeile getrennt)<textarea class="big" id="ki-beispiele">${esc(S.ki.beispiele)}</textarea></label>
      <label class="f">KI-Modell<input type="text" id="ki-modell" value="${esc(S.ki.modell)}"><span class="hint">Standard: gemini-3.8-flash. Nur ändern, wenn Google das Modell abschaltet (aktuelle Namen: firebase.google.com/docs/ai-logic/models).</span></label>
      <div class="row"><button class="btn dark" data-act="saveki">KI-Einstellungen speichern</button><button class="btn" data-act="resetki">Standard wiederherstellen</button></div>
    </section>
    <section class="card"><h2>Stammdaten</h2>
      <p class="hint">Format: JSON. Vorsichtig bearbeiten – Kommas und Anführungszeichen müssen stimmen.</p>
      <label class="f">Eigene Ortsfeuerwehren<textarea class="code" id="sd-eigene">${esc(JSON.stringify(st.eigene, null, 1))}</textarea></label>
      <label class="f">Fahrzeuge der eigenen Ortsfeuerwehren<textarea class="code" id="sd-eigeneFahrzeuge">${esc(JSON.stringify(st.eigeneFahrzeuge, null, 1))}</textarea></label>
      <label class="f">Feuerwehren (Gruppen)<textarea class="code" id="sd-gruppen">${esc(JSON.stringify(st.gruppen, null, 1))}</textarea></label>
      <label class="f">Fahrzeugliste (Kürzel + ausgeschrieben)<textarea class="code" id="sd-fahrzeuge">${esc(JSON.stringify(st.fahrzeuge, null, 1))}</textarea></label>
      <label class="f">AAO-Stichwörter<textarea class="code" id="sd-aao">${esc(JSON.stringify(st.aao, null, 1))}</textarea></label>
      <label class="f">Stichpunkte für die Lagebeschreibung (Reiter + Punkte; [eckige Klammern] = vom Nutzer anzupassen)<textarea class="code" id="sd-bausteine">${esc(JSON.stringify(st.bausteine || DEFAULT_STAMM.bausteine, null, 1))}</textarea></label>
      <div class="row"><button class="btn dark" data-act="savestamm">Stammdaten speichern</button><button class="btn" data-act="resetstamm">Standard wiederherstellen</button></div>
    </section>
    <section class="card"><h2>Sicherung</h2>
      <p class="hint">Lädt alle Berichte als Datei herunter (inkl. interner Adressen – sicher aufbewahren).</p>
      <button class="btn" data-act="export">Alle Berichte exportieren</button>
    </section>
  </div>`;
}

/* ---------- Picker (Suche) ---------- */
function pickerResults(kind, q) {
  q = q.trim().toLowerCase();
  if (kind === "aao") {
    const hits = S.stamm.aao.filter(a => !q || a.code.toLowerCase().replace(/_/g, " ").includes(q.replace(/_/g, " ")) || a.klartext.toLowerCase().includes(q)).slice(0, 60);
    let last = "", h = "";
    for (const a of hits) { if (a.art !== last) { h += `<div class="grp">${esc(a.art)}</div>`; last = a.art; } h += `<button type="button" data-act="pick" data-kind="aao" data-v="${esc(a.code)}">${esc(a.klartext)}<small>${esc(a.code)}</small></button>`; }
    return h || `<div class="grp">Kein Treffer</div>`;
  }
  const exclude = new Set(kind === "add" ? S.form.beteiligte.map(b => b.name) : []);
  const hits = allWehren().filter(w => !exclude.has(w.name) && (!q || w.name.toLowerCase().includes(q) || w.gruppe.toLowerCase().includes(q))).slice(0, 60);
  let last = "", h = "";
  for (const w of hits) { if (w.gruppe !== last) { h += `<div class="grp">${esc(w.gruppe)}</div>`; last = w.gruppe; } h += `<button type="button" data-act="pick" data-kind="${kind}" data-v="${esc(w.name)}">${esc(w.name)}</button>`; }
  if (q) h += `<div class="grp">Nicht in der Liste?</div><button type="button" data-act="pick" data-kind="${kind}" data-v="${esc(capitalizeWehr(q))}">„${esc(capitalizeWehr(q))}“ übernehmen</button>`;
  return h || `<div class="grp">Kein Treffer</div>`;
}
function capitalizeWehr(q) { const t = q.trim().replace(/\b\w/g, c => c.toUpperCase()); return /feuerwehr|polizei|rettung|thw|dlrg/i.test(t) ? t : "Feuerwehr " + t; }

/* ---------- Ereignisse ---------- */
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.bind) { S.form[t.dataset.bind] = t.type === "checkbox" ? t.checked : t.value; saveDraft(); return; }
  if (t.dataset.bindResult && S.result) { S.result.text = t.value; const c = $("#cc"); if (c) c.innerHTML = counter(t.value); saveDraft(); return; }
  if (t.dataset.search) {
    const box = t.parentElement.querySelector(".picklist");
    box.innerHTML = pickerResults(t.dataset.search, t.value); box.classList.remove("hidden"); return;
  }
  if (t.dataset.filter === "q") { S.filter.q = t.value; archivFocus = true; viewArchiv($("#main")); }
});
document.addEventListener("focusin", e => {
  const t = e.target;
  if (t.dataset?.search) {
    const box = t.parentElement.querySelector(".picklist"); box.innerHTML = pickerResults(t.dataset.search, t.value); box.classList.remove("hidden");
    // Suchfeld nach oben holen, damit die Trefferliste über der Tastatur sichtbar ist
    setTimeout(() => t.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  }
});
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.dataset.bind && t.type === "checkbox") { S.form[t.dataset.bind] = t.checked; return; }
  if (t.dataset.filter && t.dataset.filter !== "q") { S.filter[t.dataset.filter] = t.value; viewArchiv($("#main")); return; }
  const act = t.dataset.actChange;
  if (act === "addfz") {
    let v = t.value; if (!v) return;
    if (v === "__frei") { v = (prompt("Fahrzeugbezeichnung, z. B. „LF 20 KatS“") || "").trim(); if (!v) { t.value = ""; return; } }
    const b = S.form.beteiligte[+t.dataset.i]; if (!b.fz.includes(v)) b.fz.push(v); render();
  }
  if (act === "setrole") {
    try { await updateDoc(doc(db, "users", t.dataset.uid), { rolle: t.value }); toast("Rolle gespeichert"); S.admin.users = null; }
    catch (err) { toast("Fehler: " + (err.code || err.message)); }
  }
});
document.addEventListener("click", e => {
  if (!e.target.closest(".picker")) document.querySelectorAll(".picklist").forEach(p => p.classList.add("hidden"));
});
document.addEventListener("submit", async e => {
  const form = e.target, kind = form.dataset.form; if (!kind) return;
  e.preventDefault();
  const v = Object.fromEntries(new FormData(form));
  S.error = "";
  try {
    if (kind === "login") {
      const k = (v.kuerzel || "").trim();
      if (!/^[a-z0-9]{1,20}$/i.test(k)) throw new Error("Kürzel bitte nur mit Buchstaben und Zahlen eingeben.");
      S.freshLogin = true;
      await signInWithEmailAndPassword(auth, kuerzelToMail(k), v.pw);
    }
    if (kind === "pwfirst") {
      if (v.p1 !== v.p2) throw new Error("Die Passwörter stimmen nicht überein.");
      await updatePassword(auth.currentUser, v.p1);
      await updateDoc(doc(db, "users", S.user.uid), { mustChangePw: false, updatedAt: serverTimestamp() });
      S.profile.mustChangePw = false; toast("Passwort gespeichert"); render();
    }
    if (kind === "locksetup") {
      if (!/^\d{4,6}$/.test(v.p1)) throw new Error("Die PIN muss aus 4 bis 6 Ziffern bestehen.");
      if (v.p1 !== v.p2) throw new Error("Die PINs stimmen nicht überein.");
      const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
      const lock = { salt, hash: await sha(salt + v.p1), bioId: null, fails: 0 };
      if (v.bio) { try { lock.bioId = await bioRegister(); } catch (err) { console.warn(err); toast("Face ID konnte nicht eingerichtet werden – PIN ist aktiv"); } }
      setLock(lock); S.locked = false; render();
    }
    if (kind === "name") { await updateDoc(doc(db, "users", S.user.uid), { name: v.name.trim(), updatedAt: serverTimestamp() }); S.profile.name = v.name.trim(); toast("Gespeichert"); }
    if (kind === "pwchange") {
      if (v.p1 !== v.p2) throw new Error("Die neuen Passwörter stimmen nicht überein.");
      await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, v.old));
      await updatePassword(auth.currentUser, v.p1); form.reset(); toast("Passwort geändert");
    }
  } catch (err) {
    S.freshLogin = false;
    const c = err.code || "";
    S.error = /invalid-credential|wrong-password|user-not-found|invalid-email/.test(c) ? "Kürzel oder Passwort ist falsch."
      : /too-many-requests/.test(c) ? "Zu viele Versuche. Bitte einige Minuten warten."
      : /weak-password/.test(c) ? "Das Passwort ist zu schwach (mind. 8 Zeichen)."
      : /requires-recent-login/.test(c) ? "Bitte ab- und wieder anmelden und erneut versuchen."
      : /network/.test(c) ? "Keine Internetverbindung."
      : err.message;
    if (kind === "name" || kind === "pwchange") toast(S.error); else render();
  }
});

const ACT = {
  togglenav: () => { try { localStorage.setItem("pn_nav", localStorage.getItem("pn_nav") === "1" ? "0" : "1"); } catch {} render(); },
  nav: t => { S.view = t.dataset.v; S.error = ""; S.modal = null; render(); window.scrollTo(0, 0); },
  logout: async () => { saveDraft(); setLock(null); S.modal = null; lastDraft = ""; S.form = newForm(); S.result = null; S.editId = null; await signOut(auth); },
  pin: t => { if (S.pin.length < 6) S.pin += t.dataset.n; S.lockMsg = ""; render(); },
  pindel: () => { S.pin = S.pin.slice(0, -1); render(); },
  pinok: async () => {
    const lock = getLock();
    if (await sha(lock.salt + S.pin) === lock.hash) { lock.fails = 0; setLock(lock); S.locked = false; S.pin = ""; render(); return; }
    lock.fails = (lock.fails || 0) + 1; setLock(lock); S.pin = "";
    if (lock.fails >= 5) { toast("Zu viele Fehlversuche – bitte neu anmelden"); return ACT.logout(); }
    S.lockMsg = `Falsche PIN (${5 - lock.fails} Versuche übrig).`; render();
  },
  bio: async () => { try { await bioVerify(getLock().bioId); S.locked = false; S.pin = ""; render(); } catch { S.lockMsg = "Face ID nicht erkannt – bitte PIN verwenden."; render(); } },
  locknow: () => { S.locked = true; S.pin = ""; render(); },
  resetlock: () => { if (confirm("Neue PIN festlegen?")) { setLock(null); render(); } },
  addbio: async () => { try { const l = getLock(); l.bioId = await bioRegister(); setLock(l); toast("Face ID / Touch ID aktiviert"); render(); } catch { toast("Einrichtung abgebrochen"); } },
  removebio: () => { const l = getLock(); l.bioId = null; setLock(l); render(); },
  pick: t => {
    const { kind, v } = t.dataset;
    if (kind === "aao") { const a = aaoByCode(v); S.form.code = v; S.form.klartext = a.klartext;
      if (a.art === "Anforderung" && !ableiten(S.form).lead) toast("Anforderung: Bitte die Hauptfeuerwehr wählen, die angefordert hat"); }
    if (kind === "lead") setLead(v);
    if (kind === "add" && !S.form.beteiligte.some(b => b.name === v)) S.form.beteiligte.push({ name: v, fz: [], lead: false });
    render();
  },
  clearcode: () => { S.form.code = ""; S.form.klartext = ""; render(); },
  setlead: t => { setLead(t.dataset.name); render(); },
  addwehr: t => { S.form.beteiligte.push({ name: t.dataset.name, fz: [], lead: false }); render(); },
  removewehr: t => { S.form.beteiligte.splice(+t.dataset.i, 1); render(); },
  togglefz: t => { const b = S.form.beteiligte[+t.dataset.i], v = t.dataset.v; b.fz = b.fz.includes(v) ? b.fz.filter(x => x !== v) : [...b.fz, v]; render(); },
  resetform: () => { if (confirm("Formular wirklich leeren?")) { clearDraft(); S.error = ""; S.btab = ""; render(); } },
  generate: () => generate(),
  copyresult: () => copy(S.result.text),
  save: () => saveReport(),
  openreport: t => openReport(t.dataset.id),
  closemodal: () => { S.modal = null; render(); },
  "closemodal-bg": (t, e) => { if (e.target === t) { S.modal = null; render(); } },
  copyreport: t => { const el = $("#edittext"); copy(el ? el.value : S.berichte.find(b => b.id === t.dataset.id).text); },
  updatereport: async t => {
    const text = $("#edittext").value;
    try { await updateDoc(doc(db, "berichte", t.dataset.id), { text, geaendert: serverTimestamp() }); S.berichte.find(b => b.id === t.dataset.id).text = text; toast("Gespeichert"); }
    catch (e) { toast("Fehler: " + (e.code || e.message)); }
  },
  editreport: t => {
    const b = S.berichte.find(x => x.id === t.dataset.id); if (!b) return;
    S.form = { datum: b.datum, uhrzeit: b.uhrzeit, code: b.code, klartext: b.klartext || "", ort: b.ort || "", adresse: b.adresseIntern || "",
      besonderheiten: b.besonderheiten || "", beteiligte: (b.beteiligte || []).map(x => ({ name: x.name, fz: [...(x.fz || [])], lead: !!x.lead })), ausschreiben: !!b.ausschreiben };
    S.result = { text: b.text || "" }; S.editId = b.id; S.modal = null; S.view = "neu"; S.error = ""; render(); window.scrollTo(0, 0);
  },
  togglestep: t => { const n = +t.dataset.n; S.step = S.step === n ? 0 : n; render(); },
  nextstep: t => { S.step = +t.dataset.n; render(); const el = document.querySelectorAll(".step-card")[S.step - 1]; el?.scrollIntoView({ behavior: "smooth", block: "start" }); },
  btab: t => { S.btab = t.dataset.v; S.btabCenter = true; S.bchipScroll = 0; render(); },
  baustein: t => {
    const f = S.form, v = t.dataset.v;
    const lines = f.besonderheiten.split("\n");
    const idx = lines.findIndex(l => l.replace(/^-\s*/, "").trim().toLowerCase() === v.toLowerCase());
    if (idx >= 0) { lines.splice(idx, 1); f.besonderheiten = lines.join("\n"); }
    else { const cur = f.besonderheiten.replace(/\s+$/, ""); f.besonderheiten = (cur ? cur + "\n" : "") + "- " + v; }
    const y = window.scrollY; render(); window.scrollTo(0, y);
    const ta = $("#lage"); if (ta) { ta.scrollTop = ta.scrollHeight; }
  },
  canceledit: () => { clearDraft(); S.error = ""; S.view = "archiv"; render(); },
  deletereport: async t => {
    if (!confirm("Diesen Bericht wirklich endgültig löschen? Das kann nicht rückgängig gemacht werden.")) return;
    try { await deleteDoc(doc(db, "berichte", t.dataset.id)); S.berichte = S.berichte.filter(b => b.id !== t.dataset.id); S.modal = null; toast("Gelöscht"); render(); }
    catch (e) { toast("Fehler: " + (e.code || e.message)); }
  },
  saveki: async () => {
    const ki = { stil: $("#ki-stil").value, beispiele: $("#ki-beispiele").value, modell: $("#ki-modell").value.trim() || DEFAULT_KI.modell };
    try { await setDoc(doc(db, "config", "ki"), ki); S.ki = ki; toast("KI-Einstellungen gespeichert"); } catch (e) { toast("Fehler: " + (e.code || e.message)); }
  },
  resetki: () => { if (confirm("KI-Einstellungen auf Standard zurücksetzen? (Erst nach „Speichern“ wirksam)")) { S.ki = { ...DEFAULT_KI }; render(); } },
  savestamm: async () => {
    try {
      const st = {};
      for (const k of ["eigene", "eigeneFahrzeuge", "gruppen", "fahrzeuge", "aao", "bausteine"]) st[k] = JSON.parse($("#sd-" + k).value);
      await setDoc(doc(db, "config", "stammdaten"), st); S.stamm = st; toast("Stammdaten gespeichert");
    } catch (e) { toast(e instanceof SyntaxError ? "Formatfehler im JSON – bitte prüfen" : "Fehler: " + (e.code || e.message)); }
  },
  resetstamm: () => { if (confirm("Stammdaten auf Standard zurücksetzen? (Erst nach „Speichern“ wirksam)")) { S.stamm = structuredClone(DEFAULT_STAMM); render(); } },
  export: async () => {
    try {
      const snap = await getDocs(query(collection(db, "berichte"), orderBy("ts", "desc")));
      const data = snap.docs.map(x => { const d = x.data(); for (const k of ["erstellt", "geaendert"]) if (d[k]?.toDate) d[k] = d[k].toDate().toISOString(); return { id: x.id, ...d }; });
      const blob = new Blob([JSON.stringify({ exportiert: new Date().toISOString(), berichte: data }, null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pressnex-sicherung-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { toast("Export fehlgeschlagen: " + (e.code || e.message)); }
  }
};
document.addEventListener("click", e => {
  const t = e.target.closest("[data-act]"); if (!t) return;
  const fn = ACT[t.dataset.act]; if (fn) { if (t.tagName === "BUTTON" && t.type !== "submit") e.preventDefault(); fn(t, e); }
});

render();
