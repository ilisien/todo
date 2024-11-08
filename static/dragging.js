document.addEventListener('DOMContentLoaded', function() {
    const dragLists = document.querySelectorAll('.draglist');
    const scrollThreshold = 50; // Pixels from edge to trigger scrolling
    const scrollSpeed = 5;     // Pixels to scroll per frame

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

                placeholder = document.createElement('li');
                placeholder.classList.add('placeholder');
                dragList.insertBefore(placeholder, draggedItem.nextSibling);
            }
        });

        dragList.addEventListener('mousemove', (e) => {
            if (isDragging && draggedItem) {
                e.preventDefault();

                let newPosition = Array.from(dragList.children).indexOf(placeholder);
                const elementBelow = document.elementFromPoint(e.clientX, e.clientY);

                if (elementBelow && elementBelow.parentNode === dragList) {
                    if (getOffset(elementBelow).top + elementBelow.offsetHeight / 2 > getOffset(placeholder).top + placeholder.offsetHeight / 2 && elementBelow !== placeholder && elementBelow != draggedItem) {
                        dragList.insertBefore(placeholder, elementBelow.nextSibling);
                    } else if (elementBelow !== placeholder && elementBelow != draggedItem){
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

                draggedItem = null;
                placeholder = null;
            }
        });

        dragList.addEventListener('mouseleave', (e) => {  // Added mouseleave
           if (isDragging && draggedItem) {
                // Stop any potential auto-scrolling if mouse leaves while dragging.
            }
        });
    });
});