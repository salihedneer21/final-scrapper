<?php
/**
 * Theme functions and definitions
 *
 * @package HelloElementorChild
 */

function crown_counseling_booking_shortcode() {
    return '<iframe 
        src="https://crowncounseling.vercel.app" 
        width="100%" 
        height="800px" 
        style="border: none; max-width: 100%; margin: 0 auto;"
        title="Crown Counseling Booking"
    ></iframe>';
}
add_shortcode('crown_counseling_booking', 'crown_counseling_booking_shortcode');

/**
 * Load child theme css and optional scripts
 *
 * @return void
 */
function hello_elementor_child_enqueue_scripts() {
	wp_enqueue_style(
		'hello-elementor-child-style',
		get_stylesheet_directory_uri() . '/style.css',
		[
			'hello-elementor-theme-style',
		],
		'1.0.0'
	);
}
add_action( 'wp_enqueue_scripts', 'hello_elementor_child_enqueue_scripts', 20 );


function theme_files() {

   //  wp_register_script( 'ui-tabsjs', 'https://code.jquery.com/ui/1.13.0/jquery-ui.js', array( 'jquery' ), '3.2.1', true );
   //  wp_enqueue_script( 'ui-tabsjs' );


   // wp_register_style( 'ui-tabscss', '//code.jquery.com/ui/1.13.0/themes/base/jquery-ui.css', false, null);
   // wp_enqueue_style( 'ui-tabscss');    

}
add_action( 'wp_enqueue_scripts', 'theme_files' );


//Wordpress Update version classic editor OFF
// add_filter('use_block_editor_for_post', '__return_false', 10);

// Disables the block editor from managing widgets in the Gutenberg plugin.
// add_filter( 'gutenberg_use_widgets_block_editor', '__return_false' );

// Disables the block editor from managing widgets.
// add_filter( 'use_widgets_block_editor', '__return_false' );


/* Register CPT */
function cwptheme_post_type() {
    $post_types_arr = array( 'Our Team');
    
    foreach( $post_types_arr as $post_type_a){
        
    $labels = array(
        'name'                => __( $post_type_a ),
        'singular_name'       => __( $post_type_a),
        'menu_name'           => __( $post_type_a),
        'parent_item_colon'   => __( 'Parent '.$post_type_a),
        'all_items'           => __( 'All '.$post_type_a),
        'view_item'           => __( 'View '.$post_type_a),
        'add_new_item'        => __( 'Add New '.$post_type_a),
        'add_new'             => __( 'Add New'),
        'edit_item'           => __( 'Edit '.$post_type_a),
        'update_item'         => __( 'Update '.$post_type_a),
        'search_items'        => __( 'Search '.$post_type_a),
        'not_found'           => __( 'Not Found'),
        'not_found_in_trash'  => __( 'Not found in Trash')
    );
    $args = array(
        'label'               => __( $post_type_a),
        'description'         => __( 'Add '.$post_type_a),
        'labels'              => $labels,
        'supports'            => array( 'title', 'editor', 'excerpt', 'author', 'thumbnail', 'revisions', 'custom-fields', 'page-attributes'),
        'public'              => true,
        'hierarchical'        => true,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'show_in_nav_menus'   => true,
        'show_in_admin_bar'   => true,
        'has_archive'         => true,
        'can_export'          => true,
        'exclude_from_search' => false,
        'yarpp_support'       => true,
        //'taxonomies'          => array('category'),
        'publicly_queryable'  => true,
        'capability_type'     => 'page',
        'rewrite'           => array( 
            'slug' => 'team',
            'with_front' => false
        )

);


    register_post_type( $post_type_a, $args );


    
        }
}
add_action( 'init', 'cwptheme_post_type', 0 );


add_action( 'init', 'team_hierarchical_taxonomy', 0 );
//create a custom taxonomy name it subjects for your posts
function team_hierarchical_taxonomy() {
// Add new taxonomy, make it hierarchical like categories
//first do the translations part for GUI

  $labels = array(
    'name' => _x( 'Team Categories', 'taxonomy general name' ),
    'singular_name' => _x( 'Team Category', 'taxonomy singular name' ),
    'search_items' =>  __( 'Search Team Categorise' ),
    'all_items' => __( 'All Categorise' ),
    'parent_item' => __( 'Parent Category' ),
    'parent_item_colon' => __( 'Parent Category:' ),
    'edit_item' => __( 'Edit Category' ),
    'update_item' => __( 'Update Category' ),
    'add_new_item' => __( 'Add New Category' ),
    'new_item_name' => __( 'New Category Name' ),
    'menu_name' => __( 'Categorise' ),
  );

// Now register the taxonomy
  register_taxonomy('team-cat',array('ourteam'), array(
    'hierarchical' => true,
    'labels' => $labels,
    'show_ui' => true,
    'show_in_rest' => true,
    'show_admin_column' => true,
    'query_var' => true,
    'rewrite' => array( 'slug' => 'team-cat' ),
  ));

}

