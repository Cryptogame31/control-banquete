// Datos semilla iniciales y funciones de carga para Control Banquete

export const seedProducts = {
  venues: [
    { id: "v_buenos_aires", name: "Buenos Aires", price: 2500000, category: "venue", description: "Clásico y elegante. Capacidad hasta 150 personas con acabados coloniales y gran iluminación." },
    { id: "v_prado_colonial", name: "Prado Colonial", price: 1800000, category: "venue", description: "Hermosa casona colonial con amplios jardines externos, ideal para recepciones de ensueño." },
    { id: "v_boston", name: "Boston", price: 2200000, category: "venue", description: "Salón moderno e industrial en zona central, perfecto para grados y cumpleaños corporativos." },
    { id: "v_finca_valencia", name: "Finca La Valencia", price: 3900000, category: "venue", description: "Espectacular finca campestre en Lomas Los Álvares con piscina, amplias zonas verdes y kiosko." },
    { id: "v_finca_duquesa", name: "Finca La Duquesa", price: 5500000, category: "venue", description: "Mansión campestre de lujo con capacidad para grandes banquetes y capilla privada." }
  ],
  photography: [
    { id: "p_basico", name: "Fotografía Básica", price: 590000, category: "photography", description: "Cubrimiento de ceremonia, 50 fotos digitales editadas en alta resolución." },
    { id: "p_intermedio", name: "Fotografía Intermedia", price: 695000, category: "photography", description: "Cubrimiento de ceremonia y recepción. 100 fotos editadas + mini-sesión de novios en salón." },
    { id: "p_full", name: "Fotografía Full", price: 850000, category: "photography", description: "Paquete completo. Pre-boda, ceremonia y recepción. Fotografías digitales ilimitadas + álbum impreso de lujo y video corto destacado." }
  ],
  decoration: [
    { id: "d_basica", name: "Decoración Básica", price: 400000, category: "decoration", description: "Decoración floral sencilla para mesas principales y mantelería clásica." },
    { id: "d_estandar", name: "Decoración Estándar", price: 600000, category: "decoration", description: "Centros de mesa medianos, iluminación de ambiente y decoración de bienvenida." },
    { id: "d_premium", name: "Decoración Premium", price: 1000000, category: "decoration", description: "Montajes florales extravagantes, backing temático para fotos, iluminación LED decorativa y menaje de lujo." }
  ],
  services: {
    boda: [
      { id: "s_b_granizado", name: "Granizado 100 porciones", price: 390000, category: "service", description: "Barra ilimitada de deliciosos granizados frutales con y sin alcohol." },
      { id: "s_b_plataforma", name: "Plataforma 360", price: 600000, category: "service", description: "Videos giratorios en cámara lenta con descarga inmediata por código QR." },
      { id: "s_b_protocolo", name: "Protocolo Novios", price: 180000, category: "service", description: "Coordinación y maestro de ceremonias para el brindis y momentos clave." },
      { id: "s_b_iglesia", name: "Decoracion de Iglesia", price: 450000, category: "service", description: "Arreglos florales y alfombra roja para el altar y pasillo de la iglesia." },
      { id: "s_b_yugo", name: "Yugo y gallardete", price: 100000, category: "service", description: "Bouquet premium de novia y boutonnière a juego para el novio." },
      { id: "s_b_video", name: "Proyección video", price: 180000, category: "service", description: "Pantalla gigante y videoproyector HD para clip de fotos de los novios." },
      { id: "s_b_dulces", name: "Mesa de dulces", price: 170000, category: "service", description: "Cascada de chocolate y variedad de postres miniatura personalizados." },
      { id: "s_b_papayera", name: "Papayera", price: 390000, category: "service", description: "Show musical folclórico en vivo para encender la hora loca (45 mins)." },
      { id: "s_b_mariachis", name: "Mariachis", price: 500000, category: "service", description: "Show de música mexicana con 8 músicos uniformados de gala (45 mins)." },
      { id: "s_b_aguardiente", name: "Garrafa aguardiente", price: 120000, category: "service", description: "Licor nacional para mesas con mezcladores incluidos." },
      { id: "s_b_ron", name: "Garrafa ron", price: 140000, category: "service", description: "Ron premium de 5 años con hielo y refrescos." },
      { id: "s_b_pilsen", name: "Caja Pilsen/Águila", price: 90000, category: "service", description: "Cerveza nacional fría (30 botellas)." },
      { id: "s_b_tekate", name: "Caja TeKate", price: 70000, category: "service", description: "Cerveza premium importada helada (24 latas)." }
    ],
    grados_otros: [
      { id: "s_g_granizado", name: "Granizado 100 porciones", price: 390000, category: "service" },
      { id: "s_g_plataforma", name: "Plataforma 360", price: 600000, category: "service" },
      { id: "s_g_recreacion", name: "Recreacion", price: 200000, category: "service" },
      { id: "s_g_video", name: "Proyección video", price: 180000, category: "service" },
      { id: "s_g_dulces", name: "Mesa de dulces", price: 170000, category: "service" },
      { id: "s_g_papayera", name: "Papayera", price: 390000, category: "service" },
      { id: "s_g_mariachis", name: "Mariachis", price: 500000, category: "service" },
      { id: "s_g_aguardiente", name: "Garrafa aguardiente", price: 120000, category: "service" },
      { id: "s_g_ron", name: "Garrafa ron", price: 140000, category: "service" },
      { id: "s_g_pilsen", name: "Caja Pilsen/Águila", price: 90000, category: "service" },
      { id: "s_g_tecate", name: "Caja Tecate", price: 70000, category: "service" }
    ],
    comuniones: [
      { id: "s_c_granizado", name: "Granizado 100 porciones", price: 390000, category: "service" },
      { id: "s_c_plataforma", name: "Plataforma 360", price: 600000, category: "service" },
      { id: "s_c_recreacionistas", name: "Recreacionistas", price: 200000, category: "service" },
      { id: "s_c_video", name: "Proyección video", price: 180000, category: "service" },
      { id: "s_c_dulces", name: "Mesa de dulces", price: 170000, category: "service" },
      { id: "s_c_papayera", name: "Papayera", price: 390000, category: "service" },
      { id: "s_c_mariachis", name: "Mariachis", price: 500000, category: "service" },
      { id: "s_c_aguardiente", name: "Garrafa aguardiente", price: 120000, category: "service" },
      { id: "s_c_ron", name: "Garrafa ron", price: 140000, category: "service" },
      { id: "s_c_pilsen", name: "Caja Pilsen/Águila", price: 90000, category: "service" },
      { id: "s_c_tecate", name: "Caja Tecate", price: 70000, category: "service" }
    ],
    quinces: [
      { id: "s_q_granizado", name: "Granizado 100 porciones", price: 390000, category: "service" },
      { id: "s_q_plataforma", name: "Plataforma 360", price: 600000, category: "service" },
      { id: "s_q_protocolo", name: "Protocolo quinceañera", price: 180000, category: "service" },
      { id: "s_q_edecanes2", name: "2 edecanes", price: 200000, category: "service" },
      { id: "s_q_edecanes4", name: "4 edecanes", price: 390000, category: "service" },
      { id: "s_q_video", name: "Proyección video", price: 180000, category: "service" },
      { id: "s_q_dulces", name: "Mesa de dulces", price: 170000, category: "service" },
      { id: "s_q_papayera", name: "Papayera", price: 390000, category: "service" },
      { id: "s_q_mariachis", name: "Mariachis", price: 500000, category: "service" },
      { id: "s_q_aguardiente", name: "Garrafa aguardiente", price: 120000, category: "service" },
      { id: "s_q_ron", name: "Garrafa ron", price: 140000, category: "service" },
      { id: "s_q_pilsen", name: "Caja Pilsen/Águila", price: 90000, category: "service" },
      { id: "s_q_tecate", name: "Caja Tecate", price: 70000, category: "service" }
    ]
  },
  coctel: [
    { id: "m_coctel_frutos", name: "Cóctel de Frutos Rojos sin alcohol", price: 0, category: "coctel", description: "Deliciosa mezcla refrescante de fresas, moras y arándanos con soda y menta fresca." },
    { id: "m_coctel_margarita", name: "Margarita de Maracuyá", price: 0, category: "coctel", description: "Cóctel suave con tequila, triple sec y pulpa natural de maracuyá." }
  ],
  arroz: [
    { id: "m_arroz_almendras", name: "Arroz con Almendras", price: 0, category: "arroz", description: "Arroz tostado con almendras fileteadas crujientes y uvas pasas." },
    { id: "m_arroz_verde", name: "Arroz Verde", price: 0, category: "arroz", description: "Arroz aromático saborizado al cilantro fresco y espinaca." }
  ],
  carne: [
    { id: "m_carne_pollo", name: "Pollo en salsa de champiñones", price: 0, category: "carne", description: "Pechuga de pollo a la plancha bañada en una cremosa salsa de champiñones y crema de leche." },
    { id: "m_carne_lomo", name: "Lomo de cerdo en salsa de ciruelas", price: 0, category: "carne", description: "Medallones de lomo de cerdo asados con salsa agridulce de ciruelas y vino tinto." },
    { id: "m_carne_lasagna", name: "Lasagna", price: 0, category: "carne", description: "Lasagna casera gratinada con capas de pasta, carne y queso mozzarella." }
  ],
  ensalada: [
    { id: "m_ensalada_cesar", name: "Ensalada César", price: 0, category: "ensalada", description: "Lechuga romana fresca, crutones crocantes, queso parmesano y aderezo César especial." },
    { id: "m_ensalada_waldorf", name: "Ensalada Waldorf", price: 0, category: "ensalada", description: "Combinación fresca de manzana verde, apio crujiente, nueces picadas y mayonesa suave." }
  ],
  postre: [
    { id: "m_postre_fresa", name: "Lasagna de fresas", price: 0, category: "postre", description: "Capas de galleta dulce, crema pastelera, fresas frescas y chocolate blanco rallado." },
    { id: "m_postre_cheesecake", name: "Cheesecake de frutos rojos", price: 0, category: "postre", description: "Clásico pastel de queso crema sobre base crocante con coulis casero de frutos rojos." }
  ],
  liquido: [
    { id: "m_liquido_gaseosa", name: "Gaseosa y Agua Mineral", price: 0, category: "liquido", description: "Bebida gaseosa y agua purificada ilimitada servida en jarra." },
    { id: "m_liquido_limonada", name: "Limonada de coco", price: 0, category: "liquido", description: "Granizado premium de zumo de limón con crema de coco natural." }
  ],
  torta: [
    { id: "m_torta_vainilla", name: "Torta de Bodas de Vainilla", price: 0, category: "torta", description: "Torta clásica húmeda con relleno de arequipe y cubierta de crema chantilly." },
    { id: "m_torta_chocolate", name: "Torta Selva Negra", price: 0, category: "torta", description: "Bizcochuelo de chocolate relleno de cerezas marrasquino y crema chantilly." }
  ],
  pasabocas: [
    { id: "m_pasabocas_volauvent", name: "Mini Vol-au-vent de pollo", price: 0, category: "pasabocas", description: "Pequeños hojaldres crujientes rellenos de pollo desmechado en salsa bechamel." },
    { id: "m_pasabocas_tequenos", name: "Tequeños con tártara", price: 0, category: "pasabocas", description: "Deditos de masa de trigo rellenos de queso costeño derretido." }
  ]
};

