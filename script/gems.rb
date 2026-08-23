#!/usr/bin/env ruby
# frozen_string_literal: true

# Refreshes gem versions in _data/gems.yml from the RubyGems API.
#
#   ruby script/gems.rb           # rewrite the file in place
#   ruby script/gems.rb --check   # report drift, change nothing (exit 1 if stale)
#
# Only `version` is updated. The `description` fields are hand-written and are
# deliberately preserved, because the summaries published on RubyGems are far
# too long for a single-line listing. Anything else in an entry is passed
# through untouched, so adding a field here does not require touching this
# script.
#
# Download counts are intentionally not fetched. RubyGems totals include
# mirrors, CI, and bots, so publishing them would overstate real reach.
#
# This is run by hand rather than on a schedule. A scheduled workflow that
# committed with GITHUB_TOKEN would not trigger the deploy workflow anyway --
# GitHub suppresses workflow-triggered pushes to prevent loops -- so the numbers
# would update in the repository but never reach the site.

require 'json'
require 'net/http'
require 'uri'
require 'yaml'

DATA_FILE = File.expand_path('../_data/gems.yml', __dir__)
API = 'https://rubygems.org/api/v1/gems/%s.json'

def fetch_version(name)
  response = Net::HTTP.get_response(URI(format(API, name)))

  unless response.is_a?(Net::HTTPSuccess)
    warn "  ! #{name}: HTTP #{response.code}, leaving unchanged"
    return nil
  end

  JSON.parse(response.body).fetch('version')
rescue StandardError => e
  warn "  ! #{name}: #{e.class}: #{e.message}, leaving unchanged"
  nil
end

check_only = ARGV.include?('--check')
gems = YAML.load_file(DATA_FILE)
drift = []

gems.each do |gem|
  latest = fetch_version(gem['name'])
  next if latest.nil? || latest == gem['version']

  drift << "#{gem['name']}: #{gem['version']} -> #{latest}"
  gem['version'] = latest unless check_only
end

if drift.empty?
  puts 'All gem versions are current.'
  exit 0
end

puts drift.map { |line| "  #{line}" }

if check_only
  warn "\n#{DATA_FILE} is out of date. Run `ruby script/gems.rb` to update it."
  exit 1
end

# Rewrite by hand rather than dumping the parsed structure. `to_yaml` would
# discard the explanatory header comment and requote every string, producing a
# large and unreviewable diff for what is usually a one-character change.
source = File.read(DATA_FILE)

gems.each do |gem|
  source = source.sub(
    /(^- name: #{Regexp.escape(gem['name'])}\n  version: )"[^"]*"/,
    "\\1\"#{gem['version']}\""
  )
end

File.write(DATA_FILE, source)
puts "\nUpdated #{DATA_FILE}."
