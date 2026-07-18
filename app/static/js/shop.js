/* =========================================================================
   🛍️ LIV'GUINAR+ — DONNÉES PRODUITS & RENDU BOUTIQUE
   ========================================================================= */

// =========================================================================
// 📦 PRODUITS — chargés depuis l'API Flask (init dans app.js)
// =========================================================================
// window.PRODUITS est rempli par app.js via /api/produits
// shop.js l'utilise directement, ne le redéfinit pas
window.PRODUITS = window.PRODUITS || [];

// ==========================================================================
// 🌟 RENDU DES ÉTOILES
// ==========================================================================
function renderStars(note) {
    const plein = Math.floor(note);
    const demi  = note % 1 >= 0.5 ? 1 : 0;
    const vide  = 5 - plein - demi;
    let html = '';
    for (let i = 0; i < plein; i++) html += '★';
    if (demi) html += '½';
    for (let i = 0; i < vide; i++) html += '☆';
    return html;
}

window.renderStars = renderStars;

// ==========================================================================
// 💰 FORMATAGE PRIX
// ==========================================================================
function formatPrix(n) {
    return n.toLocaleString('fr-FR') + ' FCFA';
}

window.formatPrix = formatPrix;

// ==========================================================================
// 🃏 RENDU D'UNE CARTE PRODUIT
// ==========================================================================
function renderProductCard(produit, poidsActif) {
    const idx     = poidsActif !== undefined ? poidsActif : produit.poidsDefaut;
    const poidsEl = produit.poids[idx];

    return `
        <div class="product-card" data-id="${produit.id}" data-poids="${idx}">
            <div class="image-container">
                ${produit.badge ? `<span class="badge-popular">${produit.badge}</span>` : ''}
                <img src="${produit.image}" alt="${produit.nom}" loading="lazy">
            </div>
            <div class="product-info">
                <h3>${produit.nom}</h3>
                <div class="rating">
                    <span class="stars">${renderStars(produit.note)}</span>
                    <span class="reviews-count">(${produit.avis})</span>
                </div>
                <div class="weight-selector">
                    ${produit.poids.map((p, i) => `
                        <button class="weight-btn ${i === idx ? 'active' : ''}" data-poid-idx="${i}">
                            ${p.label}
                        </button>
                    `).join('')}
                </div>
                <div class="product-footer">
                    <span class="price" id="price-${produit.id}">${formatPrix(poidsEl.prix)}</span>
                    <button class="btn-add" data-id="${produit.id}" data-poids="${idx}">
                        <i class="fas fa-shopping-cart"></i> Ajouter
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.renderProductCard = renderProductCard;

// ==========================================================================
// 📋 RENDU DE LA GRILLE BOUTIQUE
// ==========================================================================
function renderBoutique(liste) {
    const container = document.getElementById('products-container');
    const shopTitle = document.getElementById('shopTitle');
    const shopCount = document.getElementById('shopCount');

    if (!container) return;

    if (liste.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:var(--text-muted);">
                <i class="fa-solid fa-magnifying-glass" style="font-size:2.5rem; margin-bottom:14px; opacity:0.3;"></i>
                <p style="font-size:1rem; font-weight:600;">Aucun produit trouvé</p>
                <p style="font-size:0.85rem; margin-top:6px;">Modifiez vos filtres pour voir plus de produits.</p>
            </div>
        `;
        if (shopCount) shopCount.textContent = '(0)';
        return;
    }

    container.innerHTML = liste.map(p => renderProductCard(p)).join('');
    if (shopCount) shopCount.textContent = `(${liste.length})`;

    // Sélecteur de poids — mise à jour du prix en temps réel
    container.querySelectorAll('.weight-selector').forEach(selector => {
        const card    = selector.closest('.product-card');
        const prodId  = parseInt(card.dataset.id);
        const produit = PRODUITS.find(p => p.id === prodId);
        const btns    = selector.querySelectorAll('.weight-btn');
        const priceEl = card.querySelector('.price');
        const addBtn  = card.querySelector('.btn-add');

        btns.forEach((btn, i) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const poids = produit.poids[i];
                priceEl.textContent = formatPrix(poids.prix);
                card.dataset.poids = i;
                addBtn.dataset.poids = i;
            });
        });
    });

    // Clic sur le bouton "Ajouter" d'une carte
    container.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const prodId  = parseInt(btn.dataset.id);
            const poidsIdx = parseInt(btn.dataset.poids || 0);
            ajouterAuPanier(prodId, poidsIdx, 1);
        });
    });

    // Clic sur la carte → page détail
    container.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const prodId = parseInt(card.dataset.id);
            if (window.afficherDetail) window.afficherDetail(prodId);
        });
    });
}

window.renderBoutique = renderBoutique;

// ==========================================================================
// 🛒 GESTION DU PANIER
// ==========================================================================
let panier = JSON.parse(localStorage.getItem('lg_panier') || '[]');

function sauvegarderPanier() {
    localStorage.setItem('lg_panier', JSON.stringify(panier));
    mettreAJourBadgesPanier();
}

function mettreAJourBadgesPanier() {
    const total = panier.reduce((acc, item) => acc + item.quantite, 0);
    const badges = [
        document.getElementById('cartBadge'),
        document.getElementById('cartBadgeFooter')
    ];
    badges.forEach(b => {
        if (!b) return;
        b.textContent = total;
        b.style.display = total > 0 ? 'flex' : 'none';
    });
}

function ajouterAuPanier(prodId, poidsIdx, quantite) {
    const produit = PRODUITS.find(p => p.id === prodId);
    if (!produit) return;

    const poids = produit.poids[poidsIdx];
    const cle   = `${prodId}-${poidsIdx}`;

    const existant = panier.find(i => i.cle === cle);
    if (existant) {
        existant.quantite += quantite;
    } else {
        panier.push({
            cle,
            prodId,
            poidsIdx,
            nom: produit.nom,
            image: produit.image,
            poidsLabel: poids.label,
            prix: poids.prix,
            quantite
        });
    }

    sauvegarderPanier();
    afficherToast(`🛒 ${produit.nom} ajouté au panier !`);
}

window.ajouterAuPanier = ajouterAuPanier;
window.panier           = panier;
window.mettreAJourBadgesPanier = mettreAJourBadgesPanier;
window.sauvegarderPanier = sauvegarderPanier;

// Toast
function afficherToast(msg) {
    let toast = document.querySelector('.toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.innerHTML = msg;
    toast.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

window.afficherToast = afficherToast;

// Init badges au chargement
document.addEventListener('DOMContentLoaded', () => {
    mettreAJourBadgesPanier();
});
