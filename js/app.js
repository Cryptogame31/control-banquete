// Controlador Principal del Sistema de Gestión Integral Control Banquete
window.addEventListener('error', (event) => {
  console.error("Global Error: " + event.message + " in " + event.filename + ":" + event.lineno);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error("Unhandled Promise Rejection: " + event.reason);
});
import { onAuthChange, login, logout, registerNewUser, getCurrentUser, changeUserPassword, resetPassword } from './auth.js';
import * as DB from './db.js?v=2026_v2';

// ==========================================
// ESTADO GLOBAL DE LA SPA
// ==========================================
let currentRole = null;
let currentUserId = null;
let selectedTab = {};
let allProducts = { venues: [], photography: [], decoration: [], services: {} };
let allProviders = [];
let notificationInterval = null;
let allNotifications = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let signaturePad = null;
let countdownInterval = null;
let photoCountdownInterval = null;
let systemSettings = null;
let settingsAvailableColors = [];

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupRouting();
  setupEventListeners();
  loadCommonData();

  // Registrar Service Worker para PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Service Worker registrado con éxito:', reg.scope);
          
          // Detectar actualizaciones y forzar recarga
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('Nuevo contenido de PWA disponible; recargando...');
                    window.location.reload();
                  }
                }
              };
            }
          };
        })
        .catch(err => console.error('Error al registrar Service Worker:', err));
    });
  }

  // Lógica de banner de instalación PWA
  let deferredPrompt;
  const installBanner = document.getElementById('pwa-install-banner');
  const installActionBtn = document.getElementById('btn-pwa-install-action');
  const closeBannerBtn = document.getElementById('btn-pwa-close-banner');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBanner) {
      installBanner.style.display = 'block';
    }
  });

  if (installActionBtn) {
    installActionBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA instalada con resultado: ${outcome}`);
        deferredPrompt = null;
        if (installBanner) installBanner.style.display = 'none';
      }
    });
  }

  if (closeBannerBtn) {
    closeBannerBtn.addEventListener('click', () => {
      if (installBanner) {
        installBanner.style.display = 'none';
      }
    });
  }
  
  // Escuchar cambios de autenticación
  onAuthChange(async (user) => {
    updateNavigation(user);
    if (user) {
      currentRole = user.role;
      currentUserId = user.uid;

      // ── Verificar suscripción (solo superadmin es el titular del tenant) ──
      if (currentRole === 'superadmin') {
        try {
          const subStatus = await DB.getSubscriptionStatus();
          if (subStatus.status === 'expired') {
            window.location.href = '/subscription.html';
            return;
          }
          // Mostrar banner de trial si quedan ≤ 2 días
          if (subStatus.status === 'trial') {
            showTrialBanner(subStatus.daysLeft);
          }
        } catch(e) {
          console.warn('No se pudo verificar suscripción:', e);
        }
      }

      // Redirigir según el rol
      if (currentRole === 'cliente') {
        navigateTo('view-cliente');
      } else if (currentRole === 'superadmin') {
        navigateTo('view-admin');
      } else if (currentRole === 'compras') {
        navigateTo('view-compras');
      } else if (currentRole === 'cocina') {
        navigateTo('view-cocina');
      } else {
        // logística, recreación, decoración
        navigateTo('view-operativo');
      }
    } else {
      currentRole = null;
      currentUserId = null;
      if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
      if (photoCountdownInterval) { clearInterval(photoCountdownInterval); photoCountdownInterval = null; }
      stopNotificationPolling();
      const countdownBanner = document.getElementById('client-countdown-banner');
      if (countdownBanner) countdownBanner.style.display = 'none';
      hideTrialBanner();
      navigateTo('view-cotizar');
    }
  });
});

// ── Banner de prueba gratuita ──
function showTrialBanner(daysLeft) {
  let banner = document.getElementById('trial-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'trial-banner';
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      background: linear-gradient(90deg, #1a1200, #2a1e00, #1a1200);
      border-bottom: 1px solid rgba(255,207,75,0.3);
      padding: 0.6rem 1rem;
      display: flex; align-items: center; justify-content: center; gap: 1rem;
      font-family: var(--font-body, 'Outfit', sans-serif);
      font-size: 0.82rem; color: #ffcf4b;
      animation: slideDown 0.3s ease;
    `;
    document.body.style.paddingTop = '44px';
    document.body.prepend(banner);
  }
  banner.innerHTML = `
    <span>⏳ <strong>${daysLeft} día${daysLeft !== 1 ? 's' : ''}</strong> restante${daysLeft !== 1 ? 's' : ''} de prueba gratuita</span>
    <a href="subscription.html" style="background: #ffcf4b; color: #0a0a0f; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 100px; text-decoration: none; font-size: 0.78rem; white-space: nowrap;">
      Ver planes →
    </a>
  `;
}

function hideTrialBanner() {
  const banner = document.getElementById('trial-banner');
  if (banner) { banner.remove(); document.body.style.paddingTop = ''; }
}

function initTheme() {
  const savedTheme = localStorage.getItem('controlbanquete_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
  updateThemeToggleButtons(savedTheme);
}

function toggleTheme(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const isLight = document.body.classList.toggle('light-theme');
  const activeTheme = isLight ? 'light' : 'dark';
  localStorage.setItem('controlbanquete_theme', activeTheme);
  
  // Re-aplicar el tema dinámico para actualizar los colores de la paleta actual con el nuevo contraste
  if (systemSettings) {
    applyDynamicTheme({
      palette: systemSettings.themePalette,
      font: systemSettings.themeFont,
      fontSize: systemSettings.themeFontSize
    });
  }
  
  updateThemeToggleButtons(activeTheme);
}

function updateThemeToggleButtons(theme) {
  const lightIcons = document.querySelectorAll('.theme-icon-light');
  const darkIcons = document.querySelectorAll('.theme-icon-dark');
  const textLabels = document.querySelectorAll('.theme-toggle-text');
  
  if (theme === 'light') {
    lightIcons.forEach(el => el.style.display = 'inline-block');
    darkIcons.forEach(el => el.style.display = 'none');
    textLabels.forEach(el => el.textContent = 'Modo Noche');
  } else {
    lightIcons.forEach(el => el.style.display = 'none');
    darkIcons.forEach(el => el.style.display = 'inline-block');
    textLabels.forEach(el => el.textContent = 'Modo Día');
  }
}

function applyDynamicTheme(themeSettings) {
  if (!themeSettings) return;
  const root = document.documentElement;
  const isLight = document.body.classList.contains('light-theme');
  
  // 1. Paletas
  const palettes = isLight ? {
    gold: {
      color: '#c59b27',
      hover: '#a37d1d',
      glow: 'rgba(197, 155, 39, 0.15)',
      border: 'rgba(197, 155, 39, 0.12)'
    },
    emerald: {
      color: '#059669',
      hover: '#047857',
      glow: 'rgba(5, 150, 105, 0.15)',
      border: 'rgba(5, 150, 105, 0.12)'
    },
    sapphire: {
      color: '#2563eb',
      hover: '#1d4ed8',
      glow: 'rgba(37, 99, 235, 0.15)',
      border: 'rgba(37, 99, 235, 0.12)'
    },
    ruby: {
      color: '#dc2626',
      hover: '#b91c1c',
      glow: 'rgba(220, 38, 38, 0.15)',
      border: 'rgba(220, 38, 38, 0.12)'
    },
    rose: {
      color: '#db2777',
      hover: '#be185d',
      glow: 'rgba(219, 39, 119, 0.15)',
      border: 'rgba(219, 39, 119, 0.12)'
    }
  } : {
    gold: {
      color: '#ffcf4b',
      hover: '#ffe28a',
      glow: 'rgba(255, 207, 75, 0.25)',
      border: 'rgba(255, 207, 75, 0.08)'
    },
    emerald: {
      color: '#10b981',
      hover: '#34d399',
      glow: 'rgba(16, 185, 129, 0.25)',
      border: 'rgba(16, 185, 129, 0.08)'
    },
    sapphire: {
      color: '#3b82f6',
      hover: '#60a5fa',
      glow: 'rgba(59, 130, 246, 0.25)',
      border: 'rgba(59, 130, 246, 0.08)'
    },
    ruby: {
      color: '#e11d48',
      hover: '#fb7185',
      glow: 'rgba(225, 29, 72, 0.25)',
      border: 'rgba(225, 29, 72, 0.08)'
    },
    rose: {
      color: '#ec4899',
      hover: '#f472b6',
      glow: 'rgba(236, 72, 153, 0.25)',
      border: 'rgba(236, 72, 153, 0.08)'
    }
  };

  
  const p = palettes[themeSettings.palette] || palettes.gold;
  root.style.setProperty('--accent-gold', p.color);
  root.style.setProperty('--accent-gold-hover', p.hover);
  root.style.setProperty('--accent-gold-glow', p.glow);
  root.style.setProperty('--border-color', p.border);
  
  // 2. Tipografías
  const fonts = {
    outfit: "'Outfit', sans-serif",
    inter: "'Inter', sans-serif",
    montserrat: "'Montserrat', sans-serif",
    playfair: "'Playfair Display', Georgia, serif",
    cormorant: "'Cormorant Garamond', serif"
  };
  const fontVal = fonts[themeSettings.font] || fonts.outfit;
  root.style.setProperty('--font-body', fontVal);
  if (themeSettings.font === 'playfair' || themeSettings.font === 'cormorant') {
    root.style.setProperty('--font-title', fontVal);
  } else {
    root.style.setProperty('--font-title', "'Playfair Display', Georgia, serif");
  }
  
  // 3. Tamaño de fuente base
  root.style.setProperty('--base-font-size', themeSettings.fontSize || '16px');
}

// Cargar catálogos comunes al inicio
async function loadCommonData() {
  try {
    allProducts = await DB.getProducts();
    try {
      allProviders = await DB.getProviders();
    } catch (e) {
      console.error("Error al obtener proveedores:", e);
      allProviders = [];
    }
    systemSettings = await DB.getSettings();
    applyDynamicTheme({
      palette: systemSettings.themePalette,
      font: systemSettings.themeFont,
      fontSize: systemSettings.themeFontSize
    });
    populateCotizadorDropdowns();
    updateWhatsAppFloatingBtn();
    applyBrandingAndContract();

    // Mostrar u ocultar el selector demo según corresponda
    const demoSelector = document.getElementById('demo-auth-selector');
    if (demoSelector) {
      demoSelector.style.display = (localStorage.getItem('controlbanquete_force_mock') === 'true') ? 'block' : 'none';
    }
  } catch (err) {
    console.error("Error al cargar datos iniciales:", err);
  }
}

function getDirectDriveImageUrl(url) {
  if (!url) return '';
  url = url.trim();
  
  let fileId = '';
  // Formato 1: /file/d/FILE_ID/...
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch) {
    fileId = fileDMatch[1];
  } else {
    // Formato 2: ?id=FILE_ID o &id=FILE_ID
    const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch) {
      fileId = idParamMatch[1];
    }
  }
  
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }
  
  return url;
}

function applyBrandingAndContract() {
  const settings = systemSettings || {};
  const businessName = settings.businessName || 'Control Banquete';
  const businessSubtitle = settings.businessSubtitle || 'Gestión Integral';
  const businessLogoUrl = settings.businessLogoUrl || '';
  const contractText = settings.contractText || '';
  const directLogoUrl = getDirectDriveImageUrl(businessLogoUrl);

  // 1. Título de la pestaña
  document.title = `${businessSubtitle} ${businessName} - Sistema de Gestión Integral`;

  // 2. Logo e iniciales de Sidebar (Escritorio)
  const logoWrapper = document.getElementById('brand-logo-wrapper');
  if (logoWrapper) {
    if (directLogoUrl) {
      const img = document.createElement('img');
      img.src = directLogoUrl;
      img.style.maxHeight = '60px';
      img.style.maxWidth = '100%';
      img.style.objectFit = 'contain';
      img.style.borderRadius = '4px';
      img.onerror = () => {
        img.onerror = null;
        logoWrapper.innerHTML = `
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3h12l-1 9a5 5 0 0 1-10 0L6 3Z"/>
            <path d="M12 17v4"/>
            <path d="M8 21h8"/>
            <path d="M12 6V3"/>
            <circle cx="12" cy="9" r="1"/>
          </svg>
        `;
      };
      logoWrapper.innerHTML = '';
      logoWrapper.appendChild(img);
    } else {
      logoWrapper.innerHTML = `
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 3h12l-1 9a5 5 0 0 1-10 0L6 3Z"/>
          <path d="M12 17v4"/>
          <path d="M8 21h8"/>
          <path d="M12 6V3"/>
          <circle cx="12" cy="9" r="1"/>
        </svg>
      `;
    }
  }

  const sbTitle = document.getElementById('brand-sidebar-title');
  if (sbTitle) sbTitle.textContent = businessName.toUpperCase();

  const sbSub = document.getElementById('brand-sidebar-subtitle');
  if (sbSub) sbSub.textContent = businessSubtitle;

  // 3. Logo y título móvil (Cabecera)
  const mobileLogoWrapper = document.getElementById('brand-mobile-logo-wrapper');
  if (mobileLogoWrapper) {
    if (directLogoUrl) {
      const img = document.createElement('img');
      img.src = directLogoUrl;
      img.style.maxHeight = '28px';
      img.style.maxWidth = '100%';
      img.style.objectFit = 'contain';
      img.style.borderRadius = '2px';
      img.onerror = () => {
        img.onerror = null;
        mobileLogoWrapper.innerHTML = `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3h12l-1 9a5 5 0 0 1-10 0L6 3Z"/>
            <path d="M12 17v4"/>
            <path d="M8 21h8"/>
            <path d="M12 6V3"/>
            <circle cx="12" cy="9" r="1"/>
          </svg>
        `;
      };
      mobileLogoWrapper.innerHTML = '';
      mobileLogoWrapper.appendChild(img);
    } else {
      mobileLogoWrapper.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 3h12l-1 9a5 5 0 0 1-10 0L6 3Z"/>
          <path d="M12 17v4"/>
          <path d="M8 21h8"/>
          <path d="M12 6V3"/>
          <circle cx="12" cy="9" r="1"/>
        </svg>
      `;
    }
  }

  const mobTitle = document.getElementById('brand-mobile-title');
  if (mobTitle) mobTitle.textContent = businessName.toUpperCase();

  // 4. Banner de instalación PWA
  const bannerAppName = document.getElementById('install-banner-app-name');
  if (bannerAppName) bannerAppName.textContent = businessName;

  // 5. Contrato Legal en Portal del Cliente
  const contractContainer = document.getElementById('contrato-texto-container');
  if (contractContainer) {
    if (contractText) {
      contractContainer.innerHTML = contractText;
    } else {
      contractContainer.innerHTML = `
        <h4 style="text-align: center; margin-bottom: 1rem;">CONTRATO DE PRESTACIÓN DE SERVICIOS - BANQUETES ${businessName.toUpperCase()}</h4>
        <p>Entre los suscritos a saber, por una parte <strong>CASA DE BANQUETES ${businessName.toUpperCase()}</strong> y por otra parte el cliente cuyos datos constan en la cotización inicial, se conviene celebrar el presente acuerdo para la realización del evento social según las especificaciones indicadas.</p>
        <br>
        <p><strong>PRIMERO - OBJETO:</strong> La Casa de Banquetes ${businessName} se compromete a prestar los servicios de catering, menaje, meseros y logística en el salón especificado.</p>
        <p><strong>SEGUNDO - PRECIO:</strong> El valor acordado se cancelará en abonos sucesivos, debiendo estar saldo el 100% como mínimo 8 días antes del evento.</p>
        <p><strong>TERCERO - CANCELACIONES:</strong> En caso de fuerza mayor se buscará aplazar la fecha. De no realizarse el evento, el anticipo de reserva no es reembolsable.</p>
      `;
    }
  }
}

// Botón flotante de WhatsApp
function updateWhatsAppFloatingBtn() {
  const waBtn = document.getElementById('floating-whatsapp-btn');
  if (!waBtn) return;
  
  const user = getCurrentUser();
  if (!user) {
    const phone = (systemSettings && systemSettings.telefonoContacto1) || '3163048505';
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? '57' + cleanPhone : cleanPhone;
    waBtn.href = `https://wa.me/${formattedPhone}?text=Hola,%20quisiera%20recibir%20información%20sobre%20los%20banquetes%20y%20eventos.`;
    waBtn.style.display = 'flex';
  } else {
    waBtn.style.display = 'none';
  }
}

// ==========================================
// ENRUTAMIENTO (SPA VIEW SWITCHER)
// ==========================================
function navigateTo(viewId) {
  // Desactivar todas las vistas
  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.remove('active');
  });

  // Activar la seleccionada
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Activar link en el menú de escritorio
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    const link = item.querySelector('a');
    if (link && link.getAttribute('href') === `#${viewId}`) {
      item.classList.add('active');
    }
  });

  // Activar link en el menú móvil
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href') === `#${viewId}`) {
      item.classList.add('active');
    }
  });

  // Disparar carga de datos de la vista específica
  onViewLoaded(viewId);
}

function setupRouting() {
  // Bindeo de clicks de navegación
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.getAttribute('href') && link.getAttribute('href').startsWith('#view-')) {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      
      // Seguridad básica de roles
      const user = getCurrentUser();
      if (!user && targetId !== 'view-cotizar') {
        window.location.href = '/login.html';
      } else {
        navigateTo(targetId);
      }
    }
  });
}

// ==========================================
// DETECTORES DE CARGA DE VISTA
// ==========================================
function onViewLoaded(viewId) {
  const user = getCurrentUser();
  if (!user && viewId !== 'view-cotizar') return;

  switch (viewId) {
    case 'view-cotizar':
      refreshCotizadorForm();
      break;
    case 'view-cliente':
      loadClienteView();
      break;
    case 'view-admin':
      loadAdminView();
      break;
    case 'view-compras':
      loadComprasView();
      break;
    case 'view-cocina':
      loadCocinaView();
      break;
    case 'view-operativo':
      loadOperativoView();
      break;
  }
}

// ==========================================
// NAVEGACIÓN Y INTERFAZ DINÁMICA
// ==========================================
function updateNavigation(user) {
  const sidebarNav = document.getElementById('sidebar-nav-links');
  const mobileNav = document.getElementById('main-mobile-nav');
  const userPanel = document.getElementById('sidebar-user-panel');
  const navLoginBtn = document.getElementById('btn-nav-login');
  
  // Elementos de cabecera móvil
  const mobileUserActions = document.getElementById('mobile-user-actions-btn');
  const mobileInitials = document.getElementById('mobile-user-badge-initials');
  
  sidebarNav.innerHTML = '';
  mobileNav.innerHTML = '';
  
  if (user) {
    // Configurar panel de perfil (Escritorio)
    userPanel.style.display = 'block';
    if (navLoginBtn) navLoginBtn.style.display = 'none';
    document.getElementById('user-display-name').textContent = user.name;
    document.getElementById('user-display-role').textContent = translateRole(user.role);
    document.getElementById('user-avatar-initials').textContent = user.name.charAt(0).toUpperCase();

    // Configurar campana de notificaciones
    const bellBtn = document.getElementById('btn-notification-bell');
    if (bellBtn) {
      if (user.role === 'superadmin' || user.role === 'compras') {
        bellBtn.style.display = 'flex';
        checkNotifications();
        startNotificationPolling();
      } else {
        bellBtn.style.display = 'none';
        stopNotificationPolling();
      }
    }

    // Configurar cabecera móvil
    if (mobileUserActions && mobileInitials) {
      mobileUserActions.style.display = 'flex';
      mobileInitials.textContent = user.name.charAt(0).toUpperCase();
      
      // Limpiar listeners anteriores clonando el nodo
      const newActionsBtn = mobileUserActions.cloneNode(true);
      mobileUserActions.parentNode.replaceChild(newActionsBtn, mobileUserActions);
      
      newActionsBtn.addEventListener('click', async () => {
        if (confirm(`Hola ${user.name} (${translateRole(user.role)})\n\n¿Estás seguro de que deseas cerrar tu sesión?`)) {
          await logout();
        }
      });
    }

    // Generar enlaces por rol
    let links = [];
    
    if (user.role === 'superadmin') {
      links = [
        { id: 'view-admin', label: 'Administración', icon: '🏛️' },
        { id: 'view-compras', label: 'Compras', icon: '🛒' },
        { id: 'view-cocina', label: 'Cocina', icon: '🍳' },
        { id: 'view-operativo', label: 'Logística', icon: '📋' },
        { id: 'view-cotizar', label: 'Cotizar Evento', icon: '💰' }
      ];
    } else if (user.role === 'cliente') {
      links = [
        { id: 'view-cliente', label: 'Mi Evento', icon: '✨' },
        { id: 'view-cotizar', label: 'Cotizar Nuevo', icon: '💰' }
      ];
    } else if (user.role === 'compras') {
      links = [
        { id: 'view-compras', label: 'Compras', icon: '🛒' },
        { id: 'view-admin', label: 'Calendario', icon: '📅' }
      ];
    } else if (user.role === 'cocina') {
      links = [
        { id: 'view-cocina', label: 'Cocina', icon: '🍳' },
        { id: 'view-admin', label: 'Calendario', icon: '📅' }
      ];
    } else {
      // logística, decoración, recreación
      links = [
        { id: 'view-operativo', label: 'Operaciones', icon: '📋' },
        { id: 'view-admin', label: 'Calendario', icon: '📅' }
      ];
    }

    links.forEach(link => {
      // Sidebar link
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `<a href="#${link.id}"><span>${link.icon}</span> ${link.label}</a>`;
      sidebarNav.appendChild(li);

      // Mobile Bottom Nav link
      const mobA = document.createElement('a');
      mobA.href = `#${link.id}`;
      mobA.className = 'mobile-nav-item';
      mobA.innerHTML = `
        <span style="font-size:1.4rem;">${link.icon}</span>
        <span>${link.label}</span>
      `;
      mobileNav.appendChild(mobA);
    });

    // Agregar opción de Cerrar Sesión en mobile nav si está autenticado
    const logoutMobA = document.createElement('a');
    logoutMobA.href = '#';
    logoutMobA.className = 'mobile-nav-item';
    logoutMobA.style.color = '#feb2b2'; // Soft red
    logoutMobA.innerHTML = `
      <span style="font-size:1.4rem;">🚪</span>
      <span>Salir</span>
    `;
    logoutMobA.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm("¿Estás seguro de que deseas cerrar tu sesión?")) {
        await logout();
      }
    });
    mobileNav.appendChild(logoutMobA);

  } else {
    // Modo Público
    userPanel.style.display = 'none';
    if (navLoginBtn) navLoginBtn.style.display = 'block';

    stopNotificationPolling();
    const bellBtn = document.getElementById('btn-notification-bell');
    if (bellBtn) {
      bellBtn.style.display = 'none';
      const badge = document.getElementById('notification-badge');
      if (badge) badge.style.display = 'none';
    }

    if (mobileUserActions) {
      mobileUserActions.style.display = 'none';
    }

    const li = document.createElement('li');
    li.className = 'nav-item active';
    li.innerHTML = `<a href="#view-cotizar"><span>💰</span> Cotizar Evento</a>`;
    sidebarNav.appendChild(li);

    const mobA = document.createElement('a');
    mobA.href = '#view-cotizar';
    mobA.className = 'mobile-nav-item active';
    mobA.innerHTML = `
      <span style="font-size:1.4rem;">💰</span>
      <span>Cotizar</span>
    `;
    mobileNav.appendChild(mobA);
  }
  updateWhatsAppFloatingBtn();
}

function translateRole(role) {
  const roles = {
    superadmin: 'Super Admin',
    compras: 'Abastecimiento',
    cocina: 'Cocinero Chef',
    logistica: 'Logística',
    decoracion: 'Decoración',
    recreacion: 'Recreación',
    cliente: 'Cliente'
  };
  return roles[role] || role;
}

