// Firebase Auth State Listener
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    showToast("Session expired. Please log in.", "error");
    setTimeout(() => window.location.href = "index.html", 2000);
  } else {

    const db = firebase.firestore();
    const uid = user.uid;

    let events = [];
    let reminders = [];

    const isLeapYear = (year) => (
      (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
    );

    const getFebDays = (year) => (isLeapYear(year) ? 29 : 28);

    const month_names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const calendar = document.querySelector('.calendar');
    const month_picker = document.querySelector('#month-picker');
    const dayTextFormate = document.querySelector('.day-text-formate');
    const timeFormate = document.querySelector('.time-formate');
    const dateFormate = document.querySelector('.date-formate');
    const month_list = calendar.querySelector('.month-list');
    let formWrapper = document.querySelector('.event-reminder-form');
    let selectedDateISO = null;
    let isMonthListVisible = false;


    selectedDateISO = new Date().toISOString().substring(0, 10);

    // ✅ Ask Notification Permission
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    const notifiedReminders = new Set();

    const checkDueReminders = () => {
      const now = new Date();
      const nowISO = now.toISOString().substring(0, 10);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      console.log("🕒 Checking reminders at:", new Date().toLocaleTimeString());

      reminders.forEach(reminder => {
        const reminderKey = `${reminder.id}-${reminder.date}-${reminder.time}`;
        const [hh, mm] = reminder.time.split(':').map(Number);
        const reminderMinutes = hh * 60 + mm;
        const diff = Math.abs(nowMinutes - reminderMinutes);

        if (reminder.date === nowISO){ 
          if (Math.abs(diff) <= 1 && !notifiedReminders.has(reminderKey)) {
          console.log("🔔 Triggering reminder:", reminder);

          if (Notification.permission === "granted") {
            new Notification("⏰ Reminder Alert", {
              body: `${reminder.text} (${reminder.importance})`,
            });
          } else {
            showToast(`⏰ Reminder: ${reminder.text} (${reminder.importance})`, "info");
          }
          notifiedReminders.add(reminderKey);
        }
        // Auto Delete reminder if more than 2 minutes have passed
        if (reminder.date === nowISO && reminderMinutes + 2 <= nowMinutes) {
        db.collection("users").doc(uid).collection("reminders").doc(reminder.id).delete()
          .then(() => {
            // Remove from local array
            reminders = reminders.filter(r => r.id !== reminder.id);
            renderReminders();
            console.log(`🗑️ Reminder '${reminder.text}' auto-deleted after 2 minutes`);
          })
          .catch(err => {
            console.error("Error deleting expired reminder:", err);
          });
      }
    }

      });
    };


    function formatDateFull(date) {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(date);
    }

    // setInterval(checkDueReminders, 60000); // Check every 1 min

    // Show toast message
    function showToast(message, type = "success") {
      const toast = document.createElement("div");
      toast.className = `toast-message ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // Custom confirm dialog
    function confirmDialog(message, onConfirm, onCancel) {
      const overlay = document.createElement("div");
      overlay.className = "custom-dialog-overlay";

      const dialog = document.createElement("div");
      dialog.className = "custom-dialog";
      dialog.innerHTML = `
    <p class="confirm-message">${message}</p>
    <div class="dialog-buttons">
      <button class="confirm-btn">✅ Yes</button>
      <button class="cancel-btn">❌ No</button>
    </div>
  `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      dialog.querySelector(".confirm-btn").addEventListener("click", () => {
        onConfirm();
        overlay.remove();
      });

      dialog.querySelector(".cancel-btn").addEventListener("click", () => {
        if (onCancel) onCancel();
        overlay.remove();
      });
    }


    const renderEvents = (filteredEvents = events.filter(e => e.date === selectedDateISO)) => {
      const container = document.querySelector('.events-container');
      container.innerHTML = '';

      if (filteredEvents.length === 0) {
        container.innerHTML = '<p class="no-items">No events scheduled</p>';
        return;
      }

      filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

      filteredEvents.forEach(event => {
        const dateObj = new Date(event.date);
        const formattedDate = `${dateObj.getDate()} ${month_names[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
        const eventEl = document.createElement('div');
        eventEl.classList.add('event-item');
        eventEl.innerHTML = `
      <div class="event-header">
        <span>${formattedDate}</span>
        <span class="event-type">${event.type}</span>
      </div>
      <div class="ent-text-dlt">
        <div class="event-content">${event.title}</div>
        <button class="delete-btn" data-id="${event.id}">🗑️</button>
      </div>
    `;

        eventEl.querySelector('.delete-btn').addEventListener('click', () => {
          confirmDialog("Are you sure you want to delete this event?", () => {
            db.collection("users").doc(uid).collection("events").doc(event.id).delete()
              .then(() => {
                db.collection("users").doc(uid).collection("events").get().then(snapshot => {
                  events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                  generateCalendar(currentMonth.value, currentYear.value);
                  const filtered = events.filter(e => e.date === selectedDateISO);
                  renderEvents(filtered);
                  showToast("Event deleted successfully", "success");
                });
              });
          }, () => showToast("Cancelled", "info"));
        });

        container.appendChild(eventEl);
      });
    };



    const renderReminders = () => {
      const container = document.querySelector('.reminders-container');
      container.innerHTML = '';
      //if no events, display a message
      if (reminders.length === 0) {
        container.innerHTML = '<p class="no-items">No reminders set</p>';
        return;
      }
      const priorityOrder = { High: 1, Medium: 2, Low: 3 };
      reminders.sort((a, b) => {
        if (priorityOrder[a.importance] !== priorityOrder[b.importance]) {
          return priorityOrder[a.importance] - priorityOrder[b.importance];
        }
        const dateCompare = new Date(a.date) - new Date(b.date);
        return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time);
      });
      reminders.forEach(reminder => {
        const dateObj = new Date(reminder.date);
        const formattedDate = `${dateObj.getDate()} ${month_names[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
        const reminderEl = document.createElement('div');
        reminderEl.classList.add('reminder-item', reminder.importance.toLowerCase());
        reminderEl.innerHTML = `
          <div class="reminder-header">
            <span>${formattedDate}</span>
            <span class="reminder-type ${reminder.importance.toLowerCase()}">${reminder.importance}</span>
            
          </div>
          <div class="reminder-content">
          <div class="rem-text-dlt">
            <div>${reminder.text} </div>
              <button class="delete-btn" data-id="${reminder.id}">🗑️</button>
            </div>
            
            <div class="reminder-time">⏰ ${reminder.time}</div>
          </div>
        `;

        // ✅ Delete Reminder
        reminderEl.querySelector('.delete-btn').addEventListener('click', () => {
          confirmDialog("Are you sure you want to delete this event?", () => {
            db.collection("users").doc(uid).collection("reminders").doc(reminder.id).delete()
              .then(() => {
                Promise.all([
                  db.collection("users").doc(uid).collection("events").get(),
                  db.collection("users").doc(uid).collection("reminders").get()
                ]).then(([eventSnapshot, reminderSnapshot]) => {
                  events = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                  reminders = reminderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                  generateCalendar(currentMonth.value, currentYear.value);
                  renderReminders();
                  showToast("Reminder deleted successfully", "success");
                });
              });
          }, () => {
            showToast("Cancelled", "info");
          });
        });
        container.appendChild(reminderEl);
      });
    };

    function loadEventsForSelectedDate() {
      if (!selectedDateISO) return;

      db.collection("users").doc(uid).collection("events")
        .where("date", "==", selectedDateISO)
        .get()
        .then(snapshot => {
          events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderEvents();
        });
    }



    db.collection("users").doc(uid).collection("reminders").get().then(snapshot => {
      reminders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderReminders();

      // Start notification logic
      checkDueReminders();
      setInterval(checkDueReminders, 15000);
    });

    window.addEventListener('focus', checkDueReminders);



    month_picker.addEventListener('click', () => {
      isMonthListVisible = !isMonthListVisible;
      if (isMonthListVisible) {
        month_list.classList.remove('hideonce');
        month_list.classList.remove('hide');
        month_list.classList.add('show');

        dayTextFormate?.classList.remove('showtime');
        dayTextFormate?.classList.add('hidetime');
        timeFormate?.classList.remove('showtime');
        timeFormate?.classList.add('hideTime');
        dateFormate?.classList.remove('showtime');
        dateFormate?.classList.add('hideTime');
        formWrapper?.classList.remove('showtime');
        formWrapper?.classList.add('hideTime');
        formWrapper?.classList.add('hidden');
      } else {
        month_list.classList.replace('show', 'hide');

        dayTextFormate?.classList.remove('hidetime');
        dayTextFormate?.classList.add('showtime');
        timeFormate?.classList.remove('hideTime');
        timeFormate?.classList.add('showtime');
        dateFormate?.classList.remove('hideTime');
        dateFormate?.classList.add('showtime');
        formWrapper?.classList.remove('hideTime');
        formWrapper?.classList.add('showtime');
        formWrapper?.classList.remove('hidden');
      }
    });

    (function () {
      month_list.classList.add('hideonce');
    })();

    document.querySelector('#pre-year').onclick = () => {
      --currentYear.value;
      refreshDataAndGenerateCalendar(currentMonth.value, currentYear.value);
    };

    document.querySelector('#next-year').onclick = () => {
      ++currentYear.value;
      refreshDataAndGenerateCalendar(currentMonth.value, currentYear.value);
    };

    const generateCalendar = (month, year) => {
      const calendar_days = document.querySelector('.calendar-days');
      calendar_days.innerHTML = '';
      const calendar_header_year = document.querySelector('#year');
      const days_of_month = [31, getFebDays(year), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

      const first_day = new Date(year, month);

      month_picker.innerHTML = month_names[month];
      calendar_header_year.innerHTML = year;

      for (let i = 0; i <= days_of_month[month] + first_day.getDay() - 1; i++) {
        let day = document.createElement('div');

        if (i >= first_day.getDay()) {
          let dayNumber = i - first_day.getDay() + 1;
          day.textContent = dayNumber;
          day.classList.add('calendar-day');
          const dateObj = new Date(year, month, dayNumber + 1);
          const dateISO = dateObj.toISOString().substring(0, 10);
          const hasEvent = events.some(e => e.date === dateISO);
          const hasReminder = reminders.some(r => r.date === dateISO);
          if (hasEvent) day.classList.add('has-event');
          if (hasReminder) day.classList.add('has-reminder');


          if (
            dayNumber === new Date().getDate() &&
            year === new Date().getFullYear() &&
            month === new Date().getMonth()
          ) {
            day.classList.add('current-date');
          }

          //show events on selected date
          day.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected-date'));
            day.classList.add('selected-date');

            const displayDateObj = new Date(year, month, dayNumber); // Correct display date
            selectedDateISO = dateObj.toISOString().substring(0, 10); // Keep using dateObj with +1 for internal logic

            // 🗓️ Format: Friday, 12 July 2025
            dateFormate.textContent = new Intl.DateTimeFormat('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            }).format(displayDateObj);

            loadEventsForSelectedDate();
          });
        }

        calendar_days.appendChild(day);
      }
    };

    function refreshDataAndGenerateCalendar(month, year) {
      Promise.all([
        db.collection("users").doc(uid).collection("events").get(),
        db.collection("users").doc(uid).collection("reminders").get()
      ]).then(([eventSnapshot, reminderSnapshot]) => {
        events = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        reminders = reminderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        generateCalendar(month, year);
      });
    }


    const currentMonth = { value: new Date().getMonth() };
    const currentYear = { value: new Date().getFullYear() };

    Promise.all([
      db.collection("users").doc(uid).collection("events").get(),
      db.collection("users").doc(uid).collection("reminders").get()
    ]).then(([eventSnapshot, reminderSnapshot]) => {
      selectedDateISO = new Date().toISOString().substring(0, 10);
      dateFormate.textContent = todayShowDate.textContent; // optional: update date UI
      loadEventsForSelectedDate();

      events = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      reminders = reminderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      generateCalendar(currentMonth.value, currentYear.value);
      renderReminders();
    });

    //show date and time
    const todayShowDate = document.querySelector('.date-formate');
    const todayShowTime = document.querySelector('.time-formate');
    todayShowDate.textContent = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    }).format(new Date());
    setInterval(() => {
      todayShowTime.textContent = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: 'numeric', second: 'numeric'
      }).format(new Date());
    }, 1000);

    month_names.forEach((name, index) => {
      const div = document.createElement('div');
      div.innerHTML = `<div>${name}</div>`;
      month_list.appendChild(div);
      div.addEventListener('click', () => {
        currentMonth.value = index;
        refreshDataAndGenerateCalendar(currentMonth.value, currentYear.value);
        month_list.classList.replace('show', 'hide');
        isMonthListVisible = false;

        //toggle month list on clicking month in the month list
        dayTextFormate?.classList.remove('hideTime');
        dayTextFormate?.classList.add('showtime');
        timeFormate?.classList.remove('hideTime');
        timeFormate?.classList.add('showtime');
        dateFormate?.classList.remove('hideTime');
        dateFormate?.classList.add('showtime');
        formWrapper?.classList.remove('hideTime');
        formWrapper?.classList.add('showtime');
      });
    });

    //show todays date on clicking on the day text
    // const currentMonth = { value: new Date().getMonth() };
    // const currentYear = { value: new Date().getFullYear() };
    generateCalendar(currentMonth.value, currentYear.value);
    document.querySelector('.day-text-formate')?.addEventListener('click', () => {
      const today = new Date();
      currentMonth.value = today.getMonth();
      currentYear.value = today.getFullYear();
      selectedDateISO = today.toISOString().substring(0, 10);
      dateFormate.textContent = formatDateFull(today);
      refreshDataAndGenerateCalendar(currentMonth.value, currentYear.value);
      loadEventsForSelectedDate();
    });



    //toggle event and reminder tabs in the form section
    document.getElementById('eventTab')?.addEventListener('click', () => {
      document.getElementById('eventForm')?.classList.remove('hidden');
      document.getElementById('reminderForm')?.classList.add('hidden');
      document.getElementById('eventTab')?.classList.add('active');
      document.getElementById('reminderTab')?.classList.remove('active');
    });

    //toggle event and reminder tabs in the form section
    document.getElementById('reminderTab')?.addEventListener('click', () => {
      document.getElementById('eventForm')?.classList.add('hidden');
      document.getElementById('reminderForm')?.classList.remove('hidden');
      document.getElementById('reminderTab')?.classList.add('active');
      document.getElementById('eventTab')?.classList.remove('active');
    });


    //add event form submission event listener
    document.getElementById('eventForm')?.addEventListener('submit', function (e) {
      e.preventDefault();
      const dateInput = this.elements.eventDate.value;
  const titleInput = this.elements.eventTitle.value.trim();
  const typeInput = this.elements.eventType.value;

  if (!dateInput || !titleInput || !typeInput) {
    showToast("❗ Please fill in all fields.", "error");
    return;
  }

  // 🔍 Check for duplicate event
  const isDuplicate = events.some(ev =>
    ev.date === dateInput &&
    ev.title.trim().toLowerCase() === titleInput.toLowerCase() &&
    ev.type === typeInput
  );

  if (isDuplicate) {
    showToast("⚠️ Duplicate event already exists!", "error");
    return;
  }
      const newEvent = {
        date: this.elements.eventDate.value,
        title: this.elements.eventTitle.value,
        type: this.elements.eventType.value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      db.collection("users").doc(uid).collection("events").add(newEvent).then(() => {
        // 🔄 Fetch updated events list
        db.collection("users").doc(uid).collection("events").get().then(snapshot => {
          events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          generateCalendar(currentMonth.value, currentYear.value); // Refresh calendar to update colors
          if (selectedDateISO === newEvent.date) {
            renderEvents();
          }
          showToast("Event added successfully", "success");
          this.reset();
        });
      });
    });


    //add reminder form submission event listener
    document.getElementById('reminderForm')?.addEventListener('submit', function (e) {
      e.preventDefault();

      const dateInput = this.elements.reminderDate.value;
      const timeInput = this.elements.reminderTime.value;
       const textInput = this.elements.reminderText.value.trim();
  const importanceInput = this.elements.importanceLevel.value;

      if (!dateInput || !timeInput) {
        showToast("❗ Please fill in both date and time.", "error");
        return;
      }

      const selectedDateTime = new Date(`${dateInput}T${timeInput}`);
      const now = new Date();

      if (selectedDateTime < now) {
        showToast("🚫 Cannot set a reminder in the past!", "error");
        return;
      }

      const isDuplicate = reminders.some(r =>
    r.date === dateInput &&
    r.time === timeInput &&
    r.text.trim().toLowerCase() === textInput.toLowerCase() &&
    r.importance === importanceInput
  );

  if (isDuplicate) {
    showToast("⚠️ Duplicate reminder already exists!", "error");
    return;
  }

      const newReminder = {
        date: this.elements.reminderDate.value,
        text: this.elements.reminderText.value,
        importance: this.elements.importanceLevel.value,
        time: this.elements.reminderTime.value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      //add reminder to reminders array and save it to Firestore
      db.collection("users").doc(uid).collection("reminders").add(newReminder).then(() => {
        Promise.all([
          db.collection("users").doc(uid).collection("events").get(),
          db.collection("users").doc(uid).collection("reminders").get()
        ]).then(([eventSnapshot, reminderSnapshot]) => {
          events = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          reminders = reminderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          generateCalendar(currentMonth.value, currentYear.value);
          renderReminders();
          showToast("Reminder added successfully", "success");
          document.getElementById('reminderForm').reset();
          checkDueReminders();
        });
      });
    });

    //show reminders in the sidebar
    // db.collection("users").doc(uid).collection("reminders").get().then(snapshot => {
    //   reminders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    //   renderReminders();
    // });

    //logout functionality
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      firebase.auth().signOut().then(() => {
        showToast("Logged Out Successfully", "error");
        setTimeout(() => window.location.href = "index.html", 2000);
      });
    });
  }
});
