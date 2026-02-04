// Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const classesContainer = document.getElementById('classesContainer');
    const classesList = document.getElementById('classesList');
    const emptyState = document.getElementById('emptyState');
    const setupPrompt = document.getElementById('setupPrompt');
    const classCount = document.getElementById('classCount');
    const currentDate = document.getElementById('currentDate');
    const dayBadge = document.getElementById('dayBadge');
    const undoBtn = document.getElementById('undoBtn');
    const markAllBtn = document.getElementById('markAllBtn');
    const todayBtn = document.getElementById('todayBtn');
    
    // Swipe tracking
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let isSwiping = false;
    let currentCard = null;
    let undoStack = [];

    // Initialize
    init();

    function init() {
        updateDateDisplay();
        checkSetupStatus();
        loadTodayClasses();
        setupEventListeners();
        setupMenu();
    }

    function updateDateDisplay() {
        const today = new Date();
        currentDate.textContent = Utils.formatDisplayDate(today);
        dayBadge.textContent = Utils.getDayName(today);
    }

    function checkSetupStatus() {
        const subjects = Storage.getSubjects();
        const timetable = Storage.getTimetable();
        
        const hasSubjects = subjects.length > 0;
        const hasTimetable = Object.values(timetable).some(day => day.length > 0);
        
        if (!hasSubjects || !hasTimetable) {
            setupPrompt.style.display = 'block';
            classesContainer.style.display = 'none';
            emptyState.style.display = 'none';
        } else {
            setupPrompt.style.display = 'none';
        }
    }

    function loadTodayClasses() {
        const today = new Date();
        const dayName = Utils.getDayName(today).toLowerCase();
        const subjectIds = Storage.getSubjectsForDay(dayName);
        const subjects = Storage.getSubjects();
        const todayHistory = Storage.getHistoryForDate(Utils.formatDate(today));
        
        console.log('Today:', dayName);
        console.log('Subject IDs:', subjectIds);
        console.log('All subjects:', subjects);
        
        // Filter subjects for today
        const todaySubjects = subjects.filter(subject => 
            subjectIds.includes(subject.id)
        );
        
        console.log('Today subjects:', todaySubjects);

        // Update count
        classCount.textContent = todaySubjects.length;
        
        // Show/hide containers
        if (todaySubjects.length === 0) {
            classesContainer.style.display = 'none';
            emptyState.style.display = 'block';
            console.log('No classes today');
            return;
        } else {
            classesContainer.style.display = 'block';
            emptyState.style.display = 'none';
        }

        // Clear current list
        classesList.innerHTML = '';

        // Create cards for each subject
        todaySubjects.forEach((subject, index) => {
            const card = createClassCard(subject, todayHistory);
            classesList.appendChild(card);
            
            // Add swipe listeners
            addSwipeListeners(card, subject.id);
            
            // Animate card appearance
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });

        // Update undo button state
        updateUndoButton();
    }

    function createClassCard(subject, todayHistory) {
        const percentage = Utils.calculatePercentage(subject.attended, subject.total);
        const riskLevel = Utils.getRiskLevel(percentage, subject.target);
        const status = todayHistory.entries.find(entry => entry.subjectId === subject.id)?.status || 'pending';
        
        const card = document.createElement('div');
        card.className = `class-card ${riskLevel}-risk`;
        card.dataset.subjectId = subject.id;
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.3s, transform 0.3s';
        
        card.innerHTML = `
            <div class="card-header">
                <h3 class="subject-name">${subject.name}</h3>
                <span class="subject-time">${getRandomTime()}</span>
            </div>
            
            <div class="card-body">
                <div class="attendance-info">
                    <div class="attendance-percentage">${percentage}%</div>
                    <div class="target-info">
                        <div class="target-percentage">Target: ${subject.target}%</div>
                        <div class="classes-count">
                            <span>${subject.attended}/${subject.total} classes</span>
                        </div>
                    </div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill ${Utils.getPercentageColor(percentage, subject.target)}" 
                         style="width: ${percentage}%"></div>
                </div>
            </div>
            
            <div class="card-footer">
                <div class="status-badge status-${status}">
                    ${getStatusText(status)}
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
        
        card.addEventListener('touchstart', handleTouchStart, { passive: true });
        card.addEventListener('touchmove', handleTouchMove, { passive: false });
        card.addEventListener('touchend', handleTouchEnd);
        
        card.addEventListener('mousedown', handleMouseDown);
        
        // Prevent text selection while dragging
        card.addEventListener('selectstart', (e) => {
            if (isDragging) e.preventDefault();
        });

        function handleTouchStart(e) {
            const touch = e.touches[0];
            startX = touch.clientX;
            currentX = startX;
            isDragging = true;
            card.style.transition = 'none';
            e.preventDefault();
        }

        function handleTouchMove(e) {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            currentX = touch.clientX;
            transform = currentX - startX;
            
            // Apply transform with resistance
            const resistance = 0.5;
            const limitedTransform = transform * resistance;
            
            card.style.transform = `translateX(${limitedTransform}px) rotate(${limitedTransform * 0.1}deg)`;
            
            // Change color based on direction
            if (transform > 50) {
                card.style.backgroundColor = '#d1fae5'; // Green for right
            } else if (transform < -50) {
                card.style.backgroundColor = '#fee2e2'; // Red for left
            } else {
                card.style.backgroundColor = '';
            }
            
            e.preventDefault();
        }

        function handleTouchEnd() {
            if (!isDragging) return;
            
            isDragging = false;
            card.style.transition = 'transform 0.3s, opacity 0.3s';
            
            const threshold = 100;
            const velocity = Math.abs(transform);
            
            if (velocity > threshold) {
                // Swipe was intentional
                if (transform > 0) {
                    // Swipe right - attended
                    markAttendance(subjectId, 'attended');
                    card.classList.add('swipe-right');
                } else {
                    // Swipe left - missed
                    markAttendance(subjectId, 'missed');
                    card.classList.add('swipe-left');
                }
                
                // Remove card after animation
                setTimeout(() => {
                    card.remove();
                    loadTodayClasses(); // Reload to update counts
                }, 300);
            } else {
                // Return to original position
                card.style.transform = '';
                card.style.backgroundColor = '';
            }
        }

        function handleMouseDown(e) {
            if (e.button !== 0) return; // Only left click
            
            startX = e.clientX;
            currentX = startX;
            isDragging = true;
            card.style.transition = 'none';
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        function handleMouseMove(e) {
            if (!isDragging) return;
            
            currentX = e.clientX;
            transform = currentX - startX;
            
            const resistance = 0.5;
            const limitedTransform = transform * resistance;
            
            card.style.transform = `translateX(${limitedTransform}px) rotate(${limitedTransform * 0.1}deg)`;
            
            if (transform > 50) {
                card.style.backgroundColor = '#d1fae5';
            } else if (transform < -50) {
                card.style.backgroundColor = '#fee2e2';
            } else {
                card.style.backgroundColor = '';
            }
        }

        function handleMouseUp() {
            if (!isDragging) return;
            
            isDragging = false;
            card.style.transition = 'transform 0.3s, opacity 0.3s';
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            const threshold = 100;
            const velocity = Math.abs(transform);
            
            if (velocity > threshold) {
                if (transform > 0) {
                    markAttendance(subjectId, 'attended');
                    card.classList.add('swipe-right');
                } else {
                    markAttendance(subjectId, 'missed');
                    card.classList.add('swipe-left');
                }
                
                setTimeout(() => {
                    card.remove();
                    loadTodayClasses();
                }, 300);
            } else {
                card.style.transform = '';
                card.style.backgroundColor = '';
            }
        }

        // Tap for cancelled
        let tapTimer;
        card.addEventListener('click', (e) => {
            if (isDragging) return;
            
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => {
                // Check if this was a tap (not part of a swipe)
                if (!isDragging && Math.abs(transform) < 10) {
                    markAttendance(subjectId, 'cancelled');
                    card.classList.add('swipe-tap');
                    
                    setTimeout(() => {
                        card.classList.remove('swipe-tap');
                        updateCardStatus(card, 'cancelled');
                    }, 300);
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
                cancelled: 'Marked as cancelled ∅'
            };
            
            Utils.showToast(messages[status], 'success');
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
        const badge = card.querySelector('.status-badge');
        badge.className = `status-badge status-${status}`;
        badge.textContent = getStatusText(status);
    }

    function updateUndoButton() {
        undoBtn.disabled = undoStack.length === 0;
    }

    function getStatusText(status) {
        const texts = {
            attended: 'Attended ✓',
            missed: 'Missed ✗',
            cancelled: 'Cancelled ∅',
            pending: 'Pending...'
        };
        return texts[status] || status;
    }

    function getRandomTime() {
        const hours = Math.floor(Math.random() * 5) + 8; // 8 AM to 1 PM
        const minutes = Math.random() > 0.5 ? '00' : '30';
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours > 12 ? hours - 12 : hours;
        return `${displayHour}:${minutes} ${period}`;
    }

    function setupEventListeners() {
        // Undo button
        undoBtn.addEventListener('click', undoLastAction);
        
        // Mark all button
        markAllBtn.addEventListener('click', markAllPresent);
        
        // Today button
        todayBtn.addEventListener('click', () => {
            loadTodayClasses();
            updateDateDisplay();
            Utils.showToast('Refreshed!', 'success');
        });
        
        // View week button
        const viewWeekBtn = document.getElementById('viewWeekBtn');
        if (viewWeekBtn) {
            viewWeekBtn.addEventListener('click', () => {
                window.location.href = 'stats.html';
            });
        }
    }

    function setupMenu() {
        const menuBtn = document.getElementById('menuBtn');
        const closeMenu = document.getElementById('closeMenu');
        const sideMenu = document.getElementById('sideMenu');
        const menuOverlay = document.getElementById('menuOverlay');
        
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
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
        
        // Update storage usage
        updateStorageUsage();
        
        // Setup menu actions
        setupMenuActions();
    }

    function updateStorageUsage() {
        const storageInfo = Utils.calculateStorageUsage();
        const storageUsage = document.getElementById('storageUsage');
        if (storageUsage) {
            storageUsage.textContent = `${storageInfo.percentage}% used`;
        }
    }

    function setupMenuActions() {
        // Export data
        const exportData = document.getElementById('exportData');
        if (exportData) {
            exportData.addEventListener('click', () => {
                const data = Storage.exportData();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `attendance-backup-${Utils.formatDate()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                Utils.showToast('Data exported successfully!', 'success');
            });
        }
        
        // Import data
        const importData = document.getElementById('importData');
        if (importData) {
            importData.addEventListener('click', () => {
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
                                setTimeout(() => {
                                    window.location.reload();
                                }, 1000);
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
        const resetData = document.getElementById('resetData');
        if (resetData) {
            resetData.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all data? This cannot be undone!')) {
                    const result = Storage.clearAllData();
                    if (result.success) {
                        Utils.showToast('All data has been reset', 'success');
                        setTimeout(() => {
                            window.location.href = 'setup.html';
                        }, 1000);
                    }
                }
            });
        }
    }
});