// ==========================================
// DETECTORES DE EVENTOS COMUNES
// ==========================================
function setupEventListeners() {
  // Enlace a login quitado de la navegación del cotizador principal

  initTheme();
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeToggleMobileBtn = document.getElementById('theme-toggle-mobile-btn');
  
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
  
  if (themeToggleMobileBtn) {
    themeToggleMobileBtn.addEventListener('click', toggleTheme);
  }

  // Buscador y filtros de usuarios
  const searchInput = document.getElementById('admin-users-search');
  const roleSelect = document.getElementById('admin-users-filter-role');
  const dateModeSelect = document.getElementById('admin-users-filter-date-mode');
  const dateStartInput = document.getElementById('admin-users-date-start');
  const dateEndInput = document.getElementById('admin-users-date-end');

  if (searchInput) {
    searchInput.addEventListener('input', renderAdminUsers);
  }
  if (roleSelect) {
    roleSelect.addEventListener('change', renderAdminUsers);
  }
  if (dateModeSelect) {
    dateModeSelect.addEventListener('change', () => {
      const mode = dateModeSelect.value;
      const rangeInputs = document.getElementById('admin-users-date-range-inputs');
      if (rangeInputs) {
        rangeInputs.style.display = (mode === 'custom') ? 'flex' : 'none';
      }
      renderAdminUsers();
    });
  }
  if (dateStartInput) {
    dateStartInput.addEventListener('input', renderAdminUsers);
  }
  if (dateEndInput) {
    dateEndInput.addEventListener('input', renderAdminUsers);
  }

  // Poblar links de cotizador y portal de clientes
  setupAdminLinks();

  // Logout buttons
  const btnLogoutSidebar = document.getElementById('btn-logout-sidebar');
  if (btnLogoutSidebar) {
    btnLogoutSidebar.addEventListener('click', async () => {
      await logout();
    });
  }

  // Autologin dropdown demo helper (solo en index.html si existiera)
  const selectDemoUser = document.getElementById('select-demo-user');
  if (selectDemoUser) {
    selectDemoUser.addEventListener('change', (e) => {
      const emailEl = document.getElementById('login-email');
      const passEl  = document.getElementById('login-password');
      if (emailEl) emailEl.value = e.target.value;
      if (passEl)  passEl.value  = '123456';
    });
  }

  // Tabs de navegación interna de vistas (Cliente, Admin, etc.)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const parentSection = e.target.closest('.view-section');
      const tabId = e.target.getAttribute('data-tab');
      // Deactivate all tab buttons in this section
      parentSection.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      // Hide all tab contents in this section
      parentSection.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      // Show the selected tab content
      const targetContent = document.getElementById(tabId);
      if (targetContent) {
        targetContent.style.display = 'block';
      }
      // Trigger specific render functions for admin tabs
      if (tabId === 'admin-calendar') {
        renderCalendar();
      } else if (tabId === 'admin-users') {
        renderAdminUsers();
      } else if (tabId === 'admin-quotes') {
        renderAdminQuotes();
      } else if (tabId === 'admin-events') {
        renderAdminEvents();
      } else if (tabId === 'admin-products') {
        renderAdminProducts();
      } else if (tabId === 'admin-providers') {
        renderAdminProviders();
      }
    });
  });
  

  // Cotizador Live Calculate
  const cotForm = document.getElementById('form-cotizador');
  if (!cotForm) return;
  cotForm.addEventListener('input', calculateLiveCotizacion);
  document.getElementById('cot-tipo').addEventListener('change', () => {
    populateCotizadorServices();
    calculateLiveCotizacion();
  });
  document.getElementById('cot-catering').addEventListener('change', () => {
    updatePhotoDecoDescriptions();
    calculateLiveCotizacion();
  });
  document.getElementById('cot-foto').addEventListener('change', () => {
    updatePhotoDecoDescriptions();
    calculateLiveCotizacion();
  });
  document.getElementById('cot-deco').addEventListener('change', () => {
    updatePhotoDecoDescriptions();
    calculateLiveCotizacion();
  });
  document.getElementById('cot-recreation').addEventListener('change', () => {
    updatePhotoDecoDescriptions();
    calculateLiveCotizacion();
  });

  // Enviar Cotización
  cotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Obtener valores seleccionados
    const guests = parseInt(document.getElementById('cot-invitados').value);
    const selectedVenueCard = document.querySelector('#cot-venues-grid .select-card.selected');
    
    if (!selectedVenueCard) {
      alert("Por favor, selecciona un salón para tu evento.");
      return;
    }
    
    const venueId = selectedVenueCard.getAttribute('data-id');
    const photographyId = document.getElementById('cot-foto').value;
    const decorationId = document.getElementById('cot-deco').value;
    const recreationId = document.getElementById('cot-recreation').value;
    
    const selectedServices = [];
    document.querySelectorAll('#cot-services-grid .select-card.selected').forEach(card => {
      const qtyAttr = card.getAttribute('data-qty');
      const qty = qtyAttr ? parseInt(qtyAttr) : 1;
      for (let i = 0; i < qty; i++) {
        selectedServices.push(card.getAttribute('data-id'));
      }
    });
    
    const baseSettings = await DB.getSettings();
    const cateringId = document.getElementById('cot-catering').value;
    const result = computePricingBreakdown(guests, venueId, photographyId, decorationId, selectedServices, baseSettings, cateringId, recreationId);
    
    const quotation = {
      clientName: document.getElementById('cot-nombre').value,
      clientEmail: document.getElementById('cot-email').value,
      clientPhone: document.getElementById('cot-telefono').value,
      eventType: document.getElementById('cot-tipo').value,
      date: document.getElementById('cot-fecha').value,
      guests: guests,
      venueId: venueId,
      photographyId: photographyId,
      decorationId: decorationId,
      cateringId: cateringId,
      recreationId: recreationId,
      selectedServices: selectedServices,
      totalValue: result.total,
      status: "nueva",
      notes: "Solicitud de cotización autogenerada."
    };
    
    try {
      await DB.createQuotation(quotation);
      alert("¡Cotización enviada con éxito! Una asesora comercial se pondrá en contacto pronto.");
      cotForm.reset();
      document.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
      calculateLiveCotizacion();
    } catch (err) {
      alert("Error al enviar cotización: " + err.message);
    }
  });

  // --- CLIENT EVENTS ---
  // Modificar invitados
  document.getElementById('btn-agregar-invitado').addEventListener('click', () => {
    document.getElementById('form-invitado-container').style.display = 'block';
    document.getElementById('guest-index').value = '';
    document.getElementById('guest-name').value = '';
    document.getElementById('guest-confirmed').checked = false;
  });
  document.getElementById('btn-cancelar-invitado').addEventListener('click', () => {
    document.getElementById('form-invitado-container').style.display = 'none';
  });
  document.getElementById('btn-guardar-invitado').addEventListener('click', saveGuest);
  
  // Guardar menú
  document.getElementById('form-menu-seleccion').addEventListener('submit', saveClientMenu);

  // Firma Digital Modal
  document.getElementById('btn-abrir-firma').addEventListener('click', openSignatureModal);
  document.getElementById('btn-cerrar-modal-firma').addEventListener('click', closeSignatureModal);
  document.getElementById('btn-limpiar-firma').addEventListener('click', clearSignatureCanvas);
  document.getElementById('btn-guardar-firma-contrato').addEventListener('click', saveContractSignature);

  // --- ADMIN EVENTS ---
  document.getElementById('btn-admin-crear-usuario').addEventListener('click', () => openUserModal());
  document.getElementById('btn-admin-crear-producto').addEventListener('click', () => openProductModal());
  document.getElementById('btn-admin-crear-evento').addEventListener('click', () => openEventModal());
  document.getElementById('btn-cerrar-modal-usuario').addEventListener('click', () => closeModel('modal-admin-usuario'));
  document.getElementById('btn-cerrar-modal-producto').addEventListener('click', () => closeModel('modal-admin-producto'));
  document.getElementById('btn-cerrar-modal-evento').addEventListener('click', () => closeModel('modal-admin-evento'));
  
  const evClienteSearch = document.getElementById('ev-cliente-search');
  if (evClienteSearch) {
    evClienteSearch.addEventListener('input', (e) => {
      renderClientSelectOptions(e.target.value);
    });
  }
  
  document.getElementById('form-admin-usuario').addEventListener('submit', saveAdminUser);
  document.getElementById('form-admin-producto').addEventListener('submit', saveAdminProduct);
  const pNombreInput = document.getElementById('p-nombre');
  if (pNombreInput) {
    pNombreInput.addEventListener('input', (e) => {
      // Solo auto-completar al crear un producto nuevo (sin ID de edicion)
      const editIdVal = document.getElementById('prod-edit-id').value;
      if (editIdVal !== '') return; 

      const name = e.target.value.trim();
      const matched = findProductInCatalogByName(name);
      if (matched) {
        // Rellenar datos basicos
        document.getElementById('p-precio').value = matched.price || '';
        document.getElementById('p-descripcion').value = matched.description || '';
        document.getElementById('p-info-url').value = matched.infoUrl || '';
        
        // Seleccionar categoria
        const catSelect = document.getElementById('p-categoria');
        if (catSelect) {
          catSelect.value = matched.category || 'service';
          catSelect.dispatchEvent(new Event('change'));
        }
        
        // Clonar renglones de lista de compras
        const listItemsContainer = document.getElementById('prod-shopping-list-items');
        if (listItemsContainer) {
          listItemsContainer.innerHTML = '';
          const shoppingList = matched.shoppingList || [];
          shoppingList.forEach(item => {
            addProductShoppingRow(item.name, item.quantity, item.unit, item.scaleWithGuests, item.supplier, item.purchaseInstructions);
          });
        }
        
        // Clonar renglones de lista de gestiones
        const managementItemsContainer = document.getElementById('prod-management-list-items');
        if (managementItemsContainer) {
          managementItemsContainer.innerHTML = '';
          const managementList = matched.managementList || [];
          managementList.forEach(item => {
            addProductManagementRow(item.task, item.assignTo);
          });
        }
      }
    });
  }
  document.getElementById('form-admin-evento').addEventListener('submit', saveAdminEvent);

  // --- ADMIN PROVIDERS EVENTS ---
  const btnCrearProv = document.getElementById('btn-admin-crear-proveedor');
  if (btnCrearProv) btnCrearProv.addEventListener('click', () => openProviderModal());
  const btnCerrarProv = document.getElementById('btn-cerrar-modal-proveedor');
  if (btnCerrarProv) btnCerrarProv.addEventListener('click', () => closeModel('modal-admin-proveedor'));
  const formProv = document.getElementById('form-admin-proveedor');
  if (formProv) formProv.addEventListener('submit', saveAdminProvider);
  const providersSearchInput = document.getElementById('admin-providers-search');
  if (providersSearchInput) {
    providersSearchInput.addEventListener('input', renderAdminProviders);
  }

  // --- NOTIFICATIONS EVENTS ---
  const btnBell = document.getElementById('btn-notification-bell');
  if (btnBell) btnBell.addEventListener('click', openNotificationsModal);
  const btnCerrarNotif = document.getElementById('btn-cerrar-modal-notifications');
  if (btnCerrarNotif) btnCerrarNotif.addEventListener('click', () => closeModel('modal-notifications'));
  const btnReadAll = document.getElementById('btn-notifications-read-all');
  if (btnReadAll) btnReadAll.addEventListener('click', markAllNotificationsRead);
  
  const btnReceivePhotos = document.getElementById('btn-admin-receive-photos');
  if (btnReceivePhotos) {
    btnReceivePhotos.addEventListener('click', () => {
      const inputLocked = document.getElementById('ev-photo-selection-locked');
      const isLocked = inputLocked.value === 'true';
      updateAdminReceivePhotosButton(!isLocked);
    });
  }
  document.getElementById('form-base-settings').addEventListener('submit', saveBaseSettings);

  // Change Password Modal Events
  const btnChangePass = document.getElementById('btn-change-password-sidebar');
  if (btnChangePass) {
    btnChangePass.addEventListener('click', () => {
      document.getElementById('ch-new-password').value = '';
      document.getElementById('ch-confirm-password').value = '';
      document.getElementById('modal-cambiar-contrasena').classList.add('active');
    });
  }
  
  const btnCloseChangePass = document.getElementById('btn-cerrar-modal-contrasena');
  if (btnCloseChangePass) {
    btnCloseChangePass.addEventListener('click', () => {
      document.getElementById('modal-cambiar-contrasena').classList.remove('active');
    });
  }
  
  const formChangePass = document.getElementById('form-cambiar-contrasena');
  if (formChangePass) {
    formChangePass.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPass = document.getElementById('ch-new-password').value;
      const confirmPass = document.getElementById('ch-confirm-password').value;
      
      if (newPass !== confirmPass) {
        alert("Las contraseñas no coinciden. Por favor verifica.");
        return;
      }
      
      try {
        await changeUserPassword(newPass);
        alert("Contraseña actualizada con éxito.");
        document.getElementById('modal-cambiar-contrasena').classList.remove('active');
      } catch (err) {
        alert("Error al cambiar contraseña: " + err.message);
      }
    });
  }

  const addColorBtn = document.getElementById('btn-setting-add-color');
  if (addColorBtn) {
    addColorBtn.addEventListener('click', () => {
      const input = document.getElementById('setting-new-color');
      const colorVal = input.value.trim();
      if (colorVal && !settingsAvailableColors.includes(colorVal)) {
        settingsAvailableColors.push(colorVal);
        renderColorChips(settingsAvailableColors);
        input.value = '';
      }
    });
  }

  const newColorInput = document.getElementById('setting-new-color');
  if (newColorInput) {
    newColorInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (addColorBtn) addColorBtn.click();
      }
    });
  }

  const catalogFilter = document.getElementById('admin-catalog-filter');
  if (catalogFilter) {
    catalogFilter.addEventListener('change', renderAdminProducts);
  }

  const addCustomSettingBtn = document.getElementById('btn-setting-agregar-custom');
  if (addCustomSettingBtn) {
    addCustomSettingBtn.addEventListener('click', () => addCustomSettingRow());
  }

  // Categorías de producto
  document.getElementById('p-categoria').addEventListener('change', (e) => {
    const container = document.getElementById('p-event-type-container');
    if (e.target.value === 'service') {
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
  });

  // Manejo interactivo de los checkboxes de tipo de evento en el modal de productos
  const pEvtTodos = document.getElementById('p-evt-todos');
  if (pEvtTodos) {
    pEvtTodos.addEventListener('change', (e) => {
      if (e.target.checked) {
        // Desmarcar todos los individuales
        document.querySelectorAll('.p-evt-single').forEach(cb => cb.checked = false);
      }
    });
  }

  document.querySelectorAll('.p-evt-single').forEach(cb => {
    cb.addEventListener('change', (e) => {
      if (e.target.checked && pEvtTodos) {
        // Si se marca un tipo de evento individual, desmarcar "Todos"
        pEvtTodos.checked = false;
      }
    });
  });

  const addProdInsumoBtn = document.getElementById('btn-prod-agregar-insumo');
  if (addProdInsumoBtn) {
    addProdInsumoBtn.addEventListener('click', () => addProductShoppingRow());
  }

  const addProdGestionBtn = document.getElementById('btn-prod-agregar-gestion');
  if (addProdGestionBtn) {
    addProdGestionBtn.addEventListener('click', () => addProductManagementRow());
  }

  // Cambio de tipo de evento en modal creación/edición
  document.getElementById('ev-tipo').addEventListener('change', (e) => {
    populateAdminEventServices(e.target.value, []);
  });

  // Buscador y filtros de eventos
  const eventsSearchInput = document.getElementById('admin-events-search');
  const eventsDateModeSelect = document.getElementById('admin-events-filter-date-mode');
  const eventsDateStartInput = document.getElementById('admin-events-date-start');
  const eventsDateEndInput = document.getElementById('admin-events-date-end');

  if (eventsSearchInput) {
    eventsSearchInput.addEventListener('input', renderAdminEvents);
  }
  if (eventsDateModeSelect) {
    eventsDateModeSelect.addEventListener('change', () => {
      const mode = eventsDateModeSelect.value;
      const rangeInputs = document.getElementById('admin-events-date-range-inputs');
      if (rangeInputs) {
        rangeInputs.style.display = (mode === 'custom') ? 'flex' : 'none';
      }
      renderAdminEvents();
    });
  }
  if (eventsDateStartInput) {
    eventsDateStartInput.addEventListener('input', renderAdminEvents);
  }
  if (eventsDateEndInput) {
    eventsDateEndInput.addEventListener('input', renderAdminEvents);
  }

  const eventsPhotoStatusSelect = document.getElementById('admin-events-filter-photo-status');
  if (eventsPhotoStatusSelect) {
    eventsPhotoStatusSelect.addEventListener('change', renderAdminEvents);
  }

  // Buscador y filtros de cotizaciones
  const quotesSearchInput = document.getElementById('admin-quotes-search');
  const quotesEventTypeSelect = document.getElementById('admin-quotes-filter-event-type');
  const quotesDateModeSelect = document.getElementById('admin-quotes-filter-date-mode');
  const quotesDateStartInput = document.getElementById('admin-quotes-date-start');
  const quotesDateEndInput = document.getElementById('admin-quotes-date-end');

  if (quotesSearchInput) {
    quotesSearchInput.addEventListener('input', renderAdminQuotes);
  }
  if (quotesEventTypeSelect) {
    quotesEventTypeSelect.addEventListener('change', renderAdminQuotes);
  }
  if (quotesDateModeSelect) {
    quotesDateModeSelect.addEventListener('change', () => {
      const mode = quotesDateModeSelect.value;
      const rangeInputs = document.getElementById('admin-quotes-date-range-inputs');
      if (rangeInputs) {
        rangeInputs.style.display = (mode === 'custom') ? 'flex' : 'none';
      }
      renderAdminQuotes();
    });
  }
  if (quotesDateStartInput) {
    quotesDateStartInput.addEventListener('input', renderAdminQuotes);
  }
  if (quotesDateEndInput) {
    quotesDateEndInput.addEventListener('input', renderAdminQuotes);
  }

  // Calendario Navegación
  document.getElementById('cal-prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });
  document.getElementById('cal-next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  // --- COCINA EVENTS ---
  document.getElementById('btn-cocina-crear-receta').addEventListener('click', () => openRecipeModal());
  document.getElementById('btn-cerrar-modal-receta').addEventListener('click', () => closeModel('modal-cocina-receta'));
  document.getElementById('btn-rec-agregar-ingrediente').addEventListener('click', () => addRecipeIngredientRow());
  document.getElementById('form-cocina-receta').addEventListener('submit', saveCocinaRecipe);
  document.getElementById('btn-cocina-editar-receta').addEventListener('click', editActiveRecipe);
  document.getElementById('btn-cocina-eliminar-receta').addEventListener('click', deleteActiveRecipe);
  document.getElementById('cocina-escalar-invitados').addEventListener('input', scaleRecipeDetails);

  // --- COMPRAS EVENTS ---
  document.getElementById('btn-compras-nuevo-item').addEventListener('click', () => openInventoryModal());
  document.getElementById('btn-cerrar-modal-item').addEventListener('click', () => closeModel('modal-compras-item'));
  document.getElementById('form-compras-item').addEventListener('submit', saveInventoryItem);
  document.getElementById('btn-compras-calcular').addEventListener('click', calculateAutomatedPurchase);
  
  // --- OPERATIVO EVENTS ---
  document.getElementById('op-select-evento').addEventListener('change', loadOperativoDetails);

  // --- COTIZADOR EVENTS ---
  document.getElementById('btn-descargar-cotizacion').addEventListener('click', triggerDownloadLiveQuotation);
  document.getElementById('btn-check-availability').addEventListener('click', checkVenueAvailability);

  // --- RESET DB EVENT ---
  document.getElementById('btn-admin-reseed-db').addEventListener('click', async () => {
    if (confirm("¿Estás seguro de que deseas re-sembrar y restaurar los valores iniciales de la base de datos? Se borrarán los cambios locales o registros de Firestore actuales.")) {
      try {
        await DB.forceReseedDatabase();
        alert("¡Base de datos restaurada correctamente! La página se recargará para aplicar los cambios.");
        window.location.reload();
      } catch (err) {
        alert("Error al restaurar base de datos: " + err.message);
      }
    }
  });
}

// Helper genérico para cerrar Modales
function closeModel(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// ==========================================
// MÓDULO 1: COTIZADOR PÚBLICO
// ==========================================
function refreshCotizadorForm() {
  allProducts = DB.getProducts().then(prods => {
    allProducts = prods;
    populateCotizadorDropdowns();
    populateCotizadorServices();
    calculateLiveCotizacion();
  });
}

function populateCotizadorDropdowns() {
  // 1. Salones
  const venuesGrid = document.getElementById('cot-venues-grid');
  venuesGrid.innerHTML = '';
  
  allProducts.venues.forEach(v => {
    const card = document.createElement('div');
    card.className = 'select-card';
    card.setAttribute('data-id', v.id);
    card.setAttribute('data-price', v.price);
    card.innerHTML = `
      <div class="select-card-name">${v.name}</div>
      ${v.description ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem; line-height:1.2;">${v.description}</div>` : ''}
      <div class="select-card-price" style="margin-bottom:0.4rem;">$${v.price.toLocaleString()} COP</div>
      ${v.infoUrl ? `<div style="font-size:0.75rem; margin-top:0.4rem;" onclick="event.stopPropagation()"><a href="${v.infoUrl}" target="_blank" style="color:var(--accent-gold); text-decoration:underline;">Más información</a></div>` : ''}
    `;
    card.addEventListener('click', () => {
      // Toggle selección única
      venuesGrid.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      calculateLiveCotizacion();
    });
    venuesGrid.appendChild(card);
  });

  // Seleccionar primer salón por defecto
  if (venuesGrid.children.length > 0) {
    venuesGrid.children[0].classList.add('selected');
  }

  // 1.5. Alimentación
  const cateringSelect = document.getElementById('cot-catering');
  if (cateringSelect) {
    cateringSelect.innerHTML = '<option value="none">Sin Alimentación (No incluye comida/bebida)</option>';
    if (allProducts.catering && Array.isArray(allProducts.catering)) {
      allProducts.catering.forEach(p => {
        cateringSelect.innerHTML += `<option value="${p.id}">${p.name} (+$${p.price.toLocaleString()} COP/persona)</option>`;
      });
    }
  }

  // 2. Fotografía
  const fotoSelect = document.getElementById('cot-foto');
  fotoSelect.innerHTML = '<option value="">Sin Fotografía</option>';
  allProducts.photography.forEach(p => {
    fotoSelect.innerHTML += `<option value="${p.id}">${p.name} (+$${p.price.toLocaleString()} COP)</option>`;
  });

  // 2.5. Recreación
  const recreationSelect = document.getElementById('cot-recreation');
  if (recreationSelect) {
    recreationSelect.innerHTML = '<option value="">Sin Recreación</option>';
    if (allProducts.recreation && Array.isArray(allProducts.recreation)) {
      allProducts.recreation.forEach(p => {
        recreationSelect.innerHTML += `<option value="${p.id}">${p.name} (+$${p.price.toLocaleString()} COP)</option>`;
      });
    }
  }

  // 3. Decoración
  const decoSelect = document.getElementById('cot-deco');
  decoSelect.innerHTML = '<option value="">Sin Decoración</option>';
  allProducts.decoration.forEach(d => {
    decoSelect.innerHTML += `<option value="${d.id}">${d.name} (+$${d.price.toLocaleString()} COP)</option>`;
  });

  updatePhotoDecoDescriptions();
}

function updatePhotoDecoDescriptions() {
  const cateringSelectVal = document.getElementById('cot-catering')?.value || 'none';
  const photoId = document.getElementById('cot-foto').value;
  const decoId = document.getElementById('cot-deco').value;
  const recreationId = document.getElementById('cot-recreation')?.value || '';
  
  const catering = allProducts.catering ? allProducts.catering.find(p => p.id === cateringSelectVal) : null;
  const photo = allProducts.photography.find(p => p.id === photoId);
  const deco = allProducts.decoration.find(d => d.id === decoId);
  const recreation = allProducts.recreation ? allProducts.recreation.find(p => p.id === recreationId) : null;
  
  const cateringDescContainer = document.getElementById('cot-catering-descripcion');
  if (cateringDescContainer) {
    if (catering) {
      let html = catering.description || '';
      if (catering.infoUrl && catering.infoUrl.trim() !== '') {
        html += ` <a href="${catering.infoUrl}" target="_blank" style="color:var(--accent-gold); text-decoration:underline; font-size:0.75rem; margin-left:0.5rem; display:inline-block;">Más información</a>`;
      }
      cateringDescContainer.innerHTML = html;
    } else {
      cateringDescContainer.innerHTML = 'Sin servicio de catering contratado.';
    }
  }

  const recreationDescContainer = document.getElementById('cot-recreation-descripcion');
  if (recreationDescContainer) {
    if (recreation) {
      let html = recreation.description || '';
      if (recreation.infoUrl && recreation.infoUrl.trim() !== '') {
        html += ` <a href="${recreation.infoUrl}" target="_blank" style="color:var(--accent-gold); text-decoration:underline; font-size:0.75rem; margin-left:0.5rem; display:inline-block;">Más información</a>`;
      }
      recreationDescContainer.innerHTML = html;
    } else {
      recreationDescContainer.innerHTML = '';
    }
  }

  const photoDescContainer = document.getElementById('cot-foto-descripcion');
  if (photo) {
    let html = photo.description || '';
    if (photo.infoUrl && photo.infoUrl.trim() !== '') {
      html += ` <a href="${photo.infoUrl}" target="_blank" style="color:var(--accent-gold); text-decoration:underline; font-size:0.75rem; margin-left:0.5rem; display:inline-block;">Más información</a>`;
    }
    photoDescContainer.innerHTML = html;
  } else {
    photoDescContainer.innerHTML = '';
  }
  
  const decoDescContainer = document.getElementById('cot-deco-descripcion');
  if (deco) {
    let html = deco.description || '';
    if (deco.infoUrl && deco.infoUrl.trim() !== '') {
      html += ` <a href="${deco.infoUrl}" target="_blank" style="color:var(--accent-gold); text-decoration:underline; font-size:0.75rem; margin-left:0.5rem; display:inline-block;">Más información</a>`;
    }
    decoDescContainer.innerHTML = html;
  } else {
    decoDescContainer.innerHTML = '';
  }
}

function populateCotizadorServices() {
  const eventType = document.getElementById('cot-tipo').value;
  const servicesGrid = document.getElementById('cot-services-grid');
  servicesGrid.innerHTML = '';

  const list = allProducts.services[eventType] || [];
  
  list.forEach(s => {
    const card = document.createElement('div');
    card.className = 'select-card';
    card.setAttribute('data-id', s.id);
    card.setAttribute('data-price', s.price);
    
    const hasQuantity = s.allowMultiples === true;
    
    if (hasQuantity) {
      card.setAttribute('data-has-qty', 'true');
      card.setAttribute('data-qty', '0');
      card.innerHTML = `
        <div class="select-card-name">${s.name}</div>
        ${s.description ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem; line-height:1.2;">${s.description}</div>` : ''}
        <div class="select-card-price" style="margin-bottom:0.5rem;">+$${s.price.toLocaleString()} COP</div>
        ${s.infoUrl ? `<div style="font-size:0.75rem; margin-bottom:0.5rem;" onclick="event.stopPropagation()"><a href="${s.infoUrl}" target="_blank" style="color:var(--accent-gold); text-decoration:underline;">Más información</a></div>` : ''}
        <div class="qty-controller" onclick="event.stopPropagation()">
          <button type="button" class="btn-qty-minus">-</button>
          <span class="qty-display">0</span>
          <button type="button" class="btn-qty-plus">+</button>
        </div>
      `;
      
      const updateQty = (newQty) => {
        card.setAttribute('data-qty', newQty.toString());
        card.querySelector('.qty-display').textContent = newQty;
        if (newQty > 0) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
        calculateLiveCotizacion();
      };
      
      card.addEventListener('click', () => {
        const currentQty = parseInt(card.getAttribute('data-qty') || '0');
        if (currentQty > 0) {
          updateQty(0);
        } else {
          updateQty(1);
        }
      });
      
      card.querySelector('.btn-qty-minus').addEventListener('click', (e) => {
        e.stopPropagation();
        const currentQty = parseInt(card.getAttribute('data-qty') || '0');
        if (currentQty > 0) updateQty(currentQty - 1);
      });
      
      card.querySelector('.btn-qty-plus').addEventListener('click', (e) => {
        e.stopPropagation();
        const currentQty = parseInt(card.getAttribute('data-qty') || '0');
        updateQty(currentQty + 1);
      });
      
    } else {
      card.innerHTML = `
        <div class="select-card-name">${s.name}</div>
        ${s.description ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem; line-height:1.2;">${s.description}</div>` : ''}
        <div class="select-card-price">+$${s.price.toLocaleString()} COP</div>
        ${s.infoUrl ? `<div style="font-size:0.75rem; margin-top:0.4rem;" onclick="event.stopPropagation()"><a href="${s.infoUrl}" target="_blank" style="color:var(--accent-gold); text-decoration:underline;">Más información</a></div>` : ''}
      `;
      card.addEventListener('click', () => {
        card.classList.toggle('selected');
        calculateLiveCotizacion();
      });
    }
    
    servicesGrid.appendChild(card);
  });
}

// Motor de Cálculo Principal
function computePricingBreakdown(guests, venueId, photographyId, decorationId, selectedServicesIds, settings, cateringId = null, recreationId = null) {
  guests = Math.max(10, guests);
  
  // Fórmulas del Excel
  const costoMeseroVal = settings.costoMesero !== undefined ? settings.costoMesero : 110000;
  const meseros = Math.ceil(guests / 35);
  const costoMeseros = meseros * costoMeseroVal;
  
  let costoAlimentacion = 0;
  let descripcionAlimentacion = 'Sin servicio de catering';
  let selectedCateringPlanName = 'Sin Alimentación';

  if (cateringId !== undefined && cateringId !== null) {
    if (cateringId === 'none' || cateringId === 'ninguno' || cateringId === '') {
      costoAlimentacion = 0;
      descripcionAlimentacion = 'No incluye servicio de alimentación.';
      selectedCateringPlanName = 'Sin Alimentación';
    } else {
      const selectedPlan = allProducts.catering ? allProducts.catering.find(p => p.id === cateringId || p.name === cateringId) : null;
      if (selectedPlan) {
        costoAlimentacion = guests * selectedPlan.price;
        descripcionAlimentacion = selectedPlan.description || selectedPlan.name;
        selectedCateringPlanName = selectedPlan.name;
      } else {
        costoAlimentacion = 0;
        descripcionAlimentacion = 'Plan de catering no encontrado.';
        selectedCateringPlanName = 'No encontrado';
      }
    }
  } else {
    // Fallback legacy global
    const costoAlimentacionVal = settings.costoAlimentacion !== undefined ? settings.costoAlimentacion : 36000;
    costoAlimentacion = guests * costoAlimentacionVal;
    descripcionAlimentacion = settings.descripcionAlimentacion || 'Servicio de Catering Básico';
    selectedCateringPlanName = 'Catering Estándar';
  }
  
  // Buscar Precios
  const venue = allProducts.venues.find(v => v.id === venueId);
  const venuePrice = venue ? venue.price : 0;
  
  const photo = allProducts.photography.find(p => p.id === photographyId);
  const photoPrice = photo ? photo.price : 0;
  
  const deco = allProducts.decoration.find(d => d.id === decorationId);
  const decoPrice = deco ? deco.price : 0;

  const recreation = allProducts.recreation ? allProducts.recreation.find(r => r.id === recreationId) : null;
  const recreationPrice = recreation ? recreation.price : 0;
  
  let servicesSum = 0;
  const servicesList = [];
  
  // Buscar en todos los tipos de servicios
  const allServices = [];
  Object.keys(allProducts.services).forEach(key => {
    allServices.push(...allProducts.services[key]);
  });
  
  selectedServicesIds.forEach(id => {
    const service = allServices.find(s => s.id === id);
    if (service) {
      servicesSum += service.price;
      servicesList.push(service);
    }
  });

  // Calcular cobros personalizados dinámicos
  let customChargesSum = 0;
  const customChargesList = [];
  if (settings.customSettings && Array.isArray(settings.customSettings)) {
    settings.customSettings.forEach(cs => {
      if (cs.type === 'text') return;
      const labelLower = cs.label.toLowerCase();
      if (labelLower.includes('mesero') || labelLower.includes('alimentación') || labelLower.includes('alimentacion')) {
        return;
      }
      let cost = parseFloat(cs.value) || 0;
      if (cs.type === 'per_person') {
        cost = cost * guests;
      }
      customChargesSum += cost;
      customChargesList.push({ label: cs.label, price: cs.value, totalCost: cost, type: cs.type });
    });
  }

  const total = costoMeseros + costoAlimentacion + venuePrice + photoPrice + decoPrice + recreationPrice + servicesSum + customChargesSum;

  return {
    meseros,
    costoMeseros,
    costoAlimentacion,
    descripcionAlimentacion,
    selectedCateringPlanName,
    venueName: venue ? venue.name : 'No Seleccionado',
    venuePrice,
    photoPrice,
    decoPrice,
    recreationPrice,
    recreationId,
    servicesSum,
    customChargesSum,
    customChargesList,
    total,
    venueId,
    photoId: photographyId,
    decorationId
  };
}

async function calculateLiveCotizacion() {
  const guests = parseInt(document.getElementById('cot-invitados').value) || 0;
  const selectedVenueCard = document.querySelector('#cot-venues-grid .select-card.selected');
  const venueId = selectedVenueCard ? selectedVenueCard.getAttribute('data-id') : null;
  const cateringId = document.getElementById('cot-catering')?.value || 'none';
  const photographyId = document.getElementById('cot-foto').value;
  const decorationId = document.getElementById('cot-deco').value;
  const recreationId = document.getElementById('cot-recreation')?.value || '';
  
  const selectedServices = [];
  document.querySelectorAll('#cot-services-grid .select-card.selected').forEach(card => {
    const qtyAttr = card.getAttribute('data-qty');
    const qty = qtyAttr ? parseInt(qtyAttr) : 1;
    for (let i = 0; i < qty; i++) {
      selectedServices.push(card.getAttribute('data-id'));
    }
  });

  const settings = await DB.getSettings();
  const res = computePricingBreakdown(guests, venueId, photographyId, decorationId, selectedServices, settings, cateringId, recreationId);

  // Actualizar descripción de alimentación debajo del contador de invitados
  document.getElementById('cot-catering-desc').textContent = res.selectedCateringPlanName ? 'Plan seleccionado: ' + res.selectedCateringPlanName : '';

  let customChargesHtml = '';
  if (res.customChargesList && res.customChargesList.length > 0) {
    res.customChargesList.forEach(cc => {
      const scaleLabel = cc.type === 'per_person' ? ' (x persona)' : '';
      customChargesHtml += `
        <div class="summary-row">
          <span>${cc.label}${scaleLabel}</span>
          <span>$${cc.totalCost.toLocaleString()} COP</span>
        </div>
      `;
    });
  }

  // Inyectar el HTML del resumen
  const breakdownDiv = document.getElementById('cot-summary-breakdown');
  breakdownDiv.innerHTML = `
    <div class="summary-row">
      <span>Invitados</span>
      <span class="accent">${guests} personas</span>
    </div>
    <div class="summary-row">
      <span>Meseros requeridos (${res.meseros})</span>
      <span>$${res.costoMeseros.toLocaleString()} COP</span>
    </div>
    <div class="summary-row" style="flex-direction:column; align-items:flex-start; gap:0.25rem; ${res.costoAlimentacion === 0 ? 'display:none;' : ''}">
      <div style="display:flex; justify-content:space-between; width:100%;">
        <span>Banquete (${res.selectedCateringPlanName || 'Alimentación'})</span>
        <span>$${res.costoAlimentacion.toLocaleString()} COP</span>
      </div>
      ${res.descripcionAlimentacion ? `<span style="font-size:0.75rem; color:var(--text-secondary); line-height:1.2;">${res.descripcionAlimentacion}</span>` : ''}
    </div>
    <div class="summary-row">
      <span>Salón (${res.venueName})</span>
      <span>$${res.venuePrice.toLocaleString()} COP</span>
    </div>
    <div class="summary-row">
      <span>Fotografía</span>
      <span>$${res.photoPrice.toLocaleString()} COP</span>
    </div>
    <div class="summary-row">
      <span>Decoración</span>
      <span>$${res.decoPrice.toLocaleString()} COP</span>
    </div>
    <div class="summary-row" style="${res.recreationPrice === 0 ? 'display:none;' : ''}">
      <span>Recreación</span>
      <span>$${res.recreationPrice.toLocaleString()} COP</span>
    </div>
    <div class="summary-row">
      <span>Servicios adicionales</span>
      <span>$${res.servicesSum.toLocaleString()} COP</span>
    </div>
    ${customChargesHtml}
    <div class="summary-row total">
      <span>TOTAL ESTIMADO</span>
      <span>$${res.total.toLocaleString()} COP</span>
    </div>
    <p style="font-size:0.75rem; color:var(--text-muted); margin-top:1.5rem; text-align:center; line-height:1.2;">
      * Este es un presupuesto preliminar no vinculante. Los meseros se calculan automáticamente (1 mesero cada 35 invitados).
    </p>
  `;
}

// ==========================================
// MÓDULO 2: SOY CLIENTE
// ==========================================
let activeClientEvents = [];
let selectedClientEvent = null;

async function loadClienteView() {
  const events = await DB.getEvents();
  // Filtrar eventos asociados al cliente actual
  activeClientEvents = events.filter(e => e.clientId === currentUserId || e.clientEmail === getCurrentUser().email);
  
  const selectorContainer = document.getElementById('client-event-selector-container');
  const selector = document.getElementById('client-event-select');
  
  if (activeClientEvents.length === 0) {
    document.getElementById('client-event-name').textContent = "No tienes ningún evento agendado aún.";
    // Ocultar tabs si no hay eventos
    document.querySelector('#view-cliente .tab-container').style.display = 'none';
    document.getElementById('client-info').innerHTML = `<div class="card"><p style="text-align:center;">Por favor, comunícate con la administración para que te asignen tu evento.</p></div>`;
    return;
  }
  
  document.querySelector('#view-cliente .tab-container').style.display = 'flex';
  
  if (activeClientEvents.length > 1) {
    selectorContainer.style.display = 'flex';
    selector.innerHTML = '';
    activeClientEvents.forEach((ev, idx) => {
      selector.innerHTML += `<option value="${ev.id}">${translateEventType(ev.eventType)} - ${ev.date}</option>`;
    });
    
    selector.addEventListener('change', (e) => {
      selectedClientEvent = activeClientEvents.find(ev => ev.id === e.target.value);
      renderActiveClientEvent();
    });
    selectedClientEvent = activeClientEvents[0];
  } else {
    selectorContainer.style.display = 'none';
    selectedClientEvent = activeClientEvents[0];
  }
  
  renderActiveClientEvent();
}

function translateEventType(type) {
  if (!type) return '';
  const map = {
    boda: 'Boda',
    quinces: 'Quinces',
    grados_otros: 'Grados/Otros',
    comuniones: 'Primera Comunión',
    todos: 'Todos los eventos',
    fiesta_infantil: 'Fiesta Infantil',
    empresarial: 'Evento Empresarial'
  };
  if (type.includes(',')) {
    return type.split(',').map(t => map[t.trim()] || t.trim()).join(', ');
  }
  return map[type] || type;
}

function translatePhotoStatus(status) {
  const map = {
    sin_fotografia: 'Sin fotografía',
    pendiente_fiesta: 'Pendiente fiesta',
    link_por_enviar: 'Link por enviar',
    pendiente_listado: 'Pendiente listado',
    fotos_recibidas: 'Fotos recibidas',
    en_produccion: 'En producción',
    por_recoger: 'Por recoger',
    entregado: 'Entregado'
  };
  return map[status] || status || 'Sin fotografía';
}

function getPhotoStatusBadgeClass(status) {
  const map = {
    sin_fotografia: 'badge-cancelado', // grey
    pendiente_fiesta: 'badge-en_proceso', // orange
    link_por_enviar: 'badge-pendiente_pago', // red
    pendiente_listado: 'badge-nueva', // purple
    fotos_recibidas: 'badge-confirmado', // green
    en_produccion: 'badge-realizado', // blue
    por_recoger: 'badge-en_proceso', // orange
    entregado: 'badge-confirmado' // green
  };
  return map[status] || 'badge-cancelado';
}

function renderActiveClientEvent() {
  if (!selectedClientEvent) return;

  document.getElementById('client-event-name').textContent = `${translateEventType(selectedClientEvent.eventType)} - Casa de Banquetes Sarahy`;

  // Inicializar cuenta regresiva
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  if (photoCountdownInterval) {
    clearInterval(photoCountdownInterval);
    photoCountdownInterval = null;
  }

  const eventDateTime = new Date(selectedClientEvent.date + 'T' + (selectedClientEvent.time || '16:00') + ':00');
  
  const updateCountdown = () => {
    const now = new Date();
    const diff = eventDateTime - now;
    
    if (diff <= 0) {
      document.getElementById('timer-days').textContent = '00';
      document.getElementById('timer-hours').textContent = '00';
      document.getElementById('timer-minutes').textContent = '00';
      document.getElementById('timer-seconds').textContent = '00';
      document.getElementById('client-countdown-event-date').textContent = "¡Tu evento ha comenzado! Felicidades.";
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    
    document.getElementById('timer-days').textContent = String(days).padStart(2, '0');
    document.getElementById('timer-hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('timer-minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('timer-seconds').textContent = String(seconds).padStart(2, '0');
    
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('client-countdown-event-date').textContent = `Programado para el ${eventDateTime.toLocaleDateString('es-CO', options)}`;
  };

  document.getElementById('client-countdown-banner').style.display = 'flex';
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);

  // Renderizar citas/ensayos del cliente
  const citasCard = document.getElementById('client-citas-card');
  const citasContainer = document.getElementById('client-citas-lista-container');
  if (citasCard && citasContainer) {
    const appointments = selectedClientEvent.appointments || [];
    if (appointments.length === 0) {
      citasCard.style.display = 'none';
    } else {
      citasCard.style.display = 'block';
      citasContainer.innerHTML = '';
      
      // Ordenar citas por fecha y hora
      const sortedApps = [...appointments].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
        return dateA - dateB;
      });

      sortedApps.forEach(app => {
        const formattedDate = new Date(`${app.date}T00:00:00`).toLocaleDateString('es-CO', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
        
        const item = document.createElement('div');
        item.className = 'cita-client-item';
        item.style.background = 'var(--bg-tertiary)';
        item.style.padding = '1rem';
        item.style.borderRadius = '8px';
        item.style.borderLeft = '4px solid var(--accent-gold)';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.flexWrap = 'wrap';
        item.style.gap = '0.5rem';
        
        item.innerHTML = `
          <div>
            <h4 style="margin: 0; font-family: var(--font-title); color: white; font-size: 1.05rem;">${app.title}</h4>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">${formattedDate}</span>
          </div>
          <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.2); padding: 0.35rem 0.75rem; border-radius: 20px; color: var(--accent-gold); font-weight: 600; font-size: 0.85rem;">
            ⏰ ${app.time || '00:00'}
          </div>
        `;
        citasContainer.appendChild(item);
      });
    }
  }

  // 1. PESTAÑA: INFO
  document.getElementById('c-info-fecha').textContent = selectedClientEvent.date;
  document.getElementById('c-info-hora').textContent = selectedClientEvent.time || '16:00';
  
  const venue = allProducts.venues.find(v => v.id === selectedClientEvent.venueId);
  document.getElementById('c-info-salon').textContent = venue ? venue.name : selectedClientEvent.venueId;
  
  document.getElementById('c-info-invitados').textContent = `${selectedClientEvent.guests} personas`;
  
  const photo = allProducts.photography.find(p => p.id === selectedClientEvent.photographyId);
  document.getElementById('c-info-fotografia').textContent = photo ? photo.name : 'Ninguno';
  
  const deco = allProducts.decoration.find(d => d.id === selectedClientEvent.decorationId);
  document.getElementById('c-info-decoracion').textContent = deco ? deco.name : 'Ninguno';

  const recreation = allProducts.recreation ? allProducts.recreation.find(p => p.id === selectedClientEvent.recreationId) : null;
  const cInfoRecreacion = document.getElementById('c-info-recreacion');
  if (cInfoRecreacion) {
    cInfoRecreacion.textContent = recreation ? recreation.name : 'Ninguno';
  }
  
  const firmaStatus = document.getElementById('c-info-firma-status');
  if (selectedClientEvent.contractSigned) {
    firmaStatus.innerHTML = '<span class="badge badge-confirmada">Firmado</span>';
  } else {
    firmaStatus.innerHTML = '<span class="badge badge-pendiente_pago">No Firmado</span>';
  }

  // 2. PESTAÑA: INVITADOS
  renderGuestsTab();

  // 3. PESTAÑA: MENÚ
  renderMenuTab();

  // 4. PESTAÑA: CRONOGRAMA
  renderTimelineTab();

  // 5. PESTAÑA: DOCUMENTOS Y FINANZAS
  renderDocsTab();

  // 6. PESTAÑA: FOTOGRAFÍA
  renderClientPhotographyTab();
}

function renderGuestsTab() {
  const list = selectedClientEvent.guestsList || [];
  const tbody = document.getElementById('client-guests-list');
  tbody.innerHTML = '';
  
  let total = list.length;
  let confirmed = list.filter(g => g.confirmed).length;
  let pending = total - confirmed;
  
  document.getElementById('cg-total').textContent = total;
  document.getElementById('cg-confirmados').textContent = confirmed;
  document.getElementById('cg-pendientes').textContent = pending;
  
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No has agregado ningún invitado todavía.</td></tr>`;
    return;
  }
  
  list.forEach((g, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${g.name}</td>
      <td>
        <span class="badge ${g.confirmed ? 'badge-confirmada' : 'badge-pendiente_pago'}">
          ${g.confirmed ? 'Confirmado' : 'Pendiente'}
        </span>
      </td>
      <td>
        <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="editGuest(${idx})">Editar</button>
        <button class="btn-logout" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="deleteGuest(${idx})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Bindeos globales para botones dentro de tablas (requiere que estén en window)
window.editGuest = (idx) => {
  const g = selectedClientEvent.guestsList[idx];
  document.getElementById('form-invitado-container').style.display = 'block';
  document.getElementById('guest-index').value = idx;
  document.getElementById('guest-name').value = g.name;
  document.getElementById('guest-confirmed').checked = g.confirmed;
};

window.deleteGuest = async (idx) => {
  if (confirm("¿Estás seguro de eliminar a este invitado?")) {
    selectedClientEvent.guestsList.splice(idx, 1);
    await DB.updateEvent(selectedClientEvent.id, { guestsList: selectedClientEvent.guestsList });
    renderGuestsTab();
  }
};

async function saveGuest() {
  const name = document.getElementById('guest-name').value.trim();
  const confirmed = document.getElementById('guest-confirmed').checked;
  const idxVal = document.getElementById('guest-index').value;
  
  if (!name) {
    alert("Por favor, ingresa el nombre.");
    return;
  }
  
  if (!selectedClientEvent.guestsList) {
    selectedClientEvent.guestsList = [];
  }
  
  if (idxVal === '') {
    // Agregar nuevo
    selectedClientEvent.guestsList.push({ name, confirmed });
  } else {
    // Editar existente
    const idx = parseInt(idxVal);
    selectedClientEvent.guestsList[idx] = { name, confirmed };
  }
  
  await DB.updateEvent(selectedClientEvent.id, { guestsList: selectedClientEvent.guestsList });
  document.getElementById('form-invitado-container').style.display = 'none';
  renderGuestsTab();
}

async function renderMenuTab() {
  const grid = document.getElementById('client-menu-fields-grid');
  grid.innerHTML = '';
  
  const products = await DB.getProducts();
  const menu = selectedClientEvent.menu || {};
  
  // Calcular límite de 10 días antes del evento
  const eventDate = new Date(selectedClientEvent.date + 'T00:00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  eventDate.setHours(0,0,0,0);
  
  const diffTime = eventDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const limitDate = new Date(eventDate);
  limitDate.setDate(limitDate.getDate() - 10);
  const limitDateString = limitDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const warningContainer = document.getElementById('client-menu-limit-warning');
  const saveButton = document.getElementById('btn-save-menu');
  let isMenuLocked = false;
  
  if (diffDays >= 10) {
    isMenuLocked = false;
    warningContainer.style.background = 'rgba(56, 161, 105, 0.15)';
    warningContainer.style.border = '1px solid var(--success)';
    warningContainer.style.color = '#68d391';
    warningContainer.innerHTML = `⚠️ <strong>Recuerda:</strong> Tienes plazo para guardar o modificar tu selección de menú hasta el <strong>${limitDateString}</strong> (10 días antes del evento).`;
    if (saveButton) saveButton.style.display = 'inline-block';
  } else {
    isMenuLocked = true;
    warningContainer.style.background = 'rgba(229, 62, 62, 0.15)';
    warningContainer.style.border = '1px solid var(--danger)';
    warningContainer.style.color = '#fc8181';
    warningContainer.innerHTML = `🔒 <strong>Plazo Límite Cerrado:</strong> El plazo para modificar el menú venció el <strong>${limitDateString}</strong> (10 días antes del evento). Comunícate con la administración para realizar cualquier cambio.`;
    if (saveButton) saveButton.style.display = 'none';
  }
  
  const menuFields = [
    { key: 'coctel', label: 'Cóctel (Bienvenida)', placeholder: 'Seleccionar cóctel...' },
    { key: 'arroz', label: 'Arroz (Acompañamiento)', placeholder: 'Seleccionar arroz...' },
    { key: 'carne', label: 'Carne / Plato Principal', placeholder: 'Seleccionar plato principal...' },
    { key: 'ensalada', label: 'Ensalada (Acompañamiento)', placeholder: 'Seleccionar ensalada...' },
    { key: 'postre', label: 'Postre', placeholder: 'Seleccionar postre...' },
    { key: 'liquido', label: 'Líquido / Bebida', placeholder: 'Seleccionar bebida...' },
    { key: 'torta', label: 'Torta de Gala', placeholder: 'Seleccionar torta...' },
    { key: 'pasabocas', label: 'Pasabocas (Entrada)', placeholder: 'Seleccionar pasabocas...' }
  ];
  
  menuFields.forEach(field => {
    const options = products[field.key] || [];
    const savedValue = menu[field.key] || '';
    
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    
    let optionsHtml = `<option value="">${field.placeholder}</option>`;
    options.forEach(opt => {
      const priceText = opt.price > 0 ? ` (+ $${opt.price.toLocaleString()} COP)` : '';
      optionsHtml += `<option value="${opt.name}" data-desc="${opt.description || ''}" ${opt.name === savedValue ? 'selected' : ''}>${opt.name}${priceText}</option>`;
    });
    
    formGroup.innerHTML = `
      <label for="cm-${field.key}">${field.label}</label>
      <select id="cm-${field.key}" required style="width: 100%;" ${isMenuLocked ? 'disabled' : ''}>
        ${optionsHtml}
      </select>
      <p class="menu-option-desc" id="cm-${field.key}-desc" style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.35rem; min-height: 1rem; line-height: 1.3; font-style: italic;"></p>
    `;
    
    grid.appendChild(formGroup);
    
    const selectEl = formGroup.querySelector('select');
    const descEl = formGroup.querySelector('.menu-option-desc');
    
    const updateDesc = () => {
      const selectedOption = selectEl.options[selectEl.selectedIndex];
      const desc = selectedOption ? (selectedOption.getAttribute('data-desc') || '') : '';
      descEl.textContent = desc ? `Detalle: ${desc}` : '';
    };
    
    selectEl.addEventListener('change', updateDesc);
    updateDesc();
  });

  if (selectedClientEvent.allowColorSelection) {
    const savedColors = selectedClientEvent.selectedColors || (selectedClientEvent.selectedColor ? selectedClientEvent.selectedColor.split(',').map(s => s.trim()) : []);
    const colors = systemSettings.availableColors || ["Blanco", "Dorado", "Plateado", "Azul Rey", "Rojo Pasión", "Verde Esmeralda", "Rosa Pastel"];
    
    // Validar si la selección de color está bloqueada por fecha o por alcanzar el límite de cambios
    const isColorSelectionLocked = isMenuLocked || (selectedClientEvent.colorChangeCount >= 2);
    
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    formGroup.style.gridColumn = '1 / -1';
    formGroup.style.borderTop = '1px solid rgba(255, 255, 255, 0.05)';
    formGroup.style.paddingTop = '1.2rem';
    formGroup.style.marginTop = '0.5rem';

    let chipsHtml = '';
    colors.forEach(col => {
      const isSelected = savedColors.includes(col);
      chipsHtml += `
        <button type="button" class="color-select-chip ${isSelected ? 'selected' : ''}" data-color="${col}" ${isColorSelectionLocked ? 'disabled' : ''} style="
          padding: 0.5rem 1rem;
          border-radius: 20px;
          border: 1px solid ${isSelected ? 'var(--accent-gold)' : 'var(--border-color)'};
          background: ${isSelected ? 'rgba(212, 175, 55, 0.15)' : 'var(--bg-secondary)'};
          color: ${isSelected ? 'var(--accent-gold)' : 'var(--text-primary)'};
          cursor: ${isColorSelectionLocked ? 'not-allowed' : 'pointer'};
          font-weight: 500;
          font-size: 0.85rem;
          transition: var(--transition-smooth);
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        ">
          ${isSelected ? '✓ ' : ''}${col}
        </button>
      `;
    });

    let helpText = '';
    const changesLeft = 2 - (selectedClientEvent.colorChangeCount || 0);
    if (selectedClientEvent.colorChangeCount >= 2) {
      helpText = '<span style="color: var(--danger); font-weight: 600;">🔒 Selección Bloqueada: Has alcanzado el límite de 2 cambios permitidos para la mantelería.</span>';
    } else {
      helpText = `Te quedan <strong style="color: var(--accent-gold);">${changesLeft}</strong> cambios de opinión permitidos para la mantelería después de guardar.`;
    }

    formGroup.innerHTML = `
      <label style="color: var(--accent-gold); font-weight: 600; margin-bottom: 0.5rem; display: block;">🎨 Colores de Mantelería Seleccionados (Puedes elegir varios)</label>
      <div id="cm-colors-chips-container" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
        ${chipsHtml}
      </div>
      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.35rem; line-height: 1.3;">
        ${helpText}
      </p>
    `;
    grid.appendChild(formGroup);

    if (!isColorSelectionLocked) {
      formGroup.querySelectorAll('.color-select-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.classList.toggle('selected');
          const isSel = btn.classList.contains('selected');
          if (isSel) {
            btn.style.borderColor = 'var(--accent-gold)';
            btn.style.background = 'rgba(212, 175, 55, 0.15)';
            btn.style.color = 'var(--accent-gold)';
            btn.innerHTML = '✓ ' + btn.getAttribute('data-color');
          } else {
            btn.style.borderColor = 'var(--border-color)';
            btn.style.background = 'var(--bg-secondary)';
            btn.style.color = 'var(--text-primary)';
            btn.innerHTML = btn.getAttribute('data-color');
          }
        });
      });
    }
  }
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  for (let i = 0; i < sortedA.length; ++i) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
}

async function saveClientMenu(e) {
  e.preventDefault();
  
  // Verificación de seguridad de fecha límite (10 días)
  const eventDate = new Date(selectedClientEvent.date + 'T00:00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  eventDate.setHours(0,0,0,0);
  
  const diffTime = eventDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 10) {
    alert("Error: El plazo de 10 días antes del evento ha expirado. La selección de menú está cerrada.");
    return;
  }
  
  const menu = {
    coctel: document.getElementById('cm-coctel').value,
    arroz: document.getElementById('cm-arroz').value,
    carne: document.getElementById('cm-carne').value,
    ensalada: document.getElementById('cm-ensalada').value,
    postre: document.getElementById('cm-postre').value,
    liquido: document.getElementById('cm-liquido').value,
    torta: document.getElementById('cm-torta').value,
    pasabocas: document.getElementById('cm-pasabocas').value
  };

  const selectedColors = [];
  document.querySelectorAll('#cm-colors-chips-container .color-select-chip.selected').forEach(btn => {
    selectedColors.push(btn.getAttribute('data-color'));
  });
  const selectedColor = selectedColors.join(', ');

  // Comparar con la selección guardada para contar los cambios
  const oldColors = selectedClientEvent.selectedColors || (selectedClientEvent.selectedColor ? selectedClientEvent.selectedColor.split(',').map(s => s.trim()) : []);
  const isColorChanged = !arraysEqual(oldColors, selectedColors);
  
  let newChangeCount = selectedClientEvent.colorChangeCount || 0;
  
  if (isColorChanged) {
    // Solo se computa el cambio si ya existía una selección previa (no es la selección inicial)
    if (oldColors.length > 0) {
      if (newChangeCount >= 2) {
        alert("Error: Has alcanzado el límite de 2 cambios permitidos para la mantelería.");
        return;
      }
      newChangeCount++;
    }
  }
  
  try {
    await DB.updateEvent(selectedClientEvent.id, { menu, selectedColors, selectedColor, colorChangeCount: newChangeCount });
    selectedClientEvent.selectedColors = selectedColors;
    selectedClientEvent.selectedColor = selectedColor;
    selectedClientEvent.colorChangeCount = newChangeCount;
    
    if (isColorChanged && oldColors.length > 0) {
      const remaining = 2 - newChangeCount;
      if (remaining === 0) {
        alert("¡Menú y colores de mantelería guardados! Has agotado tus 2 cambios permitidos para la mantelería.");
      } else {
        alert(`¡Menú y colores de mantelería guardados! Te queda ${remaining} cambio permitido para la mantelería.`);
      }
    } else {
      alert("¡Menú guardado con éxito!");
    }
    
    renderMenuTab();
  } catch (err) {
    alert("Error al guardar menú: " + err.message);
  }
}

function renderTimelineTab() {
  const list = selectedClientEvent.timeline || [];
  const container = document.getElementById('client-timeline-list');
  container.innerHTML = '';
  
  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center;">No hay cronograma definido para tu evento.</p>';
    return;
  }
  
  list.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = `timeline-item ${item.completed ? 'completed' : ''}`;
    div.innerHTML = `
      <div class="timeline-time">${item.time}</div>
      <div class="timeline-activity">${item.activity}</div>
    `;
    container.appendChild(div);
  });
}

function renderDocsTab() {
  // Facturas y Pagos
  document.getElementById('cd-total-value').textContent = `$${(selectedClientEvent.totalValue || 0).toLocaleString()} COP`;
  
  const payments = selectedClientEvent.payments || [];
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  document.getElementById('cd-abonos').textContent = `$${paid.toLocaleString()} COP`;
  
  const balance = (selectedClientEvent.totalValue || 0) - paid;
  document.getElementById('cd-saldo').textContent = `$${balance.toLocaleString()} COP`;
  
  // Historial
  const tbody = document.getElementById('client-payments-list');
  tbody.innerHTML = '';
  
  if (payments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No hay pagos registrados.</td></tr>`;
  } else {
    payments.forEach(p => {
      tbody.innerHTML += `
        <tr>
          <td>${p.date}</td>
          <td>$${p.amount.toLocaleString()} COP</td>
          <td><span class="badge badge-confirmada">${translatePaymentType(p.type)}</span></td>
        </tr>
      `;
    });
  }
  
  // Estado de firma
  const pendBox = document.getElementById('firma-pendiente-box');
  const realBox = document.getElementById('firma-realizada-box');
  const imgSaved = document.getElementById('img-signature-saved');
  
  if (selectedClientEvent.contractSigned) {
    pendBox.style.display = 'none';
    realBox.style.display = 'block';
    imgSaved.src = selectedClientEvent.contractSignature || '';
  } else {
    pendBox.style.display = 'block';
    realBox.style.display = 'none';
  }
}

function translatePaymentType(type) {
  const map = { abono: 'Abono', saldo: 'Liquidación Saldo', extra: 'Adicional' };
  return map[type] || type;
}

function renderClientPhotographyTab() {
  if (!selectedClientEvent) return;

  const photoCountdownContainer = document.getElementById('photo-countdown-container');
  const photoCountdownTimer = document.getElementById('photo-countdown-timer');
  const photoLinkContainer = document.getElementById('photo-link-container');
  const btnClientPhotoDrive = document.getElementById('btn-client-photo-drive');
  const clientPhotoNoLinkMsg = document.getElementById('client-photo-no-link-msg');
  const clientPhotoInstructionsText = document.getElementById('client-photo-instructions-text');

  // Cargar instrucciones de fotografía
  if (clientPhotoInstructionsText) {
    const instructions = (systemSettings && systemSettings.photoInstructions) || 
      "1. Selección de Fotos: Un plazo de 10 días posterior al evento, nuestro equipo cargará todas las capturas oficiales.\n2. Descarga Completa: El botón de descarga te llevará al Drive oficial donde podrás bajar las fotos en alta resolución.\n3. Disponibilidad: El enlace permanecerá activo en la nube por un período de 90 días calendario.";
    clientPhotoInstructionsText.textContent = instructions;
  }

  // Calcular fecha de liberación: fecha del evento + 10 días
  const eventDateTime = new Date(selectedClientEvent.date + 'T' + (selectedClientEvent.time || '16:00') + ':00');
  const releaseTime = new Date(eventDateTime.getTime() + 10 * 24 * 60 * 60 * 1000);

  if (photoCountdownInterval) {
    clearInterval(photoCountdownInterval);
    photoCountdownInterval = null;
  }

  const updatePhotoCountdown = () => {
    const now = new Date();
    
    // Comparar la fecha actual con la fecha del evento para ver si el evento ya se realizó
    const eventDateOnly = new Date(selectedClientEvent.date + 'T00:00:00');
    const todayOnly = new Date();
    todayOnly.setHours(0,0,0,0);
    
    if (todayOnly < eventDateOnly) {
      // 1. ANTES DE LA FECHA DEL EVENTO: Bloqueado
      if (photoCountdownInterval) {
        clearInterval(photoCountdownInterval);
        photoCountdownInterval = null;
      }
      
      if (photoCountdownContainer) photoCountdownContainer.style.display = 'none';
      if (photoLinkContainer) {
        photoLinkContainer.style.display = 'block';
        
        document.getElementById('photo-link-icon').textContent = '🔒';
        document.getElementById('photo-link-header').textContent = 'Álbum de Fotos Bloqueado';
        document.getElementById('photo-link-description').textContent = 'El enlace de descarga a tu álbum digital en Google Drive se habilitará una vez transcurra la cuenta regresiva después del evento.';
        
        if (btnClientPhotoDrive) {
          btnClientPhotoDrive.href = '#';
          btnClientPhotoDrive.textContent = '🔒 Álbum Bloqueado (Evento no realizado)';
          btnClientPhotoDrive.className = 'btn-primary disabled';
          btnClientPhotoDrive.style.display = 'inline-flex';
        }
        if (clientPhotoNoLinkMsg) clientPhotoNoLinkMsg.style.display = 'none';
      }
      
      const photoSelectionContainer = document.getElementById('photo-selection-container');
      if (photoSelectionContainer) photoSelectionContainer.style.display = 'none';
      return;
    }

    const diff = releaseTime - now;

    if (diff <= 0) {
      // 3. DESPUÉS DE LA CUENTA REGRESIVA: Desbloqueado
      if (photoCountdownInterval) {
        clearInterval(photoCountdownInterval);
        photoCountdownInterval = null;
      }
      
      if (photoCountdownContainer) photoCountdownContainer.style.display = 'none';
      if (photoLinkContainer) {
        photoLinkContainer.style.display = 'block';
        
        document.getElementById('photo-link-icon').textContent = '🎉';
        document.getElementById('photo-link-header').textContent = '¡Tus fotos están listas!';
        document.getElementById('photo-link-description').textContent = 'Puedes acceder a tu álbum digital en Google Drive para visualizar y descargar todas las fotografías oficiales del evento haciendo clic en el siguiente enlace.';
        
        const driveLink = selectedClientEvent.photoDriveLink || '';
        if (driveLink.trim() !== '') {
          if (btnClientPhotoDrive) {
            btnClientPhotoDrive.href = driveLink;
            btnClientPhotoDrive.textContent = 'Acceder al Álbum (Drive)';
            btnClientPhotoDrive.className = 'btn-primary';
            btnClientPhotoDrive.style.display = 'inline-flex';
          }
          if (clientPhotoNoLinkMsg) clientPhotoNoLinkMsg.style.display = 'none';
        } else {
          if (btnClientPhotoDrive) {
            btnClientPhotoDrive.href = '#';
            btnClientPhotoDrive.style.display = 'none';
          }
          if (clientPhotoNoLinkMsg) clientPhotoNoLinkMsg.style.display = 'block';
        }
      }

      // Cargar selección e interactividad
      const photoSelectionContainer = document.getElementById('photo-selection-container');
      const photoSelectionTextEl = document.getElementById('client-photo-selection-text');
      
      if (photoSelectionContainer) photoSelectionContainer.style.display = 'block';
      if (photoSelectionTextEl) {
        photoSelectionTextEl.value = selectedClientEvent.photoSelectionText || '';
      }

      const saveBtn = document.getElementById('btn-client-save-photo-selection');
      const adminWaBtn = document.getElementById('btn-client-send-photo-admin-wa');
      const photographerWaBtn = document.getElementById('btn-client-send-photo-photographer-wa');

      const isLocked = selectedClientEvent.photoSelectionLocked || false;
      let lockMsgEl = document.getElementById('client-photo-locked-msg');

      if (isLocked) {
        if (!lockMsgEl) {
          lockMsgEl = document.createElement('div');
          lockMsgEl.id = 'client-photo-locked-msg';
          lockMsgEl.style.background = 'rgba(56, 161, 105, 0.15)';
          lockMsgEl.style.border = '1px solid var(--success)';
          lockMsgEl.style.color = '#68d391';
          lockMsgEl.style.padding = '1rem';
          lockMsgEl.style.borderRadius = '8px';
          lockMsgEl.style.fontSize = '0.9rem';
          lockMsgEl.style.fontWeight = '500';
          lockMsgEl.style.marginBottom = '1rem';
          lockMsgEl.innerHTML = '✔ <strong>Selección Confirmada:</strong> Tu listado de fotos ha sido recibido por la administración. Ya no se permiten modificaciones ya que se encuentra en proceso de producción.';
          
          if (photoSelectionTextEl) {
            photoSelectionTextEl.parentNode.insertBefore(lockMsgEl, photoSelectionTextEl);
          }
        } else {
          lockMsgEl.style.display = 'block';
        }
        
        if (photoSelectionTextEl) {
          photoSelectionTextEl.readOnly = true;
          photoSelectionTextEl.style.background = 'var(--bg-tertiary)';
          photoSelectionTextEl.style.color = 'var(--text-secondary)';
          photoSelectionTextEl.style.cursor = 'not-allowed';
        }
        
        if (saveBtn) saveBtn.style.display = 'none';
        if (adminWaBtn) adminWaBtn.style.display = 'none';
        if (photographerWaBtn) photographerWaBtn.style.display = 'none';
      } else {
        if (lockMsgEl) {
          lockMsgEl.style.display = 'none';
        }
        
        if (photoSelectionTextEl) {
          photoSelectionTextEl.readOnly = false;
          photoSelectionTextEl.style.background = 'var(--bg-secondary)';
          photoSelectionTextEl.style.color = 'var(--text-primary)';
          photoSelectionTextEl.style.cursor = 'auto';
        }
        
        if (saveBtn) saveBtn.style.display = 'inline-block';
        if (adminWaBtn) adminWaBtn.style.display = 'inline-flex';
        if (photographerWaBtn) photographerWaBtn.style.display = 'inline-flex';

        if (saveBtn && !saveBtn.dataset.listenerBound) {
          saveBtn.dataset.listenerBound = 'true';
          saveBtn.addEventListener('click', async () => {
            const text = photoSelectionTextEl ? photoSelectionTextEl.value.trim() : '';
            try {
              await DB.updateEvent(selectedClientEvent.id, { photoSelectionText: text });
              selectedClientEvent.photoSelectionText = text;
              alert("Selección de fotos guardada correctamente.");
            } catch (err) {
              alert("Error al guardar selección: " + err.message);
            }
          });
        }

        const getWhatsAppMessage = () => {
          const text = photoSelectionTextEl ? photoSelectionTextEl.value.trim() : '';
          const clientName = selectedClientEvent.clientName || 'Cliente';
          const eventTypeStr = translateEventType(selectedClientEvent.eventType);
          const eventDate = selectedClientEvent.date;
          return encodeURIComponent(
            `¡Hola! Soy ${clientName}, aquí está mi listado de fotos seleccionadas para mi evento de ${eventTypeStr} del ${eventDate}:\n\n${text}`
          );
        };

        if (adminWaBtn && !adminWaBtn.dataset.listenerBound) {
          adminWaBtn.dataset.listenerBound = 'true';
          adminWaBtn.addEventListener('click', async () => {
            const text = photoSelectionTextEl ? photoSelectionTextEl.value.trim() : '';
            try {
              await DB.updateEvent(selectedClientEvent.id, { photoSelectionText: text });
              selectedClientEvent.photoSelectionText = text;
            } catch (err) {
              console.error("Error al guardar antes de enviar por WhatsApp:", err);
            }
            const phone = (systemSettings && systemSettings.telefonoContacto1) || '3163048505';
            const cleanPhone = phone.replace(/\D/g, '');
            const formattedPhone = cleanPhone.length === 10 ? '57' + cleanPhone : cleanPhone;
            window.open(`https://wa.me/${formattedPhone}?text=${getWhatsAppMessage()}`, '_blank');
          });
        }

        if (photographerWaBtn && !photographerWaBtn.dataset.listenerBound) {
          photographerWaBtn.dataset.listenerBound = 'true';
          photographerWaBtn.addEventListener('click', async () => {
            const text = photoSelectionTextEl ? photoSelectionTextEl.value.trim() : '';
            try {
              await DB.updateEvent(selectedClientEvent.id, { photoSelectionText: text });
              selectedClientEvent.photoSelectionText = text;
            } catch (err) {
              console.error("Error al guardar antes de enviar por WhatsApp:", err);
            }
            const phone = (systemSettings && systemSettings.telefonoContactoFoto) || (systemSettings && systemSettings.telefonoContacto1) || '3163048505';
            const cleanPhone = phone.replace(/\D/g, '');
            const formattedPhone = cleanPhone.length === 10 ? '57' + cleanPhone : cleanPhone;
            window.open(`https://wa.me/${formattedPhone}?text=${getWhatsAppMessage()}`, '_blank');
          });
        }
      }

      return;
    }

    // 2. DESPUÉS DEL EVENTO PERO EN CUENTA REGRESIVA: Bloqueado con timer
    if (photoCountdownContainer) photoCountdownContainer.style.display = 'block';
    if (photoLinkContainer) {
      photoLinkContainer.style.display = 'block';
      document.getElementById('photo-link-icon').textContent = '⏳';
      document.getElementById('photo-link-header').textContent = 'Álbum en Proceso de Revelado / Carga';
      document.getElementById('photo-link-description').textContent = 'Nuestro equipo de fotógrafos está seleccionando y editando tus fotos. El álbum se desbloqueará cuando finalice la cuenta regresiva.';
      
      if (btnClientPhotoDrive) {
        btnClientPhotoDrive.href = '#';
        btnClientPhotoDrive.textContent = '⏳ Álbum Bloqueado (En proceso)';
        btnClientPhotoDrive.className = 'btn-primary disabled';
        btnClientPhotoDrive.style.display = 'inline-flex';
      }
      if (clientPhotoNoLinkMsg) clientPhotoNoLinkMsg.style.display = 'none';
    }
    
    const photoSelectionContainer = document.getElementById('photo-selection-container');
    if (photoSelectionContainer) photoSelectionContainer.style.display = 'none';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (photoCountdownTimer) {
      photoCountdownTimer.innerHTML = `
        <div style="text-align: center; min-width: 60px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 8px;">
          <span style="font-size: 1.4rem; font-weight: 700; color: var(--accent-gold); display: block;">${String(days).padStart(2, '0')}</span>
          <span style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-secondary); display: block;">Días</span>
        </div>
        <div style="text-align: center; min-width: 60px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 8px;">
          <span style="font-size: 1.4rem; font-weight: 700; color: var(--accent-gold); display: block;">${String(hours).padStart(2, '0')}</span>
          <span style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-secondary); display: block;">Horas</span>
        </div>
        <div style="text-align: center; min-width: 60px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 8px;">
          <span style="font-size: 1.4rem; font-weight: 700; color: var(--accent-gold); display: block;">${String(minutes).padStart(2, '0')}</span>
          <span style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-secondary); display: block;">Minutos</span>
        </div>
        <div style="text-align: center; min-width: 60px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 8px;">
          <span style="font-size: 1.4rem; font-weight: 700; color: var(--accent-gold); display: block;">${String(seconds).padStart(2, '0')}</span>
          <span style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-secondary); display: block;">Segundos</span>
        </div>
      `;
    }
  };

  updatePhotoCountdown();
  photoCountdownInterval = setInterval(updatePhotoCountdown, 1000);
}

