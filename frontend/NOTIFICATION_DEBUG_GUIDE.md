# 🔍 Guide de Diagnostic - Notifications Manquantes

## Étape 1: Ouvrir la Console du Navigateur
1. Appuyez sur **F12** pour ouvrir DevTools
2. Allez à l'onglet **Console**
3. Actualisez la page (F5)

---

## Étape 2: Vérifier les Logs

Recherchez ces messages dans la console:

### ✅ Si vous voyez:
```
🔔 NavbarComponent: userId from authService: <some-id>
🔔 AlertService: Starting polling for userId: <some-id>
📡 Attempt 1: Fetching from http://localhost:8086/api/alerts/my with userId header: <some-id>
```

**C'est bon!** L'authentification et le polling démarrent.

---

### ⚠️ Si vous voyez:
```
⚠️ NavbarComponent: userId is empty or null!
⚠️ AlertService: userId is empty, cannot start polling
```

**Problème:** L'authentification n'a pas donné de userId  
**Solution:** Vérifiez que vous êtes bien loggué et que le token JWT est correct

---

## Étape 3: Vérifier la Réponse API

Dans la console, cherchez:

### ✅ Succès:
```
✅ Success with header method. Response: [{id: 5, title: "INFO: Aspirin expire...", ...}]
✅ ALERTS RECEIVED: 4 alerts [...]
📊 UNREAD COUNT: 3
🔔 NotificationBellComponent: alerts updated: [...]
```

### ❌ Erreur:
```
❌ All attempts failed: {
  error1: "Http failure response: 0 Unknown Error",
  error2: "Http failure response...",
  error3: "Http failure response..."
}
```

**Signifie:** L'API n'est pas accessible  
**Vérifiez:**
- [ ] Backend en fonctionnement sur `http://localhost:8086`
- [ ] Endpoint `/api/alerts` existe
- [ ] CORS activé

---

## Étape 4: Vérifier l'Onglet Network

1. Ouvrez **Network** dans DevTools
2. Actualisez la page
3. Cherchez les requêtes vers `http://localhost:8086/api/alerts`

### ✅ Si la requête existe:
- Cliquez dessus
- Allez à **Response**
- Vous devriez voir les alertes JSON

### ❌ Si la requête est rouge (erreur):
- Cliquez pour voir le statut HTTP
- 404 = endpoint n'existe pas
- 401 = non authentifié
- 500 = erreur serveur

---

## Étape 5: Tester l'API Manuellement

Ouvrez un terminal et testez:

```bash
# Remplacez YOUR_USER_ID par votre ID réel
curl -H "userId: YOUR_USER_ID" http://localhost:8086/api/alerts/my

# Ou essayez juste tous les alertes:
curl http://localhost:8086/api/alerts
```

---

## Informations à Collecter

Si ça ne fonctionne toujours pas, collectez:

1. **Console logs complets** (Clic droit → Save as...)
2. **Network tab screenshot** montrant la requête échouée
3. **Backend logs** montrant ce qui se passe
4. **Your userId** - obtenu via: 
   ```javascript
   // Dans la console:
   console.log(JSON.parse(localStorage.getItem('user_info')))
   ```

---

## Dépannage Rapide

| Problème | Cause Probable | Solution |
|----------|---|---|
| Rien dans la console | Composant pas chargé | Rafraîchir la page, vérifier si vous êtes loggué |
| `userId is null` | Pas authentifié | Connectez-vous d'abord |
| `404 Not Found` | API endpoint inexistant | Vérifier le backend URL |
| `Cors error` | Problème cross-origin | Ajouter CORS au backend |
| `200 OK` mais pas d'alertes | Pas d'alertes pour cet utilisateur | Créer une alerte de test |
| Badge avec `0` | API retourne vide | Vérifier les alertes dans la BD |

---

## Comment Créer une Alerte de Test

Dans phpMyAdmin ou directement en SQL:

```sql
INSERT INTO `alert` (`id`, `created_at`, `is_read`, `message`, `stock_id`, `pharmacist_id`) 
VALUES (
  NULL,
  NOW(),
  0,
  'TEST: This is a test notification for Bardo',
  24,
  '0xcefef67325d44f8da268a751397ee78'
);
```

Remplacez `pharmacist_id` par l'ID du pharmacien connecté.

---

## Console Commands pour Tester

Dans la console du navigateur:

```javascript
// Vérifier si le service est disponible
window.ng.probe(document.querySelector('app-notification-bell'))?.componentInstance

// Voir les observables
window.ng.probe(document.querySelector('app-notification-bell'))?.componentInstance.alerts$

// Forcer un refresh des alertes
// (D'abord récupérez une référence au service, c'est compliqué sans injection...)
```

---

## Prochaines Étapes

1. Ouvrez la console (F12)
2. Regardez les logs
3. Partagez les logs importants
4. On diagnostiquera ensemble! 🔍
