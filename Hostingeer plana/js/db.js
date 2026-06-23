// Servicio de Base de Datos para Casa de Banquetes Sarahy
// Soporta tanto Firebase Firestore real como un simulador robusto en LocalStorage.

import { firebaseConfig, USE_MOCK_DATA as forceMock, loadConfig } from './config.js';
import * as Seed from './seed.js';

let db = null;
let useMock = forceMock;

// Importaciones dinámicas de Firebase
let doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc, query, where, orderBy;

async function initFirebase() {
  const serverParams = await loadConfig();
  const activeConfig = serverParams.config;
  useMock = serverParams.useMock;

  if (useMock) {
    console.log("Modo simulador forzado por configuración.");
    initMockStorage();
    return;
  }

  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    
    // Extraer funciones
    doc = firestoreModule.doc;
    getDoc = firestoreModule.getDoc;
    setDoc = firestoreModule.setDoc;
    updateDoc = firestoreModule.updateDoc;
    deleteDoc = firestoreModule.deleteDoc;
    collection = firestoreModule.collection;
    getDocs = firestoreModule.getDocs;
    addDoc = firestoreModule.addDoc;
    query = firestoreModule.query;
    where = firestoreModule.where;
    orderBy = firestoreModule.orderBy;

    const app = initializeApp(activeConfig);
    db = firestoreModule.getFirestore(app);
    console.log("Firebase Firestore inicializado correctamente.");
    
    // Verificar si la base de datos está vacía; si es así, sembrarla de inmediato
    const settingsSnap = await getDoc(doc(db, "settings", "base_settings"));
    if (!settingsSnap.exists()) {
      console.log("Base de datos vacía detectada. Sembrando datos iniciales...");
      await Seed.seedFirestore(db, collection, doc, setDoc);
    }
  } catch (error) {
    console.warn("Fallo al inicializar Firebase. Cayendo a modo simulador local.", error);
    useMock = true;
    initMockStorage();
  }
}

// Inicializar el simulador LocalStorage
function initMockStorage() {
  if (!localStorage.getItem('sarahy_initialized')) {
    console.log("Inicializando LocalStorage con datos semilla...");
    localStorage.setItem('sarahy_settings', JSON.stringify(Seed.seedSettings));
    localStorage.setItem('sarahy_products_venues', JSON.stringify(Seed.seedProducts.venues));
    localStorage.setItem('sarahy_products_photography', JSON.stringify(Seed.seedProducts.photography));
    localStorage.setItem('sarahy_products_decoration', JSON.stringify(Seed.seedProducts.decoration));
    localStorage.setItem('sarahy_products_services', JSON.stringify(Seed.seedProducts.services));
    localStorage.setItem('sarahy_products_coctel', JSON.stringify(Seed.seedProducts.coctel));
    localStorage.setItem('sarahy_products_arroz', JSON.stringify(Seed.seedProducts.arroz));
    localStorage.setItem('sarahy_products_carne', JSON.stringify(Seed.seedProducts.carne));
    localStorage.setItem('sarahy_products_ensalada', JSON.stringify(Seed.seedProducts.ensalada));
    localStorage.setItem('sarahy_products_postre', JSON.stringify(Seed.seedProducts.postre));
    localStorage.setItem('sarahy_products_liquido', JSON.stringify(Seed.seedProducts.liquido));
    localStorage.setItem('sarahy_products_torta', JSON.stringify(Seed.seedProducts.torta));
    localStorage.setItem('sarahy_products_pasabocas', JSON.stringify(Seed.seedProducts.pasabocas));
    localStorage.setItem('sarahy_recipes', JSON.stringify(Seed.seedRecipes));
    localStorage.setItem('sarahy_inventory', JSON.stringify(Seed.seedInventory));
    localStorage.setItem('sarahy_quotations', JSON.stringify([]));
    localStorage.setItem('sarahy_events', JSON.stringify([Seed.seedClientEvent, Seed.seedClientEventPast]));
    
    // Crear un usuario de demostración superadmin y el cliente demo
    localStorage.setItem('sarahy_users', JSON.stringify([
      { uid: "admin_user", email: "admin@sarahy.com", name: "Administrador Sarahy", role: "superadmin", phone: "3001234567" },
      Seed.seedClientUser
    ]));
    
    localStorage.setItem('sarahy_initialized', 'true');
    console.log("LocalStorage sembrado correctamente.");
  }
}

