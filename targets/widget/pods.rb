puts "=== DEBUG pods.rb ==="
puts "cwd: #{Dir.pwd}"
["modules/live-activity", "../modules/live-activity", "../../modules/live-activity"].each do |p|
  puts "#{p} exists: #{Dir.exist?(p)}"
end
["node_modules/live-activity", "../node_modules/live-activity", "../../node_modules/live-activity"].each do |p|
  puts "#{p} exists: #{Dir.exist?(p)} (symlink: #{File.symlink?(p)})" if Dir.exist?(p) || File.symlink?(p)
end
project_root = Dir.exist?("../../modules") ? "../.." : (Dir.exist?("../modules") ? ".." : ".")
puts "guessed project_root: #{project_root}"
if Dir.exist?("#{project_root}/modules")
  puts "modules/ contents: #{Dir.entries("#{project_root}/modules").join(', ')}"
end
resolve_output = `cd #{project_root} && node_modules/.bin/expo-modules-autolinking resolve --platform apple --json 2>&1`
puts "resolve exit status: #{$?.exitstatus}"
has_live_activity = resolve_output.include?("LiveActivity")
puts "resolve output mentions LiveActivity: #{has_live_activity}"
unless has_live_activity
  puts "resolve output (first 2000 chars): #{resolve_output[0, 2000]}"
end
puts "=== END DEBUG pods.rb ==="
