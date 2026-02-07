// LocalStorage Management
const Storage = {
    // Keys
    KEYS: {
        SUBJECTS: 'attendo_subjects',
        TIMETABLE: 'attendo_timetable',
        HISTORY: 'attendo_history',
        SETTINGS: 'attendo_settings'
    },

    // Initialize
    init: () => {
        if (!Storage.isAvailable()) {
            console.error('LocalStorage not available');
            return false;
        }
        Storage.ensureDataStructure();
        return true;
    },

    // Check availability
    isAvailable: () => {
        try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },

    // Ensure data structure exists
    ensureDataStructure: () => {
        if (!localStorage.getItem(Storage.KEYS.SUBJECTS)) {
            localStorage.setItem(Storage.KEYS.SUBJECTS, JSON.stringify([]));
        }
        if (!localStorage.getItem(Storage.KEYS.TIMETABLE)) {
            const emptyTimetable = {
                sunday: [], monday: [], tuesday: [], wednesday: [],
                thursday: [], friday: [], saturday: []
            };
            localStorage.setItem(Storage.KEYS.TIMETABLE, JSON.stringify(emptyTimetable));
        }
        if (!localStorage.getItem(Storage.KEYS.HISTORY)) {
            localStorage.setItem(Storage.KEYS.HISTORY, JSON.stringify([]));
        }
        if (!localStorage.getItem(Storage.KEYS.SETTINGS)) {
            localStorage.setItem(Storage.KEYS.SETTINGS, JSON.stringify({
                version: '1.0.0',
                defaultTarget: 75,
                theme: 'light',
                firstRun: true
            }));
        }
    },

    // Subjects
    getSubjects: () => {
        try {
            const subjects = JSON.parse(localStorage.getItem(Storage.KEYS.SUBJECTS) || '[]');
            return subjects.map(subject => ({
                id: subject.id || Utils.generateId(),
                name: subject.name || 'Unnamed',
                attended: subject.attended || 0,
                total: subject.total || 0,
                target: subject.target || 75,
                color: subject.color || Utils.getRandomColor(),
                createdAt: subject.createdAt || new Date().toISOString()
            }));
        } catch (e) {
            console.error('Error getting subjects:', e);
            return [];
        }
    },

    saveSubjects: (subjects) => {
        try {
            localStorage.setItem(Storage.KEYS.SUBJECTS, JSON.stringify(subjects));
            return true;
        } catch (e) {
            console.error('Error saving subjects:', e);
            return false;
        }
    },

    addSubject: (subjectData) => {
        const subjects = Storage.getSubjects();
        const newSubject = {
            id: Utils.generateId(),
            name: subjectData.name.trim(),
            attended: 0,
            total: 0,
            target: parseInt(subjectData.target) || 75,
            color: subjectData.color || Utils.getRandomColor(),
            createdAt: new Date().toISOString()
        };
        subjects.push(newSubject);
        return Storage.saveSubjects(subjects);
    },

    updateSubject: (id, updates) => {
        const subjects = Storage.getSubjects();
        const index = subjects.findIndex(s => s.id === id);
        if (index !== -1) {
            subjects[index] = { ...subjects[index], ...updates };
            return Storage.saveSubjects(subjects);
        }
        return false;
    },

    deleteSubject: (id) => {
        const subjects = Storage.getSubjects();
        const filtered = subjects.filter(s => s.id !== id);
        return Storage.saveSubjects(filtered);
    },

    // Timetable
    getTimetable: () => {
        try {
            return JSON.parse(localStorage.getItem(Storage.KEYS.TIMETABLE) || '{}');
        } catch (e) {
            console.error('Error getting timetable:', e);
            return {};
        }
    },

    saveTimetable: (timetable) => {
        try {
            localStorage.setItem(Storage.KEYS.TIMETABLE, JSON.stringify(timetable));
            return true;
        } catch (e) {
            console.error('Error saving timetable:', e);
            return false;
        }
    },

    getSubjectsForDay: (dayName) => {
        const timetable = Storage.getTimetable();
        const dayKey = dayName.toLowerCase();
        return timetable[dayKey] || [];
    },

    // History
    getHistory: () => {
        try {
            return JSON.parse(localStorage.getItem(Storage.KEYS.HISTORY) || '[]');
        } catch (e) {
            console.error('Error getting history:', e);
            return [];
        }
    },

    saveHistory: (history) => {
        try {
            localStorage.setItem(Storage.KEYS.HISTORY, JSON.stringify(history));
            return true;
        } catch (e) {
            console.error('Error saving history:', e);
            return false;
        }
    },

    getHistoryForDate: (date) => {
        const history = Storage.getHistory();
        return history.find(entry => entry.date === date) || { date, entries: [] };
    },

    markAttendance: (date, subjectId, status) => {
        const history = Storage.getHistory();
        let dateEntry = history.find(entry => entry.date === date);
        
        if (!dateEntry) {
            dateEntry = { date, entries: [] };
            history.push(dateEntry);
        }

        // Remove existing entry
        dateEntry.entries = dateEntry.entries.filter(e => e.subjectId !== subjectId);
        
        // Add new entry
        dateEntry.entries.push({
            subjectId,
            status,
            timestamp: new Date().toISOString()
        });

        // Update subject totals
        const subjects = Storage.getSubjects();
        const subjectIndex = subjects.findIndex(s => s.id === subjectId);
        
        if (subjectIndex !== -1) {
            const subject = subjects[subjectIndex];
            
            // Remove old status from totals
            const oldEntry = dateEntry.entries.find(e => e.subjectId === subjectId && e.status !== status);
            if (oldEntry) {
                if (oldEntry.status === 'attended') {
                    subject.attended = Math.max(0, subject.attended - 1);
                    subject.total = Math.max(0, subject.total - 1);
                } else if (oldEntry.status === 'missed') {
                    subject.total = Math.max(0, subject.total - 1);
                }
            }

            // Add new status to totals
            if (status === 'attended') {
                subject.attended += 1;
                subject.total += 1;
            } else if (status === 'missed') {
                subject.total += 1;
            }

            subjects[subjectIndex] = subject;
            Storage.saveSubjects(subjects);
        }

        Storage.saveHistory(history);
        return true;
    },

    undoLastAction: () => {
        const history = Storage.getHistory();
        if (history.length === 0) return null;

        const lastEntry = history[history.length - 1];
        if (lastEntry.entries.length === 0) return null;

        const lastAction = lastEntry.entries[lastEntry.entries.length - 1];
        
        // Remove from history
        lastEntry.entries.pop();
        if (lastEntry.entries.length === 0) {
            history.pop();
        }

        // Revert subject totals
        if (lastAction.status !== 'cancelled') {
            const subjects = Storage.getSubjects();
            const subjectIndex = subjects.findIndex(s => s.id === lastAction.subjectId);
            
            if (subjectIndex !== -1) {
                const subject = subjects[subjectIndex];
                if (lastAction.status === 'attended') {
                    subject.attended = Math.max(0, subject.attended - 1);
                    subject.total = Math.max(0, subject.total - 1);
                } else if (lastAction.status === 'missed') {
                    subject.total = Math.max(0, subject.total - 1);
                }
                subjects[subjectIndex] = subject;
                Storage.saveSubjects(subjects);
            }
        }

        Storage.saveHistory(history);
        return lastAction;
    },

    // Export/Import
    exportData: () => {
        const data = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            subjects: Storage.getSubjects(),
            timetable: Storage.getTimetable(),
            history: Storage.getHistory(),
            settings: JSON.parse(localStorage.getItem(Storage.KEYS.SETTINGS) || '{}')
        };
        return JSON.stringify(data, null, 2);
    },

    importData: (jsonString) => {
        try {
            const data = JSON.parse(jsonString);
            
            if (!data.version || !data.subjects || !data.timetable) {
                throw new Error('Invalid data format');
            }

            // Backup current data
            const backup = Storage.exportData();
            
            // Import new data
            Storage.saveSubjects(data.subjects);
            Storage.saveTimetable(data.timetable);
            Storage.saveHistory(data.history || []);
            
            if (data.settings) {
                localStorage.setItem(Storage.KEYS.SETTINGS, JSON.stringify(data.settings));
            }

            return { success: true, backup };
        } catch (e) {
            console.error('Import failed:', e);
            return { success: false, error: e.message };
        }
    },

    // Clear all data
    clearAllData: () => {
        try {
            const backup = Storage.exportData();
            localStorage.removeItem(Storage.KEYS.SUBJECTS);
            localStorage.removeItem(Storage.KEYS.TIMETABLE);
            localStorage.removeItem(Storage.KEYS.HISTORY);
            localStorage.removeItem(Storage.KEYS.SETTINGS);
            Storage.ensureDataStructure();
            return { success: true, backup };
        } catch (e) {
            console.error('Clear failed:', e);
            return { success: false, error: e.message };
        }
    }
};

// Initialize storage
Storage.init();