// Servicio de Base de Datos REST para Control Banquete
// Se conecta exclusivamente al backend Express + PostgreSQL

// Token de autenticación (se guardará tras login)
function getAuthToken() {
  return localStorage.getItem('controlbanquete_token');
}

// Helper para llamadas API
async function apiCall(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const token = getAuthToken();
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API responded with ${response.status}`);
  }
  return await response.json();
}

// --- CONFIGURACIÓN Y VALORES BASE ---
export async function getSettings() {
  return await apiCall('/api/settings');
}

export async function saveSettings(settings) {
  return await apiCall('/api/settings', 'POST', settings);
}

// --- PRODUCTOS Y SERVICIOS ---
export async function getProducts() {
  return await apiCall('/api/products');
}

export async function saveProduct(product) {
  return await apiCall('/api/products', 'POST', product);
}

export async function deleteProduct(productId, category, eventType) {
  const url = `/api/products/${productId}?category=${category}&eventType=${eventType || ''}`;
  await apiCall(url, 'DELETE');
  return true;
}

// --- COTIZACIONES ---
export async function getQuotations() {
  return await apiCall('/api/quotations');
}

export async function createQuotation(quotation) {
  return await apiCall('/api/quotations', 'POST', quotation);
}

export async function updateQuotationStatus(id, status) {
  return await apiCall(`/api/quotations/${id}`, 'PUT', { status });
}

export async function deleteQuotation(id) {
  await apiCall(`/api/quotations/${id}`, 'DELETE');
  return { success: true };
}

export async function updateQuotationDiscount(id, discount, discountLabel, discountPercent) {
  return await apiCall(`/api/quotations/${id}`, 'PUT', { discount, discountLabel, discountPercent });
}

// --- EVENTOS ---
export async function getEvents() {
  return await apiCall('/api/events');
}

export async function createEvent(event) {
  return await apiCall('/api/events', 'POST', event);
}

export async function updateEvent(id, eventData) {
  return await apiCall(`/api/events/${id}`, 'PUT', eventData);
}

// --- RECETARIO MAESTRO ---
export async function getRecipes() {
  return await apiCall('/api/recipes');
}

export async function saveRecipe(recipe) {
  return await apiCall('/api/recipes', 'POST', recipe);
}

export async function deleteRecipe(recipeId) {
  await apiCall(`/api/recipes/${recipeId}`, 'DELETE');
  return true;
}

// --- INVENTARIO ---
export async function getInventory() {
  return await apiCall('/api/inventory');
}

export async function updateInventoryItem(item) {
  return await apiCall('/api/inventory', 'POST', item);
}

export async function deleteInventoryItem(itemId) {
  await apiCall(`/api/inventory/${itemId}`, 'DELETE');
  return true;
}

// --- USUARIOS ---
export async function getUsers() {
  return await apiCall('/api/users');
}

export async function saveUser(user) {
  return await apiCall('/api/users', 'POST', user);
}

export async function deleteUser(uid) {
  await apiCall(`/api/users/${uid}`, 'DELETE');
  return true;
}

// Exponer el estado actual del modo (Para compatibilidad con UI actual)
export function isUsingMock() {
  return false;
}
export function getDbRef() {
  return null;
}

export async function forceReseedDatabase() {
  console.log("No es necesario reseeds en el cliente, la BD PostgreSQL lo maneja automáticamente en el backend.");
}

// --- PROVEEDORES ---
export async function getProviders() {
  return await apiCall('/api/providers');
}

export async function saveProvider(provider) {
  return await apiCall('/api/providers', 'POST', provider);
}

export async function deleteProvider(id) {
  await apiCall(`/api/providers/${id}`, 'DELETE');
  return true;
}

// --- NOTIFICACIONES ---
export async function getNotifications() {
  return await apiCall('/api/notifications');
}

export async function markNotificationRead(id) {
  return await apiCall('/api/notifications/read', 'POST', { id });
}

export async function markAllNotificationsRead() {
  return await apiCall('/api/notifications/read-all', 'POST');
}
