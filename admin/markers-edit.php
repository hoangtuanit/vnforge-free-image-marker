<?php
// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get post data if available (for metabox context)
$post_id = isset($post) ? $post->ID : 0;
$image_id = isset($image_id) ? $image_id : '';
$markers = isset($markers) ? $markers : array();


?>

<div class="vnforge-admin-container">
    <!-- Image Preview Section -->
    <div class="vnforge-section">
        <h3><?php _e('Image Preview', 'vnforge-image-marker'); ?></h3>
        <div id="vnforge-image-preview" class="vnforge-image-preview">
            <?php if ($image_id): ?>
                <?php 
                $image_url = wp_get_attachment_image_url($image_id, 'single-post');
                if ($image_url): 
                ?>
                    <img src="<?php echo esc_url($image_url); ?>" alt="Selected Image" data-id="<?php echo esc_attr($image_id); ?>" data-post_id="<?php echo esc_attr($post_id); ?>">
                <?php else: ?>
                    <p class="vnforge-no-image"><?php _e('Image not found. Please select a new image below.', 'vnforge-image-marker'); ?></p>
                <?php endif; ?>
            <?php else: ?>
                <p class="vnforge-no-image"><?php _e('No image selected. Please upload an image below.', 'vnforge-image-marker'); ?></p>
            <?php endif; ?>
        </div>
        <div class="vnforge-image-controls">
            <button type="button" id="vnforge-upload-image" class="button button-primary">
                <?php _e('Upload Image', 'vnforge-image-marker'); ?>
            </button>
            <button type="button" id="vnforge-clear-image" class="button button-secondary" style="display: none;">
                <?php _e('Clear Image', 'vnforge-image-marker'); ?>
            </button>
            <button type="button" id="vnforge-clear-markers" class="button button-secondary">
                <?php _e('Clear Markers', 'vnforge-image-marker'); ?>
            </button>
        </div>
        
        <!-- Hidden fields for metabox -->
        <input type="hidden" name="vnforge_post_id" id="vnforge-hidden-post-id" value="<?php echo esc_attr($post_id); ?>">
        <input type="hidden" name="vnforge_image_id" id="vnforge-hidden-image-id" value="<?php echo esc_attr($image_id); ?>">
        <input type="hidden" name="vnforge_markers" id="vnforge-hidden-markers" value="<?php echo esc_attr(json_encode($markers)); ?>">
    </div>
</div>