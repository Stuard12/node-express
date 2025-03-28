import fetch from 'node-fetch'; // si no lo tienes instalado: npm install node-fetch

const publicKey = 'AQUÍ_TU_PUBLIC_KEY'; // remplaza por tu llave pública de Recurrente
const secretKey = 'AQUÍ_TU_SECRET_KEY'; // remplaza por tu llave privada de Recurrente

const url = 'https://app.recurrente.com/api/webhook_endpoints/';

async function testAuth() {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-PUBLIC-KEY': publicKey,
                'X-SECRET-KEY': secretKey,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Error haciendo request:", error.message);
    }
}

testAuth();
