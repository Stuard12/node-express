#!/bin/bash
echo "🔄 Cargando variables de entorno manualmente"
export $(cat /etc/secrets/env | xargs)
node index.js
