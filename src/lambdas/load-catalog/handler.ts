import Redis from 'ioredis';

const catalog = [
  { id: 1,  categoria: "Energia",   proveedor: "Empresa Electrica Nacional", servicio: "Luz Residencial", plan: "Basico",    precio_mensual: 45.00,  detalles: "150 kWh incluidos",            estado: "Activo" },
  { id: 2,  categoria: "Energia",   proveedor: "Empresa Electrica Nacional", servicio: "Luz Residencial", plan: "Premium",   precio_mensual: 75.00,  detalles: "300 kWh incluidos",            estado: "Activo" },
  { id: 3,  categoria: "Agua",      proveedor: "Acueducto Municipal",        servicio: "Agua Potable",    plan: "Estandar",  precio_mensual: 25.00,  detalles: "20 m3 incluidos",              estado: "Activo" },
  { id: 4,  categoria: "Internet",  proveedor: "Tigo",                       servicio: "Internet Hogar",  plan: "Basico",    precio_mensual: 89.90,  detalles: "100 Mbps",                     estado: "Activo" },
  { id: 5,  categoria: "Internet",  proveedor: "Tigo",                       servicio: "Internet Hogar",  plan: "Avanzado",  precio_mensual: 129.90, detalles: "200 Mbps",                     estado: "Activo" },
  { id: 6,  categoria: "Internet",  proveedor: "Movistar",                   servicio: "Fibra Optica",    plan: "Essential", precio_mensual: 79.90,  detalles: "120 Mbps",                     estado: "Activo" },
  { id: 7,  categoria: "Internet",  proveedor: "Movistar",                   servicio: "Fibra Optica",    plan: "Plus",      precio_mensual: 119.90, detalles: "250 Mbps",                     estado: "Activo" },
  { id: 8,  categoria: "Internet",  proveedor: "Claro",                      servicio: "Internet Hogar",  plan: "Basico",    precio_mensual: 85.00,  detalles: "100 Mbps",                     estado: "Activo" },
  { id: 9,  categoria: "Internet",  proveedor: "Claro",                      servicio: "Internet Hogar",  plan: "Full",      precio_mensual: 135.00, detalles: "300 Mbps",                     estado: "Activo" },
  { id: 10, categoria: "Telefonia", proveedor: "Tigo",                       servicio: "Pospago",         plan: "Control",   precio_mensual: 45.00,  detalles: "3 GB + Minutos ilimitados",    estado: "Activo" },
  { id: 11, categoria: "Telefonia", proveedor: "Tigo",                       servicio: "Pospago",         plan: "Max",       precio_mensual: 85.00,  detalles: "10 GB + Minutos ilimitados",   estado: "Activo" },
  { id: 12, categoria: "Telefonia", proveedor: "Movistar",                   servicio: "Pospago",         plan: "Basico",    precio_mensual: 40.00,  detalles: "2 GB + Minutos ilimitados",    estado: "Activo" },
  { id: 13, categoria: "Telefonia", proveedor: "Movistar",                   servicio: "Pospago",         plan: "Premium",   precio_mensual: 90.00,  detalles: "15 GB + Minutos ilimitados",   estado: "Activo" },
  { id: 14, categoria: "Telefonia", proveedor: "Claro",                      servicio: "Pospago",         plan: "Economico", precio_mensual: 35.00,  detalles: "1.5 GB + Minutos ilimitados",  estado: "Activo" },
  { id: 15, categoria: "Telefonia", proveedor: "Claro",                      servicio: "Pospago",         plan: "Total",     precio_mensual: 95.00,  detalles: "20 GB + Minutos ilimitados",   estado: "Activo" },
  { id: 16, categoria: "TV",        proveedor: "Tigo",                       servicio: "TV Digital",      plan: "Basico",    precio_mensual: 59.90,  detalles: "80 canales",                   estado: "Activo" },
  { id: 17, categoria: "TV",        proveedor: "Tigo",                       servicio: "TV Digital",      plan: "Ultra",     precio_mensual: 99.90,  detalles: "150 canales + HD",             estado: "Activo" },
  { id: 18, categoria: "TV",        proveedor: "Claro",                      servicio: "TV Cable",        plan: "Estandar",  precio_mensual: 65.00,  detalles: "100 canales",                  estado: "Activo" },
  { id: 19, categoria: "TV",        proveedor: "Claro",                      servicio: "TV Cable",        plan: "Premium",   precio_mensual: 110.00, detalles: "200 canales + HD",             estado: "Activo" },
  { id: 20, categoria: "Paquete",   proveedor: "Tigo",                       servicio: "Triple Play",     plan: "Hogar",     precio_mensual: 199.90, detalles: "Internet + TV + Telefono",     estado: "Activo" },
];

export const handler = async (): Promise<object> => {
  const redis = new Redis({
    host:           process.env.REDIS_HOST ?? 'localhost',
    port:           parseInt(process.env.REDIS_PORT ?? '6379'),
    connectTimeout: 10000,
  });

  try {
    await redis.set('catalog', JSON.stringify(catalog));
    console.log(`✅ Catalog loaded — ${catalog.length} services`);

    await redis.quit();

    return {
      statusCode: 200,
      message:    `Catalog loaded successfully with ${catalog.length} services`,
    };
  } catch (error) {
    console.error('Error loading catalog:', error);
    await redis.quit();
    throw error;
  }
};