// Tag Taxonomy Code

add_action( 'init', 'specializes_in_tag_taxonomy', 0 );

// Create a custom taxonomy "Specializes in" for your posts
function specializes_in_tag_taxonomy() {
  // Define labels for the taxonomy
  $labels = array(
    'name'              => _x( 'Specializes in', 'taxonomy general name' ),
    'singular_name'     => _x( 'Specializes in', 'taxonomy singular name' ),
    'search_items'      => __( 'Search Specializations' ),
    'all_items'         => __( 'All Specializations' ),
    'edit_item'         => __( 'Edit Specialization' ),
    'update_item'       => __( 'Update Specialization' ),
    'add_new_item'      => __( 'Add New Specialization' ),
    'new_item_name'     => __( 'New Specialization Name' ),
    'menu_name'         => __( 'Specializes in' ),
  );

  // Register the new "Specializes in" taxonomy
  register_taxonomy( 'specializes-in', array( 'ourteam' ), array(
  'hierarchical' => true,
    'labels' => $labels,
    'show_ui' => true,
    'show_in_rest' => true,
    'show_admin_column' => true,
    'query_var' => true,
    'rewrite'           => array( 'slug' => 'specializes-in' ),
  ));
}




add_action( 'init', 'serves_ages_tag_taxonomy', 0 );

// Create a custom taxonomy "Serves Ages" for your posts
function serves_ages_tag_taxonomy() {
  // Define labels for the taxonomy
  $labels = array(
    'name'              => _x( 'Serves Ages', 'taxonomy general name' ),
    'singular_name'     => _x( 'Serves Age', 'taxonomy singular name' ),
    'search_items'      => __( 'Search Served Ages' ),
    'all_items'         => __( 'All Served Ages' ),
    'edit_item'         => __( 'Edit Served Age' ),
    'update_item'       => __( 'Update Served Age' ),
    'add_new_item'      => __( 'Add New Served Age' ),
    'new_item_name'     => __( 'New Served Age Name' ),
    'menu_name'         => __( 'Serves Ages' ),
  );

  // Register the new "Serves Ages" taxonomy
  register_taxonomy( 'serves-ages', array( 'ourteam' ), array(
'hierarchical' => true,
    'labels' => $labels,
    'show_ui' => true,
    'show_in_rest' => true,
    'show_admin_column' => true,
    'query_var' => true,
    'rewrite'           => array( 'slug' => 'serves-ages' ),
  ));
}



// Our Team Shortcode
add_shortcode('categories_tab', 'kv_categories_codex');
function kv_categories_codex($atts) {
    extract(shortcode_atts(array(
        'category' => '',
    ), $atts));
    ob_start();

    $terms = array();
    $cats = explode(',', $category);
    if (empty($category)) {
        $cate = get_terms('team-cat');
        foreach ($cate as $arra) {
            $categ[] = $arra->slug;
        }
        $cats = $categ;
    } ?>
    <div id="team-tabs" class="team_tabs filterOptions">
        <ul><li class="active"><a href="#" class="all">All</a></li>
            <?php
            $i = 0;
            foreach ($cats as $catz) {
                $catObj = get_term_by('slug', $catz, 'team-cat');
            ?>
                <li><a href="#" class="<?php echo $catObj->slug ?>"><?php echo $catObj->name ?></a></li>
            <?php
                $terms[] = $catObj->slug;
                $i++;
            }
            ?>
        </ul>
        <div id="<?= $term ?>" class="tab-content ourHolder">
        <?php
        foreach ($terms as $term) { ?>
            
                <?php
                $args = array(
                    'post_type'             => 'ourteam',
                    'post_status'           => 'publish',
                    'posts_per_page'      =>  -1,
                    'post__not_in' => $do_not_duplicate,
                    'tax_query' => array(
                        array(
                            'taxonomy'      => 'team-cat',
                            'field'         => 'slug',
                            'terms'         => $term,
                        )
                    )
                );

                $query = new WP_Query($args);
                if ($query->have_posts()) :
                    while ($query->have_posts()) :
                        $query->the_post();
                        $do_not_duplicate[] = get_the_ID();
                        $post_id = get_the_ID();
                        $designation = get_field( "designation" );

                        // $product = wc_get_product($post_id);

                ?>
                        <div class="team_wrapper item <?= $term ?>">
                            <a href="<?php the_permalink(); ?>"><img src="<?php echo get_the_post_thumbnail_url(); ?>"></a>
                            <div class="details">
                                <div class="post-title-wrap">
                                    <div class="post-title">
                                        <a href="<?php the_permalink(); ?>"><?php echo get_the_title(); ?></a>
                                    </div>
                                   
                                </div>
                                <div class="team-description-wrap">
                                        <div class="team-description"><?php echo $designation; ?></div>
                                </div>
                            </div>
                        </div>
                <?php
                    endwhile;
                endif;
                ?>
            
        <?php
        }
        ?>
        </div>
    </div>
<?php
    wp_reset_postdata();
    return '' . ob_get_clean();
}


