// Servicio de Autenticación para Casa de Banquetes Sarahy
// Integrado con Firebase Auth y con soporte de simulación local.

import { firebaseConfig, USE_MOCK_DATA, loadConfig } from './config.js';
import { isUsingMock, saveUser, getUsers, getDbRef } from './db.js';

let auth = null;
let currentUser = null;
const listeners = new Set();

// Importaciones dinámicas de Firebase
let getAuthModule, signInWithEmailAndPassword, signOutModule, onAuthStateChanged, createUserWithEmailAndPassword;

async function initAuth() {
  const serverParams = await loadConfig();
  const activeConfig = serverParams.config;
  const isMock = serverParams.useMock;

  if (isMock) {
    console.log("Modo Auth: Simulador local.");
    // Cargar usuario persistido si existe
    const cached = localStorage.getItem('sarahy_current_user');
    if (cached && cached !== 'undefined') {
      try {
        currentUser = JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing current user:", e);
      }
    }
    // Asegurar cuentas demo en localStorage
    ensureDemoUsers();
    
    // Sincronizar usuarios desde el servidor asíncronamente
    getUsers().then(users => {
      if (currentUser) {
        const updatedMe = users.find(u => u.uid === currentUser.uid);
        if (updatedMe) {
          currentUser = updatedMe;
          localStorage.setItem('sarahy_current_user', JSON.stringify(currentUser));
          triggerListeners();
        }
      }
    }).catch(err => console.warn("No se pudieron sincronizar los usuarios al inicio:", err));
    
    triggerListeners();
    return;
  }

  try {
    const authModule = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    
    getAuthModule = authModule.getAuth;
    signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
    signOutModule = authModule.signOut;
    onAuthStateChanged = authModule.onAuthStateChanged;
    createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;

    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const app = initializeApp(activeConfig);
    auth = getAuthModule(app);

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Buscar el perfil de usuario en Firestore para obtener el rol
        try {
          const db = getDbRef();
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            currentUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userDoc.data()
            };
          } else {
            // Si el documento de perfil no existe, crear un rol por defecto de cliente
            const defaultProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || "Usuario Nuevo",
              role: "cliente",
              phone: ""
            };
            await saveUser(defaultProfile);
            currentUser = defaultProfile;
          }
        } catch (err) {
          console.error("Error al obtener perfil de usuario:", err);
          currentUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: "Usuario (Sin Perfil)",
            role: "cliente"
          };
        }
      } else {
        currentUser = null;
      }
      localStorage.setItem('sarahy_current_user', currentUser ? JSON.stringify(currentUser) : '');
      triggerListeners();
    });

  } catch (error) {
    console.warn("Fallo al inicializar Firebase Auth. Cayendo a modo simulador.", error);
    const cached = localStorage.getItem('sarahy_current_user');
    if (cached && cached !== 'undefined') {
      try {
        currentUser = JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing current user in fallback:", e);
      }
    }
    ensureDemoUsers();
    triggerListeners();
  }
}

// Inicializar
initAuth();

