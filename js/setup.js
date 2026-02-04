// Setup Page Logic - FIXED VERSION
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const subjectsList = document.getElementById('subjectsList');
    const subjectsDragList = document.getElementById('subjectsDragList');
    const timetableGrid = document.querySelector('.timetable-grid');
    const targetsList = document.getElementById('targetsList');
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    const subjectNameInput = document.getElementById('subjectName');
    const saveBtn = document.getElementById('saveBtn');
    
    // State
    let subjects = [];
    let timetable = {};
    let currentStep = 1;

    // Initialize
    init();

    function init() {
        loadData();
        renderSubjects();
        renderTimetableGrid();
        renderTargets();
        setupEventListeners();
        updateStep(currentStep);
    }

    function loadData() {
        subjects = Storage.getSubjects();
        timetable = Storage.getTimetable();
        
        // If no subjects, show step 1
        if (subjects.length === 0) {
            currentStep = 1;
        }
    }

    function saveData() {
        Storage.saveSubjects(subjects);
        Storage.saveTimetable(timetable);
        Utils.showToast('Setup saved successfully!', 'success');
        
        // Update subjects with IDs if they don't have them
        subjects.forEach((subject, index) => {
            if (!subject.id) {
                subject.id = Utils.generateId();
            }
        });
        Storage.saveSubjects(subjects);
    }

    // Step Navigation
    function updateStep(step) {
        // Update step indicators
        document.querySelectorAll('.step').forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.step) === step);
        });

        // Show/hide steps
        [step1, step2, step3].forEach((s, index) => {
            s.classList.toggle('active', index + 1 === step);
        });

        currentStep = step;
    }

    // Subject Management
    function renderSubjects() {
        subjectsList.innerHTML = '';
        subjectsDragList.innerHTML = '';

        if (subjects.length === 0) {
            subjectsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <h3>No subjects added</h3>
                    <p>Add your first subject using the form above</p>
                </div>
            `;
            return;
        }

        subjects.forEach(subject => {
            // Subject item for list
            const subjectItem = document.createElement('div');
            subjectItem.className = 'subject-item';
            subjectItem.dataset.id = subject.id || Utils.generateId();
            
            // Ensure subject has an ID
            if (!subject.id) {
                subject.id = subjectItem.dataset.id;
            }
            
            subjectItem.innerHTML = `
                <div class="subject-info">
                    <h4>${subject.name}</h4>
                    <div class="subject-meta">
                        <span class="badge" style="background: ${subject.color || '#6366f1'}">
                            Target: ${subject.target || 75}%
                        </span>
                    </div>
                </div>
                <div class="subject-actions">
                    <button class="icon-btn edit-subject" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete-subject" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            subjectsList.appendChild(subjectItem);

            // Draggable subject for timetable
            const dragItem = document.createElement('div');
            dragItem.className = 'subject-drag-item';
            dragItem.draggable = true;
            dragItem.dataset.id = subject.id;
            dragItem.innerHTML = `
                <div class="drag-content">
                    <i class="fas fa-grip-vertical"></i>
                    <span>${subject.name}</span>
                </div>
            `;
            subjectsDragList.appendChild(dragItem);
        });

        // Add event listeners for edit/delete
        document.querySelectorAll('.edit-subject').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subjectId = e.target.closest('.subject-item').dataset.id;
                editSubject(subjectId);
            });
        });

        document.querySelectorAll('.delete-subject').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subjectId = e.target.closest('.subject-item').dataset.id;
                deleteSubject(subjectId);
            });
        });

        // Add drag events
        setupDragAndDrop();
    }

    function addSubject() {
        const name = subjectNameInput.value.trim();
        const error = Utils.validateSubjectName(name);
        
        if (error) {
            Utils.showToast(error, 'error');
            subjectNameInput.focus();
            return;
        }

        // Check if subject already exists
        if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            Utils.showToast('Subject already exists!', 'error');
            return;
        }

        const newSubject = {
            id: Utils.generateId(),
            name,
            attended: 0,
            total: 0,
            target: 75,
            color: getRandomColor(),
            createdAt: new Date().toISOString()
        };

        subjects.push(newSubject);
        subjectNameInput.value = '';
        renderSubjects();
        renderTargets();
        renderTimetableGrid();
        Utils.showToast('Subject added successfully!', 'success');
    }

    function editSubject(subjectId) {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const newName = prompt('Edit subject name:', subject.name);
        if (newName && newName.trim() !== '' && newName !== subject.name) {
            const error = Utils.validateSubjectName(newName);
            if (error) {
                Utils.showToast(error, 'error');
                return;
            }

            subject.name = newName.trim();
            saveData();
            renderSubjects();
            renderTargets();
            renderTimetableGrid();
            Utils.showToast('Subject updated!', 'success');
        }
    }

    function deleteSubject(subjectId) {
        if (!confirm('Are you sure you want to delete this subject? This will also remove it from your timetable.')) {
            return;
        }

        // Remove from subjects
        subjects = subjects.filter(s => s.id !== subjectId);
        
        // Remove from timetable
        Object.keys(timetable).forEach(day => {
            if (Array.isArray(timetable[day])) {
                timetable[day] = timetable[day].filter(id => id !== subjectId);
            }
        });

        saveData();
        renderSubjects();
        renderTimetableGrid();
        renderTargets();
        Utils.showToast('Subject deleted!', 'success');
    }

    // Timetable Management - FIXED VERSION
    function renderTimetableGrid() {
        if (!timetableGrid) return;
        
        timetableGrid.innerHTML = '';
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = new Date().getDay();

        days.forEach((day, index) => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            dayColumn.dataset.day = day;
            
            const isToday = index === today;
            const dayName = day.charAt(0).toUpperCase() + day.slice(1);
            
            // Ensure timetable[day] exists and is an array
            if (!timetable[day] || !Array.isArray(timetable[day])) {
                timetable[day] = [];
            }
            
            let subjectsInDay = timetable[day]
                .map(id => subjects.find(s => s.id === id))
                .filter(Boolean);

            dayColumn.innerHTML = `
                <div class="day-header ${isToday ? 'today' : ''}">${dayName}</div>
                <div class="day-subjects">
                    ${subjectsInDay.map(subject => `
                        <div class="day-subject" data-id="${subject.id}" draggable="true">
                            ${subject.name}
                            <button class="remove-subject" data-id="${subject.id}">&times;</button>
                        </div>
                    `).join('')}
                    ${subjectsInDay.length === 0 ? '<div class="empty-day">No classes</div>' : ''}
                </div>
            `;

            timetableGrid.appendChild(dayColumn);
        });

        // Add drop events
        setupDropZones();
        
        // Add remove subject events
        document.querySelectorAll('.remove-subject').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const subjectId = e.target.dataset.id;
                const day = e.target.closest('.day-column').dataset.day;
                removeSubjectFromDay(day, subjectId);
            });
        });
    }

    function setupDragAndDrop() {
        const dragItems = document.querySelectorAll('.subject-drag-item');
        
        dragItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.dataset.id);
                e.target.classList.add('dragging');
            });

            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });
        });
    }

    function setupDropZones() {
        const dropZones = document.querySelectorAll('.day-column');
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', (e) => {
                // Only remove if not dragging over child elements
                if (!zone.contains(e.relatedTarget)) {
                    zone.classList.remove('drag-over');
                }
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                const subjectId = e.dataTransfer.getData('text/plain');
                const day = zone.dataset.day;
                
                if (subjectId) {
                    addSubjectToDay(day, subjectId);
                }
            });
        });
    }

    function addSubjectToDay(day, subjectId) {
        // Ensure timetable[day] exists
        if (!timetable[day]) {
            timetable[day] = [];
        }
        
        // Check if subject exists
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) {
            Utils.showToast('Subject not found!', 'error');
            return;
        }
        
        // Check if subject already in this day
        if (!timetable[day].includes(subjectId)) {
            timetable[day].push(subjectId);
            saveData();
            renderTimetableGrid();
            Utils.showToast(`Added ${subject.name} to ${day}`, 'success');
        } else {
            Utils.showToast('Subject already in this day!', 'warning');
        }
    }

    function removeSubjectFromDay(day, subjectId) {
        if (timetable[day]) {
            timetable[day] = timetable[day].filter(id => id !== subjectId);
            saveData();
            renderTimetableGrid();
            
            const subject = subjects.find(s => s.id === subjectId);
            if (subject) {
                Utils.showToast(`Removed ${subject.name} from ${day}`, 'success');
            }
        }
    }

    // Targets Management
    function renderTargets() {
        targetsList.innerHTML = '';

        if (subjects.length === 0) {
            targetsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-bullseye"></i>
                    </div>
                    <h3>No subjects to configure</h3>
                    <p>Add subjects in step 1 to set targets</p>
                </div>
            `;
            return;
        }

        subjects.forEach(subject => {
            const targetItem = document.createElement('div');
            targetItem.className = 'subject-item';
            targetItem.innerHTML = `
                <div class="subject-info">
                    <h4>${subject.name}</h4>
                    <div class="subject-meta">
                        <span class="badge" style="background: ${subject.color || '#6366f1'}">
                            Current: ${subject.target || 75}%
                        </span>
                    </div>
                </div>
                <div class="subject-actions">
                    <input type="range" 
                           class="target-slider" 
                           data-id="${subject.id}"
                           min="0" 
                           max="100" 
                           value="${subject.target || 75}"
                           step="5">
                    <span class="target-value">${subject.target || 75}%</span>
                </div>
            `;
            targetsList.appendChild(targetItem);
        });

        // Add slider events
        document.querySelectorAll('.target-slider').forEach(slider => {
            const valueSpan = slider.nextElementSibling;
            
            slider.addEventListener('input', (e) => {
                const value = e.target.value;
                valueSpan.textContent = `${value}%`;
            });

            slider.addEventListener('change', (e) => {
                const subjectId = e.target.dataset.id;
                const value = parseInt(e.target.value);
                
                const subject = subjects.find(s => s.id === subjectId);
                if (subject) {
                    subject.target = value;
                    saveData();
                    renderSubjects(); // Update badge in subjects list
                    Utils.showToast('Target updated!', 'success');
                }
            });
        });
    }

    // Utility Functions
    function getRandomColor() {
        const colors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
            '#10b981', '#3b82f6', '#f59e0b', '#84cc16'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Event Listeners
    function setupEventListeners() {
        // Add subject
        if (addSubjectBtn) {
            addSubjectBtn.addEventListener('click', addSubject);
        }
        
        if (subjectNameInput) {
            subjectNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') addSubject();
            });
        }

        // Step navigation
        document.querySelectorAll('.btn-next').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nextStep = parseInt(e.target.dataset.next);
                if (validateStep(currentStep)) {
                    updateStep(nextStep);
                }
            });
        });

        document.querySelectorAll('.btn-prev').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prevStep = parseInt(e.target.dataset.prev);
                updateStep(prevStep);
            });
        });

        // Save button
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (validateStep(currentStep)) {
                    saveData();
                    // If on step 3, redirect to dashboard
                    if (currentStep === 3) {
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 1500);
                    }
                }
            });
        }
    }

    function validateStep(step) {
        switch(step) {
            case 1:
                if (subjects.length === 0) {
                    Utils.showToast('Please add at least one subject', 'error');
                    return false;
                }
                return true;
                
            case 2:
                // Check if timetable has at least one class
                let hasClasses = false;
                Object.keys(timetable).forEach(day => {
                    if (Array.isArray(timetable[day]) && timetable[day].length > 0) {
                        hasClasses = true;
                    }
                });
                
                if (!hasClasses) {
                    Utils.showToast('Please add at least one class to your timetable', 'error');
                    return false;
                }
                return true;
                
            case 3:
                // All targets are valid by default (0-100)
                return true;
                
            default:
                return true;
        }
    }
});