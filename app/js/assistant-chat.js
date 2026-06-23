document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const textInput = document.getElementById('text-input');
    const micBtn = document.getElementById('mic-btn');
    
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    // Fonction pour ajouter une bulle au chat
    function appendMessage(text, isUser = false, isAudio = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `chat-bubble-wrapper ${isUser ? 'user' : 'bot'} ${isAudio ? 'audio-msg' : ''}`;
        
        let content = '';
        if (!isUser) {
            content += `<div class="bot-avatar"><i class="fa-solid fa-sparkles"></i></div>`;
        }
        
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;

        content += `
            <div class="chat-bubble">
                <p>${isAudio ? '<i class="fa-solid fa-waveform-lines"></i> 🎙️ Message Vocal (' + text + ')' : text}</p>
                <span class="chat-time">${timeStr}</span>
            </div>
        `;
        
        wrapper.innerHTML = content;
        chatContainer.appendChild(wrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight; // Auto-scroll vers le bas
    }

    // Envoi des messages (Audio ou Écrit) à l'API Flask
    async function sendToAssistant(payload, isFormData = false) {
        try {
            const response = await fetch('/api/assistant/chat', {
                method: 'POST',
                body: isFormData ? payload : JSON.stringify(payload),
                headers: isFormData ? {} : { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            
            if (data.status === 'success' && data.data.reponse_utilisateur) {
                // On affiche la réponse linguistique fournie par le prompt de Google AI Studio !
                appendMessage(data.data.reponse_utilisateur.texte_reponse, false);
                
                // Si l'IA a commandé une action sur le système (ex: achat), on la notifie
                if (data.data.commande_systeme && data.data.commande_systeme.length > 0) {
                    data.data.commande_systeme.forEach(cmd => {
                        if (cmd.action === 'achat') {
                            console.log(`[Panier] Ajout de : ${cmd.quantite} x ${cmd.categorie || 'produit'}`);
                            // Optionnel: Tu pourras appeler ta fonction d'ajout au panier globale ici !
                        </div>
                    });
                }
            } else {
                appendMessage("Dama am mbeuqe (J'ai rencontré une erreur avec le serveur). Recommencez !", false);
            }
        } catch (error) {
            console.error("Erreur d'envoi à l'assistant:", error);
            appendMessage("Impossible de joindre le serveur local.", false);
        }
    }

    // Événement Saisie Textuelle (Touche Entrée)
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Entrée' || e.keyCode === 13) {
            const message = textInput.value.trim();
            if (!message) return;

            appendMessage(message, true); // Ajoute la bulle utilisateur à l'écran
            textInput.value = '';

            sendToAssistant({ text: message });
        }
    });

    // Événement Enregistrement Micro (Clic long ou Clic On/Off)
    micBtn.addEventListener('click', async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    appendMessage("Audio transmis", true, true);

                    const formData = new FormData();
                    formData.append('audio', audioBlob);
                    sendToAssistant(formData, true);
                };

                mediaRecorder.start();
                isRecording = true;
                micBtn.classList.add('recording');
            } catch (err) {
                alert("Veuillez autoriser l'accès au microphone pour l'assistant vocal.");
            }
        } else {
            mediaRecorder.stop();
            isRecording = false;
            micBtn.classList.remove('recording');
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    });
});