// Inicializar la conexión
const initPromise = initFirebase();

// Helper para esperar inicialización
async function ensureReady() {
  await initPromise;
}

// Helper para interactuar con la API REST del backend con fallback a LocalStorage
async function apiCall(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API responded with ${response.status}`);
  }
  return await response.json();
}

// Helpers locales para actualizar caché de productos
function updateLocalProduct(product) {
  const menuCategories = ['coctel', 'arroz', 'carne', 'ensalada', 'postre', 'liquido', 'torta', 'pasabocas'];
  if (product.category === 'venue') {
    let list = JSON.parse(localStorage.getItem('sarahy_products_venues')) || [];
    list = list.filter(p => p.id !== product.id);
    list.push(product);
    localStorage.setItem('sarahy_products_venues', JSON.stringify(list));
  } else if (product.category === 'photography') {
    let list = JSON.parse(localStorage.getItem('sarahy_products_photography')) || [];
    list = list.filter(p => p.id !== product.id);
    list.push(product);
    localStorage.setItem('sarahy_products_photography', JSON.stringify(list));
  } else if (product.category === 'decoration') {
    let list = JSON.parse(localStorage.getItem('sarahy_products_decoration')) || [];
    list = list.filter(p => p.id !== product.id);
    list.push(product);
    localStorage.setItem('sarahy_products_decoration', JSON.stringify(list));
  } else if (product.category === 'service') {
    let services = JSON.parse(localStorage.getItem('sarahy_products_services')) || {};
    const eType = product.eventType || 'boda';
    if (!services[eType]) services[eType] = [];
    services[eType] = services[eType].filter(p => p.id !== product.id);
    services[eType].push(product);
    localStorage.setItem('sarahy_products_services', JSON.stringify(services));
  } else if (menuCategories.includes(product.category)) {
    let list = JSON.parse(localStorage.getItem(`sarahy_products_${product.category}`)) || [];
    list = list.filter(p => p.id !== product.id);
    list.push(product);
    localStorage.setItem(`sarahy_products_${product.category}`, JSON.stringify(list));
  }
}

function deleteLocalProduct(productId, category, eventType) {
  const menuCategories = ['coctel', 'arroz', 'carne', 'ensalada', 'postre', 'liquido', 'torta', 'pasabocas'];
  if (category === 'venue') {
    let list = JSON.parse(localStorage.getItem('sarahy_products_venues')) || [];
    list = list.filter(p => p.id !== productId);
    localStorage.setItem('sarahy_products_venues', JSON.stringify(list));
  } else if (category === 'photography') {
    let list = JSON.parse(localStorage.getItem('sarahy_products_photography')) || [];
    list = list.filter(p => p.id !== productId);
    localStorage.setItem('sarahy_products_photography', JSON.stringify(list));
  } else if (category === 'decoration') {
    let list = JSON.parse(localStorage.getItem('sarahy_products_decoration')) || [];
    list = list.filter(p => p.id !== productId);
    localStorage.setItem('sarahy_products_decoration', JSON.stringify(list));
  } else if (category === 'service') {
    let services = JSON.parse(localStorage.getItem('sarahy_products_services')) || {};
    if (services[eventType]) {
      services[eventType] = services[eventType].filter(p => p.id !== productId);
      localStorage.setItem('sarahy_products_services', JSON.stringify(services));
    }
  } else if (menuCategories.includes(category)) {
    let list = JSON.parse(localStorage.getItem(`sarahy_products_${category}`)) || [];
    list = list.filter(p => p.id !== productId);
    localStorage.setItem(`sarahy_products_${category}`, JSON.stringify(list));
  }
}

// ==========================================
// MÉTODOS DE BASE DE DATOS (API UNIFICADA)
// ==========================================

// --- CONFIGURACIÓN Y VALORES BASE ---
export async function getSettings() {
  await ensureReady();
  let data;
  if (useMock) {
    try {
      data = await apiCall('/api/settings');
      localStorage.setItem('sarahy_settings', JSON.stringify(data));
    } catch (error) {
      console.warn("Fallo al obtener settings de la API, usando LocalStorage.", error);
      data = JSON.parse(localStorage.getItem('sarahy_settings')) || { ...Seed.seedSettings };
    }
  } else {
    const snap = await getDoc(doc(db, "settings", "base_settings"));
    data = snap.exists() ? snap.data() : { ...Seed.seedSettings };
  }
  if (data) {
    if (!data.telefonoContacto1) data.telefonoContacto1 = '3163048505';
    if (!data.telefonoContacto2) data.telefonoContacto2 = '3197188973';
  }
  return data;
}

export async function saveSettings(settings) {
  await ensureReady();
  const updatedSettings = {
    ...settings,
    updatedAt: new Date().toISOString()
  };
  if (useMock) {
    try {
      const res = await apiCall('/api/settings', 'POST', updatedSettings);
      localStorage.setItem('sarahy_settings', JSON.stringify(res));
      return res;
    } catch (error) {
      console.warn("Fallo al guardar settings en la API, usando LocalStorage.", error);
      localStorage.setItem('sarahy_settings', JSON.stringify(updatedSettings));
      return updatedSettings;
    }
  } else {
    await setDoc(doc(db, "settings", "base_settings"), updatedSettings);
    return updatedSettings;
  }
}

// --- PRODUCTOS Y SERVICIOS ---
export async function getProducts() {
  await ensureReady();
  if (useMock) {
    let data;
    try {
      data = await apiCall('/api/products');
      const menuCategories = ['venues', 'photography', 'decoration', 'coctel', 'arroz', 'carne', 'ensalada', 'postre', 'liquido', 'torta', 'pasabocas'];
      menuCategories.forEach(cat => {
        if (data[cat]) localStorage.setItem(`sarahy_products_${cat}`, JSON.stringify(data[cat]));
      });
      if (data.services) localStorage.setItem('sarahy_products_services', JSON.stringify(data.services));
    } catch (error) {
      console.warn("Fallo al obtener productos de la API, usando LocalStorage.", error);
      const venues = JSON.parse(localStorage.getItem('sarahy_products_venues')) || [];
      const photography = JSON.parse(localStorage.getItem('sarahy_products_photography')) || [];
      const decoration = JSON.parse(localStorage.getItem('sarahy_products_decoration')) || [];
      const services = JSON.parse(localStorage.getItem('sarahy_products_services')) || {};
      const coctel = JSON.parse(localStorage.getItem('sarahy_products_coctel')) || [];
      const arroz = JSON.parse(localStorage.getItem('sarahy_products_arroz')) || [];
      const carne = JSON.parse(localStorage.getItem('sarahy_products_carne')) || [];
      const ensalada = JSON.parse(localStorage.getItem('sarahy_products_ensalada')) || [];
      const postre = JSON.parse(localStorage.getItem('sarahy_products_postre')) || [];
      const liquido = JSON.parse(localStorage.getItem('sarahy_products_liquido')) || [];
      const torta = JSON.parse(localStorage.getItem('sarahy_products_torta')) || [];
      const pasabocas = JSON.parse(localStorage.getItem('sarahy_products_pasabocas')) || [];
      data = { venues, photography, decoration, services, coctel, arroz, carne, ensalada, postre, liquido, torta, pasabocas };
    }
    return data;
  } else {
    const querySnapshot = await getDocs(collection(db, "products"));
    const venues = [];
    const photography = [];
    const decoration = [];
    const services = { boda: [], grados_otros: [], comuniones: [], quinces: [] };
    const coctel = [];
    const arroz = [];
    const carne = [];
    const ensalada = [];
    const postre = [];
    const liquido = [];
    const torta = [];
    const pasabocas = [];
    
    querySnapshot.forEach((dDoc) => {
      const data = dDoc.data();
      data.id = dDoc.id;
      if (data.category === "venue") venues.push(data);
      else if (data.category === "photography") photography.push(data);
      else if (data.category === "decoration") decoration.push(data);
      else if (data.category === "coctel") coctel.push(data);
      else if (data.category === "arroz") arroz.push(data);
      else if (data.category === "carne") carne.push(data);
      else if (data.category === "ensalada") ensalada.push(data);
      else if (data.category === "postre") postre.push(data);
      else if (data.category === "liquido") liquido.push(data);
      else if (data.category === "torta") torta.push(data);
      else if (data.category === "pasabocas") pasabocas.push(data);
      else if (data.category === "service") {
        if (data.eventType) {
          if (!services[data.eventType]) services[data.eventType] = [];
          services[data.eventType].push(data);
        }
      }
    });
    return { venues, photography, decoration, services, coctel, arroz, carne, ensalada, postre, liquido, torta, pasabocas };
  }
}

export async function saveProduct(product) {
  await ensureReady();
  if (!product.id) {
    product.id = 'prod_' + Math.random().toString(36).substr(2, 9);
  }
  
  if (useMock) {
    try {
      const res = await apiCall('/api/products', 'POST', product);
      updateLocalProduct(res);
      return res;
    } catch (error) {
      console.warn("Fallo al guardar producto en la API, usando LocalStorage.", error);
      updateLocalProduct(product);
      return product;
    }
  } else {
    await setDoc(doc(db, "products", product.id), product);
    return product;
  }
}

export async function deleteProduct(productId, category, eventType) {
  await ensureReady();
  if (useMock) {
    try {
      const url = `/api/products/${productId}?category=${category}&eventType=${eventType || ''}`;
      await apiCall(url, 'DELETE');
      deleteLocalProduct(productId, category, eventType);
      return true;
    } catch (error) {
      console.warn("Fallo al eliminar producto en la API, usando LocalStorage.", error);
      deleteLocalProduct(productId, category, eventType);
      return true;
    }
  } else {
    await deleteDoc(doc(db, "products", productId));
    return true;
  }
}

// --- COTIZACIONES ---
export async function getQuotations() {
  await ensureReady();
  if (useMock) {
    try {
      const data = await apiCall('/api/quotations');
      localStorage.setItem('sarahy_quotations', JSON.stringify(data));
      return data;
    } catch (error) {
      console.warn("Fallo al obtener cotizaciones de la API, usando LocalStorage.", error);
      return JSON.parse(localStorage.getItem('sarahy_quotations')) || [];
    }
  } else {
    const querySnapshot = await getDocs(collection(db, "quotations"));
    const list = [];
    querySnapshot.forEach((dDoc) => {
      const data = dDoc.data();
      data.id = dDoc.id;
      list.push(data);
    });
    return list;
  }
}

export async function createQuotation(quotation) {
  await ensureReady();
  quotation.id = quotation.id || 'q_' + Math.random().toString(36).substr(2, 9);
  quotation.createdAt = new Date().toISOString();
  
  if (useMock) {
    let savedQuotation = quotation;
    try {
      savedQuotation = await apiCall('/api/quotations', 'POST', quotation);
    } catch (error) {
      console.warn("Fallo al enviar cotización a la API del servidor. Guardando localmente.", error);
    }
    const list = JSON.parse(localStorage.getItem('sarahy_quotations')) || [];
    list.push(savedQuotation);
    localStorage.setItem('sarahy_quotations', JSON.stringify(list));
    return savedQuotation;
  } else {
    try {
      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotation)
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("Fallo al enviar cotización a la API del servidor Firebase. Guardando directo en Firebase.", error);
    }
    await setDoc(doc(db, "quotations", quotation.id), quotation);
    return quotation;
  }
}

export async function updateQuotationStatus(id, status) {
  await ensureReady();

  if (useMock) {
    let updated;
    try {
      updated = await apiCall(`/api/quotations/${id}`, 'PUT', { status });
    } catch (error) {
      console.warn("Fallo al actualizar cotización en la API del servidor. Usando LocalStorage.", error);
    }
    
    const list = JSON.parse(localStorage.getItem('sarahy_quotations')) || [];
    const idx = list.findIndex(q => q.id === id);
    if (idx !== -1) {
      if (updated) {
        list[idx] = updated;
      } else {
        list[idx].status = status;
        list[idx].updatedAt = new Date().toISOString();
        updated = list[idx];
      }
      localStorage.setItem('sarahy_quotations', JSON.stringify(list));
      return updated;
    }
    throw new Error("Quotation not found");
  } else {
    try {
      const response = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("Fallo al actualizar cotización en la API del servidor Firebase. Guardando directo en Firebase.", error);
    }
    const refDoc = doc(db, "quotations", id);
    await updateDoc(refDoc, { status, updatedAt: new Date().toISOString() });
    return { id, status };
  }
}

export async function deleteQuotation(id) {
  await ensureReady();

  if (useMock) {
    try {
      await apiCall(`/api/quotations/${id}`, 'DELETE');
    } catch (error) {
      console.warn("Fallo al eliminar cotización en la API del servidor. Usando LocalStorage.", error);
    }
    const list = JSON.parse(localStorage.getItem('sarahy_quotations')) || [];
    const filtered = list.filter(q => q.id !== id);
    localStorage.setItem('sarahy_quotations', JSON.stringify(filtered));
    return { success: true };
  } else {
    try {
      await fetch(`/api/quotations/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.warn("Fallo al eliminar cotización en la API del servidor. Usando Firebase directo.", error);
    }
    await deleteDoc(doc(db, "quotations", id));
    return { success: true };
  }
}

