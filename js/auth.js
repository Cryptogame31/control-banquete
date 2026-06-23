// Servicio de Autenticación REST para Control Banquete

import { saveUser, getUsers } from './db.js';

let currentUser = null;
const listeners = new Set();

// Inicializar cargando desde LocalStorage
function initAuth() {
  const cached = localStorage.getItem('controlbanquete_current_user');
  if (cached) {
    try {
      currentUser = JSON.parse(cached);
    } catch (e) {
      console.error("Error parsing current user:", e);
    }
  }
  triggerListeners();
}

function triggerListeners() {
  listeners.forEach(callback => callback(currentUser));
}

export function onAuthChange(callback) {
  listeners.add(callback);
  callback(currentUser); 
  return () => listeners.delete(callback);
}

export function getCurrentUser() {
  return currentUser;
}

export async function login(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Contraseña incorrecta');
    }
    
    const data = await response.json();
    currentUser = data.user;
    localStorage.setItem('controlbanquete_current_user', JSON.stringify(currentUser));
    localStorage.setItem('controlbanquete_token', data.token);
    
    triggerListeners();
    return currentUser;
  } catch (error) {
    throw error;
  }
}

export async function logout() {
  currentUser = null;
  localStorage.removeItem('controlbanquete_current_user');
  localStorage.removeItem('controlbanquete_token');
  triggerListeners();
  return true;
}

export async function resetPassword(email) {
  throw new Error("El reseteo de contraseñas por email no está implementado en la migración a PostgreSQL. Por favor, solicita a un administrador que cambie tu contraseña desde el panel.");
}

export async function registerNewUser(email, password, name, role, phone) {
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role, phone })
    });
    
    if (!response.ok) {
      throw new Error('Error al registrar usuario');
    }
    
    const newUser = await response.json();
    return newUser;
  } catch (error) {
    console.error("Error al crear usuario en backend:", error);
    throw error;
  }
}

export async function changeUserPassword(newPassword) {
  if (!currentUser) throw new Error("No hay usuario autenticado.");
  
  // Enviar el nuevo password al servidor
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('controlbanquete_token')}`
      },
      body: JSON.stringify({ ...currentUser, password: newPassword })
    });

    if (!response.ok) {
      throw new Error('Error al cambiar contraseña');
    }
    
    return true;
  } catch(error) {
    throw error;
  }
}

initAuth();
