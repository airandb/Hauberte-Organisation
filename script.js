document.addEventListener('DOMContentLoaded', function () {
    // GitHub-Konfiguration (ANPASSEN!)
    const GITHUB_CONFIG = {
        owner: 'IHR-GITHUB-USERNAME',  // Ihr GitHub-Benutzername
        repo: 'IHR-REPOSITORY-NAME',   // Name Ihres Repositories
        token: 'IHR-GITHUB-TOKEN',     // Personal Access Token
        fileName: 'termine.json'       // Dateiname für Termine
    };
    
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'de',
        events: [],
        
        // Event-Klicks aktivieren
        eventClick: function(info) {
            const action = confirm(`Termin "${info.event.title}" bearbeiten?\n\nOK = Bearbeiten\nAbbrechen = Löschen`);
            
            if (action) {
                editEvent(info.event);
            } else {
                if (confirm(`Termin "${info.event.title}" wirklich löschen?`)) {
                    deleteEvent(info.event);
                }
            }
        },
        
        eventMouseEnter: function(info) {
            info.el.title = `${info.event.title} (Klicken zum Bearbeiten/Löschen)`;
        }
    });
    
    // Termine beim Start laden
    loadEventsFromGitHub();
    calendar.render();
    
    // Formular für neuen Termin
    document.getElementById('urlaubForm').addEventListener('submit', function (e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const von = document.getElementById('von').value;
        const bis = document.getElementById('bis').value;
        
        // Überschneidungsprüfung
        const events = calendar.getEvents();
        const newStart = new Date(von);
        const newEnd = new Date(bis);
        
        for (let event of events) {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            
            if ((newStart < eventEnd && newEnd > eventStart)) {
                if (!confirm(`Überschneidung mit "${event.title}" festgestellt!\nTrotzdem eintragen?`)) {
                    return;
                }
            }
        }
        
        // Neuen Termin hinzufügen
        const newEvent = {
            id: 'event_' + Date.now(),
            title: name,
            start: von,
            end: bis,
            backgroundColor: getRandomColor(),
            created: new Date().toISOString(),
            createdBy: 'Nutzer-' + Math.floor(Math.random() * 1000)
        };
        
        addEventToGitHub(newEvent);
        document.getElementById('urlaubForm').reset();
    });
    
    // Termine von GitHub laden
    async function loadEventsFromGitHub() {
        try {
            showMessage('Termine werden geladen...', 'info');
            
            const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.fileName}`, {
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const content = JSON.parse(atob(data.content));
                
                // Termine in Kalender laden
                content.forEach(event => {
                    calendar.addEvent(event);
                });
                
                showMessage(`${content.length} Termine geladen`, 'success');
            } else if (response.status === 404) {
                // Datei existiert noch nicht - erstellen
                await saveEventsToGitHub([]);
                showMessage('Neue Termindatei erstellt', 'success');
            } else {
                throw new Error('Fehler beim Laden der Termine');
            }
        } catch (error) {
            console.error('Fehler beim Laden:', error);
            showMessage('Fehler beim Laden der Termine. Lokale Speicherung wird verwendet.', 'error');
            loadEventsFromLocalStorage();
        }
    }
    
    // Termin zu GitHub hinzufügen
    async function addEventToGitHub(newEvent) {
        try {
            showMessage('Termin wird gespeichert...', 'info');
            
            // Aktuelle Termine laden
            const currentEvents = await getCurrentEventsFromGitHub();
            currentEvents.push(newEvent);
            
            // Speichern
            await saveEventsToGitHub(currentEvents);
            
            // In Kalender hinzufügen
            calendar.addEvent(newEvent);
            showMessage('Termin hinzugefügt und gespeichert!', 'success');
            
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            showMessage('Fehler beim Speichern. Termin nur lokal hinzugefügt.', 'error');
            calendar.addEvent(newEvent);
        }
    }
    
    // Termin löschen
    async function deleteEvent(event) {
        try {
            showMessage('Termin wird gelöscht...', 'info');
            
            // Aktuelle Termine laden
            const currentEvents = await getCurrentEventsFromGitHub();
            const filteredEvents = currentEvents.filter(e => e.id !== event.id);
            
            // Speichern
            await saveEventsToGitHub(filteredEvents);
            
            // Aus Kalender entfernen
            event.remove();
            showMessage('Termin gelöscht!', 'success');
            
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            showMessage('Fehler beim Löschen. Nur lokal entfernt.', 'error');
            event.remove();
        }
    }
    
    // Termin bearbeiten
    async function editEvent(event) {
        const newTitle = prompt('Neuer Name:', event.title);
        if (newTitle === null) return;
        
        const newStart = prompt('Neues Startdatum (YYYY-MM-DD):', event.start.toISOString().split('T')[0]);
        if (newStart === null) return;
        
        const newEnd = prompt('Neues Enddatum (YYYY-MM-DD):', event.end.toISOString().split('T')[0]);
        if (newEnd === null) return;
        
        if (new Date(newStart) >= new Date(newEnd)) {
            alert('Startdatum muss vor Enddatum liegen!');
            return;
        }
        
        try {
            showMessage('Termin wird aktualisiert...', 'info');
            
            // Aktuelle Termine laden
            const currentEvents = await getCurrentEventsFromGitHub();
            const eventIndex = currentEvents.findIndex(e => e.id === event.id);
            
            if (eventIndex !== -1) {
                currentEvents[eventIndex] = {
                    ...currentEvents[eventIndex],
                    title: newTitle,
                    start: newStart,
                    end: newEnd,
                    modified: new Date().toISOString()
                };
                
                // Speichern
                await saveEventsToGitHub(currentEvents);
                
                // Kalender aktualisieren
                event.setProp('title', newTitle);
                event.setStart(newStart);
                event.setEnd(newEnd);
                
                showMessage('Termin bearbeitet!', 'success');
            }
            
        } catch (error) {
            console.error('Fehler beim Bearbeiten:', error);
            showMessage('Fehler beim Speichern. Nur lokal bearbeitet.', 'error');
            event.setProp('title', newTitle);
            event.setStart(newStart);
            event.setEnd(newEnd);
        }
    }
    
    // Aktuelle Termine von GitHub abrufen
    async function getCurrentEventsFromGitHub() {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.fileName}`, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return JSON.parse(atob(data.content));
        }
        return [];
    }
    
    // Termine zu GitHub speichern
    async function saveEventsToGitHub(events) {
        // Aktuelle Datei-Info für SHA abrufen
        const currentFile = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.fileName}`, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        const content = btoa(JSON.stringify(events, null, 2));
        const body = {
            message: `Termine aktualisiert: ${new Date().toLocaleString('de-DE')}`,
            content: content
        };
        
        if (currentFile.ok) {
            const fileData = await currentFile.json();
            body.sha = fileData.sha;
        }
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.fileName}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Speichern zu GitHub');
        }
    }
    
    // Fallback: Lokale Speicherung
    function loadEventsFromLocalStorage() {
        const events = JSON.parse(localStorage.getItem('urlaubsTermine') || '[]');
        events.forEach(event => {
            calendar.addEvent(event);
        });
    }
    
    // Hilfsfunktionen
    function getRandomColor() {
        const colors = ['#3788d8', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    function showMessage(message, type) {
        const existingMsg = document.getElementById('message');
        if (existingMsg) existingMsg.remove();
        
        const messageDiv = document.createElement('div');
        messageDiv.id = 'message';
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        document.body.insertBefore(messageDiv, document.body.firstChild);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
    
    // Sync-Button
    window.syncTermine = async function() {
        showMessage('Synchronisiere Termine...', 'info');
        calendar.removeAllEvents();
        await loadEventsFromGitHub();
    };
    
    // Automatische Synchronisation alle 30 Sekunden
    setInterval(async () => {
        try {
            const currentEvents = await getCurrentEventsFromGitHub();
            const calendarEvents = calendar.getEvents();
            
            if (currentEvents.length !== calendarEvents.length) {
                calendar.removeAllEvents();
                currentEvents.forEach(event => calendar.addEvent(event));
                showMessage('Termine automatisch synchronisiert', 'success');
            }
        } catch (error) {
            console.log('Automatische Sync fehlgeschlagen:', error);
        }
    }, 30000);
});