export const seedRecipes = [
  {
    id: "rec_lasagna",
    name: "Lasagna",
    category: "carne",
    baseGuests: 50,
    ingredients: [
      { name: "Carne", quantity: 5, unit: "kg" },
      { name: "Queso", quantity: 3, unit: "kg" },
      { name: "Pasta", quantity: 4, unit: "kg" }
    ],
    procedure: "Cocinar la carne, preparar la salsa bechamel, montar capas alternadas de pasta, carne y queso, y hornear a 180 grados por 40 minutos."
  },
  {
    id: "rec_pollo_champi",
    name: "Pollo en salsa de champiñones",
    category: "carne",
    baseGuests: 50,
    ingredients: [
      { name: "Pollo", quantity: 7.5, unit: "kg" },
      { name: "Champiñones", quantity: 2.5, unit: "kg" },
      { name: "Crema de leche", quantity: 1.667, unit: "litros" }
    ],
    procedure: "Dorar las pechugas de pollo. Aparte saltear los champiñones, agregar la crema de leche y cocinar a fuego lento. Juntar el pollo con la salsa y cocinar 10 minutos."
  },
  {
    id: "rec_lomo_cerdo",
    name: "Lomo de cerdo en salsa de ciruelas",
    category: "carne",
    baseGuests: 50,
    ingredients: [
      { name: "Lomo de cerdo", quantity: 8, unit: "kg" },
      { name: "Ciruelas pasas", quantity: 2, unit: "kg" },
      { name: "Vino tinto", quantity: 1.5, unit: "litros" }
    ],
    procedure: "Sellar el lomo de cerdo entero. Licuar las ciruelas cocidas con vino tinto y especias. Bañar el lomo con la salsa y hornear a 170 grados por 1 hora."
  },
  {
    id: "rec_arroz_almendras",
    name: "Arroz con Almendras",
    category: "arroz",
    baseGuests: 50,
    ingredients: [
      { name: "Arroz", quantity: 4, unit: "kg" },
      { name: "Almendras fileteadas", quantity: 1, unit: "kg" },
      { name: "Uvas pasas", quantity: 0.5, unit: "kg" }
    ],
    procedure: "Tostar las almendras en el horno. Cocinar el arroz con sal y aceite. Al final, mezclar las almendras tostadas y las uvas pasas."
  },
  {
    id: "rec_coctel_frutos",
    name: "Cóctel de Frutos Rojos sin alcohol",
    category: "coctel",
    baseGuests: 50,
    ingredients: [
      { name: "Fresas", quantity: 2, unit: "kg" },
      { name: "Moras", quantity: 1.5, unit: "kg" },
      { name: "Arándanos", quantity: 1, unit: "kg" },
      { name: "Soda", quantity: 10, unit: "litros" }
    ],
    procedure: "Licuar ligeramente las frutas con un poco de agua. Servir en copas con hielo, rellenar con soda y decorar con hojas de menta."
  }
];