// Firma Digital Canvas
function openSignatureModal() {
  document.getElementById('modal-firma-contrato').classList.add('active');
  initSignatureCanvas();
}

function closeSignatureModal() {
  closeModel('modal-firma-contrato');
}

function initSignatureCanvas() {
  const canvas = document.getElementById('signature-canvas');
  const ctx = canvas.getContext('2d');
  
  // Resetear
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#0f111a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  
  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  
  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Soporte táctil vs mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function startDrawing(e) {
    drawing = true;
    const pos = getMousePos(e);
    lastX = pos.x;
    lastY = pos.y;
    e.preventDefault();
  }

  function draw(e) {
    if (!drawing) return;
    const pos = getMousePos(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    lastX = pos.x;
    lastY = pos.y;
    e.preventDefault();
  }

  function stopDrawing() {
    drawing = false;
  }

  // Mouse events
  canvas.onmousedown = startDrawing;
  canvas.onmousemove = draw;
  canvas.onmouseup = stopDrawing;
  canvas.onmouseout = stopDrawing;
  
  // Touch events (Móvil)
  canvas.ontouchstart = startDrawing;
  canvas.ontouchmove = draw;
  canvas.ontouchend = stopDrawing;
}

function clearSignatureCanvas() {
  const canvas = document.getElementById('signature-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function saveContractSignature() {
  const canvas = document.getElementById('signature-canvas');
  const signatureData = canvas.toDataURL('image/png');
  
  // Validar si el lienzo está en blanco (opcional, validando píxeles)
  try {
    await DB.updateEvent(selectedClientEvent.id, {
      contractSigned: true,
      contractSignature: signatureData
    });
    selectedClientEvent.contractSigned = true;
    selectedClientEvent.contractSignature = signatureData;
    
    alert("¡Contrato firmado digitalmente con éxito!");
    closeSignatureModal();
    renderDocsTab();
  } catch (err) {
    alert("Error al firmar contrato: " + err.message);
  }
}

// ==========================================
// MÓDULO 3: EMPLEADOS - ADMINISTRACIÓN
// ==========================================
async function loadAdminView() {
  // Renderizar pestañas del Superadministrador
  renderCalendar();
  renderAdminQuotes();
  renderAdminEvents();
  renderAdminProducts();
  renderAdminUsers();
  renderAdminProviders();
}

// 1. Calendario
async function renderCalendar() {
  const calendarGrid = document.getElementById('calendar-grid-container');
  calendarGrid.innerHTML = '';
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  document.getElementById('cal-month-title').textContent = `${monthNames[currentMonth]} ${currentYear}`;
  
  // Días de la semana headers
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  dayNames.forEach(d => {
    calendarGrid.innerHTML += `<div class="calendar-day-header">${d}</div>`;
  });
  
  // Obtener primer día y total de días
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Ajuste para que empiece en lunes
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();
  
  const events = await DB.getEvents();
  const products = await DB.getProducts();

  // Días del mes anterior
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell other-month';
    cell.innerHTML = `<span class="calendar-cell-num">${prevMonthTotalDays - i}</span>`;
    calendarGrid.appendChild(cell);
  }

  // Días del mes actual
  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    
    // Hoy destacado
    const today = new Date();
    if (today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear) {
      cell.classList.add('today');
    }
    
    cell.innerHTML = `<span class="calendar-cell-num">${day}</span>`;
    
    // Buscar eventos en este día
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date === dateStr);
    
    dayEvents.forEach(ev => {
      const salon = products.venues.find(v => v.id === ev.venueId);
      const tag = document.createElement('div');
      tag.className = `calendar-event-tag ${getSalonClass(ev.venueId)}`;
      tag.textContent = `${salon ? salon.name : ev.venueId}: ${translateEventType(ev.eventType)}`;
      tag.title = `${ev.clientName || 'Cliente'}`;
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        openEventModal(ev);
      });
      cell.appendChild(tag);
    });

    cell.addEventListener('dblclick', () => {
      openEventModal({ date: dateStr });
    });
    
    calendarGrid.appendChild(cell);
  }
}

