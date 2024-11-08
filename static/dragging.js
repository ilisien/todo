document.addEventListener('DOMContentLoaded', function() {
    const dragLists = document.querySelectorAll('.draglist'); // Select all draglists

    dragLists.forEach(dragList => {  // Iterate over each draglist
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

        dragList.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('draggable')) {
                e.preventDefault();
                isDragging = true;
                draggedItem = e.target;
                draggedItem.classList.add('drag');


                // Placeholder:
                placeholder = document.createElement('li');
                placeholder.classList.add('placeholder');
                dragList.insertBefore(placeholder, draggedItem.nextSibling);
            }
        });

        dragList.addEventListener('mousemove', (e) => {
            if (isDragging && draggedItem) {
                e.preventDefault();

                // Reordering
                let newPosition = Array.from(dragList.children).indexOf(placeholder);


                const elementBelow = document.elementFromPoint(e.clientX, e.clientY);


                if (elementBelow && elementBelow.parentNode === dragList) {

                    // Determine if element below is above or below the center of the placeholder and insert accordingly:
                    if (getOffset(elementBelow).top + elementBelow.offsetHeight / 2 > getOffset(placeholder).top + placeholder.offsetHeight / 2 && elementBelow !== placeholder && elementBelow != draggedItem) {
                        dragList.insertBefore(placeholder, elementBelow.nextSibling); // Place below
                    } else if (elementBelow !== placeholder && elementBelow != draggedItem){
                        dragList.insertBefore(placeholder, elementBelow);  // Place above
                    }

                }

            }
        });

        dragList.addEventListener('mouseup', (e) => {
            if (isDragging && draggedItem) {
                e.preventDefault();
                isDragging = false;
                draggedItem.classList.remove('drag');


                // Put dragged item in placeholder's spot.
                dragList.insertBefore(draggedItem, placeholder);
                placeholder.remove();

                draggedItem = null;
                placeholder = null;
            }
        });
    });
});