export const seedInventory = [
  { id: "inv_pollo", name: "Pollo", quantity: 5, unit: "kg", category: "alimentos", minStock: 10 },
  { id: "inv_champi", name: "Champiñones", quantity: 1, unit: "kg", category: "alimentos", minStock: 5 },
  { id: "inv_crema", name: "Crema de leche", quantity: 1, unit: "litros", category: "alimentos", minStock: 4 },
  { id: "inv_carne", name: "Carne", quantity: 2, unit: "kg", category: "alimentos", minStock: 10 },
  { id: "inv_queso", name: "Queso", quantity: 1.5, unit: "kg", category: "alimentos", minStock: 5 },
  { id: "inv_pasta", name: "Pasta", quantity: 2, unit: "kg", category: "alimentos", minStock: 5 },
  { id: "inv_vino", name: "Vino tinto", quantity: 3, unit: "litros", category: "bebidas", minStock: 2 },
  { id: "inv_globos", name: "Globos de colores", quantity: 500, unit: "unidades", category: "decoracion", minStock: 100 },
  { id: "inv_manteles", name: "Manteles blancos", quantity: 45, unit: "unidades", category: "decoracion", minStock: 10 },
  { id: "inv_platos", name: "Platos de loza", quantity: 300, unit: "unidades", category: "insumos", minStock: 50 }
];

