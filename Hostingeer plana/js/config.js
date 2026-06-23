// Interceptar parámetro secreto para desarrollo/local
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('demo')) {
  const isDemo = urlParams.get('demo') === 'true';
  localStorage.setItem('sarahy_force_mock', isDemo ? 'true' : 'false');
  // Limpiar el query string de la barra de direcciones
  const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
}

// Configuración de Firebase para Casa de Banquetes Sarahy
export const firebaseConfig = {
  apiKey: "AIzaSyCGGBg4xt-k9mhMzzkQMY87bvU4nW1mbXQ",
  authDomain: "sarahy-app.firebaseapp.com",
  projectId: "sarahy-app",
  storageBucket: "sarahy-app.firebasestorage.app",
  messagingSenderId: "856452793653",
  appId: "1:856452793653:web:ca398edaf98ca7f652f87c",
  measurementId: "G-0RSZ0NQPWH"
};

export const USE_MOCK_DATA = localStorage.getItem('sarahy_force_mock') === 'true' || false;

export const BASE_VERSIONS = {
  firebaseAppUrl: "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js",
  firebaseAuthUrl: "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js",
  firebaseFirestoreUrl: "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js",
  firebaseStorageUrl: "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js"
};

// Cargar configuración de forma asíncrona y segura
export async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const serverConfig = await response.json();
      return {
        config: {
          apiKey: serverConfig.apiKey,
          authDomain: serverConfig.authDomain,
          projectId: serverConfig.projectId,
          storageBucket: serverConfig.storageBucket,
          messagingSenderId: serverConfig.messagingSenderId,
          appId: serverConfig.appId,
          measurementId: serverConfig.measurementId
        },
        useMock: localStorage.getItem('sarahy_force_mock') === 'true' ? true : serverConfig.useMockData
      };
    }
  } catch (e) {
    console.log("No se pudo obtener la configuración del servidor, usando configuración local.");
  }
  return {
    config: firebaseConfig,
    useMock: USE_MOCK_DATA
  };
}
