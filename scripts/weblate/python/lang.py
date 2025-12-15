import api, os, args

if args.is_android:
    import android as handler
elif args.is_ios:
    import ios as handler
else:
    print("Error: Invalid invocation")
    os._exit(1)

API = api.API(handler.config)

def get_language_keys():
    languages = API.languages
    if not languages or len(languages) == 0:
        raise Exception("Language keys require the languages to be fetched via API->fetchLanguages")
    data = {}
    for key in languages:
        data[handler.remaps[key] if key in handler.remaps else key] = key
    return data

def component_download(id, target, lang_keys):
    split = id.split(":r:")
    if len(split) < 2:
        raise Exception("Invalid component download found " + id)
    project_id = split[0] or API.PROJECT
    component_id = split[1]

    langs = API.fetch_component_translated_languages(component_id, project_id)
    target["en"] = API.component_get_english(component_id, project_id)
    threads = {}
    for lang_code in lang_keys:
        lang_id = lang_keys[lang_code]
        if lang_id != "en":
            if lang_id in langs:
                threads[API.component_get_language(component_id, lang_id, project_id, thread=True)] = lang_code
            else:
                target[lang_code] = target["en"]
    if len(threads):
        res = api.thread_do_request()
        for id in res:
            code = threads[id]
            target[code] = res[id]

def upload(component_id, branch_suffix):
    if branch_suffix in ["master", "main", "develop"]:
        print("Error: Invalid branch to upload on. " + branch_suffix)
        return False
    
    file_content = handler.read_file(args.file_path, component_id=component_id)
    if not file_content or len(file_content) == 0:
        print("Error: Invalid new strings")
        return False
    
    print("New strings are valid! :)")

    branch_id = API.has_component(component_id + "-" + branch_suffix)
    existing_strings = ""
    if branch_id and API.has_strings(branch_id):
        print("Downloading latest branch component strings...")
        existing_strings = API.component_get_english(component_id + "-" + branch_suffix)
        if not existing_strings or len(existing_strings) == 0:
            print("Error: Failed to download existing branch content")
            return False
        existing_strings = handler.sanitise_file(existing_strings, component_id=component_id)
    
    existing_strings = handler.merge_strings(existing_strings, file_content, is_upload=True, component_id=component_id) if len(existing_strings) > 0 else file_content
    if len(existing_strings) == 0:
        print("Error: Failed to create strings file to upload")
        return False
    
    if branch_id:
        res = API.component_put_english(component_id + "-" + branch_suffix, existing_strings)
        if not res or "accepted" not in res or res["accepted"] == 0:
            print("Error: Uploading to existing branch component failed")
            return False
    else:
        placeholders = "placeholders:r\"%#@.*@\"" if args.is_ios and "plurals" in component_id else None
        res = API.create_component(component_id + "-" + branch_suffix, existing_strings, placeholders=placeholders)
        if not res:
            print("Error: Creating branch component failed")
            return False
    
    if args.char_limit:
        string_meta = API.fetch_all_component_strings_meta(component_id + "-" + branch_suffix)
        if not string_meta:
            print("Error: Failed to fetch strings metadata")
            return False
        updates = {}
        if args.char_limit:
            char_counts = {}
            for string_id in string_meta:
                meta = string_meta[string_id]
                if meta[string_id] != True:
                    char_count = ""
                    while char_count == "":
                        try:
                            char_count = int(input("Enter the character limit for the string: " + meta["context"] + " or 0 for no limit. "))
                        except:
                            char_count = ""
                    if char_count > 0:
                        char_counts[string_id] = char_count
            if len(char_counts):
                for string_id in char_counts:
                    if string_id not in updates:
                        updates[string_id] = {}
                    flags = set(meta["extra_flags"].split(","))
                    flags.remove("")
                    flags.add("max-length:" + str(char_counts[string_id]))
                    updates[string_id]["extra_flags"] = ",".join(list(flags))

        if len(updates):
            print("Updating string metadata")
            for string_id in updates:
                API.update_string_meta(updates[string_id], string_id)

def download(component_id, branch_suffix):
    base_prod = API.has_component(component_id)
    base_branch = API.has_component(component_id + "-" + branch_suffix)
    lang_keys = get_language_keys()

    base_prod_langs = {}
    base_branch_langs = {}
    build_langs = {}

    if base_prod and API.has_strings(base_prod):
        component_download(base_prod, base_prod_langs, lang_keys)
    if base_branch and API.has_strings(base_branch):
        component_download(base_branch, base_branch_langs, lang_keys)

    if args.production:
        fetched = [component_id]
        for id in API.COMPONENTS:
            if id not in fetched:
                build_langs[id] = {}
                component_download(API.PROJECT + ":r:" + id, build_langs[id], lang_keys)
        print("Build mode fetched additional " + str(len(build_langs)) + " components")

    handler.handle_content(lang_keys, base_prod, base_prod_langs, base_branch_langs, build_langs)

def main():
    print("--- Weblate Language Management ---")

    branch_suffix = handler.get_branch_name()
    if not branch_suffix:
        print("Error: Failed to retrieve your current git branch")
        return False
    API.fetch_languages()
    API.fetch_components()

    if not args.production and args.component and args.component in API.COMPONENTS:
        component_id = args.component
    else:
        component_id = list(API.COMPONENTS.keys())[0]

    if args.update:
        if args.production:
           print("Error: Not able to upload in production mode.") 
        else:
            print("~ Import started ~")
            upload(component_id, branch_suffix)
            print("Completed")
            print("~ Import completed ~")

    print("~ Export started ~")
    download(component_id, branch_suffix)
    print("Completed")
    print("~ Export completed ~")

try:
    main()
except KeyboardInterrupt:
    os._exit(1)
