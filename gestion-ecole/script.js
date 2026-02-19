// ==========================================
// 1. CONFIGURATION ET VARIABLES GLOBALES
// ==========================================

// Liste des matières enseignées
const MATIERES_ECOLE = ["Mathématiques", "Français", "Histoire-Géo", "Anglais", "SVT", "Physique", "Sport", "Arts Plastiques"];

// Classes définies par l'établissement (1ère à 9ème année)
const CLASSES = [
    "1ère Année",
    "2ème Année",
    "3ème Année",
    "4ème Année",
    "5ème Année",
    "6ème Année",
    "7ème Année",
    "8ème Année",
    "9ème Année"
];

// Tarifs des scolarités
const TARIFS = { 
    "Mensuel": 15000, 
    "Trimestriel": 40000, 
    "Annuel": 150000 
};

// Variables pour stocker l'état actuel
let eleveIdEnEdition = null; // Utilisé quand on modifie un élève
let currentUserRole = null;  // 'admin' ou 'parent'
let financeState = { page: 1, pageSize: 10, lastFiltered: [] };
let studentState = { page: 1, pageSize: 10, lastFiltered: [] };
let classStudentState = { page: 1, pageSize: 8, selected: null, filtered: [] };

// -- SÉLECTEURS DU DOM (HTML) --
// On récupère toutes les sections (pages)
const sections = {
    dashboard: document.getElementById('dashboard-section'),
    dashboardStats: document.getElementById('dashboard-stats'),
    dashboardInsights: document.getElementById('dashboard-insights'),
    activity: document.getElementById('activity-section'),
    eleves: document.getElementById('student-section'),
    profs: document.getElementById('professeurs-section'),
    absences: document.getElementById('absences-section'),
    notes: document.getElementById('notes-section'),
    finances: document.getElementById('finances-section'),
    params: document.getElementById('params-section'),
    parent: document.getElementById('parent-section')
};

// On récupère tous les liens du menu
const links = {
    dashboard: document.getElementById('link-dashboard'),
    eleves: document.getElementById('link-eleves'),
    classes: document.getElementById('link-classes'),
    matieres: document.getElementById('link-matieres'),
    profs: document.getElementById('link-profs'),
    absences: document.getElementById('link-absences'),
    notes: document.getElementById('link-notes'),
    finances: document.getElementById('link-finances'),
    params: document.getElementById('link-params')
};

const sidebar = document.querySelector('.sidebar');

function setSidebarBottom(enabled) {
    if(!sidebar) return;
    sidebar.classList.toggle('sidebar-bottom', enabled);
}

// ==========================================
// UX PRO: Thème, onboarding, journal, notifications
// ==========================================
const ACTIVITY_KEY = 'journalActivites';
const LAST_BACKUP_KEY = 'autoBackupDate';

function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('theme-dark', saved === 'dark');
    const btn = document.getElementById('theme-toggle');
    if(btn) {
        btn.innerText = saved === 'dark' ? 'Mode clair' : 'Mode sombre';
        btn.onclick = toggleTheme;
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('theme-dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const btn = document.getElementById('theme-toggle');
    if(btn) btn.innerText = isDark ? 'Mode clair' : 'Mode sombre';
}

function getActivities() {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY)) || [];
}

function logActivity(message, type = 'info') {
    const activities = getActivities();
    activities.unshift({ message, type, time: new Date().toISOString() });
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities.slice(0, 50)));
    renderActivities();
    showToast(message, type);
}

function formatTime(ts) {
    try {
        return new Date(ts).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return '';
    }
}

