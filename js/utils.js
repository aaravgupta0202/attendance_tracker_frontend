// Utility Functions
const Utils = {
    // Generate unique ID
    generateId: () => {
        return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    // Format date to YYYY-MM-DD
    formatDate: (date = new Date()) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Get day name
    getDayName: (date = new Date()) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    },

    // Get short day name
    getShortDayName: (date = new Date()) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[date.getDay()];
    },

    // Format date for display
    formatDisplayDate: (date = new Date()) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Calculate percentage
    calculatePercentage: (attended, total) => {
        if (total === 0) return 0;
        return Math.round((attended / total) * 100);
    },

    // Get color based on percentage
    getPercentageColor: (percentage, target = 75) => {
        if (percentage >= target + 10) return 'success';
        if (percentage >= target) return 'warning';
        return 'danger';
    },

    // Get risk level
    getRiskLevel: (percentage, target = 75) => {
        if (percentage >= target + 5) return 'low';
        if (percentage >= target - 5) return 'medium';
        return 'high';
    },

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Calculate classes needed to reach target
    calculateNeeded: (attended, total, target) => {
        if (target <= 0) return 0;
        
        // Formula: (attended + x) / (total + x) >= target/100
        // Solve for x
        const needed = Math.ceil((target * total - 100 * attended) / (100 - target));
        return Math.max(0, needed);
    },

    // Calculate safe to miss
    calculateSafeToMiss: (attended, total, target) => {
        if (target <= 0) return 0;
        
        // Formula: attended / (total + x) >= target/100
        // Solve for x (additional classes that can be missed)
        const safe = Math.floor((100 * attended / target) - total);
        return Math.max(0, safe);
    },

    // Validate subject name
    validateSubjectName: (name) => {
        if (!name || name.trim().length === 0) {
            return 'Subject name is required';
        }
        if (name.length > 50) {
            return 'Subject name must be less than 50 characters';
        }
        return null;
    },

    // Validate target percentage
    validateTarget: (target) => {
        const num = parseInt(target);
        if (isNaN(num)) {
            return 'Target must be a number';
        }
        if (num < 0 || num > 100) {
            return 'Target must be between 0 and 100';
        }
        return null;
    },

    // Get month name
    getMonthName: (month) => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month];
    },

    // Get days in month
    getDaysInMonth: (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    },

    // Get start day of month (0 = Sunday, 6 = Saturday)
    getStartDayOfMonth: (year, month) => {
        return new Date(year, month, 1).getDay();
    },

    // Check if date is today
    isToday: (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    },

    // Check if date is weekend
    isWeekend: (date) => {
        const day = date.getDay();
        return day === 0 || day === 6;
    },

    // Copy to clipboard
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    },

    // Show toast notification
    showToast: (message, type = 'info', duration = 3000) => {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Hide after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, duration);

        return toast;
    },

    // Format file size
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Calculate storage usage
    calculateStorageUsage: () => {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += (localStorage[key].length * 2) / 1024; // Convert to KB
            }
        }
        const percentage = (total / (5 * 1024)) * 100; // 5MB limit
        return {
            used: total,
            percentage: Math.min(100, Math.round(percentage)),
            formatted: `${Math.round(total)} KB / 5 MB`
        };
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}