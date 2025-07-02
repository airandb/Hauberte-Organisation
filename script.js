document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'de',
        events: []
    });

    calendar.render();

    document.getElementById('urlaubForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const von = document.getElementById('von').value;
        const bis = document.getElementById('bis').value;

        if (name && von && bis) {
            calendar.addEvent({
                title: name,
                start: von,
                end: bis,
                allDay: true
            });

            this.reset();
        }
    });
});