function renderActivities() {
    const list = document.getElementById('activity-log');
    const notif = document.getElementById('notification-list');
    if(!list && !notif) return;
    const activities = getActivities();

    if(list) {
        list.innerHTML = activities.length ? activities.slice(0, 8).map(a => `
            <li class="activity-item">
                <div class="activity-text">${a.message}</div>
                <div class="d-flex align-items-center gap-2">
                    <span class="activity-type type-${a.type}">${a.type}</span>
                    <span class="activity-time">${formatTime(a.time)}</span>
                </div>
            </li>
        `).join('') : '<li class="text-muted small">Aucune activité récente.</li>';
    }

    if(notif) {
        notif.innerHTML = activities.length ? activities.slice(0, 5).map(a => `
            <li class="notification-item">
                <div class="notification-text">${a.message}</div>
                <div class="d-flex align-items-center gap-2">
                    <span class="notification-type type-${a.type}">${a.type}</span>
                    <span class="notification-time">${formatTime(a.time)}</span>
                </div>
            </li>
        `).join('') : '<li class="text-muted small">Aucune notification pour le moment.</li>';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `app-toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

function autoBackupDaily() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayKey = `${yyyy}-${mm}-${dd}`;

    if(localStorage.getItem(LAST_BACKUP_KEY) === todayKey) return;

    const keys = [
        'listeEleves', 'listeProfs', 'historiqueAbsences',
        'notesEleves', 'bulletinsScolaires', 'historiquePaiements',
        'listeClasses', 'listeMatieres'
    ];

    const data = {};
    keys.forEach(k => {
        data[k] = JSON.parse(localStorage.getItem(k)) || null;
    });

    localStorage.setItem('autoBackup', JSON.stringify({ date: todayKey, data }));
    localStorage.setItem(LAST_BACKUP_KEY, todayKey);
    logActivity('Sauvegarde automatique créée', 'info');
}

function showOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    if(!modal) return;
    if(localStorage.getItem('onboardingSeen') === '1') return;
    modal.style.display = 'flex';
    const btn = document.getElementById('onboarding-close');
    if(btn) btn.onclick = () => {
        modal.style.display = 'none';
        localStorage.setItem('onboardingSeen', '1');
    };
}

function setupGlobalSearch() {
    const input = document.getElementById('global-search');
    const results = document.getElementById('global-search-results');
    if(!input || !results) return;

    const render = () => {
        const q = input.value.trim().toLowerCase();
        if(q.length < 2) {
            results.classList.add('d-none');
            results.innerHTML = '';
            return;
        }

        const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
        const profs = JSON.parse(localStorage.getItem('listeProfs')) || [];
        const paiements = JSON.parse(localStorage.getItem('historiquePaiements')) || [];

        const items = [];

        eleves.filter(e => `${e.nom} ${e.prenom} ${e.id} ${e.classe}`.toLowerCase().includes(q))
            .slice(0, 4)
            .forEach(e => items.push({
                title: `${e.nom} ${e.prenom}`,
                meta: `Élève • ${e.classe} • ID ${e.id}`
            }));

        profs.filter(p => `${p.nom} ${p.matiere}`.toLowerCase().includes(q))
            .slice(0, 3)
            .forEach(p => items.push({
                title: p.nom,
                meta: `Professeur • ${p.matiere}`
            }));

        paiements.filter(p => `${p.payeur} ${p.type} ${p.date}`.toLowerCase().includes(q))
            .slice(0, 3)
            .forEach(p => items.push({
                title: p.payeur,
                meta: `Paiement • ${p.type} • ${p.montant} FCFA`
            }));

        results.innerHTML = items.length ? items.map(i => `
            <div class="search-result-item">
                <div class="search-result-title">${i.title}</div>
                <div class="search-result-meta">${i.meta}</div>
            </div>
        `).join('') : '<div class="search-result-item text-muted small">Aucun résultat.</div>';

        results.classList.remove('d-none');
    };

    input.addEventListener('input', render);
    document.addEventListener('click', (e) => {
        if(!results.contains(e.target) && e.target !== input) {
            results.classList.add('d-none');
        }
    });
}

// ==========================================
// 2. INITIALISATION & NAVIGATION
// ==========================================

// Fonction pour cacher toutes les sections avant d'en afficher une
function cacherTout() {
    // Cache les sections principales
    Object.values(sections).forEach(section => { 
        if(section) section.style.display = 'none'; 
    });
    
    // Cache les sections spécifiques aux élèves (cas particulier)
    document.querySelectorAll('.student-section').forEach(el => el.style.display = 'none'); 
    
    // Retire la classe 'active' de tous les liens du menu
    Object.values(links).forEach(link => {
        if(link) link.classList.remove('active');
    });
}

// Fonction principale qui se lance au chargement de la page
window.onload = function() {
    initTheme();
    
    // 1. Cas de la page de connexion (index.html)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', gererLogin);
        return;
    }

    // 2. Cas du tableau de bord (dashboard.html)
    if (window.location.pathname.includes("dashboard.html")) {
        // Vérification de sécurité : est-on connecté ?
        const session = JSON.parse(localStorage.getItem('sessionUser'));
        if (!session) { 
            window.location.href = "index.html"; 
            return; 
        }

        currentUserRole = session.role;
        cacherTout();

        if (currentUserRole === 'admin') {
            // --- MODE ADMIN ---
            if(sidebar) sidebar.style.display = 'block';
            sections.dashboard.style.display = 'block';
            if(sections.dashboardStats) sections.dashboardStats.style.display = 'block';
            if(sections.dashboardInsights) sections.dashboardInsights.style.display = 'block';
            if(sections.activity) sections.activity.style.display = 'block';
            if(links.dashboard) links.dashboard.classList.add('active');
            setSidebarBottom(false);
            
            updateStats();
            renderActivities();
            if(document.getElementById('current-date')) {
                document.getElementById('current-date').innerText = new Date().toLocaleDateString('fr-FR');
            }
            setupAdminMenu();
            setupGlobalSearch();
            autoBackupDaily();
            showOnboarding();

            // =======================================================
            // ZONE DE NETTOYAGE : SUPPRESSION DU PAIEMENT PARENT
            // =======================================================
            
            // 1. Enlever "Régler la scolarité" (Le formulaire)
            const formPay = document.getElementById('paymentForm');
            if(formPay) {
                // On cache le formulaire
                formPay.style.display = 'none';
                
                // On cache le titre "Régler la scolarité" juste au-dessus
                if(formPay.previousElementSibling) {
                    formPay.previousElementSibling.style.display = 'none';
                }
                
                // Si le formulaire est dans une "card" ou un conteneur parent visible, on le cache aussi
                // (Cela permet d'enlever le cadre blanc s'il y en a un)
                if(formPay.parentElement && formPay.parentElement.tagName === 'DIV') {
                   // Attention : on vérifie que ce n'est pas la section principale
                   if(formPay.parentElement.id !== 'dashboard-section') {
                       formPay.parentElement.style.display = 'none';
                   }
                }
            }

            // 2. Enlever "Vos derniers paiements" (L'historique personnel)
            const historiquePerso = document.getElementById('parent-payment-history');
            if(historiquePerso) {
                historiquePerso.style.display = 'none';
                // On cache le titre "Vos derniers paiements" juste au-dessus
                if(historiquePerso.previousElementSibling) {
                    historiquePerso.previousElementSibling.style.display = 'none';
                }
            }
            // =======================================================
            // FIN DE LA ZONE DE NETTOYAGE
            // =======================================================
        } else {
            // --- MODE PARENT ---
            if(sidebar) sidebar.style.display = 'none';
            sections.parent.style.display = 'block';
            
            // Initialiser les données Parent
            chargerVueParent(session.studentId);
            
            // Formulaire de paiement géré via l'attribut onsubmit
        }
    }

    // 3. Page de gestion des classes
    if (window.location.pathname.includes("classes.html")) {
        const session = JSON.parse(localStorage.getItem('sessionUser'));
        if(!session) { window.location.href = 'index.html'; return; }
        currentUserRole = session.role;
        if(currentUserRole !== 'admin') { window.location.href = 'index.html'; return; }
        if(document.getElementById('current-date')) document.getElementById('current-date').innerText = new Date().toLocaleDateString('fr-FR');
        loadClassesPage();
        return;
    }

    // 4. Page de gestion des matières
    if (window.location.pathname.includes("matieres.html")) {
        const session = JSON.parse(localStorage.getItem('sessionUser'));
        if(!session) { window.location.href = 'index.html'; return; }
        currentUserRole = session.role;
        if(currentUserRole !== 'admin') { window.location.href = 'index.html'; return; }
        if(document.getElementById('current-date')) document.getElementById('current-date').innerText = new Date().toLocaleDateString('fr-FR');
        loadMatieresPage();
        return;
    }
};

// Configuration des clics sur le menu Admin
function setupAdminMenu() {
    if(links.dashboard) links.dashboard.onclick = () => { 
        cacherTout(); 
        sections.dashboard.style.display='block'; 
        if(sections.dashboardStats) sections.dashboardStats.style.display = 'block';
        if(sections.dashboardInsights) sections.dashboardInsights.style.display = 'block';
        if(sections.activity) sections.activity.style.display = 'block';
        links.dashboard.classList.add('active'); 
        updateStats(); 
        setSidebarBottom(false);
    };
    if(links.eleves) links.eleves.onclick = () => { 
        cacherTout(); 
        document.querySelectorAll('.student-section').forEach(e=>e.style.display='block'); 
        links.eleves.classList.add('active'); 
        studentState.page = 1;
        chargerEleves(); 
        setSidebarBottom(true);
    };
    if(links.profs) links.profs.onclick = () => { 
        cacherTout(); 
        sections.profs.style.display='block'; 
        links.profs.classList.add('active'); 
        chargerProfs(); 
        setSidebarBottom(true);
    };
    if(links.absences) links.absences.onclick = () => { 
        cacherTout(); 
        sections.absences.style.display='block'; 
        links.absences.classList.add('active'); 
        preparerAppel(); 
        setSidebarBottom(true);
    };
    if(links.notes) links.notes.onclick = () => { 
        cacherTout(); 
        sections.notes.style.display='block'; 
        links.notes.classList.add('active'); 
        remplirSelectEleves(); 
        setSidebarBottom(true);
    };
    if(links.finances) links.finances.onclick = () => { 
        cacherTout(); 
        sections.finances.style.display='block'; 
        links.finances.classList.add('active'); 
        financeState.page = 1;
        chargerFinancesAdmin(); 
        setSidebarBottom(true);
    };
    if(links.params) links.params.onclick = () => {
        cacherTout();
        sections.params.style.display='block';
        links.params.classList.add('active');
        setSidebarBottom(true);
    };
}

// Activer recherche/filtre finance si éléments présents
document.addEventListener('input', function(e) {
    if(e.target && (e.target.id === 'finance-search' || e.target.id === 'finance-filter')) {
        financeState.page = 1;
        chargerFinancesAdmin();
    }
    if(e.target && (e.target.id === 'student-search' || e.target.id === 'student-class-filter')) {
        studentState.page = 1;
        chargerEleves();
    }
});

document.addEventListener('click', function(e) {
    if(!e.target) return;
    if(e.target.id === 'finance-prev') {
        financeState.page = Math.max(1, financeState.page - 1);
        chargerFinancesAdmin();
    }
    if(e.target.id === 'finance-next') {
        financeState.page = financeState.page + 1;
        chargerFinancesAdmin();
    }
    if(e.target.id === 'finance-export') {
        exportFinanceCSV();
    }
    if(e.target.id === 'student-prev') {
        studentState.page = Math.max(1, studentState.page - 1);
        chargerEleves();
    }
    if(e.target.id === 'student-next') {
        studentState.page = studentState.page + 1;
        chargerEleves();
    }
    if(e.target.id === 'class-student-prev') {
        classStudentState.page = Math.max(1, classStudentState.page - 1);
        renderClassStudents();
    }
    if(e.target.id === 'class-student-next') {
        classStudentState.page = classStudentState.page + 1;
        renderClassStudents();
    }
    if(e.target.id === 'abs-open-all') {
        document.querySelectorAll('#absenceClassContainer .collapse').forEach(c => c.classList.add('show'));
    }
    if(e.target.id === 'abs-close-all') {
        document.querySelectorAll('#absenceClassContainer .collapse').forEach(c => c.classList.remove('show'));
    }
    if(e.target.dataset && e.target.dataset.class) {
        const classFilter = document.getElementById('student-class-filter');
        if(classFilter) classFilter.value = e.target.dataset.class;
        studentState.page = 1;
        document.querySelectorAll('#student-class-buttons button').forEach(b => b.classList.remove('btn-primary'));
        e.target.classList.add('btn-primary');
        chargerEleves();
    }
});

function exportFinanceCSV() {
    const rows = financeState.lastFiltered || [];
    const header = ['Date','Élève','Payeur','Contact','Type','Montant','Statut'];
    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    const lines = [header.join(';')];
    rows.forEach(p => {
        const el = eleves.find(e => String(e.id) === String(p.eleveId));
        const nomEleve = el ? `${el.nom} ${el.prenom}` : 'Élève inconnu';
        const line = [p.date, nomEleve, p.payeur, p.contact, p.type, p.montant, p.statut]
            .map(v => String(v).replace(/;/g, ',')).join(';');
        lines.push(line);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paiements_filtrés.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Fonction de Connexion
function gererLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    const errEl = document.getElementById('error-msg');
    if (errEl) errEl.style.display = 'none';

    // Admin par défaut
    if (user === "admin" && pass === "1234") {
        localStorage.setItem('sessionUser', JSON.stringify({ role: 'admin' }));
        window.location.href = "dashboard.html";
        return;
    }

    // Vérification si c'est un élève (parent) — ici le code élève sert d'identifiant
    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    const eleve = eleves.find(it => String(it.id) === user);

    if (eleve) {
        // C'est un parent -> on stocke son ID
        localStorage.setItem('sessionUser', JSON.stringify({ role: 'parent', studentId: eleve.id }));
        window.location.href = "dashboard.html";
    } else {
        if (errEl) {
            errEl.innerText = 'Identifiants incorrects !';
            errEl.style.display = 'block';
        } else {
            alert('Identifiants incorrects !');
        }
    }
}

// Fonction de Déconnexion
function deconnexion() {
    showConfirmModal({ title: 'Déconnexion', bodyHtml: 'Voulez-vous vraiment vous déconnecter ?' }, () => {
        localStorage.removeItem('sessionUser');
        window.location.href = "index.html";
    });
}

// ==========================================
// 3. STATISTIQUES (ADMIN)
// ==========================================

// Utilitaires pour récupérer les listes stockées (ou les valeurs par défaut)
function getStoredClasses() {
    return JSON.parse(localStorage.getItem('listeClasses')) || CLASSES.slice();
}

function getStoredMatieres() {
    return JSON.parse(localStorage.getItem('listeMatieres')) || MATIERES_ECOLE.slice();
}

function updateStats() {
    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    const profs = JSON.parse(localStorage.getItem('listeProfs')) || [];
    const paiements = JSON.parse(localStorage.getItem('historiquePaiements')) || [];
    const classes = getStoredClasses();
    const matieres = getStoredMatieres();
    
    // Mise à jour des compteurs
    if(document.getElementById('total-eleves')) document.getElementById('total-eleves').innerText = eleves.length;
    if(document.getElementById('total-profs')) document.getElementById('total-profs').innerText = profs.length;
    if(document.getElementById('total-classes')) document.getElementById('total-classes').innerText = classes.length;
    if(document.getElementById('total-matieres')) document.getElementById('total-matieres').innerText = matieres.length;

    // Calcul argent total (UNIQUEMENT les paiements VALIDÉS)
    let totalCaisse = 0;
    paiements.forEach(p => {
        if(p.statut === "Validé") {
            totalCaisse += parseInt(p.montant);
        }
    });
    
    if(document.getElementById('finance-total')) {
        document.getElementById('finance-total').innerText = totalCaisse.toLocaleString() + " FCFA";
    }

    // Paiements en attente
    const enAttente = paiements.filter(p => p.statut === "En attente").length;
    if(document.getElementById('paiements-en-attente')) {
        document.getElementById('paiements-en-attente').innerText = enAttente;
    }

    const totalPaiements = paiements.length;
    const valides = paiements.filter(p => p.statut === "Validé").length;
    const paymentRate = totalPaiements > 0 ? Math.round((valides / totalPaiements) * 100) : 0;
    const paymentBar = document.getElementById('kpi-payment-rate');
    const paymentLabel = document.getElementById('kpi-payment-rate-label');
    if(paymentBar) paymentBar.style.width = `${paymentRate}%`;
    if(paymentLabel) paymentLabel.innerText = `${paymentRate}%`;
    
    // Calcul Moyenne École
    const bulletins = JSON.parse(localStorage.getItem('bulletinsScolaires')) || {};
    let sommeEcole = 0, compteEcole = 0;
    for (let id in bulletins) {
        let sommeE = 0, nbM = 0;
        for (let m in bulletins[id]) {
            if (MATIERES_ECOLE.includes(m) && bulletins[id][m]) {
                const entry = bulletins[id][m];
                const val = typeof entry === 'object' && entry !== null ? entry.trimestre : entry;
                const num = parseFloat(String(val).replace(',', '.'));
                if(!isNaN(num)) { sommeE += num; nbM++; }
            }
        }
        if(nbM > 0) { sommeEcole += (sommeE/nbM); compteEcole++; }
    }
    if(document.getElementById('moyenne-ecole')) {
        document.getElementById('moyenne-ecole').innerText = compteEcole > 0 ? (sommeEcole/compteEcole).toFixed(2) + "/20" : "-";
    }

    // Absences du jour
    const historique = JSON.parse(localStorage.getItem('historiqueAbsences')) || [];
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const todayEntry = historique.find(h => h.date === todayStr);
    const absToday = todayEntry ? todayEntry.absents.length : 0;
    if(document.getElementById('absences-aujourdhui')) {
        document.getElementById('absences-aujourdhui').innerText = absToday;
    }

    const attendanceRate = eleves.length > 0 ? Math.max(0, Math.round(((eleves.length - absToday) / eleves.length) * 100)) : 0;
    const attendanceBar = document.getElementById('kpi-attendance');
    const attendanceLabel = document.getElementById('kpi-attendance-label');
    if(attendanceBar) attendanceBar.style.width = `${attendanceRate}%`;
    if(attendanceLabel) attendanceLabel.innerText = `${attendanceRate}%`;
}

// ==========================================
// 4. GESTION DES ÉLÈVES (COMPLET)
// ==========================================
const studentForm = document.getElementById('addStudentForm');
if(studentForm) {
    // Aperçu photo lorsque l'on sélectionne un fichier
    const photoInput = document.getElementById('photoInput');
    if(photoInput) {
        photoInput.addEventListener('change', function() {
            const preview = document.getElementById('photoPreview');
            const file = this.files && this.files[0];
            if(preview && file) {
                const readerP = new FileReader();
                readerP.onload = (ev) => {
                    preview.src = ev.target.result;
                    preview.style.display = 'block';
                };
                readerP.readAsDataURL(file);
            } else if(preview) {
                preview.src = '';
                preview.style.display = 'none';
            }
        });
    }
    studentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const fileInput = document.getElementById('photoInput');
        const studentError = document.getElementById('student-error');
        if(studentError) studentError.style.display = 'none';

        // Validation simple côté client
        const nomVal = document.getElementById('nom')?.value.trim();
        const prenomVal = document.getElementById('prenom')?.value.trim();
        const classeVal = document.getElementById('classe')?.value;
        if(!nomVal || !prenomVal || !classeVal) {
            if(studentError) {
                studentError.innerText = 'Veuillez remplir les champs : Nom, Prénom et Classe.';
                studentError.style.display = 'block';
            }
            return;
        }
        
        // Fonction interne pour sauvegarder
        const saveStudent = (photoData) => {
            let eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
            const isEdit = Boolean(eleveIdEnEdition);
            
            const newStudent = {
                id: eleveIdEnEdition || Date.now(), // ID unique
                nom: document.getElementById('nom').value,
                prenom: document.getElementById('prenom').value,
                classe: document.getElementById('classe').value,
                photo: photoData || "https://via.placeholder.com/150",
                dateNaiss: document.getElementById('dateNaiss')?.value || "",
                lieuNaiss: document.getElementById('lieuNaiss')?.value || "",
                genre: document.getElementById('genre')?.value || "M"
            };

            if(eleveIdEnEdition) {
                // Mode Modification
                eleves = eleves.map(e => e.id === eleveIdEnEdition ? newStudent : e);
                eleveIdEnEdition = null;
                studentForm.querySelector('button').innerText = "Inscrire l'élève";
            } else {
                // Mode Nouvel Ajout
                eleves.push(newStudent);
            }
            
            localStorage.setItem('listeEleves', JSON.stringify(eleves));
            studentForm.reset();
            const preview = document.getElementById('photoPreview');
            if(preview) { preview.src = ''; preview.style.display = 'none'; }
            chargerEleves();
            updateStats();
            logActivity(isEdit ? `Élève mis à jour : ${newStudent.nom} ${newStudent.prenom}` : `Nouvel élève inscrit : ${newStudent.nom} ${newStudent.prenom}`, 'success');
        };

        // Gestion de la photo (Fichier ou Existant)
        if(fileInput && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => saveStudent(e.target.result);
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            // Si on modifie sans changer la photo, on garde l'ancienne
            const existing = eleveIdEnEdition ? (JSON.parse(localStorage.getItem('listeEleves')).find(x=>x.id===eleveIdEnEdition).photo) : null;
            saveStudent(existing);
        }
    });
}

function chargerEleves() {
    const tbody = document.getElementById('studentTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    const classes = getStoredClasses();

    const classFilter = document.getElementById('student-class-filter');
    const searchInput = document.getElementById('student-search');
    const classButtons = document.getElementById('student-class-buttons');
    const hint = document.getElementById('student-list-hint');
    const tableContainer = document.getElementById('student-table-container');

    if(classButtons && classButtons.children.length === 0) {
        const all = classes.concat(['Autres']);
        classButtons.innerHTML = all.map(c => `<button class="btn btn-outline-secondary btn-sm" data-class="${c}">${c}</button>`).join('');
    }

    const searchTerm = (searchInput?.value || '').toLowerCase();
    const cls = classFilter?.value || '';

    if(!cls) {
        if(tableContainer) tableContainer.classList.add('d-none');
        if(hint) hint.style.display = 'block';
        const info = document.getElementById('student-pagination-info');
        if(info) info.innerText = '';
        const prev = document.getElementById('student-prev');
        const next = document.getElementById('student-next');
        if(prev) prev.disabled = true;
        if(next) next.disabled = true;
        return;
    }

    if(hint) hint.style.display = 'none';
    if(tableContainer) tableContainer.classList.remove('d-none');

    let filtered = eleves.filter(e => {
        const classOk = cls ? (cls === 'Autres' ? !classes.includes(e.classe) : e.classe === cls) : true;
        if(!classOk) return false;
        const hay = `${e.nom} ${e.prenom} ${e.id} ${e.classe}`.toLowerCase();
        return hay.includes(searchTerm);
    });

    studentState.lastFiltered = filtered.slice();
    const total = filtered.length;
    const pageSize = studentState.pageSize;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if(studentState.page > totalPages) studentState.page = totalPages;
    const startIdx = (studentState.page - 1) * pageSize;
    const pageItems = filtered.slice(startIdx, startIdx + pageSize);

    pageItems.forEach(el => {
        tbody.innerHTML += `
            <tr>
                <td>
                    <img src="${el.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;">
                    ${el.nom} ${el.prenom}
                </td>
                <td>${el.classe}</td>
                <td>${el.id}</td>
                <td>
                    <button onclick="voirDossier(${el.id})" class="btn btn-sm btn-outline-primary">📂</button>
                    <button onclick="preparerEditionEleve(${el.id})" class="btn btn-sm btn-outline-warning">✏️</button>
                    <button onclick="supprimerEleve(${el.id})" class="btn btn-sm btn-outline-danger">❌</button>
                </td>
            </tr>
        `;
    });

    const info = document.getElementById('student-pagination-info');
    if(info) info.innerText = `Page ${studentState.page} / ${totalPages} — ${total} élève(s)`;
    const prev = document.getElementById('student-prev');
    const next = document.getElementById('student-next');
    if(prev) prev.disabled = studentState.page <= 1;
    if(next) next.disabled = studentState.page >= totalPages;

    const migrateBtn = document.getElementById('migrateClassesBtn');
    if(migrateBtn) migrateBtn.onclick = migrateClasses;
}

function supprimerEleve(id) {
    showConfirmModal({ title: 'Supprimer élève', bodyHtml: 'Êtes-vous sûr de vouloir supprimer cet élève ?' }, () => {
        let eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
        const current = eleves.find(e => e.id === id);
        eleves = eleves.filter(e => e.id !== id);
        localStorage.setItem('listeEleves', JSON.stringify(eleves));
        chargerEleves();
        updateStats();
        if(current) logActivity(`Élève supprimé : ${current.nom} ${current.prenom}`, 'warning');
    });
}

function preparerEditionEleve(id) {
    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    const el = eleves.find(e => e.id === id);
    if(el) {
        document.getElementById('nom').value = el.nom;
        document.getElementById('prenom').value = el.prenom;
        document.getElementById('classe').value = el.classe;
        if(document.getElementById('dateNaiss')) document.getElementById('dateNaiss').value = el.dateNaiss;
        if(document.getElementById('lieuNaiss')) document.getElementById('lieuNaiss').value = el.lieuNaiss;
        if(document.getElementById('genre')) document.getElementById('genre').value = el.genre;
        
        eleveIdEnEdition = id;
        studentForm.querySelector('button').innerText = "Mettre à jour";
    }
}

function voirDossier(id) {
    const el = JSON.parse(localStorage.getItem('listeEleves')).find(e => e.id === id);
    if(el) {
        document.getElementById('dossier-nom').innerText = el.nom + " " + el.prenom;
        document.getElementById('dossier-classe').innerText = el.classe;
        document.getElementById('dossier-id').innerText = el.id;
        document.getElementById('dossier-photo').src = el.photo;
        
        // Champs optionnels
        if(document.getElementById('dossier-date')) document.getElementById('dossier-date').innerText = el.dateNaiss || "-";
        if(document.getElementById('dossier-lieu')) document.getElementById('dossier-lieu').innerText = el.lieuNaiss || "-";
        if(document.getElementById('dossier-genre')) document.getElementById('dossier-genre').innerText = el.genre || "-";
        
        document.getElementById('modal-dossier').style.display = 'flex';
    }
}

function fermerDossier() { 
    document.getElementById('modal-dossier').style.display = 'none'; 
}

// ==========================================
// 5. GESTION DES PROFESSEURS (COMPLET)
// ==========================================
const profForm = document.getElementById('addProfForm');
if(profForm) {
    profForm.addEventListener('submit', function(e) {
        e.preventDefault();
        let profs = JSON.parse(localStorage.getItem('listeProfs')) || [];
        
        const profName = document.getElementById('profNom').value;
        profs.push({
            id: Date.now(),
            nom: profName,
            matiere: document.getElementById('profMatiere').value,
            horaires: document.getElementById('profHoraires').value
        });
        
        localStorage.setItem('listeProfs', JSON.stringify(profs));
        profForm.reset();
        chargerProfs();
        updateStats();
        logActivity(`Professeur ajouté : ${profName}`, 'success');
    });
}

function chargerProfs() {
    const tbody = document.getElementById('profTableBody');
    if(!tbody) return;
    tbody.innerHTML = "";
    
    const profs = JSON.parse(localStorage.getItem('listeProfs')) || [];
    profs.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${p.nom}</strong></td>
                <td>${p.matiere}</td>
                <td>${p.horaires}</td>
                <td>
                    <button onclick="supprimerProf(${p.id})" class="btn-delete">❌</button>
                </td>
            </tr>
        `;
    });
}

