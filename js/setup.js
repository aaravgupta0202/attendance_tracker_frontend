// Setup Page Logic - SIMPLIFIED WORKING VERSION
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const subjectsList = document.getElementById('subjectsList');
    const subjectsDragList = document.getElementById('subjectsDragList');
    const timetableGrid = document.querySelector('.timetable-grid');
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    const subjectNameInput = document.getElementById('subjectName');
    
    // State
    let subjects = [];
    let timetable = {};

    // Initialize
    init();

    function init() {
        loadData();
        renderSubjects();
        renderTimetableGrid();
        setupEventListeners();
        
        // Setup step navigation
        setupStepNavigation();
    }

    function loadData() {
        subjects = Storage.getSubjects();
        timetable = Storage.getTimetable();
        console.log('Loaded subjects:', subjects);
        console.log('Loaded timetable:', timetable);
    }

    function saveData() {
        Storage.saveSubjects(subjects);
        Storage.saveTimetable(timetable);
        console.log('Data saved:', { subjects, timetable });
        Utils.showToast('Changes saved!', 'success');
    }

    function setupStepNavigation() {
        // Step navigation buttons
        document.querySelectorAll('.btn-next').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nextStep = parseInt(e.target.dataset.next);
                goToStep(nextStep);
            });
        });

        document.querySelectorAll('.btn-prev').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prevStep = parseInt(e.target.dataset.prev);
                goToStep(prevStep);
            });
        });

        // Save button
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                saveData();
            });
        }
    }

    function goToStep(step) {
        // Hide all steps
        document.querySelectorAll('.setup-step').forEach(s => {
            s.classList.remove('active');
        });
        
        // Show target step
        const targetStep = document.getElementById(`step${step}`);
        if (targetStep) {
            targetStep.classList.add('active');
        }
        
        // Update step indicators
        document.querySelectorAll('.step').forEach(s => {
            s.classList.remove('active');
            if (parseInt(s.dataset.step) === step) {
                s.classList.add('active');
            }
        });
        
        // If going to step 3, render targets
        if (step === 3) {
            renderTargets();
        }
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
            // Ensure subject has ID
            if (!subject.id) {
                subject.id = Utils.generateId();
            }
            
            // Subject item for list
            const subjectItem = document.createElement('div');
            subjectItem.className = 'subject-item';
            subjectItem.dataset.id = subject.id;
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

        // Add event listeners
        setupSubjectEventListeners();
        setupDragAndDrop();
    }

    function addSubject() {
        const name = subjectNameInput.value.trim();
        if (!name) {
            Utils.showToast('Please enter a subject name', 'error');
            return;
        }

        const newSubject = {
            id: Utils.generateId(),
            name: name,
            attended: 0,
            total: 0,
            target: 75,
            color: getRandomColor()
        };

        subjects.push(newSubject);
        subjectNameInput.value = '';
        renderSubjects();
        saveData();
        Utils.showToast('Subject added!', 'success');
    }

    function setupSubjectEventListeners() {
        // Edit buttons
        document.querySelectorAll('.edit-subject').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subjectId = e.target.closest('.subject-item').dataset.id;
                const subject = subjects.find(s => s.id === subjectId);
                if (subject) {
                    const newName = prompt('Edit subject name:', subject.name);
                    if (newName && newName.trim()) {
                        subject.name = newName.trim();
                        renderSubjects();
                        saveData();
                    }
                }
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-subject').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subjectId = e.target.closest('.subject-item').dataset.id;
                if (confirm('Delete this subject?')) {
                    subjects = subjects.filter(s => s.id !== subjectId);
                    // Remove from timetable
                    Object.keys(timetable).forEach(day => {
                        if (Array.isArray(timetable[day])) {
                            timetable[day] = timetable[day].filter(id => id !== subjectId);
                        }
                    });
                    renderSubjects();
                    renderTimetableGrid();
                    saveData();
                }
            });
        });
    }

    // Drag and Drop Functions
    function setupDragAndDrop() {
        const dragItems = document.querySelectorAll('.subject-drag-item');
        
        dragItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.id);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });

        // Setup drop zones
        const dropZones = document.querySelectorAll('.day-column');
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
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

    // Timetable Functions
    function renderTimetableGrid() {
        if (!timetableGrid) return;
        
        timetableGrid.innerHTML = '';
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = new Date().getDay();

        days.forEach((day, index) => {
            // Ensure day exists in timetable
            if (!timetable[day]) {
                timetable[day] = [];
            }
            
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            dayColumn.dataset.day = day;
            
            const isToday = index === today;
            const dayName = day.charAt(0).toUpperCase() + day.slice(1);
            
            const subjectsInDay = timetable[day]
                .map(id => subjects.find(s => s.id === id))
                .filter(Boolean);

            dayColumn.innerHTML = `
                <div class="day-header ${isToday ? 'today' : ''}">${dayName}</div>
                <div class="day-subjects">
                    ${subjectsInDay.map(subject => `
                        <div class="day-subject" data-id="${subject.id}">
                            ${subject.name}
                            <button class="remove-subject" data-id="${subject.id}">&times;</button>
                        </div>
                    `).join('')}
                    ${subjectsInDay.length === 0 ? '<div class="empty-day">No classes</div>' : ''}
                </div>
            `;

            timetableGrid.appendChild(dayColumn);
        });

        // Add remove button listeners
        document.querySelectorAll('.remove-subject').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const subjectId = e.target.dataset.id;
                const day = e.target.closest('.day-column').dataset.day;
                removeSubjectFromDay(day, subjectId);
            });
        });
    }

    function addSubjectToDay(day, subjectId) {
        if (!timetable[day]) {
            timetable[day] = [];
        }
        
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) {
            Utils.showToast('Subject not found!', 'error');
            return;
        }
        
        if (!timetable[day].includes(subjectId)) {
            timetable[day].push(subjectId);
            renderTimetableGrid();
            saveData();
            Utils.showToast(`Added ${subject.name} to ${day}`, 'success');
        }
    }

    function removeSubjectFromDay(day, subjectId) {
        if (timetable[day]) {
            timetable[day] = timetable[day].filter(id => id !== subjectId);
            renderTimetableGrid();
            saveData();
            
            const subject = subjects.find(s => s.id === subjectId);
            if (subject) {
                Utils.showToast(`Removed ${subject.name} from ${day}`, 'success');
            }
        }
    }

    // Targets Functions
    function renderTargets() {
        const targetsList = document.getElementById('targetsList');
        if (!targetsList) return;
        
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
                valueSpan.textContent = `${e.target.value}%`;
            });

            slider.addEventListener('change', (e) => {
                const subjectId = e.target.dataset.id;
                const value = parseInt(e.target.value);
                
                const subject = subjects.find(s => s.id === subjectId);
                if (subject) {
                    subject.target = value;
                    saveData();
                    Utils.showToast('Target updated!', 'success');
                }
            });
        });
    }

    // Utility Functions
    function getRandomColor() {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Event Listeners
    function setupEventListeners() {
        if (addSubjectBtn) {
            addSubjectBtn.addEventListener('click', addSubject);
        }
        
        if (subjectNameInput) {
            subjectNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') addSubject();
            });
        }
    }
});