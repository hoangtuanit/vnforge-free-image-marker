<?php
/**
 * Plugin Name: VNForge - Free Image Marker
 * Plugin URI: https://vnforge.com
 * Description: Plugin WordPress cho phép upload ảnh trong admin và gắn marker vào vị trí bất kỳ trên ảnh đó. Cách thức xử lý: Click vào vị trí trên ảnh sẽ tạo ra 1 marker với toạ độ tương ứng, các marker được phép kéo đến vị trí khác.
 * Version: 1.0.0
 * Author: VNForge
 * Author URI: https://vnforge.com
 * License: GPL v2 or later
 * Text Domain: vnforge-image-marker
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('VNFORGE_IMAGE_MARKER_VERSION', '1.0.0');
define('VNFORGE_IMAGE_MARKER_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VNFORGE_IMAGE_MARKER_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main plugin class
 */
class VNForge_Image_Marker {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'admin_menu'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // AJAX handlers
        add_action('wp_ajax_vnforge_save_marker', array($this, 'save_marker'));
        add_action('wp_ajax_vnforge_get_markers', array($this, 'get_markers'));
        add_action('wp_ajax_vnforge_update_marker', array($this, 'update_marker'));
        add_action('wp_ajax_vnforge_delete_marker', array($this, 'delete_marker'));
        add_action('wp_ajax_vnforge_reset', array($this, 'reset'));
        add_action('wp_ajax_vnforge_get_markers_list', array($this, 'get_markers_list'));
        add_action('wp_ajax_vnforge_save_settings', array($this, 'save_settings'));
        
        // Add metabox for marker post type
        add_action('add_meta_boxes', array($this, 'add_marker_metabox'));
        add_action('save_post', array($this, 'save_marker_metabox'));
        
        // Add shortcode for displaying images with markers
        add_shortcode('vnforge_image_markers', array($this, 'image_markers_shortcode'));
        
        // Debug: Log plugin initialization
        error_log('VNForge: Plugin initialized');
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        // Load text domain for translations
        load_plugin_textdomain('vnforge-image-marker', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Register custom post type
        $this->register_marker_post_type();
    }

    public function parse_marker_data($marker_data) {
        if (empty($marker_data['id']) || strlen($marker_data['id']) <= 0) {
            $marker_data['id'] = uniqid('marker_');
        }
        
        return array(
            'id' => $marker_data['id'],
            'post_id' => $marker_data['post_id'],
            'title' => $marker_data['title'],
            'description' => $marker_data['description'],
            'link' => $marker_data['link'],
            'x' => $marker_data['x'],
            'y' => $marker_data['y'],
            'created_at' => current_time('mysql')
        );
    }
    
    /**
     * Register Marker custom post type
     */
    public function register_marker_post_type() {
        $labels = array(
            'name'               => __('Markers', 'vnforge-image-marker'),
            'singular_name'      => __('Marker', 'vnforge-image-marker'),
            'menu_name'          => __('Markers', 'vnforge-image-marker'),
            'add_new'            => __('Add New', 'vnforge-image-marker'),
            'add_new_item'       => __('Add New Marker', 'vnforge-image-marker'),
            'edit_item'          => __('Edit Marker', 'vnforge-image-marker'),
            'new_item'           => __('New Marker', 'vnforge-image-marker'),
            'view_item'          => __('View Marker', 'vnforge-image-marker'),
            'search_items'       => __('Search Markers', 'vnforge-image-marker'),
            'not_found'          => __('No markers found', 'vnforge-image-marker'),
            'not_found_in_trash' => __('No markers found in trash', 'vnforge-image-marker'),
        );
        
        $args = array(
            'labels'              => $labels,
            'public'              => false,
            'publicly_queryable'  => false,
            'show_ui'             => true,
            'show_in_menu'        => true,
            'query_var'           => true,
            'rewrite'             => array('slug' => 'marker'),
            'capability_type'     => 'post',
            'has_archive'         => false,
            'hierarchical'        => false,
            'menu_position'       => 30,
            'menu_icon'           => 'dashicons-location',
            'supports'            => array('title', 'custom-fields'),
            'show_in_rest'        => false,
        );
        
        register_post_type('vnforge_marker', $args);
    }
    