function supprimerProf(id) {
    showConfirmModal({ title: 'Supprimer professeur', bodyHtml: 'Supprimer ce professeur ?' }, () => {
        let profs = JSON.parse(localStorage.getItem('listeProfs')) || [];
        const current = profs.find(p => p.id === id);
        profs = profs.filter(p => p.id !== id);
        localStorage.setItem('listeProfs', JSON.stringify(profs));
        chargerProfs();
        updateStats();
        if(current) logActivity(`Professeur supprimé : ${current.nom}`, 'warning');
    });
}

// ==========================================
// 6. GESTION DES ABSENCES (COMPLET)
// ==========================================
function preparerAppel() {
    const container = document.getElementById('absenceClassContainer');
    if(!container) return;
    container.innerHTML = "";

    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    const classes = getStoredClasses();

    classes.forEach((cls, index) => {
        const inClass = eleves.filter(e => e.classe === cls);
        const collapseId = `abs-${index}`;
        const rows = inClass.map(el => `
            <tr>
                <td>${el.nom} ${el.prenom}</td>
                <td>${el.classe}</td>
                <td>
                    <input type="checkbox" checked class="presence-check" data-id="${el.id}">
                    <span style="font-size:0.8em; color:gray;">(Décocher si absent)</span>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="3" class="text-muted">Aucun élève</td></tr>`;

        container.innerHTML += `
            <div class="card mb-2">
                <button class="btn btn-light text-start" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                    ${cls} <span class="text-muted">(${inClass.length})</span>
                </button>
                <div id="${collapseId}" class="collapse">
                    <div class="table-responsive">
                        <table class="table table-striped mb-0">
                            <thead>
                                <tr>
                                    <th>Élève</th>
                                    <th>Classe</th>
                                    <th>Présence</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    });

    // Mettre la date d'aujourd'hui par défaut
    const dateInput = document.getElementById('date-appel');
    if(dateInput) dateInput.valueAsDate = new Date();
}

function enregistrerAppel() {
    const date = document.getElementById('date-appel').value;
    if(!date) { alert("Veuillez choisir une date."); return; }
    
    // On récupère ceux qui ne sont PAS cochés (donc absents)
    const absents = Array.from(document.querySelectorAll('.presence-check'))
                         .filter(checkbox => !checkbox.checked)
                         .map(checkbox => checkbox.dataset.id);
    
    let historique = JSON.parse(localStorage.getItem('historiqueAbsences')) || [];
    
    // On ajoute l'appel du jour
    historique.push({
        date: date,
        absents: absents
    });
    
    localStorage.setItem('historiqueAbsences', JSON.stringify(historique));
    alert("Appel enregistré avec succès !");
    logActivity(`Appel enregistré pour le ${date} (${absents.length} absent(s))`, 'info');
}

function voirHistorique() {
    const date = document.getElementById('date-historique').value;
    const historique = JSON.parse(localStorage.getItem('historiqueAbsences')) || [];
    const rapport = historique.find(h => h.date === date);
    const div = document.getElementById('resultat-historique');
    
    if(!rapport) { 
        div.innerHTML = "<p style='color:red;'>Aucun appel trouvé pour cette date.</p>"; 
        return; 
    }
    
    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    
    if(rapport.absents.length === 0) {
        div.innerHTML = "<p style='color:green;'>Aucun absent ce jour-là ! 🎉</p>";
    } else {
        let html = `<strong>${rapport.absents.length} Absent(s) :</strong><ul>`;
        rapport.absents.forEach(id => {
            const el = eleves.find(x => String(x.id) === String(id));
            html += `<li>${el ? el.nom + ' ' + el.prenom : 'Élève inconnu'}</li>`;
        });
        div.innerHTML = html + "</ul>";
    }
}

// ==========================================
// 7. GESTION DES NOTES (COMPLET)
// ==========================================
function remplirSelectEleves() {
    const sel = document.getElementById('select-eleve-note');
    const selClasse = document.getElementById('select-classe-note');
    if(!sel || !selClasse) return;

    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    const classes = getStoredClasses();

    // Remplir liste des classes
    selClasse.innerHTML = '<option value="">-- Sélectionnez une classe --</option>';
    classes.forEach(c => {
        selClasse.innerHTML += `<option value="${c}">${c}</option>`;
    });

    // Remplir élèves selon la classe sélectionnée
    const refreshEleves = () => {
        const cls = selClasse.value;
        sel.innerHTML = '<option value="">-- Sélectionnez un élève --</option>';
        const filtered = cls ? eleves.filter(e => e.classe === cls) : [];
        filtered.forEach(e => {
            sel.innerHTML += `<option value="${e.id}">${e.nom} ${e.prenom}</option>`;
        });
        // masquer bulletin si on change de classe
        const content = document.getElementById('bulletin-content');
        if(content) content.style.display = 'none';
    };

    selClasse.onchange = refreshEleves;
    refreshEleves();
}

function chargerBulletin() {
    const id = document.getElementById('select-eleve-note').value;
    const content = document.getElementById('bulletin-content');
    const tbody = document.getElementById('notesTableBody');
    
    if(!id) { 
        if(content) content.style.display = 'none'; 
        return; 
    }
    
    if(content) content.style.display = 'block';
    if(tbody) tbody.innerHTML = "";
    
    const notes = JSON.parse(localStorage.getItem('notesEleves')) || {};
    const notesEleve = notes[id] || {};

    const bulletins = JSON.parse(localStorage.getItem('bulletinsScolaires')) || {};
    const bulletinEleve = bulletins[id] || {};

    document.getElementById('avis-conseil').value = bulletinEleve.avisConseil || "";

    MATIERES_ECOLE.forEach(matiere => {
        const entry = notesEleve[matiere] || { devoir: "", compo: "", trimestre: "" };
        tbody.innerHTML += `
            <tr>
                <td><strong>${matiere}</strong></td>
                <td><input type="text" class="form-control input-note-devoir" data-mat="${matiere}" value="${entry.devoir || ''}" oninput="calculerMoyenneLive()" placeholder="ex: 12, 14"></td>
                <td><input type="text" class="form-control input-note-compo" data-mat="${matiere}" value="${entry.compo || ''}" oninput="calculerMoyenneLive()" placeholder="ex: 10, 13"></td>
                <td><input type="text" class="form-control input-note-trimestre" data-mat="${matiere}" value="${entry.trimestre || ''}" readonly></td>
                <td class="cell-moyenne" style="font-weight:bold; color:#2c3e50;">-</td>
            </tr>`;
    });
    calculerMoyenneLive();
}

function calculerMoyenneLive() {
    let total = 0, nbMatieres = 0;

    const wDevoir = parseFloat(document.getElementById('note-weight-devoir')?.value || '40');
    const wCompo = parseFloat(document.getElementById('note-weight-compo')?.value || '60');
    const sumW = (isNaN(wDevoir) ? 0 : wDevoir) + (isNaN(wCompo) ? 0 : wCompo);
    const coefDevoir = sumW > 0 ? (wDevoir / sumW) : 0;
    const coefCompo = sumW > 0 ? (wCompo / sumW) : 0;

    const parseList = (txt) => {
        return String(txt || '')
            .split(',')
            .map(n => parseFloat(String(n).replace(',', '.')))
            .filter(n => !isNaN(n));
    };

    document.querySelectorAll('#notesTableBody tr').forEach(row => {
        const inDevoir = row.querySelector('.input-note-devoir');
        const inCompo = row.querySelector('.input-note-compo');
        const inTrim = row.querySelector('.input-note-trimestre');
        const cellMoyenne = row.querySelector('.cell-moyenne');
        if(!inTrim || !cellMoyenne) return;

        const devoirs = parseList(inDevoir?.value);
        const compos = parseList(inCompo?.value);
        const avgDevoir = devoirs.length ? (devoirs.reduce((a,b)=>a+b,0)/devoirs.length) : null;
        const avgCompo = compos.length ? (compos.reduce((a,b)=>a+b,0)/compos.length) : null;

        let trimestre = null;
        if(avgDevoir !== null && avgCompo !== null) {
            trimestre = (avgDevoir * coefDevoir) + (avgCompo * coefCompo);
        } else if(avgDevoir !== null) {
            trimestre = avgDevoir;
        } else if(avgCompo !== null) {
            trimestre = avgCompo;
        }

        if(trimestre !== null && !isNaN(trimestre)) {
            inTrim.value = trimestre.toFixed(2);
            cellMoyenne.innerText = trimestre.toFixed(2) + "/20";
            total += trimestre;
            nbMatieres++;
        } else {
            inTrim.value = '';
            cellMoyenne.innerText = "-";
        }
    });

    const general = nbMatieres > 0 ? (total/nbMatieres).toFixed(2) : "-";
    document.getElementById('moyenne-generale').innerText = general + "/20";
}

function sauvegarderNotes() {
    const id = document.getElementById('select-eleve-note').value;
    if(!id) return;
    
    let notes = JSON.parse(localStorage.getItem('notesEleves')) || {};
    const notesEleve = {};

    document.querySelectorAll('#notesTableBody tr').forEach(row => {
        const mat = row.querySelector('.input-note-devoir')?.dataset.mat;
        if(!mat) return;
        notesEleve[mat] = {
            devoir: row.querySelector('.input-note-devoir')?.value || "",
            compo: row.querySelector('.input-note-compo')?.value || "",
            trimestre: row.querySelector('.input-note-trimestre')?.value || ""
        };
    });

    notes[id] = notesEleve;
    localStorage.setItem('notesEleves', JSON.stringify(notes));

    alert("Notes enregistrées avec succès !");
    logActivity('Notes enregistrées pour un élève', 'success');
}

function publierBulletin() {
    const id = document.getElementById('select-eleve-note').value;
    if(!id) return;

    const notes = JSON.parse(localStorage.getItem('notesEleves')) || {};
    const notesEleve = notes[id] || {};

    let bulletins = JSON.parse(localStorage.getItem('bulletinsScolaires')) || {};
    bulletins[id] = {
        ...notesEleve,
        avisConseil: document.getElementById('avis-conseil').value
    };

    localStorage.setItem('bulletinsScolaires', JSON.stringify(bulletins));
    alert("Bulletin publié avec succès !");
    logActivity('Bulletin publié pour un élève', 'success');
    updateStats();
}

function imprimerBulletin() {
    const id = document.getElementById('select-eleve-note').value;
    if(!id) { alert("Veuillez d'abord sélectionner un élève dans la liste."); return; }

    const el = JSON.parse(localStorage.getItem('listeEleves')).find(e => String(e.id) === String(id));
    const bulletins = JSON.parse(localStorage.getItem('bulletinsScolaires')) || {};
    const notes = bulletins[id] || {};
    const avis = document.getElementById('avis-conseil').value;

    let rows = "";
    let total = 0, nb = 0;
    MATIERES_ECOLE.forEach(m => {
        const entry = notes[m];
        const val = typeof entry === 'object' && entry !== null ? entry.trimestre : entry;
        const num = parseFloat(String(val).replace(',', '.'));
        if(!isNaN(num)) { total += num; nb++; }
        rows += `<tr>
            <td style="border:1px solid #000;padding:8px;">${m}</td>
            <td style="border:1px solid #000;padding:8px;text-align:center;">${val || '-'}</td>
        </tr>`;
    });

    const moyGen = nb > 0 ? (total/nb).toFixed(2) + "/20" : "-";

    const win = window.open('', '', 'height=800,width=700');
    win.document.write(`
        <html>
        <head>
            <title>Bulletin - ${el.nom}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1, h2 { text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #eee; border: 1px solid #000; padding: 10px; }
                td { border: 1px solid #000; padding: 10px; }
                .box { border: 1px solid #000; padding: 10px; margin-top: 20px; min-height: 50px;}
            </style>
        </head>
        <body>
            <h1>BULLETIN DE NOTES</h1>
            <hr>
            <p><strong>ÉLÈVE :</strong> ${el.nom} ${el.prenom}</p>
            <p><strong>CLASSE :</strong> ${el.classe} | <strong>ID :</strong> ${el.id}</p>
            
            <table>
                <thead>
                    <tr><th>MATIÈRE</th><th>NOTE /20</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            
            <h2 style="text-align:right; margin-top: 20px;">MOYENNE GÉNÉRALE : ${moyGen}</h2>
            
            <div class="box">
                <strong>Appréciation / Avis du conseil :</strong><br>
                ${avis || "Aucune observation enregistrée."}
            </div>
            
            <br><br><br>
            <p style="text-align:center;">Cachet de l'établissement</p>
        </body>
        </html>
    `);
    win.document.close();
    setTimeout(() => {
        win.focus();
        win.print();
        win.close();
    }, 500);
}

// ==========================================
// 8. GESTION FINANCIÈRE & VALIDATION (COMPLET)
// ==========================================

// --- PARTIE PARENT : ENVOYER LE PAIEMENT ---
function effectuerPaiementParent(e) {
    e.preventDefault();
    const session = JSON.parse(localStorage.getItem('sessionUser'));
    
    // Sécurité
    if(!session || !session.studentId) {
        alert("Erreur de session. Veuillez vous reconnecter.");
        return;
    }

    const typeP = document.getElementById('pay-type').value;
    const nomPayeur = document.getElementById('pay-nom').value;
    const telPayeur = document.getElementById('pay-tel').value;

    const nouveauPaiement = {
        id: Date.now(), // ID unique
        eleveId: session.studentId, // ID de l'élève connecté
        payeur: nomPayeur,
        contact: telPayeur,
        type: typeP,
        montant: TARIFS[typeP],
        date: new Date().toLocaleDateString('fr-FR'),
        statut: "En attente" // Statut par défaut
    };

    let historique = JSON.parse(localStorage.getItem('historiquePaiements')) || [];
    historique.push(nouveauPaiement);
    localStorage.setItem('historiquePaiements', JSON.stringify(historique));

    alert("Paiement envoyé ! Il est en attente de validation par l'administration.");
    document.getElementById('paymentForm').reset();
    chargerHistoriqueParent(session.studentId);
    logActivity(`Nouveau paiement en attente : ${typeP} (${TARIFS[typeP]} FCFA)`, 'warning');
}

// --- PARTIE ADMIN : VOIR ET VALIDER ---
function chargerFinancesAdmin() {
    // =========================================================
    // ZONE A AJOUTER : CACHER LA SECTION PAIEMENT
    // =========================================================
    const formulaire = document.getElementById('paymentForm');
    
    if (formulaire) {
        // 1. Cacher le formulaire lui-même
        formulaire.style.display = 'none';

        // 2. Cacher le titre "Régler la scolarité" et les tarifs à côté
        // On remonte pour trouver le conteneur parent (la ligne ou la "card")
        // et on le cache entièrement pour être sûr que tout disparait.
        let parent = formulaire.parentElement;
        if (parent) {
            parent.style.display = 'none';
            
            // Sécurité supplémentaire : si le titre est au-dessus du parent
            if (parent.previousElementSibling && parent.previousElementSibling.tagName.includes('H')) {
                parent.previousElementSibling.style.display = 'none';
            }
        }
    }
    // =========================================================
    // FIN DE LA ZONE A AJOUTER
    // =========================================================
    const tbody = document.getElementById('financeTableBody');
    if(!tbody) return;

    const paiements = JSON.parse(localStorage.getItem('historiquePaiements')) || [];
    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    
    tbody.innerHTML = ""; 

    // Trier pour afficher les plus récents en premier
    let paiementsTries = paiements.slice().reverse();

    // Appliquer filtres si présents
    const searchInput = document.getElementById('finance-search');
    const filterSelect = document.getElementById('finance-filter');
    const searchTerm = (searchInput?.value || '').toLowerCase();
    const statusFilter = filterSelect?.value || '';

    if(searchTerm || statusFilter) {
        paiementsTries = paiementsTries.filter(p => {
            if(statusFilter && p.statut !== statusFilter) return false;
            const el = eleves.find(e => String(e.id) === String(p.eleveId));
            const nomEleve = el ? `${el.nom} ${el.prenom}` : '';
            const hay = `${p.date} ${p.payeur} ${p.type} ${p.montant} ${p.statut} ${nomEleve}`.toLowerCase();
            return hay.includes(searchTerm);
        });
    }

    // pagination state
    financeState.lastFiltered = paiementsTries.slice();
    const total = financeState.lastFiltered.length;
    const pageSize = financeState.pageSize;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if(financeState.page > totalPages) financeState.page = totalPages;
    const startIdx = (financeState.page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageItems = financeState.lastFiltered.slice(startIdx, endIdx);

    pageItems.forEach(p => {
        // Retrouver l'élève
        const el = eleves.find(e => String(e.id) === String(p.eleveId));
        const nomEleve = el ? `${el.nom} ${el.prenom}` : "Élève inconnu";
        const classe = el ? el.classe : "-";

        // Configuration de l'affichage selon le statut
        let badgeStatut = "";
        let action = "";

        if (p.statut === "Validé") {
            badgeStatut = `<span class="badge text-bg-success">✅ Validé</span>`;
            action = `<button onclick="imprimerRecuUnique(${p.id})" class="btn btn-sm btn-info text-white">🖨️ Reçu</button>`;
        } else {
            badgeStatut = `<span class="badge text-bg-warning">⏳ En attente</span>`;
            action = `<button onclick="validerPaiement(${p.id})" class="btn btn-sm btn-success">Valider</button>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.date}</td>
            <td><strong>${nomEleve}</strong><br><small style="color:gray;">${classe}</small></td>
            <td>${p.payeur}<br><small>${p.contact}</small></td>
            <td>${p.type}</td>
            <td style="font-weight:bold;">${p.montant.toLocaleString()} F</td>
            <td>${badgeStatut}</td>
            <td>${action}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Met à jour le total en haut de page
    updateStats();

    // pagination controls
    const info = document.getElementById('finance-pagination-info');
    if(info) info.innerText = `Page ${financeState.page} / ${totalPages} — ${total} résultat(s)`;
    const prev = document.getElementById('finance-prev');
    const next = document.getElementById('finance-next');
    if(prev) prev.disabled = financeState.page <= 1;
    if(next) next.disabled = financeState.page >= totalPages;
    // Ajoute ceci à la fin de la fonction chargerFinancesAdmin
if(currentUserRole === 'admin') {
    const paySection = document.getElementById('paymentForm');
    if(paySection) {
        paySection.style.display = 'none';
        // Cache aussi le titre juste au-dessus
        if(paySection.previousElementSibling) paySection.previousElementSibling.style.display = 'none';
    }
}

}

function validerPaiement(idPaiement) {
    showConfirmModal({ title: 'Valider paiement', bodyHtml: "Confirmer la réception de l'argent et valider ce paiement ?" }, () => {
        let paiements = JSON.parse(localStorage.getItem('historiquePaiements')) || [];

        // On cherche le paiement et on change son statut
        paiements = paiements.map(p => {
            if (p.id === idPaiement) {
                return { ...p, statut: "Validé" };
            }
            return p;
        });

        localStorage.setItem('historiquePaiements', JSON.stringify(paiements));

        // On rafraîchit l'affichage
        chargerFinancesAdmin();
    });
}

function imprimerRecuUnique(id) {
    const paiements = JSON.parse(localStorage.getItem('historiquePaiements')) || [];
    const p = paiements.find(x => x.id === id);
    if(!p) return;

    const win = window.open('', '', 'height=600,width=500');
    win.document.write(`
        <html>
        <body style="font-family:monospace; padding:30px; border:2px solid #333; margin:20px;">
            <h2 style="text-align:center;">REÇU DE PAIEMENT</h2>
            <hr>
            <p><strong>Date :</strong> ${p.date}</p>
            <p><strong>Payeur :</strong> ${p.payeur}</p>
            <p><strong>Type :</strong> ${p.type}</p>
            <p><strong>Montant :</strong> ${p.montant} FCFA</p>
            <p><strong>Statut :</strong> VALIDÉ</p>
            <p><strong>ID Transaction :</strong> ${p.id}</p>
            <hr>
            <p style="text-align:center;">Merci de votre confiance.</p>
        </body>
        </html>
    `);
    win.document.close();
    win.print();
}

// ==========================================
// 9. VUE PARENT (COMPLET)
// ==========================================
function chargerVueParent(id) {
    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    const el = eleves.find(e => String(e.id) === String(id));
    
    if(!el) return;

    // 1. Mise à jour de l'en-tête
    const parentName = document.getElementById('parent-student-name');
    if(parentName) {
        parentName.innerText = `${el.prenom} ${el.nom} · ${el.classe} · ID ${el.id}`;
    }
    
    // 2. Absences Parent
    const histAbs = JSON.parse(localStorage.getItem('historiqueAbsences')) || [];
    const nbAbs = histAbs.filter(h => h.absents.includes(String(id))).length;
    if(document.getElementById('parent-absences')) {
        document.getElementById('parent-absences').innerText = nbAbs;
    }
    const summaryAbs = document.getElementById('parent-summary-absences');
    if(summaryAbs) summaryAbs.innerText = nbAbs;

    // 3. Notes Parent
    const bulletins = JSON.parse(localStorage.getItem('bulletinsScolaires')) || {};
    const notes = bulletins[id] || {};
    const tbody = document.getElementById('parent-notes-body');
    
    if(tbody) {
        tbody.innerHTML = "";
        let totalMoy = 0, nbMat = 0;
        
        MATIERES_ECOLE.forEach(m => {
            const entry = notes[m] || "-";
            const val = typeof entry === 'object' && entry !== null ? (entry.trimestre || "-") : entry;
            let moyAff = "-";
            const num = parseFloat(String(val).replace(',', '.'));
            if(!isNaN(num)) {
                moyAff = num.toFixed(2);
                totalMoy += num;
                nbMat++;
            }
            tbody.innerHTML += `<tr><td>${m}</td><td>${val}</td><td><b>${moyAff !== "-" ? moyAff+"/20" : "-"}</b></td></tr>`;
        });
        
        const moyGen = nbMat > 0 ? (totalMoy/nbMat).toFixed(2) + "/20" : "-";
        if(document.getElementById('parent-moyenne')) document.getElementById('parent-moyenne').innerText = moyGen;
        const summaryAvg = document.getElementById('parent-summary-average');
        if(summaryAvg) summaryAvg.innerText = moyGen;
    }
    
    if(document.querySelector('#parent-appreciations span')) {
        document.querySelector('#parent-appreciations span').innerText = notes.avisConseil || "Aucune observation.";
    }

    chargerHistoriqueParent(id);
}

function chargerHistoriqueParent(id) {
    const list = document.getElementById('parent-payment-history');
    if(!list) return;

    const allPaiements = JSON.parse(localStorage.getItem('historiquePaiements')) || [];
    const mesPaiements = allPaiements.filter(p => String(p.eleveId) === String(id));

    list.innerHTML = "";
    
    if(mesPaiements.length === 0) {
        list.innerHTML = "<li class='payment-empty'>Aucun paiement enregistré pour le moment.</li>";
        return;
    }

    mesPaiements.slice().reverse().forEach(p => {
        const statusClass = p.statut === "Validé" ? "status-valid" : "status-pending";
        const receiptBtn = p.statut === "Validé" ? `<button class="btn btn-sm btn-outline-primary" onclick="imprimerRecuUnique(${p.id})">Télécharger reçu</button>` : "";
        list.innerHTML += `
            <li class="payment-item">
                <div>
                    <div class="payment-title">${p.type}</div>
                    <div class="payment-meta">${p.montant.toLocaleString()} FCFA · Payé par ${p.payeur}</div>
                    <div class="payment-date">${p.date}</div>
                </div>
                <div class="payment-actions">
                    <div class="payment-status ${statusClass}">${p.statut}</div>
                    ${receiptBtn}
                </div>
            </li>
        `;
    });
}

// ==========================================
// 10. PARAMÈTRES ET OUTILS
// ==========================================
function imprimerCodesAcces() {
    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    let html = `
        <h1 style="text-align:center;">CODES D'ACCÈS PARENTS</h1>
        <div style='display:flex; flex-wrap:wrap; justify-content:center;'>
    `;
    
    eleves.forEach(e => {
        html += `
            <div style='border:1px solid #333; margin:10px; padding:20px; width:250px; text-align:center; border-radius:8px;'>
                <h3 style="margin:0;">${e.nom} ${e.prenom}</h3>
                <p>Classe : ${e.classe}</p>
                <hr>
                <p>Identifiant de connexion :</p>
                <strong style='color:#2980b9; font-size:1.5em; font-family:monospace;'>${e.id}</strong>
            </div>
        `;
    });
    
    html += "</div>";
    
    const win = window.open();
    win.document.write(html);
    win.print();
}

function exporterDonnees() {
    const data = JSON.stringify(localStorage);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = "sauvegarde_ecole_" + new Date().toISOString().slice(0,10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    logActivity('Sauvegarde manuelle exportée', 'info');
}

function reinitialiserTout() {
    const code = prompt("Pour TOUT effacer, tapez 'SUPPRIMER' :");
    if(code === "SUPPRIMER") {
        localStorage.clear();
        alert("Données effacées. L'application va redémarrer.");
        logActivity('Réinitialisation complète effectuée', 'danger');
        location.reload();
    }
}

// Outils : dérouler / replier et migration des classes
function expandAll() {
    document.querySelectorAll('.accordion-content').forEach(c => {
        c.style.display = 'block';
        if(c.previousElementSibling) c.previousElementSibling.classList.add('open');
    });
}

function collapseAll() {
    document.querySelectorAll('.accordion-content').forEach(c => {
        c.style.display = 'none';
        if(c.previousElementSibling) c.previousElementSibling.classList.remove('open');
    });
}

function determineClass(orig) {
    if(!orig) return 'Autres';
    const stored = getStoredClasses();
    if(stored.includes(orig)) return orig;
    // Try to find a number (1-9) in the string
    const m = String(orig).match(/([1-9])/);
    if(m) {
        const idx = parseInt(m[1], 10) - 1;
        if(stored[idx]) return stored[idx];
    }
    // fallback
    return 'Autres';
}

function migrateClasses() {
    showConfirmModal({ title: 'Migrer les classes', bodyHtml: 'Voulez-vous migrer les classes existantes vers le format standard (1ère→9ème) ?' }, () => {
    let eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    const changes = [];
    eleves = eleves.map(e => {
        const from = e.classe || '';
        const to = determineClass(from);
        if(from !== to) {
            changes.push({ id: e.id, nom: e.nom + ' ' + e.prenom, from, to });
            return { ...e, classe: to };
        }
        return e;
    });
    localStorage.setItem('listeEleves', JSON.stringify(eleves));
    chargerEleves();
    updateStats();

    const resultEl = document.getElementById('student-migrate-result');
    if(resultEl) {
        resultEl.innerText = `${changes.length} élève(s) migré(s)`;
        setTimeout(() => { resultEl.innerText = ''; }, 6000);
    }

    if(changes.length > 0) {
        const sample = changes.slice(0,5).map(c => `${c.nom}: ${c.from} → ${c.to}`).join('\n');
        alert(`${changes.length} élève(s) migré(s)\nExemples:\n${sample}`);
    } else {
        alert('Aucune migration nécessaire.');
    }
    });
}

// ==========================================
// Pages : Classes & Matières
// ==========================================

function loadClassesPage() {
    const listEl = document.getElementById('classesList');
    const form = document.getElementById('addClassForm');
    const input = document.getElementById('classNameInput');
    const msg = document.getElementById('classes-msg');
    if(msg) msg.innerText = '';

    let editingIndex = null;

    function render() {
        const arr = getStoredClasses();
        if(!listEl) return;
        listEl.innerHTML = '';
        arr.forEach((c, i) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'space-between';
            div.style.padding = '8px';
            div.style.borderBottom = '1px solid #f0f0f0';
            div.innerHTML = `<span class="fw-semibold" style="cursor:pointer;">${c}</span>`;
            const controls = document.createElement('span');
            controls.innerHTML = `<button class="btn-edit">✏️</button> <button class="btn-delete">❌</button>`;
            div.appendChild(controls);
            listEl.appendChild(div);

            // click on class name to display students list
            div.firstChild.onclick = () => {
                classStudentState.selected = c;
                classStudentState.page = 1;
                renderClassStudents();
            };

            controls.children[0].onclick = () => {
                input.value = c; editingIndex = i; form.querySelector('button').innerText = 'Mettre à jour';
            };
            controls.children[1].onclick = () => {
                showConfirmModal({ title: 'Supprimer la classe', bodyHtml: 'Supprimer la classe "' + c + '" ?' }, () => {
                    // snapshot before change
                    const current = getStoredClasses();
                    pushSnapshot('listeClasses', current);
                    const newArr = getStoredClasses().filter((_, idx) => idx !== i);
                    localStorage.setItem('listeClasses', JSON.stringify(newArr));
                    render(); chargerEleves();
                    renderSnapshots('listeClasses','classesSnapshots', restoreClassesSnapshot);
                    if(classStudentState.selected === c) {
                        classStudentState.selected = null;
                        renderClassStudents();
                    }
                });
            };
        });
    }

    const resetBtn = document.getElementById('resetClassesBtn');
    if(resetBtn) resetBtn.onclick = resetClassesDefaults;

    if(form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const name = input.value.trim();
            if(!name) return;
            let arr = getStoredClasses();
            if(editingIndex === null) {
                if(arr.includes(name)) { if(msg) { msg.style.color='red'; msg.innerText='Cette classe existe déjà.'; setTimeout(()=>msg.innerText='',3000);} return; }
                arr.push(name);
            } else {
                // update
                if(arr.includes(name) && arr[editingIndex] !== name) { if(msg) { msg.style.color='red'; msg.innerText='Cette classe existe déjà.'; setTimeout(()=>msg.innerText='',3000);} return; }
                arr[editingIndex] = name;
                editingIndex = null;
                form.querySelector('button').innerText = 'Ajouter';
            }
            localStorage.setItem('listeClasses', JSON.stringify(arr));
            input.value = '';
            if(msg) { msg.style.color='green'; msg.innerText='Modifications enregistrées.'; setTimeout(()=>msg.innerText='',3000); }
            render(); chargerEleves();
        };
    }

    render();
    renderClassStudents();
    // Render snapshots history for classes
    renderSnapshots('listeClasses','classesSnapshots', restoreClassesSnapshot);
}

function renderClassStudents() {
    const tbody = document.getElementById('class-student-body');
    const title = document.getElementById('selected-class-name');
    const info = document.getElementById('class-student-info');
    const prev = document.getElementById('class-student-prev');
    const next = document.getElementById('class-student-next');
    if(!tbody || !title) return;

    const eleves = JSON.parse(localStorage.getItem('listeEleves')) || [];
    const cls = classStudentState.selected;

    if(!cls) {
        title.innerText = '—';
        tbody.innerHTML = '<tr><td colspan="2" class="text-muted">Sélectionnez une classe pour voir les élèves.</td></tr>';
        if(info) info.innerText = '';
        if(prev) prev.disabled = true;
        if(next) next.disabled = true;
        return;
    }

    title.innerText = cls;
    const filtered = eleves.filter(e => e.classe === cls);
    classStudentState.filtered = filtered;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / classStudentState.pageSize));
    if(classStudentState.page > totalPages) classStudentState.page = totalPages;
    const startIdx = (classStudentState.page - 1) * classStudentState.pageSize;
    const pageItems = filtered.slice(startIdx, startIdx + classStudentState.pageSize);

    tbody.innerHTML = pageItems.length ? '' : '<tr><td colspan="2" class="text-muted">Aucun élève inscrit.</td></tr>';
    pageItems.forEach(el => {
        tbody.innerHTML += `
            <tr>
                <td>
                    <img src="${el.photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;">${el.nom} ${el.prenom}
                </td>
                <td>${el.id}</td>
            </tr>
        `;
    });

    if(info) info.innerText = `Page ${classStudentState.page} / ${totalPages} — ${total} élève(s)`;
    if(prev) prev.disabled = classStudentState.page <= 1;
    if(next) next.disabled = classStudentState.page >= totalPages;
}

function loadMatieresPage() {
    const listEl = document.getElementById('matieresList');
    const form = document.getElementById('addMatiereForm');
    const input = document.getElementById('matiereInput');
    const msg = document.getElementById('matieres-msg');
    if(msg) msg.innerText = '';

    let editingIndex = null;

    function render() {
        const arr = getStoredMatieres();
        if(!listEl) return;
        listEl.innerHTML = '';
        arr.forEach((c, i) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'space-between';
            div.style.padding = '8px';
            div.style.borderBottom = '1px solid #f0f0f0';
            div.innerHTML = `<span>${c}</span>`;
            const controls = document.createElement('span');
            controls.innerHTML = `<button class="btn-edit">✏️</button> <button class="btn-delete">❌</button>`;
            div.appendChild(controls);
            listEl.appendChild(div);

            controls.children[0].onclick = () => {
                input.value = c; editingIndex = i; form.querySelector('button').innerText = 'Mettre à jour';
            };
            controls.children[1].onclick = () => {
                showConfirmModal({ title: 'Supprimer la matière', bodyHtml: 'Supprimer la matière "' + c + '" ?' }, () => {
                    const current = getStoredMatieres();
                    pushSnapshot('listeMatieres', current);
                    const newArr = getStoredMatieres().filter((_, idx) => idx !== i);
                    localStorage.setItem('listeMatieres', JSON.stringify(newArr));
                    render();
                    renderSnapshots('listeMatieres','matieresSnapshots', restoreMatieresSnapshot);
                });
            };
        });
    }

    const resetBtn = document.getElementById('resetMatieresBtn');
    if(resetBtn) resetBtn.onclick = resetMatieresDefaults;

    if(form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const name = input.value.trim();
            if(!name) return;
            let arr = getStoredMatieres();
            if(editingIndex === null) {
                if(arr.includes(name)) { if(msg) { msg.style.color='red'; msg.innerText='Cette matière existe déjà.'; setTimeout(()=>msg.innerText='',3000);} return; }
                arr.push(name);
            } else {
                if(arr.includes(name) && arr[editingIndex] !== name) { if(msg) { msg.style.color='red'; msg.innerText='Cette matière existe déjà.'; setTimeout(()=>msg.innerText='',3000);} return; }
                arr[editingIndex] = name;
                editingIndex = null;
                form.querySelector('button').innerText = 'Ajouter';
            }
            localStorage.setItem('listeMatieres', JSON.stringify(arr));
            input.value = '';
            if(msg) { msg.style.color='green'; msg.innerText='Modifications enregistrées.'; setTimeout(()=>msg.innerText='',3000); }
            render();
        };
    }

    render();
    // Render snapshots history for matieres
    renderSnapshots('listeMatieres','matieresSnapshots', restoreMatieresSnapshot);
}

