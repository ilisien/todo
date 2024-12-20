// Function to prevent page reload on form submission
document.getElementById('todo-form').addEventListener('submit', function(event) {
    event.preventDefault();
    addTask();
});

let taskToggleDebounce = {}; // Object to store debounce status for each task

async function toggleTask(taskId) {
    // Check if this task is already being toggled
    if (taskToggleDebounce[taskId]) return;

    // Set debounce flag to prevent rapid toggles
    taskToggleDebounce[taskId] = true;

    // Locate the task element
    const taskElement = document.querySelector(`li[data-task-id="${taskId}"]`);

    // Check which list the task is currently in
    const isCompleted = taskElement.parentElement.classList.contains('completed-tasks');

    // Save the current order of tasks in the list before moving
    const currentList = taskElement.parentElement;
    const currentOrder = Array.from(currentList.children)
        .filter(item => item.classList.contains('draggable'))
        .map(item => item.dataset.taskId);

    // Update the task UI state (move the task immediately in the UI)
    const newCompletedState = !isCompleted;

    // Move the task to the appropriate list (active or completed)
    if (newCompletedState) {
        document.querySelector('.completed-tasks').insertAdjacentElement('afterbegin', taskElement);
    } else {
        document.querySelector('.active-tasks').appendChild(taskElement);
    }

    // Update the toggle button text based on the new state
    const toggleButton = taskElement.querySelector('.toggle-task');
    toggleButton.innerText = newCompletedState ? '☒' : '☐';

    // After the toggle, update the order within the list
    const newList = newCompletedState ? document.querySelector('.completed-tasks') : document.querySelector('.active-tasks');
    const newOrder = Array.from(newList.children)
        .filter(item => item.classList.contains('draggable'))
        .map(item => item.dataset.taskId);

    // Send request to the server to update the task's completion state
    let toggleSuccess = false;
    try {
        const response = await fetch(`/toggle_task/${taskId}`, { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            toggleSuccess = true; // Task toggle succeeded on the server
        } else {
            alert("Failed to update task status. Please try again.");
        }
    } catch (error) {
        console.error("Error toggling task:", error);
    }

    if (toggleSuccess) {
        // Send update request to server to reorder tasks after toggle success
        try {
            const response = await fetch('/update_task_order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order: newOrder })
            });
            const result = await response.json();
            if (!result.success) {
                alert("Failed to update task order. Please try again.");
            }
        } catch (error) {
            console.error("Error updating task order:", error);
        }
    } else {
        // If task toggle failed, revert UI changes
        if (isCompleted) {
            document.querySelector('.completed-tasks').appendChild(taskElement);
        } else {
            document.querySelector('.active-tasks').appendChild(taskElement);
        }
        toggleButton.innerText = isCompleted ? '☒' : '☐';
    }

    // Clear debounce after a short delay to allow further toggles
    setTimeout(() => {
        taskToggleDebounce[taskId] = false;
    }, 200); // Adjust debounce time if needed
}