function time_ago( $type = 'post' ) {
    $d = 'comment' == $type ? 'get_comment_time' : 'get_post_time';

    return human_time_diff($d('U'), current_time('timestamp')) . " " . __('ago');

}

// Blog Tab Shortcode
add_shortcode('blog_tab', 'blog_tab_categories_codex');
function blog_tab_categories_codex($atts) {
    extract(shortcode_atts(array(
        'category' => '',
    ), $atts));
    ob_start();

    $terms = array();
    $cats = explode(',', $category);
    if (empty($category)) {
        $cate = get_terms('category');
        foreach ($cate as $arra) {
            $categ[] = $arra->slug;
        }
        $cats = $categ;
    } ?>
    <div id="blog-tabs" class="blog_tabs filterOptions">
        <ul>
            <li class="active"><a href="#" class="all">All Posts</a></li>
            <!-- <li><a href="#all" id="allposts">All Posts</a></li> -->
            <?php
            $i = 0;
            foreach ($cats as $catz) {
                $catObj = get_term_by('slug', $catz, 'category');
            ?>
                <li><a href="#" class="<?php echo $catObj->slug ?>"><?php echo $catObj->name ?></a></li>
            <?php
                $terms[] = $catObj->slug;
                $i++;
            }
            ?>
        </ul>
        <div id="<?= $term ?>" class="tab-content ourHolder">
        <?php
        foreach ($terms as $term) { ?>
            
                <?php
                $args = array(
                    'post_type'             => 'post',
                    'post_status'           => 'publish',
                    'posts_per_page'        =>  -1,
                    'order'                 => 'DESC',
                    'orderby'               => 'DATE',
                    'tax_query' => array(
                        array(
                            'taxonomy'      => 'category',
                            'field'         => 'slug',
                            'terms'         => $term,
                        )
                    )
                );

                $query = new WP_Query($args);
                if ($query->have_posts()) :
                    while ($query->have_posts()) :
                        $query->the_post();
                        $post_id = get_the_ID();
                        $author_id = get_the_author_meta('ID');
                        $output = get_avatar_url($author_id);

                ?>
                        <div class="blog_wrapper item <?= $term ?>">
                            <a href="<?php the_permalink(); ?>"><img src="<?php echo get_the_post_thumbnail_url(); ?>"></a>

                            <div class="details">
                                <div class="author-info">
                                    <img class="author-img" src="<?php echo $output; ?>"/>
                                    <div class="author-name">
                                        <span class="author-title"><?php echo get_the_author(); ?></span>
                                        <span class="author-date"><?php echo the_time( 'F j, Y' ); ?> <?php echo time_ago(); ?></span>
                                    </div>
                                </div>
                                <div class="post-title-wrap">
                                    <h2><a href="<?php the_permalink(); ?>"><?php echo get_the_title(); ?></a></h2>
                                </div>
                                <div class="team-description"><?php echo wp_trim_words( get_the_content(), 30 ); ?></div>
                            </div>

                        </div>
                <?php
                    endwhile;
                endif;
                ?>
            
        <?php
        }
        ?>
        </div>
        <div class="blogview"><a href="#0" id="blogloadMore">View More</a></div>
        
    </div>
<?php
    wp_reset_postdata();
    return '' . ob_get_clean();
}

