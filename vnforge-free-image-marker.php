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
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        // Load text domain for translations
        load_plugin_textdomain('vnforge-image-marker', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Register admin menu
     */
    public function admin_menu() {
        // Main menu
        add_menu_page(
            __('VNForge Image Marker', 'vnforge-image-marker'),
            __('Image Marker', 'vnforge-image-marker'),
            'manage_options',
            'vnforge-image-marker',
            array($this, 'markers_list_page'),
            'dashicons-location',
            30
        );
        
        // Submenu: Markers List
        add_submenu_page(
            'vnforge-image-marker',
            __('Markers List', 'vnforge-image-marker'),
            __('Markers List', 'vnforge-image-marker'),
            'manage_options',
            'vnforge-image-marker',
            array($this, 'markers_list_page')
        );
        
        // Submenu: Add/Edit Markers
        add_submenu_page(
            'vnforge-image-marker',
            __('Add/Edit Markers', 'vnforge-image-marker'),
            __('Add/Edit Markers', 'vnforge-image-marker'),
            'manage_options',
            'vnforge-image-marker-edit',
            array($this, 'markers_edit_page')
        );
    }
    
    /**
     * Markers List Page
     */
    public function markers_list_page() {
        include VNFORGE_IMAGE_MARKER_PLUGIN_DIR . 'admin/markers-list.php';
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
        // Only load on our plugin pages
        if (strpos($hook, 'vnforge-image-marker') === false) {
            return;
        }

        wp_enqueue_media();
        
        wp_enqueue_script(
            'vnforge-image-marker-admin',
            VNFORGE_IMAGE_MARKER_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
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
            'nonce' => wp_create_nonce('vnforge_admin_nonce')
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