#!/usr/bin/env bash

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

get_theme_tokens() {
    theme=$1
    input_json=$2
    root=$3
    output_css=$4

    theme_tokens=$(jq -r --arg keyvar "$root" '.[$keyvar] | .[] | map_values(."value") | to_entries | map({key: .key, value: (.value | sub("^{Colors\\.|}"; ""; "g")) }) | .[]' <<< "$input_json")
    [[ $? -ne 0 ]] && fatal "jq failed."
    # Cross data with core colors tokens to obtain hex/rgba values
    jq -r --slurpfile colors /tmp/colors.json '($colors | map({key: .key, value: .value}) | from_entries) as $c | . | [.key, $c[.value]] | @sh' <<< "$theme_tokens" |
    awk -v theme=$theme '
        function isHex(color) {
            return match(color, /^#?[0-9a-fA-F]+$/)
        }
        function hexToDec(s){
            return index("0123456789abcdef", tolower(substr(s,length(s)))) - 1 + (sub(/.$/,"",s) ? 16*hexToDec(s) : 0)
        }
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
            return sprintf("var(%s-alpha, %.3g)", token, (opacity ? opacity : 1))
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
