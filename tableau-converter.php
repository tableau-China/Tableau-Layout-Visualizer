<?php
/*
Plugin Name: Tableau Layout Converter
Description: Embeds the Tableau React App via shortcode [tableau_converter]
Version: 1.0
Author: AI Studio
*/

function render_tableau_app() {
    // Enqueue CSS
    wp_enqueue_style('tableau-app-style', plugin_dir_url(__FILE__) . 'dist/assets/index.css');
    
    // Enqueue JS
    wp_enqueue_script('tableau-app-script', plugin_dir_url(__FILE__) . 'dist/assets/main.js', array(), null, true);
    
    // Render root div
    return '<div id="root"></div>';
}
add_shortcode('tableau_converter', 'render_tableau_app');