function resetClassesDefaults() {
    // Préparer un aperçu des changements entre la liste actuelle et la valeur par défaut
    const current = JSON.parse(localStorage.getItem('listeClasses')) || getStoredClasses();
    const defaults = CLASSES.slice();
    const toAdd = defaults.filter(d => !current.includes(d));
    const toRemove = current.filter(c => !defaults.includes(c));

    const body = document.getElementById('reset-confirm-body');
    if(body) {
        body.innerHTML = `<p>La réinitialisation remplacera la liste actuelle par la liste par défaut.</p>
            <p><strong>Ajouts (${toAdd.length}):</strong> ${toAdd.join(', ') || '—'}</p>
            <p><strong>Suppressions (${toRemove.length}):</strong> ${toRemove.join(', ') || '—'}</p>`;
        showResetModal(() => {
            // Save snapshot for undo and to history
            localStorage.setItem('backup_listeClasses', JSON.stringify(current));
            pushSnapshot('listeClasses', current);
            localStorage.setItem('listeClasses', JSON.stringify(defaults));
            // re-render page and lists
            if(typeof loadClassesPage === 'function') loadClassesPage();
            chargerEleves();
            const result = document.getElementById('classes-msg');
            if(result) { result.style.color='green'; result.innerText='Classes réinitialisées.'; setTimeout(()=>result.innerText='',4000); }
            const undoBtn = document.getElementById('undoResetClassesBtn');
            if(undoBtn) { undoBtn.style.display = 'inline-block'; undoBtn.onclick = undoResetClasses; }
            renderSnapshots('listeClasses','classesSnapshots', restoreClassesSnapshot);
        });
    } else {
        // fallback
        showConfirmModal({ title: 'Confirmer la réinitialisation', bodyHtml: 'Remettre les classes par défaut (1ère→9ème) ?' }, () => {
            localStorage.setItem('backup_listeClasses', JSON.stringify(current));
            pushSnapshot('listeClasses', current);
            localStorage.setItem('listeClasses', JSON.stringify(defaults));
            if(typeof loadClassesPage === 'function') loadClassesPage();
            chargerEleves();
            renderSnapshots('listeClasses','classesSnapshots', restoreClassesSnapshot);
        });
    }
}