function custom_script_codex() {
	?>
	<script type="text/javascript">

    jQuery(function ($) { 



$('.filterOptions li a').click(function() {
    // fetch the class of the clicked item
    var ourClass = $(this).attr('class');

    // reset the active class on all the buttons
    $('.filterOptions li').removeClass('active');
    // update the active state on our clicked button
    $(this).parent().addClass('active');

    if(ourClass == 'all') {
      // show all our items
      $('.ourHolder').children('div.item').show();
    }
    else {
      // hide all elements that don't share ourClass
      $('.ourHolder').children('div:not(.' + ourClass + ')').hide();
      // show all elements that do share ourClass
      $('.ourHolder').children('div.' + ourClass).show();
    }
    return false;
  });

        $('.readmore_box a.elementor-button').on('click', function(){
             $(this).closest('.readmore_box').toggleClass('readmore_box_active');
        });	

// Blog Load more
$(function () {
    $(".blog_tabs .blog_wrapper").slice(0, 6).show();
    $("#blogloadMore").on('click', function (e) {
        e.preventDefault();
        $(".blog_tabs .blog_wrapper:hidden").slice(0, 6).slideDown();
        if ($(".blog_tabs .blog_wrapper:hidden").length == 0) {
            $("#load").fadeOut('slow');
        }
        // $('html,body').animate({
        //     scrollTop: $(this).offset().top
        // }, 1000);
    });
});


		if ($(".blog_tabs ul li:first-child").hasClass(".active")){
			$(this).find('blog_tabs').addClass("allpostactive")
		}else{
			$(this).find('blog_tabs').removeClass("allpostactive")
		}

    });
	</script>
	<?php
}
add_action( 'wp_footer', 'custom_script_codex' );

//

function team_shortcode($atts) {
    ob_start();
    // define attributes and their defaults
    global $post;
    
    extract( shortcode_atts( array (
        'order' => 'DESC',
        'orderby' => 'ID',
        'limit' => -1,
        'category' => '',
    ), $atts ) );

if($category != ''){
    $options = array(
        'post_type' => 'ourteam',
        'order' => $order,
        'orderby' => $orderby,
        'posts_per_page' => -1,
      
        'tax_query' => array(
                array(
                    'taxonomy' => 'team-cat',
                    'field'    => 'slug',
                    'terms'    => $category,
                ),
            ),

    );
} else {
      $options = array(
        'post_type' => 'ourteam',
        'order' => $order,
        'orderby' => $orderby,
        'posts_per_page' => -1,
    );  
}

    $query = new WP_Query( $options ); ?>
    <div id="team-tabs" class="team_tabs filterOptions">
<div id="<?= $term ?>" class="tab-content ourHolder">
    <?php
        if ($query->have_posts()) :
                    while ($query->have_posts()) : $query->the_post();
                        $post_id = get_the_ID();
                        $designation = get_field( "designation" );

                        // $product = wc_get_product($post_id);

                ?>
                        <div class="team_wrapper item <?= $term ?>">
                            <a href="<?php the_permalink(); ?>"><img src="<?php echo get_the_post_thumbnail_url(); ?>"></a>
                            <div class="details">
                                <div class="post-title-wrap">
                                    <div class="post-title">
                                        <a href="<?php the_permalink(); ?>"><?php echo get_the_title(); ?></a>
                                    </div>
                                   
                                </div>
                                <div class="team-description-wrap">
                                        <div class="team-description"><?php echo $designation; ?></div>
                                </div>
                            </div>
                        </div>
                <?php
                    endwhile;
                endif; ?>
</div>
</div>
<?php
      /* Restore original Post Data */
      wp_reset_postdata();
       $myvariable = ob_get_clean();
        return $myvariable;
}
add_shortcode( 'our-team', 'team_shortcode' );






function getRepeater() {
    // Start output buffering
    ob_start();

    // Use global $post to access the current post ID
    global $post;
    
    // Get the current post ID
    $id = $post->ID;

    // Initialize an empty string to hold the output
    $output = '';

    // Check if repeater field has rows
    if( have_rows('session_values_group_repeater', $id) ):
      echo '<div class="user-info">';

        // Loop through rows
        while( have_rows('session_values_group_repeater', $id) ) : the_row();

            // Load sub field values
            $sub_value_img = get_sub_field('session_image'); // Assuming this is an image URL or an array
            $sub_value_title = get_sub_field('session_title'); // Assuming this is text
            echo '<div class="ind-user-info">';
            // Append the sub field values to the output
            if ($sub_value_img) {
                // Check if session_image is a URL or an array, and output image tag
                if (is_array($sub_value_img)) {
                    // If it's an array (typically an image field with multiple attributes)
                    $img_url = $sub_value_img['url'];
                    $img_alt = isset($sub_value_img['alt']) ? esc_attr($sub_value_img['alt']) : '';
                    echo '<img src="' . esc_url($img_url) . '" alt="' . $img_alt . '" />';
                } else {
                    // If it's just a URL
                    echo '<img src="' . esc_url($sub_value_img) . '" alt="Image" />';
                }
            }

            if ($sub_value_title) {
                // Output the session title safely
                echo '<p>' . esc_html($sub_value_title) . '</p>';
            }
			echo '</div>';
        endwhile;
      echo '</div>';

    else :
        // If no rows, append this message to output
        echo '<p></p>';
    endif;

    // Get the output from the buffer
    $content = ob_get_clean();

    // Return the output to be displayed by the shortcode
    return $content;
}

