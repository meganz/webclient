#!/usr/bin/env bash

# --- Dependency Check: Ensure required commands are available ---
for cmd in jq git awk tar; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "fatal: command '$cmd' not found. Please install it (e.g. brew install $cmd)." >&2
    exit 128
  fi
done
# --------------------------------------------------------------

print_help() {
    printf "This script automates the conversion of Design Tokens to CSS variables on Mobile.\n"
    printf "Usage: %s <webclient-dir>\n" "$0"
}

fatal() {
    echo >&2 -e "fatal: $*\007"
    exit 128
}

get_absolute_path() {
    path="$1"
    if command -v realpath &> /dev/null; then
        realpath "$path"
        [[ $? -ne 0 ]] && fatal "realpath failed."
    else
        readlink -f "$path"
        [[ $? -ne 0 ]] && fatal "readlink -f failed."
    fi
}

get_core_tokens() {
    input_json=$1
    root=$2
    output_css=$3

    LC_NUMERIC=POSIX

    # For now, do not process Spacing tokens as they are not being used
    #spacingJSON=$(jq .Spacing $input_json)

    # Radius tokens
    jq -r --arg keyvar "$root" '.[$keyvar].Radius | to_entries | .[] | [.key, (.value.value | tostring)] | @sh' <<< "$input_json" |
    awk '
        BEGIN {
                print "/* general */"
                print "body,"
                print ":host(.mega-shadow-dom),"
                print ".custom-alpha {"
            }
            {
                gsub(/--/, "--mobile-")
                gsub(/\x27/, "")
                if ($2 < 1)
                    printf "    %s: %d%%;\n", $1, $2*100
                else
                    printf "    %s: %dpx;\n", $1, $2
            }
        END {
                print "}"
            }
    ' >> $output_css
    PS=("${PIPESTATUS[@]}")
    [[ ${PS[1]} -ne 0 ]] && fatal "awk failed."
    [[ ${PS[0]} -ne 0 ]] && fatal "jq failed."

    # Colors tokens
    # Will be used to define the color theme tokens, therefore, we simply parse and store them in a temporary file
    jq -r --arg keyvar $root '.[$keyvar].Colors | [(paths(scalars) | select( . | tostring | contains("value"))) as $path | {($path | join(".") | sub("\\.value";"")): (getpath($path) | gsub(" ";""))}] | .[] | to_entries | map({key: .key, value: .value}) | .[]' <<< "$input_json" > /tmp/colors.json
    [[ $? -ne 0 ]] && fatal "jq failed."

    return 0
}

# ------------------------------------------------------------------------------
# Function: get_theme_tokens
#
# Description:
#   Generates CSS theme tokens based on semantic token definitions and a core
#   color map. It processes a JSON input containing color references in the form
#   {Colors.X.Y} or rgba({Colors.X.Y}, alpha), resolves them against a core color
#   map (/tmp/colors.json), and emits final rgba CSS variables into an output file.
#
# Inputs:
#   $1 - theme:        Name of the theme (used for CSS class naming).
#   $2 - input_json:   JSON string with semantic tokens organized under a root key.
#   $3 - root:         Key under which theme tokens are located in the input JSON.
#   $4 - output_css:   Path to the output CSS file to append the generated rules.
#
# Notes:
#   - Uses `jq` to parse and sanitize tokens.
#   - Matches token values against the core color definitions.
#   - Converts tokens into final `rgba(...)` CSS syntax, applying alpha transparency.
#   - Handles custom alpha values via CSS variables (e.g., var(--token-alpha, 0.8)).
#   - Supports fallback handling when tokens cannot be resolved.
#   - Expected color format in /tmp/colors.json: list of { key, value }.
#   - Tokens marked as `NEEDS_RGBA` are custom-handled in awk to interpolate alpha.
#
# Errors:
#   - Fails with a fatal message if `jq` or `awk` commands fail.
#
# Maintenance Tip:
#   - Be cautious with changes to the parsing logic in `jq` or color formatting in `awk`,
#     especially around the regex replacements and alpha blending logic.
# ------------------------------------------------------------------------------