function resetMatieresDefaults() {
    // Préparer un aperçu des changements entre la liste actuelle et la valeur par défaut
    const current = JSON.parse(localStorage.getItem('listeMatieres')) || getStoredMatieres();
    const defaults = MATIERES_ECOLE.slice();
    const toAdd = defaults.filter(d => !current.includes(d));
    const toRemove = current.filter(c => !defaults.includes(c));

    const body = document.getElementById('reset-confirm-body');
    if(body) {
        body.innerHTML = `<p>La réinitialisation remplacera la liste actuelle par la liste par défaut.</p>
            <p><strong>Ajouts (${toAdd.length}):</strong> ${toAdd.join(', ') || '—'}</p>
            <p><strong>Suppressions (${toRemove.length}):</strong> ${toRemove.join(', ') || '—'}</p>`;
        showResetModal(() => {
            // Save snapshot for undo and history
            localStorage.setItem('backup_listeMatieres', JSON.stringify(current));
            pushSnapshot('listeMatieres', current);
            localStorage.setItem('listeMatieres', JSON.stringify(defaults));
            if(typeof loadMatieresPage === 'function') loadMatieresPage();
            const result = document.getElementById('matieres-msg');
            if(result) { result.style.color='green'; result.innerText='Matières réinitialisées.'; setTimeout(()=>result.innerText='',4000); }
            const undoBtn = document.getElementById('undoResetMatieresBtn');
            if(undoBtn) { undoBtn.style.display = 'inline-block'; undoBtn.onclick = undoResetMatieres; }
            renderSnapshots('listeMatieres','matieresSnapshots', restoreMatieresSnapshot);
        });
    } else {
        showConfirmModal({ title: 'Confirmer la réinitialisation', bodyHtml: 'Remettre les matières par défaut ?' }, () => {
            localStorage.setItem('backup_listeMatieres', JSON.stringify(current));
            pushSnapshot('listeMatieres', current);
            localStorage.setItem('listeMatieres', JSON.stringify(defaults));
            if(typeof loadMatieresPage === 'function') loadMatieresPage();
            renderSnapshots('listeMatieres','matieresSnapshots', restoreMatieresSnapshot);
        });
    }
}

