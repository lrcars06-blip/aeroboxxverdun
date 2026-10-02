# Aerobox Verdun

Site vitrine : box de stockage en libre-service, 8 rue Jean Norton Cru, ZAC du Dragon, 55100 Verdun.
Site statique sans build. Dossier plat : tout est à la racine. Le fichier `middleware.js` relie le site au logiciel BUXIDA (il tourne sur Vercel uniquement, pas sur GitHub Pages).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Le site complet (HTML, CSS, JS) |
| `middleware.js` | Passerelle vers l'API partenaire BUXIDA (lecture seule) : répond à `/api/buxida` avec prix et disponibilités en direct |
| `mentions-legales.html` | Mentions légales (éditeur, hébergeur, médiation, propriété intellectuelle) |
| `confidentialite.html` | Politique de confidentialité RGPD et cookies |
| `404.html` | Page d'erreur (servie automatiquement par GitHub Pages et Vercel) |
| `cgv.html` | Conditions générales de location (projet à valider par Aerobox ; passages surlignés à compléter). URL demandée par Buxida pour l'acceptation dans le tunnel |
| `confirmation.html` | Page « Votre box est réservé », vers laquelle Buxida renvoie le client après le paiement de la caution (adresse de retour à donner à Buxida : `https://VOTRE-SITE/confirmation.html`). Non indexée. Bloc `CONFIRM` en bas du fichier : lien espace client, nom du paramètre de référence |
| `logo.svg` | Logo officiel vectorisé, version empilée (conteneur + AEROBOX + virgule) |
| `logo-horizontal.svg` | Logo officiel, version horizontale (en-tête) |
| `favicon.svg` | Icône d'onglet (conteneur du logo) |
| `og-image.png` | Image 1200 × 630 pour les partages Facebook / réseaux |
| `robots.txt` | Autorise l'indexation |
| `.nojekyll` | Désactive Jekyll sur GitHub Pages |
| `.gitignore` | Fichiers système exclus |

## Déploiement (Vercel)

1. New Project, importer le dépôt, Framework Preset « Other », Deploy.
2. Settings → Environment Variables, ajouter :

| Variable | Valeur |
|---|---|
| `BUXIDA_API_KEY` | clé « bxk_live_… » créée dans BUXIDA (Module de réservation → Accès API), avec les droits `catalog:read`, `reservation:write` et `contact:write`. Elle n'est affichée qu'une fois à la création. |

3. Deployments → « … » → Redeploy (les variables ne sont prises en compte qu'au déploiement suivant).

**Vérification :** `https://VOTRE-SITE/api/buxida?action=ping` doit renvoyer le nom du centre et `catalog:read` dans les scopes ; `?action=dispo` doit lister les types de box avec `price` et `dispo`.

## Comment fonctionne la liaison BUXIDA

Tout passe par `middleware.js`, qui parle à l'API partenaire BUXIDA (`api.buxida.com/v1`) côté serveur :
- `GET /disponibilites` : prix et box libres affichés en direct (badges, tableau, fiche). Rapprochement avec les 5 tailles du site par surface, tolérance 0,6 m² (BUXIDA : 5, 7, 9,5, 14, 14 double accès) ; les deux 14 m² sont départagés par le libellé puis le prix.
- `POST /demandes` : tous les boutons « Réserver » ouvrent une fenêtre (box, e-mail, portable, date facultative, acceptation des CGL). À l'envoi, la demande est créée chez BUXIDA, le client reçoit l'e-mail BUXIDA avec son lien, et il est redirigé vers le tunnel BUXIDA (`data.url`) : identité, assurance, caution. Box complet = liste d'attente.
- `POST /contacts` : le formulaire « Vous préférez être rappelé ? » crée une demande de contact dans les prospects du centre (alerte BUXIDA). Repli SMS si l'API ne répond pas.
- URL de fin de réservation à configurer chez BUXIDA : `https://VOTRE-SITE/confirmation.html`. URL des CGL : `https://VOTRE-SITE/cgv.html`.

Sans clé, le site fonctionne avec ses tarifs de départ et le formulaire en SMS.

## À faire avant mise en ligne

- [ ] `BUXIDA_API_KEY` avec les trois droits dans Vercel (tester `?action=ping` : les scopes doivent lister reservation:write et contact:write), puis une réservation de bout en bout
- [ ] Faire valider `cgv.html` par Aerobox et Buxida, compléter les passages surlignés
- [ ] Vérifier que les 5 types de box ont une surface renseignée dans BUXIDA (`areaM2`), sinon pas de badge pour ce type
- [ ] `CONFIG.endpoint` : recevoir les demandes de rappel par e-mail, tester la réception
- [ ] `CONFIG.destination` : coordonnées GPS exactes de la parcelle
- [ ] Confirmer avec le client la plage horaire de fermeture (le site dit « 22h/24 » sans préciser les 2 heures fermées)
- [ ] Une fois le domaine connu, ajouter dans `<head>` de `index.html` :
  `<link rel="canonical" href="https://DOMAINE/">`, `<meta property="og:url" content="https://DOMAINE/">`, `<meta property="og:image" content="https://DOMAINE/og-image.png">`, puis un `sitemap.xml`
- [ ] Si l'hébergeur final n'est pas Vercel, corriger la section « Hébergement » de `mentions-legales.html`
- [ ] Vercel plan Hobby : usage commercial interdit par les CGU. Prévoir le plan Pro pour un site client en production

## Données société utilisées (registre national des entreprises, consulté le 22/09/2026)

AEROBOX, SAS au capital de 1 000 € · SIREN 105 404 602 · SIRET siège 105 404 602 00010 · RCS Bar-le-Duc · immatriculée le 22/05/2026 · TVA FR26105404602 · APE 52.10B · siège 10 B avenue de Paris, 55100 Verdun · Président Charlie Bartak · Directrice générale Aurélie Bartak.
