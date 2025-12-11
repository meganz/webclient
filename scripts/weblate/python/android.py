import os, json, subprocess, re, args
from xml.dom.minidom import parseString

config = {}
config["BASE_URL"] = ""
config["PROJECT"] = ""
config["TOKEN"] = os.getenv("WEBLATE_TOKEN")
config["COMPONENTS"] = {}
config["TEMPLATE_NAME"] = "en.xml"
config["FILE_FORMAT"] = "aresource"
config["MIME"] = "application/xml"

script_dir = os.path.dirname(os.path.realpath(__file__)) + "/"

def parse_strings_config():
    path = script_dir + "android.conf"
    if args.library and os.path.exists(script_dir + args.library + ".conf"):
        path = script_dir + args.library + ".conf"
    if not os.path.exists(path):
        raise Exception("Missing configuration file for strings resources")
    with open(path, "r", encoding="utf-8") as file:
        config = file.read()
    config = [line for line in config.split('\n') if line.strip()]
    map = {}
    for line in config:
        tmp = line.split(" ")
        if len(tmp) == 2 and "-" not in tmp[0]:
            if os.path.exists(os.path.realpath(script_dir + "../../../" + tmp[1])):
                map[tmp[0]] = os.path.realpath(script_dir + "../../../" + tmp[1] + (args.start_path if args.start_path else "/src/main/res/values"))
            else:
                print("Error: The specified folder does not exist. " + os.path.realpath(script_dir + "../../../" + tmp[1]))
        else:
            print("Error: Invalid configuration: " + line)
    if len(map) == 0:
        print("Error: No valid configurations")
    return map

config["COMPONENTS"] = parse_strings_config()
config_file = os.path.realpath(script_dir + "../translate.json")
if not os.path.exists(config_file):
    print("Warning: Trying sample config")
    config_file = os.path.realpath(script_dir + "../translate.json.example")
if os.path.exists(config_file):
    config_file = open(config_file, "r")
    content = config_file.read()
    config_file.close()
    weblate_config = json.loads(content)

    config["BASE_URL"] = weblate_config.get("BASE_URL") or config["BASE_URL"]
    config["TOKEN"] = weblate_config.get("SOURCE_TOKEN") or config["TOKEN"]
    config["PROJECT"] = weblate_config.get("PROJECT") or config["PROJECT"]
    if args.library:
        config["PROJECT"] = weblate_config.get("LIB_PROJECT") or args.library
    config["MIME"] = weblate_config.get("MIME") or config["MIME"]
    config["FILE_FORMAT"] = weblate_config.get("FILE_FORMAT") or config["FILE_FORMAT"]
    config["TEMPLATE_NAME"] = weblate_config.get("TEMPLATE_NAME") or config["TEMPLATE_NAME"]

remaps = {
    "zh_Hans": "zh-rCN",
    "zh_Hant": "zh-rTW",
    "id": "in"
}

def replace_not_html(string):
    ignore_indexes = {}
    indexes_to_replace = {}
    i = 0
    while i < len(string):
        if string[i] == "<" and i not in ignore_indexes.keys():
            j = i + 1
            replace = True
            replaced = False
            while j < len(string):
                if string[j] == "<":
                    replace = False
                    replaced = True
                    indexes_to_replace[i] = "&lt;"
                    j -= 1
                elif string[j] == ">":
                    tag = string[i:(j + 1)]
                    if "<input" in tag:
                        ignore_indexes[i] = tag
                        ignore_indexes[j] = tag
                        replace = False
                    elif "<br" in tag:
                        ignore_indexes[i] = tag
                        ignore_indexes[j] = tag
                        replace = False
                    else:
                        end_tag = tag.replace("<", "</")
                        if " " in end_tag:
                            space_pos = end_tag.find(" ")
                            end_tag = end_tag[0:space_pos] + ">"
                        matching_tags = list(filter(lambda k: ignore_indexes[k] == end_tag, ignore_indexes.keys()))
                        offset = 0
                        if len(matching_tags) > 0:
                            offset = max(matching_tags)
                        if end_tag in string[offset:len(string)]:
                            end_tag_pos = string[offset:len(string)].find(end_tag) + offset
                            if end_tag_pos - offset > string[offset:len(string)].find(tag):
                                ignore_indexes[i] = end_tag
                                ignore_indexes[j] = end_tag
                                ignore_indexes[end_tag_pos] = end_tag
                                ignore_indexes[end_tag_pos + len(end_tag) - 1] = end_tag
                                replace = False
                        else:
                            indexes_to_replace[i] = "&lt;"
                            j -= 1
                            replace = False
                            replaced = True
                if replace:
                    j += 1
                else:
                    break
            if replace and not replaced:
                indexes_to_replace[i] = "&lt;"
            i = j
        elif string[i] == ">" and i not in ignore_indexes.keys():
            indexes_to_replace[i] = "&gt;"
        i += 1
    keys = indexes_to_replace.keys()
    for i in reversed(keys):
        string = string[:i] + indexes_to_replace[i] + string[i + 1:]
    return string

