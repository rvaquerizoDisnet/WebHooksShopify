const Shopify = require('shopify-api-node');
const sql = require('mssql');
const db = require('../utils/database');
const cron = require('node-cron');
const {obtenerConfiguracionesTiendas} = require('./api/api');

async function llamarStock(){
    const stores = await obtenerConfiguracionesTiendas();
    stores.forEach(store => {
        stock(store);
    });
}

async function stock(store) {
    try {
        const adminApiAccessToken = await getAdminApiAccessTokenFromDB(store);
        const apiKey = await getApiKeyFromDB(store);
        
        const shopify = new Shopify({
            shopName: `${store}.myshopify.com`,
            apiKey: apiKey,
            password: adminApiAccessToken,
            apiVersion: '2024-01',
        });

        async function getAllProductsAndVariants() {
            try {
              // Obtener todos los productos de Shopify con sus variantes
              const products = await shopify.product.list({ include: ['variants'] });
              return products;
            } catch (error) {
              console.error('Error al obtener productos y variantes de Shopify:', error);
              return null;
            }
          }
          
          // Función para actualizar el stock de una variante en Shopify
          async function updateShopifyStock(variantId, quantity) {
            try {
              // Actualizar el stock en Shopify
              await shopify.inventoryLevel.adjust({
                inventory_item_id: variantId,
                available_adjustment: quantity
              });
              console.log(`Stock actualizado para la variante con ID ${variantId}.`);
            } catch (error) {
              console.error(`Error al actualizar el stock para la variante con ID ${variantId}:`, error);
            }
          }
          
          // Función principal
          async function updateShopifyStockFromDatabase() {
            try {
              // Obtener todos los productos y variantes de Shopify
              const products = await getAllProductsAndVariants();
          
              // Iterar sobre cada producto y variante
              for (const product of products) {
                for (const variant of product.variants) {
                  // Obtener el stock del SKU de la base de datos
                  const pool = await sql.connect(dbConfig);
                  const result = await pool.request()
                    .input('sku', sql.VarChar, variant.sku)
                    .query('SELECT stock FROM Products WHERE sku = @sku');
                  const stock = result.recordset[0].stock;
          
                  // Actualizar el stock en Shopify
                  await updateShopifyStock(variant.id, stock);
                }
              }
            } catch (error) {
              console.error('Error al actualizar el stock desde la base de datos:', error);
            } finally {
              // Cerrar la conexión a la base de datos
              await sql.close();
            }
          }

        
        
    } catch (error) {
        console.error('Error al manejar la solicitud de la API de administración de Shopify:', error);

        let errorMessage = 'Error interno del servidor';

        if (error.response) {
            console.error('Detalles del error de respuesta:', error.response.data);
        }

        if (error.response && error.response.status === 401) {
            errorMessage = 'No autorizado. Clave de API o token de acceso no válidos.';
        }

        return res.status(500).json({ error: errorMessage });
    } finally {
        if (!res.headersSent) {
            console.log('Final Response:', { message: successMessage });
            res.json({ message: successMessage });
        }
    }
}


async function getAdminApiAccessTokenFromDB(store) {
    try {
      const pool = await db.connectToDatabase();
      const request = pool.request();
  
      const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
        .query('SELECT AccessToken FROM MiddlewareShopify WHERE NombreEndpoint = @NombreEndpoint');
      
      const { AccessToken } = result.recordset[0];
  
      //await db.closeDatabaseConnection(pool);
  
      if (!AccessToken) {
        console.log(`No se ha podido obtener el AccessToken para la tienda: ${store}`);
        throw new Error('No se ha podido obtener el AccessToken');
      }
  
      return AccessToken;
    } catch (error) {
      console.error('Error al obtener el AccessToken desde la base de datos:', error);
      throw error;
    }
  }


  async function getApiKeyFromDB(store) {
    try {
      const pool = await db.connectToDatabase();
      const request = pool.request();
  
      const result = await request.input('NombreEndpoint', mssql.NVarChar, store)
        .query('SELECT ApiKey FROM MiddlewareShopify WHERE NombreEndpoint = @NombreEndpoint');
      
      const { ApiKey } = result.recordset[0];
  
      //await db.closeDatabaseConnection(pool);
  
      if (!ApiKey) {
        console.log(`No se ha podido obtener la API Key para la tienda: ${store}`);
        throw new Error('No se ha podido obtener la API Key');
      }
  
      return ApiKey;
    } catch (error) {
      console.error('Error al obtener la API Key desde la base de datos:', error);
      throw error;
    }
  }
  

// Configuración de la conexión a la tienda de Shopify
const shopify = new Shopify({
  shopName: 'your-shop-name',
  apiKey: 'your-api-key',
  password: 'your-password'
});

// Función para obtener todos los productos y variantes de Shopify
async function getAllProductsAndVariants() {
  try {
    // Obtener todos los productos de Shopify con sus variantes
    const products = await shopify.product.list({ include: ['variants'] });
    return products;
  } catch (error) {
    console.error('Error al obtener productos y variantes de Shopify:', error);
    return null;
  }
}

// Función para actualizar el stock de una variante en Shopify
async function updateShopifyStock(variantId, quantity) {
  try {
    // Actualizar el stock en Shopify
    await shopify.inventoryLevel.adjust({
      inventory_item_id: variantId,
      available_adjustment: quantity
    });
    console.log(`Stock actualizado para la variante con ID ${variantId}.`);
  } catch (error) {
    console.error(`Error al actualizar el stock para la variante con ID ${variantId}:`, error);
  }
}

// Función principal
async function updateShopifyStockFromDatabase() {
  try {
    // Obtener todos los productos y variantes de Shopify
    const products = await getAllProductsAndVariants();

    // Iterar sobre cada producto y variante
    for (const product of products) {
      for (const variant of product.variants) {
        // Obtener el stock del SKU de la base de datos
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
          .input('sku', sql.VarChar, variant.sku)
          .query('SELECT stock FROM Products WHERE sku = @sku');
        const stock = result.recordset[0].stock;

        // Actualizar el stock en Shopify
        await updateShopifyStock(variant.id, stock);
      }
    }
  } catch (error) {
    console.error('Error al actualizar el stock desde la base de datos:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sql.close();
  }
}

// Ejecutar la función principal
updateShopifyStockFromDatabase();
