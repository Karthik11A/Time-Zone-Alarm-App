class TimezoneConverter {
    constructor() {
        this.alarms = [];
        this.currentAlarm = null;
        this.alarmSound = null;
        this.settings = {
            notifications: false,
            sound: true
        };
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupElements();
        this.populateTimezones();
        this.setupEventListeners();
        this.startCurrentTimeClock();
        this.setDefaultDateTime();
        this.checkAlarms();
        this.requestNotificationPermission();
        this.createAlarmSound();
    }

    setupElements() {
        // Get all DOM elements
        this.elements = {
            currentTime: document.getElementById('currentTime'),
            currentTimezone: document.getElementById('currentTimezone'),
            sourceTimezone: document.getElementById('sourceTimezone'),
            destinationTimezone: document.getElementById('destinationTimezone'),
            inputDate: document.getElementById('inputDate'),
            inputTime: document.getElementById('inputTime'),
            conversionResult: document.getElementById('conversionResult'),
            setAlarmBtn: document.getElementById('setAlarmBtn'),
            clearAlarmBtn: document.getElementById('clearAlarmBtn'),
            alarmStatus: document.getElementById('alarmStatus'),
            countdown: document.getElementById('countdown'),
            activeAlarms: document.getElementById('activeAlarms'),
            alarmList: document.getElementById('alarmList'),
            notificationsEnabled: document.getElementById('notificationsEnabled'),
            soundEnabled: document.getElementById('soundEnabled'),
            testAlarmBtn: document.getElementById('testAlarmBtn'),
            alarmModal: document.getElementById('alarmModal'),
            closeAlarmModal: document.getElementById('closeAlarmModal'),
            alarmMessage: document.getElementById('alarmMessage'),
            snoozeBtn: document.getElementById('snoozeBtn'),
            dismissBtn: document.getElementById('dismissBtn')
        };
    }

    populateTimezones() {
        // Get all available timezones from Luxon
        const timezones = [
            'UTC',
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'America/Toronto',
            'America/Vancouver',
            'America/Mexico_City',
            'America/Sao_Paulo',
            'America/Buenos_Aires',
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin',
            'Europe/Rome',
            'Europe/Madrid',
            'Europe/Amsterdam',
            'Europe/Stockholm',
            'Europe/Moscow',
            'Asia/Tokyo',
            'Asia/Shanghai',
            'Asia/Hong_Kong',
            'Asia/Singapore',
            'Asia/Seoul',
            'IST',
            'Asia/Dubai',
            'Asia/Jakarta',
            'Asia/Bangkok',
            'Australia/Sydney',
            'Australia/Melbourne',
            'Australia/Perth',
            'Pacific/Auckland',
            'Pacific/Honolulu',
            'Africa/Cairo',
            'Africa/Johannesburg',
            'Africa/Lagos'
        ];

        // Filter out invalid timezones
        const validTimezones = timezones.filter(tz => {
            try {
                const dt = luxon.DateTime.local().setZone(tz);
                return dt.isValid;
            } catch {
                return false;
            }
        });

        // Sort timezones alphabetically
        validTimezones.sort();

        // Populate both select elements
        [this.elements.sourceTimezone, this.elements.destinationTimezone].forEach(select => {
            validTimezones.forEach(tz => {
                const option = document.createElement('option');
                option.value = tz;
                option.textContent = this.formatTimezoneLabel(tz);
                select.appendChild(option);
            });
        });

        // Set default timezones
        const userTimezone = luxon.DateTime.local().zoneName;
        this.elements.sourceTimezone.value = userTimezone;
        this.elements.destinationTimezone.value = 'UTC';
    }

    formatTimezoneLabel(timezone) {
        // Format timezone for display
        try {
            const dt = luxon.DateTime.local().setZone(timezone);
            if (!dt.isValid) {
                return timezone;
            }
            const offset = dt.toFormat('ZZ');
            
            // Special cases for abbreviations
            if (timezone === 'IST') {
                return `Indian Standard Time (${offset})`;
            }
            
            let city = timezone.split('/').pop().replace(/_/g, ' ');
            return `${city} (${offset})`;
        } catch (error) {
            console.warn(`Invalid timezone: ${timezone}`, error);
            return timezone;
        }
    }

    setupEventListeners() {
        // Timezone and time input changes
        [this.elements.sourceTimezone, this.elements.destinationTimezone, 
         this.elements.inputDate, this.elements.inputTime].forEach(element => {
            element.addEventListener('change', () => this.convertTime());
        });

        // Alarm buttons
        this.elements.setAlarmBtn.addEventListener('click', () => this.setAlarm());
        this.elements.clearAlarmBtn.addEventListener('click', () => this.clearAllAlarms());

        // Settings
        this.elements.notificationsEnabled.addEventListener('change', () => this.saveSettings());
        this.elements.soundEnabled.addEventListener('change', () => this.saveSettings());
        this.elements.testAlarmBtn.addEventListener('click', () => this.testAlarm());

        // Modal events
        this.elements.closeAlarmModal.addEventListener('click', () => this.closeAlarmModal());
        this.elements.snoozeBtn.addEventListener('click', () => this.snoozeAlarm());
        this.elements.dismissBtn.addEventListener('click', () => this.dismissAlarm());

        // Close modal when clicking outside
        this.elements.alarmModal.addEventListener('click', (e) => {
            if (e.target === this.elements.alarmModal) {
                this.closeAlarmModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.alarmModal.style.display !== 'none') {
                this.closeAlarmModal();
            }
        });
    }

    setDefaultDateTime() {
        // Set current date and time as default
        const now = luxon.DateTime.local();
        this.elements.inputDate.value = now.toISODate();
        this.elements.inputTime.value = now.toFormat('HH:mm');
        this.convertTime();
    }

    startCurrentTimeClock() {
        const updateCurrentTime = () => {
            const now = luxon.DateTime.local();
            this.elements.currentTime.textContent = now.toFormat('HH:mm:ss');
            this.elements.currentTimezone.textContent = now.toFormat('EEEE, MMMM d, yyyy (ZZZZ)');
        };

        updateCurrentTime();
        setInterval(updateCurrentTime, 1000);
    }

    convertTime() {
        const sourceTimezone = this.elements.sourceTimezone.value;
        const destinationTimezone = this.elements.destinationTimezone.value;
        const inputDate = this.elements.inputDate.value;
        const inputTime = this.elements.inputTime.value;

        if (!sourceTimezone || !destinationTimezone || !inputDate || !inputTime) {
            this.updateResult('Select timezones and time to convert', '', false);
            return;
        }

        try {
            // Create DateTime object in source timezone
            const sourceDateTime = luxon.DateTime.fromISO(`${inputDate}T${inputTime}`, {
                zone: sourceTimezone
            });

            if (!sourceDateTime.isValid) {
                this.updateResult('Invalid date or time', '', false);
                return;
            }

            // Convert to destination timezone
            const destinationDateTime = sourceDateTime.setZone(destinationTimezone);

            // Format the result
            const timeString = destinationDateTime.toFormat('HH:mm:ss');
            const dateString = destinationDateTime.toFormat('EEEE, MMMM d, yyyy');
            const timezoneString = destinationDateTime.toFormat('ZZZZ');

            this.updateResult(
                `${timeString}`,
                `${dateString} (${timezoneString})`,
                true
            );

            // Store the converted time for alarm setting
            this.convertedDateTime = destinationDateTime;

        } catch (error) {
            console.error('Conversion error:', error);
            this.updateResult('Error converting time', error.message, false);
        }
    }

    updateResult(time, timezone, hasResult) {
        const resultCard = this.elements.conversionResult;
        const resultTime = resultCard.querySelector('.result-time');
        const resultTimezone = resultCard.querySelector('.result-timezone');

        resultTime.textContent = time;
        resultTimezone.textContent = timezone;

        if (hasResult) {
            resultCard.classList.add('has-result');
        } else {
            resultCard.classList.remove('has-result');
        }
    }

    setAlarm() {
        if (!this.convertedDateTime) {
            alert('Please convert a time first before setting an alarm.');
            return;
        }

        const alarmTime = this.convertedDateTime;
        const now = luxon.DateTime.local();

        // Check if alarm time is in the future
        if (alarmTime <= now) {
            alert('Alarm time must be in the future.');
            return;
        }

        // Create alarm object
        const alarm = {
            id: Date.now(),
            time: alarmTime,
            timezone: alarmTime.zoneName,
            originalTime: alarmTime.toISO(),
            isActive: true
        };

        this.alarms.push(alarm);
        this.updateAlarmDisplay();
        this.saveAlarms();

        // Show success message
        this.showNotification('Alarm set successfully!', 'success');
    }

    clearAllAlarms() {
        this.alarms = [];
        this.currentAlarm = null;
        this.updateAlarmDisplay();
        this.saveAlarms();
        this.showNotification('All alarms cleared!', 'info');
    }

    removeAlarm(alarmId) {
        this.alarms = this.alarms.filter(alarm => alarm.id !== alarmId);
        if (this.currentAlarm && this.currentAlarm.id === alarmId) {
            this.currentAlarm = null;
        }
        this.updateAlarmDisplay();
        this.saveAlarms();
    }

    updateAlarmDisplay() {
        const hasAlarms = this.alarms.length > 0;

        // Show/hide alarm status and active alarms sections
        this.elements.alarmStatus.style.display = hasAlarms ? 'block' : 'none';
        this.elements.activeAlarms.style.display = hasAlarms ? 'block' : 'none';
        this.elements.clearAlarmBtn.style.display = hasAlarms ? 'inline-flex' : 'none';

        if (hasAlarms) {
            // Update alarm list
            this.elements.alarmList.innerHTML = '';
            this.alarms.forEach(alarm => {
                const alarmItem = this.createAlarmItem(alarm);
                this.elements.alarmList.appendChild(alarmItem);
            });

            // Show status for next alarm
            const nextAlarm = this.getNextAlarm();
            if (nextAlarm) {
                const alarmText = this.elements.alarmStatus.querySelector('.alarm-text');
                alarmText.textContent = `Next alarm: ${nextAlarm.time.toFormat('HH:mm:ss on MMMM d, yyyy')} (${nextAlarm.timezone})`;
            }
        }
    }

    createAlarmItem(alarm) {
        const item = document.createElement('div');
        item.className = 'alarm-item';
        item.innerHTML = `
            <div class="alarm-details">
                <div class="alarm-time">${alarm.time.toFormat('HH:mm:ss')}</div>
                <div class="alarm-timezone">${alarm.time.toFormat('MMMM d, yyyy')} (${alarm.timezone})</div>
            </div>
            <button class="remove-alarm" onclick="app.removeAlarm(${alarm.id})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        return item;
    }

    getNextAlarm() {
        const now = luxon.DateTime.local();
        const futureAlarms = this.alarms
            .filter(alarm => alarm.time > now)
            .sort((a, b) => a.time - b.time);
        
        return futureAlarms[0] || null;
    }

    checkAlarms() {
        setInterval(() => {
            const now = luxon.DateTime.local();
            
            // Update countdown for next alarm
            const nextAlarm = this.getNextAlarm();
            if (nextAlarm) {
                const diff = nextAlarm.time.diff(now, ['hours', 'minutes', 'seconds']);
                const countdown = `${Math.floor(diff.hours)}h ${Math.floor(diff.minutes)}m ${Math.floor(diff.seconds)}s`;
                this.elements.countdown.textContent = countdown;
            }

            // Check if any alarm should trigger
            this.alarms.forEach(alarm => {
                if (alarm.isActive && Math.abs(alarm.time.diff(now, 'seconds').seconds) < 1) {
                    this.triggerAlarm(alarm);
                }
            });

            // Remove past alarms
            this.alarms = this.alarms.filter(alarm => alarm.time > now.minus({ minutes: 5 }));
            
        }, 1000);
    }

    triggerAlarm(alarm) {
        alarm.isActive = false;
        this.currentAlarm = alarm;
        
        // Show modal
        this.showAlarmModal(alarm);
        
        // Play sound
        if (this.settings.sound) {
            this.playAlarmSound();
        }
        
        // Send notification
        if (this.settings.notifications && Notification.permission === 'granted') {
            new Notification('⏰ Alarm!', {
                body: `Your alarm for ${alarm.time.toFormat('HH:mm')} is ringing!`,
                icon: 'alarm.svg',
                requireInteraction: true
            });
        }

        this.updateAlarmDisplay();
        this.saveAlarms();
    }

    showAlarmModal(alarm) {
        this.elements.alarmMessage.innerHTML = `
            <strong>Your alarm is ringing!</strong><br>
            <span style="font-family: monospace; font-size: 1.5em; color: #667eea;">
                ${alarm.time.toFormat('HH:mm:ss')}
            </span><br>
            ${alarm.time.toFormat('MMMM d, yyyy')} (${alarm.timezone})
        `;
        this.elements.alarmModal.style.display = 'flex';
    }

    closeAlarmModal() {
        this.elements.alarmModal.style.display = 'none';
        this.stopAlarmSound();
    }

    snoozeAlarm() {
        if (this.currentAlarm) {
            // Add 5 minutes to the alarm
            const snoozeTime = this.currentAlarm.time.plus({ minutes: 5 });
            const newAlarm = {
                ...this.currentAlarm,
                id: Date.now(),
                time: snoozeTime,
                isActive: true
            };
            this.alarms.push(newAlarm);
            this.saveAlarms();
            this.updateAlarmDisplay();
        }
        this.closeAlarmModal();
    }

    dismissAlarm() {
        this.closeAlarmModal();
    }

    createAlarmSound() {
        // Create an audio context and generate a beep sound
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    playAlarmSound() {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);

        // Repeat the beep every second
        this.alarmSoundInterval = setInterval(() => {
            if (this.elements.alarmModal.style.display === 'none') {
                this.stopAlarmSound();
                return;
            }

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
            osc.type = 'sine';

            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
            gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);

            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + 0.5);
        }, 1000);
    }

    stopAlarmSound() {
        if (this.alarmSoundInterval) {
            clearInterval(this.alarmSoundInterval);
            this.alarmSoundInterval = null;
        }
    }

    testAlarm() {
        if (this.settings.sound) {
            this.playAlarmSound();
            setTimeout(() => this.stopAlarmSound(), 3000);
        }

        if (this.settings.notifications && Notification.permission === 'granted') {
            new Notification('🔊 Test Notification', {
                body: 'This is how your alarm notifications will look!',
                icon: 'alarm.svg'
            });
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.elements.notificationsEnabled.checked = permission === 'granted';
            this.settings.notifications = permission === 'granted';
            this.saveSettings();
        }
    }

    showNotification(message, type = 'info') {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#667eea'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    saveSettings() {
        this.settings.notifications = this.elements.notificationsEnabled.checked;
        this.settings.sound = this.elements.soundEnabled.checked;
        localStorage.setItem('timezoneConverterSettings', JSON.stringify(this.settings));
    }

    async loadSettings() {
        try {
            const saved = localStorage.getItem('timezoneConverterSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.log('Error loading settings:', e);
        }

        // Update UI after DOM is ready
        setTimeout(() => {
            if (this.elements.notificationsEnabled) {
                this.elements.notificationsEnabled.checked = this.settings.notifications;
            }
            if (this.elements.soundEnabled) {
                this.elements.soundEnabled.checked = this.settings.sound;
            }
        }, 100);
    }

    saveAlarms() {
        const alarmsData = this.alarms.map(alarm => ({
            ...alarm,
            originalTime: alarm.time.toISO()
        }));
        localStorage.setItem('timezoneConverterAlarms', JSON.stringify(alarmsData));
    }

    loadAlarms() {
        try {
            const saved = localStorage.getItem('timezoneConverterAlarms');
            if (saved) {
                const alarmsData = JSON.parse(saved);
                this.alarms = alarmsData
                    .map(alarm => ({
                        ...alarm,
                        time: luxon.DateTime.fromISO(alarm.originalTime)
                    }))
                    .filter(alarm => alarm.time > luxon.DateTime.local());
                
                this.updateAlarmDisplay();
            }
        } catch (e) {
            console.log('Error loading alarms:', e);
        }
    }
}

// CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TimezoneConverter();
});

// Service Worker registration for offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