// Register the shortcode
add_shortcode('getRepeater', 'getRepeater');





add_action( 'init', 'Location_tag_taxonomy', 0 );

// Create a custom taxonomy "Serves Ages" for your posts
function Location_tag_taxonomy() {
  // Define labels for the taxonomy
  $labels = array(
    'name'              => _x( 'Location', 'taxonomy general name' ),
    'singular_name'     => _x( 'Location', 'taxonomy singular name' ),
    'search_items'      => __( 'Search Location' ),
    'all_items'         => __( 'All Location' ),
    'edit_item'         => __( 'Edit Location' ),
    'update_item'       => __( 'Update Location' ),
    'add_new_item'      => __( 'Add New Location' ),
    'new_item_name'     => __( 'New Location Name' ),
    'menu_name'         => __( 'Location' ),
  );

  // Register the new "Serves Ages" taxonomy
  register_taxonomy( 'Location', array( 'ourteam' ), array(
'hierarchical' => true,
    'labels' => $labels,
    'show_ui' => true,
    'show_in_rest' => true,
    'show_admin_column' => true,
    'query_var' => true,
    'rewrite'           => array( 'slug' => 'location' ),
  ));
}
add_action( 'init', 'treatment_tag_taxonomy', 0 );

// Create a custom taxonomy "Serves Ages" for your posts
function treatment_tag_taxonomy() {
  // Define labels for the taxonomy
  $labels = array(
    'name'              => _x( 'Treatment', 'taxonomy general name' ),
    'singular_name'     => _x( 'Treatment', 'taxonomy singular name' ),
    'search_items'      => __( 'Search Treatment' ),
    'all_items'         => __( 'All Treatment' ),
    'edit_item'         => __( 'Edit Treatment' ),
    'update_item'       => __( 'Update Treatment' ),
    'add_new_item'      => __( 'Add New Treatment' ),
    'new_item_name'     => __( 'New Treatment Name' ),
    'menu_name'         => __( 'Treatment' ),
  );

  // Register the new "Serves Ages" taxonomy
  register_taxonomy( 'Treatment', array( 'ourteam' ), array(
'hierarchical' => true,
    'labels' => $labels,
    'show_ui' => true,
    'show_in_rest' => true,
    'show_admin_column' => true,
    'query_var' => true,
    'rewrite'           => array( 'slug' => 'Treatment' ),
  ));
}

function custom_taxonomy_shortcode( $atts ) {
    global $post;

    // Define default attributes for the shortcode
    $atts = shortcode_atts( array(
        'post_id' => $post->ID, // Optional, use for filtering by specific post ID
    ), $atts, 'custom_taxonomies' );

    // Define the taxonomies to query
    $taxonomies = [
        'serves-ages' => 'Serves',
        'specializes-in' => 'Specializes In',
        'Treatment' => 'Modalities Used'
    ];

    $output = '';
    $has_terms = false; // Flag to check if we have terms

    // Loop through the taxonomies
    foreach ( $taxonomies as $taxonomy => $title ) {
        // If a post ID is passed, get the terms for that specific post
        if ( ! empty( $atts['post_id'] ) ) {
            $terms = get_the_terms( $atts['post_id'], $taxonomy );
        } else {
            // Get all terms from the specified taxonomy
            $terms = get_terms( array(
                'taxonomy' => $taxonomy,
                'hide_empty' => false, // Show terms even if no posts are assigned
            ) );
        }

        // Check if terms exist
        if ( ! empty( $terms ) && ! is_wp_error( $terms ) ) {
            if ( ! $has_terms ) {
                // Only add the heading if at least one taxonomy has terms
                $output .= '<h1>Treatment Method</h1>';
                $has_terms = true; // Set flag to true as we have terms now
            }

            // Show the heading for the taxonomy
            $output .= '<h3>' . esc_html( $title ) . '</h3>';
            $output .= '<ul class="' . esc_attr( $taxonomy ) . '-list">';
            
            // Loop through terms and create list items with links
            foreach ( $terms as $term ) {
                $term_link = get_term_link( $term );
                
                if ( ! is_wp_error( $term_link ) ) {
                    $output .= '<li><a href="' . esc_url( $term_link ) . '" target="_blank">' . esc_html( $term->name ) . '</a></li>';
                }
            }
            
            $output .= '</ul>';
        }
    }

    // If no terms were found, $output will be empty, and the "Treatment Method" heading won't be shown
    return $output;
}

// Register the merged shortcode [custom_taxonomies]
add_shortcode( 'custom_taxonomies', 'custom_taxonomy_shortcode' );