export async function updateQuotationDiscount(id, discount, discountLabel, discountPercent) {
  await ensureReady();
  if (useMock) {
    let updated;
    try {
      updated = await apiCall(`/api/quotations/${id}`, 'PUT', { discount, discountLabel, discountPercent });
    } catch (error) {
      console.warn("Fallo al actualizar descuento en la API. Usando LocalStorage.", error);
    }
    const list = JSON.parse(localStorage.getItem('sarahy_quotations')) || [];
    const idx = list.findIndex(q => q.id === id);
    if (idx !== -1) {
      if (updated) {
        list[idx] = updated;
      } else {
        list[idx].discount = discount;
        list[idx].discountLabel = discountLabel;
        list[idx].discountPercent = discountPercent;
        list[idx].updatedAt = new Date().toISOString();
        updated = list[idx];
      }
      localStorage.setItem('sarahy_quotations', JSON.stringify(list));
      return updated;
    }
    throw new Error("Quotation not found");
  } else {
    const refDoc = doc(db, "quotations", id);
    await updateDoc(refDoc, { 
      discount, 
      discountLabel, 
      discountPercent, 
      updatedAt: new Date().toISOString() 
    });
    return { id, discount, discountLabel, discountPercent };
  }
}

// --- EVENTOS ---
export async function getEvents() {
  await ensureReady();
  let list = [];
  if (useMock) {
    try {
      list = await apiCall('/api/events');
      localStorage.setItem('sarahy_events', JSON.stringify(list));
    } catch (error) {
      console.warn("Fallo al obtener eventos de la API. Usando LocalStorage.", error);
      list = JSON.parse(localStorage.getItem('sarahy_events')) || [];
    }
  } else {
    const querySnapshot = await getDocs(collection(db, "events"));
    querySnapshot.forEach((dDoc) => {
      const data = dDoc.data();
      data.id = dDoc.id;
      list.push(data);
    });
  }
  list.forEach(e => {
    e.payments = e.payments || [];
  });
  return list;
}

