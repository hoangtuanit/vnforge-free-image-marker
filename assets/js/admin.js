jQuery(document).ready(function($) {
    
    // WordPress Media Library instance
    var mediaUploader;
    
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
            nonce: 'vnforge_admin_nonce'
        };
        
        // Merge additional data
        if (data) {
            $.extend(requestData, data);
        }
        
        $.ajax({
            url: 'admin-ajax.php',
            type: 'POST',
            data: requestData,
            success: function(response) {
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
    
    // Make functions globally available
    window.vnforgeAdmin = {
        openMediaLibrary: openMediaLibrary,
        displayImage: displayImage,
        clearImage: clearImage,
        showAdminMessage: showAdminMessage,
        makeAjaxRequest: makeAjaxRequest
    };
    
});