function team_filter_dropdowns_shortcode() {
    ob_start();
    ?>
    <form id="team_filter_form">
        <div class="label">
            <label for="team_category">Filter by Category:</label>
            <?php team_category_dropdown(); ?>
        </div>
        <div class="label">
            <label for="team_tag">Filter by Tag Specializes In:</label>
            <?php team_tag_dropdown(); ?>
        </div>
        <div class="label">
            <label for="another_team_tag">Filter by Tag Serves Ages:</label>
            <?php another_team_tag_dropdown(); ?>
        </div>
        <div class="label">
            <label for="team_location">Filter by Location:</label>
            <?php team_location_dropdown(); ?>
        </div>
        <div class="label">
            <label for="team_treatment">Filter by Treatments:</label>
            <?php team_treatment_dropdown(); ?>
        </div>
    </form>

    <div id="team-archive-results"></div>

    <?php
    return ob_get_clean();
}
add_shortcode('team_filters', 'team_filter_dropdowns_shortcode');

function team_category_dropdown() {
    wp_dropdown_categories(array(
        'show_option_all' => 'All Categories', // Placeholder option
        'name'            => 'team_category',    // Name attribute for the form
        'taxonomy'        => 'team-cat',         // Use 'team-cat' taxonomy
        'orderby'         => 'name',            // Order by name
        'selected'        => isset($_GET['team_category']) ? $_GET['team_category'] : '',
        'value_field'     => 'slug',             // The value field for the option
    ));
}
function team_tag_dropdown() {
    // Add the "team_tag" dropdown
    wp_dropdown_categories(array(
        'show_option_all' => 'All Specializes', // Placeholder option
        'name'            => 'team_tag',  // Name attribute for the form
        'taxonomy'        => 'specializes-in', // Existing taxonomy
        'orderby'         => 'name',      // Order by name
        'selected'        => isset($_GET['team_tag']) ? $_GET['team_tag'] : '', // Preselect based on query string
        'value_field'     => 'slug',      // The value field for the option
    ));
}

function another_team_tag_dropdown() {
    // Add the "another_team_tag" dropdown
    wp_dropdown_categories(array(
        'show_option_all' => 'All Serves Ages', // Placeholder option
        'name'            => 'another_team_tag',  // New name attribute
        'taxonomy'        => 'serves-ages',       // The new taxonomy
        'orderby'         => 'name',              // Order by name
        'selected'        => isset($_GET['another_team_tag']) ? $_GET['another_team_tag'] : '', // Preselect based on query string
        'value_field'     => 'slug',               // The value field for the option
    ));
}
function team_location_dropdown() {
    wp_dropdown_categories(array(
        'show_option_all' => 'All Locations', // Placeholder option
        'name'            => 'team_location',  // Name attribute for the form
        'taxonomy'        => 'Location',      // New taxonomy for location
        'orderby'         => 'name',          // Order by name
        'selected'        => isset($_GET['team_location']) ? $_GET['team_location'] : '',
        'value_field'     => 'slug',           // The value field for the option
    ));
}

function team_treatment_dropdown() {
    wp_dropdown_categories(array(
        'show_option_all' => 'All Treatments', // Placeholder option
        'name'            => 'team_treatment',  // New name attribute for the form
        'taxonomy'        => 'Treatment',      // New taxonomy for treatments
        'orderby'         => 'name',            // Order by name
        'selected'        => isset($_GET['team_treatment']) ? $_GET['team_treatment'] : '',
        'value_field'     => 'slug',             // The value field for the option
    ));
}


