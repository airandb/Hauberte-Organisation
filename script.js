document.addEventListener('DOMContentLoaded', function () {
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'de',
        events: [],
        
        // Event-Klicks aktivieren
        eventClick: function(info) {
            // Bestätigungsdialog für Bearbeitung/Löschen
            const action = confirm(`Termin "${info.event.title}" bearbeiten?\n\nOK = Bearbeiten\nAbbrechen = Löschen`);
            
            if (action) {
                // Bearbeiten
                editEvent(info.event);
            } else {
                // Löschen
                if (confirm(`Termin "${info.event.title}" wirklich löschen?`)) {
                    info.event.remove();
                    showMessage('Termin gelöscht!', 'success');
                }
            }
        },
        
        // Tooltip beim Hover
        eventMouseEnter: function(info) {
            info.el.title = `${info.event.title} (Klicken zum Bearbeiten/Löschen)`;
        }
    });
    
    calendar.render();
    
    // Formular für neuen Termin
    document.getElementById('urlaubForm').addEventListener('submit', function (e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const von = document.getElementById('von').value;
        const bis = document.getElementById('bis').value;
        
        // Prüfen ob Zeitraum bereits belegt
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
        
        // Event hinzufügen
        calendar.addEvent({
            title: name,
            start: von,
            end: bis,
            backgroundColor: getRandomColor()
        });
        
        document.getElementById('urlaubForm').reset();
        showMessage('Termin hinzugefügt!', 'success');
    });
    
    // Event bearbeiten
    function editEvent(event) {
        const newTitle = prompt('Neuer Name:', event.title);
        if (newTitle === null) return; // Abbruch
        
        const newStart = prompt('Neues Startdatum (YYYY-MM-DD):', event.start.toISOString().split('T')[0]);
        if (newStart === null) return;
        
        const newEnd = prompt('Neues Enddatum (YYYY-MM-DD):', event.end.toISOString().split('T')[0]);
        if (newEnd === null) return;
        
        // Validierung
        if (new Date(newStart) >= new Date(newEnd)) {
            alert('Startdatum muss vor Enddatum liegen!');
            return;
        }
        
        // Event aktualisieren
        event.setProp('title', newTitle);
        event.setStart(newStart);
        event.setEnd(newEnd);
        
        showMessage('Termin bearbeitet!', 'success');
    }
    
    // Zufällige Farbe für Events
    function getRandomColor() {
        const colors = ['#3788d8', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Benachrichtigung anzeigen
    function showMessage(message, type) {
        // Bestehende Nachricht entfernen
        const existingMsg = document.getElementById('message');
        if (existingMsg) existingMsg.remove();
        
        const messageDiv = document.createElement('div');
        messageDiv.id = 'message';
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        document.body.insertBefore(messageDiv, document.body.firstChild);
        
        // Nach 3 Sekunden ausblenden
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
});
