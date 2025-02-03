class Timer {
    constructor(name, duration, remaining = null, isRunning = false, color = '#4CAF50') {
        this.name = name;
        this.duration = duration * 60; // Umrechnung in Sekunden
        this.remaining = remaining !== null ? remaining : this.duration;
        this.isRunning = isRunning;
        this.element = null;
        this.interval = null;
        this.id = Date.now().toString(); // Eindeutige ID für jeden Timer
        this.color = color;
    }

    createTimerElement() {
        const timerElement = document.createElement('div');
        timerElement.className = 'timer';
        timerElement.innerHTML = `
            <div class="timer-bar">
                <div class="timer-progress" style="height: ${(this.remaining / this.duration) * 100}%; background-color: ${this.color}"></div>
                <div class="timer-remaining-display">${this.formatTime()}</div>
            </div>
            <div class="timer-info">
                <div class="timer-name">${this.name}</div>
            </div>
            <div class="timer-controls">
                <button class="btn start-pause" style="background-color: ${this.color}" title="Start/Pause">
                    <i class="fas fa-play"></i>
                </button>
                <button class="btn reset" style="background-color: ${this.color}" title="Zurücksetzen">
                    <i class="fas fa-redo"></i>
                </button>
                <button class="btn remove" style="background-color: ${this.color}" title="Entfernen">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        this.element = timerElement;
        timerElement.__timer = this;
        this.setupControls();
        return timerElement;
    }

    setupControls() {
        const startPauseBtn = this.element.querySelector('.start-pause');
        const resetBtn = this.element.querySelector('.reset');
        const removeBtn = this.element.querySelector('.remove');

        startPauseBtn.addEventListener('click', () => this.toggleTimer());
        resetBtn.addEventListener('click', () => this.reset());
        removeBtn.addEventListener('click', () => this.remove());
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            const startPauseBtn = this.element.querySelector('.start-pause');
            startPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            this.interval = setInterval(() => this.tick(), 1000);
        }
    }

    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            const startPauseBtn = this.element.querySelector('.start-pause');
            startPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            clearInterval(this.interval);
        }
    }

    reset() {
        this.pause();
        this.remaining = this.duration;
        this.updateDisplay();
    }

    remove() {
        this.pause();
        this.element.remove();
        TimerStorage.removeTimer(this.id);
    }

    tick() {
        if (this.remaining > 0) {
            this.remaining--;
            this.updateDisplay();
        } else {
            this.pause();
            this.timerComplete();
        }
    }

    updateDisplay() {
        const progress = (this.remaining / this.duration) * 100;
        this.element.querySelector('.timer-progress').style.height = `${progress}%`;
        this.element.querySelector('.timer-remaining-display').textContent = this.formatTime();
    }

    formatTime() {
        const minutes = Math.floor(this.remaining / 60);
        const seconds = this.remaining % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    timerComplete() {
        // Hier können Sie Benachrichtigungen hinzufügen
        alert(`Timer "${this.name}" ist abgelaufen!`);
    }

    // Neue Methode zum Serialisieren des Timers
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            duration: this.duration / 60, // Zurück zu Minuten für die Speicherung
            remaining: this.remaining,
            isRunning: this.isRunning,
            color: this.color
        };
    }
}

// Neue Klasse für die Timer-Speicherung
class TimerStorage {
    static STORAGE_KEY = 'multi_timers';

    static saveTimer(timer) {
        const timers = this.getAllTimers();
        timers[timer.id] = timer.toJSON();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(timers));
    }

    static removeTimer(timerId) {
        const timers = this.getAllTimers();
        delete timers[timerId];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(timers));
    }

    static getAllTimers() {
        const timersJson = localStorage.getItem(this.STORAGE_KEY);
        return timersJson ? JSON.parse(timersJson) : {};
    }

    static clearAllTimers() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}

// Dialog-Steuerung und Timer-Verwaltung
document.addEventListener('DOMContentLoaded', () => {
    const addTimerBtn = document.getElementById('add-timer');
    const timerDialog = document.getElementById('timer-dialog');
    const timerForm = document.getElementById('timer-form');
    const cancelBtn = document.getElementById('cancel-timer');
    const timerContainer = document.getElementById('timer-container');

    // Farbauswahl-Logik
    let selectedColor = '#4CAF50'; // Standardfarbe
    const colorPicker = document.querySelector('.color-picker');

    colorPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-option')) {
            // Entferne die Auswahl von allen Optionen
            document.querySelectorAll('.color-option').forEach(option => {
                option.classList.remove('selected');
            });
            
            // Markiere die ausgewählte Option
            e.target.classList.add('selected');
            
            // Speichere die ausgewählte Farbe
            selectedColor = e.target.dataset.color;
        }
    });

    // Wähle die erste Farboption standardmäßig aus
    document.querySelector('.color-option').classList.add('selected');

    // Laden der gespeicherten Timer beim Start
    const loadSavedTimers = () => {
        const savedTimers = TimerStorage.getAllTimers();
        Object.values(savedTimers).forEach(timerData => {
            const timer = new Timer(
                timerData.name,
                timerData.duration,
                timerData.remaining,
                false,
                timerData.color
            );
            timer.id = timerData.id;
            timerContainer.appendChild(timer.createTimerElement());
            TimerStorage.saveTimer(timer);
        });
    };

    // Timer-Dialog-Events
    addTimerBtn.addEventListener('click', () => {
        timerDialog.showModal();
    });

    cancelBtn.addEventListener('click', () => {
        resetPresets();
        timerDialog.close();
    });

    // Preset-Button-Logik
    const durationInput = document.getElementById('timer-duration');
    const presetButtons = document.querySelectorAll('.preset-btn');

    presetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const duration = e.target.dataset.duration;
            durationInput.value = duration;
            
            // Aktiven Button markieren
            presetButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Wenn der Benutzer manuell einen Wert eingibt, Preset-Auswahl aufheben
    durationInput.addEventListener('input', () => {
        presetButtons.forEach(btn => btn.classList.remove('active'));
    });

    // Formular zurücksetzen auch für Presets
    const resetPresets = () => {
        presetButtons.forEach(btn => btn.classList.remove('active'));
    };

    timerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('timer-name').value;
        const duration = parseInt(document.getElementById('timer-duration').value);

        const timer = new Timer(name, duration, null, false, selectedColor);
        timerContainer.appendChild(timer.createTimerElement());
        TimerStorage.saveTimer(timer);

        resetPresets();
        timerForm.reset();
        // Setze die Farbauswahl zurück
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector('.color-option').classList.add('selected');
        selectedColor = '#4CAF50';
        timerDialog.close();
    });

    // Automatisches Speichern der Timer-Zustände
    setInterval(() => {
        const timerElements = timerContainer.querySelectorAll('.timer');
        timerElements.forEach(element => {
            const timer = element.__timer;
            if (timer) {
                TimerStorage.saveTimer(timer);
            }
        });
    }, 1000);

    // Laden der gespeicherten Timer beim Start
    loadSavedTimers();
}); 