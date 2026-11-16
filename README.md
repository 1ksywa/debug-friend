# DEBUG Friend !

Logiciel de diagnostic PC portable (Windows 10/11) de l'atelier **DEBUG**.
Il analyse le PC, explique les problèmes trouvés et comment les régler, et propose des tests guidés (clavier, écran, son, micro, webcam, USB, charge, chauffe).

## Télécharger
1. Va dans **Releases** (à droite sur cette page) et télécharge le dernier `DEBUG Friend x.y.z.zip`.
2. Clic droit sur le zip > Propriétés > coche **Débloquer** > OK, puis **Extraire tout**.
3. Ouvre le dossier et lance **`Lancer DEBUG Friend.cmd`** (réponds Oui aux droits administrateur).

Rien n'est installé sur le PC. Toutes les données (compte, analyses) restent dans le dossier `donnees`, chiffrées, et ne sont jamais envoyées sur Internet.

## Sécurité
- Le serveur local écoute uniquement sur 127.0.0.1, avec un jeton différent à chaque lancement.
- Les données sont chiffrées (AES-256-GCM, clé dérivée du mot de passe par PBKDF2-SHA-256) et l'accès demande un mot de passe + une appli à codes.
- La collecte est en lecture seule : le logiciel ne modifie le PC que si tu cliques toi-même sur une action.

## Licence
© EMPEREUR Arsène — Atelier DEBUG. Tous droits réservés.
Police Inter : licence SIL Open Font License (voir `app/web/polices/LICENCE-Inter.txt`).
