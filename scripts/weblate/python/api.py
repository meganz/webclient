import args, json, requests
from threading import Thread

META_OPTS = ["state", "target", "explanation", "extra_flags", "labels"]
thread_res = {}
thread_queue = []

def do_request(endpoint="", headers={}, payload=None, method="GET", id=None, text=False, encoding=False):
    if method == "GET":
        resp = requests.get(endpoint, headers=headers)
    elif method == "POST":
        if "files" in payload:
            files = payload["files"]
            del payload["files"]
            resp = requests.post(endpoint, headers=headers, data=payload, files=files)
        else:
            resp = requests.post(endpoint, headers=headers, data=payload)
    elif method == "PATCH":
        resp = requests.patch(endpoint, headers=headers, data=payload)
    
    if resp.status_code < 200 or resp.status_code > 399:
        if id is not None:
            thread_res[id] = resp.text
            return
        return resp.text
    
    if id is not None:
        if text:
            thread_res[id] = resp.text
        elif encoding:
            thread_res[id] = resp.content.decode(encoding)
        else:
            thread_res[id] = resp.json()
        return
    if text:
        return resp.text
    if encoding:
        return resp.content.decode(encoding)
    return resp.json()
    
def thread_do_request():
    threads = []
    global thread_res
    global thread_queue
    if len(thread_queue) == 0:
        return {}
    for req in thread_queue:
        req["id"] = req["id"] or threads.length
        t = Thread(target=do_request, kwargs=req)
        threads.append(t)
        t.start()

    thread_queue = []
    for thread in threads:
        thread.join()
    res = thread_res
    thread_res = {}
    return res

def safe_parse(json_str):
    try:
        return json.loads(json_str)
    except:
        return {}