export const seedClientUser = {
  uid: "cliente_user",
  email: "cliente@controlbanquete.com",
  name: "Sara y Felipe",
  role: "cliente",
  phone: "3059990000"
};

export const seedClientEvent = {
  id: "e_sara_felipe",
  quotationId: "q_sara_felipe_temp",
  clientId: "cliente_user",
  clientName: "Sara y Felipe",
  clientEmail: "cliente@controlbanquete.com",
  eventType: "boda",
  date: "2026-06-20",
  time: "16:00",
  venueId: "v_prado_colonial",
  guests: 80,
  photoDriveLink: "https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j",
  photoSelectionText: "",
  photographyId: "p_intermedio",
  decorationId: "d_estandar",
  totalValue: 4500000,
  status: "confirmado",
  payments: [
    { date: "2026-06-01", amount: 1500000, type: "abono" }
  ],
  paidAmount: 1500000,
  balance: 3000000,
  contractSigned: false,
  contractSignature: "",
  selectedServices: ["s_b_plataforma"],
  guestsList: [
    { name: "Pedro Gómez", confirmed: true },
    { name: "María Rojas", confirmed: false },
    { name: "Carlos Soto", confirmed: true }
  ],
  menu: {
    coctel: "Cóctel de Frutos Rojos sin alcohol",
    arroz: "Arroz con Almendras",
    carne: "Pollo en salsa de champiñones",
    ensalada: "Ensalada César",
    postre: "Cheesecake de frutos rojos",
    liquido: "Limonada de coco",
    torta: "Torta de Bodas de Vainilla",
    pasabocas: "Mini Vol-au-vent de pollo"
  },
  timeline: [
    { time: "16:00", activity: "Ingreso de Logística y Decoración", completed: true },
    { time: "18:00", activity: "Llegada de invitados y coctel de bienvenida", completed: false },
    { time: "19:00", activity: "Acto protocolario", completed: false },
    { time: "20:00", activity: "Cena (Plato principal)", completed: false },
    { time: "21:00", activity: "Apertura de pista de baile y mesa de postres", completed: false },
    { time: "01:00", activity: "Fin del evento", completed: false }
  ],
  allowColorSelection: true,
  selectedColor: "Dorado",
  appointments: [
    { title: "Ensayo de Edecanes", date: "2026-06-15", time: "15:00" },
    { title: "Degustación de Menú", date: "2026-06-12", time: "16:30" }
  ]
};

