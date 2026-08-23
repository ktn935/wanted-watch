puts "=== DEBUG pods.rb ==="
puts "cwd: #{Dir.pwd}"
puts "modules/live-activity exists: #{Dir.exist?('modules/live-activity')}"
puts "node_modules/live-activity exists: #{Dir.exist?('node_modules/live-activity')}"
puts "node_modules/live-activity is symlink: #{File.symlink?('node_modules/live-activity')}" if Dir.exist?('node_modules/live-activity')
if Dir.exist?('modules')
  puts "modules/ contents: #{Dir.entries('modules').join(', ')}"
end
resolve_output = `node_modules/.bin/expo-modules-autolinking resolve --platform apple --json 2>&1`
puts "resolve exit status: #{$?.exitstatus}"
has_live_activity = resolve_output.include?("LiveActivity")
puts "resolve output mentions LiveActivity: #{has_live_activity}"
unless has_live_activity
  puts "resolve output (first 2000 chars): #{resolve_output[0, 2000]}"
end
puts "=== END DEBUG pods.rb ==="