export async function createEvent(event) {
  await ensureReady();
  event.id = event.id || 'e_' + Math.random().toString(36).substr(2, 9);
  event.createdAt = new Date().toISOString();
  event.status = event.status || 'confirmado';
  event.payments = event.payments || [];
  event.paidAmount = event.payments.reduce((sum, p) => sum + p.amount, 0);
  event.balance = event.totalValue - event.paidAmount;
  event.guestsList = event.guestsList || [];
  event.timeline = event.timeline || [
    { time: "16:00", activity: "Ingreso de Logística y Decoración", completed: false },
    { time: "18:00", activity: "Llegada de invitados y coctel de bienvenida", completed: false },
    { time: "19:00", activity: "Acto protocolario", completed: false },
    { time: "20:00", activity: "Cena (Plato principal)", completed: false },
    { time: "21:00", activity: "Apertura de pista de baile y mesa de postres", completed: false },
    { time: "01:00", activity: "Fin del evento", completed: false }
  ];
  
  if (useMock) {
    let savedEvent = event;
    try {
      savedEvent = await apiCall('/api/events', 'POST', event);
    } catch (error) {
      console.warn("Fallo al crear evento en la API. Usando LocalStorage.", error);
    }
    const list = JSON.parse(localStorage.getItem('sarahy_events')) || [];
    list.push(savedEvent);
    localStorage.setItem('sarahy_events', JSON.stringify(list));
    return savedEvent;
  } else {
    await setDoc(doc(db, "events", event.id), event);
    return event;
  }
}

