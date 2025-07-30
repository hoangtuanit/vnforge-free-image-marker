jQuery(document).ready(function($) {
    
    // WordPress Media Library instance
    var mediaUploader;
    const postId = $('#vnforge-hidden-post-id').val();
    
    // Initialize admin functionality
    initAdmin();
    
    function initAdmin() {
        // Upload Image button
        $('#vnforge-upload-image').on('click', function(e) {
            e.preventDefault();
            openMediaLibrary();
        });
        
        // Clear Image button
        $('#vnforge-clear-image').on('click', function(e) {
            e.preventDefault();
            clearImage();
        });
        
        // Clear Markers button
        $('#vnforge-clear-markers').on('click', function(e) {
            e.preventDefault();
            clearMarkers();
        });
        
        // Initialize existing image if present
        var imagePreview = $('#vnforge-image-preview');
        var existingImage = imagePreview.find('img');
        if (existingImage.length > 0) {
            var imageData = {
                id: existingImage.data('id'),
                post_id: postId,
                url: existingImage.attr('src'),
                alt: existingImage.attr('alt') || ''
            };
            imagePreview.data('image', imageData);
            setupClickToAddMarker();
            loadMarkersForImage(postId);
        }

        imagePreview.on('mousemove', function(e) {
            var rect = this.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            
            // Calculate percentage
            var percentX = Math.round((x / rect.width) * 100);
            var percentY = Math.round((y / rect.height) * 100);
            
            // Update cursor style to show coordinates
            $(this).css('cursor', 'crosshair');
            
            // Show coordinates in tooltip
            showCoordinateTooltip(e.clientX, e.clientY, percentX, percentY);
            
        }).on('mouseleave', function() {
            // Reset cursor when leaving image
            $(this).css('cursor', 'default');
            hideCoordinateTooltip();
        });

        $('body').on('click', '#vnforge-cancel-marker', function(e) {
            console.log('cancel marker');
            e.preventDefault();
            closeMarkerDialog();
        });
    }
    
    /**
     * Open WordPress Media Library
     */
    function openMediaLibrary() {
        // If the uploader object has already been created, reopen the dialog
        if (mediaUploader) {
            mediaUploader.open();
            return;
        }
        
        // Create the media uploader
        mediaUploader = wp.media({
            title: 'Select Image',
            button: {
                text: 'Use this image'
            },
            multiple: false,
            library: {
                type: 'image'
            }
        });
        
        // When an image is selected, run a callback
        mediaUploader.on('select', function() {
            var attachment = mediaUploader.state().get('selection').first().toJSON();
            displayImage(attachment);
            reset();
        });
        
        // Open the uploader dialog
        mediaUploader.open();
    }
    
    /**
     * Display selected image
     */
    function displayImage(attachment) {
        var imagePreview = $('#vnforge-image-preview');
        var clearButton = $('#vnforge-clear-image');
        
        // Create image element
        var img = $('<img>', {
            src: attachment.url,
            alt: attachment.alt || attachment.title,
            'data-id': attachment.id
        });
        
        // Clear previous content and add image
        imagePreview.empty().append(img);
        
        // Show clear button
        clearButton.show();
        
        // Store image data
        imagePreview.data('image', attachment);
        
        // Update hidden image ID field
        $('#vnforge-hidden-image-id').val(attachment.id);
        
        // Enable click-to-add marker functionality
        setupClickToAddMarker();
        
        // Load existing markers for this image
        loadMarkersForImage(attachment.id);
        
        // Update hidden markers field
        updateHiddenMarkersField();
        
        // Trigger custom event for other scripts
        $(document).trigger('vnforge:imageSelected', [attachment]);
        
        console.log('Image selected:', attachment);
    }
    
    /**
     * Clear selected image
     */
    function clearImage() {
        var imagePreview = $('#vnforge-image-preview');
        var clearButton = $('#vnforge-clear-image');
        
        // Clear image
        imagePreview.empty().html('<p class="vnforge-no-image">' + 
            'No image selected. Please upload an image below.' + '</p>');
        
        // Hide clear button
        clearButton.hide();
        
        // Remove stored data
        imagePreview.removeData('image');
        
        // Clear hidden fields
        $('#vnforge-hidden-image-id').val('');
        $('#vnforge-hidden-markers').val('[]');

        
        // Disable click-to-add marker functionality
        disableClickToAddMarker();
        
        reset();
        // Trigger custom event
        $(document).trigger('vnforge:imageCleared');
        
        console.log('Image cleared');
    }
    
    /**
     * Show admin message
     */
    function showAdminMessage(message, type) {
        type = type || 'info';
        
        var messageHtml = '<div class="notice notice-' + type + ' is-dismissible">' +
            '<p>' + message + '</p>' +
            '<button type="button" class="notice-dismiss">' +
            '<span class="screen-reader-text">' + 'Dismiss this notice.' + '</span>' +
            '</button>' +
            '</div>';
        
        $('.wrap h1').after(messageHtml);
        
        // Auto dismiss after 5 seconds
        setTimeout(function() {
            $('.notice').fadeOut();
        }, 5000);
    }
    
    /**
     * AJAX helper function
     */
    function makeAjaxRequest(action, data, callback) {
        var requestData = {
            action: action,
            nonce: vnforge_admin.nonce
        };
        
        // Merge additional data
        if (data) {
            $.extend(requestData, data);
        }
        
        // Debug request data
        console.log('VNForge: Sending AJAX request:', requestData);
        
        $.ajax({
            url: vnforge_admin.ajax_url,
            type: 'POST',
            data: requestData,
            success: function(response) {
                console.log('VNForge: AJAX response:', response);
                if (response.success) {
                    if (callback) callback(response.data);
                } else {
                    showAdminMessage(response.data || 'Error occurred', 'error');
                }
            },
            error: function(xhr, status, error) {
                showAdminMessage('AJAX Error: ' + error, 'error');
                console.error('AJAX Error:', xhr, status, error);
            }
        });
    }
    
    /**
     * Setup click-to-add marker functionality
     */
    function setupClickToAddMarker() {
        var imagePreview = $('#vnforge-image-preview');
        var img = imagePreview.find('img');
        
        if (img.length === 0) return;
        
        // Add click event to image
        img.off('click.vnforgeMarker').on('click.vnforgeMarker', function(e) {
            handleImageClick(e, this);
        });
        
        // Add visual indicator
        imagePreview.addClass('vnforge-clickable');
        img.addClass('vnforge-clickable');
        
        console.log('Click-to-add marker enabled');
    }
    
    /**
     * Disable click-to-add marker functionality
     */
    function disableClickToAddMarker() {
        var imagePreview = $('#vnforge-image-preview');
        var img = imagePreview.find('img');
        
        // Remove click event
        img.off('click.vnforgeMarker');
        
        // Remove visual indicator
        imagePreview.removeClass('vnforge-clickable');
        img.removeClass('vnforge-clickable');
        
        console.log('Click-to-add marker disabled');
    }
    
    /**
     * Handle image click to add marker
     */
    function handleImageClick(e, imgElement) {
        var rect = imgElement.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        
        // Calculate percentage positions
        var percentX = Math.round((x / rect.width) * 100);
        var percentY = Math.round((y / rect.height) * 100);
        
        console.log('Image clicked at:', percentX + '%', percentY + '%');
        
        markerData = {
            x: percentX,
            y: percentY,
            title: '',
            description: '',
            link: ''
        };
        // Show marker dialog
        showMarkerDialog(markerData);
    }
    
    /**
     * Show marker creation dialog
     */
    function showMarkerDialog(markerData) {
        var dialogHtml = '<div id="vnforge-marker-dialog" class="vnforge-dialog">' +
                            '<div class="vnforge-dialog-content">' +
                                '<h3>Add New Marker</h3>' +
                                '<form id="vnforge-marker-form">' +
                                    '<p><label>Title: <input type="text" name="title" required value="' + markerData.title + '"></label></p>' +
                                    '<p><label>Description: <textarea name="description" rows="3">' + markerData.description + '</textarea></label></p>' +
                                    '<p><label>Link (optional): <input type="url" name="link" value="' + markerData.link + '"></label></p>' +
                                    '<input type="hidden" name="id" value="' + markerData.id + '">' +
                                    '<input type="hidden" name="x" value="' + markerData.x + '">' +
                                    '<input type="hidden" name="y" value="' + markerData.y + '">' +
                                    '<div class="vnforge-dialog-buttons">' +
                                        '<button type="submit" class="button button-primary">Add Marker</button>' +
                                        '<button type="button" class="button button-secondary" id="vnforge-cancel-marker">Cancel</button>' +
                                    '</div>' +
                                '</form>' +
                            '</div>' +
                        '</div>';
        
        $('body').append(dialogHtml);
        
        // Focus on title input
        $('#vnforge-marker-dialog input[name="title"]').focus();
        
        // Handle form submission
        $('#vnforge-marker-form').on('submit', function(e) {
            e.preventDefault();
            saveMarker();
        });
    }
    
    /**
     * Close marker dialog
     */
    function closeMarkerDialog() {
        $('#vnforge-marker-dialog').remove();
    }
    
    // Make closeMarkerDialog globally available
    window.closeMarkerDialog = closeMarkerDialog;

    function reset(){
        var imageId = $('#vnforge-hidden-image-id').val();
        makeAjaxRequest('vnforge_reset', {
            post_id: postId,
            image_id: imageId,
        }, function(response) {
            console.log('Image saved');
        });
    }
    
    /**
     * Save marker data
     */
    function saveMarker() {
        var form = $('#vnforge-marker-form');
        var formData = {
            post_id: postId,
            title: form.find('input[name="title"]').val(),
            description: form.find('textarea[name="description"]').val(),
            link: form.find('input[name="link"]').val(),
            x: form.find('input[name="x"]').val(),
            y: form.find('input[name="y"]').val(),
        };
        
        console.log('Saving marker:', formData);
        
        // Send AJAX request to save marker
        makeAjaxRequest('vnforge_save_marker', formData, function(response) {
            closeMarkerDialog();
            showAdminMessage('Marker saved successfully!', 'success');
            
            // Add visual marker to image with saved data
            addMarkerToImage(response.marker);
        });
    }
    
    /**
     * Add visual marker to image
     */
    function addMarkerToImage(markerData) {
        var imagePreview = $('#vnforge-image-preview');
        var img = imagePreview.find('img');

        console.log('addMarkerToImage@MarkerData:', markerData);
        
        // Sử dụng trực tiếp giá trị percentage từ markerData
        var left = markerData.x;
        var top = markerData.y;
        
        // Đảm bảo giá trị trong khoảng 0-100
        left = Math.max(0, Math.min(100, left));
        top = Math.max(0, Math.min(100, top));
        
        // Create marker container
        var markerContainer = $('<div>', {
            class: 'vnforge-marker-container',
            css: {
                position: 'absolute',
                left: left + '%',
                top: top + '%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10
            },
            'data-marker': JSON.stringify(markerData)
        });
        
        // Create marker element
        var marker = $('<div>', {
            class: 'vnforge-marker',
            css: {
                width: '20px',
                height: '20px',
                backgroundColor: '#ff0000',
                zIndex: 11,
                borderRadius: '50%',
                border: '2px solid #fff',
                cursor: 'move',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }
        });

        marker.on('click', function(e) {
            e.stopPropagation();
            console.log('Marker clicked', markerData);
            // open modal
            showMarkerDialog(markerData);
        });
        
        // Create delete button
        var deleteBtn = $('<div>', {
            class: 'vnforge-marker-delete',
            html: '×',
            css: {
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '16px',
                height: '16px',
                backgroundColor: '#000',
                color: '#fff',
                borderRadius: '50%',
                border: '1px solid #fff',
                cursor: 'pointer',
                fontSize: '12px',
                lineHeight: '14px',
                textAlign: 'center',
                fontWeight: 'bold',
                zIndex: 11,
                display: 'none'
            }
        });
        
        // Add delete functionality
        deleteBtn.on('click', function(e) {
            e.stopPropagation();
            deleteMarker(markerContainer, markerData);
        });
        
        // Show delete button on hover
        markerContainer.hover(
            function() {
                $(this).find('.vnforge-marker-delete').show();
            },
            function() {
                $(this).find('.vnforge-marker-delete').hide();
            }
        );
        
        // Add elements to container
        markerContainer.append(marker);
        markerContainer.append(deleteBtn);
        
        // Add container to image
        imagePreview.css('position', 'relative').append(markerContainer);
        
        // Make marker draggable using jQuery UI
        makeMarkerDraggable(markerContainer, imagePreview);
        
        // Update hidden markers field
        updateHiddenMarkersField();
        
        console.log('Visual marker added');
    }
    
    /**
     * Make marker draggable using jQuery UI
     */
    function makeMarkerDraggable(marker, container) {
        marker.draggable({
            containment: container,
            grid: [1, 1], // Allow smooth movement
            cursor: 'move',
            start: function(event, ui) {
                // Add dragging class
                $(this).addClass('vnforge-dragging');
                container.addClass('vnforge-dragging-marker');
                console.log('Started dragging marker');
            },
            drag: function(event, ui) {
                // Update position during drag
            //     var position = ui.position;
            //     var containerRect = container[0].getBoundingClientRect();
                
            //     // Calculate percentage position
            //     var percentX = (position.left / containerRect.width) * 100;
            //     var percentY = (position.top / containerRect.height) * 100;
                
            //     // Constrain to bounds
            //     percentX = Math.max(0, Math.min(100, percentX));
            //     percentY = Math.max(0, Math.min(100, percentY));
                

            //     // Update marker position
            //     $(this).css({
            //         left: percentX + '%',
            //         top: percentY + '%'
            //     });
            },
            stop: function(event, ui) {
                // Remove dragging classes
                $(this).removeClass('vnforge-dragging');
                container.removeClass('vnforge-dragging-marker');

                var position = ui.position;
                var containerRect = container[0].getBoundingClientRect();

                // Calculate percentage position
                var percentX = (position.left / containerRect.width) * 100;
                var percentY = (position.top / containerRect.height) * 100;

                // Constrain to bounds
                percentX = Math.max(0, Math.min(100, percentX));
                percentY = Math.max(0, Math.min(100, percentY));


                // Update marker position
                $(this).attr('data-position', JSON.stringify({
                    x: parseFloat(percentX),
                    y: parseFloat(percentY)
                }));
                
                // Update marker data
                updateMarkerPosition($(this));
                
                console.log('Finished dragging marker', percentX, percentY);
            }
        });
    }
    
    /**
     * Update marker position data
     */
    function updateMarkerPosition(marker) {
        var position = JSON.parse(marker.attr('data-position'));
        var newX = position.x;
        var newY = position.y;
        
        // Get current marker data
        var markerData = JSON.parse(marker.attr('data-marker'));
        
        // Update position
        markerData.x = newX;
        markerData.y = newY;
        
        // Update data attribute
        marker.attr('data-marker', JSON.stringify(markerData));
        
        console.log('Marker position updated:', newX + '%', newY + '%', 'markerData', markerData );
        
        // Send AJAX request to update marker position
        makeAjaxRequest('vnforge_update_marker', {
            id: markerData.id,
            post_id: postId,
            x: newX,
            y: newY,
            title: markerData.title,
            description: markerData.description,
            link: markerData.link
        }, function(response) {
            console.log('Marker position saved to database');
        });
        
        // Update hidden markers field
        updateHiddenMarkersField();
    }
    
    /**
     * Load markers for an image
     */
    function loadMarkersForImage(postId) {
        makeAjaxRequest('vnforge_get_markers', {
            post_id: postId
        }, function(markers) {
            console.log('loadMarkersForImage@Markers:', markers);
            if (markers && markers.length > 0) {
                markers.forEach(function(marker) {
                    addMarkerToImage(marker);
                });
                console.log('Loaded', markers.length, 'markers');
            } else {
                console.log('No markers found for this image');
            }
            
            // Update hidden markers field after loading
            // updateHiddenMarkersField();
        });
    }
    
    // Make functions globally available
    window.vnforgeAdmin = {
        openMediaLibrary: openMediaLibrary,
        displayImage: displayImage,
        clearImage: clearImage,
        showAdminMessage: showAdminMessage,
        makeAjaxRequest: makeAjaxRequest,
        closeMarkerDialog: closeMarkerDialog
    };
    
        /**
     * Update hidden markers field
     */
    function updateHiddenMarkersField() {
        var imagePreview = $('#vnforge-image-preview');
        var hiddenMarkers = $('#vnforge-hidden-markers');
        
        // Collect all markers from the image
        var markers = [];
        imagePreview.find('.vnforge-marker-container').each(function() {
            var markerData = JSON.parse($(this).attr('data-marker'));
            markers.push(markerData);
        });
        
        // Update hidden markers field
        hiddenMarkers.val(JSON.stringify(markers));
        console.log('Hidden markers field updated:', markers);
    }
    
    /**
     * Show coordinate tooltip
     */
    function showCoordinateTooltip(x, y, percentX, percentY) {
        // Remove existing tooltip
        $('.vnforge-coordinate-tooltip').remove();
        
        // Create tooltip
        var $tooltip = $('<div>', {
            class: 'vnforge-coordinate-tooltip',
            text: percentX + '% x ' + percentY + '%',
            css: {
                position: 'fixed',
                left: (x + 10) + 'px',
                top: (y - 30) + 'px',
                backgroundColor: '#333',
                color: '#fff',
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                zIndex: 1000,
                pointerEvents: 'none'
            }
        });
        
        $('body').append($tooltip);
    }
    
    /**
     * Hide coordinate tooltip
     */
    function hideCoordinateTooltip() {
        $('.vnforge-coordinate-tooltip').remove();
    }
    
    /**
     * Delete marker
     */
    function deleteMarker(markerContainer, markerData) {
        if (confirm('Are you sure you want to delete this marker?')) {
            // Remove marker from DOM
            markerContainer.remove();
            
            // Update hidden markers field
            updateHiddenMarkersField();
            
            // Show success message
            showAdminMessage('Marker deleted successfully!', 'success');
            
            console.log('Marker deleted:', markerData);

            // Send AJAX request to delete marker
            makeAjaxRequest('vnforge_delete_marker', {
                id: markerData.id,
                post_id: postId
            }, function(response) {
                console.log('Marker deleted from database');
            });
        }
    }
    
    function clearMarkers() {
        var hiddenMarkers = $('#vnforge-hidden-markers');
        hiddenMarkers.val('[]');
        // Remove all markers from the image
        $('#vnforge-image-preview').find('.vnforge-marker').remove();
        reset();
        console.log('Hidden markers field cleared');
    }
    
});