export const seedClientEventPast = {
  id: "e_sara_felipe_pasado",
  quotationId: "q_sara_felipe_temp_pasado",
  clientId: "cliente_user",
  clientName: "Sara y Felipe (Evento Pasado)",
  clientEmail: "cliente@controlbanquete.com",
  eventType: "boda",
  date: "2026-05-20",
  time: "16:00",
  venueId: "v_prado_colonial",
  guests: 80,
  photoDriveLink: "https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j",
  photoSelectionText: "",
  photographyId: "p_intermedio",
  decorationId: "d_estandar",
  totalValue: 4500000,
  status: "realizado",
  payments: [
    { date: "2026-05-01", amount: 1500000, type: "abono" },
    { date: "2026-05-15", amount: 3000000, type: "saldo" }
  ],
  paidAmount: 4500000,
  balance: 0,
  contractSigned: true,
  contractSignature: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='50'><path d='M10,40 Q30,10 50,40 T90,20' stroke='black' stroke-width='2' fill='none'/></svg>",
  selectedServices: ["s_b_plataforma"],
  guestsList: [
    { name: "Pedro Gómez", confirmed: true },
    { name: "María Rojas", confirmed: true },
    { name: "Carlos Soto", confirmed: true }
  ],
  menu: {
    coctel: "Cóctel de Frutos Rojos sin alcohol",
    arroz: "Arroz con Almendras",
    carne: "Pollo en salsa de champiñones",
    ensalada: "Ensalada César",
    postre: "Cheesecake de frutos rojos",
    liquido: "Limonada de coco",
    torta: "Torta de Bodas de Vainilla",
    pasabocas: "Mini Vol-au-vent de pollo"
  },
  timeline: [
    { time: "16:00", activity: "Ingreso de Logística y Decoración", completed: true },
    { time: "18:00", activity: "Llegada de invitados y coctel de bienvenida", completed: true },
    { time: "19:00", activity: "Acto protocolario", completed: true },
    { time: "20:00", activity: "Cena (Plato principal)", completed: true },
    { time: "21:00", activity: "Apertura de pista de baile y mesa de postres", completed: true },
    { time: "01:00", activity: "Fin del evento", completed: true }
  ],
  allowColorSelection: false,
  selectedColor: "",
  appointments: []
};

export const seedSettings = {
  id: "base_settings",
  costoMesero: 110000,
  costoAlimentacion: 36000,
  descripcionAlimentacion: "Incluye plato principal caliente (receta seleccionada), entrada, bebida ilimitada y postre con menaje completo.",
  availableColors: ["Blanco", "Dorado", "Plateado", "Azul Rey", "Rojo Pasión", "Verde Esmeralda", "Rosa Pastel"],
  telefonoContacto1: "3163048505",
  telefonoContacto2: "3197188973",
  telefonoContactoFoto: "3163048505",
  photoInstructions: "1. Selección de Fotos: Un plazo de 10 días posterior al evento, nuestro equipo cargará todas las capturas oficiales.\n2. Descarga Completa: El botón de descarga te llevará al Drive oficial donde podrás bajar las fotos en alta resolución.\n3. Disponibilidad: El enlace permanecerá activo en la nube por un período de 90 días calendario.",
  customSettings: [
    { label: "Costo por Mesero (COP)", value: 110000, type: "fixed" },
    { label: "Alimentación Base por Persona (COP)", value: 36000, type: "per_person" },
    { label: "Descripción de Alimentación Base (para el cliente)", value: "Incluye plato principal caliente (receta seleccionada), entrada, bebida ilimitada y postre con menaje completo.", type: "text" },
    { label: "Teléfono / WhatsApp 1", value: "3163048505", type: "text" },
    { label: "Teléfono / WhatsApp 2", value: "3197188973", type: "text" },
    { label: "Teléfono / WhatsApp Fotografía", value: "3163048505", type: "text" }
  ],
  updatedAt: new Date().toISOString()
};