get_theme_tokens() {
    theme=$1
    input_json=$2
    root=$3
    output_css=$4

    # Extract and sanitize the theme tokens from the input JSON.
    # It flattens the structure and removes color token wrappers like {Colors.X.Y}
    theme_tokens=$(jq --arg keyvar "$root" '
        .[$keyvar]
        | to_entries
        | map(.value | to_entries)
        | add
        | map({
            key: .key,
            value: (
                .value.value
                | gsub("(?<!\\{)\\s+(?![^\\{]*\\})"; "")   # remove spaces outside of {}
                | gsub("\\{?\\s*Colors\\."; "")            # remove optional '{', spaces, and 'Colors.'
                | gsub("\\}"; "")                          # remove closing '}'
            )
            })
        ' <<< "$input_json")

    [[ $? -ne 0 ]] && fatal "jq token parse failed."

    # Merge tokens with core color values from /tmp/colors.json
    # If the token is a synthetic rgba (e.g., rgba({Colors.X.Y}, 0.4)), it generates a marker string
    # for awk to interpret and resolve it with transparency applied.
    jq -r --slurpfile colors /tmp/colors.json '
        ($colors | map({key: .key, value: .value}) | from_entries) as $c
        | .[]
        | .key as $k
        | if (.value | test("^rgba\\(")) then
            .value
            | capture("rgba\\((?<color>[^,]+),(?<alpha>[^\\)]+)\\)")
            | [$k, "NEEDS_RGBA(\($c[.color] // "null"),\(.alpha))"]
           else
            [$k, ($c[.value] // "null")]
           end
        | @sh
        ' <<< "$theme_tokens" |

    # Process each key-value pair and write the final CSS tokens
    awk -v theme="$theme" '
        function isHex(color) {
            return match(color, /^#?[0-9a-fA-F]+$/)
        }

        # Converts a hexadecimal color string into decimal (0–255)
        function hexToDec(s){
            return index("0123456789abcdef", tolower(substr(s,length(s)))) - 1 + (sub(/.$/,"",s) ? 16*hexToDec(s) : 0)
        }

        # Build rgba() string from hex + alpha, using CSS variables for alpha
        function convertHexToRgba(token, color) {
            hexStr = substr(color, 2)
            split("", rgba)
            for (i = 1; i <= 4; i++) {
                idx = (i - 1) * 2 + 1
                rgba[i] = hexToDec(substr(hexStr, idx, 2))
            }
            rgba[4] = buildAlpha(token, rgba[4]/255)
            return buildRgba(rgba)
        }

        # Extracts and adjusts rgba() components from rgba(...) input
        function parseRgba(token, color) {
            gsub(/rgba|rgb|\x28|\x29/, "", color)
            split(color, rgba, ",")
            rgba[4] = buildAlpha(token, rgba[4])
            return buildRgba(rgba)
        }

        # Parses marker format NEEDS_RGBA(#rrggbb, alpha) and converts it
        function convertMarkedRgba(token, str) {
            gsub(/^NEEDS_RGBA\(|\)$/, "", str)
            split(str, parts, ",")
            hex = substr(parts[1], 2)
            alpha = parts[2]
            r = hexToDec(substr(hex, 1, 2))
            g = hexToDec(substr(hex, 3, 2))
            b = hexToDec(substr(hex, 5, 2))
            a = buildAlpha(token, alpha)
            return sprintf("rgba(%d, %d, %d, %s)", r, g, b, a)
        }

        # Formats rgba() string
        function buildRgba(rgba) {
            return sprintf("rgba(%d, %d, %d, %s)", rgba[1], rgba[2], rgba[3], rgba[4])
        }

        # Applies a CSS variable for alpha, fallback to actual value
        function buildAlpha(token, opacity) {
            match(token, /^--mobile-[a-z]+/)
            token = substr(token, RSTART, RLENGTH)
            return sprintf("var(%s-alpha, %.3g)", token, (opacity ? opacity : 1))
        }

        BEGIN {
            # CSS block preamble
            printf "/* %s theme */\n", theme
            printf ".theme-%s,\n", theme
            printf ".theme-%s .custom-alpha,\n", theme
            printf "html .theme-%s-forced {\n", theme
        }

        {
            # Normalize token name
            sub(/color/, "mobile")
            gsub(/\x27/, "")  # remove single quotes

            # Decide how to convert value
            if ($2 ~ /^NEEDS_RGBA\(/) {
                rgbaValue = convertMarkedRgba($1, $2)
            } else if (isHex($2)) {
                rgbaValue = convertHexToRgba($1, $2)
            } else {
                rgbaValue = parseRgba($1, $2)
            }

            # Emit final CSS rule
            printf "    %s: %s;\n", $1, rgbaValue
        }

        END {
            print "}"
        }
    ' >> $output_css

    # Capture exit codes from both jq and awk
    PS=("${PIPESTATUS[@]}")
    [[ ${PS[1]} -ne 0 ]] && fatal "awk failed."
    [[ ${PS[0]} -ne 0 ]] && fatal "jq failed."

    return 0
}

if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
    print_help
    exit 0
fi

if [[ $# -ne 1 ]]; then
    print_help
    exit 1
fi


readonly webclient_dir=$(get_absolute_path "$1")
if [ ! -d "$webclient_dir" ]; then
    printf "Directory %s does not exist.\n" "$webclient_dir"
    exit 1
fi

# Get tokens.json file from MEGADesignAssets GitLab repo
readonly tokens_json=$(git archive --remote git@code.developers.mega.co.nz:megadesignassets/megadesignassets.git main tokens.json | tar -xO)
[[ $? -ne 0 ]] && fatal "git failed."

mobile_tokens_auto_css=$webclient_dir/css/vars/mobile-theme-auto.css
# Clear old mobile tokens
> $mobile_tokens_auto_css
    
# 1. Core: Spacing, radius and colors tokens
get_core_tokens "$tokens_json" "Core/Main" "$mobile_tokens_auto_css"
# 2. Semantic light theme tokens
get_theme_tokens "light" "$tokens_json" "Semantic tokens/Light" "$mobile_tokens_auto_css"
# 3. Semantic dark theme tokens
get_theme_tokens "dark" "$tokens_json" "Semantic tokens/Dark" "$mobile_tokens_auto_css"