class API:
    def __init__(self, config):
        self.HOST = config["BASE_URL"]
        self.PROJECT = config["PROJECT"]
        self.TOKEN = config["TOKEN"]
        self.COMPONENTS = config["COMPONENTS"] or {}
        self.MIME = config["MIME"] or "application/json"
        self.FILE_FORMAT = config["FILE_FORMAT"]
        self.TEMPLATE_NAME = config["TEMPLATE_NAME"]
        self.FILE_ENCODING = config["FILE_ENCODING"] if "FILE_ENCODING" in config else {}

        if not self.HOST or not self.PROJECT or not self.TOKEN or len(self.COMPONENTS) == 0 or not self.FILE_FORMAT or not self.TEMPLATE_NAME:
            if args.verbose:
                print("Project: " + self.PROJECT + ", Host: " + self.HOST + ", Components: " + ",".join(self.COMPONENTS.keys()) + ", Format:" + self.FILE_FORMAT + ", Template name: " + self.TEMPLATE_NAME + ", Token: " + str(len(self.TOKEN)))
            raise Exception("Failed to initialise. Check your configuration file.")
        
        self.HEADERS = {
            "Authorization": "Token " + self.TOKEN,
            "Accept": "application/json"
        }

        self.components = {}
        self.languages = {}
        self.strings_meta = {}
        self.labels = {}
        self.file_ext = self.TEMPLATE_NAME.split(".")[1]

    def has_component(self, component_id):
        if len(self.components) == 0:
            raise Exception("Components have not been fetched")
        id = self.PROJECT + ":r:" + component_id
        return id if id in self.components else False
    
    def has_strings(self, component_id):
        if len(self.components) == 0:
            raise Exception("Components have not been fetched")
        return self.components[component_id]["strings"] > 0 if component_id in self.components else None

    def fetch_components(self):
        if len(self.components) > 0:
            return self.components
        if args.verbose:
            print("Fetching new components for " + self.PROJECT)
        
        project_res = self.send_request("projects/" + self.PROJECT + "/components")
        if not project_res or not "results" in project_res:
            raise Exception("Invalid API response from Weblate")
        
        self.store_components(project_res["results"])
        if args.verbose:
            print("Fetched " + str(len(self.components)) + " components")
        return self.components
    
    def store_components(self, res):
        for i in range(len(res)):
            if res[i]["slug"] != "glossary":
                id = self.PROJECT + ":r:" + res[i]["slug"]
                self.components[id] = {
                    "name": res[i]["name"]
                }
                self.send_request("components/" + self.PROJECT + "/" + res[i]["slug"] + "/statistics/", thread=True, id=id)
        res = thread_do_request()
        for id in res.keys():
            self.components[id]["strings"] = res[id]["results"][0]["total"] or 0

    def fetch_languages(self):
        if len(self.languages):
            return self.languages
        if args.verbose:
            print("Fetching new languages for " + self.PROJECT)
        res = self.send_request("components/" + self.PROJECT + "/" + list(self.COMPONENTS.keys())[0] + "/translations/")
        if not "results" in res:
            raise Exception("Invalid API response from Weblate")
        for i in range(len(res["results"])):
            language = res["results"][i]["language"]
            self.languages[language["code"]] = language
        if args.verbose:
            print("Fetched " + str(len(self.languages)) + " languages")
        return self.languages
    
    def fetch_component_translated_languages(self, branch_component_id, project_id=None):
        project_id = project_id or self.PROJECT
        if branch_component_id == list(self.COMPONENTS.keys())[0] and project_id == self.PROJECT:
            languages = dict(self.fetch_languages())
            del languages["en"]
            return languages
        res = self.send_request("components/" + project_id + "/" + branch_component_id + "/translations/")
        if not "results" in res:
            raise Exception("Invalid API response from Weblate")
        languages = {}
        for i in range(len(res["results"])):
            language = res["results"][i]["language"]
            if language["code"] != "en":
                languages[language["code"]] = language
        if args.verbose:
            print("Fetched " + str(len(languages)) + " languages")
        return languages

    def create_component(self, name, file_content, project_id=None, placeholders=None):
        project_id = project_id or self.PROJECT
        base_component = name.split("-")[0]
        form_data = {
            "files": {
                "docfile": (self.TEMPLATE_NAME, file_content.encode(self.FILE_ENCODING[base_component]) if base_component in self.FILE_ENCODING else file_content, self.MIME)
            },
            "name": name,
            "slug": name,
            "source_language": "en",
            "new_lang": "add",
            "file_format": self.FILE_FORMAT
        }
        if args.verbose:
            print("Creating new component " + name + " " + project_id)
        data = self.send_request("projects/" + project_id + "/components/", form_data=form_data)
        if isinstance(data, str):
            err = safe_parse(data)
            type = err["type"] or False
            errors = err["errors"] or False
            print("Error: Failed to initialise branch component " + str(type or data))
            if errors:
                self.log_error_object(errors)
            return False
        
        payload = {
            "name": name,
            "slug": name,
            "project": project_id,
            "filemask": name + "/*." + self.file_ext,
            "template": name + "/" + self.TEMPLATE_NAME,
            "new_base": name + "/" + self.TEMPLATE_NAME,
            "edit_template": True,
            "priority": 100,
            "is_glossary": False
        }
        if placeholders != None:
            payload["enforced_checks"] = ["placeholders"]
            payload["check_flags"] = placeholders

        res = self.send_request("components/" + project_id + "/" + name, payload=payload, method="PATCH")
        if isinstance(data, str):
            err = safe_parse(data)
            type = err["type"] or False
            errors = err["errors"] or False
            print("Error: Failed to finalise branch component " + str(type or res))
            if errors:
                self.log_error_object(errors)
            return False
        
        if len(self.components) > 0:
            component_data = self.send_request("components/" + project_id + "/" + name + "/statistics")
            self.components[project_id + ":r:" + name] = {
                "name": name,
                "strings": component_data["results"][0]["total"] or 0
            }
        if args.verbose:
            print("New component created " + str(res["id"]) + " " + str(res["name"]))
        return data
    
    def component_put_english(self, component_id, content, project_id=None):
        if not isinstance(content, str):
            raise Exception("Invalid content format to upload")
        project_id = project_id or self.PROJECT
        base_component = component_id.split("-")[0]
        form_data = {
            "files": {
                "file": (self.TEMPLATE_NAME, content.encode(self.FILE_ENCODING[base_component]) if base_component in self.FILE_ENCODING else content, self.MIME)
            },
            "method": "replace",
            "fuzzy": "process",
            "conflicts": "replace-approved"
        }
        if args.verbose:
            print("Uploading strings to " + component_id + " in " + project_id)
        res = self.send_request("translations/" + project_id + "/" + component_id + "/en/file/", form_data=form_data)
        if isinstance(res, str):
            err = safe_parse(res)
            type = err["type"] or False
            errors = err["errors"] or False
            print("Error: Failed to upload file " + str(type or res))
            if errors:
                self.log_error_object(errors)
            return False
        
        if len(self.components) > 0:
            component_data = self.send_request("components/" + project_id + "/" + component_id + "/statistics")
            self.components[project_id + ":r:" + component_id] = {
                "name": component_id,
                "strings": component_data["results"][0]["total"] or 0
            }
        return res
    
    def component_get_english(self, component_id, project_id=None):
        if args.verbose:
            print("Fetching en strings for " + component_id)
        return self.component_get_language(component_id, "en", project_id)
    
    def component_get_language(self, component_id, language_id, project_id=None, thread=False):
        project_id = project_id or self.PROJECT
        if args.verbose:
            print("Fetching " + language_id + " translations for " + component_id + " in " + project_id)
        endpoint = "translations/" + project_id + "/" + component_id + "/" + language_id + "/file/"
        base_component = component_id.split("-")[0]
        encoding = self.FILE_ENCODING[base_component] if base_component in self.FILE_ENCODING else False
        if thread:
            id = project_id + ":r:" + component_id + ":l:" + language_id
            self.send_request(endpoint, thread=True, id=id, text=(base_component not in self.FILE_ENCODING), encoding=encoding)
            if args.verbose:
                print("Enqueued " + str(len(thread_queue)) + " translation requests")
            return id
        res = self.send_request(endpoint, text=(base_component not in self.FILE_ENCODING), encoding=encoding)
        if not res:
            raise Exception("Invalid API response from Weblate")
        if args.verbose:
            print("Fetching " + language_id + " translations finished for " + component_id + " in " + project_id)
        return res
    
    def fetch_all_component_strings_meta(self, component_id, project_id=None):
        if component_id in self.strings_meta:
            return self.strings_meta
        project_id = project_id or self.PROJECT
        if args.verbose:
            print("Fetching new component string meta " + component_id + " " + project_id)
        self.strings_meta[component_id] = True
        link = "translations/" + project_id + "/" + component_id + "/en/units/?page_size=1000"
        while link != None:
            res = self.send_request(link)
            if isinstance(res, str) or not "results" in res:
                return False
            for i in range(len(res["results"])):
                meta = res["results"][i]
                meta["component_id"] = component_id
                meta["project_id"] = project_id
                self.strings_meta[meta["id"]] = meta
            if isinstance(res["next"], str):
                link = res["next"]
            else:
                link = None
        return self.strings_meta
                
    def fetch_string_meta(self, string_key, component_id, project_id=None):
        project_id = project_id or self.PROJECT
        if len(self.strings_meta) == 0 and not self.fetch_all_strings_meta(component_id, project_id):
            return False
        if string_key in self.strings_meta:
            return self.strings_meta[string_key]
        for string in self.strings_meta.values():
            if string["project_id"] == project_id and string["component_id"] == component_id and string["context"] == string_key:
                return string
        return False
    
    def update_string_meta(self, attributes, string_id):
        if len(attributes) == 0:
            raise Exception("Invalid attributes for string update")
        form_data = {}
        some = False
        for key in attributes:
            if key in META_OPTS:
                form_data[key] = attributes[key]
                some = True

        if not some:
            print("Warning: Invalid meta update " + ",".join(attributes.keys()) + " " + str(string_id))
            return False
        
        res = self.send_request("units/" + str(string_id), form_data=form_data, method="PATCH")
        if not res or isinstance(res, str):
            err = safe_parse(res)
            type = err["type"] or False
            errors = err["errors"] or False
            print("Error: Failed to update metadata " + str(type or res))
            if errors:
                self.log_error_object(errors)

            return False
        del self.strings_meta[string_id]
        meta = self.send_request("units/" + str(string_id))
        if not meta:
            print("Error: Failed to fetch updated metadata for " + str(string_id))
            return True
        self.strings_meta[string_id] = meta
        return True
    
    def fetch_labels(self, project_id=None):
        project_id = project_id or self.PROJECT
        if project_id in self.labels:
            return self.labels[project_id]
        res = self.send_request("projects/" + project_id + "/labels/")
        if not res or "results" not in res:
            print("Error: Failed to retrieve label ids")
            return False
        self.labels[project_id] = {}
        for i in range(len(res.results)):
            data = res.results[i]
            self.labels[project_id][data["name"]] = data["id"]
        return self.labels[project_id]

    def send_request(self, endpoint, payload=None, form_data=None, method="GET", thread=False, id=None, text=False, encoding=False):
        headers = self.HEADERS

        if endpoint[0:4] != "http":
            endpoint = self.HOST + "/" + endpoint
        
        if endpoint[-1] != "/" and not "?" in endpoint:
            endpoint = endpoint + "/"

        if (payload or form_data) and method == "GET":
            method = "POST"

        if payload:
            headers["Content-Type"] = "application/json"
            payload = json.dumps(payload).encode('utf8')
        if form_data:
            payload = form_data
        
        if thread:
            thread_queue.append({"endpoint": endpoint, "headers": headers, "payload": payload, "method": method, "id": id, "text": text, "encoding": encoding})
            return

        return do_request(endpoint=endpoint, payload=payload, headers=headers, method=method, text=text, encoding=encoding)

    def log_error_object(self, errors):
        if not isinstance(errors, list) or len(errors) == 0:
            return
        for i in range(len(errors)):
            err = errors[i]
            print("Error " + str(err["title"] if "title" in err else (err["code"] if "code" in err else "Unknown")))
            print("Details " + str(err["detail"] if "detail" in err else "Unknown"))
            print("Attribute " + str(err["attr"] if "attr" in err else "Unknown"))
