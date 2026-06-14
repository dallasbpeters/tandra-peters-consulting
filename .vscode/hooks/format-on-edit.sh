#!/bin/bash
# Runs oxfmt on agent-edited JS/TS files so they match the editor's
# format-on-save and the pre-commit `oxfmt --check` hook never trips.
input=$(cat)
file=$(echo "$input" | jq -r '.file_path // empty')

case "$file" in
  *.ts | *.tsx | *.js | *.jsx) ;;
  *) exit 0 ;;
esac

case "$file" in
  */node_modules/* | */dist/*) exit 0 ;;
esac

if [[ -f "$file" && -x "./node_modules/.bin/oxfmt" ]]; then
  ./node_modules/.bin/oxfmt "$file" >/dev/null 2>&1
fi

exit 0