function getSalonClass(venueId) {
  if (!venueId) return '';
  if (venueId.includes('valencia') || venueId.includes('duquesa')) return 'finca';
  if (venueId.includes('boston')) return 'boston';
  if (venueId.includes('buenos')) return 'buenos-aires';
  return '';
}

// 2. Cotizaciones Recibidas
async function renderAdminQuotes() {
  const quotes = await DB.getQuotations();
  console.log("Cargando cotizaciones para admin, encontradas:", quotes.length);
  const tbody = document.getElementById('admin-quotes-list');
  tbody.innerHTML = '';
  
  // Obtener valores de los filtros
  const searchQuery = (document.getElementById('admin-quotes-search')?.value || '').toLowerCase().trim();
  const filterEventType = document.getElementById('admin-quotes-filter-event-type')?.value || 'all';
  const filterDateMode = document.getElementById('admin-quotes-filter-date-mode')?.value || 'all';
  const dateStartVal = document.getElementById('admin-quotes-date-start')?.value || '';
  const dateEndVal = document.getElementById('admin-quotes-date-end')?.value || '';

  // Filtrar
  let filtered = quotes.filter(q => {
    // 1. Buscador (cliente, email o teléfono)
    if (searchQuery) {
      const matchName = (q.clientName || '').toLowerCase().includes(searchQuery);
      const matchEmail = (q.clientEmail || '').toLowerCase().includes(searchQuery);
      const matchPhone = (q.clientPhone || '').toLowerCase().includes(searchQuery);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }

    // 2. Tipo de evento
    if (filterEventType !== 'all') {
      if (q.eventType !== filterEventType) return false;
    }

    // 3. Fecha de Cotización
    if (filterDateMode !== 'all' && q.createdAt) {
      const qDate = new Date(q.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filterDateMode === 'today') {
        if (qDate.toDateString() !== today.toDateString()) return false;
      } else if (filterDateMode === 'last7') {
        const diffTime = today - qDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (filterDateMode === 'last30') {
        const diffTime = today - qDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 30) return false;
      } else if (filterDateMode === 'custom') {
        if (dateStartVal) {
          const startDate = new Date(dateStartVal + 'T00:00:00');
          if (qDate < startDate) return false;
        }
        if (dateEndVal) {
          const endDate = new Date(dateEndVal + 'T00:00:00');
          if (qDate > endDate) return false;
        }
      }
    }

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No se encontraron cotizaciones con los filtros seleccionados.</td></tr>`;
    return;
  }
  
  // Ordenar más recientes primero
  filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  filtered.forEach(q => {
    const totalVal = q.totalValue || 0;
    const discountVal = q.discount || 0;
    const discountLabel = q.discountLabel || '';
    const clientName = q.clientName || 'Cliente sin nombre';
    const clientEmail = q.clientEmail || 'Sin correo';
    const clientPhone = q.clientPhone || 'Sin teléfono';
    const eventType = q.eventType || 'boda';
    const quoteDate = q.date || 'Sin fecha';
    const guestsNum = q.guests || 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${clientName}</strong><br>
        <span style="font-size:0.8rem; color:var(--text-secondary);">${clientEmail} | ${clientPhone}</span>
      </td>
      <td>${translateEventType(eventType)}</td>
      <td>${quoteDate}</td>
      <td>${guestsNum} pers.</td>
      <td>
        ${discountVal > 0 ? `
          <span style="text-decoration: line-through; font-size: 0.85rem; color: var(--text-secondary);">$${totalVal.toLocaleString()}</span><br>
          <strong style="color: var(--accent-gold);">$${(totalVal - discountVal).toLocaleString()} COP</strong><br>
          <span style="font-size: 0.72rem; color: var(--warning); display: block; margin-top: 2px;">Desc: -$${discountVal.toLocaleString()} (${discountLabel})</span>
        ` : `
          <strong>$${totalVal.toLocaleString()} COP</strong>
        `}
      </td>
      <td><span class="badge badge-${q.status}">${q.status}</span></td>
      <td>
        <div class="flex-gap" style="align-items: center; gap: 0.4rem;">
          <button class="btn-primary" style="padding: 0.35rem 0.7rem; font-size: 0.78rem; font-weight: 600;" onclick="convertQuoteToEvent('${q.id}')">Confirmar</button>
          <button class="btn-accent" style="padding: 0.35rem 0.7rem; font-size: 0.78rem; background: #38a169; color: white; border: none; font-weight: 600;" onclick="applyDiscountToQuote('${q.id}')">💸 Desc</button>
          <button class="btn-secondary" style="padding: 0.35rem 0.55rem; font-size: 0.8rem; border-radius: 6px;" title="Descargar PDF" onclick="downloadQuoteById('${q.id}')">📥</button>
          <button class="btn-logout" style="padding: 0.35rem 0.55rem; font-size: 0.8rem; border-radius: 6px; border-color: rgba(229,62,62,0.3); color: #fc8181; background: rgba(229, 62, 62, 0.05);" title="Eliminar Cotización" onclick="deleteQuoteById('${q.id}')">🗑️</button>
          <select style="width: auto; padding: 0.3rem 0.5rem; font-size: 0.78rem; border-radius: 6px;" onchange="changeQuoteStatus('${q.id}', this.value)">
            <option value="">Estado...</option>
            <option value="nueva">Nueva</option>
            <option value="en_proceso">En Proceso</option>
            <option value="pendiente_pago">Pendiente Pago</option>
            <option value="confirmada">Confirmada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteQuoteById = async (id) => {
  if (!confirm("¿Estás seguro de que deseas eliminar esta cotización? Esta acción no se puede deshacer y se borrará del servidor.")) return;
  try {
    await DB.deleteQuotation(id);
    renderAdminQuotes();
  } catch (err) {
    alert("Error al eliminar cotización: " + err.message);
  }
};

window.changeQuoteStatus = async (id, status) => {
  if (!status) return;
  try {
    await DB.updateQuotationStatus(id, status);
    renderAdminQuotes();
  } catch (err) {
    alert("Error al actualizar estado: " + err.message);
  }
};

window.applyDiscountToQuote = async (quoteId) => {
  const quotes = await DB.getQuotations();
  const q = quotes.find(quote => quote.id === quoteId);
  if (!q) return;

  const currentDiscountText = q.discount && q.discount > 0 ? (q.discountPercent ? `${q.discountPercent}%` : q.discount) : '';
  const discountStr = prompt(
    `Aplicar Descuento a la cotización de ${q.clientName}:\n` +
    `Valor actual: $${q.totalValue.toLocaleString()} COP\n\n` +
    `Ingresa el descuento. Ejemplos:\n` +
    `- "150000" para un descuento fijo en COP.\n` +
    `- "10%" para un descuento por porcentaje.\n` +
    `- "0" o deja vacío para eliminar el descuento.`,
    currentDiscountText
  );

  if (discountStr === null) return; // Cancelado

  let discountVal = 0;
  let discountLabel = '';
  let discountPercent = '';

  const cleanStr = discountStr.trim();
  if (cleanStr && cleanStr !== '0') {
    if (cleanStr.endsWith('%')) {
      const pct = parseFloat(cleanStr.replace('%', ''));
      if (isNaN(pct) || pct < 0 || pct > 100) {
        alert("Porcentaje inválido. Debe estar entre 0% y 100%.");
        return;
      }
      discountVal = Math.round(q.totalValue * (pct / 100));
      discountLabel = `${pct}% Descuento`;
      discountPercent = `${pct}`;
    } else {
      const val = parseFloat(cleanStr);
      if (isNaN(val) || val < 0) {
        alert("Valor de descuento inválido.");
        return;
      }
      if (val > q.totalValue) {
        alert("El descuento no puede ser mayor al valor total de la cotización.");
        return;
      }
      discountVal = Math.round(val);
      discountLabel = `Descuento Especial`;
    }
  }

  try {
    await DB.updateQuotationDiscount(quoteId, discountVal, discountLabel, discountPercent);
    alert("Descuento aplicado correctamente.");
    renderAdminQuotes();
  } catch (err) {
    alert("Error al aplicar descuento: " + err.message);
  }
};

window.convertQuoteToEvent = async (quoteId) => {
  const quotes = await DB.getQuotations();
  const q = quotes.find(quote => quote.id === quoteId);
  
  if (!q) return;
  
  const discount = q.discount || 0;
  const totalVal = q.totalValue || 0;
  const finalValue = totalVal - discount;
  
  if (confirm(`¿Confirmar evento de ${q.clientName} para el ${q.date}?\n` +
              `Valor final del contrato: $${finalValue.toLocaleString()} COP (Descuento de $${discount.toLocaleString()} COP aplicado).\n\n` +
              `Se creará la cuenta de cliente y se reservará la fecha.`)) {
    // 1. Crear el usuario cliente en la DB si no existe
    const clients = await DB.getUsers();
    let client = clients.find(u => u.email.toLowerCase() === q.clientEmail.toLowerCase());
    
    if (!client) {
      // Registrar un nuevo cliente
      client = await registerNewUser(q.clientEmail, "123456", q.clientName, "cliente", q.clientPhone);
    }
    
    // 2. Crear evento agendado
    const newEvent = {
      quotationId: q.id,
      clientId: client.uid,
      clientName: q.clientName,
      clientEmail: q.clientEmail,
      eventType: q.eventType,
      date: q.date,
      time: "16:00",
      venueId: q.venueId,
      guests: q.guests,
      photographyId: q.photographyId,
      decorationId: q.decorationId,
      recreationId: q.recreationId,
      totalValue: finalValue,
      discount: discount,
      discountLabel: q.discountLabel || '',
      status: "confirmado",
      selectedServices: q.selectedServices || []
    };
    
    try {
      await DB.createEvent(newEvent);
      await DB.updateQuotationStatus(q.id, 'confirmada');
      alert("¡Reserva confirmada con éxito! Fecha bloqueada en calendario.");
      renderAdminQuotes();
      renderCalendar();
    } catch (err) {
      alert("Error al confirmar reserva: " + err.message);
    }
  }
};

// 3. Gestión de Eventos
async function renderAdminEvents() {
  const events = await DB.getEvents();
  const tbody = document.getElementById('admin-events-list');
  tbody.innerHTML = '';
  
  const searchVal = (document.getElementById('admin-events-search')?.value || '').toLowerCase();
  const dateMode = document.getElementById('admin-events-filter-date-mode')?.value || 'all';
  const dateStartVal = document.getElementById('admin-events-date-start')?.value || '';
  const dateEndVal = document.getElementById('admin-events-date-end')?.value || '';
  const photoStatusFilter = document.getElementById('admin-events-filter-photo-status')?.value || 'all';

  // Filtrar eventos
  let filteredEvents = events.filter(e => {
    // Filtro por búsqueda de texto
    const clientNameClean = (e.clientName || '').toLowerCase();
    const eventTypeClean = translateEventType(e.eventType).toLowerCase();
    const eventIdClean = e.id.toLowerCase();
    const matchesSearch = clientNameClean.includes(searchVal) || eventTypeClean.includes(searchVal) || eventIdClean.includes(searchVal);
    if (!matchesSearch) return false;

    // Filtro por estado de fotografía
    if (photoStatusFilter !== 'all') {
      const ePhotoStatus = e.photoStatus || 'sin_fotografia';
      if (ePhotoStatus !== photoStatusFilter) return false;
    }

    // Filtro por fecha de evento
    if (dateMode !== 'all' && e.date) {
      const eventDate = new Date(e.date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateMode === 'last30') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return eventDate >= thirtyDaysAgo && eventDate <= today;
      } else if (dateMode === 'next30') {
        const thirtyDaysAhead = new Date(today);
        thirtyDaysAhead.setDate(today.getDate() + 30);
        return eventDate >= today && eventDate <= thirtyDaysAhead;
      } else if (dateMode === 'custom') {
        if (dateStartVal) {
          const startDate = new Date(dateStartVal + 'T00:00:00');
          if (eventDate < startDate) return false;
        }
        if (dateEndVal) {
          const endDate = new Date(dateEndVal + 'T00:00:00');
          if (eventDate > endDate) return false;
        }
      }
    } else if (dateMode !== 'all' && !e.date) {
      return false; // Excluir eventos sin fecha si hay filtro activo
    }

    return true;
  });

  if (filteredEvents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No se encontraron eventos que coincidan con la búsqueda.</td></tr>`;
    return;
  }

  filteredEvents.forEach(e => {
    const payments = e.payments || [];
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = (e.totalValue || 0) - paid;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span style="font-size:0.8rem; color:var(--text-muted);">${e.id.substring(0,6)}</span></td>
      <td>
        <strong>${translateEventType(e.eventType)}</strong><br>
        <span style="font-size:0.85rem; color:var(--text-secondary);">${e.clientName || 'Sin Nombre'}</span><br>
        <span class="badge ${getPhotoStatusBadgeClass(e.photoStatus)}" style="font-size:0.65rem; padding:0.1rem 0.4rem; margin-top:4px; text-transform:uppercase;">📸 ${translatePhotoStatus(e.photoStatus)}</span>
      </td>
      <td>${e.date} ${e.time || ''}</td>
      <td>${e.guests} pers.</td>
      <td>$${e.totalValue.toLocaleString()} COP</td>
      <td style="color:${balance > 0 ? 'var(--danger)' : 'var(--success)'}">$${balance.toLocaleString()} COP</td>
      <td><span class="badge badge-${e.status}">${e.status}</span></td>
      <td>
        <button class="btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="openEventModalById('${e.id}')">Editar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 4. Tarifas y Productos (Catálogo)
async function renderAdminProducts() {
  const baseSettings = await DB.getSettings();

  settingsAvailableColors = baseSettings.availableColors || ["Blanco", "Dorado", "Plateado", "Azul Rey", "Rojo Pasión", "Verde Esmeralda", "Rosa Pastel"];
  renderColorChips(settingsAvailableColors);

  const photoInstructionsEl = document.getElementById('setting-photo-instructions');
  if (photoInstructionsEl) {
    photoInstructionsEl.value = baseSettings.photoInstructions || '';
  }

  // Cargar valores de marca y contrato
  const bizNameEl = document.getElementById('setting-business-name');
  if (bizNameEl) bizNameEl.value = baseSettings.businessName || 'Control Banquete';

  const bizSubEl = document.getElementById('setting-business-subtitle');
  if (bizSubEl) bizSubEl.value = baseSettings.businessSubtitle || 'Gestión Integral';

  const bizLogoEl = document.getElementById('setting-business-logo-url');
  if (bizLogoEl) bizLogoEl.value = baseSettings.businessLogoUrl || '';

  const contractTextEl = document.getElementById('setting-contract-text');
  if (contractTextEl) contractTextEl.value = baseSettings.contractText || '';

  // Cargar valores del tema
  const defaultLanguageEl = document.getElementById('setting-default-language');
  if (defaultLanguageEl) defaultLanguageEl.value = baseSettings.defaultLanguage || 'es';

  const themePaletteEl = document.getElementById('setting-theme-palette');
  if (themePaletteEl) themePaletteEl.value = baseSettings.themePalette || 'gold';

  const themeFontEl = document.getElementById('setting-theme-font');
  if (themeFontEl) themeFontEl.value = baseSettings.themeFont || 'outfit';

  const themeFontSizeEl = document.getElementById('setting-theme-font-size');
  if (themeFontSizeEl) themeFontSizeEl.value = baseSettings.themeFontSize || '16px';

  // Limpiar y poblar los valores base dinámicos (personalizados)
  const customContainer = document.getElementById('settings-custom-container');
  if (customContainer) {
    customContainer.innerHTML = '';
    
    // Migración retrocompatible si no existe customSettings
    let customSettings = baseSettings.customSettings;
    if (!customSettings || !Array.isArray(customSettings) || customSettings.length === 0) {
      customSettings = [
        { label: "Costo por Mesero (COP)", value: baseSettings.costoMesero !== undefined ? baseSettings.costoMesero : 110000, type: "fixed" },
        { label: "Alimentación Base por Persona (COP)", value: baseSettings.costoAlimentacion !== undefined ? baseSettings.costoAlimentacion : 36000, type: "per_person" },
        { label: "Descripción de Alimentación Base (para el cliente)", value: baseSettings.descripcionAlimentacion || "Incluye plato principal caliente (receta seleccionada), entrada, bebida ilimitada y postre con menaje completo.", type: "text" },
        { label: "Teléfono / WhatsApp 1", value: baseSettings.telefonoContacto1 || "3163048505", type: "text" }
      ];
      if (baseSettings.telefonoContacto2 && baseSettings.telefonoContacto2.trim() !== '' && baseSettings.telefonoContacto2 !== 'NO TIENEN X') {
        customSettings.push({ label: "Teléfono / WhatsApp 2", value: baseSettings.telefonoContacto2, type: "text" });
      }
      if (baseSettings.telefonoContactoFoto) {
        customSettings.push({ label: "Teléfono / WhatsApp Fotografía", value: baseSettings.telefonoContactoFoto, type: "text" });
      }
    }
    
    customSettings.forEach(cs => {
      addCustomSettingRow(cs.label, cs.value, cs.type);
    });
  }
  
  const prods = await DB.getProducts();
  const tbody = document.getElementById('admin-products-list');
  tbody.innerHTML = '';
  
  // Obtener el valor del filtro de categoría seleccionado
  const filterVal = document.getElementById('admin-catalog-filter')?.value || 'all';
  const menuCategories = ['coctel', 'arroz', 'carne', 'ensalada', 'postre', 'liquido', 'torta', 'pasabocas'];
  const showReorder = true;

  // Función auxiliar para determinar si se debe mostrar una categoría de producto
  function matchesFilter(cat) {
    if (filterVal === 'all') return true;
    if (filterVal === 'main') return !menuCategories.includes(cat);
    if (filterVal === 'menu') return menuCategories.includes(cat) || cat === 'catering';
    return filterVal === cat;
  }

  // Agregar salones
  if (matchesFilter('venue')) {
    prods.venues.forEach(p => addProductRow(p, tbody, showReorder));
  }
  // Agregar catering
  if (matchesFilter('catering') && prods.catering) {
    prods.catering.forEach(p => addProductRow(p, tbody, showReorder));
  }
  // Agregar fotos
  if (matchesFilter('photography')) {
    prods.photography.forEach(p => addProductRow(p, tbody, showReorder));
  }
  // Agregar decoraciones
  if (matchesFilter('decoration')) {
    prods.decoration.forEach(p => addProductRow(p, tbody, showReorder));
  }
  // Agregar recreacion
  if (matchesFilter('recreation') && prods.recreation) {
    prods.recreation.forEach(p => addProductRow(p, tbody, showReorder));
  }
  
  // Agregar servicios
  if (matchesFilter('service')) {
    const renderedIds = new Set();
    Object.keys(prods.services).forEach(eventType => {
      prods.services[eventType].forEach(p => {
        if (!renderedIds.has(p.id)) {
          renderedIds.add(p.id);
          addProductRow(p, tbody, showReorder);
        }
      });
    });
  }

  // Agregar opciones de menú
  menuCategories.forEach(cat => {
    if (prods[cat] && matchesFilter(cat)) {
      prods[cat].forEach(p => addProductRow(p, tbody, showReorder));
    }
  });
}

function addProductRow(p, tbody, showReorder = false) {
  const tr = document.createElement('tr');
  const catNames = {
    venue: 'Salón',
    catering: 'Plan de Alimentación',
    photography: 'Fotografía',
    decoration: 'Decoración',
    recreation: 'Paquete Recreativo',
    service: 'Servicio Adicional',
    coctel: 'Cóctel (Menú)',
    arroz: 'Arroz (Menú)',
    carne: 'Carne (Menú)',
    ensalada: 'Ensalada (Menú)',
    postre: 'Postre (Menú)',
    liquido: 'Líquido (Menú)',
    torta: 'Torta (Menú)',
    pasabocas: 'Pasabocas (Menú)'
  };
  
  let infoHtml = '';
  if (p.shoppingList && Array.isArray(p.shoppingList) && p.shoppingList.length > 0) {
    const lines = [];
    p.shoppingList.forEach(item => {
      if (item.supplier || item.purchaseInstructions) {
        let details = [];
        if (item.supplier) details.push(`Prov: <span style="color:var(--accent-gold);">${item.supplier}</span>`);
        if (item.purchaseInstructions) details.push(`Inst: ${item.purchaseInstructions}`);
        lines.push(`• <strong>${item.name}</strong> (${details.join(', ')})`);
      }
    });
    if (lines.length > 0) {
      infoHtml = `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.25rem; line-height:1.3; max-width:400px; white-space:normal;">${lines.join('<br>')}</div>`;
    }
  }
  
  if (p.infoUrl && p.infoUrl.trim() !== '') {
    infoHtml += `<div style="font-size:0.75rem; margin-top:0.25rem;"><a href="${p.infoUrl}" target="_blank" style="color:var(--accent-gold); text-decoration:underline;">Ver Enlace de Información</a></div>`;
  }

  const reorderHtml = showReorder ? `
    <button class="btn-secondary" style="padding:0.3rem 0.5rem; font-size:0.8rem; margin-right:2px; font-weight:bold; cursor:pointer;" onclick="moveProductUp('${p.id}', '${p.category}')" title="Subir">▲</button>
    <button class="btn-secondary" style="padding:0.3rem 0.5rem; font-size:0.8rem; margin-right:4px; font-weight:bold; cursor:pointer;" onclick="moveProductDown('${p.id}', '${p.category}')" title="Bajar">▼</button>
  ` : '';

  tr.innerHTML = `
    <td>
      <strong>${p.name}</strong>
      ${infoHtml}
    </td>
    <td><span class="badge" style="background:rgba(255,255,255,0.05); color:white;">${catNames[p.category] || p.category}</span></td>
    <td><span style="font-size:0.85rem; color:var(--text-secondary);">${p.eventType ? translateEventType(p.eventType) : 'Todos'}</span></td>
    <td>$${p.price.toLocaleString()} COP</td>
    <td>
      ${reorderHtml}
      <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="editProduct('${p.id}', '${p.category}', '${p.eventType || ''}')">Editar</button>
      <button class="btn-logout" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="deleteProduct('${p.id}', '${p.category}', '${p.eventType || ''}')">Eliminar</button>
    </td>
  `;
  tbody.appendChild(tr);
}

function getFlatProductsByCategory(category) {
  if (category === 'venue') return allProducts.venues;
  if (category === 'catering') return allProducts.catering;
  if (category === 'photography') return allProducts.photography;
  if (category === 'decoration') return allProducts.decoration;
  if (category === 'recreation') return allProducts.recreation;
  if (['coctel', 'arroz', 'carne', 'ensalada', 'postre', 'liquido', 'torta', 'pasabocas'].includes(category)) {
    return allProducts[category] || [];
  }
  if (category === 'service') {
    const uniqueMap = new Map();
    if (allProducts.services) {
      Object.keys(allProducts.services).forEach(evtType => {
        allProducts.services[evtType].forEach(p => {
          uniqueMap.set(p.id, p);
        });
      });
    }
    return Array.from(uniqueMap.values());
  }
  return [];
}

async function moveProductInDirection(id, category, direction) {
  const list = getFlatProductsByCategory(category);
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return;
  
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= list.length) return;
  
  // Intercambiar
  const temp = list[idx];
  list[idx] = list[targetIdx];
  list[targetIdx] = temp;
  
  const orders = list.map((p, index) => ({
    id: p.id,
    position: index
  }));
  
  try {
    const response = await fetch('/api/products/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('controlbanquete_token')}`
      },
      body: JSON.stringify({ orders })
    });
    if (!response.ok) {
      throw new Error("Error al reordenar en el servidor");
    }
    
    // Recargar productos
    allProducts = await DB.getProducts();
    populateCotizadorDropdowns();
    renderAdminProducts();
  } catch (err) {
    alert("Error al cambiar orden: " + err.message);
  }
}

window.moveProductUp = (id, category) => {
  moveProductInDirection(id, category, 'up');
};

window.moveProductDown = (id, category) => {
  moveProductInDirection(id, category, 'down');
};

window.editProduct = async (id, category, eventType) => {
  const prods = await DB.getProducts();
  let item = null;
  
  const menuCategories = ['coctel', 'arroz', 'carne', 'ensalada', 'postre', 'liquido', 'torta', 'pasabocas'];
  if (category === 'venue') item = prods.venues.find(p => p.id === id);
  else if (category === 'catering') item = prods.catering.find(p => p.id === id);
  else if (category === 'photography') item = prods.photography.find(p => p.id === id);
  else if (category === 'decoration') item = prods.decoration.find(p => p.id === id);
  else if (category === 'recreation') item = prods.recreation.find(p => p.id === id);
  else if (menuCategories.includes(category)) item = prods[category].find(p => p.id === id);
  else {
    if (eventType && prods.services[eventType]) {
      item = prods.services[eventType].find(p => p.id === id);
    }
    if (!item) {
      for (const key of Object.keys(prods.services)) {
        const found = prods.services[key].find(p => p.id === id);
        if (found) {
          item = found;
          break;
        }
      }
    }
  }
  
  if (item) {
    openProductModal(item);
  }
};

window.deleteProduct = async (id, category, eventType) => {
  if (confirm("¿Estás seguro de eliminar este producto/tarifa?")) {
    await DB.deleteProduct(id, category, eventType);
    await loadCommonData();
    renderAdminProducts();
  }
};

async function saveBaseSettings(e) {
  e.preventDefault();

  // Extraer valores base dinámicos (personalizados y principales)
  const customSettings = [];
  const rows = document.querySelectorAll('.setting-custom-row');
  rows.forEach(row => {
    const label = row.querySelector('.setting-custom-label').value.trim();
    const type = row.querySelector('.setting-custom-type').value;
    const valueEl = row.querySelector('.setting-custom-value');
    let val = valueEl ? valueEl.value : '';
    if (type !== 'text') {
      val = parseFloat(val) || 0;
    }
    if (label !== '') {
      customSettings.push({ label, value: val, type });
    }
  });

  // Mapear de forma inteligente los valores a las propiedades esperadas por la aplicación
  let costoMesero = 110000;
  let costoAlimentacion = 36000;
  let descripcionAlimentacion = 'Incluye plato principal caliente (receta seleccionada), entrada, bebida ilimitada y postre con menaje completo.';
  let telefonoContacto1 = '3163048505';
  let telefonoContacto2 = '';
  let telefonoContactoFoto = '';

  let phoneCount = 0;
  customSettings.forEach(cs => {
    const labelLower = cs.label.toLowerCase();
    if (labelLower.includes('mesero')) {
      costoMesero = parseFloat(cs.value) || 0;
    } else if (labelLower.includes('alimentación') || labelLower.includes('alimentacion')) {
      if (cs.type === 'text') {
        descripcionAlimentacion = cs.value;
      } else {
        costoAlimentacion = parseFloat(cs.value) || 0;
      }
    } else if (labelLower.includes('foto') || labelLower.includes('fotografía') || labelLower.includes('fotografia')) {
      if (labelLower.includes('teléfono') || labelLower.includes('telefono') || labelLower.includes('whatsapp') || labelLower.includes('contacto')) {
        telefonoContactoFoto = String(cs.value).trim();
      }
    } else if (labelLower.includes('teléfono') || labelLower.includes('telefono') || labelLower.includes('whatsapp') || labelLower.includes('contacto')) {
      phoneCount++;
      if (phoneCount === 1) {
        telefonoContacto1 = String(cs.value).trim();
      } else if (phoneCount === 2) {
        telefonoContacto2 = String(cs.value).trim();
      }
    }
  });

  const photoInstructions = document.getElementById('setting-photo-instructions')?.value || '';
  const businessName = document.getElementById('setting-business-name')?.value.trim() || 'Control Banquete';
  const businessSubtitle = document.getElementById('setting-business-subtitle')?.value.trim() || 'Gestión Integral';
  const businessLogoUrl = document.getElementById('setting-business-logo-url')?.value.trim() || '';
  const contractText = document.getElementById('setting-contract-text')?.value.trim() || '';

  const defaultLanguage = document.getElementById('setting-default-language')?.value || 'es';
  const themePalette = document.getElementById('setting-theme-palette')?.value || 'gold';
  const themeFont = document.getElementById('setting-theme-font')?.value || 'outfit';
  const themeFontSize = document.getElementById('setting-theme-font-size')?.value || '16px';

  const settings = {
    costoMesero,
    costoAlimentacion,
    descripcionAlimentacion,
    telefonoContacto1,
    telefonoContacto2,
    telefonoContactoFoto,
    customSettings,
    photoInstructions,
    businessName,
    businessSubtitle,
    businessLogoUrl,
    contractText,
    availableColors: settingsAvailableColors,
    themePalette,
    themeFont,
    themeFontSize,
    defaultLanguage
  };
  
  try {
    systemSettings = await DB.saveSettings(settings);
    updateWhatsAppFloatingBtn();
    applyBrandingAndContract();
    applyDynamicTheme({
      palette: systemSettings.themePalette,
      font: systemSettings.themeFont,
      fontSize: systemSettings.themeFontSize
    });
    alert("Valores operativos base actualizados de manera correcta.");
    calculateLiveCotizacion();
  } catch (err) {
    alert("Error al actualizar configuración: " + err.message);
  }
}

function renderColorChips(colors) {
  const container = document.getElementById('settings-colors-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (!colors || colors.length === 0) {
    container.innerHTML = '<span style="font-size:0.8rem; color:var(--text-secondary); font-style:italic;">No hay colores configurados.</span>';
    return;
  }
  
  colors.forEach((col, idx) => {
    const chip = document.createElement('span');
    chip.className = 'color-chip';
    chip.style.display = 'inline-flex';
    chip.style.alignItems = 'center';
    chip.style.gap = '0.3rem';
    chip.style.padding = '0.25rem 0.6rem';
    chip.style.background = 'rgba(212, 175, 55, 0.15)';
    chip.style.border = '1px solid rgba(212, 175, 55, 0.3)';
    chip.style.borderRadius = '16px';
    chip.style.color = 'var(--accent-gold)';
    chip.style.fontSize = '0.8rem';
    chip.style.fontWeight = '500';
    
    chip.innerHTML = `
      ${col}
      <span style="cursor:pointer; font-weight:700; color:var(--text-secondary); margin-left:0.2rem;" onclick="removeColorSetting(${idx})">&times;</span>
    `;
    container.appendChild(chip);
  });
}

window.removeColorSetting = (idx) => {
  settingsAvailableColors.splice(idx, 1);
  renderColorChips(settingsAvailableColors);
};

function addCustomSettingRow(label = '', value = '', type = 'fixed') {
  const container = document.getElementById('settings-custom-container');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'setting-custom-row setting-item-card';

  div.innerHTML = `
    <div class="setting-item-header">
      <input type="text" class="setting-custom-label setting-item-title-input" value="${label}" placeholder="Nombre del parámetro" required>
      <div class="setting-item-controls">
        <select class="setting-custom-type setting-item-select">
          <option value="fixed" ${type === 'fixed' ? 'selected' : ''}>Fijo (COP)</option>
          <option value="per_person" ${type === 'per_person' ? 'selected' : ''}>x Persona (COP)</option>
          <option value="text" ${type === 'text' ? 'selected' : ''}>Texto</option>
        </select>
        <button type="button" class="setting-item-delete-btn" onclick="this.closest('.setting-custom-row').remove()">X</button>
      </div>
    </div>
    <div class="setting-item-body">
      <div class="setting-custom-value-container"></div>
      <span class="setting-item-hint"></span>
    </div>
  `;

  const valueContainer = div.querySelector('.setting-custom-value-container');
  const typeSelect = div.querySelector('.setting-custom-type');
  const hintEl = div.querySelector('.setting-item-hint');

  function updateValueField(currentType, currentValue) {
    valueContainer.innerHTML = '';
    
    if (currentType === 'text') {
      const textarea = document.createElement('textarea');
      textarea.className = 'setting-custom-value setting-custom-value-text';
      textarea.rows = 2;
      textarea.value = currentValue;
      textarea.placeholder = "Texto o descripción...";
      textarea.required = true;
      textarea.style.cssText = 'padding:0.45rem; font-size:0.85rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary); width:100%; box-sizing:border-box; font-family:inherit; resize:vertical;';
      valueContainer.appendChild(textarea);
      hintEl.textContent = "Parámetro de tipo texto (ej: Descripción de alimentación, teléfono).";
    } else {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'setting-custom-value';
      input.value = currentValue;
      input.placeholder = "Valor (COP)";
      input.required = true;
      input.style.cssText = 'padding:0.45rem; font-size:0.85rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary); width:100%; box-sizing:border-box;';
      valueContainer.appendChild(input);
      
      if (currentType === 'per_person') {
        hintEl.textContent = "Valor cobrado por cada persona invitada (COP).";
      } else {
        hintEl.textContent = "Valor fijo cobrado una única vez por evento (COP).";
      }
    }
  }

  updateValueField(type, value);

  typeSelect.addEventListener('change', (e) => {
    const newValField = valueContainer.querySelector('.setting-custom-value');
    const curVal = newValField ? newValField.value : '';
    updateValueField(e.target.value, curVal);
  });

  container.appendChild(div);
}

// ── Links de Cotizador y Portal ──
function setupAdminLinks() {
  const user = JSON.parse(localStorage.getItem('controlbanquete_current_user') || '{}');
  const tenantId = user.tenantId || user.uid || '';
  if (!tenantId) return;

  const base = window.location.origin;
  const cotizadorLink = `${base}/cotizar?t=${tenantId}`;
  const portalLink    = `${base}/login`;

  const cotInput    = document.getElementById('cotizador-link-input');
  const portalInput = document.getElementById('portal-link-input');
  if (cotInput)    cotInput.value    = cotizadorLink;
  if (portalInput) portalInput.value = portalLink;
}

function copyCotizadorLink() {
  const input = document.getElementById('cotizador-link-input');
  if (!input) return;
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = document.getElementById('btn-copy-link');
    if (btn) { btn.textContent = '✓ Copiado!'; setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000); }
  }).catch(() => { input.select(); document.execCommand('copy'); });
}