function undoResetClasses() {
    const backup = JSON.parse(localStorage.getItem('backup_listeClasses'));
    if(!backup) { alert('Aucun backup trouvé.'); return; }
    localStorage.setItem('listeClasses', JSON.stringify(backup));
    localStorage.removeItem('backup_listeClasses');
    if(typeof loadClassesPage === 'function') loadClassesPage();
    chargerEleves();
    const undoBtn = document.getElementById('undoResetClassesBtn');
    if(undoBtn) undoBtn.style.display = 'none';
    const result = document.getElementById('classes-msg');
    if(result) { result.style.color='green'; result.innerText='Réinitialisation annulée.'; setTimeout(()=>result.innerText='',4000); }
}

function undoResetMatieres() {
    const backup = JSON.parse(localStorage.getItem('backup_listeMatieres'));
    if(!backup) { alert('Aucun backup trouvé.'); return; }
    localStorage.setItem('listeMatieres', JSON.stringify(backup));
    localStorage.removeItem('backup_listeMatieres');
    if(typeof loadMatieresPage === 'function') loadMatieresPage();
    const undoBtn = document.getElementById('undoResetMatieresBtn');
    if(undoBtn) undoBtn.style.display = 'none';
    const result = document.getElementById('matieres-msg');
    if(result) { result.style.color='green'; result.innerText='Réinitialisation annulée.'; setTimeout(()=>result.innerText='',4000); }
}

