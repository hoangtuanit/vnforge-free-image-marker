jQuery(document).ready(function($) {
    
    // WordPress Media Library instance
    var mediaUploader;
    const postId = $('#vnforge-hidden-post-id').val();
    let isDragging = false;
    
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
        
        // Initialize settings
        initSettings();
        applyCustomCSS();
        
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
                    if (callback) callback(response);
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
            // Add visual marker to image with saved data
            
            if(response.success){
                addMarkerToImage(response.data.marker);
                showAdminMessage('Marker saved successfully!', 'success');
            }else{
                showAdminMessage('Failed to save marker', 'error');
            }
        });
    }
    
    /**
     * Add visual marker to image
     */
    function addMarkerToImage(markerData) {
        var imagePreview = $('#vnforge-image-preview');
        var img = imagePreview.find('img');

        console.log('addMarkerToImage@MarkerData:', markerData);
        
        // Get current settings
        var markerType = $('input[name="vnforge_marker_type"]:checked').val() || 'color';
        var markerColor = $('#vnforge-marker-color').val() || '#ff0000';
        var markerSize = $('#vnforge-marker-size').val() || '20';
        var markerIcon = $('#vnforge-marker-icon').val() || '';
        var markerPinIcon = $('#vnforge-marker-pin-icon').val() || 'pin1.svg';
        var markerPinIconValue = $('#vnforge-hidden-marker-pin-icon-value').val() || '';
        
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
                zIndex: 10
            },
            'data-marker': JSON.stringify(markerData)
        });
        
        // Create marker element with settings based on type
        var markerCss = {
            width: markerSize + 'px',
            height: markerSize + 'px',
        };
        var marker;
        if (markerType === 'color') {
            markerCss.backgroundColor = markerColor;
            marker = $('<div>', {
                class: 'vnforge-marker',
                'data-marker-type': markerType,
                css: markerCss
            });
        } else if (markerType === 'icon') {
            if (markerIcon) {
                markerCss.backgroundImage = 'url(' + markerIcon + ')';
            } else {
                markerCss.backgroundColor = markerColor;
            }
            marker = $('<div>', {
                class: 'vnforge-marker',
                'data-marker-type': markerType,
                css: markerCss
            });
        } else if (markerType === 'pin') {
            // SVG inline
            marker = $('<div>', {
                class: 'vnforge-marker',
                'data-marker-type': markerType,
                css: Object.assign({}, markerCss, {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    background: 'none'
                })
            });

            console.log('markerPinIconValue', markerPinIconValue);
            marker.html(markerPinIconValue);
        }
        
        marker.on('click', function(e) {
            e.stopPropagation();
            console.log('Marker clicked', isDragging);
            if(isDragging){
                console.log('Dragging, cannot delete marker');
                return;
            }
            
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
        
        console.log('Visual marker added with settings:', { type: markerType, color: markerColor, size: markerSize, icon: markerIcon });
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
                isDragging = true;
                console.log('Started dragging marker');
            },
            stop: function(event, ui) {
                // Remove dragging classes
                $(this).removeClass('vnforge-dragging');
                
                setTimeout(function() {
                    isDragging = false;
                }, 500);
                
                console.log('Stopped dragging marker');

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
            if(!response.success){
                showAdminMessage('Failed to save marker position', 'error');
            }
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
        }, function(response) {
            if(!response.success){
                showAdminMessage('Failed to load markers', 'error');
                return;
            }

            var markers = response.data;
            if (markers && markers.length > 0) {
                markers.forEach(function(marker) {
                    addMarkerToImage(marker);
                });
                console.log('Loaded', markers.length, 'markers');
            } else {
                console.log('No markers found for this image');
            }
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
     * Show toast message with different types
     * 
     * @param {string} message - Message to display
     * @param {string} type - Message type: 'success', 'error', 'info', 'warning'
     */
    function showAdminMessage(message, type) {
        // Remove existing messages
        $('.vnforge-toast-message').remove();
        
        // Define icon and colors based on type
        var icon, bgColor, textColor, borderColor;
        
        switch(type) {
            case 'success':
                icon = '✓';
                bgColor = '#d4edda';
                textColor = '#155724';
                borderColor = '#c3e6cb';
                break;
            case 'error':
                icon = '✕';
                bgColor = '#f8d7da';
                textColor = '#721c24';
                borderColor = '#f5c6cb';
                break;
            case 'warning':
                icon = '⚠';
                bgColor = '#fff3cd';
                textColor = '#856404';
                borderColor = '#ffeaa7';
                break;
            case 'info':
            default:
                icon = 'ℹ';
                bgColor = '#d1ecf1';
                textColor = '#0c5460';
                borderColor = '#bee5eb';
                break;
        }
        
        // Create toast message
        var $toast = $('<div>', {
            class: 'vnforge-toast-message vnforge-' + type,
            html: '<span class="vnforge-toast-icon">' + icon + '</span>' +
                   '<span class="vnforge-toast-text">' + message + '</span>' +
                   '<span class="vnforge-toast-close">×</span>',
            css: {
                position: 'fixed',
                top: '32px',
                right: '20px',
                zIndex: 999999,
                padding: '12px 20px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                fontWeight: '500',
                maxWidth: '400px',
                backgroundColor: bgColor,
                color: textColor,
                border: '1px solid ' + borderColor,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                animation: 'vnforge-toast-slide-in 0.3s ease-out',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }
        });
        
        // Add close functionality
        $toast.find('.vnforge-toast-close').on('click', function() {
            hideToastMessage($toast);
        });
        
        // Auto hide after 5 seconds
        setTimeout(function() {
            hideToastMessage($toast);
        }, 5000);
        
        // Add to body
        $('body').append($toast);
        
        console.log('Toast message shown:', type, message);
    }
    
    /**
     * Hide toast message with animation
     */
    function hideToastMessage($toast) {
        $toast.css({
            animation: 'vnforge-toast-slide-out 0.3s ease-in'
        });
        
        setTimeout(function() {
            $toast.remove();
        }, 300);
    }
    
    
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
            
            // Show info message about remaining markers
            var remainingMarkers = $('#vnforge-image-preview').find('.vnforge-marker-container').length;
            if (remainingMarkers > 0) {
                showAdminMessage(remainingMarkers + ' markers remaining', 'info');
            }
            
            console.log('Marker deleted:', markerData);

            // Send AJAX request to delete marker
            makeAjaxRequest('vnforge_delete_marker', {
                id: markerData.id,
                post_id: postId
            }, function(response) {
                if(!response.success){
                    showAdminMessage('Failed to delete marker', 'error');
                }
            });
        }
    }
    
    function clearMarkers() {
        var markerCount = $('#vnforge-image-preview').find('.vnforge-marker-container').length;
        
        if (markerCount > 0) {
            if (confirm('Are you sure you want to clear all ' + markerCount + ' markers?')) {
                var hiddenMarkers = $('#vnforge-hidden-markers');
                hiddenMarkers.val('[]');
                // Remove all markers from the image
                $('#vnforge-image-preview').find('.vnforge-marker').remove();
                reset();
                
                showAdminMessage('All markers cleared successfully!', 'success');
                console.log('Hidden markers field cleared');
            } else {
                showAdminMessage('Clear operation cancelled', 'info');
            }
        } else {
            showAdminMessage('No markers to clear', 'warning');
        }
    }
    
    /**
     * Helper function to apply loading to any button with async operation
     * 
     * Features:
     * - Minimum loading time of 500ms for better UX
     * - Automatic button state management
     * - Promise-based async operation support
     * 
     * Usage example:
     * $('#my-button').on('click', function() {
     *     var $button = $(this);
     *     withButtonLoading($button, function() {
     *         return myAsyncFunction();
     *     }).then(function(result) {
     *         showAdminMessage('Success!', 'success');
     *     }).catch(function(error) {
     *         showAdminMessage('Error: ' + error, 'error');
     *     });
     * });
     */
    function withButtonLoading($button, asyncFunction) {
        var startTime = Date.now();
        var minLoadingTime = 500; // Minimum 500ms loading time
        
        setButtonLoading($button, true);
        
        return asyncFunction().then(function(result) {
            var elapsedTime = Date.now() - startTime;
            var remainingTime = Math.max(0, minLoadingTime - elapsedTime);
            
            return new Promise(function(resolve) {
                setTimeout(function() {
                    setButtonLoading($button, false);
                    resolve(result);
                }, remainingTime);
            });
        }).catch(function(error) {
            var elapsedTime = Date.now() - startTime;
            var remainingTime = Math.max(0, minLoadingTime - elapsedTime);
            
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    setButtonLoading($button, false);
                    reject(error);
                }, remainingTime);
            });
        });
    }
    
    /**
     * Reusable loading button system
     */
    function setButtonLoading($button, isLoading) {
        if (isLoading) {
            $button.prop('disabled', true);
            $button.data('original-text', $button.text());
            $button.html('<span class="spinner is-active"></span> ' + $button.data('original-text'));
            $button.addClass('vnforge-loading');
        } else {
            $button.prop('disabled', false);
            $button.text($button.data('original-text'));
            $button.removeClass('vnforge-loading');
        }
    }
    
    /**
     * Initialize settings functionality
     */
    function initSettings() {
        // Toggle marker type settings visibility
        $('input[name="vnforge_marker_type"]').on('change', function() {
            toggleMarkerTypeSettings();
        });
        
        // Initialize icon upload
        $('#vnforge-upload-icon').on('click', function() {
            openIconMediaLibrary();
        });
        
        // Initialize icon remove
        $('#vnforge-remove-icon').on('click', function() {
            removeIcon();
        });
        
        // Initialize save settings with loading
        $('#vnforge-save-settings').on('click', function() {
            var $button = $(this);
            withButtonLoading($button, function() {
                return saveSettings();
            }).then(function() {
                showAdminMessage('Settings saved successfully!', 'success');
            }).catch(function(error) {
                showAdminMessage('Failed to save settings: ' + error, 'error');
            });
        });
        
        // Initialize reset settings with loading
        $('#vnforge-reset-settings').on('click', function() {
            var $button = $(this);
            withButtonLoading($button, function() {
                return resetSettings();
            }).then(function() {
                showAdminMessage('Settings reset to default!', 'success');
            }).catch(function(error) {
                showAdminMessage('Failed to reset settings: ' + error, 'error');
            });
        });
        
        // Initialize custom CSS application
        $('#vnforge-custom-css').on('input', function() {
            applyCustomCSS();
        });
        
        // Initial toggle
        toggleMarkerTypeSettings();
    }
    
    /**
     * Toggle marker type settings visibility
     */
    function toggleMarkerTypeSettings() {
        var markerType = $('input[name="vnforge_marker_type"]:checked').val();
        console.log('Toggle marker type settings', markerType);
        if (markerType === 'color') {
            $('.vnforge-color-settings').show();
            $('.vnforge-icon-settings').hide();
            $('.vnforge-pin-settings').hide();
        } else if (markerType === 'icon') {
            $('.vnforge-color-settings').hide();
            $('.vnforge-icon-settings').show();
            $('.vnforge-pin-settings').hide();
        } else if (markerType === 'pin') {
            $('.vnforge-color-settings').hide();
            $('.vnforge-icon-settings').hide();
            $('.vnforge-pin-settings').show();
        }else{
            $('.vnforge-color-settings').show();
            $('.vnforge-icon-settings').hide();
            $('.vnforge-pin-settings').hide();
        }
    }

    /**
     * Open WordPress Media Library for icon upload
     */
    function openIconMediaLibrary() {
        // Create the media uploader for icons
        var iconUploader = wp.media({
            title: 'Select Icon',
            button: {
                text: 'Use this icon'
            },
            multiple: false,
            library: {
                type: 'image'
            }
        });
        
        // When an icon is selected, run a callback
        iconUploader.on('select', function() {
            var attachment = iconUploader.state().get('selection').first().toJSON();
            displayIcon(attachment);
        });
        
        // Open the uploader dialog
        iconUploader.open();
    }
    
    /**
     * Display selected icon
     */
    function displayIcon(attachment) {
        var iconPreview = $('#vnforge-icon-preview');
        var removeButton = $('#vnforge-remove-icon');
        
        // Update preview
        iconPreview.html('<img src="' + attachment.url + '" alt="Marker Icon" style="max-width: 50px; max-height: 50px;">');
        
        // Update hidden field
        $('#vnforge-marker-icon').val(attachment.url);
        
        // Show remove button
        removeButton.show();
        
        console.log('Icon selected:', attachment);
    }
    
    /**
     * Remove icon
     */
    function removeIcon() {
        var iconPreview = $('#vnforge-icon-preview');
        var removeButton = $('#vnforge-remove-icon');
        
        // Clear preview
        iconPreview.html('<p>No icon selected</p>');
        
        // Clear hidden field
        $('#vnforge-marker-icon').val('');
        
        // Hide remove button
        removeButton.hide();
        
        console.log('Icon removed');
    }
    
    /**
     * Save settings via AJAX
     */
    function saveSettings() {
        var settings = {
            post_id: $('#vnforge-hidden-post-id').val(),
            marker_type: $('input[name="vnforge_marker_type"]:checked').val(),
            marker_color: $('#vnforge-marker-color').val(),
            marker_size: $('#vnforge-marker-size').val(),
            marker_icon: $('#vnforge-marker-icon').val(),
            marker_pin_icon: $('input[name="vnforge_marker_pin_icon"]:checked').val(),
            custom_css: $('#vnforge-custom-css').val()
        };

        // Send AJAX request to save settings
        return new Promise(function(resolve, reject) {
            makeAjaxRequest('vnforge_save_settings', settings, function(response, error) {
                if (response.success) {
                    // Update existing markers with new settings
                    updateAllMarkersWithSettings();
                    resolve(response.data);
                } else {
                    reject(response.data || 'Failed to save settings');
                }
            });
        });
    }
    
    /**
     * Reset settings to default
     */
    function resetSettings() {
        // Reset form values
        $('input[name="vnforge_marker_type"][value="color"]').prop('checked', true);
        $('#vnforge-marker-color').val('#ff0000');
        $('#vnforge-marker-size').val('20');
        $('#vnforge-marker-icon').val('');
        $('#vnforge-marker-pin-icon').val('');
        $('#vnforge-custom-css').val('');
        
        // Update UI
        toggleMarkerTypeSettings();
        displayIcon('');
        updateMarkerPreview();
        applyCustomCSS();
        
        // Save reset settings
        return saveSettings();
    }
    
    /**
     * Update marker preview with current settings
     */
    function updateMarkerPreview() {
        var markerType = $('input[name="vnforge_marker_type"]:checked').val();
        var size = $('#vnforge-marker-size').val();

        $('.vnforge-marker').attr('data-marker-type', markerType);
        
        if (markerType === 'color') {
            var color = $('#vnforge-marker-color').val();
            
            // Update existing markers
            $('.vnforge-marker').css({
                backgroundColor: color,
                width: size + 'px',
                height: size + 'px',
                backgroundImage: 'none'
            });
        } else if (markerType === 'pin') {
            var pinIconValue = $('#vnforge-hidden-marker-pin-icon-value').val();
            $('.vnforge-marker').html(pinIconValue);
        } else {
            var iconUrl = $('#vnforge-marker-icon').val();
            
            if (iconUrl) {
                // Update existing markers with icon
                $('.vnforge-marker').css({
                    backgroundColor: 'transparent',
                    width: size + 'px',
                    height: size + 'px',
                    backgroundImage: 'url(' + iconUrl + ')',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                });
            }
        }
    }
    
    /**
     * Update all existing markers with current settings
     */
    function updateAllMarkersWithSettings() {
        var markerType = $('input[name="vnforge_marker_type"]:checked').val();
        var size = $('#vnforge-marker-size').val();
        
        if (markerType === 'color') {
            var color = $('#vnforge-marker-color').val();
            
            $('.vnforge-marker').css({
                backgroundColor: color,
                width: size + 'px',
                height: size + 'px',
                backgroundImage: 'none'
            });
        } else if (markerType === 'pin') {
            var pinIconValue = $('#vnforge-hidden-marker-pin-icon-value').val();
            $('.vnforge-marker').html(pinIconValue);
        } else {
            var iconUrl = $('#vnforge-marker-icon').val();
            
            if (iconUrl) {
                $('.vnforge-marker').css({
                    backgroundColor: 'transparent',
                    width: size + 'px',
                    height: size + 'px',
                    backgroundImage: 'url(' + iconUrl + ')',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                });
            }
        }
        
        console.log('Updated all markers with new settings');
    }
    
    /**
     * Apply custom CSS
     */
    function applyCustomCSS() {
        var customCSS = $('#vnforge-custom-css').val();
        
        // Remove existing custom CSS
        $('#vnforge-custom-css-style').remove();
        
        if (customCSS.trim()) {
            var styleTag = $('<style id="vnforge-custom-css-style">' + customCSS + '</style>');
            $('head').append(styleTag);
        }
    }
    
    // Event listener cho việc thay đổi pin icon value
    $(document).on('change', 'input[name="vnforge_marker_pin_icon"]', function() {
        var selectedPinIcon = $(this).val();
        var selectedPinIconContent = $(this).data('content');
        var markerType = $('input[name="vnforge_marker_type"]:checked').val();
        
        if (markerType === 'pin') {
            // Cập nhật hidden input với SVG content mới
            $('#vnforge-hidden-marker-pin-icon-value').val(selectedPinIconContent);
            
            // Áp dụng SVG content cho tất cả marker pin
            $('.vnforge-marker[data-marker-type="pin"]').each(function() {
                $(this).html(selectedPinIconContent);
            });
        }
    });
    
    // Event listener cho việc thay đổi marker type
    $(document).on('change', 'input[name="vnforge_marker_type"]', function() {
        var markerType = $(this).val();
        
        if (markerType === 'pin') {
            // Khi chuyển sang pin type, áp dụng SVG content hiện tại
            var pinIconContent = $('#vnforge-hidden-marker-pin-icon-value').val();
            if (pinIconContent) {
                $('.vnforge-marker[data-marker-type="pin"]').each(function() {
                    $(this).html(pinIconContent);
                });
            }
        }
    });
    
});