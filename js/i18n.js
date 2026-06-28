/**
 * Control Banquete — Sistema de Internacionalización (i18n)
 * Idiomas: Español (ES), English (EN), Português (PT), Français (FR)
 */

const TRANSLATIONS = {

  // ─────────────────────────────────────────
  // ESPAÑOL (default)
  // ─────────────────────────────────────────
  es: {
    // General
    'app.name': 'Control Banquete',
    'app.tagline': 'Gestión profesional de eventos y banquetes',
    'lang.select': 'Idioma',

    // Auth
    'auth.login': 'Iniciar sesión',
    'auth.logout': 'Cerrar sesión',
    'auth.register': 'Crear cuenta',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.password_confirm': 'Confirmar contraseña',
    'auth.forgot': '¿Olvidaste tu contraseña?',
    'auth.no_account': '¿No tienes cuenta?',
    'auth.has_account': '¿Ya tienes cuenta?',
    'auth.sign_in_free': 'Crear cuenta gratis →',
    'auth.go_quoter': 'Ir al Cotizador Público',
    'auth.welcome_back': 'Bienvenido de nuevo',
    'auth.sign_in_subtitle': 'Ingresa a tu panel de administración',
    'auth.enter': 'Ingresar',
    'auth.entering': 'Ingresando...',
    'auth.invalid_credentials': 'Credenciales inválidas',

    // Register
    'reg.title': 'Crea tu negocio',
    'reg.subtitle': 'Administra eventos, cotizaciones y equipo desde un solo lugar',
    'reg.trial_badge': '✨ 3 días gratis · Sin tarjeta de crédito',
    'reg.business_name': 'Nombre de tu Empresa',
    'reg.business_placeholder': 'Ej: Banquetes La Perla',
    'reg.full_name': 'Tu Nombre Completo',
    'reg.name_placeholder': 'Nombre y apellido',
    'reg.email_placeholder': 'tu@empresa.com',
    'reg.password_placeholder': 'Mínimo 6 caracteres',
    'reg.confirm_placeholder': 'Repite tu contraseña',
    'reg.submit': 'Empezar prueba gratuita →',
    'reg.submitting': 'Creando cuenta...',
    'reg.success': '✓ ¡Cuenta creada!',
    'reg.feat_1': 'Cotizaciones y eventos ilimitados durante la prueba',
    'reg.feat_2': 'Panel para todo tu equipo (cocina, compras, logística)',
    'reg.feat_3': 'Tus datos son 100% privados y exclusivos de tu negocio',
    'reg.terms': 'Al registrarte aceptas nuestros',
    'reg.terms_link': 'Términos de Servicio',
    'reg.privacy_link': 'Política de Privacidad',
    'reg.cancel': 'Cancelación disponible en cualquier momento.',
    'reg.err_mismatch': 'Las contraseñas no coinciden',
    'reg.err_short': 'La contraseña debe tener al menos 6 caracteres',

    // Subscription
    'sub.title': 'Desbloquea el acceso completo',
    'sub.subtitle': 'Elige el plan que mejor se adapte a tu negocio de banquetes',
    'sub.trial_active': 'día(s) restante(s) de prueba',
    'sub.trial_expired': '⏰ Tu prueba gratuita ha terminado',
    'sub.trial_ending': 'Tu prueba gratuita termina pronto',
    'sub.choose': 'Elige tu plan para continuar',
    'sub.monthly': 'Mensual',
    'sub.quarterly': 'Trimestral',
    'sub.annual': 'Anual',
    'sub.per_month': 'por mes',
    'sub.per_quarter': 'por trimestre',
    'sub.per_year': 'por año',
    'sub.popular': '⭐ Más Popular',
    'sub.best_value': '🏆 Mejor Valor',
    'sub.subscribe': 'Suscribirse',
    'sub.save_q': '💰 Ahorras $5 vs mensual',
    'sub.save_a': '💰 Ahorras $25 vs mensual',
    'sub.guarantee': '🛡️ Garantía de Satisfacción',
    'sub.guarantee_text': 'Si no estás satisfecho en los primeros 7 días, te devolvemos el dinero sin preguntas.',
    'sub.restore': '↩ Restaurar compra anterior',
    'sub.google_pay': 'Pagos gestionados de forma segura por Google Play',
    'sub.cancel_anytime': 'Cancela en cualquier momento',
    'sub.faq_title': 'Preguntas Frecuentes',
    'sub.feat_unlimited': 'Eventos ilimitados',
    'sub.feat_team': 'Todo tu equipo',
    'sub.feat_pdf': 'PDF profesional',
    'sub.feat_inventory': 'Inventario',
    'sub.feat_notifications': 'Notificaciones',
    'sub.plan_monthly_f1': 'Acceso completo a todas las funciones',
    'sub.plan_monthly_f2': 'Usuarios ilimitados de tu equipo',
    'sub.plan_monthly_f3': 'Soporte prioritario',
    'sub.plan_monthly_f4': 'Cancela cuando quieras',
    'sub.plan_quarterly_f1': 'Todo lo del plan mensual',
    'sub.plan_quarterly_f2': '3 meses sin interrupciones',
    'sub.plan_quarterly_f3': 'Reportes avanzados',
    'sub.plan_quarterly_f4': 'Exportación de datos',
    'sub.plan_annual_f1': 'Todo lo del plan trimestral',
    'sub.plan_annual_f2': 'Precio bloqueado 1 año',
    'sub.plan_annual_f3': 'Acceso anticipado a nuevas funciones',
    'sub.plan_annual_f4': 'Soporte dedicado vía WhatsApp',

    // Cotizador público
    'cotizar.tagline': 'Solicita tu cotización — sin compromiso',
    'cotizar.step1': 'Tus datos',
    'cotizar.step2': 'Servicios',
    'cotizar.step3': 'Confirmar',
    'cotizar.contact': '👤 Tus datos de contacto',
    'cotizar.full_name': 'Nombre completo *',
    'cotizar.phone': 'Teléfono / WhatsApp *',
    'cotizar.email': 'Correo electrónico *',
    'cotizar.event': '📅 Tu evento',
    'cotizar.event_type': 'Tipo de evento *',
    'cotizar.event_date': 'Fecha del evento *',
    'cotizar.guests': 'Número de invitados *',
    'cotizar.notes': '¿Algo especial que quieras comunicarnos?',
    'cotizar.notes_ph': 'Colores, temática, requerimientos especiales...',
    'cotizar.next_services': 'Continuar → Servicios',
    'cotizar.next_confirm': 'Continuar → Resumen',
    'cotizar.back': '← Atrás',
    'cotizar.edit': '← Editar',
    'cotizar.send': '✉️ Enviar Solicitud',
    'cotizar.sending': 'Enviando...',
    'cotizar.summary': '📋 Resumen de tu solicitud',
    'cotizar.estimated': 'Total Estimado',
    'cotizar.subtotal': 'Subtotal estimado',
    'cotizar.disclaimer': '* Precio estimado. El valor final puede variar según personalización. Un asesor se pondrá en contacto.',
    'cotizar.success_title': '¡Solicitud Enviada!',
    'cotizar.success_sub': 'Hemos recibido tu solicitud de cotización. Un asesor se pondrá en contacto pronto.',
    'cotizar.another': 'Hacer otra cotización',
    'cotizar.client_portal': '¿Ya tienes una cuenta de cliente?',
    'cotizar.client_login': 'Ingresa a tu portal →',
    'cotizar.select_event': '— Selecciona —',
    'cotizar.wedding': 'Boda',
    'cotizar.quinces': 'Quinceañera',
    'cotizar.graduation': 'Grado / Aniversario',
    'cotizar.communion': 'Comunión / Confirmación',
    'cotizar.kids': 'Fiesta Infantil',
    'cotizar.corporate': 'Evento Empresarial',
    'cotizar.catering': '🍽️ Catering',
    'cotizar.venues': '🏛️ Salón / Lugar',
    'cotizar.photography': '📸 Fotografía y Video',
    'cotizar.decoration': '🌸 Decoración',
    'cotizar.recreation': '🎭 Recreación / Animación',
    'cotizar.services': '✨ Servicios Adicionales',
    'cotizar.select_plan': 'Selecciona el plan de alimentación',
    'cotizar.multiple': 'Puedes seleccionar varios',
    'cotizar.loading': 'Cargando cotizador...',
    'cotizar.not_found': 'Cotizador no encontrado',
    'cotizar.not_found_sub': 'El enlace puede ser incorrecto o el negocio no existe.',
    'cotizar.validate': 'Por favor completa todos los campos del evento antes de continuar.',
    'cotizar.guests_label': 'personas',
    'cotizar.summary_name': 'Nombre',
    'cotizar.summary_event': 'Evento',
    'cotizar.summary_date': 'Fecha',
    'cotizar.summary_guests': 'Invitados',
    'cotizar.summary_catering': 'Catering',
    'cotizar.summary_venue': 'Salón',
    'cotizar.summary_photo': 'Fotografía',
    'cotizar.summary_deco': 'Decoración',
    'cotizar.summary_extra': 'Adicional',
    'cotizar.waiters': 'Meseros requeridos',
    'cotizar.available': 'Disponible',
    'cotizar.occupied': 'Reservado en esta fecha',
    'cotizar.check_date': 'Consultar Fecha',
    'cotizar.plan_selected': 'Plan seleccionado',
    'cotizar.pdf_download': 'Descargar Cotización (PDF)',
    'cotizar.another_quote': 'Realizar Otra Cotización',

    // Admin
    'admin.title': 'Panel de Administración',
    'admin.subtitle': 'Superadministración general de clientes, reservas, precios y base de datos.',
    'admin.create_user': '+ Crear Usuario',
    'admin.create_event': '+ Crear Evento',
    'admin.cotizador_link': '🔗 Tu enlace de Cotizador Público',
    'admin.cotizador_desc': 'Comparte este enlace con tus clientes. Ellos llenan el formulario y la cotización llega directamente a tu panel.',
    'admin.portal_link': '🔐 Portal de Acceso Clientes',
    'admin.portal_desc': 'Tus clientes ingresan aquí con las credenciales que tú les asignas.',
    'admin.copy': '📋 Copiar',
    'admin.copied': '✓ Copiado!',
    'admin.view': '👁 Ver',

    // Trial banner
    'trial.days_left': 'día(s) restante(s) de prueba gratuita',
    'trial.see_plans': 'Ver planes →',

    // Admin Users Tab
    'admin_users.title': 'Usuarios y Clientes en la Plataforma',
    'admin_users.search_ph': 'Buscar usuario o correo...',
    'admin_users.filter_all': 'Todos los Roles',
    'admin_users.filter_superadmin': 'Superadministrador',
    'admin_users.filter_cliente': 'Clientes',
    'admin_users.filter_compras': 'Compras',
    'admin_users.filter_cocina': 'Cocina',
    'admin_users.filter_logistica': 'Logística',
    'admin_users.filter_decoracion': 'Decoración',
    'admin_users.filter_recreacion': 'Recreación',
    'admin_users.date_all': 'Todas las fechas',
    'admin_users.date_last30': 'Últimos 30 días',
    'admin_users.date_next30': 'Próximos 30 días',
    'admin_users.date_custom': 'Rango personalizado...',
    'admin_users.from': 'Desde:',
    'admin_users.to': 'Hasta:',
    'admin_users.th_name': 'Nombre',
    'admin_users.th_email': 'Email',
    'admin_users.th_role': 'Rol',
    'admin_users.th_phone': 'Teléfono',
    'admin_users.th_photo': 'Estado Foto',
    'admin_users.th_actions': 'Acciones',
  },

  // ─────────────────────────────────────────
  // ENGLISH
  // ─────────────────────────────────────────
  en: {
    'app.name': 'Control Banquete',
    'app.tagline': 'Professional event & banquet management',
    'lang.select': 'Language',

    'auth.login': 'Sign in',
    'auth.logout': 'Sign out',
    'auth.register': 'Create account',
    'auth.email': 'Email address',
    'auth.password': 'Password',
    'auth.password_confirm': 'Confirm password',
    'auth.forgot': 'Forgot your password?',
    'auth.no_account': "Don't have an account?",
    'auth.has_account': 'Already have an account?',
    'auth.sign_in_free': 'Create free account →',
    'auth.go_quoter': 'Go to Public Quoter',
    'auth.welcome_back': 'Welcome back',
    'auth.sign_in_subtitle': 'Sign in to your admin panel',
    'auth.enter': 'Sign in',
    'auth.entering': 'Signing in...',
    'auth.invalid_credentials': 'Invalid credentials',

    'reg.title': 'Create your business',
    'reg.subtitle': 'Manage events, quotes and your team from one place',
    'reg.trial_badge': '✨ 3 days free · No credit card',
    'reg.business_name': 'Business Name',
    'reg.business_placeholder': 'e.g. Pearl Banquets',
    'reg.full_name': 'Your Full Name',
    'reg.name_placeholder': 'First and last name',
    'reg.email_placeholder': 'you@business.com',
    'reg.password_placeholder': 'Minimum 6 characters',
    'reg.confirm_placeholder': 'Repeat your password',
    'reg.submit': 'Start free trial →',
    'reg.submitting': 'Creating account...',
    'reg.success': '✓ Account created!',
    'reg.feat_1': 'Unlimited quotations and events during trial',
    'reg.feat_2': 'Panel for your whole team (kitchen, purchasing, logistics)',
    'reg.feat_3': 'Your data is 100% private and exclusive to your business',
    'reg.terms': 'By registering you agree to our',
    'reg.terms_link': 'Terms of Service',
    'reg.privacy_link': 'Privacy Policy',
    'reg.cancel': 'Cancel at any time.',
    'reg.err_mismatch': 'Passwords do not match',
    'reg.err_short': 'Password must be at least 6 characters',

    'sub.title': 'Unlock full access',
    'sub.subtitle': 'Choose the plan that best fits your banquet business',
    'sub.trial_active': 'day(s) left in trial',
    'sub.trial_expired': '⏰ Your free trial has ended',
    'sub.trial_ending': 'Your free trial is ending soon',
    'sub.choose': 'Choose your plan to continue',
    'sub.monthly': 'Monthly',
    'sub.quarterly': 'Quarterly',
    'sub.annual': 'Annual',
    'sub.per_month': 'per month',
    'sub.per_quarter': 'per quarter',
    'sub.per_year': 'per year',
    'sub.popular': '⭐ Most Popular',
    'sub.best_value': '🏆 Best Value',
    'sub.subscribe': 'Subscribe',
    'sub.save_q': '💰 Save $5 vs monthly',
    'sub.save_a': '💰 Save $25 vs monthly',
    'sub.guarantee': '🛡️ Satisfaction Guarantee',
    'sub.guarantee_text': "If you're not satisfied in the first 7 days, we'll refund you, no questions asked.",
    'sub.restore': '↩ Restore previous purchase',
    'sub.google_pay': 'Payments securely managed by Google Play',
    'sub.cancel_anytime': 'Cancel anytime',
    'sub.faq_title': 'Frequently Asked Questions',
    'sub.feat_unlimited': 'Unlimited events',
    'sub.feat_team': 'Your whole team',
    'sub.feat_pdf': 'Professional PDF',
    'sub.feat_inventory': 'Inventory',
    'sub.feat_notifications': 'Notifications',
    'sub.plan_monthly_f1': 'Full access to all features',
    'sub.plan_monthly_f2': 'Unlimited team members',
    'sub.plan_monthly_f3': 'Priority support',
    'sub.plan_monthly_f4': 'Cancel whenever you want',
    'sub.plan_quarterly_f1': 'Everything in monthly',
    'sub.plan_quarterly_f2': '3 uninterrupted months',
    'sub.plan_quarterly_f3': 'Advanced reports',
    'sub.plan_quarterly_f4': 'Data export',
    'sub.plan_annual_f1': 'Everything in quarterly',
    'sub.plan_annual_f2': 'Price locked for 1 year',
    'sub.plan_annual_f3': 'Early access to new features',
    'sub.plan_annual_f4': 'Dedicated WhatsApp support',

    'cotizar.tagline': 'Request your quote — no commitment',
    'cotizar.step1': 'Your info',
    'cotizar.step2': 'Services',
    'cotizar.step3': 'Confirm',
    'cotizar.contact': '👤 Your contact details',
    'cotizar.full_name': 'Full name *',
    'cotizar.phone': 'Phone / WhatsApp *',
    'cotizar.email': 'Email address *',
    'cotizar.event': '📅 Your event',
    'cotizar.event_type': 'Event type *',
    'cotizar.event_date': 'Event date *',
    'cotizar.guests': 'Number of guests *',
    'cotizar.notes': 'Anything special you want to tell us?',
    'cotizar.notes_ph': 'Colors, theme, special requirements...',
    'cotizar.next_services': 'Continue → Services',
    'cotizar.next_confirm': 'Continue → Summary',
    'cotizar.back': '← Back',
    'cotizar.edit': '← Edit',
    'cotizar.send': '✉️ Submit Request',
    'cotizar.sending': 'Sending...',
    'cotizar.summary': '📋 Your request summary',
    'cotizar.estimated': 'Estimated Total',
    'cotizar.subtotal': 'Estimated subtotal',
    'cotizar.disclaimer': '* Estimated price. Final value may vary based on customization. An advisor will contact you.',
    'cotizar.success_title': 'Request Submitted!',
    'cotizar.success_sub': 'We received your quote request. An advisor will contact you soon.',
    'cotizar.another': 'Request another quote',
    'cotizar.client_portal': 'Already have a client account?',
    'cotizar.client_login': 'Enter your portal →',
    'cotizar.select_event': '— Select —',
    'cotizar.wedding': 'Wedding',
    'cotizar.quinces': 'Sweet 15 / Quinceañera',
    'cotizar.graduation': 'Graduation / Anniversary',
    'cotizar.communion': 'Communion / Confirmation',
    'cotizar.kids': 'Kids Party',
    'cotizar.corporate': 'Corporate Event',
    'cotizar.catering': '🍽️ Catering',
    'cotizar.venues': '🏛️ Venue / Hall',
    'cotizar.photography': '📸 Photography & Video',
    'cotizar.decoration': '🌸 Decoration',
    'cotizar.recreation': '🎭 Entertainment / Animation',
    'cotizar.services': '✨ Additional Services',
    'cotizar.select_plan': 'Select a catering plan',
    'cotizar.multiple': 'You can select multiple',
    'cotizar.loading': 'Loading quoter...',
    'cotizar.not_found': 'Quoter not found',
    'cotizar.not_found_sub': 'The link may be incorrect or the business does not exist.',
    'cotizar.validate': 'Please fill in all event fields before continuing.',
    'cotizar.guests_label': 'guests',
    'cotizar.summary_name': 'Name',
    'cotizar.summary_event': 'Event',
    'cotizar.summary_date': 'Date',
    'cotizar.summary_guests': 'Guests',
    'cotizar.summary_catering': 'Catering',
    'cotizar.summary_venue': 'Venue',
    'cotizar.summary_photo': 'Photography',
    'cotizar.summary_deco': 'Decoration',
    'cotizar.summary_extra': 'Extra',
    'cotizar.waiters': 'Waiters required',
    'cotizar.available': 'Available',
    'cotizar.occupied': 'Reserved on this date',
    'cotizar.check_date': 'Check Date',
    'cotizar.plan_selected': 'Selected plan',
    'cotizar.pdf_download': 'Download Quote (PDF)',
    'cotizar.another_quote': 'Make Another Quote',

    'admin.title': 'Administration Panel',
    'admin.subtitle': 'General administration of clients, bookings, pricing and database.',
    'admin.create_user': '+ Create User',
    'admin.create_event': '+ Create Event',
    'admin.cotizador_link': '🔗 Your Public Quoter Link',
    'admin.cotizador_desc': 'Share this link with your clients. They fill the form and the quote goes directly to your panel.',
    'admin.portal_link': '🔐 Client Access Portal',
    'admin.portal_desc': 'Your clients log in here with the credentials you assign them.',
    'admin.copy': '📋 Copy',
    'admin.copied': '✓ Copied!',
    'admin.view': '👁 View',

    'trial.days_left': 'day(s) left in free trial',
    'trial.see_plans': 'See plans →',

    // Admin Users Tab
    'admin_users.title': 'Users & Clients on Platform',
    'admin_users.search_ph': 'Search user or email...',
    'admin_users.filter_all': 'All Roles',
    'admin_users.filter_superadmin': 'Superadmin',
    'admin_users.filter_cliente': 'Clients',
    'admin_users.filter_compras': 'Purchasing',
    'admin_users.filter_cocina': 'Kitchen',
    'admin_users.filter_logistica': 'Logistics',
    'admin_users.filter_decoracion': 'Decoration',
    'admin_users.filter_recreacion': 'Recreation',
    'admin_users.date_all': 'All dates',
    'admin_users.date_last30': 'Last 30 days',
    'admin_users.date_next30': 'Next 30 days',
    'admin_users.date_custom': 'Custom range...',
    'admin_users.from': 'From:',
    'admin_users.to': 'To:',
    'admin_users.th_name': 'Name',
    'admin_users.th_email': 'Email',
    'admin_users.th_role': 'Role',
    'admin_users.th_phone': 'Phone',
    'admin_users.th_photo': 'Photo Status',
    'admin_users.th_actions': 'Actions',
  },

  // ─────────────────────────────────────────
  // PORTUGUÊS
  // ─────────────────────────────────────────
  pt: {
    'app.name': 'Control Banquete',
    'app.tagline': 'Gestão profissional de eventos e banquetes',
    'lang.select': 'Idioma',

    'auth.login': 'Entrar',
    'auth.logout': 'Sair',
    'auth.register': 'Criar conta',
    'auth.email': 'E-mail',
    'auth.password': 'Senha',
    'auth.password_confirm': 'Confirmar senha',
    'auth.forgot': 'Esqueceu sua senha?',
    'auth.no_account': 'Não tem conta?',
    'auth.has_account': 'Já tem conta?',
    'auth.sign_in_free': 'Criar conta gratuita →',
    'auth.go_quoter': 'Ir ao Orçamentador Público',
    'auth.welcome_back': 'Bem-vindo de volta',
    'auth.sign_in_subtitle': 'Entre no seu painel de administração',
    'auth.enter': 'Entrar',
    'auth.entering': 'Entrando...',
    'auth.invalid_credentials': 'Credenciais inválidas',

    'reg.title': 'Crie seu negócio',
    'reg.subtitle': 'Gerencie eventos, orçamentos e equipe em um só lugar',
    'reg.trial_badge': '✨ 3 dias grátis · Sem cartão de crédito',
    'reg.business_name': 'Nome da Empresa',
    'reg.business_placeholder': 'Ex: Banquetes Pérola',
    'reg.full_name': 'Seu Nome Completo',
    'reg.name_placeholder': 'Nome e sobrenome',
    'reg.email_placeholder': 'voce@empresa.com',
    'reg.password_placeholder': 'Mínimo 6 caracteres',
    'reg.confirm_placeholder': 'Repita sua senha',
    'reg.submit': 'Começar teste gratuito →',
    'reg.submitting': 'Criando conta...',
    'reg.success': '✓ Conta criada!',
    'reg.feat_1': 'Orçamentos e eventos ilimitados durante o teste',
    'reg.feat_2': 'Painel para toda sua equipe (cozinha, compras, logística)',
    'reg.feat_3': 'Seus dados são 100% privados e exclusivos do seu negócio',
    'reg.terms': 'Ao se registrar você aceita nossos',
    'reg.terms_link': 'Termos de Serviço',
    'reg.privacy_link': 'Política de Privacidade',
    'reg.cancel': 'Cancele quando quiser.',
    'reg.err_mismatch': 'As senhas não coincidem',
    'reg.err_short': 'A senha deve ter pelo menos 6 caracteres',

    'sub.title': 'Desbloqueie o acesso completo',
    'sub.subtitle': 'Escolha o plano que melhor se adapta ao seu negócio',
    'sub.trial_active': 'dia(s) restante(s) de teste',
    'sub.trial_expired': '⏰ Seu teste gratuito terminou',
    'sub.trial_ending': 'Seu teste gratuito está terminando',
    'sub.choose': 'Escolha seu plano para continuar',
    'sub.monthly': 'Mensal',
    'sub.quarterly': 'Trimestral',
    'sub.annual': 'Anual',
    'sub.per_month': 'por mês',
    'sub.per_quarter': 'por trimestre',
    'sub.per_year': 'por ano',
    'sub.popular': '⭐ Mais Popular',
    'sub.best_value': '🏆 Melhor Custo-Benefício',
    'sub.subscribe': 'Assinar',
    'sub.save_q': '💰 Economize $5 vs mensal',
    'sub.save_a': '💰 Economize $25 vs mensal',
    'sub.guarantee': '🛡️ Garantia de Satisfação',
    'sub.guarantee_text': 'Se não estiver satisfeito nos primeiros 7 dias, devolvemos seu dinheiro sem perguntas.',
    'sub.restore': '↩ Restaurar compra anterior',
    'sub.google_pay': 'Pagamentos gerenciados com segurança pelo Google Play',
    'sub.cancel_anytime': 'Cancele quando quiser',
    'sub.faq_title': 'Perguntas Frequentes',
    'sub.feat_unlimited': 'Eventos ilimitados',
    'sub.feat_team': 'Toda sua equipe',
    'sub.feat_pdf': 'PDF profissional',
    'sub.feat_inventory': 'Inventário',
    'sub.feat_notifications': 'Notificações',
    'sub.plan_monthly_f1': 'Acesso completo a todos os recursos',
    'sub.plan_monthly_f2': 'Membros ilimitados da equipe',
    'sub.plan_monthly_f3': 'Suporte prioritário',
    'sub.plan_monthly_f4': 'Cancele quando quiser',
    'sub.plan_quarterly_f1': 'Tudo do plano mensal',
    'sub.plan_quarterly_f2': '3 meses sem interrupções',
    'sub.plan_quarterly_f3': 'Relatórios avançados',
    'sub.plan_quarterly_f4': 'Exportação de dados',
    'sub.plan_annual_f1': 'Tudo do plano trimestral',
    'sub.plan_annual_f2': 'Preço bloqueado por 1 ano',
    'sub.plan_annual_f3': 'Acesso antecipado a novos recursos',
    'sub.plan_annual_f4': 'Suporte dedicado via WhatsApp',

    'cotizar.tagline': 'Solicite seu orçamento — sem compromisso',
    'cotizar.step1': 'Seus dados',
    'cotizar.step2': 'Serviços',
    'cotizar.step3': 'Confirmar',
    'cotizar.contact': '👤 Seus dados de contato',
    'cotizar.full_name': 'Nome completo *',
    'cotizar.phone': 'Telefone / WhatsApp *',
    'cotizar.email': 'E-mail *',
    'cotizar.event': '📅 Seu evento',
    'cotizar.event_type': 'Tipo de evento *',
    'cotizar.event_date': 'Data do evento *',
    'cotizar.guests': 'Número de convidados *',
    'cotizar.notes': 'Algo especial que queira nos comunicar?',
    'cotizar.notes_ph': 'Cores, tema, requisitos especiais...',
    'cotizar.next_services': 'Continuar → Serviços',
    'cotizar.next_confirm': 'Continuar → Resumo',
    'cotizar.back': '← Voltar',
    'cotizar.edit': '← Editar',
    'cotizar.send': '✉️ Enviar Solicitação',
    'cotizar.sending': 'Enviando...',
    'cotizar.summary': '📋 Resumo da solicitação',
    'cotizar.estimated': 'Total Estimado',
    'cotizar.subtotal': 'Subtotal estimado',
    'cotizar.disclaimer': '* Preço estimado. O valor final pode variar conforme personalização. Um consultor entrará em contato.',
    'cotizar.success_title': 'Solicitação Enviada!',
    'cotizar.success_sub': 'Recebemos sua solicitação de orçamento. Um consultor entrará em contato em breve.',
    'cotizar.another': 'Fazer outro orçamento',
    'cotizar.client_portal': 'Já tem uma conta de cliente?',
    'cotizar.client_login': 'Acessar seu portal →',
    'cotizar.select_event': '— Selecione —',
    'cotizar.wedding': 'Casamento',
    'cotizar.quinces': 'Debutante / 15 anos',
    'cotizar.graduation': 'Formatura / Aniversário',
    'cotizar.communion': 'Primeira Comunhão',
    'cotizar.kids': 'Festa Infantil',
    'cotizar.corporate': 'Evento Corporativo',
    'cotizar.catering': '🍽️ Catering',
    'cotizar.venues': '🏛️ Salão / Local',
    'cotizar.photography': '📸 Fotografia e Vídeo',
    'cotizar.decoration': '🌸 Decoração',
    'cotizar.recreation': '🎭 Recreação / Animação',
    'cotizar.services': '✨ Serviços Adicionais',
    'cotizar.select_plan': 'Selecione o plano de alimentação',
    'cotizar.multiple': 'Você pode selecionar vários',
    'cotizar.loading': 'Carregando orçamentador...',
    'cotizar.not_found': 'Orçamentador não encontrado',
    'cotizar.not_found_sub': 'O link pode estar incorreto ou o negócio não existe.',
    'cotizar.validate': 'Por favor preencha todos os campos do evento antes de continuar.',
    'cotizar.guests_label': 'convidados',
    'cotizar.summary_name': 'Nome',
    'cotizar.summary_event': 'Evento',
    'cotizar.summary_date': 'Data',
    'cotizar.summary_guests': 'Convidados',
    'cotizar.summary_catering': 'Catering',
    'cotizar.summary_venue': 'Salão',
    'cotizar.summary_photo': 'Fotografia',
    'cotizar.summary_deco': 'Decoração',
    'cotizar.summary_extra': 'Extra',
    'cotizar.waiters': 'Garçons necessários',
    'cotizar.available': 'Disponível',
    'cotizar.occupied': 'Reservado nesta data',
    'cotizar.check_date': 'Consultar Data',
    'cotizar.plan_selected': 'Plano selecionado',
    'cotizar.pdf_download': 'Baixar Orçamento (PDF)',
    'cotizar.another_quote': 'Realizar Outro Orçamento',

    'admin.title': 'Painel de Administração',
    'admin.subtitle': 'Superadministração geral de clientes, reservas, preços e banco de dados.',
    'admin.create_user': '+ Criar Usuário',
    'admin.create_event': '+ Criar Evento',
    'admin.cotizador_link': '🔗 Seu link de Orçamentador Público',
    'admin.cotizador_desc': 'Compartilhe este link com seus clientes. Eles preenchem o formulário e o orçamento vai direto ao seu painel.',
    'admin.portal_link': '🔐 Portal de Acesso Clientes',
    'admin.portal_desc': 'Seus clientes entram aqui com as credenciais que você lhes atribui.',
    'admin.copy': '📋 Copiar',
    'admin.copied': '✓ Copiado!',
    'admin.view': '👁 Ver',

    'trial.days_left': 'dia(s) restante(s) de teste gratuito',
    'trial.see_plans': 'Ver planos →',

    // Admin Users Tab
    'admin_users.title': 'Usuários e Clientes na Plataforma',
    'admin_users.search_ph': 'Buscar usuário ou e-mail...',
    'admin_users.filter_all': 'Todos os Cargos',
    'admin_users.filter_superadmin': 'Superadministrador',
    'admin_users.filter_cliente': 'Clientes',
    'admin_users.filter_compras': 'Compras',
    'admin_users.filter_cocina': 'Cozinha',
    'admin_users.filter_logistica': 'Logística',
    'admin_users.filter_decoracion': 'Decoração',
    'admin_users.filter_recreacion': 'Recreação',
    'admin_users.date_all': 'Todas as datas',
    'admin_users.date_last30': 'Últimos 30 dias',
    'admin_users.date_next30': 'Próximos 30 dias',
    'admin_users.date_custom': 'Intervalo personalizado...',
    'admin_users.from': 'De:',
    'admin_users.to': 'Até:',
    'admin_users.th_name': 'Nome',
    'admin_users.th_email': 'Email',
    'admin_users.th_role': 'Cargo',
    'admin_users.th_phone': 'Telefone',
    'admin_users.th_photo': 'Status da Foto',
    'admin_users.th_actions': 'Ações',
  },

  // ─────────────────────────────────────────
  // FRANÇAIS
  // ─────────────────────────────────────────
  fr: {
    'app.name': 'Control Banquete',
    'app.tagline': 'Gestion professionnelle d\'événements et banquets',
    'lang.select': 'Langue',

    'auth.login': 'Se connecter',
    'auth.logout': 'Se déconnecter',
    'auth.register': 'Créer un compte',
    'auth.email': 'Adresse e-mail',
    'auth.password': 'Mot de passe',
    'auth.password_confirm': 'Confirmer le mot de passe',
    'auth.forgot': 'Mot de passe oublié ?',
    'auth.no_account': 'Pas encore de compte ?',
    'auth.has_account': 'Déjà un compte ?',
    'auth.sign_in_free': 'Créer un compte gratuit →',
    'auth.go_quoter': 'Aller au Devis Public',
    'auth.welcome_back': 'Bon retour',
    'auth.sign_in_subtitle': 'Connectez-vous à votre panneau d\'administration',
    'auth.enter': 'Se connecter',
    'auth.entering': 'Connexion...',
    'auth.invalid_credentials': 'Identifiants invalides',

    'reg.title': 'Créez votre entreprise',
    'reg.subtitle': 'Gérez événements, devis et équipe depuis un seul endroit',
    'reg.trial_badge': '✨ 3 jours gratuits · Sans carte bancaire',
    'reg.business_name': 'Nom de l\'entreprise',
    'reg.business_placeholder': 'Ex: Banquets La Perle',
    'reg.full_name': 'Votre nom complet',
    'reg.name_placeholder': 'Prénom et nom',
    'reg.email_placeholder': 'vous@entreprise.com',
    'reg.password_placeholder': 'Minimum 6 caractères',
    'reg.confirm_placeholder': 'Répétez votre mot de passe',
    'reg.submit': 'Commencer l\'essai gratuit →',
    'reg.submitting': 'Création du compte...',
    'reg.success': '✓ Compte créé !',
    'reg.feat_1': 'Devis et événements illimités pendant l\'essai',
    'reg.feat_2': 'Tableau de bord pour toute votre équipe (cuisine, achats, logistique)',
    'reg.feat_3': 'Vos données sont 100% privées et exclusives à votre entreprise',
    'reg.terms': 'En vous inscrivant vous acceptez nos',
    'reg.terms_link': 'Conditions d\'utilisation',
    'reg.privacy_link': 'Politique de confidentialité',
    'reg.cancel': 'Annulez à tout moment.',
    'reg.err_mismatch': 'Les mots de passe ne correspondent pas',
    'reg.err_short': 'Le mot de passe doit comporter au moins 6 caractères',

    'sub.title': 'Déverrouillez l\'accès complet',
    'sub.subtitle': 'Choisissez le plan qui correspond le mieux à votre activité',
    'sub.trial_active': 'jour(s) restant(s) d\'essai',
    'sub.trial_expired': '⏰ Votre essai gratuit est terminé',
    'sub.trial_ending': 'Votre essai gratuit se termine bientôt',
    'sub.choose': 'Choisissez votre plan pour continuer',
    'sub.monthly': 'Mensuel',
    'sub.quarterly': 'Trimestriel',
    'sub.annual': 'Annuel',
    'sub.per_month': 'par mois',
    'sub.per_quarter': 'par trimestre',
    'sub.per_year': 'par an',
    'sub.popular': '⭐ Le Plus Populaire',
    'sub.best_value': '🏆 Meilleur Rapport Qualité-Prix',
    'sub.subscribe': 'S\'abonner',
    'sub.save_q': '💰 Économisez $5 vs mensuel',
    'sub.save_a': '💰 Économisez $25 vs mensuel',
    'sub.guarantee': '🛡️ Garantie de Satisfaction',
    'sub.guarantee_text': 'Si vous n\'êtes pas satisfait dans les 7 premiers jours, nous vous remboursons sans questions.',
    'sub.restore': '↩ Restaurer un achat précédent',
    'sub.google_pay': 'Paiements gérés en toute sécurité par Google Play',
    'sub.cancel_anytime': 'Annulez à tout moment',
    'sub.faq_title': 'Questions Fréquentes',
    'sub.feat_unlimited': 'Événements illimités',
    'sub.feat_team': 'Toute votre équipe',
    'sub.feat_pdf': 'PDF professionnel',
    'sub.feat_inventory': 'Inventaire',
    'sub.feat_notifications': 'Notifications',
    'sub.plan_monthly_f1': 'Accès complet à toutes les fonctionnalités',
    'sub.plan_monthly_f2': 'Membres d\'équipe illimités',
    'sub.plan_monthly_f3': 'Support prioritaire',
    'sub.plan_monthly_f4': 'Annulez quand vous voulez',
    'sub.plan_quarterly_f1': 'Tout du plan mensuel',
    'sub.plan_quarterly_f2': '3 mois sans interruption',
    'sub.plan_quarterly_f3': 'Rapports avancés',
    'sub.plan_quarterly_f4': 'Export de données',
    'sub.plan_annual_f1': 'Tout du plan trimestriel',
    'sub.plan_annual_f2': 'Prix bloqué 1 an',
    'sub.plan_annual_f3': 'Accès anticipé aux nouvelles fonctionnalités',
    'sub.plan_annual_f4': 'Support dédié via WhatsApp',

    'cotizar.tagline': 'Demandez votre devis — sans engagement',
    'cotizar.step1': 'Vos infos',
    'cotizar.step2': 'Services',
    'cotizar.step3': 'Confirmer',
    'cotizar.contact': '👤 Vos coordonnées',
    'cotizar.full_name': 'Nom complet *',
    'cotizar.phone': 'Téléphone / WhatsApp *',
    'cotizar.email': 'Adresse e-mail *',
    'cotizar.event': '📅 Votre événement',
    'cotizar.event_type': 'Type d\'événement *',
    'cotizar.event_date': 'Date de l\'événement *',
    'cotizar.guests': 'Nombre d\'invités *',
    'cotizar.notes': 'Quelque chose de spécial à nous communiquer ?',
    'cotizar.notes_ph': 'Couleurs, thème, exigences particulières...',
    'cotizar.next_services': 'Continuer → Services',
    'cotizar.next_confirm': 'Continuer → Résumé',
    'cotizar.back': '← Retour',
    'cotizar.edit': '← Modifier',
    'cotizar.send': '✉️ Envoyer la Demande',
    'cotizar.sending': 'Envoi...',
    'cotizar.summary': '📋 Résumé de votre demande',
    'cotizar.estimated': 'Total Estimado',
    'cotizar.subtotal': 'Sous-total estimé',
    'cotizar.disclaimer': '* Prix estimé. La valeur finale peut varier selon la personnalisation. Un conseiller vous contactera.',
    'cotizar.success_title': 'Demande Envoyée !',
    'cotizar.success_sub': 'Nous avons reçu votre demande de devis. Un conseiller vous contactera bientôt.',
    'cotizar.another': 'Faire une autre demande',
    'cotizar.client_portal': 'Vous avez déjà un compte client ?',
    'cotizar.client_login': 'Accéder à votre portail →',
    'cotizar.select_event': '— Sélectionnez —',
    'cotizar.wedding': 'Mariage',
    'cotizar.quinces': 'Quinceañera / Sweet 16',
    'cotizar.graduation': 'Remise de diplôme / Anniversaire',
    'cotizar.communion': 'Communion / Confirmation',
    'cotizar.kids': 'Fête d\'enfants',
    'cotizar.corporate': 'Événement d\'entreprise',
    'cotizar.catering': '🍽️ Restauration',
    'cotizar.venues': '🏛️ Salle / Lieu',
    'cotizar.photography': '📸 Photographie & Vidéo',
    'cotizar.decoration': '🌸 Décoration',
    'cotizar.recreation': '🎭 Animation / Spectacle',
    'cotizar.services': '✨ Services Supplémentaires',
    'cotizar.select_plan': 'Sélectionnez un forfait restauration',
    'cotizar.multiple': 'Vous pouvez en sélectionner plusieurs',
    'cotizar.loading': 'Chargement du deviseur...',
    'cotizar.not_found': 'Deviseur introuvable',
    'cotizar.not_found_sub': 'Le lien est peut-être incorrect ou l\'entreprise n\'existe pas.',
    'cotizar.validate': 'Veuillez remplir tous les champs de l\'événement avant de continuer.',
    'cotizar.guests_label': 'invités',
    'cotizar.summary_name': 'Nom',
    'cotizar.summary_event': 'Événement',
    'cotizar.summary_date': 'Date',
    'cotizar.summary_guests': 'Invités',
    'cotizar.summary_catering': 'Restauration',
    'cotizar.summary_venue': 'Salle',
    'cotizar.summary_photo': 'Photographie',
    'cotizar.summary_deco': 'Décoration',
    'cotizar.summary_extra': 'Extra',
    'cotizar.waiters': 'Serveurs requis',
    'cotizar.available': 'Disponible',
    'cotizar.occupied': 'Réservé à cette date',
    'cotizar.check_date': 'Consulter la Date',
    'cotizar.plan_selected': 'Forfait sélectionné',
    'cotizar.pdf_download': 'Télécharger le Devis (PDF)',
    'cotizar.another_quote': 'Faire un Autre Devis',

    'admin.title': 'Panneau d\'Administration',
    'admin.subtitle': 'Super-administration des clients, réservations, prix et base de données.',
    'admin.create_user': '+ Créer Utilisateur',
    'admin.create_event': '+ Créer Événement',
    'admin.cotizador_link': '🔗 Votre lien de Devis Public',
    'admin.cotizador_desc': 'Partagez ce lien avec vos clients. Ils remplissent le formulaire et le devis arrive directement dans votre panneau.',
    'admin.portal_link': '🔐 Portail d\'Accès Clients',
    'admin.portal_desc': 'Vos clients se connectent ici avec les identifiants que vous leur attribuez.',
    'admin.copy': '📋 Copier',
    'admin.copied': '✓ Copié !',
    'admin.view': '👁 Voir',

    'trial.days_left': 'jour(s) restant(s) d\'essai gratuit',
    'trial.see_plans': 'Voir les plans →',

    // Admin Users Tab
    'admin_users.title': 'Utilisateurs et Clients sur la Plateforme',
    'admin_users.search_ph': 'Rechercher utilisateur ou email...',
    'admin_users.filter_all': 'Tous les Rôles',
    'admin_users.filter_superadmin': 'Superadministrateur',
    'admin_users.filter_cliente': 'Clients',
    'admin_users.filter_compras': 'Achats',
    'admin_users.filter_cocina': 'Cuisine',
    'admin_users.filter_logistica': 'Logistique',
    'admin_users.filter_decoracion': 'Décoration',
    'admin_users.filter_recreacion': 'Récréation',
    'admin_users.date_all': 'Toutes les dates',
    'admin_users.date_last30': '30 derniers jours',
    'admin_users.date_next30': '30 prochains jours',
    'admin_users.date_custom': 'Plage personnalisée...',
    'admin_users.from': 'De:',
    'admin_users.to': 'À:',
    'admin_users.th_name': 'Nom',
    'admin_users.th_email': 'Email',
    'admin_users.th_role': 'Rôle',
    'admin_users.th_phone': 'Téléphone',
    'admin_users.th_photo': 'Statut Photo',
    'admin_users.th_actions': 'Actions',
  }
};

