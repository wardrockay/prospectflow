#!/bin/bash

echo "🔥 Nettoyage du cache de build Docker..."
docker builder prune -a -f

echo "🚀 Suppression des conteneurs arrêtés..."
docker container prune -f

echo "🖼️ Suppression des images inutilisées..."
docker image prune -a -f

echo "🗄️ Suppression des volumes inutilisés..."
docker volume prune -f

echo "✅ Nettoyage terminé !"
docker system df
df / -h