// 🗑️ task via AJAX and remove from UI
async function deleteTask(taskId) {
    // Locate the task element and remove it from the UI immediately
    const taskElement = document.querySelector(`li[data-task-id="${taskId}"]`);
    taskElement.remove();

    // Send request to the server
    try {
        const response = await fetch(`/delete_task/${taskId}`, { method: 'POST' });
        const result = await response.json();
        if (!result.success) {
            // Roll back UI change if there's an error
            document.querySelector('ul.active-tasks').appendChild(taskElement);
            alert("Failed to delete task. Please try again.");
        }
    } catch (error) {
        // Roll back UI if fetch fails
        document.querySelector('ul.active-tasks').appendChild(taskElement);
        console.error("Error deleting task:", error);
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
                <button class="toggle-subtask" data-subtask-id="${result.subtask_id}">☐</button>
                <span class="subtask-name"></span> 
                <button class="delete-subtask" data-subtask-id="${result.subtask_id}">×</button>
            </li>`;

        // 4. Add the new subtask to the UI
        subtaskList.insertAdjacentHTML('beforeend', newSubtaskHTML);

        // 5. Automatically start editing the new subtask name
        editSubtask(result.subtask_id);
    }
}

let subtaskToggleDebounce = {}; // Object to store debounce status for each subtask

async function toggleSubtask(subtaskId) {
    // Check if this subtask is in the middle of a toggle action
    if (subtaskToggleDebounce[subtaskId]) return;

    // Set debounce flag to true to prevent rapid toggles
    subtaskToggleDebounce[subtaskId] = true;

    // Locate the subtask element, toggle button, and initial state
    const subtaskElement = document.querySelector(`li[data-subtask-id="${subtaskId}"]`);
    const toggleButton = subtaskElement.querySelector('.toggle-subtask');
    const isCompleted = subtaskElement.classList.contains('completed');

    // Update UI immediately
    subtaskElement.classList.toggle('completed', !isCompleted);
    toggleButton.innerText = !isCompleted ? '☒' : '☐';

    // Send request to the server
    try {
        const response = await fetch(`/toggle_subtask/${subtaskId}`, { method: 'POST' });
        const result = await response.json();
        if (!result.success) {
            // Roll back UI if the request fails
            subtaskElement.classList.toggle('completed', isCompleted);
            toggleButton.innerText = isCompleted ? '☒' : '☐';
            alert("Failed to update subtask status. Please try again.");
        }
    } catch (error) {
        // Roll back UI if the fetch fails
        subtaskElement.classList.toggle('completed', isCompleted);
        toggleButton.innerText = isCompleted ? '☒' : '☐';
        console.error("Error toggling subtask:", error);
    } finally {
        // Clear debounce after a short delay to allow new toggles
        setTimeout(() => {
            subtaskToggleDebounce[subtaskId] = false;
        }, 200); // Adjust debounce time as needed
    }
}


async function deleteSubtask(subtaskId) {
    // Locate the subtask element and remove it from the UI immediately
    const subtaskElement = document.querySelector(`li[data-subtask-id="${subtaskId}"]`);
    subtaskElement.remove();

    // Send request to the server
    try {
        const response = await fetch(`/delete_subtask/${subtaskId}`, { method: 'POST' });
        const result = await response.json();
        if (!result.success) {
            // Roll back UI change if there's an error
            document.querySelector(`li[data-task-id="${subtaskElement.closest('.task-item').getAttribute('data-task-id')}"] .subtasks`).appendChild(subtaskElement);
            alert("Failed to delete subtask. Please try again.");
        }
    } catch (error) {
        // Roll back UI if fetch fails
        document.querySelector(`li[data-task-id="${subtaskElement.closest('.task-item').getAttribute('data-task-id')}"] .subtasks`).appendChild(subtaskElement);
        console.error("Error deleting subtask:", error);
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

function filterTasksByTab(tabId) {  // Now takes tabId as argument
    const allTasks = document.querySelectorAll('.task-item');
    allTasks.forEach(task => {
        if (tabId === 'all') { // Special case for the "All" tab
            task.style.display = 'block';
        } else {
            const taskTabId = task.dataset.tabId;
            if (String(taskTabId) === String(tabId)) { // Compare as strings to avoid type issues
                task.style.display = 'block';
            } else {
                task.style.display = 'none';
            }
        }
    });
}


// Fetch and display tasks
async function fetchTasks() {
    const response = await fetch('/fetch_tasks');
    const result = await response.json();

    if (result.success) {
        // Clear current task lists
        document.querySelector('ul.active-tasks').innerHTML = '';
        document.querySelector('ul.completed-tasks').innerHTML = '';


        result.todos.forEach(task => {
            // ... (create taskHTML same as before, including subtasks if needed)
            let taskHTML = `
                <li data-task-id="${task.id}" class="task-item draggable" draggable="true">
                    <div class="task-wrapper">
                        <div class="main-taskbar">
                            <button class="toggle-task" data-task-id="${task.id}">${task.completed ? '☒' : '☐'}</button>
                            <span class="task-name">${task.task}</span>
                            <div class="options">
                                <button class="add-subtask" data-task-id="${task.id}">+</button>
                                <button class="delete-task" data-task-id="${task.id}">×</button>
                            </div>
                        </div>
                        <ul class="subtasks">`;

            // Add subtasks for the task
            task.subtasks.forEach(subtask => {
                taskHTML += `
                    <li class="subtask-item ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}">
                        <button class="toggle-subtask" data-subtask-id="${subtask.id}">${subtask.completed ? '☒' : '☐'}</button>
                        <span class="subtask-name">${subtask.name}</span>
                        <button class="delete-subtask" data-subtask-id="${subtask.id}">×</button>
                    </li>`;
            });

            taskHTML += `
                        </ul>
                    </div>
                </li>`;
            // Create a temporary div (not added to the DOM)
            const tempDiv = document.createElement('div');  

            // Set the innerHTML of the temporary div
            tempDiv.innerHTML = taskHTML;       

            // Get the first child (which is your <li>)
            const taskElement = tempDiv.firstElementChild; 

            // Now you can set dataset properties:
            taskElement.dataset.tabId = task.tabId;
            console.log(task.tabId)

            // Append to the appropriate list
            if (task.completed) {
                document.querySelector('ul.completed-tasks').appendChild(taskElement);
            } else {
                document.querySelector('ul.active-tasks').appendChild(taskElement);
            }
        });

         // After rendering, call filterTasksByTab to apply current tab filtering
        const currentActiveTab = document.querySelector('.tab.active');
        if (currentActiveTab) {
            filterTasksByTab(currentActiveTab.dataset.tabId);
        }

    }
}



// Add task - updated to include tab and set data attribute
async function addTask() {
    const activeTab = document.querySelector('.tab.active');
    const tabId = activeTab ? activeTab.dataset.tabId : null;  // Get tabId

    const response = await fetch('/add_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: "untitled", tabId: tabId }),  // Send tabId
    });

    const result = await response.json();
    if (result.success) {
        // Create the newTaskHTML *here* after the fetch call:
        const newTaskHTML = `
            <li data-task-id="${result.id}" class="task-item draggable" draggable="true">
                <div class="task-wrapper">
                    <div class="main-taskbar">
                        <button class="toggle-task" data-task-id="${result.id}">${result.completed ? '☒' : '☐'}</button>
                        <span class="task-name">${result.task}</span>
                        <div class="options">
                            <button class="add-subtask" data-task-id="${result.id}">+</button>
                            <button class="delete-task" data-task-id="${result.id}">×</button>
                        </div>
                    </div>
                    <ul class="subtasks"></ul>  </div>
            </li>`;

        // Now you can use newTaskHTML:
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newTaskHTML;
        const newTaskLi = tempDiv.firstElementChild;
        newTaskLi.dataset.tabId = tabId;

        document.querySelector('ul.active-tasks').insertAdjacentElement('afterbegin', newTaskLi);

        // Automatically start editing the new task name
        editTask(result.id); 
    }
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        filterTasksByTab(tab.dataset.tab); // Filter tasks by tab


        // Use data-tab-id instead of data-tab
        filterTasksByTab(tab.dataset.tabId);  

        // Update the URL
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('tab', tab.dataset.tabId); // Make sure to save tabId instead of tab name to the URL
        window.history.replaceState({}, '', '?' + urlParams.toString());
    });
});

//Create new tab
async function createNewTab() {
    const newTabName = prompt("Enter the name for the new tab:");
    if (!newTabName) {
        return; // Don't create a tab if the user cancels or enters nothing
    }


    try {
        const response = await fetch('/create_tab', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tab_name: newTabName })
        });

        const result = await response.json();
        if (result.success) {
            // Create the tab element
            const newTab = document.createElement('div');
            newTab.classList.add('tab');
            newTab.dataset.tabId = result.tabId; // use result.tabId here
            newTab.textContent = newTabName;


            // Add event listener (important!)
            newTab.addEventListener('click', handleTabClick);  // Add the click handler

            document.querySelector('.tabs').insertBefore(newTab, document.getElementById('add-tab-button'));

            // Activate the new tab:
            deactivateAllTabs();
            newTab.classList.add('active');
            filterTasksByTab(result.tabId);  // Filter tasks by the new tab's ID

            updateTabUrl(result.tabId); // Update the URL with the new tab
        } else {
            alert(result.error); // Display error message to the user
        }


    } catch (error) {
        console.error('Error creating tab:', error);
        alert('An error occurred while creating the tab.');
    }
}

// Tab click handler (common logic)
function handleTabClick(event) {
    deactivateAllTabs();
    event.target.classList.add('active');
    filterTasksByTab(event.target.dataset.tabId);  // Filter tasks for the clicked tab
    updateTabUrl(event.target.dataset.tabId); // Update the URL
}

function updateTabUrl(tabId) {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('tab', tabId);
    window.history.replaceState({}, '', '?' + urlParams.toString());
}

function deactivateAllTabs() {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
}


// Attach the handleTabClick function to each existing tab when the page loads.
window.onload = () => {
    //Attach event listeners to initial tabs:
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', handleTabClick);
    });


    fetchTasks().then(() => {
        const activeTabFromUrl = (new URLSearchParams(window.location.search)).get('tab')
        const initialTab = document.querySelector(`.tab[data-tab-id="${activeTabFromUrl}"]`) || document.querySelector('.tab[data-tab-id="all"]'); // Select 'All' tab by default

        if (initialTab) {
            deactivateAllTabs(); // Deactivate all other tabs
            initialTab.classList.add('active');
            filterTasksByTab(initialTab.dataset.tabId);
        }
    });

    // Attach event listener to the 'Add Tab' button.
    const addTabButton = document.getElementById('add-tab-button');
    if (addTabButton) {
        addTabButton.addEventListener('click', createNewTab); // Attach click handler
    }


}