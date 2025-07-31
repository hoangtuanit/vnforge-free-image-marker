<?php
// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get post data if available (for metabox context)
$post_id = isset($post) ? $post->ID : 0;
$image_id = isset($image_id) ? $image_id : '';
$markers = isset($markers) ? $markers : array();

// Get settings from options
$marker_color = get_post_meta($post_id, '_vnforge_marker_color', true);
$marker_size = get_post_meta($post_id, '_vnforge_marker_size', true);
$custom_css = get_post_meta($post_id, '_vnforge_custom_css', true);
$marker_type = get_post_meta($post_id, '_vnforge_marker_type', true); // 'color' or 'icon'
$marker_icon = get_post_meta($post_id, '_vnforge_marker_icon', true);
$marker_pin_icon = get_post_meta($post_id, '_vnforge_marker_pin_icon', true);
$marker_pin_icon_value = file_get_contents(VNFORGE_IMAGE_MARKER_PLUGIN_DIR . 'assets/images/pin/' . $marker_pin_icon);

echo 'marker_pin_icon_value:'. $marker_pin_icon;
echo '<pre>marker_pin_icon_value:';
print_r($marker_pin_icon_value);
echo '</pre>';

?>

<div class="vnforge-admin-container">

    <!-- Image Preview Section -->
    <div class="vnforge-section">
        <h3><?php _e('Image Preview', 'vnforge-image-marker'); ?></h3>
        <div class="vnforge-image-preview-container">
            <div class="vnforge-image-preview-tooltip">
                <?php _e('Click anywhere to add marker', 'vnforge-image-marker'); ?>
            </div>
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
        </div>
        <!-- #vnforge-image-preview -->
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
        <!-- .vnforge-image-controls -->

        <!-- Hidden fields for metabox -->
        <input type="hidden" name="vnforge_post_id" id="vnforge-hidden-post-id" value="<?php echo esc_attr($post_id); ?>">
        <input type="hidden" name="vnforge_image_id" id="vnforge-hidden-image-id" value="<?php echo esc_attr($image_id); ?>">
        <input type="hidden" name="vnforge_markers" id="vnforge-hidden-markers" value="<?php echo esc_attr(json_encode($markers)); ?>">
        <input type="hidden" name="vnforge_marker_pin_icon_value" id="vnforge-hidden-marker-pin-icon-value" value="<?php echo esc_attr($marker_pin_icon_value); ?>">
    </div>

    <!-- Settings Section -->
    <div class="vnforge-section">
        <h3><?php _e('Marker Settings', 'vnforge-image-marker'); ?></h3>

        <!-- Marker Type Selection -->
        <div class="vnforge-setting-item">
            <label><?php _e('Marker Type:', 'vnforge-image-marker'); ?></label>
            <div class="vnforge-radio-group">
                <div class="vnforge-radio-group">
                    <label class="vnforge-radio-label">
                        <input type="radio" name="vnforge_marker_type" value="color" <?php checked($marker_type, 'color'); ?>>
                        <?php _e('Color', 'vnforge-image-marker'); ?>
                    </label>
                    <label class="vnforge-radio-label">
                        <input type="radio" name="vnforge_marker_type" value="icon" <?php checked($marker_type, 'icon'); ?>>
                        <?php _e('Icon', 'vnforge-image-marker'); ?>
                    </label>
                    <label class="vnforge-radio-label">
                        <input type="radio" name="vnforge_marker_type" value="pin" <?php checked($marker_type, 'pin'); ?>>
                        <?php _e('Pin Icon', 'vnforge-image-marker'); ?>
                    </label>
                </div>
            </div>
            <p class="description"><?php _e('Choose between color or icon for markers', 'vnforge-image-marker'); ?></p>
        </div>
        <!-- .vnforge-setting-item -->

        <div class="vnforge-settings-grid">
            <!-- Color Settings (shown when type is color) -->
            <div class="vnforge-setting-item vnforge-color-settings" <?php echo ($marker_type === 'icon') ? 'style="display: none;"' : ''; ?>>
                <label for="vnforge-marker-color"><?php _e('Marker Color:', 'vnforge-image-marker'); ?></label>
                <input type="color" id="vnforge-marker-color" name="vnforge_marker_color" value="<?php echo esc_attr($marker_color); ?>" class="vnforge-color-picker">
                <p class="description"><?php _e('Choose the color for markers', 'vnforge-image-marker'); ?></p>
            </div>

            <!-- Icon Settings (shown when type is icon) -->
            <div class="vnforge-setting-item vnforge-icon-settings" <?php echo ($marker_type === 'color') ? 'style="display: none;"' : ''; ?>>
                <label><?php _e('Marker Icon:', 'vnforge-image-marker'); ?></label>
                <div class="vnforge-icon-upload">
                    <div id="vnforge-icon-preview" class="vnforge-icon-preview">
                        <?php if ($marker_icon): ?>
                            <img src="<?php echo esc_url($marker_icon); ?>" alt="Marker Icon" style="max-width: 50px; max-height: 50px;">
                        <?php else: ?>
                            <p><?php _e('No icon selected', 'vnforge-image-marker'); ?></p>
                        <?php endif; ?>
                    </div>
                    <button type="button" id="vnforge-upload-icon" class="button button-secondary">
                        <?php _e('Upload Icon', 'vnforge-image-marker'); ?>
                    </button>
                    <button type="button" id="vnforge-remove-icon" class="button button-secondary" <?php echo empty($marker_icon) ? 'style="display: none;"' : ''; ?>>
                        <?php _e('Remove Icon', 'vnforge-image-marker'); ?>
                    </button>
                    <input type="hidden" id="vnforge-marker-icon" name="vnforge_marker_icon" value="<?php echo esc_attr($marker_icon); ?>">
                </div>
                <p class="description"><?php _e('Upload an icon for markers (PNG, JPG, SVG recommended)', 'vnforge-image-marker'); ?></p>
            </div>
            <!-- .vnforge-setting-item -->

            <!-- Pin Icon Settings (shown when type is pin) -->
            <div class="vnforge-setting-item vnforge-pin-settings" <?php echo ($marker_type === 'color' || $marker_type === 'icon') ? 'style="display: none;"' : ''; ?>>
                <label for="vnforge-marker-pin-icon"><?php _e('Pin Icon:', 'vnforge-image-marker'); ?></label>
                <div class="vnforge-pin-icon-group">
                    <?php for ($i = 1; $i <= 20; $i++): ?>
                        <?php 
                            $pin_icon = 'pin' . $i . '.svg';
                            $svg_content = file_get_contents(VNFORGE_IMAGE_MARKER_PLUGIN_DIR . 'assets/images/pin/' . $pin_icon);
                        ?>
                        <label class="vnforge-pin-icon-item" data-icon="<?php echo esc_attr($pin_icon); ?>">
                            <?php echo $svg_content ?>
                            <input type="radio" data-content="<?php echo esc_attr($svg_content); ?>" name="vnforge_marker_pin_icon" value="<?php echo esc_attr($pin_icon); ?>" <?php checked($marker_pin_icon, $pin_icon); ?>>
                        </label>
                    <?php endfor; ?>
                </div>
                <!-- .vnforge-pin-icon-group -->
                <p class="description"><?php _e('Choose a pin icon from the available options', 'vnforge-image-marker'); ?></p>
            </div>

            <div class="vnforge-setting-item">
                <label for="vnforge-marker-size"><?php _e('Marker Size (px):', 'vnforge-image-marker'); ?></label>
                <input type="number" id="vnforge-marker-size" name="vnforge_marker_size" value="<?php echo esc_attr($marker_size); ?>" min="10" max="100" step="1" class="vnforge-size-input">
                <p class="description"><?php _e('Set the width/height of markers in pixels', 'vnforge-image-marker'); ?></p>
            </div>
            <!-- .vnforge-setting-item -->
        </div>
        <!-- .vnforge-settings-grid -->

        <div class="vnforge-setting-item">
            <label for="vnforge-custom-css"><?php _e('Custom CSS:', 'vnforge-image-marker'); ?></label>
            <textarea id="vnforge-custom-css" name="vnforge_custom_css" rows="6" class="vnforge-css-textarea" placeholder="/* Add your custom CSS here */
.vnforge-marker {
    /* Your custom styles */
}"><?php echo esc_textarea($custom_css); ?></textarea>
            <p class="description"><?php _e('Add custom CSS to style markers and popups', 'vnforge-image-marker'); ?></p>
        </div>

        <div class="vnforge-settings-actions">
            <button type="button" id="vnforge-save-settings" class="button button-primary">
                <?php _e('Save Settings', 'vnforge-image-marker'); ?>
            </button>
            <button type="button" id="vnforge-reset-settings" class="button button-secondary">
                <?php _e('Reset to Default', 'vnforge-image-marker'); ?>
            </button>
        </div>
        <!-- .vnforge-settings-actions -->
    </div>
    <!-- .vnforge-section -->
</div>