def replace_characters(string, is_upload=False):
    string = string.replace('\"', "\"")
    string = string.replace("\'", "'")
    string = string.replace("&quot;", "\"")
    string = string.replace("&#039;", "'")
    string = re.sub(r'\b"', '”', string)
    string = re.sub('"', '“', string)
    string = re.sub("'", "’", string)
    if is_upload:
        string = string.replace("...", "…")
        string = string.replace(r'\r\n', "\r\n")
        string = string.replace("&#8226;", "•")
        string = string.replace("&#8230;", "…")
        string = string.replace("&#64;", "@")
        string = string.replace("&#160;", "[w]")
        string = string.replace(u"\xa0", "[w]")
        string = string.replace(r'\n', '[Br]')
    else:
        string = string.replace("&amp;", "&")
        string = string.replace("&lt;", "<")
        string = string.replace("&gt;", ">")
        string = string.replace("&", "&amp;")
        string = string.replace("•", "&#8226;")
        string = string.replace("…", "&#8230;")
        string = string.replace("@", "&#64;")
        string = string.replace(" ", "&#160;")
        string = re.sub('(?i)' + re.escape('[w]'), '&#160;', string)
        string = string.replace("\n", "")
        string = string.replace("\r", "")
        string = string.replace('[Br]', r'\n')
    string = replace_not_html(string)
    string = string.replace("[a]", "[A]")
    string = string.replace("[/a]", "[/A]")
    string = string.replace("[b]", "[B]")
    string = string.replace("[/b]", "[/B]")
    string = string.replace("[c]", "[C]")
    string = string.replace("[/c]", "[/C]")
    string = string.replace("[d]", "[D]")
    string = string.replace("[/d]", "[/D]")
    string = string.replace("[e]", "[E]")
    string = string.replace("[/e]", "[/E]")
    return string.strip()

def indent_xml(lines):
    result = ""
    padding = 0
    for i in range(len(lines)):
        token = lines[i].lstrip()
        matches = re.search(r".+<\/\w[^>]*>$", token)
        if matches == None:
            matches = re.search(r"^<\/\w", token)
            if matches == None:
                matches = re.search(r"^<\w[^>]*[^\/]>.*$", token)
                if matches == None:
                    indent = 0
                else:
                    indent = 4
            else:
                padding -= 4
                indent = 0
        else:
            indent = 0
        line = token.rjust(len(token) + padding, ' ')
        result = result + line + "\n"
        padding += indent
    return result.strip()

def sanitise_file(file_content, is_upload=False, component_id=False):
    lines = file_content.split("\n")
    output_lines = []
    i = 0
    while i < len(lines):
        if "<string-array" in lines[i]:
            print("Error: <string-array> elements are not supported. Please unwrap the items into individual <string> elements")
            os._exit(1)
        if "<item" in lines[i]:
            start_pos = lines[i].find("<item>")
            if start_pos > -1:
                start_pos += 6
            else:
                start_pos = lines[i].find("\">") + 2
            xml_element = ""
            end_pos = -1
            empty_pos = lines[i].rstrip().find("/>")
            if empty_pos > -1 and "<item" in lines[i]:
                end_pos = 0
                empty_pos = lines[i].find("/>") + 2
            while end_pos == -1:
                xml_element = xml_element + lines[i]
                end_pos = xml_element.find("</item>")
                i += 1
            if empty_pos > -1:
                if is_upload:
                    print("Error: Empty upload string content. Upload aborted. Line: " + str(i + 1))
                    os._exit(1)
                output_lines.append(lines[i])
            else:
                i -= 1
                string = xml_element[start_pos:end_pos]
                sanitised = replace_characters(string, is_upload)
                if len(sanitised) == 0 and is_upload:
                    print("Error: Empty upload string content. Upload aborted. Line: " + str(i + 1) + " Element: " + xml_element.strip())
                    os._exit(1)
                output_lines.append(xml_element.replace(string, sanitised))
        elif "<string " in lines[i]:
            start_pos = lines[i].find("\">") + 2
            xml_element = ""
            end_pos = -1
            while end_pos == -1:
                xml_element = xml_element + lines[i]
                end_pos = xml_element.find("</string>")
                if end_pos == -1:
                    xml_element = xml_element + "\r\n"
                i += 1
            i -= 1
            string = xml_element[start_pos:end_pos]
            sanitised = replace_characters(string, is_upload)
            if len(sanitised) == 0 and is_upload:
                print("Error: Empty upload string content. Upload aborted. Line: " + str(i + 1) + " Element: " + xml_element.strip())
                os._exit(1)
            output_lines.append(xml_element.replace(string, sanitised))
        else:
            output_lines.append(lines[i])
        i += 1
    return indent_xml(output_lines)

def get_previous_comment(node):
    while node.previousSibling:
        node = node.previousSibling
        if node.nodeType == node.COMMENT_NODE:
            return node
        elif node.nodeType != node.TEXT_NODE:
            return None
    return None

