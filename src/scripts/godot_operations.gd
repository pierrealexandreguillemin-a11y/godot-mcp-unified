#!/usr/bin/env -S godot --headless --script
extends SceneTree

# Debug mode flag
var debug_mode = false

func _init():
    var args = OS.get_cmdline_args()
    
    # Check for debug flag
    debug_mode = "--debug-godot" in args
    
    # Find the script argument and determine the positions of operation and params
    var script_index = args.find("--script")
    if script_index == -1:
        log_error("Could not find --script argument")
        quit(1)
    
    # The operation should be 2 positions after the script path (script_index + 1 is the script path itself)
    var operation_index = script_index + 2
    # The params should be 3 positions after the script path
    var params_index = script_index + 3
    
    if args.size() <= params_index:
        log_error("Usage: godot --headless --script godot_operations.gd <operation> <json_params>")
        log_error("Not enough command-line arguments provided.")
        quit(1)
    
    # Log all arguments for debugging
    log_debug("All arguments: " + str(args))
    log_debug("Script index: " + str(script_index))
    log_debug("Operation index: " + str(operation_index))
    log_debug("Params index: " + str(params_index))
    
    var operation = args[operation_index]
    var params_json = args[params_index]
    
    log_info("Operation: " + operation)
    log_debug("Params JSON: " + params_json)
    
    # Parse JSON using Godot 4.x API
    var json = JSON.new()
    var error = json.parse(params_json)
    var params = null
    
    if error == OK:
        params = json.get_data()
    else:
        log_error("Failed to parse JSON parameters: " + params_json)
        log_error("JSON Error: " + json.get_error_message() + " at line " + str(json.get_error_line()))
        quit(1)
    
    if not params:
        log_error("Failed to parse JSON parameters: " + params_json)
        quit(1)
    
    log_info("Executing operation: " + operation)
    
    match operation:
        "create_scene":
            create_scene(params)
        "add_node":
            add_node(params)
        "edit_node":
            edit_node(params)
        "remove_node":
            remove_node(params)
        "load_sprite":
            load_sprite(params)
        "export_mesh_library":
            export_mesh_library(params)
        "save_scene":
            save_scene(params)
        "get_uid":
            get_uid(params)
        "resave_resources":
            resave_resources(params)
        # Animation operations
        "add_animation":
            add_animation(params)
        "add_animation_track":
            add_animation_track(params)
        "set_keyframe":
            set_keyframe(params)
        # Physics operations
        "create_collision_shape":
            create_collision_shape(params)
        "set_project_setting":
            set_project_setting(params)
        # TileMap operations
        "create_tileset":
            create_tileset(params)
        "set_tile":
            set_tile(params)
        "paint_tiles":
            paint_tiles(params)
        # Audio operations
        "create_audio_bus":
            create_audio_bus(params)
        "add_audio_effect":
            add_audio_effect(params)
        # Navigation operations
        "create_navigation_region":
            create_navigation_region(params)
        # Particles operations
        "create_gpu_particles":
            create_gpu_particles(params)
        # UI operations
        "create_ui_container":
            create_ui_container(params)
        "create_control":
            create_control(params)
        # Lighting operations
        "create_light":
            create_light(params)
        _:
            log_error("Unknown operation: " + operation)
            quit(1)
    
    quit()

# Logging functions
func log_debug(message):
    if debug_mode:
        print("[DEBUG] " + message)

func log_info(message):
    print("[INFO] " + message)

func log_error(message):
    printerr("[ERROR] " + message)

# Get a script by name or path
func get_script_by_name(name_of_class):
    if debug_mode:
        print("Attempting to get script for class: " + name_of_class)
    
    # Try to load it directly if it's a resource path
    if ResourceLoader.exists(name_of_class, "Script"):
        if debug_mode:
            print("Resource exists, loading directly: " + name_of_class)
        var script = load(name_of_class) as Script
        if script:
            if debug_mode:
                print("Successfully loaded script from path")
            return script
        else:
            printerr("Failed to load script from path: " + name_of_class)
    elif debug_mode:
        print("Resource not found, checking global class registry")
    
    # Search for it in the global class registry if it's a class name
    var global_classes = ProjectSettings.get_global_class_list()
    if debug_mode:
        print("Searching through " + str(global_classes.size()) + " global classes")
    
    for global_class in global_classes:
        var found_name_of_class = global_class["class"]
        var found_path = global_class["path"]
        
        if found_name_of_class == name_of_class:
            if debug_mode:
                print("Found matching class in registry: " + found_name_of_class + " at path: " + found_path)
            var script = load(found_path) as Script
            if script:
                if debug_mode:
                    print("Successfully loaded script from registry")
                return script
            else:
                printerr("Failed to load script from registry path: " + found_path)
                break
    
    printerr("Could not find script for class: " + name_of_class)
    return null

# Instantiate a class by name
func instantiate_class(name_of_class):
    if name_of_class.is_empty():
        printerr("Cannot instantiate class: name is empty")
        return null
    
    var result = null
    if debug_mode:
        print("Attempting to instantiate class: " + name_of_class)
    
    # Check if it's a built-in class
    if ClassDB.class_exists(name_of_class):
        if debug_mode:
            print("Class exists in ClassDB, using ClassDB.instantiate()")
        if ClassDB.can_instantiate(name_of_class):
            result = ClassDB.instantiate(name_of_class)
            if result == null:
                printerr("ClassDB.instantiate() returned null for class: " + name_of_class)
        else:
            printerr("Class exists but cannot be instantiated: " + name_of_class)
            printerr("This may be an abstract class or interface that cannot be directly instantiated")
    else:
        # Try to get the script
        if debug_mode:
            print("Class not found in ClassDB, trying to get script")
        var script = get_script_by_name(name_of_class)
        if script is GDScript:
            if debug_mode:
                print("Found GDScript, creating instance")
            result = script.new()
        else:
            printerr("Failed to get script for class: " + name_of_class)
            return null
    
    if result == null:
        printerr("Failed to instantiate class: " + name_of_class)
    elif debug_mode:
        print("Successfully instantiated class: " + name_of_class + " of type: " + result.get_class())
    
    return result

