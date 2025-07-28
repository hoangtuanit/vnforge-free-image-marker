<?php
// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap">
    <h1><?php _e('VNForge Image Marker - Markers List', 'vnforge-image-marker'); ?></h1>
    
    <div class="vnforge-admin-container">
        <!-- Image Preview Section -->
        <div class="vnforge-section">
            <h2><?php _e('Image Preview', 'vnforge-image-marker'); ?></h2>
            <div id="vnforge-image-preview" class="vnforge-image-preview">
                <p class="vnforge-no-image"><?php _e('No image selected. Please upload an image below.', 'vnforge-image-marker'); ?></p>
            </div>
            <div class="vnforge-image-controls">
                <button type="button" id="vnforge-upload-image" class="button button-primary">
                    <?php _e('Upload Image', 'vnforge-image-marker'); ?>
                </button>
                <button type="button" id="vnforge-clear-image" class="button button-secondary" style="display: none;">
                    <?php _e('Clear Image', 'vnforge-image-marker'); ?>
                </button>
            </div>
        </div>
    </div>
</div>