export async function updateEvent(id, eventData) {
  await ensureReady();
  if (useMock) {
    let updated;
    try {
      updated = await apiCall(`/api/events/${id}`, 'PUT', eventData);
    } catch (error) {
      console.warn("Fallo al actualizar evento en la API. Usando LocalStorage.", error);
    }
    
    const list = JSON.parse(localStorage.getItem('sarahy_events')) || [];
    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) {
      if (updated) {
        list[idx] = updated;
      } else {
        list[idx] = { ...list[idx], ...eventData, updatedAt: new Date().toISOString() };
        if (eventData.payments || eventData.totalValue !== undefined) {
          list[idx].paidAmount = list[idx].payments.reduce((sum, p) => sum + p.amount, 0);
          list[idx].balance = list[idx].totalValue - list[idx].paidAmount;
        }
        updated = list[idx];
      }
      localStorage.setItem('sarahy_events', JSON.stringify(list));
      return updated;
    }
    throw new Error("Event not found");
  } else {
    const refDoc = doc(db, "events", id);
    const updatedData = { ...eventData, updatedAt: new Date().toISOString() };
    
    if (eventData.payments) {
      const eventSnap = await getDoc(refDoc);
      if (eventSnap.exists()) {
        const fullEvent = eventSnap.data();
        const totalValue = eventData.totalValue !== undefined ? eventData.totalValue : fullEvent.totalValue;
        updatedData.paidAmount = eventData.payments.reduce((sum, p) => sum + p.amount, 0);
        updatedData.balance = totalValue - updatedData.paidAmount;
      }
    }
    
    await updateDoc(refDoc, updatedData);
    return { id, ...updatedData };
  }
}