# Create a new scene with a specified root node type
func create_scene(params):
    print("Creating scene: " + params.scene_path)
    
    # Get project paths and log them for debugging
    var project_res_path = "res://"
    var project_user_path = "user://"
    var global_res_path = ProjectSettings.globalize_path(project_res_path)
    var global_user_path = ProjectSettings.globalize_path(project_user_path)
    
    if debug_mode:
        print("Project paths:")
        print("- res:// path: " + project_res_path)
        print("- user:// path: " + project_user_path)
        print("- Globalized res:// path: " + global_res_path)
        print("- Globalized user:// path: " + global_user_path)
        
        # Print some common environment variables for debugging
        print("Environment variables:")
        var env_vars = ["PATH", "HOME", "USER", "TEMP", "GODOT_PATH"]
        for env_var in env_vars:
            if OS.has_environment(env_var):
                print("  " + env_var + " = " + OS.get_environment(env_var))
    
    # Normalize the scene path
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    # Convert resource path to an absolute path
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    # Get the scene directory paths
    var scene_dir_res = full_scene_path.get_base_dir()
    var scene_dir_abs = absolute_scene_path.get_base_dir()
    if debug_mode:
        print("Scene directory (resource path): " + scene_dir_res)
        print("Scene directory (absolute path): " + scene_dir_abs)
    
    # Only do extensive testing in debug mode
    if debug_mode:
        # Try to create a simple test file in the project root to verify write access
        var initial_test_file_path = "res://godot_mcp_test_write.tmp"
        var initial_test_file = FileAccess.open(initial_test_file_path, FileAccess.WRITE)
        if initial_test_file:
            initial_test_file.store_string("Test write access")
            initial_test_file.close()
            print("Successfully wrote test file to project root: " + initial_test_file_path)
            
            # Verify the test file exists
            var initial_test_file_exists = FileAccess.file_exists(initial_test_file_path)
            print("Test file exists check: " + str(initial_test_file_exists))
            
            # Clean up the test file
            if initial_test_file_exists:
                var remove_error = DirAccess.remove_absolute(ProjectSettings.globalize_path(initial_test_file_path))
                print("Test file removal result: " + str(remove_error))
        else:
            var write_error = FileAccess.get_open_error()
            printerr("Failed to write test file to project root: " + str(write_error))
            printerr("This indicates a serious permission issue with the project directory")
    
    # Use traditional if-else statement for better compatibility
    var root_node_type = "Node2D"  # Default value
    if params.has("root_node_type"):
        root_node_type = params.root_node_type
    if debug_mode:
        print("Root node type: " + root_node_type)
    
    # Create the root node
    var scene_root = instantiate_class(root_node_type)
    if not scene_root:
        printerr("Failed to instantiate node of type: " + root_node_type)
        printerr("Make sure the class exists and can be instantiated")
        printerr("Check if the class is registered in ClassDB or available as a script")
        quit(1)
    
    scene_root.name = "root"
    if debug_mode:
        print("Root node created with name: " + scene_root.name)
    
    # Set the owner of the root node to itself (important for scene saving)
    scene_root.owner = scene_root
    
    # Pack the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        # Only do extensive testing in debug mode
        if debug_mode:
            # First, let's verify we can write to the project directory
            print("Testing write access to project directory...")
            var test_write_path = "res://test_write_access.tmp"
            var test_write_abs = ProjectSettings.globalize_path(test_write_path)
            var test_file = FileAccess.open(test_write_path, FileAccess.WRITE)
            
            if test_file:
                test_file.store_string("Write test")
                test_file.close()
                print("Successfully wrote test file to project directory")
                
                # Clean up test file
                if FileAccess.file_exists(test_write_path):
                    var remove_error = DirAccess.remove_absolute(test_write_abs)
                    print("Test file removal result: " + str(remove_error))
            else:
                var write_error = FileAccess.get_open_error()
                printerr("Failed to write test file to project directory: " + str(write_error))
                printerr("This may indicate permission issues with the project directory")
                # Continue anyway, as the scene directory might still be writable
        
        # Ensure the scene directory exists using DirAccess
        if debug_mode:
            print("Ensuring scene directory exists...")
        
        # Get the scene directory relative to res://
        var scene_dir_relative = scene_dir_res.substr(6)  # Remove "res://" prefix
        if debug_mode:
            print("Scene directory (relative to res://): " + scene_dir_relative)
        
        # Create the directory if needed
        if not scene_dir_relative.is_empty():
            # First check if it exists
            var dir_exists = DirAccess.dir_exists_absolute(scene_dir_abs)
            if debug_mode:
                print("Directory exists check (absolute): " + str(dir_exists))
            
            if not dir_exists:
                if debug_mode:
                    print("Directory doesn't exist, creating: " + scene_dir_relative)
                
                # Try to create the directory using DirAccess
                var dir = DirAccess.open("res://")
                if dir == null:
                    var open_error = DirAccess.get_open_error()
                    printerr("Failed to open res:// directory: " + str(open_error))
                    
                    # Try alternative approach with absolute path
                    if debug_mode:
                        print("Trying alternative directory creation approach...")
                    var make_dir_error = DirAccess.make_dir_recursive_absolute(scene_dir_abs)
                    if debug_mode:
                        print("Make directory result (absolute): " + str(make_dir_error))
                    
                    if make_dir_error != OK:
                        printerr("Failed to create directory using absolute path")
                        printerr("Error code: " + str(make_dir_error))
                        quit(1)
                else:
                    # Create the directory using the DirAccess instance
                    if debug_mode:
                        print("Creating directory using DirAccess: " + scene_dir_relative)
                    var make_dir_error = dir.make_dir_recursive(scene_dir_relative)
                    if debug_mode:
                        print("Make directory result: " + str(make_dir_error))
                    
                    if make_dir_error != OK:
                        printerr("Failed to create directory: " + scene_dir_relative)
                        printerr("Error code: " + str(make_dir_error))
                        quit(1)
                
                # Verify the directory was created
                dir_exists = DirAccess.dir_exists_absolute(scene_dir_abs)
                if debug_mode:
                    print("Directory exists check after creation: " + str(dir_exists))
                
                if not dir_exists:
                    printerr("Directory reported as created but does not exist: " + scene_dir_abs)
                    printerr("This may indicate a problem with path resolution or permissions")
                    quit(1)
            elif debug_mode:
                print("Directory already exists: " + scene_dir_abs)
        
        # Save the scene
        if debug_mode:
            print("Saving scene to: " + full_scene_path)
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if debug_mode:
            print("Save result: " + str(save_error) + " (OK=" + str(OK) + ")")
        
        if save_error == OK:
            # Only do extensive testing in debug mode
            if debug_mode:
                # Wait a moment to ensure file system has time to complete the write
                print("Waiting for file system to complete write operation...")
                OS.delay_msec(500)  # 500ms delay
                
                # Verify the file was actually created using multiple methods
                var file_check_abs = FileAccess.file_exists(absolute_scene_path)
                print("File exists check (absolute path): " + str(file_check_abs))
                
                var file_check_res = FileAccess.file_exists(full_scene_path)
                print("File exists check (resource path): " + str(file_check_res))
                
                var res_exists = ResourceLoader.exists(full_scene_path)
                print("Resource exists check: " + str(res_exists))
                
                # If file doesn't exist by absolute path, try to create a test file in the same directory
                if not file_check_abs and not file_check_res:
                    printerr("Scene file not found after save. Trying to diagnose the issue...")
                    
                    # Try to write a test file to the same directory
                    var test_scene_file_path = scene_dir_res + "/test_scene_file.tmp"
                    var test_scene_file = FileAccess.open(test_scene_file_path, FileAccess.WRITE)
                    
                    if test_scene_file:
                        test_scene_file.store_string("Test scene directory write")
                        test_scene_file.close()
                        print("Successfully wrote test file to scene directory: " + test_scene_file_path)
                        
                        # Check if the test file exists
                        var test_file_exists = FileAccess.file_exists(test_scene_file_path)
                        print("Test file exists: " + str(test_file_exists))
                        
                        if test_file_exists:
                            # Directory is writable, so the issue is with scene saving
                            printerr("Directory is writable but scene file wasn't created.")
                            printerr("This suggests an issue with ResourceSaver.save() or the packed scene.")
                            
                            # Try saving with a different approach
                            print("Trying alternative save approach...")
                            var alt_save_error = ResourceSaver.save(packed_scene, test_scene_file_path + ".tscn")
                            print("Alternative save result: " + str(alt_save_error))
                            
                            # Clean up test files
                            DirAccess.remove_absolute(ProjectSettings.globalize_path(test_scene_file_path))
                            if alt_save_error == OK:
                                DirAccess.remove_absolute(ProjectSettings.globalize_path(test_scene_file_path + ".tscn"))
                        else:
                            printerr("Test file couldn't be verified. This suggests filesystem access issues.")
                    else:
                        var write_error = FileAccess.get_open_error()
                        printerr("Failed to write test file to scene directory: " + str(write_error))
                        printerr("This confirms there are permission or path issues with the scene directory.")
                    
                    # Return error since we couldn't create the scene file
                    printerr("Failed to create scene: " + params.scene_path)
                    quit(1)
                
                # If we get here, at least one of our file checks passed
                if file_check_abs or file_check_res or res_exists:
                    print("Scene file verified to exist!")
                    
                    # Try to load the scene to verify it's valid
                    var test_load = ResourceLoader.load(full_scene_path)
                    if test_load:
                        print("Scene created and verified successfully at: " + params.scene_path)
                        print("Scene file can be loaded correctly.")
                    else:
                        print("Scene file exists but cannot be loaded. It may be corrupted or incomplete.")
                        # Continue anyway since the file exists
                    
                    print("Scene created successfully at: " + params.scene_path)
                else:
                    printerr("All file existence checks failed despite successful save operation.")
                    printerr("This indicates a serious issue with file system access or path resolution.")
                    quit(1)
            else:
                # In non-debug mode, just check if the file exists
                var file_exists = FileAccess.file_exists(full_scene_path)
                if file_exists:
                    print("Scene created successfully at: " + params.scene_path)
                else:
                    printerr("Failed to create scene: " + params.scene_path)
                    quit(1)
        else:
            # Handle specific error codes
            var error_message = "Failed to save scene. Error code: " + str(save_error)
            
            if save_error == ERR_CANT_CREATE:
                error_message += " (ERR_CANT_CREATE - Cannot create the scene file)"
            elif save_error == ERR_CANT_OPEN:
                error_message += " (ERR_CANT_OPEN - Cannot open the scene file for writing)"
            elif save_error == ERR_FILE_CANT_WRITE:
                error_message += " (ERR_FILE_CANT_WRITE - Cannot write to the scene file)"
            elif save_error == ERR_FILE_NO_PERMISSION:
                error_message += " (ERR_FILE_NO_PERMISSION - No permission to write the scene file)"
            
            printerr(error_message)
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        printerr("Error code: " + str(result))
        quit(1)