    /**
     * Register admin menu
     */
    public function admin_menu() {

    }
    /**
     * Add/Edit Markers Page
     */
    public function markers_edit_page() {
        include VNFORGE_IMAGE_MARKER_PLUGIN_DIR . 'admin/markers-edit.php';
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_frontend_scripts() {
        wp_enqueue_script(
            'vnforge-image-marker-frontend',
            VNFORGE_IMAGE_MARKER_PLUGIN_URL . 'assets/js/frontend.js',
            array('jquery'),
            VNFORGE_IMAGE_MARKER_VERSION,
            true
        );
        
        wp_enqueue_style(
            'vnforge-image-marker-frontend',
            VNFORGE_IMAGE_MARKER_PLUGIN_URL . 'assets/css/frontend.css',
            array(),
            VNFORGE_IMAGE_MARKER_VERSION
        );
        
        // Localize script
        wp_localize_script('vnforge-image-marker-frontend', 'vnforge_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vnforge_image_marker_nonce')
        ));
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        // Only load on our plugin pages and custom post type pages
        if ( get_current_screen()->id != 'vnforge_marker' ) {
            return;
        }
        

        wp_enqueue_media();
        
        // Enqueue jQuery UI for drag & drop
        wp_enqueue_script('jquery-ui-draggable');
        wp_enqueue_script('jquery-ui-droppable');
        
        wp_enqueue_script(
            'vnforge-image-marker-admin',
            VNFORGE_IMAGE_MARKER_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery', 'jquery-ui-draggable'),
            VNFORGE_IMAGE_MARKER_VERSION,
            true
        );
        
        wp_enqueue_style(
            'vnforge-image-marker-admin',
            VNFORGE_IMAGE_MARKER_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            VNFORGE_IMAGE_MARKER_VERSION
        );
        