// --- RECETARIO MAESTRO ---
export async function getRecipes() {
  await ensureReady();
  if (useMock) {
    try {
      const data = await apiCall('/api/recipes');
      localStorage.setItem('sarahy_recipes', JSON.stringify(data));
      return data;
    } catch (error) {
      console.warn("Fallo al obtener recetas de la API. Usando LocalStorage.", error);
      return JSON.parse(localStorage.getItem('sarahy_recipes')) || [];
    }
  } else {
    const querySnapshot = await getDocs(collection(db, "recipes"));
    const list = [];
    querySnapshot.forEach((dDoc) => {
      const data = dDoc.data();
      data.id = dDoc.id;
      list.push(data);
    });
    return list;
  }
}

export async function saveRecipe(recipe) {
  await ensureReady();
  if (!recipe.id) {
    recipe.id = 'rec_' + Math.random().toString(36).substr(2, 9);
  }
  
  if (useMock) {
    let savedRecipe = recipe;
    try {
      savedRecipe = await apiCall('/api/recipes', 'POST', recipe);
    } catch (error) {
      console.warn("Fallo al guardar receta en la API. Usando LocalStorage.", error);
    }
    let list = JSON.parse(localStorage.getItem('sarahy_recipes')) || [];
    list = list.filter(r => r.id !== recipe.id);
    list.push(savedRecipe);
    localStorage.setItem('sarahy_recipes', JSON.stringify(list));
    return savedRecipe;
  } else {
    await setDoc(doc(db, "recipes", recipe.id), recipe);
    return recipe;
  }
}

