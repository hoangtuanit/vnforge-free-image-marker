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
        // Get settings from script tag
        var settings = getSettingsFromScript($container);
        
        // Check for markers data in JSON script tag
        var $markersScript = $container.find('.vnforge-markers-data');
        
        if ($markersScript.length > 0) {
            try {
                var markersData = JSON.parse($markersScript.text());
                if (markersData && markersData.length > 0) {
                    displayMarkers($container, markersData, settings);
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
            displayMarkers($container, markersData, settings);
        } else {
            // Load markers via AJAX
            loadMarkersFromServer($container, imageId, settings);
        }
    }
    
    /**
     * Get settings from script tag
     */
    function getSettingsFromScript($container) {
        var $settingsScript = $container.find('.vnforge-settings-data');
        var defaultSettings = {
            marker_type: 'color',
            marker_color: '#ff0000',
            marker_size: '20',
            marker_icon: ''
        };

        console.log('getSettingsFromScript@SettingsScript:', $settingsScript);
        
        if ($settingsScript.length > 0) {
            try {
                var settings = JSON.parse($settingsScript.text());
                return $.extend({}, defaultSettings, settings);
            } catch (e) {
                console.error('Error parsing settings data:', e);
            }
        }
        
        return defaultSettings;
    }
    
    /**
     * Load markers from server
     */
    function loadMarkersFromServer($container, imageId, settings) {
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
                    displayMarkers($container, response.data, settings);
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
    function displayMarkers($container, markers, settings) {
        var $image = $container.find('img');
        
        if ($image.length === 0) {
            console.error('No image found in container');
            return;
        }
        
        // Set container position to relative for absolute positioning of markers
        $container.css('position', 'relative');
        
        // Add markers
        markers.forEach(function(marker) {
            addMarkerToImage($container, marker, settings);
        });
        
    }
    
    /**
     * Add marker to image
     */
    function addMarkerToImage($container, markerData, settings) {
        console.log('addMarkerToImage@MarkerData:', markerData);
        console.log('addMarkerToImage@Settings:', settings);

        var markerCss = {
            position: 'absolute',
            left: markerData.x + '%',
            top: markerData.y + '%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            cursor: 'pointer',
            width: settings.marker_size + 'px',
            height: settings.marker_size + 'px'
        };
        
        if (settings.marker_type === 'color') {
            markerCss.backgroundColor = settings.marker_color;
            markerCss.borderRadius = '50%';
            markerCss.border = '2px solid #fff';
        } else {
            if (settings.marker_icon) {
                markerCss.backgroundColor = 'transparent';
                markerCss.backgroundImage = 'url(' + settings.marker_icon + ')';
                markerCss.backgroundSize = 'contain';
                markerCss.backgroundRepeat = 'no-repeat';
                markerCss.backgroundPosition = 'center';
            } else {
                // Fallback to color if no icon
                markerCss.backgroundColor = settings.marker_color;
                markerCss.borderRadius = '50%';
                markerCss.border = '2px solid #fff';
            }
        }
        
        var $marker = $('<div>', {
            class: 'vnforge-marker',
            css: markerCss,
            'data-marker-type': settings.marker_type,
            'data-marker-color': settings.marker_color,
            'data-marker-size': settings.marker_size,
            'data-marker-icon': settings.marker_icon,
            'data-marker': JSON.stringify(markerData)
        });
        
        // Add hover effect
        $marker.hover(
            function() {
                if (settings.marker_type === 'color') {
                    $(this).css({
                        backgroundColor: '#ff4444',
                        transform: 'translate(-50%, -50%) scale(1.2)'
                    });
                } else {
                    $(this).css({
                        transform: 'translate(-50%, -50%) scale(1.2)'
                    });
                }
                
                // Show marker info on hover
                showMarkerInfoOnHover(markerData, $(this));
            },
            function() {
                if (settings.marker_type === 'color') {
                    $(this).css({
                        backgroundColor: settings.marker_color,
                        transform: 'translate(-50%, -50%) scale(1)'
                    });
                } else {
                    $(this).css({
                        transform: 'translate(-50%, -50%) scale(1)'
                    });
                }
                
                // Don't hide info immediately, let the container handle it
            }
        );
        
        // Add mouse leave event to info to hide it
        $(document).on('mouseleave', '.vnforge-marker-hover-info', function() {
            // Check if mouse is still over the image container
            var $container = $('.vnforge-image-with-markers');
            if (!$container.is(':hover')) {
                hideMarkerInfo();
            }
        });

        
        // Add click event to open link in new tab
        $marker.on('click', function() {
            if (markerData.link) {
                window.open(markerData.link, '_blank');
            } else {
                // Fallback: show info if no link
                showMarkerInfo(markerData);
            }
        });
        
        // Add marker to container
        $container.append($marker);
    }
    
    /**
     * Show marker information on hover
     */
    function showMarkerInfoOnHover(markerData, $marker) {
        // Remove existing hover info
        $('.vnforge-marker-hover-info').remove();
        
        // Get marker position
        var markerOffset = $marker.offset();
        var markerWidth = $marker.outerWidth();
        var markerHeight = $marker.outerHeight();
        
        // Create hover info box
        var $hoverInfo = $('<div>', {
            class: 'vnforge-marker-hover-info',
            css: {
                position: 'absolute',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '10px',
                maxWidth: '250px',
                minWidth: '150px',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                fontSize: '12px',
                lineHeight: '1.4'
            }
        });
        
        // Add content
        var content = '<strong>' + (markerData.title || 'Marker') + '</strong>';
        
        if (markerData.description) {
            content += '<br><span style="color: #666;">' + markerData.description + '</span>';
        }
        
        if (markerData.link) {
            content += '<br><a href="' + markerData.link + '" target="_blank" style="color: #0073aa; text-decoration: none;">View Details →</a>';
        }
        
        $hoverInfo.html(content);
        
        // Calculate position (show below marker by default)
        var infoWidth = $hoverInfo.outerWidth();
        var infoHeight = $hoverInfo.outerHeight();
        
        // Position the info box below the marker
        var left = markerOffset.left + (markerWidth / 2) - (infoWidth / 2);
        var top = markerOffset.top + markerHeight; // 10px gap below marker
        console.log('showMarkerInfoOnHover@Left:', left, 'Top:', top);
        
        $hoverInfo.css({
            left: left + 'px',
            top: top + 'px',
            zIndex: 1000,
        });
        
        // Add to body
        $('body').append($hoverInfo);
        
        // Add arrow pointing to marker
        var arrowPosition = markerOffset.left + (markerWidth / 2) - left;
        if (top > markerOffset.top) {
            // Arrow pointing up (info below marker)
            $hoverInfo.append('<div style="position: absolute; top: -5px; left: ' + arrowPosition + 'px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 5px solid #fff;"></div>');
        } else {
            // Arrow pointing down (info above marker)
            $hoverInfo.append('<div style="position: absolute; bottom: -5px; left: ' + arrowPosition + 'px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #fff;"></div>');
        }
    }
    
    /**
     * Hide marker info on mouse out
     */
    function hideMarkerInfo() {
        $('.vnforge-marker-hover-info').fadeOut(200, function() {
            $(this).remove();
        });
    }
    
    /**
     * Show marker information
     */
    function showMarkerInfo(markerData) {
        // Remove existing info box
        $('.vnforge-marker-info').remove();
        
        // Find the marker element that was clicked
        var $clickedMarker = $('.vnforge-marker').filter(function() {
            var markerDataAttr = $(this).attr('data-marker');
            if (markerDataAttr) {
                try {
                    var data = JSON.parse(markerDataAttr);
                    return data.x === markerData.x && data.y === markerData.y;
                } catch (e) {
                    return false;
                }
            }
            return false;
        });
        
        // Get marker position
        var markerOffset = $clickedMarker.offset();
        var markerWidth = $clickedMarker.outerWidth();
        var markerHeight = $clickedMarker.outerHeight();
        
        // Create info box
        var $infoBox = $('<div>', {
            class: 'vnforge-marker-info',
            css: {
                position: 'absolute',
                backgroundColor: '#fff',
                border: '2px solid #333',
                borderRadius: '8px',
                padding: '20px',
                maxWidth: '400px',
                minWidth: '250px',
                zIndex: 1000,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                fontSize: '14px',
                lineHeight: '1.5'
            }
        });
        
        // Add content
        var content = '<h3 style="margin: 0 0 10px 0; color: #333;">' + (markerData.title || 'Marker') + '</h3>';
        
        if (markerData.description) {
            content += '<p style="margin: 0 0 15px 0; color: #666;">' + markerData.description + '</p>';
        }
        
        if (markerData.link) {
            content += '<p style="margin: 0 0 15px 0;"><a href="' + markerData.link + '" target="_blank" style="color: #0073aa; text-decoration: none; font-weight: bold;">View Details →</a></p>';
        }
        
        content += '<button class="button vnforge-close-info" style="background: #0073aa; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>';
        
        $infoBox.html(content);
        
        // Calculate position (show below marker by default)
        var infoWidth = $infoBox.outerWidth();
        var infoHeight = $infoBox.outerHeight();
        
        // Position the info box below the marker
        var left = markerOffset.left + (markerWidth / 2) - (infoWidth / 2);
        var top = markerOffset.top + markerHeight + 15; // 15px gap below marker
        
        // Adjust if info box goes off screen
        var windowWidth = $(window).width();
        var windowHeight = $(window).height();
        
        // Check horizontal bounds
        if (left < 10) {
            left = 10;
        } else if (left + infoWidth > windowWidth - 10) {
            left = windowWidth - infoWidth - 10;
        }
        
        // Check vertical bounds - if too low, show above marker
        if (top + infoHeight > windowHeight - 10) {
            top = markerOffset.top - infoHeight - 15;
        }
        
        $infoBox.css({
            left: left + 'px',
            top: top + 'px'
        });
        
        // Add to body
        $('body').append($infoBox);
        
        // Add arrow pointing to marker
        var arrowPosition = markerOffset.left + (markerWidth / 2) - left;
        if (top > markerOffset.top) {
            // Arrow pointing up (info below marker)
            $infoBox.append('<div style="position: absolute; top: -8px; left: ' + arrowPosition + 'px; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 8px solid #333;"></div>');
        } else {
            // Arrow pointing down (info above marker)
            $infoBox.append('<div style="position: absolute; bottom: -8px; left: ' + arrowPosition + 'px; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid #333;"></div>');
        }
        
        // Add close functionality
        $infoBox.find('.vnforge-close-info').on('click', function() {
            $infoBox.fadeOut(200, function() {
                $(this).remove();
            });
        });
        
        // Close on background click
        $infoBox.on('click', function(e) {
            if (e.target === this) {
                $infoBox.fadeOut(200, function() {
                    $(this).remove();
                });
            }
        });
        
        // Auto close after 8 seconds
        setTimeout(function() {
            $infoBox.fadeOut(200, function() {
                $(this).remove();
            });
        }, 8000);
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
