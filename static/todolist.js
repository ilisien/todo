// Function to prevent page reload on form submission
document.getElementById('todo-form').addEventListener('submit', function(event) {
    event.preventDefault();
    addTask();
});

// Add task via AJAX and update the UI
async function addTask() {
    // Don't send an empty task name initially
    const response = await fetch('/add_task', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task: "untitled" }), // Add a default "untitled" task
    });

    const result = await response.json();
    if (result.success) {
        const newTaskHTML = `
            <li data-task-id="${result.id}" class="task-item draggable" draggable="true">
                <div class="task-wrapper">
                    <div class="main-taskbar">
                        <button class="toggle-task" data-task-id="${result.id}">${result.completed ? 'x' : '⠀'}</button>
                        <span class="task-name">${result.task}</span>
                        <div class="options">
                            <button class="add-subtask" data-task-id="${result.id}">➕</button>
                            <button class="delete-task" data-task-id="${result.id}">🗑️</button>
                        </div>
                    </div>
                    <ul class="subtasks">
                    </ul>
                </div>
            </li>`;
        document.querySelector('ul.active-tasks').insertAdjacentHTML('afterbegin', newTaskHTML);

        // Automatically start editing the new task name
        editTask(result.id); 
    }
}


// Toggle task completion and move it to the appropriate section without reloading the page
async function toggleTask(taskId) {
    const response = await fetch(`/toggle_task/${taskId}`, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
        const taskElement = document.querySelector(`li[data-task-id="${taskId}"]`);
        taskElement.classList.toggle('completed', result.completed);

        // Move task between active and completed sections based on its completion status
        if (result.completed) {
            document.querySelector('.completed-tasks').insertAdjacentElement('afterbegin', taskElement);
        } else {
            document.querySelector('.active-tasks').appendChild(taskElement);
        }

        const toggleButton = taskElement.querySelector('.toggle-task');
        toggleButton.innerText = result.completed ? 'x' : '⠀';
    }
}

// 🗑️ task via AJAX and remove from UI
async function deleteTask(taskId) {
    const response = await fetch(`/delete_task/${taskId}`, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
        document.querySelector(`li[data-task-id="${taskId}"]`).remove();
    }
}

// Edit task name via AJAX
async function editTask(taskId) {
    const taskElement = document.querySelector(`li[data-task-id="${taskId}"] .task-name`);

    taskElement.contentEditable = true;
    taskElement.focus();

    const handleBlurOrEnter = async () => {
        const newName = taskElement.innerText.trim(); // Trim whitespace
        if (newName) {
            // Save the new name
            const response = await fetch(`/edit_task/${taskId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_name: newName }),
            });
        } else {
            // If the name is empty, set it to "untitled"
            taskElement.innerText = "untitled";
        }
        taskElement.contentEditable = false; 
    };


    taskElement.addEventListener('blur', handleBlurOrEnter);
    taskElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent adding a new line
            handleBlurOrEnter();
        }
    });
}


// Add, toggle, and delete subtasks similar to tasks
async function addSubtask(taskId) {
    // 1. Send request to add subtask (with default "untitled" name)
    const response = await fetch(`/add_subtask/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtask: "untitled" }), // Add a default "untitled" subtask
    });

    // 2. Handle response from server
    const result = await response.json();
    if (result.success) {
        // 3. Create new subtask HTML element
        const subtaskList = document.querySelector(`li[data-task-id="${taskId}"] .subtasks`);
        const newSubtaskHTML = `
            <li class="subtask-item" data-subtask-id="${result.subtask_id}">
                <button class="toggle-subtask" data-subtask-id="${result.subtask_id}">⠀</button>
                <span class="subtask-name"></span> 
                <button class="delete-subtask" data-subtask-id="${result.subtask_id}">🗑️</button>
            </li>`;

        // 4. Add the new subtask to the UI
        subtaskList.insertAdjacentHTML('beforeend', newSubtaskHTML);

        // 5. Automatically start editing the new subtask name
        editSubtask(result.subtask_id);
    }
}

async function toggleSubtask(subtaskId) {
    const response = await fetch(`/toggle_subtask/${subtaskId}`, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
        const subtaskElement = document.querySelector(`li[data-subtask-id="${subtaskId}"]`);
        subtaskElement.classList.toggle('completed', result.completed);
        const toggleButton = subtaskElement.querySelector('.toggle-subtask');
        toggleButton.innerText = result.completed ? 'x' : '⠀';
    }
}