export async function deleteRecipe(recipeId) {
  await ensureReady();
  if (useMock) {
    try {
      await apiCall(`/api/recipes/${recipeId}`, 'DELETE');
    } catch (error) {
      console.warn("Fallo al eliminar receta en la API. Usando LocalStorage.", error);
    }
    let list = JSON.parse(localStorage.getItem('sarahy_recipes')) || [];
    list = list.filter(r => r.id !== recipeId);
    localStorage.setItem('sarahy_recipes', JSON.stringify(list));
    return true;
  } else {
    await deleteDoc(doc(db, "recipes", recipeId));
    return true;
  }
}

// --- INVENTARIO ---
export async function getInventory() {
  await ensureReady();
  if (useMock) {
    try {
      const data = await apiCall('/api/inventory');
      localStorage.setItem('sarahy_inventory', JSON.stringify(data));
      return data;
    } catch (error) {
      console.warn("Fallo al obtener inventario de la API. Usando LocalStorage.", error);
      return JSON.parse(localStorage.getItem('sarahy_inventory')) || [];
    }
  } else {
    const querySnapshot = await getDocs(collection(db, "inventory"));
    const list = [];
    querySnapshot.forEach((dDoc) => {
      const data = dDoc.data();
      data.id = dDoc.id;
      list.push(data);
    });
    return list;
  }
}

export async function updateInventoryItem(item) {
  await ensureReady();
  if (!item.id) {
    item.id = 'inv_' + Math.random().toString(36).substr(2, 9);
  }
  
  if (useMock) {
    let savedItem = item;
    try {
      savedItem = await apiCall('/api/inventory', 'POST', item);
    } catch (error) {
      console.warn("Fallo al actualizar item de inventario en la API. Usando LocalStorage.", error);
    }
    let list = JSON.parse(localStorage.getItem('sarahy_inventory')) || [];
    list = list.filter(i => i.id !== item.id);
    list.push(savedItem);
    localStorage.setItem('sarahy_inventory', JSON.stringify(list));
    return savedItem;
  } else {
    await setDoc(doc(db, "inventory", item.id), item);
    return item;
  }
}

export async function deleteInventoryItem(itemId) {
  await ensureReady();
  if (useMock) {
    try {
      await apiCall(`/api/inventory/${itemId}`, 'DELETE');
    } catch (error) {
      console.warn("Fallo al eliminar item de inventario en la API. Usando LocalStorage.", error);
    }
    let list = JSON.parse(localStorage.getItem('sarahy_inventory')) || [];
    list = list.filter(i => i.id !== itemId);
    localStorage.setItem('sarahy_inventory', JSON.stringify(list));
    return true;
  } else {
    await deleteDoc(doc(db, "inventory", itemId));
    return true;
  }
}