function copyPortalLink() {
  const input = document.getElementById('portal-link-input');
  if (!input) return;
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = document.getElementById('btn-copy-portal');
    if (btn) { btn.textContent = '✓ Copiado!'; setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000); }
  }).catch(() => { input.select(); document.execCommand('copy'); });
}

function openCotizadorPreview() {
  const input = document.getElementById('cotizador-link-input');
  if (input && input.value !== 'Cargando...') window.open(input.value, '_blank');
}

// Exponer globalmente para que funcionen los onClicks del HTML
window.copyCotizadorLink = copyCotizadorLink;
window.copyPortalLink = copyPortalLink;
window.openCotizadorPreview = openCotizadorPreview;

// 5. Gestión de Usuarios
async function renderAdminUsers() {
  const tableContainer = document.getElementById('admin-users-table-container');
  const groupedContainer = document.getElementById('admin-users-grouped-container');
  const tbody = document.getElementById('admin-users-list');

  if (!tableContainer || !groupedContainer || !tbody) {
    console.error('[renderAdminUsers] Contenedores no encontrados en el DOM.');
    return;
  }

  // Mostrar indicador de carga inmediatamente
  tableContainer.style.display = 'block';
  groupedContainer.style.display = 'none';
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--accent-gold);">⏳ Cargando usuarios...</td></tr>';

  try {
    const users = await DB.getUsers();
    console.log('[renderAdminUsers] Usuarios obtenidos:', users.length, users);

    const searchVal = (document.getElementById('admin-users-search')?.value || '').toLowerCase();
    const filterRole = document.getElementById('admin-users-filter-role')?.value || 'all';
    const dateMode = document.getElementById('admin-users-filter-date-mode')?.value || 'all';
    const dateStartVal = document.getElementById('admin-users-date-start')?.value || '';
    const dateEndVal = document.getElementById('admin-users-date-end')?.value || '';

    let events = [];
    try { events = await DB.getEvents(); } catch(e) { console.warn('[renderAdminUsers] No se pudieron cargar eventos:', e); }

    // Filtrar lista
    let filteredUsers = users.filter(u => {
      if (!u || !u.name || !u.email) return false;
      const matchesSearch = u.name.toLowerCase().includes(searchVal) || u.email.toLowerCase().includes(searchVal);
      const matchesRole = filterRole === 'all' || u.role === filterRole;
      if (!matchesSearch || !matchesRole) return false;

      if (dateMode !== 'all') {
        const clientEvent = events.find(e => e && (e.clientId === u.uid || (e.clientEmail && e.clientEmail.toLowerCase() === u.email.toLowerCase())));
        if (!clientEvent || !clientEvent.date) return false;

        const eventDate = new Date(clientEvent.date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateMode === 'last30') {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          return eventDate >= thirtyDaysAgo && eventDate <= today;
        } else if (dateMode === 'next30') {
          const thirtyDaysAhead = new Date(today);
          thirtyDaysAhead.setDate(today.getDate() + 30);
          return eventDate >= today && eventDate <= thirtyDaysAhead;
        } else if (dateMode === 'custom') {
          if (dateStartVal) { const startDate = new Date(dateStartVal + 'T00:00:00'); if (eventDate < startDate) return false; }
          if (dateEndVal) { const endDate = new Date(dateEndVal + 'T00:00:00'); if (eventDate > endDate) return false; }
        }
      }
      return true;
    });

    console.log('[renderAdminUsers] Usuarios filtrados:', filteredUsers.length);

    if (filterRole === 'cliente') {
      tableContainer.style.display = 'none';
      groupedContainer.style.display = 'block';
      groupedContainer.innerHTML = '';

      const getFranjaHoraria = (timeStr) => {
        if (!timeStr) return 'Sin Evento / Sin Horario';
        const hour = parseInt(timeStr.split(':')[0]);
        if (isNaN(hour)) return 'Sin Evento / Sin Horario';
        if (hour >= 6 && hour < 12) return 'Mañana (06:00 - 12:00)';
        if (hour >= 12 && hour < 18) return 'Tarde (12:00 - 18:00)';
        if (hour >= 18 && hour < 24) return 'Noche (18:00 - 24:00)';
        return 'Madrugada (00:00 - 06:00)';
      };

      const groups = {
        'Mañana (06:00 - 12:00)': [],
        'Tarde (12:00 - 18:00)': [],
        'Noche (18:00 - 24:00)': [],
        'Madrugada (00:00 - 06:00)': [],
        'Sin Evento / Sin Horario': []
      };

      filteredUsers.forEach(u => {
        const clientEvent = events.find(e => e && (e.clientId === u.uid || (e.clientEmail && e.clientEmail.toLowerCase() === u.email.toLowerCase())));
        const timeStr = clientEvent ? clientEvent.time : null;
        const groupName = getFranjaHoraria(timeStr);
        groups[groupName].push({ user: u, event: clientEvent });
      });

      Object.keys(groups).forEach(groupName => {
        const items = groups[groupName];
        if (items.length === 0) return;
        const groupDiv = document.createElement('div');
        groupDiv.style.marginBottom = '2rem';
        groupDiv.innerHTML = `
          <h4 style="color: var(--accent-gold); margin-bottom: 0.75rem; border-bottom: 1px solid rgba(212,175,55,0.2); padding-bottom: 0.25rem; font-family: var(--font-title); font-size:1.1rem;">⏱️ ${groupName} (${items.length})</h4>
          <div class="table-responsive">
            <table><thead><tr><th>Nombre / Evento</th><th>Email</th><th>Rol</th><th>Teléfono</th><th>Estado Foto</th><th>Acciones</th></tr></thead><tbody></tbody></table>
          </div>
        `;
        const groupTbody = groupDiv.querySelector('tbody');
        items.forEach(item => {
          const u = item.user;
          const e = item.event;
          const photoStatusHtml = e ? `<span class="badge ${getPhotoStatusBadgeClass(e.photoStatus)}" style="font-size:0.7rem; padding:0.1rem 0.4rem; text-transform:uppercase;">📸 ${translatePhotoStatus(e.photoStatus)}</span>` : '-';
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${u.name}</strong><br><span style="font-size:0.75rem; color:var(--accent-gold);">${e ? translateEventType(e.eventType) + ' | ' + e.date + ' ' + (e.time || '') : 'Sin evento programado'}</span></td>
            <td>${u.email}</td>
            <td><span class="badge badge-confirmada">${translateRole(u.role)}</span></td>
            <td>${u.phone || '-'}</td>
            <td>${photoStatusHtml}</td>
            <td>
              <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="editUser('${u.uid}')">Editar</button>
              <button class="btn-logout" style="padding:0.3rem 0.6rem; font-size:0.8rem;" ${u.role === 'superadmin' ? 'disabled' : ''} onclick="deleteUser('${u.uid}')">Eliminar</button>
            </td>
          `;
          groupTbody.appendChild(tr);
        });
        groupedContainer.appendChild(groupDiv);
      });

      if (filteredUsers.length === 0) {
        groupedContainer.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:2rem;">No se encontraron clientes que coincidan con la búsqueda.</p>';
      }

    } else {
      tableContainer.style.display = 'block';
      groupedContainer.style.display = 'none';
      tbody.innerHTML = '';

      if (filteredUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No se encontraron usuarios que coincidan con la búsqueda.</td></tr>`;
        return;
      }

      filteredUsers.forEach(u => {
        const tr = document.createElement('tr');
        const roleBadgeClass = u.role === 'superadmin' ? 'badge-confirmada' : u.role === 'cliente' ? 'badge-en_curso' : 'badge-pendiente_pago';
        tr.innerHTML = `
          <td><strong>${u.name || 'Sin nombre'}</strong></td>
          <td>${u.email || 'Sin email'}</td>
          <td><span class="badge ${roleBadgeClass}">${translateRole(u.role)}</span></td>
          <td>${u.phone || '-'}</td>
          <td><span style="font-size:0.8rem; color:var(--text-secondary);">N/A</span></td>
          <td>
            <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="editUser('${u.uid}')">Editar</button>
            <button class="btn-logout" style="padding:0.3rem 0.6rem; font-size:0.8rem;" ${u.role === 'superadmin' ? 'disabled' : ''} onclick="deleteUser('${u.uid}')">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('[renderAdminUsers] Error:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger);">❌ Error al cargar usuarios: ${err.message}</td></tr>`;
  }
}

window.editUser = async (uid) => {
  const users = await DB.getUsers();
  const user = users.find(u => u.uid === uid);
  if (user) {
    openUserModal(user);
  }
};

window.deleteUser = async (uid) => {
  if (confirm("¿Estás seguro de eliminar este usuario?")) {
    await DB.deleteUser(uid);
    renderAdminUsers();
  }
};

// Modales del Admin
function openUserModal(user = null) {
  const modal = document.getElementById('modal-admin-usuario');
  modal.classList.add('active');
  
  if (user) {
    document.getElementById('modal-usuario-titulo').textContent = "Editar Usuario";
    document.getElementById('user-edit-uid').value = user.uid;
    document.getElementById('u-nombre').value = user.name;
    document.getElementById('u-email').value = user.email;
    document.getElementById('u-rol').value = user.role;
    document.getElementById('u-telefono').value = user.phone || '';
    document.getElementById('u-pass-container').style.display = 'none';
    document.getElementById('u-password').required = false;
  } else {
    document.getElementById('modal-usuario-titulo').textContent = "Nuevo Usuario / Cliente";
    document.getElementById('user-edit-uid').value = '';
    document.getElementById('u-nombre').value = '';
    document.getElementById('u-email').value = '';
    document.getElementById('u-rol').value = 'cliente';
    document.getElementById('u-telefono').value = '';
    document.getElementById('u-pass-container').style.display = 'block';
    document.getElementById('u-password').value = '';
    document.getElementById('u-password').required = true;
  }
}

async function saveAdminUser(e) {
  e.preventDefault();
  const uidVal = document.getElementById('user-edit-uid').value;
  const email = document.getElementById('u-email').value;
  const name = document.getElementById('u-nombre').value;
  const role = document.getElementById('u-rol').value;
  const phone = document.getElementById('u-telefono').value;
  const password = document.getElementById('u-password').value;

  try {
    if (uidVal === '') {
      // Registrar nuevo en DB (y simulador Auth)
      await registerNewUser(email, password, name, role, phone);
      alert("Usuario creado exitosamente.");
    } else {
      // Actualizar existente
      await DB.saveUser({
        uid: uidVal,
        email,
        name,
        role,
        phone
      });
      alert("Usuario actualizado exitosamente.");
    }
    closeModel('modal-admin-usuario');
    renderAdminUsers();
  } catch (err) {
    alert("Error al guardar usuario: " + err.message);
  }
}

// --- GESTIÓN DE PROVEEDORES (CRUD) ---
async function renderAdminProviders() {
  const tbody = document.getElementById('admin-providers-list');
  if (!tbody) return;
  tbody.innerHTML = '';

  const searchVal = document.getElementById('admin-providers-search') ? document.getElementById('admin-providers-search').value.toLowerCase().trim() : '';

  try {
    allProviders = await DB.getProviders();
  } catch (err) {
    console.error("Error al obtener proveedores:", err);
  }

  const filtered = allProviders.filter(p => {
    const matchName = p.name && p.name.toLowerCase().includes(searchVal);
    const matchPhone = p.phone && p.phone.toLowerCase().includes(searchVal);
    const matchEmail = p.email && p.email.toLowerCase().includes(searchVal);
    const matchDesc = p.description && p.description.toLowerCase().includes(searchVal);
    return matchName || matchPhone || matchEmail || matchDesc;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No se encontraron proveedores.</td></tr>`;
    return;
  }

  filtered.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.name}</strong></td>
      <td>${p.phone || '-'}</td>
      <td>${p.email || '-'}</td>
      <td>${p.address || '-'}</td>
      <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${p.description || '-'}</span></td>
      <td>
        <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="editProvider('${p.id}')">Editar</button>
        <button class="btn-logout" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="deleteProvider('${p.id}')">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openProviderModal(prov = null) {
  const modal = document.getElementById('modal-admin-proveedor');
  if (!modal) return;
  modal.classList.add('active');

  if (prov) {
    document.getElementById('modal-proveedor-titulo').textContent = "Editar Proveedor";
    document.getElementById('prov-edit-id').value = prov.id;
    document.getElementById('prov-nombre').value = prov.name;
    document.getElementById('prov-telefono').value = prov.phone || '';
    document.getElementById('prov-email').value = prov.email || '';
    document.getElementById('prov-direccion').value = prov.address || '';
    document.getElementById('prov-descripcion').value = prov.description || '';
  } else {
    document.getElementById('modal-proveedor-titulo').textContent = "Nuevo Proveedor";
    document.getElementById('prov-edit-id').value = '';
    document.getElementById('prov-nombre').value = '';
    document.getElementById('prov-telefono').value = '';
    document.getElementById('prov-email').value = '';
    document.getElementById('prov-direccion').value = '';
    document.getElementById('prov-descripcion').value = '';
  }
}

async function saveAdminProvider(e) {
  e.preventDefault();
  const idVal = document.getElementById('prov-edit-id').value;
  const name = document.getElementById('prov-nombre').value.trim();
  const phone = document.getElementById('prov-telefono').value.trim();
  const email = document.getElementById('prov-email').value.trim();
  const address = document.getElementById('prov-direccion').value.trim();
  const description = document.getElementById('prov-descripcion').value.trim();

  const prov = { name, phone, email, address, description };
  if (idVal !== '') prov.id = idVal;

  try {
    await DB.saveProvider(prov);
    alert("Proveedor guardado correctamente.");
    closeModel('modal-admin-proveedor');
    await loadCommonData();
    renderAdminProviders();
  } catch (err) {
    alert("Error al guardar proveedor: " + err.message);
  }
}

window.editProvider = async (id) => {
  const p = allProviders.find(prov => prov.id === id);
  if (p) {
    openProviderModal(p);
  } else {
    alert("Proveedor no encontrado.");
  }
};

window.deleteProvider = async (id) => {
  if (confirm("¿Estás seguro de que deseas eliminar este proveedor?")) {
    try {
      await DB.deleteProvider(id);
      alert("Proveedor eliminado correctamente.");
      await loadCommonData();
      renderAdminProviders();
    } catch (err) {
      alert("Error al eliminar proveedor: " + err.message);
    }
  }
};

// --- NOTIFICACIONES Y ALERTAS (ESTILO FACEBOOK) ---
function startNotificationPolling() {
  if (notificationInterval) clearInterval(notificationInterval);
  notificationInterval = setInterval(checkNotifications, 60000); // 60s
}

function stopNotificationPolling() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}

async function checkNotifications() {
  if (!currentRole || (currentRole !== 'superadmin' && currentRole !== 'compras')) {
    stopNotificationPolling();
    return;
  }
  
  try {
    const list = await DB.getNotifications();
    
    // Filter notifications based on role
    if (currentRole === 'superadmin') {
      allNotifications = list;
    } else if (currentRole === 'compras') {
      allNotifications = list.filter(n => n.role === 'compras' || n.role === null || n.role === '');
    } else {
      allNotifications = [];
    }

    const unreadCount = allNotifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-badge');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
    
    const modal = document.getElementById('modal-notifications');
    if (modal && modal.classList.contains('active')) {
      renderNotificationsList();
    }
  } catch (err) {
    console.error("Error checking notifications:", err);
  }
}

function renderNotificationsList() {
  const container = document.getElementById('notifications-list');
  if (!container) return;
  container.innerHTML = '';

  if (allNotifications.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 2rem 0;">No tienes notificaciones en este momento.</p>`;
    return;
  }

  allNotifications.forEach(n => {
    const isUnread = !n.read;
    const timeStr = new Date(n.createdAt).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemDiv = document.createElement('div');
    itemDiv.className = `notification-item ${n.type || 'info'} ${isUnread ? 'unread' : ''}`;
    
    itemDiv.innerHTML = `
      <div class="notification-item-header">
        <span class="notification-item-title">${n.title}</span>
        <span class="notification-item-time">${timeStr}</span>
      </div>
      <div class="notification-item-message">${n.message}</div>
      <div class="notification-item-actions">
        ${isUnread ? `<button class="notification-btn-read" onclick="markNotificationRead('${n.id}')">Marcar leída</button>` : ''}
        <button class="notification-btn-read" style="color: var(--accent-violet); text-decoration: none; font-weight: 600;" onclick="handleNotificationRedirect('${n.type}', '${n.id}')">Ver detalle &rarr;</button>
      </div>
    `;
    container.appendChild(itemDiv);
  });
}

window.openNotificationsModal = () => {
  const modal = document.getElementById('modal-notifications');
  if (modal) {
    modal.classList.add('active');
    renderNotificationsList();
  }
};

window.markNotificationRead = async (id) => {
  try {
    await DB.markNotificationRead(id);
    await checkNotifications();
  } catch (err) {
    console.error("Error marking notification read:", err);
  }
};

window.markAllNotificationsRead = async () => {
  try {
    await DB.markAllNotificationsRead();
    await checkNotifications();
  } catch (err) {
    console.error("Error marking all notifications read:", err);
  }
};

window.handleNotificationRedirect = async (type, notificationId) => {
  await markNotificationRead(notificationId);
  closeModel('modal-notifications');
  
  if (type === 'quote') {
    navigateTo('view-admin');
    const tabBtn = document.querySelector('.tab-btn[data-tab="admin-quotes"]');
    if (tabBtn) tabBtn.click();
  } else if (type === 'contract' || type === 'payment') {
    navigateTo('view-admin');
    const tabBtn = document.querySelector('.tab-btn[data-tab="admin-events"]');
    if (tabBtn) tabBtn.click();
  } else if (type === 'inventory') {
    navigateTo('view-compras');
  }
};

function findProductInCatalogByName(name) {
  if (!name) return null;
  const nameLower = name.toLowerCase().trim();
  
  const keys = ['venues', 'photography', 'decoration', 'catering', 'recreation', 'coctel', 'arroz', 'carne', 'ensalada', 'postre', 'liquido', 'torta', 'pasabocas'];
  for (const key of keys) {
    const list = allProducts[key];
    if (Array.isArray(list)) {
      const found = list.find(p => p.name.toLowerCase().trim() === nameLower);
      if (found) return found;
    }
  }
  
  if (allProducts.services) {
    for (const evt in allProducts.services) {
      const list = allProducts.services[evt];
      if (Array.isArray(list)) {
        const found = list.find(p => p.name.toLowerCase().trim() === nameLower);
        if (found) return found;
      }
    }
  }
  
  return null;
}

function openProductModal(prod = null) {
  const modal = document.getElementById('modal-admin-producto');
  modal.classList.add('active');
  
  // Limpiar lista de compras asociada
  const listItemsContainer = document.getElementById('prod-shopping-list-items');
  if (listItemsContainer) {
    listItemsContainer.innerHTML = '';
  }
  
  const mgtItemsContainer = document.getElementById('prod-management-list-items');
  if (mgtItemsContainer) {
    mgtItemsContainer.innerHTML = '';
  }

  if (prod) {
    document.getElementById('modal-producto-titulo').textContent = "Editar Tarifa / Servicio";
    document.getElementById('prod-edit-id').value = prod.id;
    document.getElementById('p-nombre').value = prod.name;
    document.getElementById('p-categoria').value = prod.category;
    document.getElementById('p-precio').value = prod.price;
    document.getElementById('p-descripcion').value = prod.description || '';
    document.getElementById('p-info-url').value = prod.infoUrl || '';
    document.getElementById('p-allow-multiples').checked = prod.allowMultiples === true || prod.allowMultiples === 'true';
    
    const eContainer = document.getElementById('p-event-type-container');
    if (prod.category === 'service') {
      eContainer.style.display = 'block';
      // Reset all checkboxes first
      document.querySelectorAll('.p-evt-checkbox').forEach(cb => cb.checked = false);
      const evtType = prod.eventType || 'todos';
      if (evtType === 'todos') {
        document.getElementById('p-evt-todos').checked = true;
      } else {
        const parts = evtType.split(',').map(x => x.trim());
        parts.forEach(val => {
          const cb = document.querySelector(`.p-evt-checkbox[value="${val}"]`);
          if (cb) cb.checked = true;
        });
      }
    } else {
      eContainer.style.display = 'none';
    }

    // Poblar lista de compras si existe
    if (prod.shoppingList && Array.isArray(prod.shoppingList)) {
      prod.shoppingList.forEach(item => {
        addProductShoppingRow(item.name, item.quantity, item.unit, item.scaleWithGuests, item.supplier, item.purchaseInstructions);
      });
    }
    
    // Poblar lista de gestiones si existe
    if (prod.managementList && Array.isArray(prod.managementList)) {
      prod.managementList.forEach(item => {
        addProductManagementRow(item.task, item.assignTo);
      });
    }
  } else {
    document.getElementById('modal-producto-titulo').textContent = "Nuevo Producto / Servicio";
    document.getElementById('prod-edit-id').value = '';
    document.getElementById('p-nombre').value = '';
    document.getElementById('p-categoria').value = 'venue';
    document.getElementById('p-precio').value = '';
    document.getElementById('p-descripcion').value = '';
    document.getElementById('p-info-url').value = '';
    document.getElementById('p-allow-multiples').checked = false;
    document.getElementById('p-event-type-container').style.display = 'none';
    // Clear and set default to 'todos'
    document.querySelectorAll('.p-evt-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('p-evt-todos').checked = true;
  }
}

async function saveAdminProduct(e) {
  e.preventDefault();
  const idVal = document.getElementById('prod-edit-id').value;
  const name = document.getElementById('p-nombre').value;
  const category = document.getElementById('p-categoria').value;
  const price = parseInt(document.getElementById('p-precio').value);
  const description = document.getElementById('p-descripcion').value;
  const infoUrl = document.getElementById('p-info-url').value.trim();
  
  let eventType = null;
  if (category === 'service') {
    const todosChecked = document.getElementById('p-evt-todos')?.checked;
    if (todosChecked) {
      eventType = 'todos';
    } else {
      const checkedVals = Array.from(document.querySelectorAll('.p-evt-single:checked')).map(cb => cb.value);
      if (checkedVals.length > 0) {
        eventType = checkedVals.join(',');
      } else {
        eventType = 'grados_otros';
      }
    }
  }

  const allowMultiples = document.getElementById('p-allow-multiples').checked;
  const product = { name, category, price, description, infoUrl, allowMultiples };
  if (idVal !== '') product.id = idVal;
  if (eventType) product.eventType = eventType;

  // Extraer lista de compras
  const shoppingList = [];
  const rows = document.querySelectorAll('.prod-shopping-row-item');
  rows.forEach(row => {
    const itemName = row.querySelector('.prod-item-name').value.trim();
    const qty = parseFloat(row.querySelector('.prod-item-qty').value);
    const unit = row.querySelector('.prod-item-unit').value.trim();
    const scaleWithGuests = row.querySelector('.prod-item-scale').checked;
    const supplier = row.querySelector('.prod-item-supplier') ? row.querySelector('.prod-item-supplier').value.trim() : '';
    const purchaseInstructions = row.querySelector('.prod-item-instructions') ? row.querySelector('.prod-item-instructions').value.trim() : '';
    if (itemName !== '') {
      shoppingList.push({ name: itemName, quantity: qty, unit, scaleWithGuests, supplier, purchaseInstructions });
    }
  });
  product.shoppingList = shoppingList;

  // Extraer lista de gestiones y contrataciones
  const managementList = [];
  const mgtRows = document.querySelectorAll('.prod-management-row-item');
  mgtRows.forEach(row => {
    const taskName = row.querySelector('.prod-mgt-task').value.trim();
    const assignTo = row.querySelector('.prod-mgt-assign').value;
    if (taskName !== '') {
      managementList.push({ task: taskName, assignTo: assignTo });
    }
  });
  product.managementList = managementList;

  try {
    await DB.saveProduct(product);
    
    // Crear receta base en cocina si es una categoría de menú y no existe
    const menuCategories = ['coctel', 'arroz', 'carne', 'ensalada', 'postre', 'liquido', 'torta', 'pasabocas'];
    if (menuCategories.includes(category)) {
      try {
        const recipes = await DB.getRecipes();
        const existingRecipe = recipes.find(r => r.name.toLowerCase().trim() === name.toLowerCase().trim());
        if (!existingRecipe) {
          const newRecipe = {
            name: name,
            category: category,
            baseGuests: 50,
            procedure: "Registrado desde el Catálogo de Servicios y Tarifas.",
            ingredients: []
          };
          await DB.saveRecipe(newRecipe);
        }
      } catch (e) {
        console.error("Error al sincronizar receta base:", e);
      }
    }

    alert("Producto guardado de manera correcta en el catálogo.");
    closeModel('modal-admin-producto');
    await loadCommonData();
    renderAdminProducts();
  } catch (err) {
    alert("Error al guardar producto: " + err.message);
  }
}

function addProductShoppingRow(name = '', qty = '', unit = '', scale = false, supplier = '', purchaseInstructions = '') {
  const container = document.getElementById('prod-shopping-list-items');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'prod-shopping-row-item';
  div.style.background = 'rgba(255,255,255,0.02)';
  div.style.border = '1px solid rgba(255,255,255,0.05)';
  div.style.borderRadius = '8px';
  div.style.padding = '0.75rem';
  div.style.marginBottom = '0.75rem';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.gap = '0.5rem';

  const providerOptions = allProviders.map(p => 
    `<option value="${p.name}" ${p.name === supplier ? 'selected' : ''}>${p.name}</option>`
  ).join('');

  div.innerHTML = `
    <!-- Fila principal (Datos básicos y eliminar) -->
    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr auto; gap: 0.5rem; align-items: center;">
      <input type="text" class="prod-item-name" value="${name}" placeholder="Insumo (Ej: Mantel)" required style="padding:0.4rem; font-size:0.8rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary);">
      <input type="number" step="0.01" class="prod-item-qty" value="${qty}" placeholder="Cant." required style="padding:0.4rem; font-size:0.8rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary);">
      <input type="text" class="prod-item-unit" value="${unit}" placeholder="Unidad" required style="padding:0.4rem; font-size:0.8rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary);">
      <label style="font-size:0.75rem; display:flex; align-items:center; gap:0.25rem; cursor:pointer; color:var(--text-primary);">
        <input type="checkbox" class="prod-item-scale" ${scale ? 'checked' : ''}> x Persona
      </label>
      <button type="button" style="padding:0.4rem 0.6rem; border-radius:8px; font-size:0.85rem; background:#e53e3e; color:#ffffff; border:none; cursor:pointer; font-weight:700; width:30px; height:30px; display:flex; align-items:center; justify-content:center;" onclick="this.closest('.prod-shopping-row-item').remove()">X</button>
    </div>
    <!-- Fila secundaria (Proveedor e instrucciones de compra) -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
      <select class="prod-item-supplier" style="padding:0.4rem; font-size:0.8rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary);">
        <option value="">-- Seleccionar Proveedor --</option>
        ${providerOptions}
      </select>
      <input type="text" class="prod-item-instructions" value="${purchaseInstructions}" placeholder="Instrucciones de compra..." style="padding:0.4rem; font-size:0.8rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary);">
    </div>
  `;
  container.appendChild(div);
}

function addProductManagementRow(task = '', assignTo = '') {
  const container = document.getElementById('prod-management-list-items');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'prod-management-row-item';
  div.style.background = 'rgba(255,255,255,0.02)';
  div.style.border = '1px solid rgba(255,255,255,0.05)';
  div.style.borderRadius = '8px';
  div.style.padding = '0.75rem';
  div.style.marginBottom = '0.75rem';
  div.style.display = 'grid';
  div.style.gridTemplateColumns = '2fr 1fr auto';
  div.style.gap = '0.5rem';
  div.style.alignItems = 'center';

  div.innerHTML = `
    <input type="text" class="prod-mgt-task" value="${task}" placeholder="Gestión (Ej: Contratar Dj, Tramitar permiso)" required style="padding:0.4rem; font-size:0.8rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary);">
    <select class="prod-mgt-assign" required style="padding:0.4rem; font-size:0.8rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-primary);">
      <option value="logistica" ${assignTo === 'logistica' ? 'selected' : ''}>Logística</option>
      <option value="admin" ${assignTo === 'admin' ? 'selected' : ''}>Administración</option>
      <option value="compras" ${assignTo === 'compras' ? 'selected' : ''}>Compras</option>
      <option value="decoracion" ${assignTo === 'decoracion' ? 'selected' : ''}>Decoración</option>
      <option value="recreacion" ${assignTo === 'recreacion' ? 'selected' : ''}>Recreación</option>
      <option value="cocina" ${assignTo === 'cocina' ? 'selected' : ''}>Cocina</option>
    </select>
    <button type="button" style="padding:0.4rem 0.6rem; border-radius:8px; font-size:0.85rem; background:#e53e3e; color:#ffffff; border:none; cursor:pointer; font-weight:700; width:30px; height:30px; display:flex; align-items:center; justify-content:center;" onclick="this.closest('.prod-management-row-item').remove()">X</button>
  `;
  container.appendChild(div);
}

function findProductById(id, allProds) {
  if (!id) return null;
  // Buscar en venues
  let match = allProds.venues.find(p => p.id === id);
  if (match) return match;
  // Buscar en photography
  match = allProds.photography.find(p => p.id === id);
  if (match) return match;
  // Buscar en decoration
  match = allProds.decoration.find(p => p.id === id);
  if (match) return match;
  // Buscar en services (objeto agrupado por eventType)
  for (const key of Object.keys(allProds.services)) {
    const list = allProds.services[key];
    match = list.find(p => p.id === id);
    if (match) return match;
  }
  // Buscar en categorías de menú
  const menuCats = ['coctel', 'arroz', 'carne', 'ensalada', 'postre', 'liquido', 'torta', 'pasabocas'];
  for (const cat of menuCats) {
    if (allProds[cat]) {
      match = allProds[cat].find(p => p.id === id);
      if (match) return match;
    }
  }
  return null;
}

function renderClientSelectOptions(filterText = '') {
  const clientSelect = document.getElementById('ev-cliente');
  if (!clientSelect) return;
  const currentValue = clientSelect.value;
  const clients = window.lastLoadedClients || [];
  const filtered = clients.filter(c => {
    const text = `${c.name} ${c.email} ${c.phone || ''}`.toLowerCase();
    return text.includes(filterText.toLowerCase());
  });
  
  let html = '<option value="">Selecciona un cliente...</option>';
  filtered.forEach(c => {
    html += `<option value="${c.uid}">${c.name} (${c.email})</option>`;
  });
  clientSelect.innerHTML = html;
  
  // Restore selected value if it's still in the filtered list
  if (currentValue && filtered.some(c => c.uid === currentValue)) {
    clientSelect.value = currentValue;
  }
}

// Modal Evento
async function openEventModal(ev = null) {
  const modal = document.getElementById('modal-admin-evento');
  modal.classList.add('active');
  
  // Cargar Clientes para dropdown
  const users = await DB.getUsers();
  window.lastLoadedClients = users.filter(u => u.role === 'cliente');
  const searchInput = document.getElementById('ev-cliente-search');
  if (searchInput) searchInput.value = '';
  renderClientSelectOptions('');

  // Cargar Salones dropdown
  const salonSelect = document.getElementById('ev-salon');
  salonSelect.innerHTML = '';
  allProducts.venues.forEach(v => {
    salonSelect.innerHTML += `<option value="${v.id}">${v.name}</option>`;
  });

  // Cargar Fotografía, Decoración y Catering dropdowns
  const cateringSelect = document.getElementById('ev-catering');
  if (cateringSelect) {
    cateringSelect.innerHTML = '<option value="none">Sin Alimentación</option>';
    if (allProducts.catering && Array.isArray(allProducts.catering)) {
      allProducts.catering.forEach(c => {
        cateringSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    }
  }

  const fotoSelect = document.getElementById('ev-foto');
  fotoSelect.innerHTML = '<option value="">Sin Fotografía</option>';
  allProducts.photography.forEach(p => {
    fotoSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
  });

  const decoSelect = document.getElementById('ev-deco');
  decoSelect.innerHTML = '<option value="">Sin Decoración</option>';
  allProducts.decoration.forEach(d => {
    decoSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
  });

  const recreationSelect = document.getElementById('ev-recreation');
  recreationSelect.innerHTML = '<option value="">Sin Recreación</option>';
  if (allProducts.recreation && Array.isArray(allProducts.recreation)) {
    allProducts.recreation.forEach(p => {
      recreationSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
  }

  // Inicializar abonos y cronograma vacíos
  const abonosLista = document.getElementById('ev-abonos-lista');
  if (abonosLista) abonosLista.innerHTML = '';
  const cronoLista = document.getElementById('ev-cronograma-lista');
  if (cronoLista) cronoLista.innerHTML = '';
  const citasLista = document.getElementById('ev-citas-lista');
  if (citasLista) citasLista.innerHTML = '';

  if (ev && ev.id) {
    document.getElementById('modal-evento-titulo').textContent = "Editar Evento";
    document.getElementById('event-edit-id').value = ev.id;
    document.getElementById('event-quotation-id').value = ev.quotationId || '';
    document.getElementById('ev-cliente').value = ev.clientId;
    document.getElementById('ev-tipo').value = ev.eventType;
    document.getElementById('ev-salon').value = ev.venueId;
    document.getElementById('ev-fecha').value = ev.date;
    document.getElementById('ev-hora').value = ev.time || '16:00';
    document.getElementById('ev-invitados').value = ev.guests;
    if (cateringSelect) {
      cateringSelect.value = ev.cateringId || 'none';
    }
    document.getElementById('ev-foto').value = ev.photographyId || '';
    document.getElementById('ev-deco').value = ev.decorationId || '';
    document.getElementById('ev-recreation').value = ev.recreationId || '';
    document.getElementById('ev-total').value = ev.totalValue;
    document.getElementById('ev-status').value = ev.status || 'confirmado';
    document.getElementById('ev-photo-drive').value = ev.photoDriveLink || '';
    document.getElementById('ev-photo-selection').value = ev.photoSelectionText || '';
    document.getElementById('ev-photo-selection-locked').value = ev.photoSelectionLocked ? 'true' : 'false';
    updateAdminReceivePhotosButton(ev.photoSelectionLocked || false);
    document.getElementById('ev-photo-status').value = ev.photoStatus || 'sin_fotografia';
    document.getElementById('ev-allow-color-selection').checked = ev.allowColorSelection || false;

    // Cargar citas existentes
    const appointmentsList = ev.appointments || [];
    appointmentsList.forEach((app, idx) => {
      addAppointmentInput(app.title, app.date, app.time, idx);
    });

    // Cargar abonos existentes
    const payList = ev.payments || [];
    payList.forEach((p, idx) => {
      addAbonoInput(p.date, p.amount, p.type, idx);
    });

    // Cargar cronograma existente
    const timelineList = ev.timeline || [];
    timelineList.forEach((t, idx) => {
      addTimelineInput(t.time, t.activity, t.completed, idx);
    });

    // Cargar servicios contratados
    populateAdminEventServices(ev.eventType, ev.selectedServices || []);
  } else {
    document.getElementById('modal-evento-titulo').textContent = "Crear Nuevo Evento";
    document.getElementById('event-edit-id').value = '';
    document.getElementById('event-quotation-id').value = '';
    document.getElementById('ev-cliente').value = '';
    document.getElementById('ev-tipo').value = 'boda';
    document.getElementById('ev-fecha').value = ev ? (ev.date || '') : '';
    document.getElementById('ev-hora').value = '16:00';
    document.getElementById('ev-invitados').value = '80';
    if (cateringSelect) {
      cateringSelect.value = 'none';
    }
    document.getElementById('ev-foto').value = '';
    document.getElementById('ev-deco').value = '';
    document.getElementById('ev-recreation').value = '';
    document.getElementById('ev-total').value = '0';
    document.getElementById('ev-status').value = 'confirmado';
    document.getElementById('ev-photo-drive').value = '';
    document.getElementById('ev-photo-selection').value = '';
    document.getElementById('ev-photo-selection-locked').value = 'false';
    updateAdminReceivePhotosButton(false);
    document.getElementById('ev-photo-status').value = 'sin_fotografia';
    document.getElementById('ev-allow-color-selection').checked = false;

    // Cargar servicios vacíos
    populateAdminEventServices('boda', []);

    // Cargar cronograma por defecto
    const defaultTimeline = [
      { time: "16:00", activity: "Ingreso de Logística y Decoración", completed: false },
      { time: "18:00", activity: "Llegada de invitados y coctel de bienvenida", completed: false },
      { time: "19:00", activity: "Acto protocolario", completed: false },
      { time: "20:00", activity: "Cena (Plato principal)", completed: false },
      { time: "21:00", activity: "Apertura de pista de baile y mesa de postres", completed: false },
      { time: "01:00", activity: "Fin del evento", completed: false }
    ];
    defaultTimeline.forEach((t, idx) => {
      addTimelineInput(t.time, t.activity, t.completed, idx);
    });
  }
}

function updateAdminReceivePhotosButton(isLocked) {
  const btn = document.getElementById('btn-admin-receive-photos');
  const inputLocked = document.getElementById('ev-photo-selection-locked');
  if (!btn) return;
  
  if (isLocked) {
    btn.innerHTML = '🔒 Recibido (Bloqueado)';
    btn.style.background = 'linear-gradient(135deg, var(--danger) 0%, #c53030 100%)';
    btn.style.boxShadow = '0 4px 10px rgba(229, 62, 62, 0.2)';
    if (inputLocked) inputLocked.value = 'true';
  } else {
    btn.innerHTML = '📥 Marcar como Recibido';
    btn.style.background = 'linear-gradient(135deg, var(--success) 0%, #2f855a 100%)';
    btn.style.boxShadow = '0 4px 10px rgba(56, 161, 105, 0.2)';
    if (inputLocked) inputLocked.value = 'false';
  }
}

// Bindeo especial de botón de agregar abono en modal evento
document.getElementById('btn-ev-agregar-abono').addEventListener('click', () => {
  addAbonoInput(new Date().toISOString().substring(0,10), 500000, 'abono');
});

// Bindeo especial de botón de agregar actividad de cronograma en modal evento
document.getElementById('btn-ev-agregar-actividad').addEventListener('click', () => {
  addTimelineInput('16:00', '', false);
});

// Bindeo especial de botón de agregar cita en modal evento
document.getElementById('btn-ev-agregar-cita')?.addEventListener('click', () => {
  addAppointmentInput('', new Date().toISOString().substring(0,10), '10:00');
});

function addAppointmentInput(title = '', date = '', time = '', index = null) {
  const container = document.getElementById('ev-citas-lista');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'cita-row-item';
  div.style.display = 'flex';
  div.style.gap = '0.5rem';
  div.style.marginBottom = '0.5rem';
  div.style.flexWrap = 'wrap';
  
  div.innerHTML = `
    <input type="text" class="cita-title" value="${title}" placeholder="Título (ej: Ensayo de Edecanes)" required style="flex-grow: 2; padding:0.4rem; min-width: 150px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-family: inherit;">
    <input type="date" class="cita-date" value="${date}" required style="flex-grow: 1; padding:0.4rem; min-width: 120px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-family: inherit;">
    <input type="time" class="cita-time" value="${time}" required style="flex-grow: 0.5; padding:0.4rem; min-width: 80px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-family: inherit;">
    <button type="button" class="btn-logout" style="padding:0.4rem 0.8rem; border-radius:8px; align-self: center;" onclick="this.closest('.cita-row-item').remove()">X</button>
  `;
  container.appendChild(div);
}

function addAbonoInput(date = '', amount = 0, type = 'abono', index = null) {
  const container = document.getElementById('ev-abonos-lista');
  const div = document.createElement('div');
  div.className = 'abono-row-item';
  
  div.innerHTML = `
    <input type="date" class="abono-date" value="${date}" required style="padding:0.4rem;">
    <input type="number" class="abono-amount" value="${amount}" placeholder="Monto" required style="padding:0.4rem;">
    <select class="abono-type" style="padding:0.4rem;">
      <option value="abono" ${type === 'abono' ? 'selected' : ''}>Abono inicial</option>
      <option value="saldo" ${type === 'saldo' ? 'selected' : ''}>Liquidación saldo</option>
      <option value="extra" ${type === 'extra' ? 'selected' : ''}>Adicional</option>
    </select>
    <button type="button" class="btn-logout" style="padding:0.4rem; border-radius:8px;" onclick="this.closest('.abono-row-item').remove()">X</button>
  `;
  container.appendChild(div);
}

function addTimelineInput(time = '', activity = '', completed = false, index = null) {
  const container = document.getElementById('ev-cronograma-lista');
  const div = document.createElement('div');
  div.className = 'cronograma-row-item';
  
  div.innerHTML = `
    <input type="time" class="crono-time" value="${time}" required style="padding:0.4rem;">
    <input type="text" class="crono-activity" value="${activity}" placeholder="Actividad" required style="padding:0.4rem;">
    <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.8rem; margin:0; cursor:pointer;">
      <input type="checkbox" class="crono-completed" ${completed ? 'checked' : ''}> Realizada
    </label>
    <button type="button" class="btn-logout" style="padding:0.4rem; border-radius:8px;" onclick="this.closest('.cronograma-row-item').remove()">X</button>
  `;
  container.appendChild(div);
}

function populateAdminEventServices(eventType, selectedIds = []) {
  const container = document.getElementById('ev-servicios-lista-checklist');
  container.innerHTML = '';
  
  const services = allProducts.services[eventType] || [];
  
  if (services.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary); font-size:0.9rem;">No hay servicios adicionales configurados para este tipo de evento.</p>';
    return;
  }
  
  const counts = {};
  selectedIds.forEach(id => {
    counts[id] = (counts[id] || 0) + 1;
  });
  
  services.forEach(s => {
    const card = document.createElement('div');
    card.className = 'select-card';
    card.setAttribute('data-id', s.id);
    card.setAttribute('data-price', s.price);
    
    const hasQuantity = s.allowMultiples === true;
    
    if (hasQuantity) {
      const initialQty = counts[s.id] || 0;
      card.setAttribute('data-has-qty', 'true');
      card.setAttribute('data-qty', initialQty.toString());
      if (initialQty > 0) {
        card.classList.add('selected');
      }
      
      card.innerHTML = `
        <div class="select-card-name">${s.name}</div>
        ${s.description ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem; line-height:1.2;">${s.description}</div>` : ''}
        <div class="select-card-price" style="margin-bottom:0.5rem;">+$${s.price.toLocaleString()} COP</div>
        <div class="qty-controller" onclick="event.stopPropagation()">
          <button type="button" class="btn-qty-minus">-</button>
          <span class="qty-display">${initialQty}</span>
          <button type="button" class="btn-qty-plus">+</button>
        </div>
      `;
      
      const updateQty = (newQty) => {
        card.setAttribute('data-qty', newQty.toString());
        card.querySelector('.qty-display').textContent = newQty;
        if (newQty > 0) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      };
      
      card.addEventListener('click', () => {
        const currentQty = parseInt(card.getAttribute('data-qty') || '0');
        if (currentQty > 0) {
          updateQty(0);
        } else {
          updateQty(1);
        }
      });
      
      card.querySelector('.btn-qty-minus').addEventListener('click', (e) => {
        e.stopPropagation();
        const currentQty = parseInt(card.getAttribute('data-qty') || '0');
        if (currentQty > 0) updateQty(currentQty - 1);
      });
      
      card.querySelector('.btn-qty-plus').addEventListener('click', (e) => {
        e.stopPropagation();
        const currentQty = parseInt(card.getAttribute('data-qty') || '0');
        updateQty(currentQty + 1);
      });
      
    } else {
      if (selectedIds.includes(s.id)) {
        card.classList.add('selected');
      }
      card.innerHTML = `
        <div class="select-card-name">${s.name}</div>
        ${s.description ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem; line-height:1.2;">${s.description}</div>` : ''}
        <div class="select-card-price">+$${s.price.toLocaleString()} COP</div>
      `;
      card.addEventListener('click', () => {
        card.classList.toggle('selected');
      });
    }
    
    container.appendChild(card);
  });
}

window.openEventModalById = async (id) => {
  const events = await DB.getEvents();
  const ev = events.find(e => e.id === id);
  if (ev) openEventModal(ev);
};

async function saveAdminEvent(e) {
  e.preventDefault();
  const idVal = document.getElementById('event-edit-id').value;
  const quotationId = document.getElementById('event-quotation-id').value;
  const clientId = document.getElementById('ev-cliente').value;
  const eventType = document.getElementById('ev-tipo').value;
  const venueId = document.getElementById('ev-salon').value;
  const date = document.getElementById('ev-fecha').value;
  const time = document.getElementById('ev-hora').value;
  const guests = parseInt(document.getElementById('ev-invitados').value);
  const cateringId = document.getElementById('ev-catering') ? document.getElementById('ev-catering').value : 'none';
  const photographyId = document.getElementById('ev-foto').value;
  const decorationId = document.getElementById('ev-deco').value;
  const recreationId = document.getElementById('ev-recreation').value;
  const totalValue = parseInt(document.getElementById('ev-total').value);
  const photoDriveLink = document.getElementById('ev-photo-drive') ? document.getElementById('ev-photo-drive').value.trim() : '';
  const photoSelectionText = document.getElementById('ev-photo-selection') ? document.getElementById('ev-photo-selection').value.trim() : '';
  const photoStatus = document.getElementById('ev-photo-status') ? document.getElementById('ev-photo-status').value : 'sin_fotografia';

  // Obtener la información del cliente
  const users = await DB.getUsers();
  const clientObj = users.find(u => u.uid === clientId);

  // Extraer los abonos de los inputs del modal
  const payments = [];
  document.querySelectorAll('.abono-row-item').forEach(row => {
    payments.push({
      date: row.querySelector('.abono-date').value,
      amount: parseInt(row.querySelector('.abono-amount').value),
      type: row.querySelector('.abono-type').value
    });
  });

  const status = document.getElementById('ev-status').value;
  const selectedServices = [];
  document.querySelectorAll('#ev-servicios-lista-checklist .select-card.selected').forEach(card => {
    const qtyAttr = card.getAttribute('data-qty');
    const qty = qtyAttr ? parseInt(qtyAttr) : 1;
    for (let i = 0; i < qty; i++) {
      selectedServices.push(card.getAttribute('data-id'));
    }
  });

  // Extraer el cronograma de los inputs del modal
  const timeline = [];
  document.querySelectorAll('.cronograma-row-item').forEach(row => {
    timeline.push({
      time: row.querySelector('.crono-time').value,
      activity: row.querySelector('.crono-activity').value,
      completed: row.querySelector('.crono-completed').checked
    });
  });

  const allowColorSelection = document.getElementById('ev-allow-color-selection') ? document.getElementById('ev-allow-color-selection').checked : false;
  
  // Extraer las citas/ensayos del modal
  const appointments = [];
  document.querySelectorAll('.cita-row-item').forEach(row => {
    appointments.push({
      title: row.querySelector('.cita-title').value.trim(),
      date: row.querySelector('.cita-date').value,
      time: row.querySelector('.cita-time').value
    });
  });

  // Intentar preservar el color seleccionado anteriormente
  let existingColor = '';
  let existingColors = [];
  if (idVal !== '') {
    const events = await DB.getEvents();
    const ev = events.find(e => e.id === idVal);
    if (ev) {
      if (ev.selectedColor) existingColor = ev.selectedColor;
      if (ev.selectedColors) existingColors = ev.selectedColors;
    }
  }

  const event = {
    clientId,
    clientName: clientObj ? clientObj.name : 'Cliente Anónimo',
    clientEmail: clientObj ? clientObj.email : '',
    eventType,
    venueId,
    date,
    time,
    guests,
    cateringId,
    photographyId,
    decorationId,
    recreationId,
    totalValue,
    payments,
    status,
    selectedServices,
    quotationId,
    timeline,
    photoDriveLink,
    photoSelectionText,
    photoSelectionLocked: document.getElementById('ev-photo-selection-locked') ? document.getElementById('ev-photo-selection-locked').value === 'true' : false,
    photoStatus,
    allowColorSelection,
    appointments,
    selectedColor: existingColor,
    selectedColors: existingColors
  };

  try {
    if (idVal === '') {
      await DB.createEvent(event);
      alert("Evento agendado exitosamente.");
    } else {
      await DB.updateEvent(idVal, event);
      alert("Evento actualizado exitosamente.");
    }
    closeModel('modal-admin-evento');
    renderCalendar();
    renderAdminEvents();
  } catch (err) {
    alert("Error al guardar evento: " + err.message);
  }
}

// ==========================================
// MÓDULO 6: COCINA & RECETARIO MAESTRO
// ==========================================
let activeRecipes = [];
let selectedRecipe = null;

async function loadCocinaView() {
  activeRecipes = await DB.getRecipes();
  
  // Listar recetas en sidebar
  const lista = document.getElementById('cocina-recetas-lista');
  lista.innerHTML = '';
  
  if (activeRecipes.length === 0) {
    lista.innerHTML = '<p style="text-align:center; padding:1rem; font-size:0.9rem;">No hay recetas guardadas.</p>';
    document.getElementById('cocina-receta-detalle').style.display = 'none';
    return;
  }
  
  activeRecipes.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'btn-secondary';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    btn.style.justifyContent = 'flex-start';
    
    const catLabels = { coctel: 'Cóctel', arroz: 'Arroz', carne: 'Carne', ensalada: 'Ensalada', postre: 'Postre', liquido: 'Líquido', torta: 'Torta', pasabocas: 'Pasabocas' };
    const catLabel = catLabels[r.category] || 'Sin Cat.';
    
    btn.innerHTML = `🍲 <strong>${r.name}</strong> <span class="badge" style="font-size:0.7rem; padding:0.1rem 0.4rem; background:rgba(255,255,255,0.05); margin-left:0.5rem; color:var(--accent-gold);">${catLabel}</span> <span style="font-size:0.75rem; color:var(--text-secondary); margin-left:auto;">(${r.baseGuests} pers.)</span>`;
    btn.addEventListener('click', () => {
      // Activar
      lista.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = 'var(--accent-gold)';
      selectedRecipe = r;
      renderRecipeDetails();
    });
    lista.appendChild(btn);
  });
  
  // Mostrar primera receta
  if (activeRecipes.length > 0) {
    selectedRecipe = activeRecipes[0];
    lista.children[0].style.borderColor = 'var(--accent-gold)';
    renderRecipeDetails();
  }
}

function renderRecipeDetails() {
  if (!selectedRecipe) return;
  
  document.getElementById('cocina-receta-detalle').style.display = 'block';
  document.getElementById('cocina-receta-id').value = selectedRecipe.id;
  document.getElementById('cocina-receta-titulo').textContent = selectedRecipe.name;
  document.getElementById('cocina-base-invitados').textContent = `${selectedRecipe.baseGuests} personas`;
  
  // Poner el input en la cantidad base original
  document.getElementById('cocina-escalar-invitados').value = selectedRecipe.baseGuests;
  
  scaleRecipeDetails();
}

function scaleRecipeDetails() {
  if (!selectedRecipe) return;
  
  const targetGuests = parseInt(document.getElementById('cocina-escalar-invitados').value) || selectedRecipe.baseGuests;
  const factor = targetGuests / selectedRecipe.baseGuests;
  
  const tbody = document.getElementById('cocina-ingredientes-tbody');
  tbody.innerHTML = '';
  
  selectedRecipe.ingredients.forEach(ing => {
    const scaledQty = ing.quantity * factor;
    // Formatear decimales
    const formattedScaled = Number(scaledQty.toFixed(2));
    
    tbody.innerHTML += `
      <tr>
        <td><strong>${ing.name}</strong></td>
        <td>${ing.quantity}</td>
        <td style="color:var(--accent-gold); font-weight:700;">${formattedScaled}</td>
        <td>${ing.unit}</td>
      </tr>
    `;
  });
  
  document.getElementById('cocina-procedimiento-texto').textContent = selectedRecipe.procedure;
}

// Crear/Editar recetas modales
function openRecipeModal(recipe = null) {
  const modal = document.getElementById('modal-cocina-receta');
  modal.classList.add('active');
  
  const listContainer = document.getElementById('rec-ingredientes-lista');
  listContainer.innerHTML = '';
  
  if (recipe) {
    document.getElementById('modal-receta-titulo').textContent = "Editar Receta";
    document.getElementById('rec-edit-id').value = recipe.id;
    document.getElementById('rec-nombre').value = recipe.name;
    document.getElementById('rec-categoria').value = recipe.category || 'carne';
    document.getElementById('rec-base-invitados').value = recipe.baseGuests;
    document.getElementById('rec-procedimiento').value = recipe.procedure;
    
    recipe.ingredients.forEach(ing => {
      addRecipeIngredientRow(ing.name, ing.quantity, ing.unit);
    });
  } else {
    document.getElementById('modal-receta-titulo').textContent = "Nueva Receta";
    document.getElementById('rec-edit-id').value = '';
    document.getElementById('rec-nombre').value = '';
    document.getElementById('rec-categoria').value = 'carne';
    document.getElementById('rec-base-invitados').value = '50';
    document.getElementById('rec-procedimiento').value = '';
    
    // Un renglón de ingrediente vacío por defecto
    addRecipeIngredientRow();
  }
}

function addRecipeIngredientRow(name = '', qty = '', unit = 'kg') {
  const container = document.getElementById('rec-ingredientes-lista');
  const div = document.createElement('div');
  div.className = 'form-grid ingrediente-row-item';
  div.style.gap = '0.5rem';
  div.style.marginBottom = '0.5rem';
  
  div.innerHTML = `
    <input type="text" class="ing-name" value="${name}" placeholder="Ingrediente (Ej: Carne)" required style="padding:0.4rem;">
    <input type="number" step="0.01" class="ing-qty" value="${qty}" placeholder="Cant." required style="padding:0.4rem; max-width:80px;">
    <input type="text" class="ing-unit" value="${unit}" placeholder="Unidad" required style="padding:0.4rem; max-width:80px;">
    <button type="button" class="btn-logout" style="padding:0.4rem; border-radius:8px;" onclick="this.closest('.ingrediente-row-item').remove()">X</button>
  `;
  container.appendChild(div);
}

async function saveCocinaRecipe(e) {
  e.preventDefault();
  const idVal = document.getElementById('rec-edit-id').value;
  const name = document.getElementById('rec-nombre').value;
  const category = document.getElementById('rec-categoria').value;
  const baseGuests = parseInt(document.getElementById('rec-base-invitados').value);
  const procedure = document.getElementById('rec-procedimiento').value;
  
  const ingredients = [];
  document.querySelectorAll('.ingrediente-row-item').forEach(row => {
    ingredients.push({
      name: row.querySelector('.ing-name').value,
      quantity: parseFloat(row.querySelector('.ing-qty').value),
      unit: row.querySelector('.ing-unit').value
    });
  });

  const recipe = { name, category, baseGuests, procedure, ingredients };
  if (idVal !== '') recipe.id = idVal;

  try {
    await DB.saveRecipe(recipe);
    
    // Crear producto correspondiente en el catálogo si no existe
    try {
      const existingProduct = findProductInCatalogByName(name);
      if (!existingProduct) {
        const newProduct = {
          category: category,
          name: name,
          price: 0,
          description: "Plato del menú registrado desde Cocina.",
          allowMultiples: false,
          shoppingList: [],
          managementList: [],
          requiresLogistics: false
        };
        await DB.saveProduct(newProduct);
      }
    } catch (e) {
      console.error("Error al sincronizar producto en catálogo:", e);
    }

    alert("Receta guardada con éxito en el recetario maestro.");
    closeModel('modal-cocina-receta');
    await loadCommonData();
    loadCocinaView();
  } catch (err) {
    alert("Error al guardar receta: " + err.message);
  }
}

function editActiveRecipe() {
  if (selectedRecipe) openRecipeModal(selectedRecipe);
}

async function deleteActiveRecipe() {
  if (selectedRecipe && confirm(`¿Estás seguro de borrar la receta de "${selectedRecipe.name}"?`)) {
    await DB.deleteRecipe(selectedRecipe.id);
    alert("Receta eliminada del recetario.");
    loadCocinaView();
  }
}

// ==========================================
// MÓDULO 5 Y 7: COMPRAS & INVENTARIO
// ==========================================
async function loadComprasView() {
  // Cargar eventos en el dropdown para calcular compras
  const events = await DB.getEvents();
  const select = document.getElementById('compras-select-evento');
  select.innerHTML = '<option value="">Selecciona un evento...</option>';
  
  // Mostrar eventos confirmados y pendientes
  events.filter(e => e.status === 'confirmado' || e.status === 'pendiente_pago').forEach(e => {
    select.innerHTML += `<option value="${e.id}">${e.clientName || 'Cliente'} - ${e.date} (${e.guests} pers.)</option>`;
  });
  
  renderInventoryTable();
}

async function renderInventoryTable() {
  const inv = await DB.getInventory();
  const tbody = document.getElementById('compras-inventario-tbody');
  tbody.innerHTML = '';
  
  const alertsContainer = document.getElementById('inventory-alerts-container');
  alertsContainer.innerHTML = '';
  
  let lowStockAlerts = [];

  inv.forEach(item => {
    const isLow = item.quantity <= item.minStock;
    if (isLow) {
      lowStockAlerts.push(item.name);
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.name}</strong></td>
      <td><span class="${isLow ? 'low-stock' : ''}">${item.quantity} ${item.unit}</span></td>
      <td>${item.minStock} ${item.unit}</td>
      <td><span class="badge" style="background:rgba(255,255,255,0.05); color:white;">${item.category}</span></td>
      <td>
        <button class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="editInventoryItem('${item.id}')">Editar</button>
        <button class="btn-logout" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="deleteInventoryItem('${item.id}')">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Inyectar alertas de faltantes
  if (lowStockAlerts.length > 0) {
    alertsContainer.innerHTML = `
      <div style="background:rgba(229, 62, 62, 0.15); border:1px solid var(--danger); padding:1rem; border-radius:8px; color:#fc8181; font-weight:500;">
        ⚠️ <strong>Alerta de Existencias Bajas</strong>: Los siguientes insumos se encuentran por debajo del stock mínimo: ${lowStockAlerts.join(', ')}.
      </div>
    `;
  }
}

window.editInventoryItem = async (id) => {
  const inv = await DB.getInventory();
  const item = inv.find(i => i.id === id);
  if (item) openInventoryModal(item);
};

window.deleteInventoryItem = async (id) => {
  if (confirm("¿Eliminar este insumo del inventario?")) {
    await DB.deleteInventoryItem(id);
    renderInventoryTable();
  }
};

function openInventoryModal(item = null) {
  const modal = document.getElementById('modal-compras-item');
  modal.classList.add('active');
  
  // Populate provider dropdown first
  const provSelect = document.getElementById('i-proveedor');
  if (provSelect) {
    provSelect.innerHTML = '<option value="">-- Seleccionar Proveedor (Opcional) --</option>';
    allProviders.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      provSelect.appendChild(opt);
    });
  }

  if (item) {
    document.getElementById('modal-item-titulo').textContent = "Editar Insumo";
    document.getElementById('item-edit-id').value = item.id;
    document.getElementById('i-nombre').value = item.name;
    document.getElementById('i-cantidad').value = item.quantity;
    document.getElementById('i-unidad').value = item.unit;
    document.getElementById('i-categoria').value = item.category;
    document.getElementById('i-minimo').value = item.minStock;
    if (provSelect) {
      provSelect.value = item.supplier || '';
    }
  } else {
    document.getElementById('modal-item-titulo').textContent = "Nuevo Insumo";
    document.getElementById('item-edit-id').value = '';
    document.getElementById('i-nombre').value = '';
    document.getElementById('i-cantidad').value = '';
    document.getElementById('i-unidad').value = 'kg';
    document.getElementById('i-categoria').value = 'alimentos';
    document.getElementById('i-minimo').value = '5';
    if (provSelect) {
      provSelect.value = '';
    }
  }
}

async function saveInventoryItem(e) {
  e.preventDefault();
  const idVal = document.getElementById('item-edit-id').value;
  const name = document.getElementById('i-nombre').value;
  const quantity = parseFloat(document.getElementById('i-cantidad').value);
  const unit = document.getElementById('i-unidad').value;
  const category = document.getElementById('i-categoria').value;
  const minStock = parseFloat(document.getElementById('i-minimo').value);
  const supplier = document.getElementById('i-proveedor') ? document.getElementById('i-proveedor').value : '';
  
  const item = { name, quantity, unit, category, minStock, supplier };
  if (idVal !== '') item.id = idVal;

  try {
    await DB.updateInventoryItem(item);
    alert("Insumo guardado en inventario.");
    closeModel('modal-compras-item');
    renderInventoryTable();
  } catch (err) {
    alert("Error al guardar item: " + err.message);
  }
}

// Algoritmo de Compra Automática
async function calculateAutomatedPurchase() {
  const eventId = document.getElementById('compras-select-evento').value;
  
  if (!eventId) {
    alert("Selecciona un evento de la lista.");
    return;
  }
  
  const events = await DB.getEvents();
  const ev = events.find(e => e.id === eventId);
  
  if (!ev) return;
  const recipes = await DB.getRecipes();
  const menuFields = [
    { key: 'coctel', label: 'Cóctel' },
    { key: 'arroz', label: 'Arroz' },
    { key: 'carne', label: 'Carne' },
    { key: 'ensalada', label: 'Ensalada' },
    { key: 'postre', label: 'Postre' },
    { key: 'liquido', label: 'Líquido' },
    { key: 'torta', label: 'Torta' },
    { key: 'pasabocas', label: 'Pasabocas' }
  ];
  
  const consolidated = {};
  let foundAnyRecipe = false;
  let menuDescriptions = [];
  
  if (ev.menu) {
    menuFields.forEach(field => {
      const choice = ev.menu[field.key] || '';
      if (choice) {
        const recipe = recipes.find(r => r.name.toLowerCase() === choice.toLowerCase());
        if (recipe) {
          foundAnyRecipe = true;
          menuDescriptions.push(`${field.label}: ${recipe.name}`);
          const factor = ev.guests / recipe.baseGuests;
          recipe.ingredients.forEach(ing => {
            const ingNameNormalized = ing.name.toLowerCase();
            const required = ing.quantity * factor;
            if (consolidated[ingNameNormalized]) {
              consolidated[ingNameNormalized].required += required;
            } else {
              consolidated[ingNameNormalized] = {
                name: ing.name,
                required: required,
                unit: ing.unit
              };
            }
          });
        }
      }
    });
  }

  // Consolidar insumos de servicios del catálogo asociados al evento
  const allProds = await DB.getProducts();
  const selectedProductIds = [];
  if (ev.venueId) selectedProductIds.push(ev.venueId);
  if (ev.photographyId) selectedProductIds.push(ev.photographyId);
  if (ev.decorationId) selectedProductIds.push(ev.decorationId);
  if (ev.recreationId) selectedProductIds.push(ev.recreationId);
  if (ev.selectedServices && Array.isArray(ev.selectedServices)) {
    selectedProductIds.push(...ev.selectedServices);
  }

  const serviceItemNames = [];
  selectedProductIds.forEach(id => {
    const prodObj = findProductById(id, allProds);
    if (prodObj && prodObj.shoppingList && Array.isArray(prodObj.shoppingList)) {
      let productHasInsumos = false;
      prodObj.shoppingList.forEach(item => {
        const itemNameNormalized = item.name.toLowerCase();
        let required = parseFloat(item.quantity);
        if (isNaN(required)) required = 0;
        
        // Si depende de los invitados ("x Persona"), multiplicar
        if (item.scaleWithGuests) {
          required = required * ev.guests;
        }

        if (required > 0) {
          productHasInsumos = true;
          if (consolidated[itemNameNormalized]) {
            consolidated[itemNameNormalized].required += required;
            if (item.supplier) {
              if (!consolidated[itemNameNormalized].suppliers) consolidated[itemNameNormalized].suppliers = [];
              if (!consolidated[itemNameNormalized].suppliers.includes(item.supplier)) {
                consolidated[itemNameNormalized].suppliers.push(item.supplier);
              }
            }
            if (item.purchaseInstructions) {
              if (!consolidated[itemNameNormalized].instructions) consolidated[itemNameNormalized].instructions = [];
              if (!consolidated[itemNameNormalized].instructions.includes(item.purchaseInstructions)) {
                consolidated[itemNameNormalized].instructions.push(item.purchaseInstructions);
              }
            }
          } else {
            consolidated[itemNameNormalized] = {
              name: item.name,
              required: required,
              unit: item.unit || 'und',
              suppliers: item.supplier ? [item.supplier] : [],
              instructions: item.purchaseInstructions ? [item.purchaseInstructions] : []
            };
          }
        }
      });
      if (productHasInsumos) {
        serviceItemNames.push(prodObj.name);
      }
    }
  });

  const hasConsolidatedItems = Object.keys(consolidated).length > 0;
  if (!hasConsolidatedItems) {
    alert("No se encontraron recetas ni insumos asociados a los servicios contratados para calcular la lista de compras.");
    return;
  }
  
  let labelText = `Menú Consolidado: ${menuDescriptions.join(' | ') || 'Ninguno'}`;
  if (serviceItemNames.length > 0) {
    labelText += ` + Insumos de: ${serviceItemNames.join(', ')}`;
  }

  // Mostrar contenedor de resultados
  const container = document.getElementById('compras-resultados-container');
  container.style.display = 'block';
  
  document.getElementById('compras-menu-nombre').textContent = labelText;
  document.getElementById('compras-evento-invitados').textContent = `Asistentes: ${ev.guests} invitados`;
  
  const inventory = await DB.getInventory();
  const actionsContainer = document.getElementById('compras-search-filter-actions-container');
  
  actionsContainer.innerHTML = `
    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
      <input type="text" id="compras-search" placeholder="Buscar insumo..." style="flex:1; min-width:180px; padding:0.45rem; font-size:0.85rem; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white;">
      <select id="compras-filter" style="padding:0.45rem; font-size:0.85rem; border-radius:6px; background:var(--bg-secondary); border:1px solid rgba(255,255,255,0.1); color:white;">
        <option value="all">Todos los insumos</option>
        <option value="pending">Pendientes de Compra</option>
        <option value="completed">Comprados / Listo</option>
      </select>
      <button type="button" class="btn-primary" id="btn-save-compras-status" style="padding:0.45rem 1rem; font-size:0.85rem;">Actualizar Estado de Compras</button>
    </div>
  `;

  const searchInput = actionsContainer.querySelector('#compras-search');
  const filterSelect = actionsContainer.querySelector('#compras-filter');
  const tbody = document.getElementById('compras-calculo-tbody');

  const renderPurchaseRows = () => {
    const query = searchInput.value.toLowerCase().trim();
    const filter = filterSelect.value;
    tbody.innerHTML = '';

    const completedMap = ev.completedPurchases || {};

    Object.keys(consolidated).forEach(key => {
      const item = consolidated[key];
      const isCompleted = !!completedMap[item.name.toLowerCase()];

      // Filtrar por búsqueda
      if (query && !item.name.toLowerCase().includes(query)) {
        return;
      }

      // Filtrar por estado
      if (filter === 'pending' && isCompleted) return;
      if (filter === 'completed' && !isCompleted) return;

      const invItem = inventory.find(inv => inv.name.toLowerCase() === item.name.toLowerCase());
      const stock = invItem ? invItem.quantity : 0;
      
      const deficit = Math.max(0, item.required - stock);
      const formattedDeficit = Number(deficit.toFixed(2));
      const formattedRequired = Number(item.required.toFixed(2));
      
      const needsPurchase = deficit > 0 && !isCompleted;
      
      let detailsHtml = '';
      if ((item.suppliers && item.suppliers.length > 0) || (item.instructions && item.instructions.length > 0)) {
        detailsHtml += '<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.25rem;">';
        if (item.suppliers && item.suppliers.length > 0) {
          detailsHtml += `<span><strong>Proveedor:</strong> <span style="color:var(--accent-gold);">${item.suppliers.join(', ')}</span></span>`;
        }
        if (item.instructions && item.instructions.length > 0) {
          if (item.suppliers && item.suppliers.length > 0) detailsHtml += ' | ';
          detailsHtml += `<span><strong>Instrucciones:</strong> ${item.instructions.join('; ')}</span>`;
        }
        detailsHtml += '</div>';
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center;">
          <input type="checkbox" class="purchase-item-check" data-item="${item.name}" ${isCompleted ? 'checked' : ''} style="cursor:pointer; width:1.1rem; height:1.1rem;">
        </td>
        <td>
          <strong style="${isCompleted ? 'text-decoration: line-through; color: var(--text-secondary);' : ''}">${item.name}</strong>
          ${detailsHtml}
        </td>
        <td>${formattedRequired} ${item.unit}</td>
        <td>${stock} ${item.unit}</td>
        <td style="color:${needsPurchase ? 'var(--warning)' : (isCompleted ? 'var(--text-secondary)' : 'var(--success)')}; font-weight:700; ${isCompleted ? 'text-decoration: line-through;' : ''}">
          ${isCompleted ? '0' : formattedDeficit} ${item.unit}
        </td>
        <td>
          <span class="badge ${isCompleted ? 'badge-confirmada' : (needsPurchase ? 'badge-pendiente_pago' : 'badge-confirmada')}">
            ${isCompleted ? 'Comprado' : (needsPurchase ? 'Comprar' : 'Stock OK')}
          </span>
        </td>
      `;
      
      tr.querySelector('.purchase-item-check').addEventListener('change', (e) => {
        const strong = tr.querySelector('strong');
        const badge = tr.querySelector('.badge');
        const deficitTd = tr.querySelectorAll('td')[4];
        if (e.target.checked) {
          strong.style.textDecoration = 'line-through';
          strong.style.color = 'var(--text-secondary)';
          badge.className = 'badge badge-confirmada';
          badge.textContent = 'Comprado';
          deficitTd.style.textDecoration = 'line-through';
          deficitTd.style.color = 'var(--text-secondary)';
          deficitTd.textContent = `0 ${item.unit}`;
        } else {
          strong.style.textDecoration = 'none';
          strong.style.color = 'white';
          badge.className = needsPurchase ? 'badge badge-pendiente_pago' : 'badge badge-confirmada';
          badge.textContent = needsPurchase ? 'Comprar' : 'Stock OK';
          deficitTd.style.textDecoration = 'none';
          deficitTd.style.color = needsPurchase ? 'var(--warning)' : 'var(--success)';
          deficitTd.textContent = `${formattedDeficit} ${item.unit}`;
        }
      });

      tbody.appendChild(tr);
    });

    if (tbody.children.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-secondary); padding:1.5rem;">No se encontraron insumos.</td></tr>';
    }
  };

  searchInput.addEventListener('input', renderPurchaseRows);
  filterSelect.addEventListener('change', renderPurchaseRows);

  actionsContainer.querySelector('#btn-save-compras-status').addEventListener('click', async () => {
    const completedMap = ev.completedPurchases || {};
    const newlyChecked = [];

    const checkboxes = tbody.querySelectorAll('.purchase-item-check');
    checkboxes.forEach(chk => {
      const itemName = chk.getAttribute('data-item');
      const itemKey = itemName.toLowerCase();
      const wasCompleted = !!completedMap[itemKey];
      const isCompletedNow = chk.checked;
      
      completedMap[itemKey] = isCompletedNow;
      
      if (!wasCompleted && isCompletedNow) {
        newlyChecked.push(itemName);
      }
    });

    let updateInventory = false;
    if (newlyChecked.length > 0) {
      updateInventory = confirm(`Has marcado ${newlyChecked.length} insumos nuevos como "Comprados".\n\n¿Deseas también registrar estas compras en el inventario para sumar el stock faltante automáticamente?`);
    }

    try {
      if (updateInventory) {
        for (const itemName of newlyChecked) {
          const itemKey = itemName.toLowerCase();
          const item = consolidated[itemKey];
          const invItem = inventory.find(inv => inv.name.toLowerCase() === itemKey);
          
          if (invItem) {
            const deficit = Math.max(0, item.required - invItem.quantity);
            if (deficit > 0) {
              invItem.quantity = parseFloat((invItem.quantity + deficit).toFixed(2));
              await DB.updateInventoryItem(invItem);
            }
          } else {
            const deficit = item.required;
            await DB.updateInventoryItem({
              name: item.name,
              quantity: parseFloat(deficit.toFixed(2)),
              unit: item.unit || 'und',
              minStock: 0,
              category: 'General'
            });
          }
        }
      }

      ev.completedPurchases = completedMap;
      await DB.updateEvent(ev.id, { completedPurchases: ev.completedPurchases });
      alert("¡Estado de compras actualizado correctamente!");
      calculateAutomatedPurchase();
    } catch (err) {
      alert("Error al actualizar compras: " + err.message);
    }
  });

  renderPurchaseRows();
}

// Imprimir lista de compras
document.getElementById('btn-compras-imprimir').addEventListener('click', () => {
  window.print();
});

// ==========================================
// MÓDULO 8: PORTAL DE OPERACIONES (EMPLEADOS)
// ==========================================
async function loadOperativoView() {
  const events = await DB.getEvents();
  const select = document.getElementById('op-select-evento');
  select.innerHTML = '<option value="">Selecciona un evento...</option>';
  
  events.filter(e => e.status === 'confirmado' || e.status === 'realizado').forEach(e => {
    select.innerHTML += `<option value="${e.id}">${translateEventType(e.eventType)} - ${e.date} (${e.clientName})</option>`;
  });
  
  // Título dinámico del rol operativo
  document.getElementById('op-rol-titulo').textContent = translateRole(currentRole);
  document.getElementById('op-rol-subtitulo').textContent = `Tareas de ${translateRole(currentRole)} para eventos agendados.`;
  
  document.getElementById('op-detalles-evento-container').style.display = 'none';
}

async function loadOperativoDetails() {
  const eventId = document.getElementById('op-select-evento').value;
  if (!eventId) {
    document.getElementById('op-detalles-evento-container').style.display = 'none';
    return;
  }
  
  const events = await DB.getEvents();
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;
  
  document.getElementById('op-detalles-evento-container').style.display = 'grid';
  
  // Rellenar ficha técnica
  const products = await DB.getProducts();
  const salon = products.venues.find(v => v.id === ev.venueId);
  
  document.getElementById('op-info-salon').textContent = salon ? salon.name : ev.venueId;
  document.getElementById('op-info-fecha').textContent = ev.date;
  document.getElementById('op-info-hora').textContent = ev.time || '16:00';
  document.getElementById('op-info-invitados').textContent = `${ev.guests} invitados`;
  
  // Listar servicios asociados
  const listServicios = document.getElementById('op-info-servicios');
  listServicios.innerHTML = '';
  
  const allServices = [];
  Object.keys(products.services).forEach(key => {
    allServices.push(...products.services[key]);
  });
  
  // Si no hay servicios
  const serviceIds = ev.selectedServices || [];
  if (serviceIds.length === 0) {
    listServicios.innerHTML = '<li>Sin servicios adicionales</li>';
  } else {
    const counts = {};
    serviceIds.forEach(sid => {
      counts[sid] = (counts[sid] || 0) + 1;
    });
    
    Object.keys(counts).forEach(sid => {
      const s = allServices.find(item => item.id === sid);
      if (s) {
        const qty = counts[sid];
        const qtyText = qty > 1 ? ` (x${qty})` : '';
        listServicios.innerHTML += `<li>✨ ${s.name}${qtyText}</li>`;
      }
    });
  }

  // Rellenar requerimientos operativos específicos según rol
  renderRoleRequirements(ev, products);
}

function renderRoleRequirements(ev, products) {
  const reqContainer = document.getElementById('op-requerimientos-especificos');
  reqContainer.innerHTML = '';
  
  // Extraer Gestiones y Contrataciones asignadas al rol actual (o todas si es superadmin)
  const selectedProductIds = [];
  if (ev.venueId) selectedProductIds.push(ev.venueId);
  if (ev.photographyId) selectedProductIds.push(ev.photographyId);
  if (ev.decorationId) selectedProductIds.push(ev.decorationId);
  if (ev.recreationId) selectedProductIds.push(ev.recreationId);
  if (ev.selectedServices && Array.isArray(ev.selectedServices)) {
    selectedProductIds.push(...ev.selectedServices);
  }

  const roleGestiones = [];
  selectedProductIds.forEach(id => {
    const prodObj = findProductById(id, products);
    if (prodObj && prodObj.managementList && Array.isArray(prodObj.managementList)) {
      prodObj.managementList.forEach(mgt => {
        if (mgt.assignTo === currentRole || currentRole === 'superadmin' || currentRole === 'admin') {
          roleGestiones.push({ task: mgt.task, service: prodObj.name, assignTo: mgt.assignTo });
        }
      });
    }
  });

  if (roleGestiones.length > 0) {
    reqContainer.innerHTML += `
      <div style="background:var(--bg-tertiary); border-left: 4px solid var(--accent-gold); padding:1rem; border-radius:8px; margin-bottom:1.5rem;" id="op-gestiones-interactive-container">
      </div>
    `;
  }
  
  if (currentRole === 'logistica' || currentRole === 'superadmin') {
    reqContainer.innerHTML += `
      <h3 style="font-family: var(--font-title); color: var(--accent-gold); margin-bottom: 1rem; font-size: 1.4rem;">Coordinación Logística</h3>
      <p style="color:var(--text-secondary); margin-bottom:1rem;">Lista de actividades a controlar el día del evento:</p>
      <div class="timeline-list" id="op-logistica-checklist">
        <!-- JS -->
      </div>
      <button class="btn-primary" style="width:100%; margin-top:1.5rem;" id="btn-save-logistica-timeline">Actualizar Estado Actividades</button>
    `;
    
    // Inyectar timeline interactivo
    const list = ev.timeline || [];
    const checkList = document.getElementById('op-logistica-checklist');
    checkList.innerHTML = '';
    
    list.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'timeline-item';
      div.innerHTML = `
        <div class="timeline-time">${item.time}</div>
        <div class="timeline-activity" style="display:flex; align-items:center; gap:0.5rem;">
          <input type="checkbox" class="log-activity-check" data-idx="${idx}" ${item.completed ? 'checked' : ''}>
          <span>${item.activity}</span>
        </div>
      `;
      checkList.appendChild(div);
    });
    
    document.getElementById('btn-save-logistica-timeline').addEventListener('click', async () => {
      const checkboxes = document.querySelectorAll('.log-activity-check');
      checkboxes.forEach(chk => {
        const idx = parseInt(chk.getAttribute('data-idx'));
        ev.timeline[idx].completed = chk.checked;
      });
      
      await DB.updateEvent(ev.id, { timeline: ev.timeline });
      alert("¡Cronograma actualizado correctamente!");
      loadOperativoDetails();
    });
    
  } else if (currentRole === 'decoracion') {
    reqContainer.innerHTML += `
      <h3 style="font-family: var(--font-title); color: var(--accent-gold); margin-bottom: 1rem; font-size: 1.4rem;">Montaje de Decoración</h3>
      <div style="background:var(--bg-tertiary); padding:1rem; border-radius:8px; margin-bottom:1rem;">
        <span style="font-size:0.85rem; color:var(--text-secondary);">Diseño Elegido:</span>
        <p style="font-size:1.2rem; font-weight:700; color:var(--accent-gold);" id="op-deco-plan">-</p>
      </div>
      <p style="color:var(--text-secondary); margin-bottom:1rem;">Revisa que los montajes florales y centros de mesa correspondan al paquete estipulado.</p>
    `;
    const deco = allProducts.decoration.find(d => d.id === ev.decorationId);
    document.getElementById('op-deco-plan').textContent = deco ? deco.name : 'Decoración Básica';
    
  } else if (currentRole === 'recreacion') {
    reqContainer.innerHTML += `
      <h3 style="font-family: var(--font-title); color: var(--accent-gold); margin-bottom: 1rem; font-size: 1.4rem;">Asignaciones de Recreación</h3>
      <p style="color:var(--text-secondary); margin-bottom:1.5rem;">Consulta de servicios de sonido, luces y actividades recreativas en salón.</p>
      <div style="background:var(--bg-tertiary); padding:1rem; border-radius:8px;">
        <strong style="color:var(--accent-gold);">Servicio Especial de Entretenimiento:</strong>
        <p style="margin-top:0.5rem;" id="op-recreacion-txt">Cargando...</p>
      </div>
    `;
    
    // Mostrar si tiene Papayera, Mariachis o Recreacionista contratado
    const selectedS = ev.selectedServices || [];
    const entServices = [];
    selectedS.forEach(sid => {
      // Buscar en catálogo
      let found = false;
      for (const key of Object.keys(allProducts.services)) {
        const match = allProducts.services[key].find(item => item.id === sid);
        if (match) {
          if (match.name.includes('Mariachi') || match.name.includes('Papayera') || match.name.includes('Recreacion')) {
            entServices.push(match.name);
          }
          break;
        }
      }
    });
    
    document.getElementById('op-recreacion-txt').textContent = entServices.length > 0 ? entServices.join(', ') : 'No se contrataron servicios de recreación adicionales.';
  }

  initializeInteractiveGestiones(ev, roleGestiones);
}

function initializeInteractiveGestiones(ev, roleGestiones) {
  const containerEl = document.getElementById('op-gestiones-interactive-container');
  if (!containerEl || roleGestiones.length === 0) return;

  containerEl.innerHTML = `
    <h4 style="color:var(--accent-gold); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;"><i class="fa fa-tasks"></i> Gestiones y Contrataciones Operativas</h4>
    
    <div style="display:flex; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
      <input type="text" id="op-gestiones-search" placeholder="Buscar gestión..." style="flex:1; padding:0.45rem; font-size:0.85rem; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white;">
      <select id="op-gestiones-filter" style="padding:0.45rem; font-size:0.85rem; border-radius:6px; background:var(--bg-secondary); border:1px solid rgba(255,255,255,0.1); color:white;">
        <option value="all">Todas</option>
        <option value="pending">Pendientes</option>
        <option value="completed">Realizadas</option>
      </select>
    </div>
    
    <ul id="op-gestiones-list-ul" style="list-style:none; padding-left:0; margin:0; display:flex; flex-direction:column; gap:0.5rem;">
    </ul>
    
    <button type="button" class="btn-primary" style="width:100%; margin-top:1.25rem; padding:0.5rem;" id="btn-save-gestiones-status">Actualizar Estado Gestiones</button>
  `;
  
  const searchInput = containerEl.querySelector('#op-gestiones-search');
  const filterSelect = containerEl.querySelector('#op-gestiones-filter');
  const listUl = containerEl.querySelector('#op-gestiones-list-ul');
  
  const renderList = () => {
    const query = searchInput.value.toLowerCase().trim();
    const filter = filterSelect.value;
    listUl.innerHTML = '';
    
    const completedMap = ev.completedTasks || {};
    
    roleGestiones.forEach(g => {
      const isCompleted = !!completedMap[g.task];
      
      if (query && !g.task.toLowerCase().includes(query) && !g.service.toLowerCase().includes(query)) {
        return;
      }
      if (filter === 'pending' && isCompleted) return;
      if (filter === 'completed' && !isCompleted) return;
      
      const li = document.createElement('li');
      li.style.padding = '0.5rem';
      li.style.background = 'var(--bg-secondary)';
      li.style.borderRadius = '4px';
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.gap = '0.75rem';
      
      li.innerHTML = `
        <input type="checkbox" class="gestion-task-check" data-task="${g.task}" ${isCompleted ? 'checked' : ''} style="cursor:pointer; width:1.1rem; height:1.1rem;">
        <div style="flex:1; display:flex; flex-direction:column; line-height:1.2;">
          <span class="task-title" style="font-size:0.9rem; font-weight:600; text-decoration: ${isCompleted ? 'line-through' : 'none'}; color: ${isCompleted ? 'var(--text-secondary)' : 'white'};">${g.task}</span>
          <span style="font-size:0.75rem; color:var(--text-secondary);">Requerido por: ${g.service} ${currentRole === 'superadmin' ? `| Asignado a: ${translateRole(g.assignTo)}` : ''}</span>
        </div>
      `;
      
      li.querySelector('.gestion-task-check').addEventListener('change', (e) => {
        const span = li.querySelector('.task-title');
        if (e.target.checked) {
          span.style.textDecoration = 'line-through';
          span.style.color = 'var(--text-secondary)';
        } else {
          span.style.textDecoration = 'none';
          span.style.color = 'white';
        }
      });
      
      listUl.appendChild(li);
    });
    
    if (listUl.children.length === 0) {
      listUl.innerHTML = '<li style="font-size:0.85rem; color:var(--text-secondary); text-align:center; padding:0.5rem;">No se encontraron gestiones.</li>';
    }
  };
  
  searchInput.addEventListener('input', renderList);
  filterSelect.addEventListener('change', renderList);
  
  containerEl.querySelector('#btn-save-gestiones-status').addEventListener('click', async () => {
    const completedMap = ev.completedTasks || {};
    const checkboxes = listUl.querySelectorAll('.gestion-task-check');
    checkboxes.forEach(chk => {
      const taskName = chk.getAttribute('data-task');
      completedMap[taskName] = chk.checked;
    });
    
    ev.completedTasks = completedMap;
    
    try {
      await DB.updateEvent(ev.id, { completedTasks: ev.completedTasks });
      alert("¡Estado de gestiones actualizado correctamente!");
      loadOperativoDetails();
    } catch (err) {
      alert("Error al actualizar gestiones: " + err.message);
    }
  });
  
  renderList();
}

// ==========================================
// MÓDULO DE DESCARGA DE COTIZACIONES
// ==========================================
window.downloadQuoteById = downloadQuoteById;

async function downloadQuoteById(quoteId) {
  try {
    const quotes = await DB.getQuotations();
    const q = quotes.find(quote => quote.id === quoteId);
    if (!q) {
      alert("Cotización no encontrada.");
      return;
    }
    
    const baseSettings = await DB.getSettings();
    const breakdown = computePricingBreakdown(q.guests, q.venueId, q.photographyId, q.decorationId, q.selectedServices || q.extraServices || [], baseSettings, q.cateringId, q.recreationId);
    
    const quoteData = {
      clientName: q.clientName,
      clientEmail: q.clientEmail,
      clientPhone: q.clientPhone,
      eventType: q.eventType,
      date: q.date,
      guests: q.guests,
      selectedServices: q.selectedServices || q.extraServices || [],
      breakdown: breakdown,
      id: q.id,
      discount: q.discount || 0,
      discountLabel: q.discountLabel || '',
      discountPercent: q.discountPercent || '',
      settings: baseSettings
    };
    
    downloadQuotationPDF(quoteData);
  } catch (err) {
    alert("Error al descargar la cotización: " + err.message);
  }
}

async function triggerDownloadLiveQuotation() {
  const guests = parseInt(document.getElementById('cot-invitados').value) || 0;
  const selectedVenueCard = document.querySelector('#cot-venues-grid .select-card.selected');
  const venueId = selectedVenueCard ? selectedVenueCard.getAttribute('data-id') : null;
  const photographyId = document.getElementById('cot-foto').value;
  const decorationId = document.getElementById('cot-deco').value;
  const recreationId = document.getElementById('cot-recreation').value;
  
  if (!venueId) {
    alert("Por favor, selecciona un salón antes de descargar el presupuesto.");
    return;
  }
  
  const selectedServices = [];
  document.querySelectorAll('#cot-services-grid .select-card.selected').forEach(card => {
    const qtyAttr = card.getAttribute('data-qty');
    const qty = qtyAttr ? parseInt(qtyAttr) : 1;
    for (let i = 0; i < qty; i++) {
      selectedServices.push(card.getAttribute('data-id'));
    }
  });

  const baseSettings = await DB.getSettings();
  const cateringId = document.getElementById('cot-catering').value;
  const breakdown = computePricingBreakdown(guests, venueId, photographyId, decorationId, selectedServices, baseSettings, cateringId, recreationId);
  
  const quoteData = {
    clientName: document.getElementById('cot-nombre').value || 'Cliente Solicitante',
    clientEmail: document.getElementById('cot-email').value || 'cliente@correo.com',
    clientPhone: document.getElementById('cot-telefono').value || '3001234567',
    eventType: document.getElementById('cot-tipo').value,
    date: document.getElementById('cot-fecha').value || new Date().toISOString().substring(0,10),
    guests: guests,
    breakdown: breakdown,
    id: 'TEMP_' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    settings: baseSettings
  };

  downloadQuotationPDF(quoteData);
}

function downloadQuotationPDF(data) {
  const settingsObj = systemSettings || {};
  const phone1 = settingsObj.telefonoContacto1 || '3163048505';
  const phone2 = settingsObj.telefonoContacto2 || '';
  const businessName = settingsObj.businessName || 'Control Banquete';
  const businessSubtitle = settingsObj.businessSubtitle || 'Gestión Integral';
  const businessLogoUrl = getDirectDriveImageUrl(settingsObj.businessLogoUrl || '');
  
  const printWindow = window.open('', '_blank', 'width=800,height=800');
  
  // Encontrar salón
  const venue = findProductById(data.breakdown.venueId, allProducts) || allProducts.venues.find(v => v.id === data.breakdown.venueName || v.name === data.breakdown.venueName);
  const venueNameClean = venue ? venue.name : data.breakdown.venueName;
  
  // Lista de items del presupuesto
  const detailsList = [];
  detailsList.push({ 
    name: `Salón de Recepciones: ${venueNameClean}`, 
    price: data.breakdown.venuePrice,
    desc: venue ? venue.description : ''
  });
  
  if (data.breakdown.photoPrice > 0) {
    const photo = findProductById(data.breakdown.photoId, allProducts) || allProducts.photography.find(p => p.price === data.breakdown.photoPrice);
    detailsList.push({ 
      name: photo ? photo.name : 'Servicio de Fotografía', 
      price: data.breakdown.photoPrice,
      desc: photo ? photo.description : ''
    });
  }
  
  if (data.breakdown.decoPrice > 0) {
    const deco = findProductById(data.breakdown.decorationId, allProducts) || allProducts.decoration.find(d => d.price === data.breakdown.decoPrice);
    detailsList.push({ 
      name: deco ? deco.name : 'Servicio de Decoración', 
      price: data.breakdown.decoPrice,
      desc: deco ? deco.description : ''
    });
  }
  
  if (data.breakdown.recreationPrice > 0) {
    const recreation = findProductById(data.breakdown.recreationId, allProducts) || allProducts.recreation.find(p => p.price === data.breakdown.recreationPrice);
    detailsList.push({ 
      name: recreation ? recreation.name : 'Paquete Recreativo', 
      price: data.breakdown.recreationPrice,
      desc: recreation ? recreation.description : ''
    });
  }
  
  // Añadir servicios individuales agrupados por cantidad
  const selectedIds = [];
  if (data.id.startsWith('TEMP_')) {
    const selectedCards = document.querySelectorAll('#cot-services-grid .select-card.selected');
    selectedCards.forEach(card => {
      const qtyAttr = card.getAttribute('data-qty');
      const qty = qtyAttr ? parseInt(qtyAttr) : 1;
      const idVal = card.getAttribute('data-id');
      for (let i = 0; i < qty; i++) {
        selectedIds.push(idVal);
      }
    });
  } else {
    // Si viene desde admin quotes
    selectedIds.push(...(data.selectedServices || []));
  }

  const serviceCounts = {};
  selectedIds.forEach(sid => {
    serviceCounts[sid] = (serviceCounts[sid] || 0) + 1;
  });

  Object.keys(serviceCounts).forEach(sid => {
    const match = findProductById(sid, allProducts);
    if (match) {
      const qty = serviceCounts[sid];
      const nameText = qty > 1 ? `${match.name} (x${qty})` : match.name;
      detailsList.push({ 
        name: nameText, 
        price: match.price * qty,
        desc: match.description || ''
      });
    }
  });
  
  // Agregar una línea general de respaldo si el total no coincide por alguna razón
  const calculatedSum = detailsList.reduce((sum, item) => sum + item.price, 0);
  const extraServicesSum = data.breakdown.servicesSum;
  if (extraServicesSum > 0 && detailsList.length === 1) { // Solo salón
    detailsList.push({ name: "Servicios Adicionales Seleccionados", price: extraServicesSum });
  }

  // Generar filas para cobros operativos adicionales personalizados
  let customSettingsHtml = '';
  if (data.breakdown.customChargesList && Array.isArray(data.breakdown.customChargesList)) {
    data.breakdown.customChargesList.forEach(cc => {
      customSettingsHtml += `
        <tr>
          <td>
            <span class="desc-title">${cc.label}</span>
            <span class="desc-subtitle">Cargo operativo base${cc.type === 'per_person' ? ' (calculado por persona)' : ''}</span>
          </td>
          <td style="text-align: right; font-weight: 500; vertical-align: middle;">$${cc.totalCost.toLocaleString()}</td>
        </tr>
      `;
    });
  }

  const discountVal = data.discount || 0;
  const finalTotal = data.breakdown.total - discountVal;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Cotización_${data.id}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2d3748; margin: 40px; line-height: 1.6; background-color: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #b39264; padding-bottom: 25px; margin-bottom: 30px; }
        .logo-title { font-family: Georgia, serif; color: #1a202c; font-size: 26px; margin: 0; font-weight: bold; letter-spacing: 0.5px; }
        .logo-sub { font-size: 10px; text-transform: uppercase; color: #b39264; letter-spacing: 4px; font-weight: bold; margin-top: 4px; display: block; }
        .info-grid { display: flex; justify-content: space-between; margin-bottom: 35px; font-size: 13.5px; gap: 4%; }
        .info-col { width: 48%; background: #faf8f5; padding: 20px; border-radius: 12px; border: 1px solid #ebdcc5; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .info-title { font-weight: bold; color: #1a202c; border-bottom: 2px solid #b39264; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; font-size: 11px; letter-spacing: 1.5px; }
        .info-row { margin-bottom: 8px; }
        .info-row strong { color: #1a202c; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 35px; font-size: 13.5px; }
        th { background: #1a202c; text-align: left; padding: 14px 16px; border-bottom: 2px solid #b39264; color: #fff; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
        td { padding: 14px 16px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background-color: #fafaf9; }
        .desc-title { font-weight: 600; color: #1a202c; font-size: 14px; }
        .desc-subtitle { font-size: 11.5px; color: #718096; margin-top: 4px; display: block; line-height: 1.4; }
        .total-box { display: flex; flex-direction: column; align-items: flex-end; font-size: 14px; margin-top: 20px; }
        .total-row { display: flex; justify-content: space-between; width: 340px; padding: 8px 12px; border-bottom: 1px dashed #e2e8f0; color: #4a5568; }
        .total-row.final { background: #1a202c; border-radius: 8px; border: 1px solid #b39264; padding: 14px 18px; margin-top: 15px; font-size: 22px; font-weight: bold; color: #ffcf4b; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .total-row.final span:first-child { color: #fff; font-size: 18px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; align-self: center; }
        .footer { border-top: 1px solid #edf2f7; margin-top: 60px; padding-top: 25px; text-align: center; font-size: 11px; color: #718096; line-height: 1.7; }
        @media print {
          body { margin: 20px; }
          .info-col { background: #faf8f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .total-row.final { background: #1a202c !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          th { background: #1a202c !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header" style="align-items: center;">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${businessLogoUrl ? `<img src="${businessLogoUrl}" onerror="this.onerror=null; this.style.display='none';" style="max-height: 60px; max-width: 150px; object-fit: contain; border-radius: 4px;">` : `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#b39264" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 3h12l-1 9a5 5 0 0 1-10 0L6 3Z"/>
              <path d="M12 17v4"/>
              <path d="M8 21h8"/>
              <path d="M12 6V3"/>
              <circle cx="12" cy="9" r="1"/>
            </svg>
          `}
          <div>
            <h1 class="logo-title">${businessSubtitle.toUpperCase()} ${businessName.toUpperCase()}</h1>
            <span class="logo-sub">Elegancia & Distinción</span>
          </div>
        </div>
        <div style="text-align: right; font-size: 12px; color: #4a5568; line-height: 1.6;">
          <strong>PRESUPUESTO DE RESERVA</strong><br>
          Código Cotización: <strong>${data.id}</strong><br>
          Fecha de Emisión: ${new Date().toLocaleDateString('es-CO')}
        </div>
      </div>
      
      <div class="info-grid">
        <div class="info-col">
          <div class="info-title">Datos del Cliente</div>
          <div class="info-row"><strong>Nombre:</strong> ${data.clientName}</div>
          <div class="info-row"><strong>Correo Electrónico:</strong> ${data.clientEmail}</div>
          <div class="info-row"><strong>Teléfono / WhatsApp:</strong> ${data.clientPhone}</div>
        </div>
        <div class="info-col">
          <div class="info-title">Detalles del Evento</div>
          <div class="info-row"><strong>Tipo de Evento:</strong> ${translateEventType(data.eventType)}</div>
          <div class="info-row"><strong>Fecha Programada:</strong> ${data.date}</div>
          <div class="info-row"><strong>Número de Invitados:</strong> ${data.guests} personas</div>
        </div>
      </div>
      
      <div class="info-title" style="margin-bottom: 15px;">Detalle de Conceptos y Servicios</div>
      <table>
        <thead>
          <tr>
            <th>Descripción del Servicio</th>
            <th style="text-align: right; width: 180px;">Valor (COP)</th>
          </tr>
        </thead>
        <tbody>
          ${data.breakdown.costoAlimentacion > 0 ? `
          <tr>
            <td>
              <span class="desc-title">Banquete Principal (${data.breakdown.selectedCateringPlanName || 'Alimentación'})</span>
              <span class="desc-subtitle">${data.breakdown.descripcionAlimentacion || `Menú tipo buffet a elección para ${data.guests} invitados`}</span>
            </td>
            <td style="text-align: right; font-weight: 500; vertical-align: middle;">$${data.breakdown.costoAlimentacion.toLocaleString()}</td>
          </tr>
          ` : ''}
          <tr>
            <td>
              <span class="desc-title">Personal de Servicio (Meseros)</span>
              <span class="desc-subtitle">${data.breakdown.meseros} meseros calificados incluidos para la atención del evento</span>
            </td>
            <td style="text-align: right; font-weight: 500; vertical-align: middle;">$${data.breakdown.costoMeseros.toLocaleString()}</td>
          </tr>
          ${detailsList.map(item => `
            <tr>
              <td>
                <span class="desc-title">${item.name}</span>
                <span class="desc-subtitle">${item.desc || 'Servicio integrado según catálogo'}</span>
              </td>
              <td style="text-align: right; font-weight: 500; vertical-align: middle;">$${item.price.toLocaleString()}</td>
            </tr>
          `).join('')}
          ${customSettingsHtml}
        </tbody>
      </table>
      
      <div class="total-box">
        <div class="total-row">
          <span>Servicio Base${data.breakdown.costoAlimentacion > 0 ? ' (Comida + Meseros)' : ' (Meseros)'}:</span>
          <span>$${(data.breakdown.costoAlimentacion + data.breakdown.costoMeseros).toLocaleString()}</span>
        </div>
        <div class="total-row">
          <span>Salón y Adicionales Contratados:</span>
          <span>$${(data.breakdown.total - (data.breakdown.costoAlimentacion + data.breakdown.costoMeseros) - (data.breakdown.customChargesSum || 0)).toLocaleString()}</span>
        </div>
        ${data.breakdown.customChargesSum > 0 ? `
        <div class="total-row">
          <span>Cargos Operativos Adicionales:</span>
          <span>$${data.breakdown.customChargesSum.toLocaleString()}</span>
        </div>
        ` : ''}
        ${discountVal > 0 ? `
        <div class="total-row" style="color: #e53e3e; font-weight: 500;">
          <span>Descuento Aplicado (${data.discountLabel || 'Especial'}):</span>
          <span>-$${discountVal.toLocaleString()} COP</span>
        </div>
        ` : ''}
        <div class="total-row final">
          <span>TOTAL ESTIMADO:</span>
          <span>$${finalTotal.toLocaleString()} COP</span>
        </div>
      </div>
      
      <div class="footer">
        Este presupuesto es una estimación oficial y tiene una validez de 15 días a partir de su fecha de emisión.<br>
        <strong>${businessSubtitle} ${businessName}</strong> | Medellín, Colombia | Teléfono/WhatsApp: ${phone2 && phone2.trim() !== '' && phone2 !== 'NO TIENEN X' ? `${phone1} - ${phone2}` : phone1}<br>
        <em>Hacemos de tus celebraciones momentos inolvidables.</em>
      </div>
      
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
}

async function checkVenueAvailability() {
  const dateInput = document.getElementById('check-avail-date').value;
  if (!dateInput) {
    alert("Por favor, selecciona una fecha primero.");
    return;
  }

  const resultsDiv = document.getElementById('availability-results');
  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = '<p style="color:var(--accent-gold);">Consultando disponibilidad...</p>';

  try {
    // Buscar eventos programados
    const events = await DB.getEvents();
    // Obtener todos los salones de allProducts
    const venues = allProducts.venues;

    // Filtrar eventos reservados en esa fecha (excluyendo cancelados)
    const bookedEvents = events.filter(e => e.date === dateInput && e.status !== 'cancelado');
    const bookedVenueIds = bookedEvents.map(e => e.venueId);

    const availableVenues = venues.filter(v => !bookedVenueIds.includes(v.id));
    const occupiedVenues = venues.filter(v => bookedVenueIds.includes(v.id));

    let html = `
      <h4 style="margin-bottom:1.5rem; color:var(--text-primary); font-family:var(--font-title); font-size:1.3rem; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.5rem;">
        Resultados para el: <strong>${dateInput}</strong>
      </h4>
    `;

    if (availableVenues.length === 0) {
      html += `
        <div style="background:rgba(229, 62, 62, 0.1); border:1px solid var(--danger); border-radius:8px; padding:1rem; color:#fc8181; margin-bottom:1.5rem;">
          😞 Lo sentimos, no tenemos ningún salón disponible para esta fecha.
        </div>
      `;
    } else {
      html += `
        <h5 style="color:var(--success); font-weight:700; margin-bottom:0.75rem; font-size:1rem;">🏛️ Salones Disponibles (${availableVenues.length})</h5>
        <div class="products-selector-grid" style="margin-bottom:2rem;">
      `;

      availableVenues.forEach(v => {
        html += `
          <div class="select-card" style="cursor:default; border-color:rgba(56, 161, 105, 0.3); background:rgba(56, 161, 105, 0.02); min-height:140px;">
            <div>
              <div class="select-card-name">${v.name}</div>
              ${v.description ? `<p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.2; margin-bottom:0.5rem;">${v.description}</p>` : ''}
              <div class="select-card-price" style="margin-bottom: 0.5rem;">$${v.price.toLocaleString()} COP</div>
            </div>
            <button type="button" class="btn-primary" style="margin-top:0.5rem; font-size:0.8rem; padding:0.4rem 1rem; width:100%; justify-content:center;" onclick="selectVenueInCotizador('${v.id}', '${dateInput}')">
              Elegir y Cotizar
            </button>
          </div>
        `;
      });

      html += `</div>`;
    }

    if (occupiedVenues.length > 0) {
      html += `
        <h5 style="color:var(--danger); font-weight:700; margin-bottom:0.75rem; font-size:1rem;">🔒 Salones Ocupados (${occupiedVenues.length})</h5>
        <div class="products-selector-grid">
      `;

      occupiedVenues.forEach(v => {
        html += `
          <div class="select-card" style="opacity:0.6; cursor:not-allowed; border-color:rgba(229, 62, 62, 0.3); min-height:140px;">
            <div>
              <div class="select-card-name" style="text-decoration:line-through;">${v.name}</div>
              <p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.2; margin-bottom:0.5rem;">Reservado para esta fecha.</p>
            </div>
            <span class="badge badge-pendiente_pago" style="margin-top:auto; text-align:center;">Ocupado</span>
          </div>
        `;
      });

      html += `</div>`;
    }

    resultsDiv.innerHTML = html;
  } catch (err) {
    resultsDiv.innerHTML = `<p style="color:var(--danger);">Error al consultar disponibilidad: ${err.message}</p>`;
  }
}

window.selectVenueInCotizador = (venueId, date) => {
  // 1. Establecer fecha en el cotizador
  document.getElementById('cot-fecha').value = date;
  
  // 2. Seleccionar el salon en el grid
  const venuesGrid = document.getElementById('cot-venues-grid');
  venuesGrid.querySelectorAll('.select-card').forEach(card => {
    if (card.getAttribute('data-id') === venueId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // 3. Recalcular
  calculateLiveCotizacion();

  // 4. Scroll suave hacia arriba (al formulario)
  document.getElementById('form-cotizador').scrollIntoView({ behavior: 'smooth' });
};
