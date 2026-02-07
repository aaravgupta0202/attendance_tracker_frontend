// Setup Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log('Setup page loaded');
    
    // DOM Elements
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const subjectsGrid = document.getElementById('subjectsGrid');
    const timetableGrid = document.getElementById('timetableGrid');
    const dragItems = document.getElementById('dragItems');
    const targetsList = document.getElementById('targetsList');
    const subjectNameInput = document.getElementById('subjectName');
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    const saveSetupBtn = document.getElementById('saveSetupBtn');
    const setupComplete = document.getElementById('setupComplete');
    
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
        updateStep(1);
    }

    function loadData() {
        subjects = Storage.getSubjects();
        timetable = Storage.getTimetable();
        console.log('Loaded data:', { subjects, timetable });
    }

    function saveData() {
        Storage.saveSubjects(subjects);
        Storage.saveTimetable(timetable);
        console.log('Data saved');
        return true;
    }

    function updateStep(step) {
        // Update stepper
        document.querySelectorAll('.step').forEach(s => {
            s.classList.remove('active');
            if (parseInt(s.dataset.step) === step) {
                s.classList.add('active');
            }
        });

        // Update step content
        [step1, step2, step3].forEach((s, index) => {
            s.classList.remove('active');
            if (index + 1 === step) {
                s.classList.add('active');
            }
        });

        currentStep = step;
        
        // Scroll to top
        window.scrollTo(0, 0);
    }

    // Step 1: Subjects
    function renderSubjects() {
        subjectsGrid.innerHTML = '';
        
        if (subjects.length === 0) {
            subjectsGrid.innerHTML = `
                <div class="empty-subjects">
                    <div class="empty-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <h3>No subjects added yet</h3>
                    <p>Add your first subject using the form above</p>
                </div>
            `;
            return;
        }

        subjects.forEach(subject => {
            const card = document.createElement('div');
            card.className = 'subject-card';
            card.dataset.id = subject.id;
            
            card.innerHTML = `
                <div class="subject-color" style="background: ${subject.color}"></div>
                <div class="subject-info">
                    <div class="subject-name">${subject.name}</div>
                    <div class="subject-meta">Target: ${subject.target}%</div>
                </div>
                <div class="subject-actions">
                    <button class="action-btn edit-btn" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            subjectsGrid.appendChild(card);
        });

        // Add event listeners for edit/delete
        setupSubjectEventListeners();
        renderDragItems();
    }

    function addSubject() {
        const name = subjectNameInput.value.trim();
        if (!name) {
            Utils.showToast('Please enter a subject name', 'error');
            return;
        }

        // Check for duplicates
        if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            Utils.showToast('Subject already exists', 'warning');
            return;
        }

        const newSubject = {
            id: Utils.generateId(),
            name: name,
            attended: 0,
            total: 0,
            target: 75,
            color: Utils.getRandomColor(),
            createdAt: new Date().toISOString()
        };

        subjects.push(newSubject);
        subjectNameInput.value = '';
        renderSubjects();
        renderTargets();
        Utils.showToast('Subject added successfully', 'success');
    }

    function editSubject(subjectId) {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const newName = prompt('Edit subject name:', subject.name);
        if (newName && newName.trim() && newName !== subject.name) {
            subject.name = newName.trim();
            renderSubjects();
            renderDragItems();
            renderTargets();
            Utils.showToast('Subject updated', 'success');
        }
    }

    function deleteSubject(subjectId) {
        if (!confirm('Delete this subject? It will also be removed from your timetable.')) {
            return;
        }

        // Remove from subjects
        subjects = subjects.filter(s => s.id !== subjectId);
        
        // Remove from timetable
        Object.keys(timetable).forEach(day => {
            timetable[day] = timetable[day].filter(id => id !== subjectId);
        });

        renderSubjects();
        renderTimetableGrid();
        renderTargets();
        Utils.showToast('Subject deleted', 'success');
    }

    function setupSubjectEventListeners() {
        // Use event delegation for edit/delete buttons
        subjectsGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.subject-card');
            if (!card) return;
            
            const subjectId = card.dataset.id;
            
            if (e.target.closest('.edit-btn')) {
                editSubject(subjectId);
            } else if (e.target.closest('.delete-btn')) {
                deleteSubject(subjectId);
            }
        });
    }

    // Step 2: Timetable
    function renderTimetableGrid() {
        timetableGrid.innerHTML = '';
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        days.forEach(day => {
            const dayKey = day.toLowerCase();
            if (!timetable[dayKey]) {
                timetable[dayKey] = [];
            }
            
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            dayColumn.dataset.day = dayKey;
            
            const subjectsInDay = timetable[dayKey]
                .map(id => subjects.find(s => s.id === id))
                .filter(Boolean);

            dayColumn.innerHTML = `
                <div class="day-header">${day}</div>
                <div class="day-subjects">
                    ${subjectsInDay.map(subject => `
                        <div class="day-subject" draggable="true" data-id="${subject.id}" style="background: ${subject.color}">
                            ${subject.name}
                            <button class="remove-subject" data-id="${subject.id}">&times;</button>
                        </div>
                    `).join('')}
                    ${subjectsInDay.length === 0 ? '<div class="empty-day">Drag subjects here</div>' : ''}
                </div>
            `;
            
            timetableGrid.appendChild(dayColumn);
        });

        setupDragAndDrop();
    }

    function renderDragItems() {
        dragItems.innerHTML = '';
        
        subjects.forEach(subject => {
            const dragItem = document.createElement('div');
            dragItem.className = 'drag-item';
            dragItem.draggable = true;
            dragItem.dataset.id = subject.id;
            dragItem.innerHTML = `
                <i class="fas fa-grip-vertical"></i>
                <span>${subject.name}</span>
            `;
            dragItems.appendChild(dragItem);
        });

        setupDragAndDrop();
    }

    function setupDragAndDrop() {
        // Setup draggable items
        document.querySelectorAll('.drag-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.id);
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });

        // Setup day columns as drop zones
        document.querySelectorAll('.day-column').forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'move';
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                const subjectId = e.dataTransfer.getData('text/plain');
                const day = column.dataset.day;
                
                if (subjectId) {
                    addSubjectToDay(day, subjectId);
                }
            });
        });
    }

    function addSubjectToDay(day, subjectId) {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) {
            Utils.showToast('Subject not found', 'error');
            return;
        }

        // Check if already in this day
        if (!timetable[day].includes(subjectId)) {
            timetable[day].push(subjectId);
            renderTimetableGrid();
            Utils.showToast(`Added ${subject.name} to ${day}`, 'success');
        } else {
            Utils.showToast('Subject already in this day', 'warning');
        }
    }

    // Handle remove subject from day
    timetableGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-subject')) {
            const subjectId = e.target.dataset.id;
            const day = e.target.closest('.day-column').dataset.day;
            
            timetable[day] = timetable[day].filter(id => id !== subjectId);
            renderTimetableGrid();
            
            const subject = subjects.find(s => s.id === subjectId);
            if (subject) {
                Utils.showToast(`Removed ${subject.name} from ${day}`, 'success');
            }
        }
    });

    // Step 3: Targets
    function renderTargets() {
        targetsList.innerHTML = '';
        
        if (subjects.length === 0) {
            targetsList.innerHTML = `
                <div class="empty-subjects">
                    <div class="empty-icon">
                        <i class="fas fa-bullseye"></i>
                    </div>
                    <h3>No subjects to configure</h3>
                    <p>Add subjects in step 1 first</p>
                </div>
            `;
            return;
        }

        subjects.forEach(subject => {
            const targetItem = document.createElement('div');
            targetItem.className = 'subject-card';
            targetItem.innerHTML = `
                <div class="subject-color" style="background: ${subject.color}"></div>
                <div class="subject-info">
                    <div class="subject-name">${subject.name}</div>
                    <div class="subject-meta">
                        <span class="target-value">${subject.target}%</span>
                    </div>
                </div>
                <div class="subject-actions">
                    <input type="range" 
                           class="target-slider" 
                           min="0" 
                           max="100" 
                           value="${subject.target}"
                           step="5"
                           data-id="${subject.id}">
                </div>
            `;
            
            targetsList.appendChild(targetItem);
        });

        // Add slider event listeners
        targetsList.addEventListener('input', (e) => {
            if (e.target.classList.contains('target-slider')) {
                const value = e.target.value;
                const targetValue = e.target.closest('.subject-card').querySelector('.target-value');
                targetValue.textContent = `${value}%`;
            }
        });

        targetsList.addEventListener('change', (e) => {
            if (e.target.classList.contains('target-slider')) {
                const subjectId = e.target.dataset.id;
                const value = parseInt(e.target.value);
                
                const subject = subjects.find(s => s.id === subjectId);
                if (subject) {
                    subject.target = value;
                    Utils.showToast('Target updated', 'success');
                }
            }
        });
    }

    function saveSetup() {
        if (saveData()) {
            setupComplete.classList.remove('hidden');
            targetsList.classList.add('hidden');
            saveSetupBtn.classList.add('hidden');
            
            Utils.showToast('Setup completed successfully!', 'success');
            
            // Update first run setting
            const settings = JSON.parse(localStorage.getItem('attendo_settings') || '{}');
            settings.firstRun = false;
            localStorage.setItem('attendo_settings', JSON.stringify(settings));
        }
    }

    function setupEventListeners() {
        // Add subject
        addSubjectBtn.addEventListener('click', addSubject);
        subjectNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addSubject();
        });

        // Step navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-next') || e.target.closest('.btn-next')) {
                const btn = e.target.classList.contains('btn-next') ? e.target : e.target.closest('.btn-next');
                const nextStep = parseInt(btn.dataset.next);
                
                if (validateStep(currentStep)) {
                    updateStep(nextStep);
                }
            }
            
            if (e.target.classList.contains('btn-back') || e.target.closest('.btn-back')) {
                const btn = e.target.classList.contains('btn-back') ? e.target : e.target.closest('.btn-back');
                const prevStep = parseInt(btn.dataset.prev);
                updateStep(prevStep);
            }
        });

        // Save setup
        saveSetupBtn.addEventListener('click', saveSetup);
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
                const hasClasses = Object.values(timetable).some(day => day.length > 0);
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
});