// Función para sembrar Firestore usando los SDKs
export async function seedFirestore(db, collection, doc, setDoc) {
  try {
    console.log("Iniciando siembra de datos en Firestore...");

    // 1. Guardar configuraciones base
    await setDoc(doc(db, "settings", "base_settings"), seedSettings);
    console.log("Configuración base guardada.");

    // 2. Guardar productos (salones, fotografía, decoración)
    for (let item of seedProducts.venues) {
      await setDoc(doc(db, "products", item.id), item);
    }
    for (let item of seedProducts.photography) {
      await setDoc(doc(db, "products", item.id), item);
    }
    for (let item of seedProducts.decoration) {
      await setDoc(doc(db, "products", item.id), item);
    }
    
    // Guardar servicios por tipo de evento
    for (let eventType in seedProducts.services) {
      for (let item of seedProducts.services[eventType]) {
        // Añadimos el tipo de evento al producto para consultas
        await setDoc(doc(db, "products", item.id), {
          ...item,
          eventType: eventType
        });
      }
    }

    // Guardar opciones de menú
    const menuCategories = ['coctel', 'arroz', 'carne', 'ensalada', 'postre', 'liquido', 'torta', 'pasabocas'];
    for (let cat of menuCategories) {
      if (seedProducts[cat]) {
        for (let item of seedProducts[cat]) {
          await setDoc(doc(db, "products", item.id), item);
        }
      }
    }
    console.log("Productos y servicios guardados (incluyendo opciones de menú).");

    // 3. Guardar recetas
    for (let recipe of seedRecipes) {
      await setDoc(doc(db, "recipes", recipe.id), recipe);
    }
    console.log("Recetas guardadas.");

    // 4. Guardar inventario
    for (let inv of seedInventory) {
      await setDoc(doc(db, "inventory", inv.id), inv);
    }
    console.log("Inventario inicial guardado.");

    // 5. Crear usuarios por defecto en la base de datos (para referencia)
    const demoAccounts = [
      { uid: "admin_user", email: "admin@controlbanquete.com", name: "Administrador Control Banquete", role: "superadmin", phone: "3163048505", password: "123456" },
      { uid: "compras_user", email: "compras@controlbanquete.com", name: "Jefe de Compras", role: "compras", phone: "3007654321", password: "123456" },
      { uid: "cocina_user", email: "cocina@controlbanquete.com", name: "Chef Principal", role: "cocina", phone: "3011112222", password: "123456" },
      { uid: "logistica_user", email: "logistica@controlbanquete.com", name: "Coordinador de Logística", role: "logistica", phone: "3023334444", password: "123456" },
      { uid: "recreacion_user", email: "recreacion@controlbanquete.com", name: "Coordinador de Recreación", role: "recreacion", phone: "3035556666", password: "123456" },
      { uid: "decoracion_user", email: "decoracion@controlbanquete.com", name: "Coordinadora de Decoración", role: "decoracion", phone: "3047778888", password: "123456" },
      { uid: "cliente_user", email: "cliente@controlbanquete.com", name: "Sara y Felipe", role: "cliente", phone: "3059990000", password: "123456" }
    ];

    for (let u of demoAccounts) {
      await setDoc(doc(db, "users", u.uid), u);
    }
    console.log("Usuarios de demostración creados.");

    // 6. Crear evento de demostración
    await setDoc(doc(db, "events", seedClientEvent.id), seedClientEvent);
    await setDoc(doc(db, "events", seedClientEventPast.id), seedClientEventPast);
    console.log("Eventos de demostración creados.");

    console.log("¡Siembra de Firestore completada con éxito!");
    return true;
  } catch (error) {
    console.error("Error al sembrar Firestore:", error);
    throw error;
  }
}
