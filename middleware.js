/**
 * Passerelle BUXIDA pour le site Aerobox — fichier unique à la racine (Vercel Routing Middleware).
 * Dialogue avec l'API partenaire BUXIDA côté serveur, pour que la clé reste secrète.
 *
 * Variable d'environnement dans Vercel (Settings → Environment Variables) :
 *   BUXIDA_API_KEY   clé « bxk_live_… » avec les droits catalog:read, reservation:write, contact:write
 *
 * Routes servies :
 *   GET  /api/buxida?action=dispo    → types de box publiés, prix TTC, box libres
 *   GET  /api/buxida?action=ping     → centre et droits de la clé
 *   POST /api/buxida {action:"booking", email, phone, typeId, volume, startDate, waitingList}
 *                                    → crée la demande de réservation BUXIDA, renvoie l'URL du tunnel
 *   POST /api/buxida {action:"contact", firstName, lastName, email, phone, message, typeId}
 *                                    → demande de contact dans les prospects du centre
 */

export const config = { matcher: "/api/buxida" };

const API = "https://api.buxida.com/v1";
let cache = { at: 0, body: null };
const MSG = { 401: "Clé API BUXIDA refusée.", 403: "La clé BUXIDA n'a pas le droit nécessaire.", 404: "Type de box inconnu.", 409: "Le centre n'a pas de module de réservation activé.", 429: "Trop de demandes, réessayez dans une minute." };

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

async function call(path, key, body) {
  const r = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(MSG[r.status] || data.message || `BUXIDA HTTP ${r.status}`);
  return data;
}

const num = (v) => (typeof v === "number" && Number.isFinite(v)) ? v : (parseFloat(String(v ?? "").replace(",", ".")) || null);

async function dispo(key) {
  if (Date.now() - cache.at < 60_000 && cache.body) return cache.body;
  const data = await call("/disponibilites", key);
  const items = (data.data || []).map((b) => ({
    id: String(b.id), title: b.name || "", m2: num(b.areaM2), m3: num(b.volumeM3), price: num(b.priceInclTax),
    dispo: parseInt(b.availableBoxes, 10) || 0, total: parseInt(b.totalBoxes, 10) || 0, memo: b.description || "", family: b.familyName || "",
  }));
  cache = { at: Date.now(), body: { ok: true, items } };
  return cache.body;
}

const okEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
const okPhone = (p) => String(p || "").replace(/\D/g, "").length >= 9;

async function booking(key, b) {
  if (!okEmail(b.email)) return json({ ok: false, error: "Adresse e-mail invalide." }, 400);
  if (!okPhone(b.phone)) return json({ ok: false, error: "Numéro de téléphone incomplet." }, 400);
  const payload = { email: String(b.email).trim(), phone: String(b.phone).trim(), waitingList: !!b.waitingList };
  if (b.typeId) payload.typeId = String(b.typeId);
  if (num(b.volume)) payload.volume = num(b.volume);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(b.startDate || ""))) payload.startDate = b.startDate;
  const r = await call("/demandes", key, payload);
  const d = r.data || {};
  cache = { at: 0, body: null }; // les disponibilités ont pu changer
  return json({ ok: true, url: d.url || null, waitingList: !!d.waitingList, emailSent: d.emailSent !== false });
}

async function contact(key, b) {
  if (!String(b.firstName || "").trim() || !String(b.lastName || "").trim()) return json({ ok: false, error: "Prénom et nom obligatoires." }, 400);
  if (!okEmail(b.email)) return json({ ok: false, error: "Adresse e-mail invalide." }, 400);
  if (!okPhone(b.phone)) return json({ ok: false, error: "Numéro de téléphone incomplet." }, 400);
  const payload = {
    firstName: String(b.firstName).trim().slice(0, 150), lastName: String(b.lastName).trim().slice(0, 150),
    email: String(b.email).trim(), phone: String(b.phone).trim().slice(0, 40),
    message: String(b.message || "Demande de rappel depuis le site").slice(0, 2000), consent: true,
  };
  if (b.typeId) payload.typeId = String(b.typeId);
  const r = await call("/contacts", key, payload);
  return json({ ok: true, id: r.data && r.data.id });
}

export default async function middleware(request) {
  const key = process.env.BUXIDA_API_KEY;
  if (!key) return json({ ok: false, error: "BUXIDA non configuré (variable BUXIDA_API_KEY manquante)." }, 503);
  try {
    if (request.method === "GET") {
      const action = new URL(request.url).searchParams.get("action");
      if (action === "dispo") return json(await dispo(key));
      if (action === "ping") { const p = await call("/ping", key); return json({ ok: true, center: p.center, scopes: p.scopes }); }
      return json({ ok: false, error: "Route inconnue." }, 404);
    }
    if (request.method === "POST") {
      let b = {}; try { b = await request.json(); } catch (_) {}
      if (b.action === "booking") return booking(key, b);
      if (b.action === "contact") return contact(key, b);
      return json({ ok: false, error: "Action inconnue." }, 400);
    }
    return json({ ok: false, error: "Méthode non autorisée." }, 405);
  } catch (e) {
    return json({ ok: false, error: e.message || "BUXIDA ne répond pas pour le moment." }, 502);
  }
}