// --- USUARIOS ---
export async function getUsers() {
  await ensureReady();
  const demoAccounts = [
    { uid: "admin_user", email: "admin@sarahy.com", name: "Administrador Sarahy", role: "superadmin", phone: "3163048505", password: "123456" },
    { uid: "compras_user", email: "compras@sarahy.com", name: "Jefe de Compras", role: "compras", phone: "3007654321", password: "123456" },
    { uid: "cocina_user", email: "cocina@sarahy.com", name: "Chef Principal", role: "cocina", phone: "3011112222", password: "123456" },
    { uid: "logistica_user", email: "logistica@sarahy.com", name: "Coordinador de Logística", role: "logistica", phone: "3023334444", password: "123456" },
    { uid: "recreacion_user", email: "recreacion@sarahy.com", name: "Coordinador de Recreación", role: "recreacion", phone: "3035556666", password: "123456" },
    { uid: "decoracion_user", email: "decoracion@sarahy.com", name: "Coordinadora de Decoración", role: "decoracion", phone: "3047778888", password: "123456" },
    { uid: "cliente_user", email: "cliente@sarahy.com", name: "Sara y Felipe", role: "cliente", phone: "3059990000", password: "123456" }
  ];

  if (useMock) {
    let data = [];
    try {
      data = await apiCall('/api/users');
      if (!Array.isArray(data)) data = [];
    } catch (error) {
      console.warn("Fallo al obtener usuarios de la API. Usando LocalStorage.", error);
      try {
        data = JSON.parse(localStorage.getItem('sarahy_users')) || [];
      } catch (e) {
        data = [];
      }
    }

    let changed = false;
    demoAccounts.forEach(demo => {
      if (!data.some(u => u && u.email && u.email.toLowerCase() === demo.email.toLowerCase())) {
        data.push(demo);
        changed = true;
        apiCall('/api/users', 'POST', demo).catch(() => {});
      }
    });

    if (changed || !localStorage.getItem('sarahy_users')) {
      localStorage.setItem('sarahy_users', JSON.stringify(data));
    }
    return data;
  } else {
    const querySnapshot = await getDocs(collection(db, "users"));
    const list = [];
    querySnapshot.forEach((dDoc) => {
      const data = dDoc.data();
      data.id = dDoc.id;
      list.push(data);
    });

    let changed = false;
    for (const demo of demoAccounts) {
      if (!list.some(u => u && u.email && u.email.toLowerCase() === demo.email.toLowerCase())) {
        try {
          await setDoc(doc(db, "users", demo.uid), demo);
          list.push(demo);
          changed = true;
          console.log(`Usuario demo autosanado en Firestore: ${demo.email}`);
        } catch (e) {
          console.warn(`Error al autosanar usuario demo ${demo.email} en Firestore:`, e);
        }
      }
    }
    return list;
  }
}

export async function saveUser(user) {
  await ensureReady();
  if (useMock) {
    let savedUser = user;
    try {
      savedUser = await apiCall('/api/users', 'POST', user);
    } catch (error) {
      console.warn("Fallo al guardar usuario en la API. Usando LocalStorage.", error);
    }
    let list = JSON.parse(localStorage.getItem('sarahy_users')) || [];
    list = list.filter(u => u.uid !== user.uid);
    list.push(savedUser);
    localStorage.setItem('sarahy_users', JSON.stringify(list));
    return savedUser;
  } else {
    await setDoc(doc(db, "users", user.uid), user);
    return user;
  }
}

export async function deleteUser(uid) {
  await ensureReady();
  if (useMock) {
    try {
      await apiCall(`/api/users/${uid}`, 'DELETE');
    } catch (error) {
      console.warn("Fallo al eliminar usuario en la API. Usando LocalStorage.", error);
    }
    let list = JSON.parse(localStorage.getItem('sarahy_users')) || [];
    list = list.filter(u => u.uid !== uid);
    localStorage.setItem('sarahy_users', JSON.stringify(list));
    return true;
  } else {
    await deleteDoc(doc(db, "users", uid));
    return true;
  }
}

// Exponer el estado actual del modo
export function isUsingMock() {
  return useMock;
}
export function getDbRef() {
  return db;
}

export async function forceReseedDatabase() {
  await ensureReady();
  if (useMock) {
    localStorage.removeItem('sarahy_initialized');
    initMockStorage();
  } else {
    // Siembre real en Firestore
    await Seed.seedFirestore(db, collection, doc, setDoc);
  }
}
