/* =========================================================================
   LIV'GUINAR+ — ADMIN DASHBOARD JS
   ========================================================================= */

// ── ÉTAT ──────────────────────────────────────────────────────────────────
let currentPage = 'dashboard';
let livreursList = [];

// ── INIT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Vérifier session admin
    const res  = await fetch('/api/auth/me');
    const data = await res.json();
    if (!data.logged_in || data.user.role !== 'admin') {
        window.location.href = '/admin';
        return;
    }

    // Afficher infos admin
    document.getElementById('adminName').textContent = data.user.nom;
    document.getElementById('adminInitials').textContent =
        data.user.nom.substring(0, 2).toUpperCase();

    // Date
    document.getElementById('headerDate').textContent =
        new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            showPage(item.dataset.page);
        });
    });

    // Toggle sidebar mobile
    document.getElementById('btnToggleSidebar').addEventListener('click', () => {
        document.getElementById('adminSidebar').classList.toggle('open');
    });

    // Charger le dashboard
    showPage('dashboard');
});

// ── NAVIGATION ────────────────────────────────────────────────────────────
function showPage(page) {
    currentPage = page;
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

    const titles = {
        dashboard: 'Tableau de bord', commandes: 'Commandes',
        produits: 'Produits', clients: 'Clients',
        livreurs: 'Livreurs', statistiques: 'Statistiques'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;

    // Fermer sidebar sur mobile
    document.getElementById('adminSidebar').classList.remove('open');

    // Charger les données
    switch(page) {
        case 'dashboard':    loadDashboard();     break;
        case 'commandes':    loadCommandes();     break;
        case 'produits':     loadProduits();      break;
        case 'clients':      loadClients();       break;
        case 'livreurs':     loadLivreurs();      break;
        case 'statistiques': loadStatistiques();  break;
    }
}

// ── TOAST ─────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${type === 'error' ? 'error' : ''} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── FORMAT ─────────────────────────────────────────────────────────────────
function formatPrix(val) {
    return Number(val).toLocaleString('fr-FR') + ' FCFA';
}
function badgeStatut(statut) {
    const labels = {
        en_attente: 'En attente', preparee: 'Préparée',
        en_cours: 'En cours', livree: 'Livrée'
    };
    return `<span class="badge-statut badge-${statut}">${labels[statut] || statut}</span>`;
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
async function loadDashboard() {
    try {
        const res  = await fetch('/api/admin/stats');
        const data = await res.json();
        if (!data.success) return;

        document.getElementById('statCommandesJour').textContent = data.stats.commandes_jour;
        document.getElementById('statCA').textContent = formatPrix(data.stats.ca_mois);
        document.getElementById('statClients').textContent = data.stats.nb_clients;
        document.getElementById('statStocksBas').textContent = data.stats.stocks_bas;
        document.getElementById('badgeCommandes').textContent = data.stats.commandes_en_attente;

        // Dernières commandes
        const tbody = document.getElementById('tbodyRecentCommandes');
        if (!data.dernieres_commandes.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Aucune commande</td></tr>';
        } else {
            tbody.innerHTML = data.dernieres_commandes.map(c => `
                <tr>
                    <td><strong>${c.numero}</strong></td>
                    <td>${c.nom_client}</td>
                    <td>${formatPrix(c.total)}</td>
                    <td>${c.mode_paiement}</td>
                    <td>${badgeStatut(c.statut)}</td>
                    <td>${c.created_at}</td>
                    <td><button class="btn-action btn-assign" onclick="openModalAssigner(${c.id_commande}, '${c.numero}')">
                        <i class="fa-solid fa-motorcycle"></i> Assigner
                    </button></td>
                </tr>
            `).join('');
        }

        // Stocks bas
        const tbodyS = document.getElementById('tbodyStocksBas');
        if (!data.stocks_bas_liste.length) {
            tbodyS.innerHTML = '<tr><td colspan="4" class="loading-row">Aucun stock bas</td></tr>';
        } else {
            tbodyS.innerHTML = data.stocks_bas_liste.map(s => `
                <tr>
                    <td>${s.nom_produit}</td>
                    <td>${s.label_poids}</td>
                    <td><strong style="color:#e53935;">${s.stock_disponible}</strong></td>
                    <td><button class="btn-action btn-edit" onclick="showPage('produits')">
                        <i class="fa-solid fa-pen"></i> Modifier
                    </button></td>
                </tr>
            `).join('');
        }
    } catch(e) {
        console.error('[DASHBOARD]', e);
    }
}

// ── COMMANDES ─────────────────────────────────────────────────────────────
async function loadCommandes() {
    const statut = document.getElementById('filterStatut')?.value || '';
    const tbody  = document.getElementById('tbodyCommandes');
    tbody.innerHTML = '<tr><td colspan="9" class="loading-row"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>';

    try {
        const url = `/api/admin/commandes${statut ? '?statut=' + statut : ''}`;
        const res  = await fetch(url);
        const data = await res.json();

        if (!data.success || !data.commandes.length) {
            tbody.innerHTML = '<tr><td colspan="9" class="loading-row">Aucune commande</td></tr>';
            return;
        }

        tbody.innerHTML = data.commandes.map(c => `
            <tr>
                <td><strong>${c.numero}</strong></td>
                <td>${c.nom_client}</td>
                <td>${c.telephone}</td>
                <td>${formatPrix(c.total)}</td>
                <td>${c.mode_paiement}</td>
                <td>${badgeStatut(c.statut)}</td>
                <td>${c.livreur_nom || '<span style="color:var(--muted)">—</span>'}</td>
                <td>${c.created_at}</td>
                <td>
                    <button class="btn-action btn-assign" onclick="openModalAssigner(${c.id_commande}, '${c.numero}', '${c.statut}')">
                        <i class="fa-solid fa-motorcycle"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading-row">Erreur de chargement</td></tr>';
    }
}

// ── PRODUITS ──────────────────────────────────────────────────────────────
async function loadProduits() {
    const tbody = document.getElementById('tbodyProduits');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>';

    try {
        const res  = await fetch('/api/produits');
        const data = await res.json();

        if (!data.success || !data.produits.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Aucun produit</td></tr>';
            return;
        }

        tbody.innerHTML = data.produits.map(p => {
            const prixMin   = p.poids.length ? Math.min(...p.poids.map(d => d.prix)) : 0;
            const stockTotal = p.poids.reduce((s, d) => s + d.stock, 0);
            return `
                <tr>
                    <td><img src="${p.image_url}" class="product-thumb" onerror="this.src='/static/images/ladoum.jpg'" /></td>
                    <td><strong>${p.nom_produit}</strong>${p.badge ? ` <span style="font-size:0.7rem;background:var(--orange-bg);color:var(--orange);padding:2px 6px;border-radius:8px;">${p.badge}</span>` : ''}</td>
                    <td>${p.nom_categorie}</td>
                    <td>${formatPrix(prixMin)}</td>
                    <td><span style="color:${stockTotal < 5 ? '#e53935' : 'var(--text)'};font-weight:${stockTotal < 5 ? '700' : '400'}">${stockTotal}</span></td>
                    <td>
                        <button class="btn-action btn-edit" onclick="openModalEditProduit(${p.id_produit})">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteProduit(${p.id_produit}, '${p.nom_produit}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Erreur de chargement</td></tr>';
    }
}

// ── CLIENTS ───────────────────────────────────────────────────────────────
async function loadClients() {
    const tbody = document.getElementById('tbodyClients');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
    try {
        const res  = await fetch('/api/admin/clients');
        const data = await res.json();
        if (!data.success || !data.clients.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Aucun client</td></tr>';
            return;
        }
        tbody.innerHTML = data.clients.map(c => `
            <tr>
                <td><strong>${c.nom_complet}</strong></td>
                <td>${c.telephone}</td>
                <td>${c.email}</td>
                <td>${c.adresse || '—'}</td>
                <td>${c.created_at}</td>
                <td>${c.nb_commandes}</td>
            </tr>
        `).join('');
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Erreur</td></tr>';
    }
}

// ── LIVREURS ──────────────────────────────────────────────────────────────
async function loadLivreurs() {
    const tbody = document.getElementById('tbodyLivreurs');
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
    try {
        const res  = await fetch('/api/admin/livreurs');
        const data = await res.json();
        livreursList = data.livreurs || [];
        if (!data.success || !data.livreurs.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Aucun livreur</td></tr>';
            return;
        }
        tbody.innerHTML = data.livreurs.map(l => `
            <tr>
                <td><strong>${l.nom_complet}</strong></td>
                <td>${l.telephone}</td>
                <td>${l.matricule_moto || '—'}</td>
                <td><span style="color:${l.statut_dispo ? '#388e3c' : '#e53935'};font-weight:700;">
                    ${l.statut_dispo ? '✓ Disponible' : '✗ Occupé'}
                </span></td>
                <td>
                    <button class="btn-action btn-edit" onclick="toggleDispoLivreur(${l.id_livreur}, ${l.statut_dispo})">
                        <i class="fa-solid fa-toggle-${l.statut_dispo ? 'on' : 'off'}"></i>
                        ${l.statut_dispo ? 'Désactiver' : 'Activer'}
                    </button>
                </td>
            </tr>
        `).join('');
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Erreur</td></tr>';
    }
}

// ── STATISTIQUES ──────────────────────────────────────────────────────────
async function loadStatistiques() {
    try {
        const res  = await fetch('/api/admin/statistiques');
        const data = await res.json();
        if (!data.success) return;

        document.getElementById('statTotalCommandes').textContent = data.stats.total_commandes;
        document.getElementById('statCATotal').textContent = formatPrix(data.stats.ca_total);
        document.getElementById('statLivrees').textContent = data.stats.livrees;
        document.getElementById('statProduits').textContent = data.stats.nb_produits;

        const tbody = document.getElementById('tbodyTopProduits');
        tbody.innerHTML = data.top_produits.map((p, i) => `
            <tr>
                <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`} ${p.nom_produit}</td>
                <td>${p.total_vendu}</td>
                <td>${formatPrix(p.ca_produit)}</td>
            </tr>
        `).join('') || '<tr><td colspan="3" class="loading-row">Aucune donnée</td></tr>';
    } catch(e) {
        console.error('[STATS]', e);
    }
}

// ── MODAL PRODUIT ─────────────────────────────────────────────────────────
function openModalProduit() {
    document.getElementById('modalProduitTitle').textContent = 'Ajouter un produit';
    document.getElementById('produitId').value = '';
    document.getElementById('produitNom').value = '';
    document.getElementById('produitDescription').value = '';
    document.getElementById('produitImage').value = '';
    document.getElementById('produitBadge').value = '';
    document.getElementById('produitCategorie').value = '1';
    document.getElementById('declisContainer').innerHTML = '';
    addDeclinaison();
    document.getElementById('modalProduit').classList.add('open');
}

async function openModalEditProduit(id) {
    try {
        const res  = await fetch(`/api/produits/${id}`);
        const data = await res.json();
        if (!data.success) return;
        const p = data.produit;

        document.getElementById('modalProduitTitle').textContent = 'Modifier le produit';
        document.getElementById('produitId').value = p.id_produit;
        document.getElementById('produitNom').value = p.nom_produit;
        document.getElementById('produitDescription').value = p.description || '';
        document.getElementById('produitImage').value = p.image_url || '';
        document.getElementById('produitBadge').value = p.badge || '';

        // Trouver l'id_categorie depuis nom_categorie
        const catMap = { volaille: 1, oeufs: 2, moutons: 3, vaches: 4, packs: 5 };
        document.getElementById('produitCategorie').value = catMap[p.nom_categorie] || 1;

        // Déclinaisons
        document.getElementById('declisContainer').innerHTML = '';
        p.poids.forEach(d => addDeclinaison(d.label, d.valeur, d.prix, d.stock, d.id_poids));

        document.getElementById('modalProduit').classList.add('open');
    } catch(e) {
        showToast('Erreur lors du chargement du produit', 'error');
    }
}

function closeModalProduit() {
    document.getElementById('modalProduit').classList.remove('open');
}

function addDeclinaison(label='', valeur='', prix='', stock=0, id_poids='') {
    const container = document.getElementById('declisContainer');
    const row = document.createElement('div');
    row.className = 'decli-row';
    row.innerHTML = `
        <input type="hidden" class="decli-id" value="${id_poids}" />
        <input type="text" class="decli-label" placeholder="Label (ex: 1,5 kg)" value="${label}" />
        <input type="text" class="decli-valeur" placeholder="Valeur (ex: 1.5)" value="${valeur}" />
        <input type="number" class="decli-prix" placeholder="Prix FCFA" value="${prix}" />
        <input type="number" class="decli-stock" placeholder="Stock" value="${stock}" />
        <button class="btn-remove-decli" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-times"></i>
        </button>
    `;
    container.appendChild(row);
}

async function saveProduit() {
    const id          = document.getElementById('produitId').value;
    const nom         = document.getElementById('produitNom').value.trim();
    const description = document.getElementById('produitDescription').value.trim();
    const image_url   = document.getElementById('produitImage').value.trim();
    const badge       = document.getElementById('produitBadge').value.trim();
    const id_categorie = parseInt(document.getElementById('produitCategorie').value);

    if (!nom) { showToast('Le nom est obligatoire', 'error'); return; }

    const declinaisons = [];
    document.querySelectorAll('.decli-row').forEach(row => {
        const label  = row.querySelector('.decli-label').value.trim();
        const valeur = row.querySelector('.decli-valeur').value.trim();
        const prix   = parseFloat(row.querySelector('.decli-prix').value);
        const stock  = parseInt(row.querySelector('.decli-stock').value) || 0;
        const decliId = row.querySelector('.decli-id').value;
        if (label && prix) declinaisons.push({ id_poids: decliId || null, label, valeur, prix, stock });
    });

    if (!declinaisons.length) { showToast('Ajoutez au moins une déclinaison', 'error'); return; }

    const url    = id ? `/api/admin/produits/${id}` : '/api/admin/produits';
    const method = id ? 'PUT' : 'POST';

    try {
        const res  = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, description, image_url, badge, id_categorie, declinaisons })
        });
        const data = await res.json();
        if (data.success) {
            showToast(id ? 'Produit modifié !' : 'Produit ajouté !');
            closeModalProduit();
            loadProduits();
        } else {
            showToast(data.error || 'Erreur', 'error');
        }
    } catch(e) {
        showToast('Erreur serveur', 'error');
    }
}

async function deleteProduit(id, nom) {
    if (!confirm(`Supprimer "${nom}" ? Cette action est irréversible.`)) return;
    try {
        const res  = await fetch(`/api/admin/produits/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { showToast('Produit supprimé'); loadProduits(); }
        else showToast(data.error || 'Erreur', 'error');
    } catch(e) {
        showToast('Erreur serveur', 'error');
    }
}

// ── MODAL ASSIGNER LIVREUR ────────────────────────────────────────────────
async function openModalAssigner(idCommande, numero, statut = 'en_attente') {
    document.getElementById('assignerCommandeId').value = idCommande;
    document.getElementById('assignerCommandeNum').value = numero;
    document.getElementById('assignerStatut').value = statut;

    // Charger livreurs si pas encore fait
    if (!livreursList.length) await loadLivreurs();

    const select = document.getElementById('assignerLivreurId');
    select.innerHTML = '<option value="">— Sélectionner un livreur —</option>' +
        livreursList.map(l => `<option value="${l.id_livreur}">${l.nom_complet} ${l.statut_dispo ? '✓' : '(occupé)'}</option>`).join('');

    document.getElementById('modalAssigner').classList.add('open');
}

function closeModalAssigner() {
    document.getElementById('modalAssigner').classList.remove('open');
}

async function saveAssignation() {
    const id_commande = document.getElementById('assignerCommandeId').value;
    const id_livreur  = document.getElementById('assignerLivreurId').value;
    const statut      = document.getElementById('assignerStatut').value;

    try {
        const res  = await fetch(`/api/admin/commandes/${id_commande}/assigner`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_livreur: id_livreur || null, statut })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Commande mise à jour !');
            closeModalAssigner();
            if (currentPage === 'commandes') loadCommandes();
            else loadDashboard();
        } else {
            showToast(data.error || 'Erreur', 'error');
        }
    } catch(e) {
        showToast('Erreur serveur', 'error');
    }
}

// ── TOGGLE DISPO LIVREUR ──────────────────────────────────────────────────
async function toggleDispoLivreur(id, actuel) {
    try {
        const res  = await fetch(`/api/admin/livreurs/${id}/disponibilite`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statut_dispo: !actuel })
        });
        const data = await res.json();
        if (data.success) { showToast('Disponibilité mise à jour'); loadLivreurs(); }
        else showToast(data.error || 'Erreur', 'error');
    } catch(e) {
        showToast('Erreur serveur', 'error');
    }
}

// ── DÉCONNEXION ───────────────────────────────────────────────────────────
async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin';
}
