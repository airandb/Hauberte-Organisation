// GitHub-Konfiguration
let githubConfig = {
    token: '',
    repo: '',
    branch: 'main',
    filename: 'termine.json'
};

// Kalender-Instanz
let calendar;

// Termine-Array
let termine = [];

// Status-Nachricht anzeigen
function showStatus(message, isError = false) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = `<div class="status-message ${isError ? 'status-error' : 'status-success'}">${message}</div>`;
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 5000);
}

// GitHub-Konfiguration speichern
function saveGitHubConfig() {
    const token = document.getElementById('github-token').value;
    const repo = document.getElementById('github-repo').value;
    
    if (!token || !repo) {
        showStatus('Bitte Token und Repository eingeben!', true);
        return;
    }
    
    githubConfig.token = token;
    githubConfig.repo = repo;
    
    // Konfiguration im localStorage speichern
    localStorage.setItem('githubConfig', JSON.stringify(githubConfig));
    
    showStatus('GitHub-Konfiguration gespeichert!');
    
    // Termine laden
    loadTermineFromGitHub();
}

// Konfiguration laden
function loadGitHubConfig() {
    const saved = localStorage.getItem('githubConfig');
    if (saved) {
        githubConfig = JSON.parse(saved);
        document.getElementById('github-token').value = githubConfig.token;
        document.getElementById('github-repo').value = githubConfig.repo;
    }
}

// Kalender aktualisieren
function updateCalendar() {
    if (calendar) {
        calendar.removeAllEvents();
        calendar.addEventSource(termine);
    }
}
// Termine von GitHub laden
async function loadTermineFromGitHub() {
    if (!githubConfig.token || !githubConfig.repo) {
        showStatus('GitHub-Konfiguration fehlt!', true);
        return;
    }
    
    try {
        const response = await fetch(`https://api.github.com/repos/${githubConfig.repo}/contents/${githubConfig.filename}?ref=${githubConfig.branch}`, {
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const content = atob(data.content);
            termine = JSON.parse(content);
            showStatus('Termine erfolgreich geladen!');
        } else if (response.status === 404) {
            termine = [];
            showStatus('Neue Termine-Datei wird erstellt...');
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Fehler beim Laden:', error);
        showStatus('Fehler beim Laden der Termine!', true);
        termine = [];
    }
    
    updateCalendar();
}

// Termine auf GitHub speichern
async function saveTermineToGitHub() {
    if (!githubConfig.token || !githubConfig.repo) {
        showStatus('GitHub-Konfiguration fehlt!', true);
        return;
    }
    
    try {
        // Erst prüfen, ob Datei existiert
        let sha = null;
        try {
            const response = await fetch(`https://api.github.com/repos/${githubConfig.repo}/contents/${githubConfig.filename}?ref=${githubConfig.branch}`, {
                headers: {
                    'Authorization': `token ${githubConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                sha = data.sha;
            }
        } catch (error) {
            // Datei existiert nicht - das ist OK
        }
        
        // Datei erstellen oder aktualisieren
        const content = btoa(JSON.stringify(termine, null, 2));
        const body = {
            message: `Termine aktualisiert am ${new Date().toLocaleString('de-DE')}`,
            content: content,
            branch: githubConfig.branch
        };
        
        if (sha) {
            body.sha = sha;
        }
        
        const response = await fetch(`https://api.github.com/repos/${githubConfig.repo}/contents/${githubConfig.filename}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            showStatus('Termine erfolgreich gespeichert!');
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        showStatus('Fehler beim Speichern der Termine!', true);
    }
}

// Termine synchronisieren
async function syncTermine() {
    await loadTermineFromGitHub();
}
// Neuen Termin hinzufügen
function addTermin(name, von, bis) {
    const id = Date.now().toString();
    const termin = {
        id: id,
        title: name,
        start: von,
        end: new Date(new Date(bis).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        backgroundColor: '#3498db',
        borderColor: '#2980b9'
    };
    
    termine.push(termin);
    updateCalendar();
    saveTermineToGitHub();
}

// Termin bearbeiten
function editTermin(termin) {
    const newName = prompt("Name ändern:", termin.title);
    const newVon = prompt("Von-Datum ändern (YYYY-MM-DD):", termin.start);
    const newBis = prompt("Bis-Datum ändern (YYYY-MM-DD):", new Date(new Date(termin.end).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    
    if (newName && newVon && newBis) {
        const index = termine.findIndex(t => t.id === termin.id);
        if (index !== -1) {
            termine[index].title = newName;
            termine[index].start = newVon;
            termine[index].end = new Date(new Date(newBis).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            updateCalendar();
            saveTermineToGitHub();
        }
    }
}

// Termin löschen
function deleteTermin(termin) {
    const index = termine.findIndex(t => t.id === termin.id);
    if (index !== -1) {
        termine.splice(index, 1);
        updateCalendar();
        saveTermineToGitHub();
    }
}

// Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    // GitHub-Konfiguration laden
    loadGitHubConfig();
    
    // Kalender initialisieren
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'de',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth'
        },
        buttonText: {
            today: 'Heute',
            month: 'Monat',
            list: 'Liste'
        },
        eventClick: function(info) {
            const action = confirm("OK = Bearbeiten, Abbrechen = Löschen");
            if (action) {
                editTermin(info.event);
            } else {
                if (confirm("Termin wirklich löschen?")) {
                    deleteTermin(info.event);
                }
            }
        },
        eventDisplay: 'block',
        height: 'auto'
    });
    
    calendar.render();
    
    // Formular-Event-Listener
    document.getElementById('urlaubForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const von = document.getElementById('von').value;
        const bis = document.getElementById('bis').value;
        
        if (name && von && bis) {
            addTermin(name, von, bis);
            
            // Formular zurücksetzen
            document.getElementById('name').value = '';
            document.getElementById('von').value = '';
            document.getElementById('bis').value = '';
        }
    });
    
    // Termine initial laden
    if (githubConfig.token && githubConfig.repo) {
        loadTermineFromGitHub();
    }
    
    // Automatische Synchronisation alle 30 Sekunden
    setInterval(syncTermine, 30000);
});