// ═══════════════════════════════════════════
// MOTOR i18n
// ═══════════════════════════════════════════

const SUPPORTED_LANGS = ['es', 'en', 'pt', 'fr'];
const LANG_META = {
  es: { flag: '🇪🇸', name: 'Español',    native: 'Español'    },
  en: { flag: '🇺🇸', name: 'English',    native: 'English'    },
  pt: { flag: '🇧🇷', name: 'Português',  native: 'Português'  },
  fr: { flag: '🇫🇷', name: 'Français',   native: 'Français'   }
};

function detectLang() {
  // 1. Query param ?lang=en
  const urlParam = new URLSearchParams(window.location.search).get('lang');
  if (urlParam && SUPPORTED_LANGS.includes(urlParam)) return urlParam;
  // 2. localStorage
  const saved = localStorage.getItem('cb_lang');
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  // 3. Browser language
  const browserLang = (navigator.language || navigator.userLanguage || 'es').substring(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(browserLang) ? browserLang : 'es';
}

let currentLang = detectLang();

function t(key) {
  return TRANSLATIONS[currentLang]?.[key]
    || TRANSLATIONS['es']?.[key]
    || key;
}

function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem('cb_lang', lang);
  document.documentElement.lang = lang;
  applyTranslations();
  renderLangSwitcher();
  // Disparar evento para que páginas puedan re-renderizar contenido dinámico
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

function applyTranslations() {
  // Traducir elementos con data-i18n (textContent)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });
  // Traducir placeholders con data-i18n-ph
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = t(key);
    if (val) el.placeholder = val;
  });
  // Traducir title con data-i18n-title
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (val) el.title = val;
  });
  // Actualizar <title> de la página si tiene data-i18n-page-title
  const pageTitle = document.querySelector('[data-i18n-page-title]');
  if (pageTitle) {
    const key = pageTitle.getAttribute('data-i18n-page-title');
    document.title = t(key) + ' — ' + t('app.name');
  }
}