function filter_team_results() {
    // Check if AJAX request is valid
    if (isset($_GET['team_category']) || isset($_GET['team_tag']) || isset($_GET['team_location']) || isset($_GET['team_treatment'])) {
        // Base query args
        $args = array(
            'post_type'      => 'ourteam',
            'posts_per_page' => -1, // Get all posts
            'tax_query'      => array('relation' => 'AND'), // Default relation between taxonomies
        );

        // Add category filter if selected
        if (!empty($_GET['team_category'])) {
            $args['tax_query'][] = array(
                'taxonomy' => 'team-cat',
                'field'    => 'slug',
                'terms'    => $_GET['team_category'],
                'operator' => 'IN',
            );
        }

        // Add tag filter if selected
        if (!empty($_GET['team_tag'])) {
            $args['tax_query'][] = array(
                'taxonomy' => 'specializes-in',
                'field'    => 'slug',
                'terms'    => $_GET['team_tag'],
                'operator' => 'IN',
            );
        }

        // Add second tag filter for ages if selected
        if (!empty($_GET['another_team_tag'])) {
            $args['tax_query'][] = array(
                'taxonomy' => 'serves-ages',
                'field'    => 'slug',
                'terms'    => $_GET['another_team_tag'],
                'operator' => 'IN',
            );
        }

        // Add location filter if selected
        if (!empty($_GET['team_location'])) {
            $args['tax_query'][] = array(
                'taxonomy' => 'Location',
                'field'    => 'slug',
                'terms'    => $_GET['team_location'],
                'operator' => 'IN',
            );
        }

        // Add treatment filter if selected
        if (!empty($_GET['team_treatment'])) {
            $args['tax_query'][] = array(
                'taxonomy' => 'Treatment',
                'field'    => 'slug',
                'terms'    => $_GET['team_treatment'],
                'operator' => 'IN',
            );
        }

        // Run the query
        $posts_new = get_posts($args);

        if ($posts_new) {
            foreach ($posts_new as $post) {
                ?>
                <div class="list-item">
                    <?php
                    setup_postdata($post);
                    $featured_image = get_the_post_thumbnail_url($post->ID, 'full');
                    $designation = get_post_meta($post->ID, 'designation', true);
                    if ($featured_image) {
                        echo '<div class="team-thumbnail"><a href="' . esc_url(get_permalink($post->ID)) . '"><img src="' . esc_url($featured_image) . '" alt="' . esc_attr(get_the_title($post)) . '"></a></div>';
                    }
                    echo '<h2><a href="' . esc_url(get_permalink($post->ID)) . '">' . esc_html($post->post_title) . '</a></h2>';

                    if ($designation) {
                        echo '<p>' . esc_html($designation) . '</p>';
                    }
                    ?>
                </div>
                <?php
            }
        } else {
            echo 'No posts found.';
        }

        // Reset post data
        wp_reset_postdata();
    }

    die(); // End AJAX processing
}
add_action('wp_ajax_filter_team_results', 'filter_team_results');
add_action('wp_ajax_nopriv_filter_team_results', 'filter_team_results');


function footer_js() {
    ?>
   <script>
    jQuery(document).ready(function($) {
        // Trigger the AJAX request when a dropdown value changes
        $('#team_category, #team_tag, #another_team_tag, #team_location, #team_treatment').on('change', function() {
            var teamCategory = $('#team_category').val();
            var teamTag = $('#team_tag').val();
            var anotherTeamTag = $('#another_team_tag').val();
            var teamLocation = $('#team_location').val();
            var teamTreatment = $('#team_treatment').val();

            // AJAX request
            $.ajax({
                url: '<?php echo admin_url('admin-ajax.php'); ?>', // The AJAX URL provided by WordPress
                type: 'GET',
                data: {
                    action: 'filter_team_results', // The action hook that will process the AJAX request
                    team_category: teamCategory,
                    team_tag: teamTag,
                    another_team_tag: anotherTeamTag,
                    team_location: teamLocation, // Include the location
                    team_treatment: teamTreatment, // Include the treatment
                },
                beforeSend: function() {
                    // Show loading spinner
                    $('#team-archive-results').html('<div class="loader"><svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" stroke="#b7e0f6f7" stroke-width="4" fill="none" stroke-dasharray="3,3" stroke-dashoffset="0"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg></div>');
                },
                success: function(response) {
                    $('#team-archive-results').html(response); // Display the filtered results
                },
                error: function(xhr, status, error) {
                    console.log('AJAX Error: ' + status + ' - ' + error); // Debugging error
                }
            });
        });

        // Trigger the AJAX request when the page loads to show the initial results
        $(window).on('load', function () {
            var teamCategory = $('#team_category').val();
            var teamTag = $('#team_tag').val();
            var anotherTeamTag = $('#another_team_tag').val();
            var teamLocation = $('#team_location').val();
            var teamTreatment = $('#team_treatment').val();

            // AJAX request
            $.ajax({
                url: '<?php echo admin_url('admin-ajax.php'); ?>',
                type: 'GET',
                data: {
                    action: 'filter_team_results',
                    team_category: teamCategory,
                    team_tag: teamTag,
                    another_team_tag: anotherTeamTag,
                    team_location: teamLocation,
                    team_treatment: teamTreatment,
                },
                beforeSend: function() {
                    $('#team-archive-results').html('<div class="loader">Loading...</div>');
                },
                success: function(response) {
                    $('#team-archive-results').html(response);
                },
                error: function(xhr, status, error) {
                    console.log('AJAX Error: ' + status + ' - ' + error);
                }
            });
        });
    });
</script>

    <?php
}
add_action('wp_footer', 'footer_js');

