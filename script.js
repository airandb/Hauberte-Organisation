document.addEventListener('DOMContentLoaded', function () {
    var calendarEl = document.getElementById('calendar');

    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',  // ohne plugins
        events: []
    });

    calendar.render();

    document.getElementById('urlaubForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const von = document.getElementById('von').value;
        const bis = document.getElementById('bis').value;

        calendar.addEvent({
            title: name,
            start: von,
            end: bis
        });

        document.getElementById('urlaubForm').reset();
    });
});
