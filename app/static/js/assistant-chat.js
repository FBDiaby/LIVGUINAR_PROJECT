/* =========================================================================
   🤖 ASSISTANT LIV'GUINAR+ — Logique chat (Texte + Micro → Gemini → JSON)
   =========================================================================
   Flux :
   1. Utilisateur écrit ou parle
   2. POST /api/assistant  →  Flask  →  Gemini API
   3. Réponse JSON { commande_systeme, reponse_utilisateur }
   4. Affichage bulle + synthèse vocale + action panier
   ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {

    // --- Éléments DOM ---
    const chatContainer  = document.getElementById("chatContainer");
    const textInput      = document.getElementById("textInput");
    const sendTextBtn    = document.getElementById("sendTextBtn");
    const micBtn         = document.getElementById("micBtn");
    const langChips      = document.querySelectorAll(".lang-chip");

    // --- État ---
    let currentLang      = "francais"; // langue UI sélectionnée (hint pour Gemini)
    let isRecording      = false;
    let recognition      = null;       // Web Speech API
    let panier           = [];         // panier en mémoire (sync avec shop.js via event)

    // ==========================================================================
    // 🌿 SÉLECTION DE LANGUE (chips)
    // ==========================================================================
    langChips.forEach(chip => {
        chip.addEventListener("click", () => {
            langChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            currentLang = chip.dataset.lang;
        });
    });

    // ==========================================================================
    // 🖊️ INPUT TEXTE — activation du bouton envoyer
    // ==========================================================================
    textInput.addEventListener("input", () => {
        sendTextBtn.classList.toggle("active", textInput.value.trim().length > 0);
    });

    textInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && textInput.value.trim()) {
            envoyerMessage(textInput.value.trim(), "texte");
        }
    });

    sendTextBtn.addEventListener("click", () => {
        if (textInput.value.trim()) {
            envoyerMessage(textInput.value.trim(), "texte");
        }
    });

    // ==========================================================================
    // 🎙️ MICROPHONE — Web Speech API
    // ==========================================================================
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        // Langue de reconnaissance selon le chip sélectionné
        function getLangCode() {
            const map = { wolof: "wo", serere: "srr", francais: "fr-FR" };
            // Wolof et Sérère : pas toujours supportés → fallback fr-FR
            return map[currentLang] || "fr-FR";
        }

        recognition.onstart = () => {
            isRecording = true;
            micBtn.classList.add("recording");
            micBtn.querySelector("i").className = "fa-solid fa-stop";
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            envoyerMessage(transcript, "audio");
        };

        recognition.onerror = (e) => {
            console.error("Erreur micro :", e.error);
            stopRecording();
            afficherErreur("Impossible d'accéder au microphone. Vérifiez les permissions.");
        };

        recognition.onend = () => { stopRecording(); };

        micBtn.addEventListener("click", () => {
            if (!isRecording) {
                recognition.lang = getLangCode();
                recognition.start();
            } else {
                recognition.stop();
            }
        });

    } else {
        // Navigateur non compatible
        micBtn.style.opacity = "0.4";
        micBtn.title = "Microphone non supporté sur ce navigateur";
    }

    function stopRecording() {
        isRecording = false;
        micBtn.classList.remove("recording");
        micBtn.querySelector("i").className = "fa-solid fa-microphone";
    }

    // ==========================================================================
    // 📤 ENVOI DU MESSAGE À FLASK → GEMINI
    // ==========================================================================
    async function envoyerMessage(texte, typeMessage) {

        // 1. Afficher bulle utilisateur
        if (typeMessage === "audio") {
            ajouterBulleAudio();
        } else {
            ajouterBulleUtilisateur(texte);
        }

        // Vider l'input
        textInput.value = "";
        sendTextBtn.classList.remove("active");

        // 2. Indicateur de frappe (bot pense...)
        const typingId = afficherTyping();

        try {
            // 3. Appel à la route Flask
            const response = await fetch("/api/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: texte,
                    type_message: typeMessage,
                    langue_hint: currentLang
                })
            });

            if (!response.ok) throw new Error(`Erreur serveur : ${response.status}`);

            const data = await response.json();

            // 4. Retirer l'indicateur de frappe
            retirerTyping(typingId);

            // 5. Afficher la réponse du bot
            const reponse = data.reponse_utilisateur?.texte_reponse || "Je n'ai pas compris, pouvez-vous reformuler ?";
            ajouterBulleBotTexte(reponse);

            // 6. Synthèse vocale de la réponse
            lireVoix(reponse);

            // 7. Exécuter les commandes système (panier, navigation...)
            if (data.commande_systeme && Array.isArray(data.commande_systeme)) {
                data.commande_systeme.forEach(cmd => executerCommande(cmd));
            }

        } catch (err) {
            retirerTyping(typingId);
            console.error("Erreur assistant :", err);
            ajouterBulleBotTexte("Désolé, une erreur est survenue. Veuillez réessayer.");
        }
    }

    // ==========================================================================
    // 🛒 EXÉCUTION DES COMMANDES SYSTÈME (panier, navigation)
    // ==========================================================================
    function executerCommande(cmd) {
        if (!cmd || !cmd.action) return;

        if (cmd.action === "achat") {
            const item = {
                categorie: cmd.categorie,
                produit: cmd.produit,
                poids: cmd.option_poids,
                quantite: cmd.quantite || 1
            };
            panier.push(item);

            // Notifier shop.js s'il écoute
            document.dispatchEvent(new CustomEvent("panier:update", { detail: panier }));

            // Toast de confirmation
            const label = cmd.produit
                ? cmd.produit.replace(/_/g, " ")
                : (cmd.categorie || "produit");
            afficherToast(`✅ Ajouté au panier : ${label} ×${item.quantite}`);
        }

        if (cmd.action === "navigation" && cmd.categorie) {
            // Redirige vers la boutique avec filtre
            setTimeout(() => {
                window.location.href = `/?page=boutique&cat=${cmd.categorie}`;
            }, 1500);
        }
    }

    // ==========================================================================
    // 🔊 SYNTHÈSE VOCALE (Web Speech Synthesis)
    // ==========================================================================
    function lireVoix(texte) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(texte);
        const langMap = { wolof: "fr-FR", serere: "fr-FR", francais: "fr-FR" };
        utterance.lang = langMap[currentLang] || "fr-FR";
        utterance.rate = 0.95;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }

    // ==========================================================================
    // 🫧 FONCTIONS D'AFFICHAGE DES BULLES
    // ==========================================================================
    function horloge() {
        const now = new Date();
        return `${now.getHours()}h${String(now.getMinutes()).padStart(2, "0")}`;
    }

    function ajouterBulleUtilisateur(texte) {
        const html = `
            <div class="chat-bubble-wrapper user">
                <div class="chat-bubble user-bubble">
                    <p>${escapeHtml(texte)}</p>
                    <span class="chat-time">${horloge()}</span>
                </div>
            </div>`;
        chatContainer.insertAdjacentHTML("beforeend", html);
        scrollBas();
    }

    function ajouterBulleAudio() {
        const html = `
            <div class="chat-bubble-wrapper user">
                <div class="chat-bubble user-bubble audio-wave-bubble">
                    <div class="wave-bars">
                        <span></span><span></span><span></span>
                        <span></span><span></span><span></span>
                    </div>
                    <span class="chat-time">${horloge()}</span>
                </div>
            </div>`;
        chatContainer.insertAdjacentHTML("beforeend", html);
        scrollBas();
    }

    function ajouterBulleBotTexte(texte) {
        const html = `
            <div class="chat-bubble-wrapper bot">
                <div class="bot-avatar-bubble">
                    <i class="fa-solid fa-star"></i>
                </div>
                <div class="chat-bubble bot-bubble">
                    <p>${escapeHtml(texte)}</p>
                    <span class="chat-time">${horloge()}</span>
                </div>
            </div>`;
        chatContainer.insertAdjacentHTML("beforeend", html);
        scrollBas();
    }

    function afficherTyping() {
        const id = "typing-" + Date.now();
        const html = `
            <div class="chat-bubble-wrapper bot" id="${id}">
                <div class="bot-avatar-bubble">
                    <i class="fa-solid fa-star"></i>
                </div>
                <div class="chat-bubble bot-bubble">
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>`;
        chatContainer.insertAdjacentHTML("beforeend", html);
        scrollBas();
        return id;
    }

    function retirerTyping(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function afficherErreur(msg) {
        ajouterBulleBotTexte("⚠️ " + msg);
    }

    function afficherToast(msg) {
        let toast = document.querySelector(".cart-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.className = "cart-toast";
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    }

    function scrollBas() {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
});