def clone_items_to_node(tree, parent, to_clone):
    for node in to_clone.childNodes:
        if node.nodeType == node.ELEMENT_NODE:
            item_node = tree.createElement("item")
            if node.hasAttribute("quantity"):
                item_node.setAttribute("quantity", node.getAttribute("quantity"))
            text_node = tree.createTextNode(subnodes_as_text(node))
            item_node.appendChild(text_node)
            parent.appendChild(item_node)
    return parent

def subnodes_as_text(parent):
    node_value = ""
    for node in parent.childNodes:
        node_value = node_value + node.toxml()
    return node_value

def clone_node_to_tree(tree, to_clone):
    if to_clone.nodeType == to_clone.COMMENT_NODE:
        return tree.createComment(to_clone.data)
    else:
        tag = to_clone.tagName
        new_node = tree.createElement(tag)
        if tag == "plurals":
            new_node = clone_items_to_node(tree, new_node, to_clone)
        else:
            text_node = tree.createTextNode(subnodes_as_text(to_clone))
            new_node.appendChild(text_node)
        new_node.setAttribute("name", to_clone.getAttribute("name"))
        return new_node

def merge_string_node(tree, node, existing_node):
    comment = get_previous_comment(node)
    existing_comment = None
    if existing_node != None:
        existing_comment = get_previous_comment(existing_node)
    if existing_node == None:
        if comment != None:
            comment = clone_node_to_tree(tree, comment)
            tree.documentElement.appendChild(comment)
        node = clone_node_to_tree(tree, node)
        tree.documentElement.appendChild(node)
    else:
        if comment != None and existing_comment != None:
            existing_comment.parentNode.replaceChild(comment, existing_comment)
        node = clone_node_to_tree(tree, node)
        existing_node.parentNode.replaceChild(node, existing_node)

def clean_join(list):
    for i in reversed(range(len(list))):
        s = list[i].strip()
        if not (\
            s[0:7] == "<string"\
            or s[0:7] == "<plural"\
            or s[0:8] == "</plural"\
            or s[0:5] == "<item"\
            or s[0:9] == "<resource"\
            or s[0:10] == "</resource"\
            or s[0:4] == "<!--"\
            or s[0:5] == "<?xml"\
            )\
            and i > 1:
            if (list[i - 1][-1] != " "):
                s = " " + s
            list[i - 1] = list[i - 1] + s
            list[i] = ""
    return '\n'.join([line for line in list if line.strip()])

def merge_strings(component_content, branch_component_content, is_upload=False, component_id=False):
    result_doc = parseString(component_content)
    existing_node_map = {}
    for node in result_doc.documentElement.childNodes:
        if node.nodeType == node.ELEMENT_NODE and node.hasAttribute("name"):
            existing_node_map[node.getAttribute("name")] = node
    branch_doc = parseString(branch_component_content)
    nodes = branch_doc.getElementsByTagName("string")
    for string_node in nodes:
        key = string_node.getAttribute("name")
        existing_node = None
        if key in existing_node_map:
            existing_node = existing_node_map[key]
        merge_string_node(result_doc, string_node, existing_node)
    nodes = branch_doc.getElementsByTagName("plurals")
    for plural_node in nodes:
        key = plural_node.getAttribute("name")
        existing_node = None
        if key in existing_node_map:
            existing_node = existing_node_map[key]
        merge_string_node(result_doc, plural_node, existing_node)
    merge_content = clean_join([line for line in result_doc.toprettyxml('    ', encoding="utf-8").decode('utf-8').split('\n') if line.strip()])
    return sanitise_file(merge_content, is_upload)

def read_file(filepath, component_id=False):
    if not filepath or not os.path.exists(filepath):
        filepath = script_dir + "strings.xml"
    with open(filepath, "r", encoding="utf-8") as file:
        content = file.read()
    return sanitise_file(content, True)

def write_file(filepath, content):
    with open(filepath, "w") as file:
        return file.write(content) > 0

def get_branch_name():
    cur_path = os.getcwd()
    os.chdir(script_dir + "..")
    branch_name = subprocess.check_output(['git', 'symbolic-ref', '--short', '-q', 'HEAD'], universal_newlines=True).strip()
    os.chdir(cur_path)
    return re.sub("[^A-Za-z0-9]+", "", branch_name).lower()

def handle_content(lang_keys, id, base_prod_langs, base_branch_langs, build_langs):
    id = id.split(":r:")
    component_id = id[1]
    if config["COMPONENTS"][component_id]:
        for lang in lang_keys:
            content = sanitise_file(base_prod_langs[lang])
            if lang in base_branch_langs:
                branch_content = sanitise_file(base_branch_langs[lang])
                content = merge_strings(content, branch_content)
            write_file(config["COMPONENTS"][component_id] + ("" if lang == "en" else "-" + lang) + "/" + component_id + ".xml", content)
    
    if len(build_langs):
        for id in build_langs:
            if id in config["COMPONENTS"]:
                for lang in lang_keys:
                    write_file(config["COMPONENTS"][id] + ("" if lang == "en" else "-" + lang) + "/" + id + ".xml", sanitise_file(build_langs[id][lang]))
