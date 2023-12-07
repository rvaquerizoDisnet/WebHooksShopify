# WebHooksShopify

Documentació API per Shopify Webhooks

Descripció General
Aquesta API està dissenyada per gestionar webhooks de Shopify. Es connecta amb una botiga Shopify per rebre i processar les ordres a través de webhooks. Aquesta documentació proporciona una visió detallada del codi i les instruccions per a la instal·lació.
Estructura de Carpeta
src/index.js
El fitxer principal que inicia el servidor i gestiona els webhooks.
src/api.js
Conté la lògica de l'API, inclosos els endpoints per a les sol·licituds GET i POST.
src/shopify.js
Gestiona la integració amb Shopify, verifica les signatures i envia dades a un servei web.
Inicialització del Projecte
Descarrega el Codi:
git clone https://github.com/rvaquerizoDisnet/WebHooksShopify.git
Instalació dependencies:
npm install

Insta·lació API
Verificació d'instal·lació de Node.js: 
Assegureu-vos que Node.js estigui instal·lat. En cas contrari instalar-lo.
Port:
3000 (el puc cambiar)
Iniciar l'Aplicació Node.js: 
Inicieu la vostra aplicació Node.js al servidor.

