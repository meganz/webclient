#!/usr/bin/env bash

print_help() {
    printf "This script automates the conversion of Design Tokens to CSS variables on Mobile.\n"
    printf "Usage: %s <core-tokens-json> <light-tokens-json> <dark-tokens-json> <webclient-dir>\n" "$0"
}

get_core_tokens() {
    input_json=$1
    output_css=$2

    LC_NUMERIC=POSIX

    # For now, do not process Spacing tokens as they are not being used
    #spacingJSON=$(jq .Spacing $input_json)

    # Radius tokens
    jq -r '.Radius | to_entries | .[] | [.key, (.value."$value" | tostring)] | @sh' $input_json |
    awk '
        BEGIN {
                print "/* general */"
                print "body,"
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

    # Colors tokens
    # Will be used to define the color theme tokens, therefore, we simply parse and store them in a temporary file
    jq -r '.Colors | [(paths(scalars) | select( . | tostring | contains("$value"))) as $path | {($path | join(".") | sub("\\.\\$value";"")): (getpath($path) | gsub(" ";""))}] | .[] | to_entries | map({key: .key, value: .value}) | .[]' $input_json > /tmp/colors.json
}

get_theme_tokens() {
    theme=$1
    input_json=$2
    output_css=$3

    theme_tokens=$(jq -r '.[] | map_values(."$value") | to_entries | map({key: .key, value: (.value | sub("^{Colors\\.|}"; ""; "g")) }) | .[]' $input_json)
    # Cross data with core colors tokens to obtain hex/rgba values
    echo $theme_tokens | jq -r --slurpfile colors /tmp/colors.json '($colors | map({key: .key, value: .value}) | from_entries) as $c | . | [.key, $c[.value]] | @sh' |
    awk -v theme=$theme '
        function isHex(color) {
            return match(color, /^#?[0-9a-fA-F]+$/)
        }
        function convertHexToRgba(token, color) {
            hexStr = substr(color, 2)
            split("", rgba)
            for (i = 1; i <= 3; i++) {
                idx = (i - 1) * 2 + 1
                rgba[i] = "0x" substr(hexStr, idx, 2)
            }
            rgba[4] = buildAlpha(token)
            return buildRgba(rgba)
        }
        function parseRgba(token, color) {
            gsub(/rgba|rgb|\x28|\x29/, "", color)
            split(color, rgba, ",")
            rgba[4] = buildAlpha(token, rgba[4])
            return buildRgba(rgba)
        }
        function buildRgba(rgba) {
            return sprintf("rgba(%d, %d, %d, %s)", rgba[1], rgba[2], rgba[3], rgba[4])
        }
        function buildAlpha(token, opacity) {
            match(token, /^--mobile-[a-z]+/)
            token = substr(token, RSTART, RLENGTH)
            return sprintf("var(%s-alpha, %s)", token, (opacity ? opacity : 1))
        }
        BEGIN {
                printf "/* %s theme */\n", theme
                printf ".theme-%s,\n", theme
                printf ".theme-%s .custom-alpha,\n", theme
                printf "html .theme-%s-forced {\n", theme
            }
            {
                sub(/color/, "mobile")
                gsub(/\x27/, "")
                if (isHex($2)) {
                    rgbaValue = convertHexToRgba($1, $2)
                } else {
                    rgbaValue = parseRgba($1, $2)
                }
                printf "    %s: %s;\n", $1, rgbaValue
            }
        END {
                print "}"
            }
    ' >> $output_css
}

if [[ "${1-}" =~ ^-*h(elp)?$ ]]; then
    print_help
    exit 0
fi

if [[ $# -ne 4 ]]; then
    print_help
    exit 1
fi

readonly core_tokens_json=$1
readonly light_tokens_json=$2
readonly dark_tokens_json=$3
readonly webclient_dir=$(realpath "$4")

for arg in $core_tokens_json $light_tokens_json $dark_tokens_json
do
    if [ ! -f $arg ]; then
        printf "File %s does not exist.\n" "$arg"
        exit 1
    fi
done

if [ ! -d $webclient_dir ]; then
    printf "Directory %s does not exist.\n" "$webclient_dir"
    exit 1
fi

mobile_tokens_auto_css=$webclient_dir/css/vars/mobile-theme-auto.css
# Clear old mobile tokens
> $mobile_tokens_auto_css
    
# 1. Core: Spacing, radius and colors tokens
get_core_tokens $core_tokens_json $mobile_tokens_auto_css
# 2. Semantic light theme tokens
get_theme_tokens light $light_tokens_json $mobile_tokens_auto_css
# 3. Semantic dark theme tokens
get_theme_tokens dark $dark_tokens_json $mobile_tokens_auto_css