async function deleteSubtask(subtaskId) {
    const response = await fetch(`/delete_subtask/${subtaskId}`, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
        document.querySelector(`li[data-subtask-id="${subtaskId}"]`).remove();
    }
}

async function editSubtask(subtaskId) {
    // 1. Get the subtask name element
    const subtaskElement = document.querySelector(`li[data-subtask-id="${subtaskId}"] .subtask-name`);

    // 2. Make it editable
    subtaskElement.contentEditable = true;
    subtaskElement.focus();

    // 3. Handle blur or Enter key events
    const handleBlurOrEnter = async () => {
        const newName = subtaskElement.innerText.trim(); // Trim whitespace

        if (newName) {
            // 4a. Save the new name if it's not empty
            const response = await fetch(`/edit_subtask/${subtaskId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_name: newName }),
            });
            const result = await response.json();
            if (result.success) {
                subtaskElement.contentEditable = false; 
            }
        } else {
            // 4b. Set to "untitled" and gray it out if empty
            subtaskElement.innerText = "untitled";
            subtaskElement.contentEditable = false; 
        }
    };

    subtaskElement.addEventListener('blur', handleBlurOrEnter);
    subtaskElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleBlurOrEnter();
        }
    });
}

// Event delegation for task/subtask actions
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('toggle-task')) {
        const taskId = event.target.getAttribute('data-task-id');
        toggleTask(taskId);
    }
    if (event.target.classList.contains('delete-task')) {
        const taskId = event.target.getAttribute('data-task-id');
        deleteTask(taskId);
    }
    if (event.target.classList.contains('task-name')) { // Handle clicks on task names
        const taskId = event.target.closest('li').getAttribute('data-task-id');
        editTask(taskId);
    }
    if (event.target.classList.contains('add-subtask')) {
        const taskId = event.target.getAttribute('data-task-id');
        addSubtask(taskId);
    }
    if (event.target.classList.contains('toggle-subtask')) {
        const subtaskId = event.target.getAttribute('data-subtask-id');
        toggleSubtask(subtaskId);
    }
    if (event.target.classList.contains('subtask-name')) { // Handle clicks on subtask names
        const subtaskId = event.target.closest('li').getAttribute('data-subtask-id');
        editSubtask(subtaskId);
    }
    if (event.target.classList.contains('delete-subtask')) {
        const subtaskId = event.target.getAttribute('data-subtask-id');
        deleteSubtask(subtaskId);
    }
});

// Fetch and display tasks when the page loads
async function fetchTasks() {
    const response = await fetch('/fetch_tasks');
    const result = await response.json();

    if (result.success) {
        // Clear current task list
        document.querySelector('ul.active-tasks').innerHTML = '';
        document.querySelector('ul.completed-tasks').innerHTML = '';

        result.todos.forEach(task => {
            let taskHTML = `
                <li data-task-id="${task.id}" class="task-item draggable" draggable="true">
                    <div class="task-wrapper">
                        <div class="main-taskbar">
                            <button class="toggle-task" data-task-id="${task.id}">${task.completed ? 'x' : '⠀'}</button>
                            <span class="task-name">${task.task}</span>
                            <div class="options">
                                <button class="add-subtask" data-task-id="${task.id}">➕</button>
                                <button class="delete-task" data-task-id="${task.id}">🗑️</button>
                            </div>
                        </div>
                        <ul class="subtasks">
                            ${task.subtasks.map(subtask => `
                                <li class="subtask-item" data-subtask-id="${subtask.id}">
                                    <button class="toggle-subtask" data-subtask-id="${subtask.id}">${subtask.completed ? 'x' : '⠀'}</button>
                                    <span class="subtask-name ${subtask.completed ? 'completed' : ''}">${subtask.name}</span>
                                    <button class="delete-subtask" data-subtask-id="${subtask.id}">🗑️</button>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </li>`;

            // Append to correct section (active or completed)
            if (task.completed) {
                document.querySelector('ul.completed-tasks').insertAdjacentHTML('beforeend', taskHTML);
            } else {
                document.querySelector('ul.active-tasks').insertAdjacentHTML('beforeend', taskHTML);
            }
        });
    }
}


// Fetch tasks when the page loads
window.onload = fetchTasks;