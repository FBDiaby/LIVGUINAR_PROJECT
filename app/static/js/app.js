/* =========================================================================
   ⚙️ LIV'GUINAR+ — APP.JS UNIFIÉ (API Flask + Navigation + Suivi + Assistant)
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 🔗 ÉLÉMENTS DOM — SECTIONS
    // =========================================================================
    const sections = {
        accueil:   document.getElementById('section-accueil'),
        boutique:  document.getElementById('section-boutique'),
        detail:    document.getElementById('section-detail'),
        panier:    document.getElementById('section-panier'),
        suivi:     document.getElementById('section-suivi'),
        assistant: document.getElementById('section-assistant'),
        apropos:   document.getElementById('section-apropos'),
        blog:      document.getElementById('section-blog'),
        contact:   document.getElementById('section-contact'),
        compte:    document.getElementById('section-compte'),
    };

    // HEADERS (un seul affiché à la fois)
    const headers = {
        accueil:   document.getElementById('headerAccueil'),
        boutique:  document.getElementById('headerBoutique'),
        assistant: document.getElementById('headerAssistant'),
    };

    // Boutons de nav footer
    const navBtns = {
        accueil:   document.getElementById('btn-nav-accueil'),
        boutique:  document.getElementById('btn-nav-boutique'),
        suivi:     document.getElementById('btn-nav-suivi'),
        assistant: document.getElementById('btn-nav-assistant'),
    };

    let mapInstance    = null;
    let livreurMarker  = null;
    let sectionPrécédente = 'accueil';

    // =========================================================================
    // 🌐 CHARGEMENT DES PRODUITS DEPUIS L'API FLASK
    // =========================================================================
    async function chargerProduits() {
        try {
            const res  = await fetch('/api/produits');
            const data = await res.json();
            if (data.success && Array.isArray(data.produits)) {
                // Normaliser les champs pour compatibilité avec shop.js
                window.PRODUITS = data.produits.map(p => ({
                    ...p,
                    id:          p.id_produit,
                    nom:         p.nom_produit,
                    image:       p.image_url,
                    categorie:   (p.nom_categorie || '').toLowerCase()
                                   .replace('œufs','oeufs')
                                   .replace('packs & paniers','packs'),
                    note:        parseFloat(p.note) || 4.5,
                    avis:        p.nb_avis || p.avis || 0,
                    poidsDefaut: 0,
                    // poids vient déjà de l'API avec label/prix
                }));
                console.log(`✅ ${window.PRODUITS.length} produits chargés depuis la BDD`);
            } else {
                console.warn('⚠️ API produits — réponse inattendue:', data);
                window.PRODUITS = [];
            }
        } catch (err) {
            console.error('❌ Impossible de charger les produits:', err);
            window.PRODUITS = [];
        }
    }

    // =========================================================================
    // 🧭 NAVIGATION — masquer/afficher sections + headers
    // =========================================================================
    function masquerTout() {
        Object.values(sections).forEach(s => {
            if (s) { s.style.display = 'none'; s.style.visibility = 'hidden'; }
        });
        Object.values(headers).forEach(h => {
            if (h) {
                h.style.display    = 'none';
                h.style.visibility = 'hidden';
                h.style.height     = '0';
                h.style.overflow   = 'hidden';
                h.style.position   = 'relative'; // annuler sticky temporairement
            }
        });
        Object.values(navBtns).forEach(b => { if (b) b.classList.remove('active'); });
    }

    function afficherHeader(nomHeader) {
        if (nomHeader && headers[nomHeader]) {
            const h = headers[nomHeader];
            h.style.display    = 'block';
            h.style.visibility = 'visible';
            h.style.height     = '';
            h.style.overflow   = '';
            h.style.position   = 'sticky';
        }
    }

    function afficherSection(nomSection, nomHeader, nomNavBtn) {
        masquerTout();
        if (sections[nomSection]) {
            sections[nomSection].style.display    = 'block';
            sections[nomSection].style.visibility = 'visible';
        }
        afficherHeader(nomHeader);
        if (nomNavBtn && navBtns[nomNavBtn]) navBtns[nomNavBtn].classList.add('active');
        window.scrollTo(0, 0);
    }

    // ── ACCUEIL ──────────────────────────────────────────────────────────
    window.activerAccueil = function() {
        afficherSection('accueil', 'accueil', 'accueil');
        sectionPrécédente = 'accueil';
        renderBannieres(BANNIERES);
    };

    // ── BOUTIQUE ─────────────────────────────────────────────────────────
    window.activerBoutique = function(catFiltre) {
        afficherSection('boutique', 'boutique', 'boutique');
        sectionPrécédente = 'boutique';
        // Restaurer le titre et le bouton filtre
        const boutiqueH1 = document.querySelector('#headerBoutique h1');
        if (boutiqueH1) boutiqueH1.textContent = 'La Boutique';
        const filterBtn = document.getElementById('openFilterBtn');
        if (filterBtn) filterBtn.style.display = '';

        let liste = window.PRODUITS;
        const shopTitle = document.getElementById('shopTitle');

        if (catFiltre && catFiltre !== 'tout') {
            liste = liste.filter(p => p.categorie === catFiltre);
            const noms = { volaille:'Volaille', oeufs:'Œufs', moutons:'Moutons', vaches:'Vaches', packs:'Packs & Paniers' };
            if (shopTitle) shopTitle.childNodes[0].textContent = (noms[catFiltre] || catFiltre) + ' ';
        } else {
            if (shopTitle) shopTitle.childNodes[0].textContent = 'Tous les produits ';
        }

        if (typeof window.renderBoutique === 'function') window.renderBoutique(liste);
    };

    // ── DETAIL ────────────────────────────────────────────────────────────
    window.activerDetail = window.afficherDetail = function(prodId) {
        masquerTout();
        if (sections.detail) sections.detail.style.display = 'block';
        renderDetail(prodId);
        window.scrollTo(0, 0);
    };

    // ── PANIER ────────────────────────────────────────────────────────────
    window.activerPanier = function() {
        masquerTout();
        if (sections.panier) {
            sections.panier.style.display    = 'block';
            sections.panier.style.visibility = 'visible';
        }
        // Afficher le header boutique (sobre) pour le panier
        afficherHeader('boutique');
        // Changer le titre du header boutique pour "Mon Panier"
        const boutiqueH1 = document.querySelector('#headerBoutique h1');
        if (boutiqueH1) boutiqueH1.textContent = 'Mon Panier';
        // Masquer le bouton filtre, montrer bouton retour
        const filterBtn = document.getElementById('openFilterBtn');
        if (filterBtn) filterBtn.style.display = 'none';
        renderPanier();
        window.scrollTo(0, 0);
    };

    // ── SUIVI ─────────────────────────────────────────────────────────────
    window.activerSuivi = function(numeroCommande) {
        afficherSection('suivi', null, 'suivi');
        sectionPrécédente = 'suivi';
        
        const numero = numeroCommande || 'LG-2847'; // numéro par défaut pour la démo
        
        // Charger les données réelles depuis l'API
        fetch(`/api/suivi/${numero}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const c = data.commande;
                    // Mettre à jour le numéro de commande
                    const numEl = document.querySelector('.order-number-tag');
                    if (numEl) numEl.textContent = `COMMANDE #${c.numero}`;
                    
                    // Mettre à jour le QR code
                    const qrImg = document.getElementById('qr-image');
                    if (qrImg) qrImg.src = c.qr_url;
                    
                    // Mettre à jour l'ID du QR
                    const qrId = document.querySelector('.qr-order-id');
                    if (qrId) qrId.textContent = `#${c.numero}`;
                    
                    // Mettre à jour la facture avec les vraies lignes
                    if (data.lignes && data.lignes.length > 0) {
                        const tbody = document.querySelector('.invoice-table tbody');
                        if (tbody) {
                            tbody.innerHTML = data.lignes.map(l => `
                                <tr>
                                    <td>${l.nom_produit} (${l.poids_label})</td>
                                    <td class="text-center">${l.quantite}</td>
                                    <td class="text-right">${window.formatPrix(l.total_ligne)}</td>
                                </tr>
                            `).join('') + `
                                <tr>
                                    <td>Frais de livraison</td>
                                    <td class="text-center">—</td>
                                    <td class="text-right">1 500 FCFA</td>
                                </tr>
                                <tr class="invoice-total-row">
                                    <td>TOTAL NET PAYÉ</td>
                                    <td></td>
                                    <td class="text-right">${window.formatPrix(c.total)}</td>
                                </tr>
                            `;
                        }
                        // Numéro facture
                        const factureNum = document.querySelector('.invoice-header small');
                        if (factureNum) factureNum.textContent = `N° ${c.numero}`;
                        const factureH4 = document.querySelector('.invoice-header h4');
                        // Date commande
                        const dateEl = document.querySelector('.order-date-tag');
                        if (dateEl) dateEl.innerHTML = `<i class="fa-regular fa-calendar"></i> ${c.created_at}`;
                    }
                }
            })
            .catch(() => console.log('Données de suivi non disponibles — mode démo'));
        
        // Initialiser la carte
        setTimeout(() => {
            initCarte();
            // Connecter au WebSocket pour le temps réel
            connecterSuiviTempsReel(numero);
        }, 300);
    };

    // ── ASSISTANT ─────────────────────────────────────────────────────────
    window.activerAssistant = function() {
        afficherSection('assistant', 'assistant', 'assistant');
        sectionPrécédente = 'assistant';
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages && chatMessages.children.length === 0) {
            ajouterMessageAssistant("Salamalekoum ! Je suis l'assistant Liv'Guinar+. Je comprends le Français, le Wolof et le Sérère. Comment puis-je vous aider ?");
        }
    };

    // ── PAGES SIDEBAR ─────────────────────────────────────────────────────
    window.activerAPropos  = () => afficherSection('apropos',  'accueil', null);
    window.activerBlog     = () => afficherSection('blog',     'accueil', null);
    window.activerContact  = () => afficherSection('contact',  'accueil', null);
    window.activerCompte   = () => afficherSection('compte',   'accueil', null);

    // =========================================================================
    // 🎯 ÉCOUTEURS DE NAVIGATION
    // =========================================================================
    if (navBtns.accueil)   navBtns.accueil.addEventListener('click',   () => window.activerAccueil());
    if (navBtns.boutique)  navBtns.boutique.addEventListener('click',  () => window.activerBoutique());
    if (navBtns.suivi)     navBtns.suivi.addEventListener('click',     () => window.activerSuivi());
    if (navBtns.assistant) navBtns.assistant.addEventListener('click', () => window.activerAssistant());

    // Boutons panier (icône header)
    const cartBtn         = document.getElementById('cartBtn');
    const cartBtnBoutique = document.getElementById('cartBtnBoutique');
    if (cartBtn)         cartBtn.addEventListener('click',         () => window.activerPanier());
    if (cartBtnBoutique) cartBtnBoutique.addEventListener('click', () => window.activerPanier());

    // Retour depuis panier
    const backFromPanier = document.getElementById('backFromPanier');
    if (backFromPanier) backFromPanier.addEventListener('click', () => {
        sectionPrécédente === 'boutique' ? window.activerBoutique() : window.activerAccueil();
    });

    // Retour depuis assistant
    const backFromAssistant = document.getElementById('backFromAssistant');
    if (backFromAssistant) backFromAssistant.addEventListener('click', () => window.activerAccueil());

    // Continuer les achats (panier vide)
    const btnContinuerAchat = document.getElementById('btnContinuerAchat');
    if (btnContinuerAchat) btnContinuerAchat.addEventListener('click', () => window.activerBoutique());

    // =========================================================================
    // 🌿 SIDEBAR NAVIGATION
    // =========================================================================
    const overlay        = document.getElementById('sidebarOverlay');
    const sidebarMenu    = document.getElementById('sidebarMenu');
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    const closeSidebarBtn= document.getElementById('closeSidebarBtn');

    function ouvrirSidebar() { sidebarMenu?.classList.add('open'); overlay?.classList.add('show'); }
    function fermerSidebar() { sidebarMenu?.classList.remove('open'); overlay?.classList.remove('show'); }

    openSidebarBtn?.addEventListener('click', ouvrirSidebar);
    closeSidebarBtn?.addEventListener('click', fermerSidebar);
    overlay?.addEventListener('click', fermerSidebar);

    // Liens sidebar
    document.querySelectorAll('.sidebar-link[data-nav]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            fermerSidebar();
            const nav = link.dataset.nav;
            if (nav === 'apropos')  window.activerAPropos();
            else if (nav === 'blog')    window.activerBlog();
            else if (nav === 'contact') window.activerContact();
            else if (nav === 'accueil') window.activerAccueil();
        });
    });

    // Bouton Mon Compte
    document.querySelector('.sidebar-account-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        fermerSidebar();
        window.activerCompte();
    });

    // Boutons retour des pages
    document.querySelectorAll('.back-page-btn').forEach(btn => {
        btn.addEventListener('click', () => window.activerAccueil());
    });

    // =========================================================================
    // 🎛️ SIDEBAR FILTRE BOUTIQUE
    // =========================================================================
    const filterOverlay  = document.getElementById('filterOverlay');
    const filterSidebar  = document.getElementById('filterSidebar');
    const openFilterBtn  = document.getElementById('openFilterBtn');
    const closeFilterBtn = document.getElementById('closeFilterBtn');
    const btnApplyFilter = document.getElementById('btnApplyFilter');
    const btnResetFilter = document.getElementById('btnResetFilter');

    function ouvrirFiltre() { filterSidebar?.classList.add('open'); filterOverlay?.classList.add('show'); }
    function fermerFiltre() { filterSidebar?.classList.remove('open'); filterOverlay?.classList.remove('show'); }

    openFilterBtn?.addEventListener('click', ouvrirFiltre);
    closeFilterBtn?.addEventListener('click', fermerFiltre);
    filterOverlay?.addEventListener('click', fermerFiltre);

    document.querySelectorAll('.filter-cat-item').forEach(item => {
        item.addEventListener('click', () => item.classList.toggle('active'));
    });

    const priceRange    = document.getElementById('priceRange');
    const priceMaxLabel = document.getElementById('priceMaxLabel');
    priceRange?.addEventListener('input', () => {
        if (priceMaxLabel) priceMaxLabel.textContent = parseInt(priceRange.value).toLocaleString('fr-FR') + ' FCFA';
    });

    document.querySelectorAll('.weight-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.weight-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    btnApplyFilter?.addEventListener('click', () => {
        const cats = [...document.querySelectorAll('.filter-cat-item.active')].map(i => i.dataset.cat);
        const prixMax = priceRange ? parseInt(priceRange.value) : 500000;
        const liste = window.PRODUITS.filter(p => {
            if (!cats.includes(p.categorie)) return false;
            const prixMin = Math.min(...(p.poids || []).map(w => w.prix));
            return prixMin <= prixMax;
        });
        if (typeof window.renderBoutique === 'function') window.renderBoutique(liste);
        const shopTitle = document.getElementById('shopTitle');
        if (shopTitle) shopTitle.childNodes[0].textContent = 'Résultats filtrés ';
        fermerFiltre();
    });

    btnResetFilter?.addEventListener('click', () => {
        document.querySelectorAll('.filter-cat-item').forEach(i => i.classList.add('active'));
        if (priceRange) { priceRange.value = 500000; if (priceMaxLabel) priceMaxLabel.textContent = '500 000 FCFA'; }
        document.querySelectorAll('.weight-filter-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    });

    // =========================================================================
    // 🏠 ACCUEIL — BANNIÈRES
    // =========================================================================
    const BANNIERES = [
        { cat:'packs',   titre:'🧺 Nos Packs & Paniers', count:'3 assortiments disponibles', prix:'Vos indispensables au meilleur prix',
          bg:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1000', overlay:'rgba(0,0,0,0.42),rgba(0,0,0,0.70)' },
        { cat:'volaille', titre:'🐔 Volaille', count:'4 produits disponibles', prix:'À partir de 3 000 FCFA/kg',
          bg:'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=1000', overlay:'rgba(0,0,0,0.18),rgba(0,0,0,0.58)' },
        { cat:'oeufs',   titre:'🥚 Œufs', count:'2 produits disponibles', prix:'À partir de 2 500 FCFA/plat.',
          bg:'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?q=80&w=1000', overlay:'rgba(0,0,0,0.18),rgba(0,0,0,0.58)' },
        { cat:'moutons', titre:'🐑 Moutons', count:'2 produits disponibles', prix:'À partir de 60 000 FCFA',
          bg:'/static/images/ladoum.jpg', overlay:'rgba(0,0,0,0.22),rgba(0,0,0,0.60)' },
        { cat:'vaches',  titre:'🐄 Vaches', count:'1 produit disponible', prix:'À partir de 350 000 FCFA',
          bg:'https://images.unsplash.com/photo-1596733430284-f7437764b1a9?q=80&w=1000', overlay:'rgba(0,0,0,0.18),rgba(0,0,0,0.58)' }
    ];

    function renderBannieres(liste) {
        const section = document.getElementById('bannersSection');
        if (!section) return;
        section.innerHTML = `<div class="banners-list">
            ${liste.map(b => `
                <div class="category-banner-card"
                     style="background-image:linear-gradient(${b.overlay}),url('${b.bg}');"
                     data-cat="${b.cat}">
                    <div class="banner-content">
                        <h2>${b.titre}</h2>
                        <p class="product-count">${b.count}</p>
                        <p class="starting-price">${b.prix}</p>
                    </div>
                    <div class="banner-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>`).join('')}
        </div>`;
        section.querySelectorAll('.category-banner-card').forEach(card => {
            card.addEventListener('click', () => window.activerBoutique(card.dataset.cat));
        });
    }

    // Chips catégories accueil
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const cat = chip.dataset.cat;
            renderBannieres(cat === 'tout' ? BANNIERES : BANNIERES.filter(b => b.cat === cat));
        });
    });

    // Barre de recherche
    const searchInput = document.getElementById('searchInput');
    searchInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            const terme = searchInput.value.toLowerCase().trim();
            window.activerBoutique();
            setTimeout(() => {
                const liste = window.PRODUITS.filter(p =>
                    (p.nom||'').toLowerCase().includes(terme) ||
                    (p.categorie||'').toLowerCase().includes(terme)
                );
                if (typeof window.renderBoutique === 'function') window.renderBoutique(liste);
                const st = document.getElementById('shopTitle');
                if (st) st.childNodes[0].textContent = `"${searchInput.value}" `;
                searchInput.value = '';
            }, 50);
        }
    });

    // =========================================================================
    // 📦 PAGE DÉTAIL PRODUIT
    // =========================================================================
    function renderDetail(prodId) {
        const produit = window.PRODUITS.find(p => (p.id_produit || p.id) === prodId);
        if (!produit) return;
        const container = document.getElementById('detailContainer');
        if (!container) return;

        const poids = produit.poids || [];
        const poidsDefaut = poids[0] || { label: 'Standard', prix: 0 };

        container.innerHTML = `
            <div class="detail-hero">
                <button class="detail-back-btn" id="detailBackBtn"><i class="fa-solid fa-arrow-left"></i></button>
                ${produit.badge ? `<span class="detail-badge-popular">${produit.badge}</span>` : ''}
                <img src="${produit.image_url || produit.image}" alt="${produit.nom_produit || produit.nom}">
            </div>
            <div class="detail-body">
                <div class="detail-title-row">
                    <h2>${produit.nom_produit || produit.nom}</h2>
                    <div>
                        <span class="detail-price-big" id="detailPriceBig">${window.formatPrix(poidsDefaut.prix)}</span>
                        <span class="detail-price-sub">${poidsDefaut.label} × 1</span>
                    </div>
                </div>
                <div class="detail-rating">
                    <span class="stars">${window.renderStars(produit.note)}</span>
                    <span>${produit.note} · ${produit.avis || 0} avis</span>
                </div>
                <p class="detail-description">${produit.description || ''}</p>

                <p class="detail-section-label">CHOISIR LE POIDS</p>
                <div class="detail-weight-card">
                    <div class="detail-weight-selected" id="weightToggle">
                        <div class="weight-icon">⚖️</div>
                        <div class="weight-selected-info">
                            <span class="weight-selected-label">POIDS SÉLECTIONNÉ</span>
                            <span class="weight-selected-value" id="weightSelectedValue">${poidsDefaut.label}</span>
                        </div>
                        <span class="weight-selected-price" id="weightSelectedPrice">${window.formatPrix(poidsDefaut.prix)}</span>
                        <div class="weight-chevron" id="weightChevron"><i class="fa-solid fa-chevron-down"></i></div>
                    </div>
                    <div class="weight-options" id="weightOptions">
                        ${poids.map((p, i) => `
                            <div class="weight-option-row ${i===0?'active':''}" data-poid-idx="${i}" data-prix="${p.prix}" data-label="${p.label}">
                                <span>${p.label}</span>
                                <span>${window.formatPrix(p.prix)}</span>
                            </div>`).join('')}
                    </div>
                </div>

                <div class="quantity-section">
                    <p class="detail-section-label">QUANTITÉ</p>
                    <div class="quantity-controls">
                        <button class="qty-btn minus" id="qtyMinus">−</button>
                        <span class="qty-value" id="qtyValue">1</span>
                        <button class="qty-btn plus" id="qtyPlus">+</button>
                    </div>
                </div>

                <div class="geoloc-section">
                    <p class="detail-section-label">LIVRAISON À DOMICILE</p>
                    <div class="geoloc-card">
                        <p>Nous livrons dans tout <strong>Dakar et sa banlieue</strong>. Partagez votre localisation pour estimer les frais.</p>
                        <button class="btn-geoloc" id="btnGeoloc"><i class="fa-solid fa-location-dot"></i> Me géolocaliser</button>
                        <div class="geoloc-result" id="geolocResult" style="display:none;">
                            <i class="fa-solid fa-check-circle"></i>
                            <span id="geolocText">Localisation détectée</span>
                        </div>
                    </div>
                </div>

                <div class="payment-section">
                    <p class="detail-section-label">MODE DE PAIEMENT</p>
                    <div class="payment-options">
                        <div class="payment-option pay-wave active" data-pay="wave">
                            <div class="payment-icon"><i class="fa-solid fa-wave-square"></i></div>
                            <span class="payment-name">Wave</span><span class="payment-sub">Mobile</span>
                        </div>
                        <div class="payment-option pay-orange" data-pay="orange">
                            <div class="payment-icon"><i class="fa-solid fa-circle"></i></div>
                            <span class="payment-name">Orange Money</span><span class="payment-sub">Mobile</span>
                        </div>
                        <div class="payment-option pay-cash" data-pay="cash">
                            <div class="payment-icon"><i class="fa-solid fa-money-bill-wave"></i></div>
                            <span class="payment-name">À la livraison</span><span class="payment-sub">Espèces</span>
                        </div>
                    </div>
                </div>
                <div style="height:80px;"></div>
            </div>
            <div class="detail-cta">
                <button class="btn-add-to-cart" id="btnAddToCart">
                    <i class="fa-solid fa-cart-shopping"></i>
                    Ajouter au panier · <span id="ctaPrix">${window.formatPrix(poidsDefaut.prix)}</span>
                </button>
            </div>`;

        let poidsActifIdx = 0, quantite = 1;

        document.getElementById('detailBackBtn').addEventListener('click', () => window.activerBoutique());

        const weightToggle  = document.getElementById('weightToggle');
        const weightOptions = document.getElementById('weightOptions');
        const weightChevron = document.getElementById('weightChevron');

        weightToggle.addEventListener('click', () => {
            weightOptions.classList.toggle('open');
            if (weightChevron) weightChevron.style.transform = weightOptions.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0)';
        });

        weightOptions.querySelectorAll('.weight-option-row').forEach(row => {
            row.addEventListener('click', () => {
                weightOptions.querySelectorAll('.weight-option-row').forEach(r => r.classList.remove('active'));
                row.classList.add('active');
                poidsActifIdx = parseInt(row.dataset.poidIdx);
                const p = poids[poidsActifIdx];
                document.getElementById('weightSelectedValue').textContent  = p.label;
                document.getElementById('weightSelectedPrice').textContent  = window.formatPrix(p.prix);
                document.getElementById('detailPriceBig').textContent       = window.formatPrix(p.prix);
                mettreAJourCTA();
                weightOptions.classList.remove('open');
                if (weightChevron) weightChevron.style.transform = 'rotate(0)';
            });
        });

        document.getElementById('qtyMinus').addEventListener('click', () => {
            if (quantite > 1) { quantite--; document.getElementById('qtyValue').textContent = quantite; mettreAJourCTA(); }
        });
        document.getElementById('qtyPlus').addEventListener('click', () => {
            quantite++; document.getElementById('qtyValue').textContent = quantite; mettreAJourCTA();
        });

        function mettreAJourCTA() {
            document.getElementById('ctaPrix').textContent = window.formatPrix(poids[poidsActifIdx].prix * quantite);
        }

        document.getElementById('btnGeoloc').addEventListener('click', () => {
            const btn = document.getElementById('btnGeoloc');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Localisation en cours...';
            btn.disabled = true;

            if (!navigator.geolocation) {
                btn.innerHTML = '<i class="fa-solid fa-location-dot"></i> Me géolocaliser';
                btn.disabled = false;
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    let adresse = 'Dakar, Sénégal';
                    let frais   = 1500;

                    // Reverse geocoding via Nominatim (OpenStreetMap)
                    try {
                        const res  = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=fr`
                        );
                        const data = await res.json();
                        const q    = data.address || {};
                        // Construire une adresse courte style Yango
                        const quartier = q.suburb || q.neighbourhood || q.city_district || q.town || '';
                        const ville    = q.city || q.county || 'Dakar';
                        adresse = quartier ? `${quartier}, ${ville}` : ville;

                        // Estimer les frais selon la zone (simplifié)
                        const zone = (adresse + ' ' + (q.state || '')).toLowerCase();
                        if (zone.includes('plateau') || zone.includes('médina') || zone.includes('medina')) frais = 1000;
                        else if (zone.includes('pikine') || zone.includes('guédiawaye') || zone.includes('rufisque')) frais = 2500;
                        else if (zone.includes('thiès') || zone.includes('thies')) frais = 5000;
                        else frais = 1500;
                    } catch(e) {
                        console.warn('Geocoding échoué:', e);
                    }

                    // Afficher le résultat style Yango
                    const r = document.getElementById('geolocResult');
                    if (r) {
                        r.style.display = 'flex';
                        r.style.background = 'var(--green-light)';
                        r.style.borderRadius = '12px';
                        r.style.padding = '10px 14px';
                        r.style.gap = '10px';
                        r.style.alignItems = 'center';
                        r.innerHTML = `
                            <i class="fa-solid fa-location-dot" style="color:var(--green-dark); font-size:1.2rem;"></i>
                            <div>
                                <div style="font-weight:700; font-size:0.9rem; color:var(--green-dark);">
                                    📍 ${adresse}
                                </div>
                                <div style="font-size:0.78rem; color:#555; margin-top:2px;">
                                    Géolocalisation activée · Frais de livraison : <strong>${frais.toLocaleString('fr-FR')} FCFA</strong>
                                </div>
                            </div>
                            <i class="fa-solid fa-check-circle" style="color:#4CAF50; margin-left:auto;"></i>
                        `;
                    }

                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Position confirmée';
                    btn.style.borderColor = 'var(--green-dark)';
                    btn.style.color = 'var(--green-dark)';
                    btn.style.background = 'var(--green-light)';

                    // Sauvegarder pour la commande
                    window._clientLocation = { latitude, longitude, adresse, frais };
                },
                (err) => {
                    btn.innerHTML = '<i class="fa-solid fa-location-dot"></i> Me géolocaliser';
                    btn.disabled = false;
                    const r = document.getElementById('geolocResult');
                    if (r) {
                        r.style.display = 'flex';
                        r.innerHTML = `
                            <i class="fa-solid fa-triangle-exclamation" style="color:var(--orange);"></i>
                            <span style="font-size:0.82rem; color:#666;">
                                Localisation refusée · Frais fixes : <strong>1 500 FCFA</strong>
                            </span>
                        `;
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });

        container.querySelectorAll('.payment-option').forEach(opt => {
            opt.addEventListener('click', () => {
                container.querySelectorAll('.payment-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });

        document.getElementById('btnAddToCart').addEventListener('click', () => {
            if (typeof window.ajouterAuPanier === 'function') {
                window.ajouterAuPanier(produit.id_produit || produit.id, poidsActifIdx, quantite);
            }
            window.activerBoutique();
        });
    }

    // =========================================================================
    // 🛒 PANIER
    // =========================================================================
    function renderPanier() {
        const panierItems     = document.getElementById('panierItems');
        const panierTotalCard = document.getElementById('panierTotalCard');
        const panierEmpty     = document.getElementById('panierEmpty');
        if (!panierItems) return;

        const panier = window.panier || [];

        if (panier.length === 0) {
            panierItems.innerHTML = '';
            if (panierTotalCard) panierTotalCard.style.display = 'none';
            if (panierEmpty)     panierEmpty.style.display     = 'flex';
            return;
        }

        if (panierEmpty)     panierEmpty.style.display     = 'none';
        if (panierTotalCard) panierTotalCard.style.display  = 'block';

        panierItems.innerHTML = panier.map(item => `
            <div class="panier-item-card" data-cle="${item.cle}">
                <img class="panier-item-img" src="${item.image}" alt="${item.nom}">
                <div class="panier-item-info">
                    <p class="panier-item-name">${item.nom}</p>
                    <p class="panier-item-weight">${item.poidsLabel}</p>
                    <div class="panier-item-controls">
                        <button class="panier-qty-btn minus-panier" data-cle="${item.cle}">−</button>
                        <span class="panier-qty-val">${item.quantite}</span>
                        <button class="panier-qty-btn plus-panier" data-cle="${item.cle}">+</button>
                    </div>
                </div>
                <span class="panier-item-price">${window.formatPrix(item.prix * item.quantite)}</span>
                <button class="panier-delete-btn" data-cle="${item.cle}"><i class="fa-solid fa-trash"></i></button>
            </div>`).join('');

        panierItems.querySelectorAll('.minus-panier').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = panier.find(i => i.cle === btn.dataset.cle);
                if (item) { if (item.quantite > 1) item.quantite--; else panier.splice(panier.indexOf(item), 1); }
                window.sauvegarderPanier(); renderPanier();
            });
        });
        panierItems.querySelectorAll('.plus-panier').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = panier.find(i => i.cle === btn.dataset.cle);
                if (item) { item.quantite++; window.sauvegarderPanier(); renderPanier(); }
            });
        });
        panierItems.querySelectorAll('.panier-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = panier.findIndex(i => i.cle === btn.dataset.cle);
                if (idx > -1) panier.splice(idx, 1);
                window.sauvegarderPanier(); renderPanier();
            });
        });

        const sousTotal = panier.reduce((acc, i) => acc + i.prix * i.quantite, 0);
        const total     = sousTotal + 1500;
        const st = document.getElementById('sousTotal');
        const tf = document.getElementById('totalFinal');
        if (st) st.textContent = window.formatPrix(sousTotal);
        if (tf) tf.textContent = window.formatPrix(total);
    }

    // =========================================================================
    // 🗺️ CARTE LEAFLET — SUIVI
    // =========================================================================
    const commandeDonnees = {
        numero: 'LG-2847',
        livreur: { nom: 'Moussa Diallo', telephone: '+221771234567', estimation: '14h30 – 15h00' },
        statut:  'En cours de livraison...',
        adresse: '12 Rue Carnot, Dakar Plateau, Dakar',
        itineraire: [[14.6815,-17.4675],[14.6850,-17.4520],[14.6720,-17.4390],[14.6652,-17.4363]]
    };

    // Icône personnalisée livreur style Yango
    function creerIconeLivreur() {
        return L.divIcon({
            className: '',
            html: `<div style="
                background: var(--green-dark);
                width: 44px; height: 44px;
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.35);
                font-size: 1.3rem;
            ">🏍️</div>`,
            iconSize:   [44, 44],
            iconAnchor: [22, 22],
            popupAnchor:[0, -25]
        });
    }

    function creerIconeDestination() {
        return L.divIcon({
            className: '',
            html: `<div style="
                background: #e53935;
                width: 36px; height: 36px;
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-size: 1.1rem;
            ">📍</div>`,
            iconSize:   [36, 36],
            iconAnchor: [18, 18],
            popupAnchor:[0, -20]
        });
    }

    let simulationInterval = null;
    let positionIndex = 0;

    // Interpolation entre deux points GPS
    function interpoler(p1, p2, t) {
        return [
            p1[0] + (p2[0] - p1[0]) * t,
            p1[1] + (p2[1] - p1[1]) * t
        ];
    }

    function demarrerSimulation() {
        if (simulationInterval) return; // déjà en cours

        const itineraire = commandeDonnees.itineraire;
        const nbEtapes   = itineraire.length - 1;
        let etape        = 0;
        let t            = 0; // 0 → 1 entre deux points
        const vitesse    = 0.02; // vitesse de déplacement

        // ETA initial
        let etaMin = 12;
        const etaEl = document.querySelector('.eta-chip strong') || document.querySelector('.eta-text strong');

        simulationInterval = setInterval(() => {
            if (!mapInstance || !livreurMarker) return;

            t += vitesse;

            if (t >= 1) {
                t = 0;
                etape++;
                etaMin = Math.max(0, etaMin - 3);

                // Mettre à jour l'ETA
                const etaChip = document.querySelector('.eta-chip');
                if (etaChip) etaChip.innerHTML = `<i class="fa-solid fa-clock"></i> ${etaMin} min`;
                const etaCircle = document.querySelector('.eta-number');
                if (etaCircle) etaCircle.textContent = etaMin;

                if (etape >= nbEtapes) {
                    // Arrivé !
                    clearInterval(simulationInterval);
                    simulationInterval = null;
                    livreurMarker.setLatLng(itineraire[itineraire.length - 1]);

                    // Notification d'arrivée
                    const badge = document.querySelector('.status-badge-live');
                    if (badge) {
                        badge.innerHTML = '<span style="background:#4CAF50;width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:8px;"></span> Livreur arrivé !';
                        badge.style.borderColor = 'rgba(76,175,80,0.4)';
                        badge.style.background  = 'rgba(76,175,80,0.18)';
                    }
                    return;
                }
            }

            const pos = interpoler(itineraire[etape], itineraire[etape + 1], t);
            livreurMarker.setLatLng(pos);

            // Recentrer doucement sur le livreur
            mapInstance.panTo(pos, { animate: true, duration: 0.8 });

            // Mettre à jour le popup
            livreurMarker.setPopupContent(
                `<div style="font-weight:700;">${commandeDonnees.livreur.nom}</div>
                 <div style="font-size:0.82rem; color:#555; margin-top:3px;">🏍️ En route · Arrivée dans ${etaMin} min</div>`
            );

        }, 800); // toutes les 800ms
    }

    function arreterSimulation() {
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
        }
    }

    function initCarte() {
        const mapEl = document.getElementById('map');
        if (!mapEl || typeof L === 'undefined') return;

        const posLivreur = commandeDonnees.itineraire[1];
        const dest       = commandeDonnees.itineraire[commandeDonnees.itineraire.length - 1];

        if (!mapInstance) {
            mapInstance = L.map('map', {
                zoomControl: false,
                attributionControl: true
            }).setView(posLivreur, 14);

            // Tuiles OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(mapInstance);

            // Tracé de l'itinéraire
            L.polyline(commandeDonnees.itineraire, {
                color:     '#FF9F43',
                weight:    5,
                dashArray: '10, 6',
                opacity:   0.85
            }).addTo(mapInstance);

            // Marqueur livreur (icône moto)
            livreurMarker = L.marker(posLivreur, { icon: creerIconeLivreur() }).addTo(mapInstance);
            livreurMarker.bindPopup(
                `<div style="font-weight:700;">${commandeDonnees.livreur.nom}</div>
                 <div style="font-size:0.82rem; color:#555; margin-top:3px;">🏍️ En route · Arrivée dans 12 min</div>`,
                { offset: [0, -10] }
            ).openPopup();

            // Marqueur destination (point rouge)
            L.marker(dest, { icon: creerIconeDestination() }).addTo(mapInstance)
                .bindPopup(
                    `<div style="font-weight:700;">Votre adresse</div>
                     <div style="font-size:0.82rem; color:#555; margin-top:3px;">${commandeDonnees.adresse}</div>`
                );

            // Démarrer la simulation après 1 seconde
            setTimeout(() => demarrerSimulation(), 1000);

        } else {
            mapInstance.invalidateSize();
        }
    }

    // ── SOCKET.IO — Suivi temps réel ──────────────────────────────────────
    let socketSuivi = null;

    function connecterSuiviTempsReel(numero) {
        if (typeof io === 'undefined') {
            console.warn('Socket.IO non chargé — suivi simulé activé');
            return;
        }

        socketSuivi = io(window.location.origin, {
            transports: ['websocket', 'polling']
        });

        socketSuivi.on('connect', () => {
            console.log('✅ WebSocket connecté');
            // Rejoindre la room de cette commande
            socketSuivi.emit('rejoindre_suivi', { commande: numero });
        });

        socketSuivi.on('location_broadcast', (data) => {
            if (data.commande !== numero) return; // filtrer par commande
            mettreAJourPositionLivreur(data);
        });

        socketSuivi.on('livraison_update', (data) => {
            mettreAJourPositionLivreur(data);
        });

        socketSuivi.on('disconnect', () => {
            console.log('WebSocket déconnecté — passage en simulation');
            if (!simulationInterval) demarrerSimulation();
        });
    }

    function mettreAJourPositionLivreur(data) {
        if (!mapInstance || !livreurMarker) return;

        const lat = parseFloat(data.latitude);
        const lon = parseFloat(data.longitude);
        if (isNaN(lat) || isNaN(lon)) return;

        // Arrêter la simulation si le vrai GPS arrive
        arreterSimulation();

        // Déplacer le marqueur
        livreurMarker.setLatLng([lat, lon]);
        mapInstance.panTo([lat, lon], { animate: true, duration: 1 });

        // Mettre à jour le popup
        livreurMarker.setPopupContent(
            `<div style="font-weight:700;">${data.livreur || 'Livreur'}</div>
             <div style="font-size:0.82rem; color:#555; margin-top:3px;">🏍️ ${data.statut === 'arrive' ? 'Arrivé !' : 'En route vers vous'}</div>
             <div style="font-size:0.75rem; color:#888; margin-top:2px;">Mis à jour à ${new Date().toTimeString().slice(0,5)}</div>`
        );

        // Mettre à jour le statut si livré
        if (data.statut === 'livre') {
            const badge = document.querySelector('.status-badge-live');
            if (badge) {
                badge.innerHTML = '<span style="background:#4CAF50;width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:8px;"></span> Livraison confirmée !';
            }
        }
    }

    // Boutons suivi
    document.getElementById('whatsappBtn')?.addEventListener('click', () => window.open(`https://wa.me/${commandeDonnees.livreur.telephone.replace('+','')}`, '_blank'));
    document.getElementById('phoneBtn')?.addEventListener('click',    () => window.location.href = `tel:${commandeDonnees.livreur.telephone}`);

    // QR Code
    const qrImg = document.getElementById('qr-image');
    if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Commande_LivGuinar_${commandeDonnees.numero}&color=0F4C3A`;

    // Accordéon facture
    document.getElementById('toggleAccordion')?.addEventListener('click', () => {
        const panel = document.getElementById('accordionPanel');
        const arrow = document.getElementById('arrowIcon');
        const isOpen = panel.style.display === 'block';
        panel.style.display = isOpen ? 'none' : 'block';
        arrow?.classList.toggle('rotated', !isOpen);
    });

    // Télécharger PDF
    document.getElementById('downloadInvoiceBtn')?.addEventListener('click', () => {
        const element = document.getElementById('invoice-content');
        const panel   = document.getElementById('accordionPanel');
        if (typeof html2pdf === 'undefined') { window.afficherToast('⏳ PDF en cours de chargement...'); return; }
        const orig = panel.style.display;
        panel.style.display = 'block';
        html2pdf().set({ margin:0.5, filename:`Facture_LivGuinar_${commandeDonnees.numero}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'in',format:'letter',orientation:'portrait'} }).from(element).save().then(() => { panel.style.display = orig; });
    });

    // =========================================================================
    // 🎙️ ASSISTANT VOCAL
    // =========================================================================
    const chatMessages = document.getElementById('chatMessages');
    const chatInput    = document.getElementById('chatInput');
    const micBtn       = document.getElementById('micBtn');
    let isRecording = false, recognition = null;

    function ajouterMessageAssistant(texte) {
        if (!chatMessages) return;
        const heure = new Date().toTimeString().slice(0,5).replace(':','h');
        const msg = document.createElement('div');
        msg.className = 'chat-msg assistant';
        msg.innerHTML = `${texte}<span class="chat-msg-time">${heure}</span>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function ajouterMessageUser(texte) {
        if (!chatMessages) return;
        const heure = new Date().toTimeString().slice(0,5).replace(':','h');
        const msg = document.createElement('div');
        msg.className = 'chat-msg user';
        msg.innerHTML = `${texte}<span class="chat-msg-time">${heure}</span>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function envoyerMessage() {
        const texte = chatInput?.value.trim();
        if (!texte) return;
        ajouterMessageUser(texte);
        if (chatInput) chatInput.value = '';

        // Indicateur de frappe
        const typing = document.createElement('div');
        typing.className = 'chat-typing';
        typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        chatMessages?.appendChild(typing);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const res  = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: texte, type_message: 'texte', langue_hint: 'francais' })
            });
            const data = await res.json();
            typing.remove();
            const reponse = data.reponse_utilisateur?.texte_reponse || "Je n'ai pas compris, pouvez-vous reformuler ?";
            ajouterMessageAssistant(reponse);
        } catch {
            typing.remove();
            ajouterMessageAssistant("Désolé, je suis temporairement indisponible. Réessayez dans un moment.");
        }
    }

    chatInput?.addEventListener('keydown', e => { if (e.key === 'Enter') envoyerMessage(); });

    micBtn?.addEventListener('click', () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            window.afficherToast?.('🎙️ Micro non supporté sur ce navigateur'); return;
        }
        if (isRecording) { recognition?.stop(); return; }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SR();
        recognition.lang = 'fr-FR'; recognition.continuous = false; recognition.interimResults = false;
        recognition.onstart = () => { isRecording=true; micBtn.classList.add('recording'); micBtn.innerHTML='<i class="fa-solid fa-stop"></i>'; if(chatInput) chatInput.placeholder='🎙️ Écoute...'; };
        recognition.onresult  = e => { if(chatInput) chatInput.value = e.results[0][0].transcript; envoyerMessage(); };
        recognition.onerror = recognition.onend = () => { isRecording=false; micBtn.classList.remove('recording'); micBtn.innerHTML='<i class="fa-solid fa-microphone"></i>'; if(chatInput) chatInput.placeholder='Appuyez sur le micro ou écrivez ici...'; };
        recognition.start();
    });

    // Chips de langue
    document.querySelectorAll('.lang-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.lang-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });

    // =========================================================================
    // 🚀 INITIALISATION
    // =========================================================================
    async function init() {
        // 1. Charger les produits depuis la BDD
        await chargerProduits();
        // 2. Afficher l'accueil
        window.activerAccueil();
        // 3. Mettre à jour les badges panier
        if (typeof window.mettreAJourBadgesPanier === 'function') window.mettreAJourBadgesPanier();
    }

    // =========================================================================
    // 📦 DÉTAIL PRODUIT
    // =========================================================================
    window.afficherDetail = function(prodId) {
        const produit = (window.PRODUITS || []).find(p => p.id === prodId);
        if (!produit) return;

        const container = document.getElementById('detailContainer');
        if (!container) return;

        const poidsDefaut = produit.poidsDefaut || 0;
        const poidsActif  = produit.poids[poidsDefaut] || produit.poids[0];

        container.innerHTML = `
            <div class="detail-header">
                <img src="${produit.image}" alt="${produit.nom}"
                     onerror="this.src='/static/images/ladoum.jpg'" class="detail-img">
                ${produit.badge ? `<span class="badge-popular">${produit.badge}</span>` : ''}
                <button class="detail-back-btn" onclick="history.back()">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
            </div>
            <div class="detail-body">
                <div class="detail-top-row">
                    <h2 class="detail-nom">${produit.nom}</h2>
                    <span class="detail-prix" id="detailPrix">${window.formatPrix ? window.formatPrix(poidsActif.prix) : poidsActif.prix + ' FCFA'}</span>
                </div>
                <div class="detail-rating">
                    <span class="stars" style="color:#E07B2A;">${window.renderStars ? window.renderStars(produit.note) : '★★★★★'}</span>
                    <span class="reviews-count">${produit.note} · ${produit.avis} avis</span>
                </div>
                <p class="detail-desc">${produit.description}</p>

                <p class="detail-section-label">CHOISIR LE POIDS</p>
                <div class="detail-poids-list" id="detailPoidsList">
                    ${produit.poids.map((p, i) => `
                        <button class="detail-poids-btn ${i === poidsDefaut ? 'active' : ''}" data-idx="${i}">
                            <span class="poids-label">${p.label}</span>
                            <span class="poids-prix">${window.formatPrix ? window.formatPrix(p.prix) : p.prix + ' FCFA'}</span>
                        </button>
                    `).join('')}
                </div>

                <p class="detail-section-label">QUANTITÉ</p>
                <div class="detail-qty-row">
                    <button class="qty-btn" id="detailQtyMinus">−</button>
                    <span class="qty-val" id="detailQty">1</span>
                    <button class="qty-btn" id="detailQtyPlus">+</button>
                </div>

                <button class="btn-ajouter-detail" id="detailAddBtn">
                    <i class="fa-solid fa-cart-shopping"></i>
                    Ajouter au panier · <span id="detailPrixTotal">${window.formatPrix ? window.formatPrix(poidsActif.prix) : poidsActif.prix + ' FCFA'}</span>
                </button>
            </div>
        `;

        let qtyActuelle   = 1;
        let poidsIdxActif = poidsDefaut;

        // Sélection du poids
        container.querySelectorAll('.detail-poids-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.detail-poids-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                poidsIdxActif = parseInt(btn.dataset.idx);
                const p = produit.poids[poidsIdxActif];
                const prixEl      = document.getElementById('detailPrix');
                const prixTotalEl = document.getElementById('detailPrixTotal');
                if (prixEl && window.formatPrix)      prixEl.textContent      = window.formatPrix(p.prix);
                if (prixTotalEl && window.formatPrix) prixTotalEl.textContent = window.formatPrix(p.prix * qtyActuelle);
            });
        });

        // Quantité
        document.getElementById('detailQtyMinus')?.addEventListener('click', () => {
            if (qtyActuelle > 1) {
                qtyActuelle--;
                document.getElementById('detailQty').textContent = qtyActuelle;
                const p = produit.poids[poidsIdxActif];
                const prixTotalEl = document.getElementById('detailPrixTotal');
                if (prixTotalEl && window.formatPrix) prixTotalEl.textContent = window.formatPrix(p.prix * qtyActuelle);
            }
        });
        document.getElementById('detailQtyPlus')?.addEventListener('click', () => {
            qtyActuelle++;
            document.getElementById('detailQty').textContent = qtyActuelle;
            const p = produit.poids[poidsIdxActif];
            const prixTotalEl = document.getElementById('detailPrixTotal');
            if (prixTotalEl && window.formatPrix) prixTotalEl.textContent = window.formatPrix(p.prix * qtyActuelle);
        });

        // Ajouter au panier
        document.getElementById('detailAddBtn')?.addEventListener('click', () => {
            if (window.ajouterAuPanier) window.ajouterAuPanier(produit.id, poidsIdxActif, qtyActuelle);
            if (window.afficherToast)   window.afficherToast(`🛒 ${produit.nom} ajouté au panier !`);
        });

        // Afficher la section détail
        if (window.activerSection) window.activerSection('detail', { titre: produit.nom });
    };
    init();
});