// Define the function to retrieve related posts
function related_posts_by_taxonomy() {
    // Get the current post ID
$post_id = get_the_ID();

// Get the terms of the current post for each taxonomy (e.g., 'category', 'post_tag', and custom taxonomies)
$categories = wp_get_post_terms($post_id, 'category');
$tags = wp_get_post_terms($post_id, 'post_tag');
// Add other taxonomies as needed
$custom_taxonomy_1 = wp_get_post_terms($post_id, 'team-cat');
$custom_taxonomy_2 = wp_get_post_terms($post_id, 'specializes-in');
$custom_taxonomy_3 = wp_get_post_terms($post_id, 'serves-ages');
$custom_taxonomy_4 = wp_get_post_terms($post_id, 'Location');
$custom_taxonomy_5 = wp_get_post_terms($post_id, 'Treatment');

// Merge all terms into one array
$all_terms = array_merge( $custom_taxonomy_1, $custom_taxonomy_2, $custom_taxonomy_3, $custom_taxonomy_4, $custom_taxonomy_5);

// If there are no terms, we don't need to proceed with the query
if (empty($all_terms)) {
    echo 'No related posts found.';
    return;
}

// Extract the term IDs
$term_ids = wp_list_pluck($all_terms, 'term_id');

// Set up the query arguments to get related posts
$args = array(
    'post_type' => 'ourteam', // Adjust this for custom post types if needed
    'posts_per_page' => 5, // Number of related posts to display
    'post__not_in' => array($post_id), // Exclude the current post from results
    'tax_query' => array(
        'relation' => 'OR', // This ensures that posts must have terms from all taxonomies
    ),
);

// Add taxonomies to the query dynamically
foreach ($all_terms as $term) {
    $args['tax_query'][] = array(
        'taxonomy' => $term->taxonomy,
        'field' => 'term_id',
        'terms' => $term->term_id,
        'operator' => 'IN',
    );
}

// The query to get related posts
$query = new WP_Query($args);

// Loop through related posts and display them
if ($query->have_posts()) {
    echo '<ul class="realted-post">';
    while ($query->have_posts()) {
    $query->the_post();

    // Get the featured image (thumbnail)
    $featured_image = get_the_post_thumbnail( get_the_ID(), 'thumbnail' ); // 'thumbnail' can be replaced with any image size like 'medium', 'large', etc.

    // Get the "designation" custom field
    $designation = get_post_meta( get_the_ID(), 'designation', true ); // Replace 'designation' with the correct custom field key

    echo '<li>';
    
    // Display the featured image if available
    if ( $featured_image ) {
        echo '<div class="related-post-thumbnail">' . $featured_image . '</div>';
    }

    // Display the title with the link to the post
    echo '<a href="' . get_permalink() . '">' . get_the_title() . '</a>';
    
    // Display the designation if available
    if ( $designation ) {
        echo '<p class="designation"> ' . esc_html( $designation ) . '</p>';
    }

    echo '</li>';
}

    echo '</ul>';
    wp_reset_postdata();
} else {
    echo 'No related posts found.';
}
}

// Register the shortcode
add_shortcode( 'related_posts', 'related_posts_by_taxonomy' );






function add_userback_script() {
  ?>
<script>
    window.Userback = window.Userback || {};
    Userback.access_token = 'A-7VARVgBtpJtf80JEeZRR9LRpK';
    // identify your logged-in users (optional)
    Userback.user_data = {
      id: "123456", // example data
      info: {
        name: "someone", // example data
        email: "someone@example.com" // example data
      }
    };
    (function(d) {
      var s = d.createElement('script');s.async = true;s.src = 'https://static.userback.io/widget/v1.js';
      (d.head || d.body).appendChild(s);
    })(document);
</script>
<?php
}
add_action('wp_footer', 'add_userback_script');



function crown_counseling_iframe_shortcode($atts) {
    global $post;

 

    // Get the clinician ID either from the shortcode attribute or the post's custom field
    $clinician_id = get_field("clinicianid", $post->ID);

    // If a clinician ID is found, show the iframe; otherwise, show the second form
    if (!empty($clinician_id)) {
		
        // Return the iframe with the clinician ID
        return '<iframe style="border: none;" src="https://crowncounselingapp.vercel.app?clinicianId=' . esc_attr($clinician_id) . '" width="100%" height="400px"></iframe>';
    } else {
        // Return the second form when no clinician ID is found
        return '<style>.show-iframe{display:none !important}</style>
            <div class="_form_1"></div>
            <script src="https://crowncounseling.activehosted.com/f/embed.php?id=1" type="text/javascript" charset="utf-8"></script>
        ';
    }
}
add_shortcode('crown_counseling_iframe', 'crown_counseling_iframe_shortcode');


