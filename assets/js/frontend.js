jQuery(document).ready(function($) {
    
    // Initialize frontend functionality
    initFrontend();
    
    function initFrontend() {
        // Find all images with markers
        $('.vnforge-image-with-markers').each(function() {
            var $container = $(this);
            var imageId = $container.data('image-id');
            
            if (imageId) {
                loadAndDisplayMarkers($container, imageId);
            }
        });
    }
    
    /**
     * Load and display markers for an image
     */
    function loadAndDisplayMarkers($container, imageId) {
        // Check for markers data in JSON script tag
        var $markersScript = $container.find('.vnforge-markers-data');
        
        if ($markersScript.length > 0) {
            try {
                var markersData = JSON.parse($markersScript.text());
                if (markersData && markersData.length > 0) {
                    displayMarkers($container, markersData);
                    return;
                }
            } catch (e) {
                console.error('Error parsing markers data:', e);
            }
        }
        
        // Get markers data from data attribute
        var markersData = $container.data('markers');
        
        if (markersData && markersData.length > 0) {
            // Use existing markers data
            displayMarkers($container, markersData);
        } else {
            // Load markers via AJAX
            loadMarkersFromServer($container, imageId);
        }
    }
    
    /**
     * Load markers from server
     */
    function loadMarkersFromServer($container, imageId) {
        $.ajax({
            url: vnforge_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'vnforge_get_markers',
                image_id: imageId,
                nonce: vnforge_ajax.nonce
            },
            success: function(response) {
                if (response.success && response.data) {
                    displayMarkers($container, response.data);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error loading markers:', error);
            }
        });
    }
    
    /**
     * Display markers on image
     */
    function displayMarkers($container, markers) {
        var $image = $container.find('img');
        
        if ($image.length === 0) {
            console.error('No image found in container');
            return;
        }
        
        // Set container position to relative for absolute positioning of markers
        $container.css('position', 'relative');
        
        // Add markers
        markers.forEach(function(marker) {
            addMarkerToImage($container, marker);
        });
        
        console.log('Displayed', markers.length, 'markers');
    }
    
    /**
     * Add marker to image
     */
    function addMarkerToImage($container, markerData) {
        var $marker = $('<div>', {
            class: 'vnforge-marker',
            css: {
                position: 'absolute',
                left: markerData.x + '%',
                top: markerData.y + '%',
                width: '20px',
                height: '20px',
                backgroundColor: '#ff0000',
                borderRadius: '50%',
                border: '2px solid #fff',
                cursor: 'pointer',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                transition: 'all 0.2s ease'
            },
            'data-marker': JSON.stringify(markerData)
        });
        
        // Add hover effect
        $marker.hover(
            function() {
                $(this).css({
                    backgroundColor: '#ff4444',
                    transform: 'translate(-50%, -50%) scale(1.2)'
                });
            },
            function() {
                $(this).css({
                    backgroundColor: '#ff0000',
                    transform: 'translate(-50%, -50%) scale(1)'
                });
            }
        );
        
        // Add click event to show marker info
        $marker.on('click', function() {
            showMarkerInfo(markerData);
        });
        
        // Add marker to container
        $container.append($marker);
    }
    
    /**
     * Show marker information
     */
    function showMarkerInfo(markerData) {
        // Remove existing info box
        $('.vnforge-marker-info').remove();
        
        // Create info box
        var $infoBox = $('<div>', {
            class: 'vnforge-marker-info',
            css: {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#fff',
                border: '2px solid #333',
                borderRadius: '8px',
                padding: '20px',
                maxWidth: '400px',
                zIndex: 1000,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }
        });
        
        // Add content
        var content = '<h3>' + (markerData.title || 'Marker') + '</h3>';
        
        if (markerData.description) {
            content += '<p>' + markerData.description + '</p>';
        }
        
        if (markerData.link) {
            content += '<p><a href="' + markerData.link + '" target="_blank" class="button">View Details</a></p>';
        }
        
        content += '<button class="button vnforge-close-info">Close</button>';
        
        $infoBox.html(content);
        
        // Add close functionality
        $infoBox.find('.vnforge-close-info').on('click', function() {
            $infoBox.remove();
        });
        
        // Close on background click
        $infoBox.on('click', function(e) {
            if (e.target === this) {
                $infoBox.remove();
            }
        });
        
        // Add to body
        $('body').append($infoBox);
        
        // Auto close after 5 seconds
        setTimeout(function() {
            $infoBox.fadeOut(function() {
                $(this).remove();
            });
        }, 5000);
    }
    
    /**
     * Make markers responsive
     */
    function makeMarkersResponsive() {
        $('.vnforge-image-with-markers').each(function() {
            var $container = $(this);
            var $image = $container.find('img');
            
            if ($image.length > 0) {
                // Update marker positions when image resizes
                $(window).on('resize', function() {
                    updateMarkerPositions($container);
                });
            }
        });
    }
    
    /**
     * Update marker positions for responsive design
     */
    function updateMarkerPositions($container) {
        $container.find('.vnforge-marker').each(function() {
            var $marker = $(this);
            var markerData = JSON.parse($marker.attr('data-marker'));
            
            // Recalculate position based on current image size
            $marker.css({
                left: markerData.x + '%',
                top: markerData.y + '%'
            });
        });
    }
    
    // Initialize responsive markers
    makeMarkersResponsive();
    
    // Make functions globally available
    window.vnforgeFrontend = {
        loadAndDisplayMarkers: loadAndDisplayMarkers,
        displayMarkers: displayMarkers,
        showMarkerInfo: showMarkerInfo
    };
    
});