// ─────────────────────────────────────────
// WIDGET SELECTOR DE IDIOMA
// ─────────────────────────────────────────
function renderLangSwitcher() {
  const container = document.getElementById('lang-switcher');
  if (!container) return;

  container.innerHTML = `
    <div class="lang-switcher-inner" id="lang-switcher-inner">
      <button class="lang-current-btn" id="lang-current-btn" onclick="toggleLangMenu()" aria-label="${t('lang.select')}">
        <span>${LANG_META[currentLang].flag}</span>
        <span style="font-size:0.78rem;font-weight:600;">${LANG_META[currentLang].native}</span>
        <span style="font-size:0.6rem;opacity:0.6;">▼</span>
      </button>
      <div class="lang-menu" id="lang-menu">
        ${SUPPORTED_LANGS.map(lang => `
          <button class="lang-option ${lang === currentLang ? 'active' : ''}" onclick="setLang('${lang}')">
            <span>${LANG_META[lang].flag}</span>
            <span>${LANG_META[lang].native}</span>
            ${lang === currentLang ? '<span style="margin-left:auto;color:var(--gold,#ffcf4b)">✓</span>' : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function toggleLangMenu() {
  const menu = document.getElementById('lang-menu');
  if (!menu) return;
  menu.classList.toggle('open');
  // Cerrar al hacer click afuera
  const close = (e) => {
    if (!e.target.closest('#lang-switcher')) {
      menu.classList.remove('open');
      document.removeEventListener('click', close);
    }
  };
  if (menu.classList.contains('open')) {
    setTimeout(() => document.addEventListener('click', close), 10);
  }
}

// ─────────────────────────────────────────
// ESTILOS DEL SWITCHER (inyectados automáticamente)
// ─────────────────────────────────────────
function injectLangStyles() {
  if (document.getElementById('i18n-styles')) return;
  const style = document.createElement('style');
  style.id = 'i18n-styles';
  style.textContent = `
    #lang-switcher { position: relative; }
    .lang-switcher-inner { position: relative; }
    .lang-current-btn {
      display: flex; align-items: center; gap: 0.35rem;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 100px; padding: 0.35rem 0.75rem;
      color: var(--text, #f0f0f5); cursor: pointer; font-family: inherit;
      transition: background 0.15s, border-color 0.15s;
    }
    .lang-current-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,207,75,0.3); }
    .lang-menu {
      position: absolute; top: calc(100% + 8px); right: 0;
      background: #1a1a26; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 0.4rem;
      min-width: 150px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      display: none; z-index: 10000;
      animation: fadeIn 0.15s ease;
    }
    .lang-menu.open { display: block; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(-4px);} to{opacity:1;transform:translateY(0);} }
    .lang-option {
      display: flex; align-items: center; gap: 0.5rem; width: 100%;
      background: none; border: none; border-radius: 8px;
      padding: 0.55rem 0.75rem; cursor: pointer; color: var(--text2, #8888aa);
      font-family: inherit; font-size: 0.85rem; text-align: left;
      transition: background 0.1s, color 0.1s;
    }
    .lang-option:hover { background: rgba(255,255,255,0.06); color: var(--text, #f0f0f5); }
    .lang-option.active { color: var(--text, #f0f0f5); font-weight: 600; }

    /* Floating lang switcher para páginas públicas */
    #lang-switcher-float {
      position: fixed; top: 1rem; right: 1rem; z-index: 9999;
    }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────
// INIT AUTOMÁTICO
// ─────────────────────────────────────────
function i18nInit() {
  injectLangStyles();
  document.documentElement.lang = currentLang;

  // Si no hay switcher en el DOM, crear uno flotante
  if (!document.getElementById('lang-switcher')) {
    const floatDiv = document.createElement('div');
    floatDiv.id = 'lang-switcher-float';
    floatDiv.innerHTML = '<div id="lang-switcher"></div>';
    document.body.appendChild(floatDiv);
  }

  renderLangSwitcher();
  applyTranslations();
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', i18nInit);
} else {
  i18nInit();
}

// Exportar para uso en módulos ES6
if (typeof window !== 'undefined') {
  window.i18n = { t, setLang, currentLang: () => currentLang, applyTranslations, LANG_META, SUPPORTED_LANGS };
}