function restoreClassesSnapshot(data) {
    localStorage.setItem('listeClasses', JSON.stringify(data));
    if(typeof loadClassesPage === 'function') loadClassesPage();
    chargerEleves();
    renderSnapshots('listeClasses','classesSnapshots', restoreClassesSnapshot);
}

function restoreMatieresSnapshot(data) {
    localStorage.setItem('listeMatieres', JSON.stringify(data));
    if(typeof loadMatieresPage === 'function') loadMatieresPage();
    renderSnapshots('listeMatieres','matieresSnapshots', restoreMatieresSnapshot);
}

// Modal helper
function showResetModal(onConfirm) {
    // Utilise le modal global pour uniformiser l'UX
    const bodyHtml = document.getElementById('reset-confirm-body')?.innerHTML || '';
    showConfirmModal({ title: 'Confirmer la réinitialisation', bodyHtml }, onConfirm);
}

// Create or return a global modal element used for confirmations
function getOrCreateGlobalModal() {
    let modal = document.getElementById('global-confirm-modal');
    if(modal) return modal;
    // fallback si le HTML n'existe pas
    modal = document.createElement('div');
    modal.id = 'global-confirm-modal';
    modal.className = 'reset-modal';
    modal.innerHTML = `
        <div class="modal-box">
            <h3 id="global-confirm-title">Confirmer</h3>
            <div id="global-confirm-body" class="modal-body"></div>
            <div class="modal-actions">
                <button id="global-confirm-cancel" class="btn-edit">Annuler</button>
                <button id="global-confirm-ok" class="btn-add">Confirmer</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

function showConfirmModal(options, onConfirm) {
    // options: {title, bodyHtml, okText, cancelText}
    const modal = getOrCreateGlobalModal();
    const titleEl = modal.querySelector('#global-confirm-title');
    const bodyEl = modal.querySelector('#global-confirm-body');
    const ok = modal.querySelector('#global-confirm-ok');
    const cancel = modal.querySelector('#global-confirm-cancel');
    titleEl.innerText = options.title || 'Confirmer';
    bodyEl.innerHTML = options.bodyHtml || '';
    ok.innerText = options.okText || 'Confirmer';
    cancel.innerText = options.cancelText || 'Annuler';
    modal.style.display = 'flex';

    function cleanup() {
        modal.style.display = 'none';
        ok.onclick = null; cancel.onclick = null;
    }

    ok.onclick = () => { cleanup(); if(onConfirm) onConfirm(); };
    cancel.onclick = () => { cleanup(); };
}

// Snapshot utilities (limits)
const SNAPSHOT_MAX = 10;
const SNAPSHOT_MAX_CHARS = 20000; // limite la taille du JSON stocké

function normalizeSnapshotData(data) {
    // Si trop volumineux, on réduit (surtout pour grandes listes)
    try {
        const json = JSON.stringify(data);
        if(json.length <= SNAPSHOT_MAX_CHARS) return { data, truncated: false };
    } catch(e) {
        return { data: [], truncated: true };
    }

    // Réduction simple si tableau
    if(Array.isArray(data)) {
        const reduced = data.slice(0, 200);
        return { data: reduced, truncated: true };
    }
    return { data, truncated: true };
}

function pushSnapshot(name, data) {
    const key = 'snapshots_' + name;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    const normalized = normalizeSnapshotData(data);
    arr.unshift({ ts: Date.now(), data: normalized.data, truncated: normalized.truncated });
    if(arr.length > SNAPSHOT_MAX) arr.pop();
    localStorage.setItem(key, JSON.stringify(arr));
}

function formatTs(ts) {
    const d = new Date(ts);
    return d.toLocaleString('fr-FR');
}

function renderSnapshots(name, containerId, restoreFn) {
    const key = 'snapshots_' + name;
    const container = document.getElementById(containerId);
    if(!container) return;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    if(arr.length === 0) { container.innerHTML = '<p style="color:gray;">Aucun snapshot.</p>'; return; }
    container.innerHTML = '';
    arr.forEach((s, idx) => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.padding = '8px';
        div.style.borderBottom = '1px solid #f0f0f0';
        const truncInfo = s.truncated ? ' <span style="color:#c0392b; font-size:0.85em;">(réduit)</span>' : '';
        div.innerHTML = `<div style="font-size:0.95em;">${formatTs(s.ts)}${truncInfo}</div>`;
        const controls = document.createElement('div');
        controls.innerHTML = `<button class="btn-edit">Restaurer</button> <button class="btn-add">Exporter</button> <button class="btn-delete">Supprimer</button>`;
        div.appendChild(controls);
        container.appendChild(div);

        controls.children[0].onclick = () => {
            showConfirmModal({ title: 'Restaurer snapshot', bodyHtml: 'Restaurer ce snapshot créé le ' + formatTs(s.ts) + ' ?' }, () => {
                restoreFn(s.data);
                // after restore, optionally remove this snapshot
            });
        };

        controls.children[1].onclick = () => {
            exportSnapshot(name, s);
        };

        controls.children[2].onclick = () => {
            showConfirmModal({ title: 'Supprimer snapshot', bodyHtml: 'Supprimer ce snapshot créé le ' + formatTs(s.ts) + ' ?' }, () => {
                arr.splice(idx,1);
                localStorage.setItem(key, JSON.stringify(arr));
                renderSnapshots(name, containerId, restoreFn);
            });
        };
    });
}

function exportSnapshot(name, snapshot) {
    const payload = {
        type: name,
        ts: snapshot.ts,
        truncated: !!snapshot.truncated,
        data: snapshot.data
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_snapshot_${new Date(snapshot.ts).toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
