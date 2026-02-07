// Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard loaded');
    
    // DOM Elements
    const setupPrompt = document.getElementById('setupPrompt');
    const todayStats = document.getElementById('todayStats');
    const classesSection = document.getElementById('classesSection');
    const classesContainer = document.getElementById('classesContainer');
    const emptyState = document.getElementById('emptyState');
    const todayClasses = document.getElementById('todayClasses');
    const attendedToday = document.getElementById('attendedToday');
    const missedToday = document.getElementById('missedToday');
    const currentDay = document.getElementById('currentDay');
    const currentDate = document.getElementById('currentDate');
    const undoBtn = document.getElementById('undoBtn');
    const markAllBtn = document.getElementById('markAllBtn');
    const todayBtn = document.getElementById('todayBtn');
    const menuTrigger = document.getElementById('menuTrigger');
    const closeMenu = document.getElementById('closeMenu');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    
    // State
    let undoStack = [];
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let currentCard = null;

    // Initialize
    init();

    function init() {
        updateDateDisplay();
        checkSetupStatus();
        loadTodayClasses();
        setupEventListeners();
        setupMenu();
        updateStorageDisplay();
    }

    function updateDateDisplay() {
        const today = new Date();
        currentDay.textContent = Utils.getDayName(today);
        currentDate.textContent = today.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    function checkSetupStatus() {
        const subjects = Storage.getSubjects();
        const timetable = Storage.getTimetable();
        const hasSubjects = subjects.length > 0;
        const hasTimetable = Object.values(timetable).some(day => day.length > 0);
        
        if (!hasSubjects || !hasTimetable) {
            setupPrompt.classList.remove('hidden');
            todayStats.classList.add('hidden');
            classesSection.classList.add('hidden');
        } else {
            setupPrompt.classList.add('hidden');
            todayStats.classList.remove('hidden');
            classesSection.classList.remove('hidden');
        }
    }

    function loadTodayClasses() {
        const today = new Date();
        const dayName = Utils.getDayName(today).toLowerCase();
        const subjectIds = Storage.getSubjectsForDay(dayName);
        const subjects = Storage.getSubjects();
        const todayHistory = Storage.getHistoryForDate(Utils.formatDate(today));
        
        // Filter today's subjects
        const todaySubjects = subjects.filter(subject => 
            subjectIds.includes(subject.id)
        );

        // Update stats
        todayClasses.textContent = todaySubjects.length;
        const attendedCount = todayHistory.entries.filter(e => e.status === 'attended').length;
        const missedCount = todayHistory.entries.filter(e => e.status === 'missed').length;
        attendedToday.textContent = attendedCount;
        missedToday.textContent = missedCount;

        // Show/hide containers
        if (todaySubjects.length === 0) {
            classesContainer.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        // Clear and render classes
        classesContainer.innerHTML = '';
        todaySubjects.forEach((subject, index) => {
            const card = createClassCard(subject, todayHistory);
            classesContainer.appendChild(card);
            
            // Add swipe listeners with delay for animation
            setTimeout(() => {
                addSwipeListeners(card, subject.id);
            }, index * 50);
        });

        updateUndoButton();
    }

    function createClassCard(subject, todayHistory) {
        const percentage = Utils.calculatePercentage(subject.attended, subject.total);
        const riskLevel = Utils.getRiskLevel(percentage, subject.target);
        const progressColor = Utils.getProgressColor(percentage, subject.target);
        const status = todayHistory.entries.find(e => e.subjectId === subject.id)?.status || 'pending';
        
        const card = document.createElement('div');
        card.className = `class-card glass-card ${riskLevel}`;
        card.dataset.subjectId = subject.id;
        
        card.innerHTML = `
            <div class="card-header">
                <h3 class="subject-name">${subject.name}</h3>
                <span class="subject-time">Class</span>
            </div>
            <div class="card-content">
                <div class="attendance-percentage">${percentage}%</div>
                <div class="attendance-info">
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill ${progressColor}" style="width: ${Math.min(percentage, 100)}%"></div>
                        </div>
                        <div class="progress-info">
                            <span>${subject.attended}/${subject.total}</span>
                            <span>Target: ${subject.target}%</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <div class="status-indicator">
                    <div class="status-dot ${status}"></div>
                    <span>${getStatusText(status)}</span>
                </div>
                <div class="swipe-hint">
                    <i class="fas fa-arrow-right"></i>
                    <i class="fas fa-arrow-left"></i>
                </div>
            </div>
        `;
        
        return card;
    }

    function addSwipeListeners(card, subjectId) {
        let isDragging = false;
        let startX = 0;
        let currentX = 0;
        let transform = 0;
        let velocity = 0;
        let lastX = 0;
        let lastTime = 0;

        // Mouse events
        card.addEventListener('mousedown', handleStart);
        card.addEventListener('touchstart', handleStart, { passive: false });

        function handleStart(e) {
            if (e.type === 'touchstart') e.preventDefault();
            
            isDragging = true;
            startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            currentX = startX;
            lastX = startX;
            lastTime = Date.now();
            
            card.style.transition = 'none';
            card.style.cursor = 'grabbing';
            
            if (e.type === 'mousedown') {
                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleEnd);
            } else {
                document.addEventListener('touchmove', handleMove, { passive: false });
                document.addEventListener('touchend', handleEnd);
            }
        }

        function handleMove(e) {
            if (!isDragging) return;
            if (e.type === 'touchmove') e.preventDefault();
            
            currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            transform = currentX - startX;
            
            // Calculate velocity
            const now = Date.now();
            const deltaTime = now - lastTime;
            if (deltaTime > 0) {
                velocity = (currentX - lastX) / deltaTime;
                lastX = currentX;
                lastTime = now;
            }
            
            // Apply transform with resistance
            const resistance = 0.3;
            const limitedTransform = transform * resistance;
            
            card.style.transform = `translateX(${limitedTransform}px) rotate(${limitedTransform * 0.05}deg)`;
            
            // Visual feedback
            if (transform > 50) {
                card.classList.add('swiping-right');
                card.classList.remove('swiping-left');
            } else if (transform < -50) {
                card.classList.add('swiping-left');
                card.classList.remove('swiping-right');
            } else {
                card.classList.remove('swiping-right', 'swiping-left');
            }
        }

        function handleEnd() {
            if (!isDragging) return;
            isDragging = false;
            
            card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            card.style.cursor = 'grab';
            
            // Remove event listeners
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
            
            const threshold = 100;
            const absTransform = Math.abs(transform);
            const absVelocity = Math.abs(velocity * 100); // Scale velocity
            
            // Check if swipe should trigger
            if (absTransform > threshold || (absTransform > 30 && absVelocity > 5)) {
                if (transform > 0) {
                    // Swipe right - attended
                    markAttendance(subjectId, 'attended');
                    card.style.transform = 'translateX(100vw) rotate(30deg)';
                    card.style.opacity = '0';
                } else {
                    // Swipe left - missed
                    markAttendance(subjectId, 'missed');
                    card.style.transform = 'translateX(-100vw) rotate(-30deg)';
                    card.style.opacity = '0';
                }
                
                // Remove card after animation
                setTimeout(() => {
                    card.remove();
                    loadTodayClasses(); // Reload to update
                }, 300);
            } else {
                // Return to original position
                card.style.transform = '';
                card.classList.remove('swiping-right', 'swiping-left');
            }
        }

        // Tap for cancelled
        let tapTimer;
        card.addEventListener('click', (e) => {
            if (isDragging) return;
            
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => {
                if (!isDragging && Math.abs(transform) < 5) {
                    markAttendance(subjectId, 'cancelled');
                    card.classList.add('shake');
                    updateCardStatus(card, 'cancelled');
                    
                    setTimeout(() => {
                        card.classList.remove('shake');
                    }, 500);
                }
            }, 200);
        });
    }

    function markAttendance(subjectId, status) {
        const today = Utils.formatDate();
        const success = Storage.markAttendance(today, subjectId, status);
        
        if (success) {
            // Add to undo stack
            undoStack.push({
                subjectId,
                status,
                timestamp: new Date().toISOString()
            });
            
            updateUndoButton();
            
            // Show feedback
            const messages = {
                attended: 'Marked as attended ✓',
                missed: 'Marked as missed ✗',
                cancelled: 'Marked as cancelled'
            };
            
            Utils.showToast(messages[status], 
                status === 'attended' ? 'success' : 
                status === 'missed' ? 'error' : 'info');
        }
    }

    function undoLastAction() {
        if (undoStack.length === 0) return;
        
        const lastAction = Storage.undoLastAction();
        if (lastAction) {
            undoStack.pop();
            updateUndoButton();
            loadTodayClasses();
            Utils.showToast('Undo successful!', 'success');
        }
    }

    function markAllPresent() {
        const today = new Date();
        const dayName = Utils.getDayName(today).toLowerCase();
        const subjectIds = Storage.getSubjectsForDay(dayName);
        
        subjectIds.forEach(subjectId => {
            markAttendance(subjectId, 'attended');
        });
        
        Utils.showToast('All classes marked as attended!', 'success');
    }

    function updateCardStatus(card, status) {
        const statusDot = card.querySelector('.status-dot');
        const statusText = card.querySelector('.status-indicator span');
        
        statusDot.className = `status-dot ${status}`;
        statusText.textContent = getStatusText(status);
    }

    function updateUndoButton() {
        undoBtn.disabled = undoStack.length === 0;
    }

    function getStatusText(status) {
        const texts = {
            attended: 'Attended',
            missed: 'Missed',
            cancelled: 'Cancelled',
            pending: 'Pending'
        };
        return texts[status] || status;
    }

    function setupEventListeners() {
        // Undo button
        undoBtn.addEventListener('click', undoLastAction);
        
        // Mark all button
        if (markAllBtn) {
            markAllBtn.addEventListener('click', markAllPresent);
        }
        
        // Today button
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                loadTodayClasses();
                updateDateDisplay();
                Utils.showToast('Refreshed!', 'info');
            });
        }
    }

    function setupMenu() {
        if (menuTrigger) {
            menuTrigger.addEventListener('click', () => {
                sideMenu.classList.add('active');
                menuOverlay.classList.add('active');
            });
        }
        
        if (closeMenu) {
            closeMenu.addEventListener('click', () => {
                sideMenu.classList.remove('active');
                menuOverlay.classList.remove('active');
            });
        }
        
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => {
                sideMenu.classList.remove('active');
                menuOverlay.classList.remove('active');
            });
        }
        
        // Menu actions
        setupMenuActions();
    }

    function setupMenuActions() {
        // Export data
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const data = Storage.exportData();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `attendo-backup-${Utils.formatDate()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                Utils.showToast('Data exported successfully!', 'success');
            });
        }
        
        // Import data
        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const result = Storage.importData(event.target.result);
                            if (result.success) {
                                Utils.showToast('Data imported successfully!', 'success');
                                setTimeout(() => location.reload(), 1000);
                            } else {
                                Utils.showToast('Import failed: ' + result.error, 'error');
                            }
                        } catch (error) {
                            Utils.showToast('Invalid file format', 'error');
                        }
                    };
                    reader.readAsText(file);
                };
                input.click();
            });
        }
        
        // Reset data
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure? This will delete all your data.')) {
                    const result = Storage.clearAllData();
                    if (result.success) {
                        Utils.showToast('All data cleared', 'info');
                        setTimeout(() => location.reload(), 1000);
                    }
                }
            });
        }
    }

    function updateStorageDisplay() {
        const storageInfo = Utils.calculateStorageUsage();
        const storageFill = document.getElementById('storageFill');
        const storageText = document.getElementById('storageText');
        
        if (storageFill) {
            storageFill.style.width = `${storageInfo.percentage}%`;
        }
        if (storageText) {
            storageText.textContent = `Storage: ${storageInfo.percentage}%`;
        }
    }
});