function ensureDemoUsers() {
  let users = [];
  try {
    const raw = localStorage.getItem('sarahy_users');
    users = raw ? JSON.parse(raw) : [];
  } catch (e) {
    users = [];
  }
  const demoAccounts = [
    { uid: "admin_user", email: "admin@sarahy.com", name: "Administrador Sarahy", role: "superadmin", phone: "3163048505" },
    { uid: "compras_user", email: "compras@sarahy.com", name: "Jefe de Compras", role: "compras", phone: "3007654321" },
    { uid: "cocina_user", email: "cocina@sarahy.com", name: "Chef Principal", role: "cocina", phone: "3011112222" },
    { uid: "logistica_user", email: "logistica@sarahy.com", name: "Coordinador de Logística", role: "logistica", phone: "3023334444" },
    { uid: "recreacion_user", email: "recreacion@sarahy.com", name: "Coordinador de Recreación", role: "recreacion", phone: "3035556666" },
    { uid: "decoracion_user", email: "decoracion@sarahy.com", name: "Coordinadora de Decoración", role: "decoracion", phone: "3047778888" },
    { uid: "cliente_user", email: "cliente@sarahy.com", name: "Sara y Felipe", role: "cliente", phone: "3059990000" }
  ];

  let changed = false;
  demoAccounts.forEach(demo => {
    if (!users.some(u => u.email === demo.email)) {
      users.push(demo);
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem('sarahy_users', JSON.stringify(users));
  }
}

function triggerListeners() {
  listeners.forEach(callback => callback(currentUser));
}

// API de Autenticación
export function onAuthChange(callback) {
  listeners.add(callback);
  callback(currentUser); // Llamado inmediato con estado actual
  return () => listeners.delete(callback);
}

export function getCurrentUser() {
  return currentUser;
}

export async function login(email, password) {
  if (isUsingMock()) {
    let users = [];
    try {
      users = await getUsers();
    } catch (e) {
      users = JSON.parse(localStorage.getItem('sarahy_users')) || [];
    }
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    const expectedPassword = user ? (user.password || "123456") : "123456";
    if (user && password === expectedPassword) {
      currentUser = user;
      localStorage.setItem('sarahy_current_user', JSON.stringify(currentUser));
      triggerListeners();
      return currentUser;
    } else if (user) {
      const demoTip = expectedPassword === "123456" ? " (Usa '123456' para demo)" : "";
      throw new Error(`Contraseña incorrecta${demoTip}`);
    } else {
      throw new Error("Usuario no encontrado en el simulador local.");
    }
  } else {
    // Firebase Real Login
    const creds = await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged se encargará de actualizar el usuario actual y disparar listeners
    return creds.user;
  }
}

export async function logout() {
  if (isUsingMock()) {
    currentUser = null;
    localStorage.removeItem('sarahy_current_user');
    triggerListeners();
    return true;
  } else {
    await signOutModule(auth);
    return true;
  }
}

// Registro de nuevos usuarios por parte del Administrador
// En Firebase Auth real, si queremos crear un usuario sin desloguearnos,
// podemos guardarlo en una colección 'pending_registrations' y crearlo mediante una función de Firebase,
// o crearlo directamente en la base de datos Firestore de usuarios.
// Para facilitar, cuando el admin crea un usuario, lo creamos en Firestore (o localStorage).
// Si el usuario decide entrar por primera vez, la app creará su cuenta en Firebase Auth automáticamente al intentar loguearse,
// o el administrador le pide que se registre con ese correo y hereda el rol.
// Vamos a implementar una función de registro directo en Firestore.
export async function registerNewUser(email, password, name, role, phone) {
  if (isUsingMock()) {
    const uid = 'u_' + Math.random().toString(36).substr(2, 9);
    const newUser = { uid, email, name, role, phone };
    await saveUser(newUser);
    return newUser;
  } else {
    // Si tenemos conexión Firebase, guardamos el perfil del usuario en Firestore.
    // El usuario se logueará o registrará en Firebase Auth usando este correo, y su perfil enlazará con este UID.
    // Para simplificar, creamos el usuario en Firebase Auth en segundo plano si es posible,
    // o simplemente creamos su perfil pre-asignado en Firestore usando el correo como clave (e.g. en la colección 'users' con id = correo).
    // Modificaremos la búsqueda de usuarios en db.js para buscar tanto por uid como por correo.
    const cleanEmail = email.toLowerCase().trim();
    const newUser = {
      uid: cleanEmail, // Usamos el correo como UID inicial hasta que se registre realmente en Auth
      email: cleanEmail,
      name,
      role,
      phone,
      createdAt: new Date().toISOString()
    };
    
    await saveUser(newUser);
    return newUser;
  }
}

export async function changeUserPassword(newPassword) {
  if (isUsingMock()) {
    if (!currentUser) throw new Error("No hay usuario autenticado.");
    
    // Guardar el password en el perfil del usuario
    currentUser.password = newPassword;
    
    // Guardarlo en local y en el servidor
    await saveUser(currentUser);
    
    // Guardar también en localStorage para el usuario actual
    localStorage.setItem('sarahy_current_user', JSON.stringify(currentUser));
    triggerListeners();
    return true;
  } else {
    // Firebase Real Change Password
    const authModule = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
    const updatePassword = authModule.updatePassword;
    if (!auth.currentUser) throw new Error("No hay usuario autenticado en Firebase.");
    
    await updatePassword(auth.currentUser, newPassword);
    
    // También guardarlo en Firestore en su documento de perfil
    currentUser.password = newPassword;
    await saveUser(currentUser);
    
    return true;
  }
}
