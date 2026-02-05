// Setup Page Logic - COMPLETELY FIXED VERSION
document.addEventListener('DOMContentLoaded', () => {
    console.log('Setup page loaded');
    
    // DOM Elements
    const subjectsList = document.getElementById('subjectsList');
    const subjectsDragList = document.getElementById('subjectsDragList');
    const timetableGrid = document.querySelector('.timetable-grid');
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
        console.log('Initializing setup...');
        loadData();
        renderSubjects();
        renderTimetableGrid();
        renderTargets();
        setupEventListeners();
        setupStepNavigation();
        updateStep(1);
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
        console.log('Setting up step navigation...');
        
        // Step navigation buttons
        document.querySelectorAll('.btn-next').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const nextStep = parseInt(e.target.dataset.next || e.target.closest('.btn-next').dataset.next);
                console.log('Next step:', nextStep);
                if (validateStep(currentStep)) {
                    goToStep(nextStep);
                }
            });
        });

        document.querySelectorAll('.btn-prev').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const prevStep = parseInt(e.target.dataset.prev || e.target.closest('.btn-prev').dataset.prev);
                console.log('Prev step:', prevStep);
                goToStep(prevStep);
            });
        });

        // Save button
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                saveData();
                if (currentStep === 3) {
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                }
            });
        }
    }

    function goToStep(step) {
        console.log('Going to step:', step);
        
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
        
        currentStep = step;
        
        // If going to step 3, render targets
        if (step === 3) {
            renderTargets();
        }
        
        // Scroll to top of step
        window.scrollTo(0, 0);
    }

    function updateStep(step) {
        currentStep = step;
        goToStep(step);
    }

    // Subject Management
    function renderSubjects() {
        console.log('Rendering subjects...');
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
                    <button class="icon-btn edit-subject-btn" data-id="${subject.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete-subject-btn" data-id="${subject.id}" title="Delete">
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

        // Add event listeners for edit/delete buttons
        setupSubjectEventListeners();
        setupDragAndDrop();
    }

    function addSubject() {
        const name = subjectNameInput.value.trim();
        if (!name) {
            Utils.showToast('Please enter a subject name', 'error');
            return;
        }

        // Check if subject already exists
        if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            Utils.showToast('Subject already exists!', 'error');
            return;
        }

        const newSubject = {
            id: Utils.generateId(),
            name: name,
            attended: 0,
            total: 0,
            target: 75,
            color: getRandomColor(),
            createdAt: new Date().toISOString()
        };

        subjects.push(newSubject);
        subjectNameInput.value = '';
        renderSubjects();
        saveData();
        Utils.showToast('Subject added!', 'success');
    }

    function setupSubjectEventListeners() {
        console.log('Setting up subject event listeners...');
        
        // Edit buttons - USE EVENT DELEGATION
        document.addEventListener('click', (e) => {
            // Handle edit button clicks
            if (e.target.closest('.edit-subject-btn') || e.target.classList.contains('edit-subject-btn')) {
                const button = e.target.closest('.edit-subject-btn') || e.target;
                const subjectId = button.dataset.id;
                console.log('Edit button clicked for subject:', subjectId);
                editSubject(subjectId);
            }
            
            // Handle delete button clicks
            if (e.target.closest('.delete-subject-btn') || e.target.classList.contains('delete-subject-btn')) {
                const button = e.target.closest('.delete-subject-btn') || e.target;
                const subjectId = button.dataset.id;
                console.log('Delete button clicked for subject:', subjectId);
                deleteSubject(subjectId);
            }
        });
    }

    function editSubject(subjectId) {
        console.log('Editing subject:', subjectId);
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) {
            console.error('Subject not found:', subjectId);
            return;
        }

        const newName = prompt('Edit subject name:', subject.name);
        if (newName && newName.trim() && newName !== subject.name) {
            const error = Utils.validateSubjectName(newName);
            if (error) {
                Utils.showToast(error, 'error');
                return;
            }

            subject.name = newName.trim();
            renderSubjects();
            saveData();
            Utils.showToast('Subject updated!', 'success');
        }
    }

    function deleteSubject(subjectId) {
        console.log('Deleting subject:', subjectId);
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

        renderSubjects();
        renderTimetableGrid();
        saveData();
        Utils.showToast('Subject deleted!', 'success');
    }

    // Drag and Drop Functions
    function setupDragAndDrop() {
        console.log('Setting up drag and drop...');
        
        const dragItems = document.querySelectorAll('.subject-drag-item');
        
        dragItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                console.log('Drag started:', item.dataset.id);
                e.dataTransfer.setData('text/plain', item.dataset.id);
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                console.log('Drag ended');
                item.classList.remove('dragging');
            });
        });

        // Setup drop zones
        const dropZones = document.querySelectorAll('.day-column');
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
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
                console.log('Dropped subject', subjectId, 'on day', day);
                
                if (subjectId) {
                    addSubjectToDay(day, subjectId);
                }
            });
        });
    }

    // Timetable Functions
    function renderTimetableGrid() {
        if (!timetableGrid) {
            console.error('Timetable grid not found!');
            return;
        }
        
        console.log('Rendering timetable grid...');
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
            
            // Get subjects for this day
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

        // Add remove button listeners using event delegation
        timetableGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-subject') || e.target.closest('.remove-subject')) {
                const button = e.target.closest('.remove-subject') || e.target;
                const subjectId = button.dataset.id;
                const day = button.closest('.day-column').dataset.day;
                console.log('Remove clicked for subject:', subjectId, 'on day:', day);
                removeSubjectFromDay(day, subjectId);
            }
        });
    }

    function addSubjectToDay(day, subjectId) {
        console.log('Adding subject to day:', subjectId, day);
        
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
        } else {
            Utils.showToast('Subject already in this day!', 'warning');
        }
    }

    function removeSubjectFromDay(day, subjectId) {
        console.log('Removing subject from day:', subjectId, day);
        
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
        if (!targetsList) {
            console.error('Targets list not found!');
            return;
        }
        
        console.log('Rendering targets...');
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

        // Add slider events using event delegation
        targetsList.addEventListener('input', (e) => {
            if (e.target.classList.contains('target-slider')) {
                const valueSpan = e.target.nextElementSibling;
                valueSpan.textContent = `${e.target.value}%`;
            }
        });

        targetsList.addEventListener('change', (e) => {
            if (e.target.classList.contains('target-slider')) {
                const subjectId = e.target.dataset.id;
                const value = parseInt(e.target.value);
                
                const subject = subjects.find(s => s.id === subjectId);
                if (subject) {
                    subject.target = value;
                    saveData();
                    Utils.showToast('Target updated!', 'success');
                }
            }
        });
    }

    // Validation
    function validateStep(step) {
        console.log('Validating step:', step);
        
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
                return true;
                
            default:
                return true;
        }
    }

    // Utility Functions
    function getRandomColor() {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Event Listeners
    function setupEventListeners() {
        console.log('Setting up event listeners...');
        
        if (addSubjectBtn) {
            addSubjectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                addSubject();
            });
        }
        
        if (subjectNameInput) {
            subjectNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addSubject();
                }
            });
        }
    }
});