        // Localize script
        wp_localize_script('vnforge-image-marker-admin', 'vnforge_admin', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vnforge_admin_nonce'),
            'strings' => array(
                'select_image' => __('Select Image', 'vnforge-image-marker'),
                'use_image' => __('Use this image', 'vnforge-image-marker'),
                'no_image_selected' => __('No image selected. Please upload an image below.', 'vnforge-image-marker'),
                'dismiss' => __('Dismiss this notice.', 'vnforge-image-marker')
            )
        ));
    }
    
    
    /**
     * Save marker to database
     */
    public function save_marker() {
        // Debug nonce
        error_log('VNForge: Received nonce: ' . (isset($_POST['nonce']) ? $_POST['nonce'] : 'not set'));
        error_log('VNForge: Expected nonce action: vnforge_admin_nonce');
        
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vnforge_admin_nonce')) {
            error_log('VNForge: Nonce verification failed');
            wp_send_json_error('Security check failed - Invalid nonce');
        }
        
        // Create marker data
        $marker_data = $this->parse_marker_data($_POST);
        
        // Get existing markers for this image
        $markers = get_post_meta($marker_data['post_id'], '_vnforge_markers', true);
        if (empty($markers)) {
            $markers = array($marker_data);
        }

        $existing_marker = null;
        foreach ($markers as $key => $marker) {
            if ($marker['id'] === $marker_data['id']) {
                $markers[$key] = $marker_data;
                $existing_marker = $marker;
                break;
            }
        }

        if (!$existing_marker) {
            $markers[] = $marker_data;
        }
        
        // Save to database
        $updated = update_post_meta($marker_data['post_id'], '_vnforge_markers', $markers);
        
        wp_send_json_success(array(
            'message' => 'Marker saved successfully',
            'updated' => $updated,
            'marker' => $marker_data
        ));
    }
    
    /**
     * Get markers for an image
     */
    public function get_markers() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vnforge_admin_nonce')) {
            wp_die('Security check failed');
        }
        
        $post_id = intval($_POST['post_id']);
        
        if ($post_id <= 0) {
            wp_send_json_error('Invalid image ID');
        }
        
        $markers = get_post_meta($post_id, '_vnforge_markers', true);
        
        wp_send_json_success($markers);
    }
    
    /**
     * Update marker
     */
    public function update_marker() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vnforge_admin_nonce')) {
            wp_die('Security check failed');
        }
        
        $marker_data = $this->parse_marker_data($_POST);
        
        // Get existing markers
        $markers = get_post_meta($marker_data['post_id'], '_vnforge_markers', true);
        if (empty($markers)) {
            $markers = array($marker_data);
        }
        
        $existing_marker = null;
        foreach ($markers as $key => $marker) {
            if ($marker['id'] === $marker_data['id']) {
                $markers[$key] = $marker_data;
                $existing_marker = $marker;
                break;
            }
        }

        if (!$existing_marker) {
            $markers[] = $marker_data;
        }

        // Save updated markers
        update_post_meta($marker_data['post_id'], '_vnforge_markers', $markers);
        wp_send_json_success('Marker updated successfully: ' . json_encode($markers));
    }
    
    /**
     * Delete marker
     */
    public function delete_marker() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vnforge_admin_nonce')) {
            wp_die('Security check failed');
        }
        
        $post_id = intval($_POST['post_id']);
        $id = sanitize_text_field($_POST['id']);
        // Get existing markers
        $markers = get_post_meta($post_id, '_vnforge_markers', true);
        
        // Remove marker
        $markers = array_filter($markers, function($marker) use ($id) {
            return $marker['id'] !== $id;
        });
        
        // Save updated markers
        $result = update_post_meta($post_id, '_vnforge_markers', array_values($markers));
        
        if ($result) {
            wp_send_json_success('Marker deleted successfully');
        } else {
            wp_send_json_error('Failed to delete marker');
        }
    }
    
    /**
     * Save all markers for an image
     */
    public function reset() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vnforge_admin_nonce')) {
            wp_send_json_error('Security check failed');
        }
        
        // Get data
        $image_id = intval($_POST['image_id']);
        $post_id = intval($_POST['post_id']);
        // Validate data
        if (empty($image_id) || $image_id <= 0) {
            wp_send_json_error('Invalid data provided');
        }
        
        // Save custom fields
        update_post_meta($post_id, '_vnforge_image_id', $image_id);
        update_post_meta($post_id, '_vnforge_markers', []);
        update_post_meta($post_id, '_vnforge_created_at', current_time('mysql'));
    }
    
    /**
     * Get markers list
     */
    public function get_markers_list() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vnforge_admin_nonce')) {
            wp_send_json_error('Security check failed');
        }
        
        // Query custom post type
        $args = array(
            'post_type' => 'vnforge_marker',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'date',
            'order' => 'DESC'
        );
        
        $query = new WP_Query($args);
        $markers_list = array();
        
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                $image_id = get_post_meta($post_id, '_vnforge_image_id', true);
                $markers = get_post_meta($post_id, '_vnforge_markers', true);
                $created_at = get_post_meta($post_id, '_vnforge_created_at', true);
                
                $markers_list[] = array(
                    'id' => $post_id,
                    'name' => get_the_title(),
                    'image_id' => $image_id,
                    'markers_count' => is_array($markers) ? count($markers) : 0,
                    'created_at' => $created_at,
                    'edit_url' => admin_url('admin.php?page=vnforge-markers-edit&marker_id=' . $post_id)
                );
            }
            wp_reset_postdata();
        }
        
        wp_send_json_success($markers_list);
    }
    
    /**
     * Add metabox for marker post type
     */
    public function add_marker_metabox() {
        add_meta_box(
            'vnforge_marker_metabox',
            __('Image Markers', 'vnforge-image-marker'),
            array($this, 'marker_metabox_callback'),
            'vnforge_marker',
            'normal',
            'high'
        );
    }
    
    /**
     * Metabox callback function
     */
    public function marker_metabox_callback($post) {
        // Add nonce for security
        wp_nonce_field('vnforge_marker_metabox', 'vnforge_marker_metabox_nonce');
        
        // Get existing data
        $image_id = get_post_meta($post->ID, '_vnforge_image_id', true);
        $markers = get_post_meta($post->ID, '_vnforge_markers', true);
        
        // Include the markers edit template
        include VNFORGE_IMAGE_MARKER_PLUGIN_DIR . 'admin/markers-edit.php';
    }
    
    /**
     * Save metabox data
     */
    public function save_marker_metabox($post_id) {
        // Check if nonce is valid
        if (!isset($_POST['vnforge_marker_metabox_nonce']) || 
            !wp_verify_nonce($_POST['vnforge_marker_metabox_nonce'], 'vnforge_marker_metabox')) {
            return;
        }
        
        // Check if user has permissions to save data
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Check if not an autosave
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        // Save image ID if provided
        if (isset($_POST['vnforge_image_id'])) {
            update_post_meta($post_id, '_vnforge_image_id', sanitize_text_field($_POST['vnforge_image_id']));
        }
        
        error_log('VNForge: Saving markers: ' . print_r($_POST['vnforge_markers'], true));
        
        // Save markers if provided
        if (isset($_POST['vnforge_markers'])) {
            $markers = json_decode(stripslashes($_POST['vnforge_markers']), true);
            if (is_array($markers)) {
                update_post_meta($post_id, '_vnforge_markers', $markers);
            }
        }
    }
    
    /**
     * Shortcode to display image with markers
     */
    public function image_markers_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => 0
        ), $atts);
        
        $marker_post_id = intval($atts['id']);
        
        if (!$marker_post_id) {
            return '<p>Error: Marker ID is required. Usage: [vnforge_image_markers id="123"]</p>';
        }
        
        // Get marker post
        $marker_post = get_post($marker_post_id);
        if (!$marker_post || $marker_post->post_type !== 'vnforge_marker') {
            return '<p>Error: Marker not found.</p>';
        }
        
        // Get image ID from marker post
        $image_id = get_post_meta($marker_post_id, '_vnforge_image_id', true);
        if (!$image_id) {
            return '<p>Error: No image associated with this marker.</p>';
        }
        
        // Get image HTML
        $image_html = wp_get_attachment_image($image_id, 'medium', false, array(
            'class' => 'vnforge-image'
        ));
        
        if (!$image_html) {
            return '<p>Error: Image not found.</p>';
        }
        
        // Get markers data
        $markers = get_post_meta($marker_post_id, '_vnforge_markers', true);
        
        // Get settings
        $marker_color = get_option('vnforge_marker_color', '#ff0000');
        $marker_size = get_option('vnforge_marker_size', '20');
        $custom_css = get_option('vnforge_custom_css', '');
        
        // Build output
        $output = '<div class="vnforge-image-with-markers" data-image-id="' . $image_id . '">';
        $output .= $image_html;
        
        // Add markers data as JSON for JavaScript
        if (!empty($markers) && is_array($markers)) {
            $output .= '<script type="application/json" class="vnforge-markers-data">';
            $output .= json_encode($markers);
            $output .= '</script>';
        }
        
        $output .= '</div>';

        $css = "
        .vnforge-marker {
            background-color: {$marker_color} !important;
            width: {$marker_size}px !important;
            height: {$marker_size}px !important;
        }
        ";
        
        // Add custom CSS if exists
        if (!empty($custom_css)) {
            $css .= $custom_css;
        }

        $output .= '<style class="vnforge-marker-css">' . $css . '</style>';
        
        return $output;
    }
    
    /**
     * Save plugin settings
     */
    public function save_settings() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vnforge_admin_nonce')) {
            wp_send_json_error('Security check failed');
        }
        
        // Check user permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        // Sanitize and save settings
        $marker_color = sanitize_hex_color($_POST['marker_color']);
        $marker_size = intval($_POST['marker_size']);
        $custom_css = sanitize_textarea_field($_POST['custom_css']);
        
        // Validate marker size
        if ($marker_size < 10 || $marker_size > 50) {
            $marker_size = 20; // Default value
        }
        
        // Save settings to WordPress options
        update_option('vnforge_marker_color', $marker_color);
        update_option('vnforge_marker_size', $marker_size);
        update_option('vnforge_custom_css', $custom_css);
        
        wp_send_json_success(array(
            'message' => 'Settings saved successfully',
            'settings' => array(
                'marker_color' => $marker_color,
                'marker_size' => $marker_size,
                'custom_css' => $custom_css
            )
        ));
    }
}

// Initialize plugin
new VNForge_Image_Marker();

// Activation hook
register_activation_hook(__FILE__, 'vnforge_image_marker_activate');
function vnforge_image_marker_activate() {
    // Create necessary directories
    $upload_dir = wp_upload_dir();
    $plugin_upload_dir = $upload_dir['basedir'] . '/vnforge-image-marker';
    
    if (!file_exists($plugin_upload_dir)) {
        wp_mkdir_p($plugin_upload_dir);
    }
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'vnforge_image_marker_deactivate');
function vnforge_image_marker_deactivate() {
    // Cleanup if needed
} 