# Add a node to an existing scene
func add_node(params):
    print("Adding node to scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Use traditional if-else statement for better compatibility
    var parent_path = "root"  # Default value
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    if debug_mode:
        print("Parent path: " + parent_path)
    
    var parent = scene_root
    if parent_path != "root":
        parent = scene_root.get_node(parent_path.replace("root/", ""))
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    if debug_mode:
        print("Parent node found: " + parent.name)
    
    if debug_mode:
        print("Instantiating node of type: " + params.node_type)
    var new_node = instantiate_class(params.node_type)
    if not new_node:
        printerr("Failed to instantiate node of type: " + params.node_type)
        printerr("Make sure the class exists and can be instantiated")
        printerr("Check if the class is registered in ClassDB or available as a script")
        quit(1)
    new_node.name = params.node_name
    if debug_mode:
        print("New node created with name: " + new_node.name)
    
    if params.has("properties"):
        if debug_mode:
            print("Setting properties on node")
        var properties = params.properties
        for property in properties:
            if debug_mode:
                print("Setting property: " + property + " = " + str(properties[property]))
            new_node.set(property, properties[property])
    
    parent.add_child(new_node)
    new_node.owner = scene_root
    if debug_mode:
        print("Node added to parent and ownership set")
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + absolute_scene_path)
        var save_error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(save_error) + " (OK=" + str(OK) + ")")
        if save_error == OK:
            if debug_mode:
                var file_check_after = FileAccess.file_exists(absolute_scene_path)
                print("File exists check after save: " + str(file_check_after))
                if file_check_after:
                    print("Node '" + params.node_name + "' of type '" + params.node_type + "' added successfully")
                else:
                    printerr("File reported as saved but does not exist at: " + absolute_scene_path)
            else:
                print("Node '" + params.node_name + "' of type '" + params.node_type + "' added successfully")
        else:
            printerr("Failed to save scene: " + str(save_error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Edit properties of an existing node in a scene
func edit_node(params):
    print("Editing node in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Get the node path to edit
    var node_path = params.node_path
    if debug_mode:
        print("Node path: " + node_path)
    
    var target_node = scene_root
    if node_path != "root":
        target_node = scene_root.get_node(node_path.replace("root/", ""))
        if not target_node:
            printerr("Target node not found: " + node_path)
            quit(1)
    if debug_mode:
        print("Target node found: " + target_node.name)
    
    # Update node properties
    if params.has("properties"):
        if debug_mode:
            print("Setting properties on node")
        var properties = params.properties
        for property in properties:
            if debug_mode:
                print("Setting property: " + property + " = " + str(properties[property]))
            target_node.set(property, properties[property])
    else:
        if debug_mode:
            print("No properties specified to update")
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + absolute_scene_path)
        var save_error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(save_error) + " (OK=" + str(OK) + ")")
        if save_error == OK:
            if debug_mode:
                var file_check_after = FileAccess.file_exists(absolute_scene_path)
                print("File exists check after save: " + str(file_check_after))
                if file_check_after:
                    print("Node '" + node_path + "' properties updated successfully")
                else:
                    printerr("File reported as saved but does not exist at: " + absolute_scene_path)
            else:
                print("Node '" + node_path + "' properties updated successfully")
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# Remove a node from an existing scene
func remove_node(params):
    print("Removing node from scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Get the node path to remove
    var node_path = params.node_path
    if debug_mode:
        print("Node path: " + node_path)
    
    # Cannot remove the root node
    if node_path == "root":
        printerr("Cannot remove the root node")
        quit(1)
    
    var target_node = scene_root.get_node(node_path.replace("root/", ""))
    if not target_node:
        printerr("Target node not found: " + node_path)
        quit(1)
    
    if debug_mode:
        print("Target node found: " + target_node.name)
    
    # Get the parent node to remove the child from
    var parent_node = target_node.get_parent()
    if not parent_node:
        printerr("Target node has no parent: " + node_path)
        quit(1)
    
    if debug_mode:
        print("Parent node: " + parent_node.name)
        print("Removing node from parent")
    
    # Remove the node from its parent
    parent_node.remove_child(target_node)
    target_node.queue_free()
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + absolute_scene_path)
        var save_error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(save_error) + " (OK=" + str(OK) + ")")
        if save_error == OK:
            if debug_mode:
                var file_check_after = FileAccess.file_exists(absolute_scene_path)
                print("File exists check after save: " + str(file_check_after))
                if file_check_after:
                    print("Node '" + node_path + "' removed successfully")
                else:
                    printerr("File reported as saved but does not exist at: " + absolute_scene_path)
            else:
                print("Node '" + node_path + "' removed successfully")
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# Load a sprite into a Sprite2D node
func load_sprite(params):
    print("Loading sprite into scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Ensure the texture path starts with res:// for Godot's resource system
    var full_texture_path = params.texture_path
    if not full_texture_path.begins_with("res://"):
        full_texture_path = "res://" + full_texture_path
    
    if debug_mode:
        print("Full texture path (with res://): " + full_texture_path)
    
    # Load the scene
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Find the sprite node
    var node_path = params.node_path
    if debug_mode:
        print("Original node path: " + node_path)
    
    if node_path.begins_with("root/"):
        node_path = node_path.replace("root/", "")
        if debug_mode:
            print("Node path after removing 'root/' prefix: " + node_path)
    
    var sprite_node = null
    if node_path == "":
        # If no node path, assume root is the sprite
        sprite_node = scene_root
        if debug_mode:
            print("Using root node as sprite node")
    else:
        sprite_node = scene_root.get_node(node_path)
        if sprite_node and debug_mode:
            print("Found sprite node: " + sprite_node.name)
    
    if not sprite_node:
        printerr("Node not found: " + params.node_path)
        quit(1)
    
    # Check if the node is a Sprite2D or compatible type
    if debug_mode:
        print("Node class: " + sprite_node.get_class())
    if not (sprite_node is Sprite2D or sprite_node is Sprite3D or sprite_node is TextureRect):
        printerr("Node is not a sprite-compatible type: " + sprite_node.get_class())
        quit(1)
    
    # Load the texture
    if debug_mode:
        print("Loading texture from: " + full_texture_path)
    var texture = load(full_texture_path)
    if not texture:
        printerr("Failed to load texture: " + full_texture_path)
        quit(1)
    
    if debug_mode:
        print("Texture loaded successfully")
    
    # Set the texture on the sprite
    if sprite_node is Sprite2D or sprite_node is Sprite3D:
        sprite_node.texture = texture
        if debug_mode:
            print("Set texture on Sprite2D/Sprite3D node")
    elif sprite_node is TextureRect:
        sprite_node.texture = texture
        if debug_mode:
            print("Set texture on TextureRect node")
    
    # Save the modified scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + full_scene_path)
        var error = ResourceSaver.save(packed_scene, full_scene_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually updated
            if debug_mode:
                var file_check_after = FileAccess.file_exists(full_scene_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("Sprite loaded successfully with texture: " + full_texture_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(full_scene_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + full_scene_path)
            else:
                print("Sprite loaded successfully with texture: " + full_texture_path)
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Export a scene as a MeshLibrary resource
func export_mesh_library(params):
    print("Exporting MeshLibrary from scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Ensure the output path starts with res:// for Godot's resource system
    var full_output_path = params.output_path
    if not full_output_path.begins_with("res://"):
        full_output_path = "res://" + full_output_path
    
    if debug_mode:
        print("Full output path (with res://): " + full_output_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Load the scene
    if debug_mode:
        print("Loading scene from: " + full_scene_path)
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Create a new MeshLibrary
    var mesh_library = MeshLibrary.new()
    if debug_mode:
        print("Created new MeshLibrary")
    
    # Get mesh item names if provided
    var mesh_item_names = params.mesh_item_names if params.has("mesh_item_names") else []
    var use_specific_items = mesh_item_names.size() > 0
    
    if debug_mode:
        if use_specific_items:
            print("Using specific mesh items: " + str(mesh_item_names))
        else:
            print("Using all mesh items in the scene")
    
    # Process all child nodes
    var item_id = 0
    if debug_mode:
        print("Processing child nodes...")
    
    for child in scene_root.get_children():
        if debug_mode:
            print("Checking child node: " + child.name)
        
        # Skip if not using all items and this item is not in the list
        if use_specific_items and not (child.name in mesh_item_names):
            if debug_mode:
                print("Skipping node " + child.name + " (not in specified items list)")
            continue
            
        # Check if the child has a mesh
        var mesh_instance = null
        if child is MeshInstance3D:
            mesh_instance = child
            if debug_mode:
                print("Node " + child.name + " is a MeshInstance3D")
        else:
            # Try to find a MeshInstance3D in the child's descendants
            if debug_mode:
                print("Searching for MeshInstance3D in descendants of " + child.name)
            for descendant in child.get_children():
                if descendant is MeshInstance3D:
                    mesh_instance = descendant
                    if debug_mode:
                        print("Found MeshInstance3D in descendant: " + descendant.name)
                    break
        
        if mesh_instance and mesh_instance.mesh:
            if debug_mode:
                print("Adding mesh: " + child.name)
            
            # Add the mesh to the library
            mesh_library.create_item(item_id)
            mesh_library.set_item_name(item_id, child.name)
            mesh_library.set_item_mesh(item_id, mesh_instance.mesh)
            if debug_mode:
                print("Added mesh to library with ID: " + str(item_id))
            
            # Add collision shape if available
            var collision_added = false
            for collision_child in child.get_children():
                if collision_child is CollisionShape3D and collision_child.shape:
                    mesh_library.set_item_shapes(item_id, [collision_child.shape])
                    if debug_mode:
                        print("Added collision shape from: " + collision_child.name)
                    collision_added = true
                    break
            
            if debug_mode and not collision_added:
                print("No collision shape found for mesh: " + child.name)
            
            # Add preview if available
            if mesh_instance.mesh:
                mesh_library.set_item_preview(item_id, mesh_instance.mesh)
                if debug_mode:
                    print("Added preview for mesh: " + child.name)
            
            item_id += 1
        elif debug_mode:
            print("Node " + child.name + " has no valid mesh")
    
    if debug_mode:
        print("Processed " + str(item_id) + " meshes")
    
    # Create directory if it doesn't exist
    var dir = DirAccess.open("res://")
    if dir == null:
        printerr("Failed to open res:// directory")
        printerr("DirAccess error: " + str(DirAccess.get_open_error()))
        quit(1)
        
    var output_dir = full_output_path.get_base_dir()
    if debug_mode:
        print("Output directory: " + output_dir)
    
    if output_dir != "res://" and not dir.dir_exists(output_dir.substr(6)):  # Remove "res://" prefix
        if debug_mode:
            print("Creating directory: " + output_dir)
        var error = dir.make_dir_recursive(output_dir.substr(6))  # Remove "res://" prefix
        if error != OK:
            printerr("Failed to create directory: " + output_dir + ", error: " + str(error))
            quit(1)
    
    # Save the mesh library
    if item_id > 0:
        if debug_mode:
            print("Saving MeshLibrary to: " + full_output_path)
        var error = ResourceSaver.save(mesh_library, full_output_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually created
            if debug_mode:
                var file_check_after = FileAccess.file_exists(full_output_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("MeshLibrary exported successfully with " + str(item_id) + " items to: " + full_output_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(full_output_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + full_output_path)
            else:
                print("MeshLibrary exported successfully with " + str(item_id) + " items to: " + full_output_path)
        else:
            printerr("Failed to save MeshLibrary: " + str(error))
    else:
        printerr("No valid meshes found in the scene")

# Find files with a specific extension recursively
func find_files(path, extension):
    var files = []
    var dir = DirAccess.open(path)
    
    if dir:
        dir.list_dir_begin()
        var file_name = dir.get_next()
        
        while file_name != "":
            if dir.current_is_dir() and not file_name.begins_with("."):
                files.append_array(find_files(path + file_name + "/", extension))
            elif file_name.ends_with(extension):
                files.append(path + file_name)
            
            file_name = dir.get_next()
    
    return files

# Get UID for a specific file
func get_uid(params):
    if not params.has("file_path"):
        printerr("File path is required")
        quit(1)
    
    # Ensure the file path starts with res:// for Godot's resource system
    var file_path = params.file_path
    if not file_path.begins_with("res://"):
        file_path = "res://" + file_path
    
    print("Getting UID for file: " + file_path)
    if debug_mode:
        print("Full file path (with res://): " + file_path)
    
    # Get the absolute path for reference
    var absolute_path = ProjectSettings.globalize_path(file_path)
    if debug_mode:
        print("Absolute file path: " + absolute_path)
    
    # Ensure the file exists
    var file_check = FileAccess.file_exists(file_path)
    if debug_mode:
        print("File exists check: " + str(file_check))
    
    if not file_check:
        printerr("File does not exist at: " + file_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Check if the UID file exists
    var uid_path = file_path + ".uid"
    if debug_mode:
        print("UID file path: " + uid_path)
    
    var uid_check = FileAccess.file_exists(uid_path)
    if debug_mode:
        print("UID file exists check: " + str(uid_check))
    
    var f = FileAccess.open(uid_path, FileAccess.READ)
    
    if f:
        # Read the UID content
        var uid_content = f.get_as_text()
        f.close()
        if debug_mode:
            print("UID content read successfully")
        
        # Return the UID content
        var result = {
            "file": file_path,
            "absolutePath": absolute_path,
            "uid": uid_content.strip_edges(),
            "exists": true
        }
        if debug_mode:
            print("UID result: " + JSON.stringify(result))
        print(JSON.stringify(result))
    else:
        if debug_mode:
            print("UID file does not exist or could not be opened")
        
        # UID file doesn't exist
        var result = {
            "file": file_path,
            "absolutePath": absolute_path,
            "exists": false,
            "message": "UID file does not exist for this file. Use resave_resources to generate UIDs."
        }
        if debug_mode:
            print("UID result: " + JSON.stringify(result))
        print(JSON.stringify(result))

# Resave all resources to update UID references
func resave_resources(params):
    print("Resaving all resources to update UID references...")
    
    # Get project path if provided
    var project_path = "res://"
    if params.has("project_path"):
        project_path = params.project_path
        if not project_path.begins_with("res://"):
            project_path = "res://" + project_path
        if not project_path.ends_with("/"):
            project_path += "/"
    
    if debug_mode:
        print("Using project path: " + project_path)
    
    # Get all .tscn files
    if debug_mode:
        print("Searching for scene files in: " + project_path)
    var scenes = find_files(project_path, ".tscn")
    if debug_mode:
        print("Found " + str(scenes.size()) + " scenes")
    
    # Resave each scene
    var success_count = 0
    var error_count = 0
    
    for scene_path in scenes:
        if debug_mode:
            print("Processing scene: " + scene_path)
        
        # Check if the scene file exists
        var file_check = FileAccess.file_exists(scene_path)
        if debug_mode:
            print("Scene file exists check: " + str(file_check))
        
        if not file_check:
            printerr("Scene file does not exist at: " + scene_path)
            error_count += 1
            continue
        
        # Load the scene
        var scene = load(scene_path)
        if scene:
            if debug_mode:
                print("Scene loaded successfully, saving...")
            var error = ResourceSaver.save(scene, scene_path)
            if debug_mode:
                print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
            
            if error == OK:
                success_count += 1
                if debug_mode:
                    print("Scene saved successfully: " + scene_path)
                
                    # Verify the file was actually updated
                    var file_check_after = FileAccess.file_exists(scene_path)
                    print("File exists check after save: " + str(file_check_after))
                
                    if not file_check_after:
                        printerr("File reported as saved but does not exist at: " + scene_path)
            else:
                error_count += 1
                printerr("Failed to save: " + scene_path + ", error: " + str(error))
        else:
            error_count += 1
            printerr("Failed to load: " + scene_path)
    
    # Get all .gd and .shader files
    if debug_mode:
        print("Searching for script and shader files in: " + project_path)
    var scripts = find_files(project_path, ".gd") + find_files(project_path, ".shader") + find_files(project_path, ".gdshader")
    if debug_mode:
        print("Found " + str(scripts.size()) + " scripts/shaders")
    
    # Check for missing .uid files
    var missing_uids = 0
    var generated_uids = 0
    
    for script_path in scripts:
        if debug_mode:
            print("Checking UID for: " + script_path)
        var uid_path = script_path + ".uid"
        
        var uid_check = FileAccess.file_exists(uid_path)
        if debug_mode:
            print("UID file exists check: " + str(uid_check))
        
        var f = FileAccess.open(uid_path, FileAccess.READ)
        if not f:
            missing_uids += 1
            if debug_mode:
                print("Missing UID file for: " + script_path + ", generating...")
            
            # Force a save to generate UID
            var res = load(script_path)
            if res:
                var error = ResourceSaver.save(res, script_path)
                if debug_mode:
                    print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
                
                if error == OK:
                    generated_uids += 1
                    if debug_mode:
                        print("Generated UID for: " + script_path)
                    
                        # Verify the UID file was actually created
                        var uid_check_after = FileAccess.file_exists(uid_path)
                        print("UID file exists check after save: " + str(uid_check_after))
                    
                        if not uid_check_after:
                            printerr("UID file reported as generated but does not exist at: " + uid_path)
                else:
                    printerr("Failed to generate UID for: " + script_path + ", error: " + str(error))
            else:
                printerr("Failed to load resource: " + script_path)
        elif debug_mode:
            print("UID file already exists for: " + script_path)
    
    if debug_mode:
        print("Summary:")
        print("- Scenes processed: " + str(scenes.size()))
        print("- Scenes successfully saved: " + str(success_count))
        print("- Scenes with errors: " + str(error_count))
        print("- Scripts/shaders missing UIDs: " + str(missing_uids))
        print("- UIDs successfully generated: " + str(generated_uids))
    print("Resave operation complete")

# Save changes to a scene file
func save_scene(params):
    print("Saving scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Load the scene
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Determine save path
    var save_path = params.new_path if params.has("new_path") else full_scene_path
    if params.has("new_path") and not save_path.begins_with("res://"):
        save_path = "res://" + save_path
    
    if debug_mode:
        print("Save path: " + save_path)
    
    # Create directory if it doesn't exist
    if params.has("new_path"):
        var dir = DirAccess.open("res://")
        if dir == null:
            printerr("Failed to open res:// directory")
            printerr("DirAccess error: " + str(DirAccess.get_open_error()))
            quit(1)
            
        var scene_dir = save_path.get_base_dir()
        if debug_mode:
            print("Scene directory: " + scene_dir)
        
        if scene_dir != "res://" and not dir.dir_exists(scene_dir.substr(6)):  # Remove "res://" prefix
            if debug_mode:
                print("Creating directory: " + scene_dir)
            var error = dir.make_dir_recursive(scene_dir.substr(6))  # Remove "res://" prefix
            if error != OK:
                printerr("Failed to create directory: " + scene_dir + ", error: " + str(error))
                quit(1)
    
    # Create a packed scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + save_path)
        var error = ResourceSaver.save(packed_scene, save_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually created/updated
            if debug_mode:
                var file_check_after = FileAccess.file_exists(save_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("Scene saved successfully to: " + save_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(save_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + save_path)
            else:
                print("Scene saved successfully to: " + save_path)
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# =============================================================================
# ANIMATION OPERATIONS
# =============================================================================

# Add an animation to an AnimationPlayer node
func add_animation(params):
    print("Adding animation to scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path

    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist: " + full_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()

    # Find the AnimationPlayer node
    var player_path = params.player_node_path
    if player_path.begins_with("root/"):
        player_path = player_path.replace("root/", "")

    var anim_player = null
    if player_path == "" or player_path == "root":
        anim_player = scene_root
    else:
        anim_player = scene_root.get_node(player_path)

    if not anim_player or not anim_player is AnimationPlayer:
        printerr("AnimationPlayer not found at: " + params.player_node_path)
        quit(1)

    if debug_mode:
        print("Found AnimationPlayer: " + anim_player.name)

    # Create new Animation
    var animation = Animation.new()
    animation.length = params.length if params.has("length") else 1.0

    if params.has("loop") and params.loop:
        animation.loop_mode = Animation.LOOP_LINEAR

    # Get or create the default animation library
    var library_name = ""
    var library: AnimationLibrary

    if anim_player.has_animation_library(library_name):
        library = anim_player.get_animation_library(library_name)
    else:
        library = AnimationLibrary.new()
        anim_player.add_animation_library(library_name, library)

    # Add the animation to the library
    var anim_name = params.animation_name
    var error = library.add_animation(anim_name, animation)

    if error != OK:
        printerr("Failed to add animation: " + str(error))
        quit(1)

    # Save the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)

    if result == OK:
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if save_error == OK:
            print("Animation '" + anim_name + "' added successfully (length: " + str(animation.length) + "s)")
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# Add a track to an animation
func add_animation_track(params):
    print("Adding animation track to scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path

    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist: " + full_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()

    # Find the AnimationPlayer node
    var player_path = params.player_node_path
    if player_path.begins_with("root/"):
        player_path = player_path.replace("root/", "")

    var anim_player = null
    if player_path == "" or player_path == "root":
        anim_player = scene_root
    else:
        anim_player = scene_root.get_node(player_path)

    if not anim_player or not anim_player is AnimationPlayer:
        printerr("AnimationPlayer not found at: " + params.player_node_path)
        quit(1)

    # Get the animation
    var anim_name = params.animation_name
    if not anim_player.has_animation(anim_name):
        printerr("Animation not found: " + anim_name)
        quit(1)

    var animation = anim_player.get_animation(anim_name)

    # Determine track type
    var track_type = Animation.TYPE_VALUE  # Default
    match params.track_type:
        "value":
            track_type = Animation.TYPE_VALUE
        "position_2d", "position_3d":
            track_type = Animation.TYPE_POSITION_3D
        "rotation_2d", "rotation_3d":
            track_type = Animation.TYPE_ROTATION_3D
        "scale_2d", "scale_3d":
            track_type = Animation.TYPE_SCALE_3D
        "method":
            track_type = Animation.TYPE_METHOD
        "bezier":
            track_type = Animation.TYPE_BEZIER
        "audio":
            track_type = Animation.TYPE_AUDIO
        "animation":
            track_type = Animation.TYPE_ANIMATION

    # Create the track
    var track_idx = animation.add_track(track_type)

    # Set track path
    var node_path = params.node_path
    if params.has("property") and params.property:
        node_path = node_path + ":" + params.property

    animation.track_set_path(track_idx, NodePath(node_path))

    if debug_mode:
        print("Added track " + str(track_idx) + " of type " + params.track_type + " for " + node_path)

    # Save the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)

    if result == OK:
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if save_error == OK:
            print("Track added successfully to animation '" + anim_name + "' (index: " + str(track_idx) + ")")
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# Set a keyframe in an animation track
func set_keyframe(params):
    print("Setting keyframe in scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path

    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist: " + full_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()

    # Find the AnimationPlayer node
    var player_path = params.player_node_path
    if player_path.begins_with("root/"):
        player_path = player_path.replace("root/", "")

    var anim_player = null
    if player_path == "" or player_path == "root":
        anim_player = scene_root
    else:
        anim_player = scene_root.get_node(player_path)

    if not anim_player or not anim_player is AnimationPlayer:
        printerr("AnimationPlayer not found at: " + params.player_node_path)
        quit(1)

    # Get the animation
    var anim_name = params.animation_name
    if not anim_player.has_animation(anim_name):
        printerr("Animation not found: " + anim_name)
        quit(1)

    var animation = anim_player.get_animation(anim_name)

    # Validate track index
    var track_idx = int(params.track_index)
    if track_idx < 0 or track_idx >= animation.get_track_count():
        printerr("Invalid track index: " + str(track_idx))
        quit(1)

    # Insert the keyframe
    var time = float(params.time)
    var value = params.value

    # Convert value if needed (handle Vector2, Vector3, Color from dict)
    if typeof(value) == TYPE_DICTIONARY:
        if value.has("x") and value.has("y"):
            if value.has("z"):
                value = Vector3(value.x, value.y, value.z)
            else:
                value = Vector2(value.x, value.y)
        elif value.has("r") and value.has("g") and value.has("b"):
            var a = value.a if value.has("a") else 1.0
            value = Color(value.r, value.g, value.b, a)

    var key_idx = animation.track_insert_key(track_idx, time, value)

    # Set transition and easing if provided
    if params.has("transition"):
        animation.track_set_key_transition(track_idx, key_idx, params.transition)

    if debug_mode:
        print("Inserted keyframe at time " + str(time) + " with value " + str(value))

    # Save the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)

    if result == OK:
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if save_error == OK:
            print("Keyframe set successfully at " + str(time) + "s in track " + str(track_idx))
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# =============================================================================
# PHYSICS OPERATIONS
# =============================================================================

# Create a collision shape with specified shape type
func create_collision_shape(params):
    print("Creating collision shape in scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path

    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist: " + full_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()

    # Find parent node
    var parent_path = params.parent_node_path
    if parent_path.begins_with("root/"):
        parent_path = parent_path.replace("root/", "")

    var parent = scene_root
    if parent_path != "" and parent_path != "root":
        parent = scene_root.get_node(parent_path)

    if not parent:
        printerr("Parent node not found: " + params.parent_node_path)
        quit(1)

    # Determine if 2D or 3D
    var is_3d = params.is_3d if params.has("is_3d") else false

    # Create the collision shape node
    var collision_shape
    if is_3d:
        collision_shape = CollisionShape3D.new()
    else:
        collision_shape = CollisionShape2D.new()

    collision_shape.name = params.node_name

    # Create the shape based on shape_type
    var shape
    var shape_params = params.shape_params if params.has("shape_params") else {}

    if is_3d:
        match params.shape_type:
            "box":
                shape = BoxShape3D.new()
                if shape_params.has("size"):
                    var s = shape_params.size
                    shape.size = Vector3(s.x, s.y, s.z) if s.has("z") else Vector3(s.x, s.y, 1)
            "sphere":
                shape = SphereShape3D.new()
                if shape_params.has("radius"):
                    shape.radius = shape_params.radius
            "capsule":
                shape = CapsuleShape3D.new()
                if shape_params.has("radius"):
                    shape.radius = shape_params.radius
                if shape_params.has("height"):
                    shape.height = shape_params.height
            "cylinder":
                shape = CylinderShape3D.new()
                if shape_params.has("radius"):
                    shape.radius = shape_params.radius
                if shape_params.has("height"):
                    shape.height = shape_params.height
            "convex":
                shape = ConvexPolygonShape3D.new()
            _:
                printerr("Unknown 3D shape type: " + params.shape_type)
                quit(1)
    else:
        match params.shape_type:
            "rectangle":
                shape = RectangleShape2D.new()
                if shape_params.has("size"):
                    var s = shape_params.size
                    shape.size = Vector2(s.x, s.y)
            "circle":
                shape = CircleShape2D.new()
                if shape_params.has("radius"):
                    shape.radius = shape_params.radius
            "capsule":
                shape = CapsuleShape2D.new()
                if shape_params.has("radius"):
                    shape.radius = shape_params.radius
                if shape_params.has("height"):
                    shape.height = shape_params.height
            "polygon":
                shape = ConvexPolygonShape2D.new()
                if shape_params.has("points"):
                    var points = PackedVector2Array()
                    for p in shape_params.points:
                        points.append(Vector2(p.x, p.y))
                    shape.points = points
            _:
                printerr("Unknown 2D shape type: " + params.shape_type)
                quit(1)

    collision_shape.shape = shape

    # Add to parent
    parent.add_child(collision_shape)
    collision_shape.owner = scene_root

    if debug_mode:
        print("Created " + ("3D" if is_3d else "2D") + " collision shape: " + params.node_name)

    # Save the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)

    if result == OK:
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if save_error == OK:
            print("CollisionShape created successfully: " + params.node_name + " (" + params.shape_type + ")")
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# Set a project setting
func set_project_setting(params):
    print("Setting project setting: " + params.setting)

    var setting_path = params.setting
    var value = params.value

    ProjectSettings.set_setting(setting_path, value)

    # Save project settings
    var error = ProjectSettings.save()

    if error == OK:
        print("Project setting '" + setting_path + "' set to: " + str(value))
    else:
        printerr("Failed to save project settings: " + str(error))
        quit(1)

# =============================================================================
# TILEMAP OPERATIONS
# =============================================================================

# Create a TileSet resource
func create_tileset(params):
    print("Creating TileSet: " + params.tileset_path)

    var tileset_path = params.tileset_path
    if not tileset_path.begins_with("res://"):
        tileset_path = "res://" + tileset_path

    # Create new TileSet
    var tileset = TileSet.new()

    # Set tile size
    var tile_size = params.tile_size
    tileset.tile_size = Vector2i(int(tile_size.x), int(tile_size.y))

    # Add texture source if provided
    if params.has("texture_path") and params.texture_path:
        var texture_path = params.texture_path
        if not texture_path.begins_with("res://"):
            texture_path = "res://" + texture_path

        var texture = load(texture_path)
        if texture:
            var source = TileSetAtlasSource.new()
            source.texture = texture
            source.texture_region_size = tileset.tile_size
            tileset.add_source(source)
            if debug_mode:
                print("Added texture source from: " + texture_path)
        else:
            printerr("Warning: Could not load texture: " + texture_path)

    # Ensure directory exists
    var dir_path = tileset_path.get_base_dir()
    if dir_path != "res://":
        var dir = DirAccess.open("res://")
        if dir:
            var relative_dir = dir_path.substr(6)  # Remove "res://"
            if not dir.dir_exists(relative_dir):
                dir.make_dir_recursive(relative_dir)

    # Save the TileSet
    var error = ResourceSaver.save(tileset, tileset_path)

    if error == OK:
        print("TileSet created successfully at: " + tileset_path)
        print("Tile size: " + str(tileset.tile_size))
    else:
        printerr("Failed to save TileSet: " + str(error))
        quit(1)

# Set a single tile in a TileMapLayer
func set_tile(params):
    print("Setting tile in scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path

    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist: " + full_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()

    # Find the TileMapLayer node
    var tilemap_path = params.tilemap_node_path
    if tilemap_path.begins_with("root/"):
        tilemap_path = tilemap_path.replace("root/", "")

    var tilemap = null
    if tilemap_path == "" or tilemap_path == "root":
        tilemap = scene_root
    else:
        tilemap = scene_root.get_node(tilemap_path)

    if not tilemap or not tilemap is TileMapLayer:
        printerr("TileMapLayer not found at: " + params.tilemap_node_path)
        quit(1)

    # Set the tile
    var pos = Vector2i(int(params.position.x), int(params.position.y))
    var source_id = int(params.source_id)
    var atlas_coords = Vector2i(int(params.atlas_coords.x), int(params.atlas_coords.y))
    var alt_tile = int(params.alternative_tile) if params.has("alternative_tile") else 0

    tilemap.set_cell(pos, source_id, atlas_coords, alt_tile)

    if debug_mode:
        print("Set tile at " + str(pos) + " to source " + str(source_id) + ", atlas " + str(atlas_coords))

    # Save the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)

    if result == OK:
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if save_error == OK:
            print("Tile set successfully at position " + str(pos))
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# Paint multiple tiles in a TileMapLayer
func paint_tiles(params):
    print("Painting tiles in scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path

    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist: " + full_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()

    # Find the TileMapLayer node
    var tilemap_path = params.tilemap_node_path
    if tilemap_path.begins_with("root/"):
        tilemap_path = tilemap_path.replace("root/", "")

    var tilemap = null
    if tilemap_path == "" or tilemap_path == "root":
        tilemap = scene_root
    else:
        tilemap = scene_root.get_node(tilemap_path)

    if not tilemap or not tilemap is TileMapLayer:
        printerr("TileMapLayer not found at: " + params.tilemap_node_path)
        quit(1)

    # Paint all tiles
    var tiles = params.tiles
    var count = 0

    for tile in tiles:
        var pos = Vector2i(int(tile.position.x), int(tile.position.y))
        var source_id = int(tile.source_id)
        var atlas_coords = Vector2i(int(tile.atlas_coords.x), int(tile.atlas_coords.y))
        var alt_tile = int(tile.alternative_tile) if tile.has("alternative_tile") else 0

        tilemap.set_cell(pos, source_id, atlas_coords, alt_tile)
        count += 1

    if debug_mode:
        print("Painted " + str(count) + " tiles")

    # Save the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)

    if result == OK:
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if save_error == OK:
            print("Successfully painted " + str(count) + " tiles")
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# =============================================================================
# AUDIO OPERATIONS
# =============================================================================

# Create an audio bus
func create_audio_bus(params):
    print("Creating audio bus: " + params.bus_name)

    # Add new bus
    var bus_count = AudioServer.bus_count
    AudioServer.add_bus()
    var new_bus_idx = bus_count  # The new bus is at the end

    # Set bus name
    AudioServer.set_bus_name(new_bus_idx, params.bus_name)

    # Set parent bus (send)
    var parent_bus = params.parent_bus if params.has("parent_bus") else "Master"
    var parent_idx = AudioServer.get_bus_index(parent_bus)
    if parent_idx >= 0:
        AudioServer.set_bus_send(new_bus_idx, parent_bus)

    # Set volume
    if params.has("volume"):
        AudioServer.set_bus_volume_db(new_bus_idx, params.volume)

    # Set solo/mute
    if params.has("solo"):
        AudioServer.set_bus_solo(new_bus_idx, params.solo)
    if params.has("mute"):
        AudioServer.set_bus_mute(new_bus_idx, params.mute)

    # Save the bus layout
    var bus_layout = AudioServer.generate_bus_layout()
    var layout_path = "res://default_bus_layout.tres"
    var error = ResourceSaver.save(bus_layout, layout_path)

    if error == OK:
        print("Audio bus '" + params.bus_name + "' created successfully")
        print("Parent bus: " + parent_bus)
    else:
        printerr("Failed to save bus layout: " + str(error))
        quit(1)

# Add an effect to an audio bus
func add_audio_effect(params):
    print("Adding audio effect to bus: " + params.bus_name)

    # Find the bus
    var bus_idx = AudioServer.get_bus_index(params.bus_name)
    if bus_idx < 0:
        printerr("Audio bus not found: " + params.bus_name)
        quit(1)

    # Create the effect based on type
    var effect = null
    var effect_class = params.effect_class

    match effect_class:
        "AudioEffectAmplify":
            effect = AudioEffectAmplify.new()
        "AudioEffectBandLimitFilter":
            effect = AudioEffectBandLimitFilter.new()
        "AudioEffectBandPassFilter":
            effect = AudioEffectBandPassFilter.new()
        "AudioEffectChorus":
            effect = AudioEffectChorus.new()
        "AudioEffectCompressor":
            effect = AudioEffectCompressor.new()
        "AudioEffectDelay":
            effect = AudioEffectDelay.new()
        "AudioEffectDistortion":
            effect = AudioEffectDistortion.new()
        "AudioEffectEQ6":
            effect = AudioEffectEQ6.new()
        "AudioEffectEQ10":
            effect = AudioEffectEQ10.new()
        "AudioEffectEQ21":
            effect = AudioEffectEQ21.new()
        "AudioEffectFilter":
            effect = AudioEffectFilter.new()
        "AudioEffectHighPassFilter":
            effect = AudioEffectHighPassFilter.new()
        "AudioEffectHighShelfFilter":
            effect = AudioEffectHighShelfFilter.new()
        "AudioEffectLimiter":
            effect = AudioEffectLimiter.new()
        "AudioEffectLowPassFilter":
            effect = AudioEffectLowPassFilter.new()
        "AudioEffectLowShelfFilter":
            effect = AudioEffectLowShelfFilter.new()
        "AudioEffectNotchFilter":
            effect = AudioEffectNotchFilter.new()
        "AudioEffectPanner":
            effect = AudioEffectPanner.new()
        "AudioEffectPhaser":
            effect = AudioEffectPhaser.new()
        "AudioEffectPitchShift":
            effect = AudioEffectPitchShift.new()
        "AudioEffectRecord":
            effect = AudioEffectRecord.new()
        "AudioEffectReverb":
            effect = AudioEffectReverb.new()
        "AudioEffectSpectrumAnalyzer":
            effect = AudioEffectSpectrumAnalyzer.new()
        "AudioEffectStereoEnhance":
            effect = AudioEffectStereoEnhance.new()
        _:
            printerr("Unknown audio effect type: " + effect_class)
            quit(1)

    # Apply effect parameters if provided
    if params.has("effect_params"):
        for param_name in params.effect_params:
            effect.set(param_name, params.effect_params[param_name])

    # Add the effect to the bus
    AudioServer.add_bus_effect(bus_idx, effect)

    # Save the bus layout
    var bus_layout = AudioServer.generate_bus_layout()
    var layout_path = "res://default_bus_layout.tres"
    var error = ResourceSaver.save(bus_layout, layout_path)

    if error == OK:
        print("Audio effect '" + effect_class + "' added to bus '" + params.bus_name + "'")
    else:
        printerr("Failed to save bus layout: " + str(error))
        quit(1)

# =============================================================================
# NAVIGATION OPERATIONS
# =============================================================================

# Create a NavigationRegion2D or NavigationRegion3D node
func create_navigation_region(params):
    print("Creating navigation region in scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path

    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist: " + full_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()

    # Find parent node
    var parent_path = params.parent_node_path if params.has("parent_node_path") else ""
    if parent_path.begins_with("root/"):
        parent_path = parent_path.replace("root/", "")

    var parent = scene_root
    if parent_path != "" and parent_path != "root":
        parent = scene_root.get_node(parent_path)

    if not parent:
        printerr("Parent node not found: " + str(params.parent_node_path))
        quit(1)

    # Create the navigation region node
    var is_3d = params.is_3d if params.has("is_3d") else false
    var nav_region

    if is_3d:
        nav_region = NavigationRegion3D.new()
    else:
        nav_region = NavigationRegion2D.new()

    nav_region.name = params.node_name

    # Load navigation mesh if provided
    if params.has("navigation_mesh_path") and params.navigation_mesh_path:
        var mesh_path = params.navigation_mesh_path
        if not mesh_path.begins_with("res://"):
            mesh_path = "res://" + mesh_path
        var nav_mesh = load(mesh_path)
        if nav_mesh:
            if is_3d:
                nav_region.navigation_mesh = nav_mesh
            else:
                nav_region.navigation_polygon = nav_mesh

    # Add to parent
    parent.add_child(nav_region)
    nav_region.owner = scene_root

    if debug_mode:
        print("Created NavigationRegion" + ("3D" if is_3d else "2D") + ": " + params.node_name)

    # Save the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)

    if result == OK:
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if save_error == OK:
            print("NavigationRegion created successfully: " + params.node_name)
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# =============================================================================
# PARTICLES OPERATIONS
# =============================================================================

# Create a GPUParticles2D or GPUParticles3D node
func create_gpu_particles(params):
    print("Creating GPU particles in scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path

    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist: " + full_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()

    # Find parent node
    var parent_path = params.parent_node_path if params.has("parent_node_path") else ""
    if parent_path.begins_with("root/"):
        parent_path = parent_path.replace("root/", "")

    var parent = scene_root
    if parent_path != "" and parent_path != "root":
        parent = scene_root.get_node(parent_path)

    if not parent:
        printerr("Parent node not found: " + str(params.parent_node_path))
        quit(1)

    # Create the particles node
    var is_3d = params.is_3d if params.has("is_3d") else false
    var particles

    if is_3d:
        particles = GPUParticles3D.new()
    else:
        particles = GPUParticles2D.new()

    particles.name = params.node_name

    # Set properties
    if params.has("amount"):
        particles.amount = int(params.amount)

    if params.has("lifetime"):
        particles.lifetime = float(params.lifetime)

    if params.has("one_shot"):
        particles.one_shot = params.one_shot

    if params.has("preprocess"):
        particles.preprocess = float(params.preprocess)

    if params.has("emitting"):
        particles.emitting = params.emitting

    # Load process material if provided
    if params.has("material_path") and params.material_path:
        var mat_path = params.material_path
        if not mat_path.begins_with("res://"):
            mat_path = "res://" + mat_path
        var material = load(mat_path)
        if material:
            particles.process_material = material

    # Add to parent
    parent.add_child(particles)
    particles.owner = scene_root

    if debug_mode:
        print("Created GPUParticles" + ("3D" if is_3d else "2D") + ": " + params.node_name)

    # Save the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)

    if result == OK:
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if save_error == OK:
            print("GPUParticles created successfully: " + params.node_name + " (amount: " + str(particles.amount) + ")")
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# =============================================================================
# UI OPERATIONS
# =============================================================================

# Create a UI Container node
func create_ui_container(params):
    print("Creating UI container in scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path

    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist: " + full_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()

    # Find parent node
    var parent_path = params.parent_node_path if params.has("parent_node_path") else ""
    if parent_path.begins_with("root/"):
        parent_path = parent_path.replace("root/", "")

    var parent = scene_root
    if parent_path != "" and parent_path != "root":
        parent = scene_root.get_node(parent_path)

    if not parent:
        printerr("Parent node not found: " + str(params.parent_node_path))
        quit(1)

    # Create the container node
    var container = instantiate_class(params.node_type)
    if not container:
        printerr("Failed to create container of type: " + params.node_type)
        quit(1)

    container.name = params.node_name

    # Set columns for GridContainer
    if params.has("columns") and params.node_type == "GridContainer":
        container.columns = int(params.columns)

    # Set custom minimum size
    if params.has("custom_minimum_size"):
        var size = params.custom_minimum_size
        container.custom_minimum_size = Vector2(size.x, size.y)

    # Set anchors preset
    if params.has("anchors_preset"):
        match params.anchors_preset:
            "full_rect":
                container.set_anchors_preset(Control.PRESET_FULL_RECT)
            "center":
                container.set_anchors_preset(Control.PRESET_CENTER)
            "top_left":
                container.set_anchors_preset(Control.PRESET_TOP_LEFT)
            "top_right":
                container.set_anchors_preset(Control.PRESET_TOP_RIGHT)
            "bottom_left":
                container.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
            "bottom_right":
                container.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)

    # Add to parent
    parent.add_child(container)
    container.owner = scene_root

    if debug_mode:
        print("Created UI container: " + params.node_name + " (" + params.node_type + ")")

    # Save the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)

    if result == OK:
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if save_error == OK:
            print("UI Container created successfully: " + params.node_name + " (" + params.node_type + ")")
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# Create a UI Control node
func create_control(params):
    print("Creating UI control in scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path

    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist: " + full_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()

    # Find parent node
    var parent_path = params.parent_node_path if params.has("parent_node_path") else ""
    if parent_path.begins_with("root/"):
        parent_path = parent_path.replace("root/", "")

    var parent = scene_root
    if parent_path != "" and parent_path != "root":
        parent = scene_root.get_node(parent_path)

    if not parent:
        printerr("Parent node not found: " + str(params.parent_node_path))
        quit(1)

    # Create the control node
    var control = instantiate_class(params.node_type)
    if not control:
        printerr("Failed to create control of type: " + params.node_type)
        quit(1)

    control.name = params.node_name

    # Set text for appropriate controls
    if params.has("text"):
        if control is Button or control is Label or control is LineEdit or control is TextEdit:
            control.text = params.text

    # Set placeholder text
    if params.has("placeholder_text"):
        if control is LineEdit:
            control.placeholder_text = params.placeholder_text
        elif control is TextEdit:
            control.placeholder_text = params.placeholder_text

    # Set texture for TextureRect
    if params.has("texture_path") and control is TextureRect:
        var tex_path = params.texture_path
        if not tex_path.begins_with("res://"):
            tex_path = "res://" + tex_path
        var texture = load(tex_path)
        if texture:
            control.texture = texture

    # Set color for ColorRect
    if params.has("color") and control is ColorRect:
        var c = params.color
        var a = c.a if c.has("a") else 1.0
        control.color = Color(c.r, c.g, c.b, a)

    # Set range values for Range controls
    if params.has("min_value") and control is Range:
        control.min_value = float(params.min_value)
    if params.has("max_value") and control is Range:
        control.max_value = float(params.max_value)
    if params.has("value") and control is Range:
        control.value = float(params.value)

    # Add to parent
    parent.add_child(control)
    control.owner = scene_root

    if debug_mode:
        print("Created UI control: " + params.node_name + " (" + params.node_type + ")")

    # Save the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)

    if result == OK:
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if save_error == OK:
            print("UI Control created successfully: " + params.node_name + " (" + params.node_type + ")")
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)

# =============================================================================
# LIGHTING OPERATIONS
# =============================================================================

# Create a Light2D or Light3D node
func create_light(params):
    print("Creating light in scene: " + params.scene_path)

    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path

    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist: " + full_scene_path)
        quit(1)

    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)

    var scene_root = scene.instantiate()

    # Find parent node
    var parent_path = params.parent_node_path if params.has("parent_node_path") else ""
    if parent_path.begins_with("root/"):
        parent_path = parent_path.replace("root/", "")

    var parent = scene_root
    if parent_path != "" and parent_path != "root":
        parent = scene_root.get_node(parent_path)

    if not parent:
        printerr("Parent node not found: " + str(params.parent_node_path))
        quit(1)

    # Create the light node
    var light = instantiate_class(params.node_type)
    if not light:
        printerr("Failed to create light of type: " + params.node_type)
        quit(1)

    light.name = params.node_name

    # Set color
    if params.has("color"):
        var c = params.color
        light.light_color = Color(c.r, c.g, c.b)

    # Set energy
    if params.has("energy"):
        light.light_energy = float(params.energy)

    # Set range for OmniLight3D and SpotLight3D
    if params.has("range"):
        if light is OmniLight3D:
            light.omni_range = float(params.range)
        elif light is SpotLight3D:
            light.spot_range = float(params.range)

    # Set spot angle for SpotLight3D
    if params.has("spot_angle") and light is SpotLight3D:
        light.spot_angle = float(params.spot_angle)

    # Set shadow
    if params.has("shadow_enabled"):
        light.shadow_enabled = params.shadow_enabled

    # Set texture for PointLight2D
    if params.has("texture_path") and light is PointLight2D:
        var tex_path = params.texture_path
        if not tex_path.begins_with("res://"):
            tex_path = "res://" + tex_path
        var texture = load(tex_path)
        if texture:
            light.texture = texture

    # Add to parent
    parent.add_child(light)
    light.owner = scene_root

    if debug_mode:
        print("Created light: " + params.node_name + " (" + params.node_type + ")")

    # Save the scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)

    if result == OK:
        var save_error = ResourceSaver.save(packed_scene, full_scene_path)
        if save_error == OK:
            print("Light created successfully: " + params.node_name + " (" + params.node_type + ")")
        else:
            printerr("Failed to save scene: " + str(save_error))
            quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))
        quit(1)
