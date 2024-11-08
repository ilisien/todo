document.addEventListener('DOMContentLoaded', function() {
    const dragLists = document.querySelectorAll('.draglist');
    const scrollThreshold = 50;
    const scrollSpeed = 5;

    dragLists.forEach(dragList => {
        let draggedItem = null;
        let isDragging = false;
        let placeholder = null;

        function getOffset(el) {
            const rect = el.getBoundingClientRect();
            return {
                left: rect.left + window.scrollX,
                top: rect.top + window.scrollY
            };
        }

        function autoScroll(e) {
            const windowHeight = window.innerHeight;
            const windowWidth = window.innerWidth;

            if (e.clientY < scrollThreshold) {
                window.scrollBy(0, -scrollSpeed);
            } else if (e.clientY > windowHeight - scrollThreshold) {
                window.scrollBy(0, scrollSpeed);
            }

            if (e.clientX < scrollThreshold) {
                window.scrollBy(-scrollSpeed, 0);
            } else if (e.clientX > windowWidth - scrollThreshold) {
                window.scrollBy(scrollSpeed, 0);
            }
        }

        dragList.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('draggable')) {
                e.preventDefault();
                isDragging = true;
                draggedItem = e.target;
                draggedItem.classList.add('drag');

                // Create a placeholder and style it
                placeholder = document.createElement('li');
                placeholder.classList.add('placeholder');
                placeholder.style.width = `${draggedItem.offsetWidth}px`;
                placeholder.style.position = 'absolute';
                placeholder.style.visibility = 'hidden'; // Hide until positioned

                dragList.appendChild(placeholder);
            }
        });

        dragList.addEventListener('mousemove', (e) => {
            if (isDragging && draggedItem) {
                e.preventDefault();
        
                const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        
                if (elementBelow && elementBelow.parentNode === dragList && elementBelow !== placeholder && elementBelow !== draggedItem) {
                    const rect = elementBelow.getBoundingClientRect();
                    const insertAfter = e.clientY > rect.top + rect.height / 2;
        
                    // Calculate midpoint for snapping
                    const offset = getOffset(elementBelow);
                    const midpoint = insertAfter ? offset.top + elementBelow.offsetHeight + 5 : offset.top - 5;

                    // Update placeholder position to midpoint or offset
                    placeholder.style.left = `${offset.left}px`;
                    placeholder.style.top = `${midpoint}px`;
                    placeholder.style.visibility = 'visible';
        
                    // Move placeholder in DOM without shifting other elements
                    if (insertAfter) {
                        dragList.insertBefore(placeholder, elementBelow.nextSibling);
                    } else {
                        dragList.insertBefore(placeholder, elementBelow);
                    }
                }
                autoScroll(e);
            }
        });
        

        dragList.addEventListener('mouseup', (e) => {
            if (isDragging && draggedItem) {
                e.preventDefault();
                isDragging = false;
                draggedItem.classList.remove('drag');

                dragList.insertBefore(draggedItem, placeholder);
                placeholder.remove();

                const order = Array.from(dragList.children)
                    .filter(item => item.classList.contains('draggable'))
                    .map(item => item.dataset.taskId);

                fetch('/update_task_order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ order: order })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('Order updated successfully');
                    } else {
                        console.error('Error updating order:', data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });

                draggedItem = null;
                placeholder = null;
            }
        });
    });
});
