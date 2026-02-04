// LocalStorage Management
const Storage = {
    // Keys
    KEYS: {
        SUBJECTS: 'attendance_subjects',
        TIMETABLE: 'attendance_timetable',
        HISTORY: 'attendance_history',
        SETTINGS: 'attendance_settings',
        META: 'attendance_meta'
    },

    // Initialize storage
    init: () => {
        // Check if storage is available
        if (!Storage.isAvailable()) {
            console.error('LocalStorage is not available');
            return false;
        }

        // Initialize data structure if not exists
        Storage.ensureDataStructure();
        return true;
    },

    // Check if localStorage is available
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
        // Subjects
        if (!localStorage.getItem(Storage.KEYS.SUBJECTS)) {
            localStorage.setItem(Storage.KEYS.SUBJECTS, JSON.stringify([]));
        }

        // Timetable
        if (!localStorage.getItem(Storage.KEYS.TIMETABLE)) {
            const emptyTimetable = {
                sunday: [],
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: []
            };
            localStorage.setItem(Storage.KEYS.TIMETABLE, JSON.stringify(emptyTimetable));
        }

        // History
        if (!localStorage.getItem(Storage.KEYS.HISTORY)) {
            localStorage.setItem(Storage.KEYS.HISTORY, JSON.stringify([]));
        }

        // Settings
        if (!localStorage.getItem(Storage.KEYS.SETTINGS)) {
            const defaultSettings = {
                version: '1.0.0',
                defaultTarget: 75,
                enableNotifications: false,
                theme: 'light',
                swipeSensitivity: 100,
                firstRun: true
            };
            localStorage.setItem(Storage.KEYS.SETTINGS, JSON.stringify(defaultSettings));
        }

        // Meta
        if (!localStorage.getItem(Storage.KEYS.META)) {
            const meta = {
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                totalOperations: 0
            };
            localStorage.setItem(Storage.KEYS.META, JSON.stringify(meta));
        }
    },

    // Subjects
    getSubjects: () => {
        try {
            const subjects = JSON.parse(localStorage.getItem(Storage.KEYS.SUBJECTS) || '[]');
            return subjects.map(subject => ({
                ...subject,
                attended: subject.attended || 0,
                total: subject.total || 0,
                target: subject.target || 75,
                color: subject.color || '#6366f1'
            }));
        } catch (e) {
            console.error('Error getting subjects:', e);
            return [];
        }
    },

    saveSubjects: (subjects) => {
        try {
            localStorage.setItem(Storage.KEYS.SUBJECTS, JSON.stringify(subjects));
            Storage.updateMeta();
            return true;
        } catch (e) {
            console.error('Error saving subjects:', e);
            return false;
        }
    },

    addSubject: (subject) => {
        const subjects = Storage.getSubjects();
        const newSubject = {
            id: Utils.generateId(),
            name: subject.name.trim(),
            attended: 0,
            total: 0,
            target: parseInt(subject.target) || 75,
            color: subject.color || '#6366f1',
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
            return {
                sunday: [],
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: []
            };
        }
    },

    saveTimetable: (timetable) => {
        try {
            localStorage.setItem(Storage.KEYS.TIMETABLE, JSON.stringify(timetable));
            Storage.updateMeta();
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
            Storage.updateMeta();
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

        // Remove existing entry for this subject on this date
        dateEntry.entries = dateEntry.entries.filter(entry => entry.subjectId !== subjectId);
        
        // Add new entry
        dateEntry.entries.push({ subjectId, status, timestamp: new Date().toISOString() });

        // Update subject totals
        const subjects = Storage.getSubjects();
        const subjectIndex = subjects.findIndex(s => s.id === subjectId);
        
        if (subjectIndex !== -1) {
            const subject = subjects[subjectIndex];
            const oldEntry = dateEntry.entries.find(e => e.subjectId === subjectId && e.status !== status);
            
            if (oldEntry) {
                // Remove old status from totals
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
            // 'cancelled' doesn't affect totals

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
        const subjects = Storage.getSubjects();
        const subjectIndex = subjects.findIndex(s => s.id === lastAction.subjectId);
        
        if (subjectIndex !== -1 && lastAction.status !== 'cancelled') {
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

        Storage.saveHistory(history);
        return lastAction;
    },

    // Settings
    getSettings: () => {
        try {
            return JSON.parse(localStorage.getItem(Storage.KEYS.SETTINGS) || '{}');
        } catch (e) {
            console.error('Error getting settings:', e);
            return {};
        }
    },

    saveSettings: (settings) => {
        try {
            localStorage.setItem(Storage.KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.error('Error saving settings:', e);
            return false;
        }
    },

    updateSetting: (key, value) => {
        const settings = Storage.getSettings();
        settings[key] = value;
        return Storage.saveSettings(settings);
    },

    // Meta
    updateMeta: () => {
        try {
            const meta = Storage.getMeta();
            meta.lastModified = new Date().toISOString();
            meta.totalOperations = (meta.totalOperations || 0) + 1;
            localStorage.setItem(Storage.KEYS.META, JSON.stringify(meta));
        } catch (e) {
            console.error('Error updating meta:', e);
        }
    },

    getMeta: () => {
        try {
            return JSON.parse(localStorage.getItem(Storage.KEYS.META) || '{}');
        } catch (e) {
            console.error('Error getting meta:', e);
            return {};
        }
    },

    // Export/Import
    exportData: () => {
        const data = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            subjects: Storage.getSubjects(),
            timetable: Storage.getTimetable(),
            history: Storage.getHistory(),
            settings: Storage.getSettings(),
            meta: Storage.getMeta()
        };
        return JSON.stringify(data, null, 2);
    },

    importData: (jsonString) => {
        try {
            const data = JSON.parse(jsonString);
            
            // Validate data
            if (!data.version || !data.subjects || !data.timetable || !data.history) {
                throw new Error('Invalid data format');
            }

            // Backup current data
            const backup = Storage.exportData();
            
            // Import data
            localStorage.setItem(Storage.KEYS.SUBJECTS, JSON.stringify(data.subjects || []));
            localStorage.setItem(Storage.KEYS.TIMETABLE, JSON.stringify(data.timetable || {}));
            localStorage.setItem(Storage.KEYS.HISTORY, JSON.stringify(data.history || []));
            
            if (data.settings) {
                localStorage.setItem(Storage.KEYS.SETTINGS, JSON.stringify(data.settings));
            }
            
            if (data.meta) {
                localStorage.setItem(Storage.KEYS.META, JSON.stringify(data.meta));
            }

            Storage.updateMeta();
            return { success: true, backup };
        } catch (e) {
            console.error('Error importing data:', e);
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
            localStorage.removeItem(Storage.KEYS.META);
            Storage.ensureDataStructure();
            return { success: true, backup };
        } catch (e) {
            console.error('Error clearing data:', e);
            return { success: false, error: e.message };
        }
    },

    // Statistics
    getStatistics: () => {
        const subjects = Storage.getSubjects();
        const history = Storage.getHistory();
        
        let totalClasses = 0;
        let attendedClasses = 0;
        
        subjects.forEach(subject => {
            totalClasses += subject.total;
            attendedClasses += subject.attended;
        });

        const overallPercentage = totalClasses > 0 
            ? Math.round((attendedClasses / totalClasses) * 100)
            : 0;

        // Calculate subject performance
        const subjectPerformance = subjects.map(subject => {
            const percentage = Utils.calculatePercentage(subject.attended, subject.total);
            const riskLevel = Utils.getRiskLevel(percentage, subject.target);
            const needed = Utils.calculateNeeded(subject.attended, subject.total, subject.target);
            const safe = Utils.calculateSafeToMiss(subject.attended, subject.total, subject.target);
            
            return {
                ...subject,
                percentage,
                riskLevel,
                needed,
                safe
            };
        });

        // Calculate weekly pattern
        const weeklyPattern = {
            sunday: { attended: 0, total: 0 },
            monday: { attended: 0, total: 0 },
            tuesday: { attended: 0, total: 0 },
            wednesday: { attended: 0, total: 0 },
            thursday: { attended: 0, total: 0 },
            friday: { attended: 0, total: 0 },
            saturday: { attended: 0, total: 0 }
        };

        history.forEach(day => {
            const date = new Date(day.date);
            const dayName = Utils.getShortDayName(date).toLowerCase();
            
            day.entries.forEach(entry => {
                if (entry.status === 'attended') {
                    weeklyPattern[dayName].attended += 1;
                    weeklyPattern[dayName].total += 1;
                } else if (entry.status === 'missed') {
                    weeklyPattern[dayName].total += 1;
                }
            });
        });

        // Find at-risk subjects
        const atRiskSubjects = subjectPerformance
            .filter(subject => subject.riskLevel === 'high')
            .sort((a, b) => a.percentage - b.percentage);

        // Find subjects safe to miss
        const safeToMiss = subjectPerformance
            .filter(subject => subject.safe > 0)
            .sort((a, b) => b.safe - a.safe);

        return {
            totalClasses,
            attendedClasses,
            overallPercentage,
            subjectPerformance,
            weeklyPattern,
            atRiskSubjects,
            safeToMiss,
            totalSubjects: subjects.length
        };
    }
};

// Initialize storage when loaded
if (typeof window !== 'undefined') {
    Storage.init();
}